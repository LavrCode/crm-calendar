import React, { useState, useEffect, useMemo } from 'react';
import './AdminPanel.css';
import { 
  createDepartment, 
  updateDepartment, 
  deleteDepartment,
  createUser,
  updateUser,
  deleteUser
} from '../services/api';

const AdminPanel = ({ user, users, tasks: tasksProp, departments, onUsersUpdate, onDepartmentsUpdate }) => {
  const [activeTab, setActiveTab] = useState('statistics');
  const [allUsers, setAllUsers] = useState(users || []);
  const [allDepartments, setAllDepartments] = useState(departments || []);

  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [departmentFormData, setDepartmentFormData] = useState({
    name: ''
  });

  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeFormData, setEmployeeFormData] = useState({
    name: '',
    login: '',
    password: '',
    role: 'user',
    departments: []
  });

  const allRelevantTasks = useMemo(() => {
    let flatTasks = [];
    if (!tasksProp) {
      return [];
    }
    Object.values(tasksProp).forEach(deptTasksByDate => {
        if (deptTasksByDate && typeof deptTasksByDate === 'object') {
            Object.values(deptTasksByDate).forEach(tasksForDate => {
                if (Array.isArray(tasksForDate)) {
                    flatTasks = flatTasks.concat(tasksForDate);
                }
            });
        }
    });
    return flatTasks;
  }, [tasksProp]);

  const getAllDepartmentIdsForEmployee = (employee) => {
    if (!employee) return [];

    let collectedIds = new Set();

    if (employee.departments) {
      if (Array.isArray(employee.departments)) {
        employee.departments.forEach(dept => {
          if (dept === null || dept === undefined) return;
          let id = null;
          if (typeof dept === 'object' && dept.id != null) {
            id = dept.id;
          } else if (typeof dept === 'number' || typeof dept === 'string') {
            id = dept;
          }
          if (id !== null) collectedIds.add(id);
        });
      } else if (typeof employee.departments === 'object' && employee.departments !== null && employee.departments.id != null) {
        collectedIds.add(employee.departments.id);
      }
    }

    if (employee.department_ids && Array.isArray(employee.department_ids)) {
      employee.department_ids.forEach(id => {
         if (id !== null && id !== undefined) {
             collectedIds.add(id);
         }
      });
    }

    if (employee.primary_department_id != null) {
       collectedIds.add(employee.primary_department_id);
    }

    const finalDeptIds = Array.from(collectedIds)
        .map(id => {
            if (typeof id === 'string') {
                return /^-?\d+$/.test(id) ? parseInt(id, 10) : NaN;
            }
            if (typeof id === 'number') {
                return id;
            }
            return NaN;
        })
        .filter(id => !isNaN(id));

    return finalDeptIds;
  };

  useEffect(() => {
    if (users) {
        const normalizedUsers = users.map(user => ({
            ...user,
            departments: getAllDepartmentIdsForEmployee(user),
            department_ids: getAllDepartmentIdsForEmployee(user)
        }));
        setAllUsers(normalizedUsers);
    } else {
        setAllUsers([]);
    }

    if (departments) {
        setAllDepartments(departments);
    } else {
        setAllDepartments([]);
    }
  }, [users, departments]);

  const handleAddDepartment = () => {
    setShowDepartmentForm(true);
    setEditingDepartment(null);
    setDepartmentFormData({ name: '' });
  };

  const handleEditDepartment = (department) => {
    setShowDepartmentForm(true);
    setEditingDepartment(department);
    setDepartmentFormData({
      name: department.name
    });
  };

  const handleDeleteDepartmentClick = async (departmentId) => {
    if (window.confirm('Вы уверены, что хотите удалить этот отдел?')) {
      try {
        const response = await deleteDepartment(departmentId);
        if (response && response.success) {
            const updatedDepartments = allDepartments.filter(dept => dept.id !== departmentId);
            setAllDepartments(updatedDepartments);
            if (onDepartmentsUpdate) {
                onDepartmentsUpdate(updatedDepartments);
            }
        } else {
            throw new Error(response?.message || 'Сервер вернул ошибку при удалении отдела');
        }
      } catch (error) {
        console.error("Ошибка удаления отдела:", error);
        alert(`Не удалось удалить отдел: ${error.message || 'Неизвестная ошибка'}`);
      }
    }
  };

  const handleDepartmentFormSubmit = async (e) => {
    e.preventDefault();
    let success = false;
    try {
      let updatedDepartmentsList;
      if (editingDepartment) {
        await updateDepartment(
          editingDepartment.id,
          departmentFormData.name
        );
        updatedDepartmentsList = allDepartments.map(dept =>
          dept.id === editingDepartment.id ? { ...dept, name: departmentFormData.name } : dept
        );
        setAllDepartments(updatedDepartmentsList);
        success = true;
      } else {
        const newDepartmentResponse = await createDepartment(departmentFormData.name);
        if (newDepartmentResponse && newDepartmentResponse.success && newDepartmentResponse.department) {
          const newDepartment = newDepartmentResponse.department;
          updatedDepartmentsList = [...allDepartments, newDepartment];
          setAllDepartments(updatedDepartmentsList);
          success = true;
        } else {
          throw new Error(newDepartmentResponse?.message || 'Сервер не вернул созданный отдел');
        }
      }

      if (success && onDepartmentsUpdate) {
          onDepartmentsUpdate(updatedDepartmentsList);
      }
      if (success) {
         setShowDepartmentForm(false);
      }

    } catch (error) {
      console.error("Ошибка при сохранении отдела:", error);
      alert(`Не удалось сохранить отдел: ${error.message || 'Неизвестная ошибка'}`);
    }
  };

  const handleAddEmployee = () => {
    setShowEmployeeForm(true);
    setEditingEmployee(null);
    setEmployeeFormData({
      name: '',
      login: '',
      password: '',
      role: 'user',
      departments: []
    });
  };

  const handleEditEmployee = (employee) => {
    setShowEmployeeForm(true);
    setEditingEmployee(employee);
    
    const deptIds = getAllDepartmentIdsForEmployee(employee);
    
    setEmployeeFormData({
      name: employee.name || '',
      login: employee.login || employee.username || '',
      password: '',
      role: employee.role || 'user',
      departments: deptIds
    });
  };

  const handleDeleteEmployeeClick = async (employeeId) => {
    if (window.confirm('Вы уверены, что хотите удалить этого сотрудника?')) {
      try {
        await deleteUser(employeeId);
        const updatedUsers = allUsers.filter(emp => emp.id !== employeeId);
        setAllUsers(updatedUsers);
        if (onUsersUpdate) {
          onUsersUpdate(updatedUsers);
        }
      } catch(error) {
        console.error("Ошибка удаления сотрудника:", error);
        alert('Не удалось удалить сотрудника');
      }
    }
  };

  const handleEmployeeFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const userData = { ...employeeFormData };
      
      if (editingEmployee) {
        if (!userData.name || userData.name.trim() === '') {
            alert('Имя сотрудника не может быть пустым.');
            return;
        }
        if (!userData.role) {
            alert('Роль сотрудника должна быть выбрана.');
            return;
        }
      }

      if (editingEmployee) {
        const userDataToSend = { 
            ...userData, 
            department_ids: userData.departments 
        };
        delete userDataToSend.departments;
        
        if (!userDataToSend.password) {
          delete userDataToSend.password;
        }
        if (userDataToSend.login === (editingEmployee.login || editingEmployee.username)) {
           delete userDataToSend.login; 
        }
        delete userDataToSend.username; 
        
        const updateResponse = await updateUser(
          editingEmployee.id, 
          userDataToSend
        );
        
        if (updateResponse && updateResponse.success === true && updateResponse.user) {
           const updatedUserFromServer = updateResponse.user;
           
           const normalizedUpdatedUser = {
              ...updatedUserFromServer,
              departments: getAllDepartmentIdsForEmployee(updatedUserFromServer),
              department_ids: getAllDepartmentIdsForEmployee(updatedUserFromServer)
           };

           const updatedUsersArray = allUsers.map(emp => 
             emp.id === editingEmployee.id ? normalizedUpdatedUser : emp
           );
           setAllUsers(updatedUsersArray);
           if (onUsersUpdate) {
             onUsersUpdate(updatedUsersArray);
           }
           setShowEmployeeForm(false); 
        } else {
           alert(`Ошибка при обновлении сотрудника: ${updateResponse?.message || 'Не удалось получить обновленные данные от сервера.'}`);
        }

      } else {
        if (!userData.name || userData.name.trim() === '') {
            alert('Имя сотрудника не может быть пустым.');
            return;
        }
         if (!userData.role) {
            alert('Роль сотрудника должна быть выбрана.');
            return;
        }
        if (!userData.login || userData.login.trim() === '') {
            alert('Логин сотрудника не может быть пустым.');
            return;
        }
         if (!userData.password || userData.password.length < 4) {
            alert('Пароль должен содержать минимум 4 символа.');
            return;
        }
        
        const userDataToSend = {
           ...userData,
           username: userData.login,
           department_ids: userData.departments
        };
        delete userDataToSend.login;
        delete userDataToSend.departments;
        
        const newEmployeeResponse = await createUser(userDataToSend);
        
        if (newEmployeeResponse && newEmployeeResponse.success && newEmployeeResponse.user) {
          const addedEmployee = newEmployeeResponse.user;

          const newEmployeeWithNormalizedDepts = {
            ...addedEmployee,
            departments: getAllDepartmentIdsForEmployee(addedEmployee),
            department_ids: getAllDepartmentIdsForEmployee(addedEmployee)
          };

          const updatedUsersArray = [...allUsers, newEmployeeWithNormalizedDepts];
          setAllUsers(updatedUsersArray);
          if (onUsersUpdate) {
            onUsersUpdate(updatedUsersArray);
          }
          setShowEmployeeForm(false);
        } else {
           alert(`Ошибка при создании сотрудника: ${newEmployeeResponse?.message || 'Сервер не вернул данные созданного пользователя.'}`);
           return; 
        }
      }
      
    } catch(error) {
      console.error("Ошибка сохранения сотрудника:", error);
      alert(`Не удалось сохранить сотрудника: ${error.message || 'Ошибка сети или сервера.'}`);
    }
  };

  const handleDepartmentChange = (deptId) => {
    const numDeptId = typeof deptId === 'string' ? parseInt(deptId, 10) : deptId;
    
    const isDeptSelected = employeeFormData.departments.some(id => {
      const numId = typeof id === 'string' ? parseInt(id, 10) : id;
      return numId === numDeptId;
    });
    
    let updatedDepts;
    if (isDeptSelected) {
      updatedDepts = employeeFormData.departments.filter(id => {
        const numId = typeof id === 'string' ? parseInt(id, 10) : id;
        return numId !== numDeptId;
      });
    } else {
      updatedDepts = [...employeeFormData.departments, numDeptId];
    }
    
    setEmployeeFormData({
      ...employeeFormData,
      departments: updatedDepts
    });
  };

  if (user.role !== 'superadmin') {
    return (
      <div className="admin-panel">
        <div className="access-denied">
          <h3>Доступ запрещен</h3>
          <p>У вас недостаточно прав для доступа к панели администратора.</p>
        </div>
      </div>
    );
  }

  const completedTasks = allRelevantTasks.filter(task => task.status === 'Выполнена').length;
  const inProgressTasks = allRelevantTasks.filter(task => task.status === 'В работе').length;
  const pendingTasks = allRelevantTasks.filter(task => 
    task.status === 'Назначена' || 
    task.status === 'На доработке' ||
    !task.assignedTo
  ).length;
  const totalTasks = allRelevantTasks.length;

  const departmentMetrics = allDepartments.map(department => {
    const currentDeptId = typeof department.id === 'string' ? parseInt(department.id, 10) : department.id;
    if (isNaN(currentDeptId)) return null;

    const deptUsers = allUsers.filter(user => {
      const userDeptIds = getAllDepartmentIdsForEmployee(user);
      return userDeptIds.includes(currentDeptId);
    });
    const deptUserIds = deptUsers.map(user => user.id);
    const deptUserUsernames = deptUsers.map(user => user.username).filter(Boolean);

    const deptTasks = allRelevantTasks.filter(task => {
        let taskUserId = null;
        if (task.user != null) {
            taskUserId = typeof task.user === 'string' ? parseInt(task.user, 10) : task.user;
            return typeof taskUserId === 'number' && !isNaN(taskUserId) && deptUserIds.includes(taskUserId);
        } else if (task.assignedTo != null) {
            return deptUserUsernames.includes(task.assignedTo);
        }
        return false;
    });

    const completedTasksForMetric = deptTasks.filter(task => task.status === 'Выполнена').length;

    return {
      id: currentDeptId,
      name: department.name,
      totalTasks: deptTasks.length,
      completedTasks: completedTasksForMetric,
      usersCount: deptUsers.length
    };
  }).filter(metric => metric !== null);

  const renderStatisticsTab = () => (
    <div>
      <h3>Общая статистика</h3>
      <div className="statistics-summary">
        <div className="stat-card">
          <div className="stat-label">Всего задач</div>
          <div className="stat-value">{totalTasks}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Выполненные задачи</div>
          <div className="stat-value">{completedTasks}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">В работе</div>
          <div className="stat-value">{inProgressTasks}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Ожидают</div>
          <div className="stat-value">{pendingTasks}</div>
        </div>
      </div>

      <h3>Статистика по сотрудникам</h3>
      <table className="stats-table">
        <thead>
          <tr>
            <th>Сотрудник</th>
            <th>Отдел</th>
            <th>Всего задач</th>
            <th>Выполнено</th>
            <th>В работе</th>
            <th>% выполнения</th>
          </tr>
        </thead>
        <tbody>
          {allUsers.map(user => {
            const currentUserId = user.id;
            const userTasks = allRelevantTasks.filter(task => {
                let taskUserId = null;
                if (task.user != null) {
                    taskUserId = task.user;
                } else if (task.assignedTo != null && task.assignedTo === user.username) {
                   return true;
                }
                 const numTaskUserId = typeof taskUserId === 'string' ? parseInt(taskUserId, 10) : taskUserId;
                 return typeof numTaskUserId === 'number' && !isNaN(numTaskUserId) && numTaskUserId === currentUserId;
            });

            const userCompleted = userTasks.filter(task => task.status === 'Выполнена').length;
            const userInProgress = userTasks.filter(task => task.status === 'В работе').length;
            const userCompletionRate = userTasks.length > 0
              ? Math.round((userCompleted / userTasks.length) * 100)
              : 0;

            const departmentIds = getAllDepartmentIdsForEmployee(user);
            const userDepartmentNames = departmentIds.length > 0
              ? departmentIds.map(deptId => {
                  const dept = allDepartments.find(d => {
                    const numDId = typeof d.id === 'string' ? parseInt(d.id, 10) : d.id;
                    return numDId === deptId;
                  });
                  return dept ? dept.name : `(ID: ${deptId})`;
                }).join(', ')
              : 'Не назначен';

            return (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{userDepartmentNames}</td>
                <td>{userTasks.length}</td>
                <td>{userCompleted}</td>
                <td>{userInProgress}</td>
                <td>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${userCompletionRate}%` }}
                    ></div>
                    <span className="progress-bar-text">{userCompletionRate}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderMetricsTab = () => (
    <div>
      <h3>Метрики по отделам</h3>
      <div className="metrics-summary">
        {departmentMetrics.map(dept => (
          <div className="metric-card" key={dept.id}>
            <div className="metric-label">{dept.name}</div>
            <div className="metric-value">{dept.totalTasks}</div>
            <div className="metric-breakdown">
              <div>Выполнено: {dept.completedTasks}</div>
              <div>Сотрудников: {dept.usersCount}</div>
            </div>
          </div>
        ))}
      </div>

      <h3>Детальная статистика по отделам</h3>
      <table className="metrics-table">
        <thead>
          <tr>
            <th>Отдел</th>
            <th>Всего задач</th>
            <th>Выполнено</th>
            <th>В работе</th>
            <th>Сотрудников</th>
          </tr>
        </thead>
        <tbody>
          {departmentMetrics.map(dept => {
            const deptUsers = allUsers.filter(user => {
              const userDeptIds = getAllDepartmentIdsForEmployee(user);
              return userDeptIds.includes(dept.id);
            });
            const deptUserIds = deptUsers.map(user => user.id);
            const deptUserUsernames = deptUsers.map(user => user.username).filter(Boolean);

            const deptTasks = allRelevantTasks.filter(task => {
                let taskUserId = null;
                if (task.user != null) {
                    taskUserId = typeof task.user === 'string' ? parseInt(task.user, 10) : task.user;
                    return typeof taskUserId === 'number' && !isNaN(taskUserId) && deptUserIds.includes(taskUserId);
                } else if (task.assignedTo != null) {
                    return deptUserUsernames.includes(task.assignedTo);
                }
                return false;
            });

            const completed = deptTasks.filter(task => task.status === 'Выполнена').length;
            const inProgress = deptTasks.filter(task => task.status === 'В работе').length;

            return (
              <tr key={dept.id}>
                <td>{dept.name}</td>
                <td>{deptTasks.length}</td>
                <td>{completed}</td>
                <td>{inProgress}</td>
                <td>{dept.usersCount}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderDepartmentsTab = () => (
    <div>
      <div className="section-header">
        <h3>Управление отделами</h3>
        <button className="action-button add-button" onClick={handleAddDepartment}>
          Добавить отдел
        </button>
      </div>

      {showDepartmentForm && (
        <div className="form-container">
          <h4>{editingDepartment ? 'Редактировать отдел' : 'Добавить новый отдел'}</h4>
          <form onSubmit={handleDepartmentFormSubmit}>
            <div className="form-group">
              <label htmlFor="departmentName">Название отдела</label>
              <input
                type="text"
                id="departmentName"
                value={departmentFormData.name}
                onChange={(e) => setDepartmentFormData({...departmentFormData, name: e.target.value})}
                required
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="action-button save-button">
                {editingDepartment ? 'Сохранить' : 'Добавить'}
              </button>
              <button 
                type="button" 
                className="action-button cancel-button"
                onClick={() => setShowDepartmentForm(false)}
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      <table className="departments-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Название</th>
            <th>Кол-во сотрудников</th>
            <th>Кол-во задач</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {allDepartments.map(department => {
            const currentDeptId = typeof department.id === 'string' ? parseInt(department.id, 10) : department.id;
            if (isNaN(currentDeptId)) return null;

            const deptUsers = allUsers.filter(user => {
              const userDeptIds = getAllDepartmentIdsForEmployee(user);
              return userDeptIds.includes(currentDeptId);
            });
            const deptUserIds = deptUsers.map(user => user.id);
            const deptUserUsernames = deptUsers.map(user => user.username).filter(Boolean);

            const deptTasks = allRelevantTasks.filter(task => {
                let taskUserId = null;
                if (task.user != null) {
                    taskUserId = typeof task.user === 'string' ? parseInt(task.user, 10) : task.user;
                    return typeof taskUserId === 'number' && !isNaN(taskUserId) && deptUserIds.includes(taskUserId);
                } else if (task.assignedTo != null) {
                    return deptUserUsernames.includes(task.assignedTo);
                }
                return false;
            });
            
            return (
              <tr key={department.id}>
                <td>{department.id}</td>
                <td>{department.name}</td>
                <td>{deptUsers.length}</td>
                <td>{deptTasks.length}</td>
                <td className="action-cell">
                  <button
                    className="action-button edit-button"
                    onClick={() => handleEditDepartment(department)}
                  >
                    ✎
                  </button>
                  <button
                    className="action-button delete-button"
                    onClick={() => handleDeleteDepartmentClick(department.id)}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            );
          }).filter(row => row !== null)}
        </tbody>
      </table>
    </div>
  );

  const renderEmployeesTab = () => (
    <div>
      <div className="section-header">
        <h3>Управление сотрудниками</h3>
        <button className="action-button add-button" onClick={handleAddEmployee}>
          Добавить сотрудника
        </button>
      </div>

      {showEmployeeForm && (
        <div className="form-container">
          <h4>{editingEmployee ? 'Редактировать сотрудника' : 'Добавить нового сотрудника'}</h4>
          <form onSubmit={handleEmployeeFormSubmit}>
            <div className="form-group">
              <label htmlFor="employeeName">Имя сотрудника</label>
              <input
                type="text"
                id="employeeName"
                value={employeeFormData.name}
                onChange={(e) => setEmployeeFormData({...employeeFormData, name: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="employeeLogin">
                {editingEmployee ? 'Логин (оставьте пустым, чтобы не менять)' : 'Логин'}
              </label>
              <input
                type="text"
                id="employeeLogin"
                value={employeeFormData.login}
                onChange={(e) => setEmployeeFormData({...employeeFormData, login: e.target.value})}
                required={!editingEmployee}
              />
            </div>
            <div className="form-group">
              <label htmlFor="employeePassword">
                {editingEmployee ? 'Пароль (оставьте пустым, чтобы не менять)' : 'Пароль'}
              </label>
              <input
                type="password"
                id="employeePassword"
                value={employeeFormData.password}
                onChange={(e) => setEmployeeFormData({...employeeFormData, password: e.target.value})}
                required={!editingEmployee}
              />
            </div>
            <div className="form-group">
              <label htmlFor="employeeRole">Роль</label>
              <select
                id="employeeRole"
                value={employeeFormData.role}
                onChange={(e) => setEmployeeFormData({...employeeFormData, role: e.target.value})}
                required
              >
                <option value="user">Пользователь</option>
                <option value="admin">Администратор</option>
                <option value="superadmin">Суперадминистратор</option>
              </select>
            </div>
            <div className="form-group">
              <label>Отделы</label>
              <div className="departments-checkboxes">
                {allDepartments.map(dept => {
                  const deptId = typeof dept.id === 'string' ? parseInt(dept.id, 10) : dept.id;
                  
                  const isChecked = employeeFormData.departments.some(id => {
                    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
                    return numId === deptId;
                  });
                  
                  return (
                    <div key={dept.id} className="checkbox-item">
                      <input
                        type="checkbox"
                        id={`dept-${dept.id}`}
                        checked={isChecked}
                        onChange={() => handleDepartmentChange(deptId)}
                      />
                      <label htmlFor={`dept-${dept.id}`}>{dept.name}</label>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="action-button save-button">
                {editingEmployee ? 'Сохранить' : 'Добавить'}
              </button>
              <button 
                type="button" 
                className="action-button cancel-button"
                onClick={() => setShowEmployeeForm(false)}
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      <table className="employees-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Имя</th>
            <th>Логин</th>
            <th>Роль</th>
            <th>Отделы</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {allUsers.map(user => {
            const departmentIds = getAllDepartmentIdsForEmployee(user);
            const userDepartmentNames = departmentIds.length > 0
              ? departmentIds.map(deptId => {
                  const dept = allDepartments.find(d => {
                    const numDId = typeof d.id === 'string' ? parseInt(d.id, 10) : d.id;
                    return numDId === deptId;
                  });
                  return dept ? dept.name : `(ID: ${deptId})`;
                }).join(', ')
              : 'Не назначен';

            return (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.name}</td>
                <td>{user.login || user.username}</td>
                <td>{user.role}</td>
                <td>{userDepartmentNames}</td>
                <td className="action-cell">
                  <button
                    className="action-button edit-button"
                    onClick={() => handleEditEmployee(user)}
                  >
                    ✎
                  </button>
                  <button
                    className="action-button delete-button"
                    onClick={() => handleDeleteEmployeeClick(user.id)}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="admin-panel">
      <div className="admin-tabs">
        <button
          className={`${activeTab === 'statistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('statistics')}
        >
          Статистика
        </button>
        <button
          className={`${activeTab === 'metrics' ? 'active' : ''}`}
          onClick={() => setActiveTab('metrics')}
        >
          Метрики
        </button>
        <button
          className={`${activeTab === 'departments' ? 'active' : ''}`}
          onClick={() => setActiveTab('departments')}
        >
          Отделы
        </button>
        <button
          className={`${activeTab === 'employees' ? 'active' : ''}`}
          onClick={() => setActiveTab('employees')}
        >
          Сотрудники
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'statistics' && renderStatisticsTab()}
        {activeTab === 'metrics' && renderMetricsTab()}
        {activeTab === 'departments' && renderDepartmentsTab()}
        {activeTab === 'employees' && renderEmployeesTab()}
      </div>
    </div>
  );
};

export default AdminPanel;