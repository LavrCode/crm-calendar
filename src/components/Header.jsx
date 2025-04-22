import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import { registerLocale } from 'react-datepicker';
import ru from 'date-fns/locale/ru';
import 'react-datepicker/dist/react-datepicker.css';
import './Header.css';

registerLocale('ru', ru);

const Header = ({
  user,
  onToggleProfile,
  department,
  departments = [],
  showDepartmentSelector = false,
  onDepartmentChange,
  onDateSelect,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  if (!user) return null;

  const handleDateChange = (date) => {
    if (date) {
      setCurrentDate(date);
      if (onDateSelect) {
        onDateSelect(date);
      }
    }
    setIsCalendarOpen(false);
  };

  const toggleCalendar = () => {
    setIsCalendarOpen(!isCalendarOpen);
  };

  const handleDepartmentChange = (e) => {
    const selectedDeptId = Number(e.target.value);
    onDepartmentChange(selectedDeptId);
  };

  const departmentDisplay = showDepartmentSelector
    ? (
        <select 
          className="header-select" 
          value={department ? departments.find(d => d.name === department)?.id : ''}
          onChange={handleDepartmentChange}
        >
          {departments.map(dept => (
            <option key={dept.id} value={dept.id}>{dept.name}</option>
          ))}
        </select>
      )
    : (
        <div className="department-label">{department}</div>
      );

  const userDepartments = user.departments || [];
  const multipleDepartmentsBadge = userDepartments.length > 1 && (
    <div className="departments-badge" title={userDepartments.map(d => d.name).join(', ')}>
      {userDepartments.length}
    </div>
  );

  return (
    <header className="header">
      <div className="header-title">
        <span className="month-label" onClick={toggleCalendar}>📅</span> CRM-Календарь
      </div>

      <div className="header-controls">
        {departmentDisplay}
        {!showDepartmentSelector && multipleDepartmentsBadge}
      </div>

      {isCalendarOpen && (
        <div className="calendar-popup">
          <div className="calendar-popup-header">
            <h3>Выберите дату</h3>
            <button className="calendar-popup-btn" onClick={() => setIsCalendarOpen(false)}>✖</button>
          </div>
          <DatePicker
            selected={currentDate}
            onChange={handleDateChange}
            inline
            locale="ru"
            dateFormat="MMMM yyyy"
            showMonthYearPicker={false}
            onClickOutside={() => setIsCalendarOpen(false)}
            popperClassName="custom-datepicker"
          />
        </div>
      )}

      <div className="avatar-btn" onClick={onToggleProfile}>
        {user?.username?.[0]?.toUpperCase() || '👤'}
      </div>
    </header>
  );
};

export default Header;