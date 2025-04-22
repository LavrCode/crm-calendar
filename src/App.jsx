import React, { useState, useEffect, useRef } from 'react';
import Calendar from "./components/Calendar";
import Header from "./components/Header";
import ProfileDrawer from "./components/ProfileDrawer";
import LoginForm from "./components/LoginForm";
import { fetchDepartments, fetchTasks, saveTasks, getAllUsers } from './services/api';

const App = () => {
  const [user, setUser] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [department, setDepartment] = useState(null);
  const [departmentId, setDepartmentId] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [tasksData, setTasksData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const calendarRef = useRef(null);

  useEffect(() => {
    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
      try {
        const parsedUser = JSON.parse(storedUserData);
        if (parsedUser && parsedUser.username && parsedUser.role) {
            handleLogin(parsedUser, true);
        } else {
           console.warn("Данные пользователя неполные или некорректны.");
           localStorage.removeItem('userData');
        }
      } catch (error) {
        console.error("Ошибка парсинга данных пользователя:", error);
        localStorage.removeItem('userData');
      }
    }

    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const [deptData, usersData] = await Promise.all([
          fetchDepartments(),
          getAllUsers()
        ]);

        setDepartments(deptData || []);
        setAllUsers(usersData || []);

      } catch (error) {
        console.error("Ошибка загрузки начальных данных (отделы или пользователи):", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadTasks = async () => {
      if (departmentId) {
        try {
          const data = await fetchTasks(departmentId);

          if (data.success) {
            setTasksData(prev => ({ ...prev, [department]: data.tasks }));
          }
        } catch {
          return;
        }
      }
    };

    loadTasks();
  }, [departmentId, department]);

  const handleTasksUpdate = async (newData) => {
    setTasksData(newData);

    if (departmentId) {
      try {
        await saveTasks(departmentId, newData[department] || {}, user);
      } catch {
        return;
      }
    }
  };

  const handleChangeTask = (date, updatedTask) => {
    setTasksData(prev => {
      const deptTasks = { ...(prev[department] || {}) };
      const updated = deptTasks[date]?.map(task =>
        task.id === updatedTask.id ? updatedTask : task
      ) || [];

      const updatedTasks = {
        ...prev,
        [department]: {
          ...deptTasks,
          [date]: updated,
        },
      };

      if (departmentId) {
        saveTasks(departmentId, updatedTasks[department] || {}, user)
          .catch(() => {return});
      }

      return updatedTasks;
    });
  };

  const handleDateSelect = (date) => {
    if (calendarRef.current) {
      calendarRef.current.setSelectedDate(date);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setDepartment(null);
    setDepartmentId(null);
    setProfileOpen(false);
    setTasksData({});
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    console.log('Пользователь успешно вышел из системы');
  };

  const hasAccessToDepartment = (userObj, deptId) => {
    if (!userObj) return false;

    if (userObj.role === 'superadmin') {
      return true;
    }

    const deptIdNum = Number(deptId);

    if (userObj.departments && Array.isArray(userObj.departments)) {
      return userObj.departments.some(dept => Number(dept.id) === deptIdNum);
    }

    return false;
  };

  const ensureUserDataStructure = (userObj) => {
    if (!userObj) return userObj;

    const updatedUser = { ...userObj };

    if (!updatedUser.departments) {
      updatedUser.departments = [];
    }

    if (updatedUser.role === 'superadmin' && updatedUser.departments.length === 0 && departments.length > 0) {
       updatedUser.departments = departments.map(dept => ({ id: dept.id, name: dept.name }));
    }


    if (updatedUser.primary_department_id && updatedUser.departments.length > 0) {
      const primaryDeptId = Number(updatedUser.primary_department_id);
      const hasPrimaryDept = updatedUser.departments.some(dept => Number(dept.id) === primaryDeptId);

      if (!hasPrimaryDept) {
        const primaryDept = departments.find(d => d.id === primaryDeptId);
        if (primaryDept) {
          updatedUser.departments.push({ id: primaryDept.id, name: primaryDept.name });
        }
      }
    }

    return updatedUser;
  };


  const handleLogin = (userObj, isFromLocalStorage = false) => {
    const fixedUserObj = ensureUserDataStructure(userObj);
    setUser(fixedUserObj);

    if (!isFromLocalStorage) {
      localStorage.setItem('userData', JSON.stringify(fixedUserObj));
    }

    const userPrimaryDeptId = fixedUserObj.primary_department_id ? Number(fixedUserObj.primary_department_id) : null;
    const userDepartments = Array.isArray(fixedUserObj.departments) ? fixedUserObj.departments : [];

    let initialDeptId = null;
    let initialDeptName = null;

    if (fixedUserObj.role === 'superadmin') {
        if (departments.length > 0) {
            initialDeptId = departments[0].id;
            initialDeptName = departments[0].name;
        }
    } else if (userDepartments.length > 0) {
        const primaryDept = userPrimaryDeptId ? userDepartments.find(d => d.id === userPrimaryDeptId) : null;
        if (primaryDept) {
            initialDeptId = primaryDept.id;
            initialDeptName = primaryDept.name;
        } else {
            initialDeptId = userDepartments[0].id;
            initialDeptName = userDepartments[0].name;
        }
    }

    if (initialDeptId !== null && initialDeptName !== null) {
        setDepartment(initialDeptName);
        setDepartmentId(initialDeptId);
    } else if (fixedUserObj.role !== 'superadmin' && userDepartments.length === 0) {
        setDepartment(null);
        setDepartmentId(null);
    }
  };

  const handleDepartmentChange = (deptId) => {
    const numDeptId = Number(deptId);

    if (hasAccessToDepartment(user, numDeptId) || user?.role === 'superadmin') {
      const dept = departments.find(d => d.id === numDeptId);

      if (dept) {
        setDepartment(dept.name);
        setDepartmentId(numDeptId);
      }
    }
  };

  const canEditInDepartment = () => {
    if (!user) return false;

    if (user.role === 'superadmin') {
      return true;
    }

    if (user.role === 'admin') {
      return hasAccessToDepartment(user, departmentId);
    }

    return false;
  };

  useEffect(() => {
    if (user && departments.length > 0 && !department && !departmentId) {
      const userPrimaryDeptId = user.primary_department_id ? Number(user.primary_department_id) : null;
      const userDepartments = Array.isArray(user.departments) ? user.departments : [];

      let initialDeptId = null;
      let initialDeptName = null;

      if (user.role === 'superadmin') {
        initialDeptId = departments[0].id;
        initialDeptName = departments[0].name;
      } else if (userDepartments.length > 0) {
          const primaryDept = userPrimaryDeptId ? userDepartments.find(d => d.id === userPrimaryDeptId) : null;
          if (primaryDept) {
              const fullPrimaryDept = departments.find(d => d.id === primaryDept.id);
              if(fullPrimaryDept){
                initialDeptId = fullPrimaryDept.id;
                initialDeptName = fullPrimaryDept.name;
              }
          }
          if(initialDeptId === null) {
             const firstAvailableDept = userDepartments.map(ud => departments.find(d => d.id === ud.id)).find(d => d !== undefined);
             if (firstAvailableDept) {
                initialDeptId = firstAvailableDept.id;
                initialDeptName = firstAvailableDept.name;
             }
          }
      }

      if (initialDeptId !== null && initialDeptName !== null) {
          setDepartment(initialDeptName);
          setDepartmentId(initialDeptId);
      }
    }
  }, [user, departments, department, departmentId]);

  useEffect(() => {
    const checkServerConnection = async () => {
      try {
        const API_URL = '/api';

        const response = await fetch(`${API_URL}/departments`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          alert('Не удалось подключиться к серверу. Пожалуйста, убедитесь, что сервер запущен.');
        }
      } catch {
        alert('Ошибка подключения к серверу. Пожалуйста, убедитесь, что сервер запущен и доступен.');
      }
    };

    checkServerConnection();
  }, []);

  const handleUsersUpdate = (updatedUsers) => {
    setAllUsers(updatedUsers);
     const currentUserData = allUsers.find(u => u.id === user?.id);
     if (currentUserData && JSON.stringify(currentUserData) !== JSON.stringify(user)) {
        const updatedUserData = ensureUserDataStructure(currentUserData);
        setUser(updatedUserData);
        localStorage.setItem('userData', JSON.stringify(updatedUserData));
     }
  };

  const handleDepartmentsUpdate = (updatedDepartments) => {
    setDepartments(updatedDepartments);

    if (user && user.role === 'superadmin') {
      setUser(currentUser => {
        const currentDeptIds = currentUser.departments.map(d => d.id);
        const newDepartmentsToAdd = updatedDepartments.filter(dept => !currentDeptIds.includes(dept.id));
        if (newDepartmentsToAdd.length > 0) {
          const updatedUserData = {
            ...currentUser,
            departments: [...currentUser.departments, ...newDepartmentsToAdd.map(d => ({ id: d.id, name: d.name }))]
          };
          localStorage.setItem('userData', JSON.stringify(updatedUserData));
          return updatedUserData;
        }
        return currentUser;
      });
    } else if (user) {
       setUser(currentUser => {
          const currentDeptIds = currentUser.departments.map(d => d.id);
          const removedDeptIds = currentDeptIds.filter(id => !updatedDepartments.some(dept => dept.id === id));
          const addedDeptInfos = updatedDepartments.filter(dept => !currentDeptIds.includes(dept.id) && currentUser.department_ids?.includes(dept.id));

          if(removedDeptIds.length > 0 || addedDeptInfos.length > 0){
             let newDepartments = currentUser.departments.filter(dept => !removedDeptIds.includes(dept.id));
             newDepartments = [...newDepartments, ...addedDeptInfos.map(d => ({id: d.id, name: d.name}))];

             const updatedUserData = { ...currentUser, departments: newDepartments };

             if(removedDeptIds.includes(departmentId)){
                const firstAvailableDept = updatedUserData.departments.length > 0 ? updatedUserData.departments[0] : null;
                if(firstAvailableDept){
                   setDepartment(firstAvailableDept.name);
                   setDepartmentId(firstAvailableDept.id);
                } else {
                   setDepartment(null);
                   setDepartmentId(null);
                }
             }

             localStorage.setItem('userData', JSON.stringify(updatedUserData));
             return updatedUserData;
          }
          return currentUser;
       });
    }
  };

  if (isLoading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  const availableDepartments = user.role === 'superadmin'
    ? departments
    : departments.filter(dept => hasAccessToDepartment(user, dept.id));

  const showDepartmentSelector = availableDepartments.length > 1;

  return (
    <>
      <Header
        user={user}
        department={department}
        departments={availableDepartments}
        showDepartmentSelector={showDepartmentSelector}
        onDepartmentChange={handleDepartmentChange}
        onToggleProfile={() => setProfileOpen(!profileOpen)}
        onDateSelect={handleDateSelect}
      />
      <div style={{ padding: '1rem' }}>
        {department ? (
          <Calendar
            ref={calendarRef}
            user={user}
            department={department}
            departmentId={departmentId}
            canEdit={canEditInDepartment()}
            onTaskDataUpdate={handleTasksUpdate}
            tasksData={tasksData}
            allDepartments={departments}
            allUsers={allUsers}
            onUsersUpdate={handleUsersUpdate}
            onDepartmentsUpdate={handleDepartmentsUpdate}
          />
        ) : (
          <div className="no-department-message">
            Необходимо выбрать отдел для отображения задач.
            {availableDepartments.length === 0 ? ' У вас нет доступных отделов.' : ''}
          </div>
        )}
      </div>
      <ProfileDrawer
        user={user}
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        tasks={tasksData[department] || {}}
        onTaskChange={handleChangeTask}
        onLogout={handleLogout}
      />
    </>
  );
};

export default App;