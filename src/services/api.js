const API_URL = '/api';

export const fetchUsers = async () => {
  const response = await fetch(`${API_URL}/users`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });
  if (!response.ok) {
    throw new Error(`Ошибка HTTP: ${response.status}`);
  }
  const data = await response.json();
  return data;
};

export const getAllUsers = async () => {
  return fetchUsers();
};

export const getUsersByDepartment = async (departmentId) => {
  const response = await fetch(`${API_URL}/departments/${departmentId}/users`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });
  if (!response.ok) {
    throw new Error(`Ошибка HTTP: ${response.status}`);
  }
  const data = await response.json();
  return data;
};

export const fetchDepartments = async () => {
  const response = await fetch(`${API_URL}/departments`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });
  if (!response.ok) {
    throw new Error(`Ошибка HTTP: ${response.status}`);
  }
  const data = await response.json();
  return data;
};

export const getDepartments = async () => {
  return fetchDepartments();
};

export const createDepartment = async (name) => {
  try {
    const response = await fetch('/api/departments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create department');
    }
    
    return data;
  } catch (error) {
    console.error('Error creating department:', error);
    throw error;
  }
};

export const updateDepartment = async (id, name) => {
  try {
    const response = await fetch(`/api/departments/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update department');
    }
    
    return data;
  } catch (error) {
    console.error('Error updating department:', error);
    throw error;
  }
};

export const deleteDepartment = async (id) => {
  try {
    const response = await fetch(`/api/departments/${id}`, {
      method: 'DELETE',
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete department');
    }
    
    return data;
  } catch (error) {
    console.error('Error deleting department:', error);
    throw error;
  }
};

export const login = async (username, password) => {
  const response = await fetch(`${API_URL}/auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    throw new Error(`Ошибка HTTP: ${response.status}`);
  }
  const data = await response.json();
  return data;
};

export const createUser = async (userData) => {
  const response = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });
  return await response.json();
};

export const updateUser = async (userId, userData) => {
  const response = await fetch(`${API_URL}/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });
  return await response.json();
};

export const deleteUser = async (userId) => {
  const response = await fetch(`${API_URL}/users/${userId}`, {
    method: 'DELETE',
  });
  return await response.json();
};

export const fetchTasks = async (departmentId) => {
  const response = await fetch(`${API_URL}/tasks/${departmentId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });
  if (!response.ok) {
    throw new Error(`Ошибка HTTP: ${response.status}`);
  }
  const data = await response.json();
  return data;
};

export const saveTasks = async (departmentId, tasks, userInfo) => {
  const response = await fetch(`${API_URL}/tasks/${departmentId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ 
      tasks,
      userRole: userInfo?.role,
      userId: userInfo?.id
    }),
  });
  if (!response.ok) {
    throw new Error(`Ошибка HTTP: ${response.status}`);
  }
  const data = await response.json();
  return data;
};

export const checkTaskPermission = async (userId, taskId, action) => {
  const response = await fetch(`${API_URL}/tasks/permission`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ userId, taskId, action }),
  });
  if (!response.ok) {
    throw new Error(`Ошибка HTTP: ${response.status}`);
  }
  const data = await response.json();
  return data.allowed;
};

export const canModifyTask = (userRole, taskAssignee, users) => {
  if (userRole === 'superadmin') return true;
  
  if (userRole === 'admin') {
    const assignedUser = users.find(u => u.username === taskAssignee);
    if (assignedUser && assignedUser.role === 'superadmin') return false;
  }
  
  return true;
};

export const getUsersByRole = async (role) => {
  const users = await fetchUsers();
  return users.filter(user => user.role === role);
}; 