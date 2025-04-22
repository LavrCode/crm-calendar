import React, { useState, useEffect } from 'react';
import './ProfileDrawer.css';

const statuses = ['Назначена', 'В работе', 'Выполнена', 'На доработке'];

const ProfileDrawer = ({ user, isOpen, onClose, tasks, onTaskChange, onLogout }) => {
  const [userTasks, setUserTasks] = useState([]);
  
  useEffect(() => {
    const tasksWithDates = Object.entries(tasks).flatMap(([date, dayTasks]) => {
      return dayTasks
        .filter(t => t.assignedTo === user.username)
        .map(task => ({
          ...task,
          date 
        }));
    });
    
    tasksWithDates.sort((a, b) => {
      const statusOrder = {
        'В работе': 0,
        'Назначена': 1,
        'На доработке': 2,
        'Выполнена': 3
      };
      
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      
      return new Date(b.date) - new Date(a.date);
    });
    
    setUserTasks(tasksWithDates);
  }, [tasks, user.username]);

  const handleStatusChange = (task, newStatus) => {
    if (onTaskChange) {
      const updatedTask = { ...task, status: newStatus };
      onTaskChange(task.date, updatedTask);
    }
  };

  const formatDate = (dateString) => {
    const [year, month, day] = dateString.split('-');
    return `${day}.${month}.${year}`;
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Назначена': return 'task-assigned';
      case 'В работе': return 'task-in-progress';
      case 'Выполнена': return 'task-done';
      case 'На доработке': return 'task-revision';
      default: return '';
    }
  };

  const getDepartmentName = (deptId) => {
    if (!user || !Array.isArray(user.departments)) return `ID ${deptId}`;
    const dept = user.departments.find(d => d.id === deptId);
    return dept ? dept.name : `ID ${deptId}`;
  };

  const primaryDeptId = user?.primary_department_id ? Number(user.primary_department_id) : null;
  const allAssignedDeptObjects = Array.isArray(user?.departments) ? user.departments : [];

  const primaryDepartmentName = primaryDeptId
    ? getDepartmentName(primaryDeptId)
    : (allAssignedDeptObjects.length > 0 ? allAssignedDeptObjects[0].name : 'Не назначен');

  const additionalDepts = allAssignedDeptObjects.filter(dept => dept.id !== primaryDeptId);

  return (
    <div className={`profile-drawer ${isOpen ? 'open' : ''}`}>
      <div className="drawer-header">
        <h3>👤 Профиль</h3>
        <div className="header-actions">
          <button className="logout-btn" onClick={onLogout}>
            Выйти
          </button>
          <button className="close-btn" onClick={onClose}>
            ✖
          </button>
        </div>
      </div>
      
      <div className="profile-info">
        <p><strong>Имя:</strong> {user.name || '(Имя не найдено)'}</p>
        <p><strong>Логин:</strong> {user.username || '(Логин не найден)'}</p>
        <p>
          <strong>Роль:</strong> {
            user.role === 'superadmin' ? 'Суперадминистратор' :
            user.role === 'admin' ? 'Администратор' : 'Пользователь'
          }
        </p>

        {user.role !== 'superadmin' && (
          <>
            <p><strong>Основной отдел:</strong> {primaryDepartmentName}</p>
            {additionalDepts.length > 0 && (
              <div className="additional-departments">
                <strong>Доп. отделы:</strong>
                <div className="department-badges">
                  {additionalDepts.map(dept => (
                    <span key={dept.id} className="department-badge">{dept.name}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {user.role !== 'superadmin' && (
        <div className="user-tasks">
          <h4>📋 Мои задачи ({userTasks.length})</h4>
          
          {userTasks.length === 0 ? (
            <div className="no-tasks">У вас нет назначенных задач</div>
          ) : (
            <div className="tasks-list">
              {userTasks.map((task) => (
                <div key={task.id} className={`task-card ${getStatusClass(task.status)}`}>
                  <div className="task-header">
                    <div className="task-date">{formatDate(task.date)}</div>
                    <div className="task-controls">
                      <select 
                        value={task.status}
                        onChange={(e) => handleStatusChange(task, e.target.value)}
                        className={`status-dropdown ${getStatusClass(task.status)}`}
                      >
                        {statuses.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="task-title">{task.text}</div>
                  {task.description && (
                    <div className="task-description">{task.description}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfileDrawer;