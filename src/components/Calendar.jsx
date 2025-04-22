import React, { useState, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import './Calendar.css';
import Modal from './Modal';
import AdminPanel from './AdminPanel';

const statuses = ['Назначена', 'В работе', 'Выполнена', 'На доработке'];
const DAYS_OF_WEEK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const Calendar = forwardRef(({ 
  user, 
  department, 
  departmentId, 
  canEdit = false,
  onTaskDataUpdate,
  tasksData = {},
  allDepartments = [],
  allUsers = [],
  onUsersUpdate,
  onDepartmentsUpdate
}, ref) => {
  const [tasksByDept, setTasksByDept] = useState({});
  const [newTaskText, setNewTaskText] = useState({});
  const [newAssignee, setNewAssignee] = useState({});
  const [newDescriptions, setNewDescriptions] = useState({});
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState(null);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [showAllDepartments, setShowAllDepartments] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const assignableUsers = useMemo(() => 
    allUsers.filter(u => u.role !== 'superadmin'), 
    [allUsers]
  );

  useImperativeHandle(ref, () => ({
    setSelectedDate: (date) => {
      setCurrentMonth(date.getMonth());
      setCurrentYear(date.getFullYear());
      
      const day = date.getDate();
      const month = date.getMonth();
      const year = date.getFullYear();
      const dateKey = getDateKey(day, month, year);
      
      setSelectedDay(dateKey);
      
      setTimeout(() => {
        const selectedDayElement = document.querySelector(`.calendar-day[data-date="${dateKey}"]`);
        if (selectedDayElement) {
          selectedDayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }));

  const departmentTasks = tasksData[department];

  useEffect(() => {
    if (tasksData && departmentTasks) {
      setTasksByDept(prev => ({
        ...prev,
        [department]: departmentTasks
      }));
    }
  }, [department, tasksData, departmentTasks]);

  const isSuperAdmin = user.role === 'superadmin';
  const isAdmin = user.role === 'admin' || isSuperAdmin;
  const isTaskOwner = (task) => task.assignedTo === user.username;
  const isUnassignedTask = (task) => !task.assignedTo || task.assignedTo === '';
  const isSuperAdminTask = (task, users) => {
    if (!task || !task.assignedTo || !users) return false;
    const assignedUser = users.find(u => u.username === task.assignedTo);
    return assignedUser && assignedUser.role === 'superadmin';
  };

  const hasAccessToTask = (task) => {
    if (user.role === 'superadmin') {
      return true;
    }
    
    if (isTaskOwner(task)) {
      return true;
    }
    
    if (user.role === 'admin' && user.departments) {
      const deptIdNum = Number(departmentId);
      const hasAccess = user.departments.some(dept => Number(dept.id) === deptIdNum);
      return hasAccess;
    }
    
    return false;
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthName = new Date(currentYear, currentMonth).toLocaleString('ru-RU', { month: 'long' });

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const firstDayIndex = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
  
  const totalVisibleDays = Math.ceil((daysInMonth + firstDayIndex) / 7) * 7;
  const nextMonthDays = totalVisibleDays - (daysInMonth + firstDayIndex);

  const tasks = tasksByDept[department] || {};
  
  const getAllTasksForDate = (dateKey) => {
    if (!showAllDepartments || !isSuperAdmin) return tasks[dateKey] || [];
    
    let allTasks = [];
    for (const dept in tasksData) {
      if (tasksData[dept] && tasksData[dept][dateKey]) {
        const tasksWithDept = tasksData[dept][dateKey].map(task => ({
          ...task,
          departmentName: dept
        }));
        allTasks = [...allTasks, ...tasksWithDept];
      }
    }
    return allTasks;
  };

  const getDateKey = (day, month = currentMonth, year = currentYear) => {
    const d = String(day).padStart(2, '0');
    const m = String(month + 1).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  const handleAddTask = (date) => {
    if (!canEdit) return;
    
    const text = newTaskText[date];
    const description = newDescriptions[date] || '';
    const assignedTo = newAssignee[date] || '';
    if (!text) return;

    if (user.role === 'admin') {
      const assignedUser = allUsers.find(u => u.username === assignedTo);
      if (assignedUser && assignedUser.role === 'superadmin') {
        alert('Администраторы не могут назначать задачи суперадминистраторам.');
        return;
      }
    }

    const newTask = {
      id: Date.now(),
      text,
      description,
      status: 'Назначена',
      assignedTo,
    };

    setTasksByDept((prev) => {
      const deptTasks = { ...(prev[department] || {}) };
      const dayTasks = [...(deptTasks[date] || []), newTask];
      const updatedTasks = {
        ...prev,
        [department]: {
          ...deptTasks,
          [date]: dayTasks,
        },
      };
      
      if (onTaskDataUpdate) onTaskDataUpdate(updatedTasks);
      return updatedTasks;
    });

    setNewTaskText((prev) => ({ ...prev, [date]: '' }));
    setNewDescriptions((prev) => ({ ...prev, [date]: '' }));
    setNewAssignee((prev) => ({ ...prev, [date]: '' }));
  };

  const handleDeleteTask = (date, id) => {
    if (!canEdit) return;
    
    const taskToDelete = tasks[date]?.find(task => task.id === id);
    
    if (user.role === 'admin') {
      if (taskToDelete && isSuperAdminTask(taskToDelete, allUsers)) {
        alert('Администраторы не могут удалять задачи суперадминистраторов.');
        return;
      }
    }
    
    setTasksByDept((prev) => {
      const deptTasks = { ...(prev[department] || {}) };
      const filteredTasks = deptTasks[date].filter((task) => task.id !== id);
      const updatedTasks = {
        ...prev,
        [department]: {
          ...deptTasks,
          [date]: filteredTasks,
        },
      };
      
      if (onTaskDataUpdate) onTaskDataUpdate(updatedTasks);
      return updatedTasks;
    });
  };

  const handleChangeTask = (date, updatedTask) => {
    const canEditTask = canEdit || 
                        hasAccessToTask(updatedTask) || 
                        (isUnassignedTask(updatedTask) && updatedTask.assignedTo === user.username);
                        
    if (!canEditTask) return;

    const currentTask = tasks[date]?.find(task => task.id === updatedTask.id);
    
    if (user.role === 'admin') {
      if (currentTask && isSuperAdminTask(currentTask, allUsers)) {
        alert('Администраторы не могут изменять задачи суперадминистраторов.');
        return;
      }
      
      const assignedUser = allUsers.find(u => u.username === updatedTask.assignedTo);
      if (assignedUser && assignedUser.role === 'superadmin') {
        return;
      }
    }

    if (!isAdmin && updatedTask.status === 'Выполнена' && !isUnassignedTask(updatedTask)) {
      return;
    }

    setTasksByDept((prev) => {
      const deptTasks = { ...(prev[department] || {}) };
      const updated = deptTasks[date].map((task) =>
        task.id === updatedTask.id ? updatedTask : task
      );
      
      const updatedTasks = {
        ...prev,
        [department]: {
          ...deptTasks,
          [date]: updated,
        },
      };
      
      if (onTaskDataUpdate) onTaskDataUpdate(updatedTasks);
      return updatedTasks;
    });
  };

  const handleTakeTask = (date, taskId) => {
    const taskToTake = tasks[date]?.find(task => task.id === taskId);
    
    if (user.role === 'admin') {
      if (taskToTake && isSuperAdminTask(taskToTake, allUsers)) {
        alert('Администраторы не могут брать задачи суперадминистраторов.');
        return;
      }
    }
    
    setTasksByDept((prev) => {
      const deptTasks = { ...(prev[department] || {}) };
      const updated = deptTasks[date].map((task) => {
        if (task.id === taskId && isUnassignedTask(task)) {
          return { ...task, assignedTo: user.username, status: 'В работе' };
        }
        return task;
      });
      
      const updatedTasks = {
        ...prev,
        [department]: {
          ...deptTasks,
          [date]: updated,
        },
      };
      
      if (onTaskDataUpdate) onTaskDataUpdate(updatedTasks);
      return updatedTasks;
    });
  };

  const changeMonth = (offset) => {
    const newMonth = currentMonth + offset;
    const newDate = new Date(currentYear, newMonth, 1);
    setCurrentMonth(newDate.getMonth());
    setCurrentYear(newDate.getFullYear());
    setSelectedDay(null);
  };

  const handleBackdropClick = () => {
    setSelectedDay(null);
    setExpandedTaskId(null);
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

  const declineTaskWord = (count) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return 'задача';
    if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'задачи';
    return 'задач';
  };

  const getStatusStats = (dayTasks) => {
    if (!dayTasks.length) return [];
    return statuses.map((status) => {
      const count = dayTasks.filter((task) => task.status === status).length;
      const percent = Math.round((count / dayTasks.length) * 100);
      return { status, percent };
    });
  };

  const renderCalendarDay = (day, month = currentMonth, year = currentYear, isCurrentMonth = true) => {
    const dateKey = getDateKey(day, month, year);
    const dayTasks = isCurrentMonth ? (showAllDepartments ? getAllTasksForDate(dateKey) : tasks[dateKey] || []) : [];
    const isSelected = selectedDay === dateKey && isCurrentMonth;
    const date = new Date(year, month, day);
    const dayClass = isCurrentMonth 
      ? `calendar-day ${isSelected ? 'expanded' : selectedDay ? 'hidden' : ''}`
      : 'calendar-day inactive-day';

    return (
      <div
        key={dateKey}
        className={dayClass}
        onClick={() => isCurrentMonth && setSelectedDay(dateKey)}
        data-date={dateKey}
      >
        <div className="day-header dark-header">
          <span className="date-left">
            {String(day).padStart(2, '0')}.{String(month + 1).padStart(2, '0')}.{String(year).toString().slice(-2)}
          </span>
          <span className="weekday-right">
            {date.toLocaleDateString('ru-RU', { weekday: 'short' })}
          </span>
        </div>

        {!isSelected && (
          <div className="summary">
            {isCurrentMonth && (
              <>
                <div>📌 {dayTasks.length} {declineTaskWord(dayTasks.length)}</div>
                {getStatusStats(dayTasks).map(({ status, percent }) => {
                  const icon = {
                    'Назначена': '🟪',
                    'В работе': '🟦',
                    'Выполнена': '✅',
                    'На доработке': '🟨',
                  }[status];
                  return (
                    <div key={status}>
                      {icon} {status}: {percent > 0 ? `${percent}%` : '0%'}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {isSelected && (
          <div className="task-list-expanded">
            {dayTasks.map((task) => {
              const isExpanded = expandedTaskId === task.id;
              const canTakeTask = isUnassignedTask(task);

              return (
                <div
                  className={`task-tile ${getStatusClass(task.status)} ${isExpanded ? 'expanded' : ''} ${hasAccessToTask(task) ? 'user-task' : ''}`}
                  key={task.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedTaskId((prev) => (prev === task.id ? null : task.id));
                  }}
                >
                  <strong>{task.text}</strong>
                  {showAllDepartments && task.departmentName && (
                    <div className="task-department">
                      <span>🏢 Отдел: {task.departmentName}</span>
                    </div>
                  )}
                  <div className="task-assignee">
                    {isSuperAdmin ? (
                      <div className="task-assignee-clickable" onClick={(e) => {
                        e.stopPropagation(); 
                        setExpandedTaskId(task.id);
                      }}>
                        <span>👤 </span>
                        <select
                          value={task.assignedTo || ''}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleChangeTask(dateKey, { ...task, assignedTo: e.target.value });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="assignee-select-inline"
                        >
                          <option value="">Не назначена</option>
                          {assignableUsers.map((user) => (
                            <option key={user.id} value={user.username}>
                              {user.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span>👤 {task.assignedTo || 'Не назначена'}</span>
                    )}
                    {canTakeTask && !isAdmin && (
                      <button 
                        className="take-task-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTakeTask(dateKey, task.id);
                        }}
                      >
                        Взять задачу
                      </button>
                    )}
                  </div>
                  <div className="task-status-dropdown">
                    <div className="task-status-clickable" onClick={(e) => {
                      e.stopPropagation(); 
                      setExpandedTaskId(task.id);
                    }}>
                      <span>📌 </span>
                      <select
                        value={task.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleChangeTask(dateKey, { ...task, status: e.target.value });
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="status-select-inline"
                        disabled={!isAdmin && !hasAccessToTask(task)}
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{ marginTop: '10px' }}>
                      <p>{task.description || 'Нет описания'}</p>
                      {canEdit && (
                        <button
                          className="delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTask(dateKey, task.id);
                          }}
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {canEdit && (
              <div className="new-task-form">
                <h4>✨ Добавить новую задачу</h4>
                <div className="form-group">
                  <label>Название задачи</label>
                  <input
                    placeholder="Введите название задачи..."
                    value={newTaskText[dateKey] || ''}
                    onChange={(e) =>
                      setNewTaskText((prev) => ({ ...prev, [dateKey]: e.target.value }))
                    }
                  />
                </div>
                
                <div className="form-group">
                  <label>Описание задачи</label>
                  <textarea
                    placeholder="Введите подробное описание задачи..."
                    value={newDescriptions[dateKey] || ''}
                    onChange={(e) =>
                      setNewDescriptions((prev) => ({ ...prev, [dateKey]: e.target.value }))
                    }
                    rows={4}
                  />
                </div>
                
                <div className="form-group">
                  <label>Назначить исполнителя</label>
                  <select
                    value={newAssignee[dateKey] || ''}
                    onChange={(e) =>
                      setNewAssignee((prev) => ({ ...prev, [dateKey]: e.target.value }))
                    }
                    className="assignee-select"
                  >
                    <option value="">Свободная задача</option>
                    {assignableUsers.map((user) => (
                      <option key={user.id} value={user.username}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <button 
                  onClick={() => handleAddTask(dateKey)}
                  className="add-task-button"
                  disabled={!newTaskText[dateKey]}
                >
                  Добавить задачу
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const generateCalendarDays = () => {
    const days = [];
    
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    for (let i = 0; i < firstDayIndex; i++) {
      const prevMonthDay = daysInPrevMonth - firstDayIndex + i + 1;
      days.push(renderCalendarDay(prevMonthDay, prevMonth, prevMonthYear, false));
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(renderCalendarDay(day));
    }
    
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    
    for (let i = 1; i <= nextMonthDays; i++) {
      days.push(renderCalendarDay(i, nextMonth, nextMonthYear, false));
    }
    
    return days;
  };

  return (
    <div className={`calendar-container ${selectedDay ? 'expanded-view' : ''}`}>
      <div className="calendar-header">
        <div className="calendar-month-nav">
          <button onClick={() => changeMonth(-1)}>←</button>
          <span>{monthName} {currentYear}</span>
          <button onClick={() => changeMonth(1)}>→</button>
        </div>
        
        {isSuperAdmin && (
          <div className="view-options">
            <button 
              className={`summary-toggle-btn ${showAllDepartments ? 'active' : ''}`}
              onClick={() => setShowAllDepartments(!showAllDepartments)}
            >
              {showAllDepartments ? '✓ Общая сводка' : '⚙ Общая сводка'}
            </button>
            <button 
              className={`summary-toggle-btn ${showAdminPanel ? 'active' : ''}`}
              onClick={() => setShowAdminPanel(!showAdminPanel)}
            >
              {showAdminPanel ? '✓ Админ-панель' : '⚙ Админ-панель'}
            </button>
          </div>
        )}
      </div>
      
      <div className="calendar-weekdays">
        {DAYS_OF_WEEK.map(day => (
          <div key={day} className="weekday-header">{day}</div>
        ))}
      </div>
      
      <div className="calendar-grid">
        {generateCalendarDays()}
      </div>
      
      {selectedDay && <div className="overlay-backdrop" onClick={handleBackdropClick}></div>}
      
      <Modal 
        isOpen={showAdminPanel} 
        onClose={() => setShowAdminPanel(false)} 
        title="Панель администратора"
      >
        <AdminPanel 
          user={user} 
          users={allUsers}
          tasks={showAllDepartments ? tasksData : {[department]: tasks}}
          departments={allDepartments}
          onUsersUpdate={onUsersUpdate}
          onDepartmentsUpdate={onDepartmentsUpdate}
        />
      </Modal>
    </div>
  );
});

export default Calendar;
