import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Database from 'better-sqlite3';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbDir = join(__dirname, 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}

const dbPath = join(dbDir, 'crm.db'); // Имя базы данных
const db = new Database(dbPath);

async function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      primary_department_id INTEGER,
      FOREIGN KEY (primary_department_id) REFERENCES departments (id)
    )
  `);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_departments (
      user_id INTEGER NOT NULL,
      department_id INTEGER NOT NULL,
      PRIMARY KEY (user_id, department_id),
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (department_id) REFERENCES departments (id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department_id INTEGER NOT NULL,
      data TEXT NOT NULL,
      FOREIGN KEY (department_id) REFERENCES departments (id)
    )
  `);

  const { departments, users } = await import('../src/data/users.js');

  const depCount = db.prepare('SELECT COUNT(*) as count FROM departments').get();
  
  if (depCount.count === 0) {
    const insertDepartment = db.prepare('INSERT INTO departments (id, name) VALUES (?, ?)');
    departments.forEach(dept => {
      try {
        insertDepartment.run(dept.id, dept.name);
      } catch (err) {
        console.error(`Ошибка при добавлении отдела ${dept.name}:`, err.message);
      }
    });
  }

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  
  if (userCount.count === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (username, password, name, role, primary_department_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const insertUserDepartment = db.prepare(`
      INSERT INTO user_departments (user_id, department_id)
      VALUES (?, ?)
    `);
    
    users.forEach(user => {
      try {
        const result = insertUser.run(
          user.username,
          user.password,
          user.name,
          user.role,
          user.department_id
        );
        
        const userId = result.lastInsertRowid;
        
        if (user.department_id) {
          insertUserDepartment.run(userId, user.department_id);
        }
        
        if (user.department_ids && Array.isArray(user.department_ids)) {
          user.department_ids.forEach(deptId => {
            if (deptId !== user.department_id) {
              insertUserDepartment.run(userId, deptId);
            }
          });
        }
      } catch (err) {
        console.error(`Ошибка при добавлении пользователя ${user.username}:`, err.message);
      }
    });
  }
}

await initializeDatabase();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get('/api/users', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT u.id, u.username, u.name, u.role, d.name AS primary_department, u.primary_department_id
      FROM users u
      LEFT JOIN departments d ON u.primary_department_id = d.id
    `).all();
    
    for (const user of users) {
      const departments = db.prepare(`
        SELECT d.id, d.name
        FROM departments d
        JOIN user_departments ud ON d.id = ud.department_id
        WHERE ud.user_id = ?
      `).all(user.id);
      
      user.departments = departments;
    }
    
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/departments', (req, res) => {
  try {
    const departments = db.prepare('SELECT * FROM departments').all();
    res.json(departments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/departments', (req, res) => {
  const { name } = req.body;
  
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ 
      success: false, 
      message: 'Имя отдела обязательно и должно быть непустой строкой' 
    });
  }
  
  try {
    const insertDepartment = db.prepare('INSERT INTO departments (name) VALUES (?)');
    const result = insertDepartment.run(name.trim());
    const newDeptId = result.lastInsertRowid;
    
    const newDepartment = db.prepare('SELECT * FROM departments WHERE id = ?').get(newDeptId);
    
    if (!newDepartment) {
      return res.status(500).json({ 
        success: false, 
        message: 'Не удалось получить созданный отдел из базы данных' 
      });
    }
    
    res.status(201).json({ 
      success: true, 
      department: newDepartment,
      message: 'Отдел успешно создан' 
    });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      res.status(409).json({ 
        success: false, 
        message: 'Отдел с таким именем уже существует' 
      });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

app.put('/api/departments/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ 
      success: false, 
      message: 'Имя отдела обязательно и должно быть непустой строкой' 
    });
  }
  
  try {
    const updateDepartment = db.prepare('UPDATE departments SET name = ? WHERE id = ?');
    const result = updateDepartment.run(name.trim(), id);
    
    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Отдел не найден' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Отдел успешно обновлен' 
    });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      res.status(409).json({ 
        success: false, 
        message: 'Отдел с таким именем уже существует' 
      });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

app.delete('/api/departments/:id', (req, res) => {
  const { id } = req.params;
  
  try {
    const usersWithDepartment = db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE primary_department_id = ?
      UNION ALL
      SELECT COUNT(*) as count FROM user_departments WHERE department_id = ?
    `).all(id, id);
    
    const totalReferences = usersWithDepartment.reduce((sum, row) => sum + row.count, 0);
    
    if (totalReferences > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'Невозможно удалить отдел, так как он связан с пользователями' 
      });
    }
    
    const tasksCount = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE department_id = ?').get(id);
    
    if (tasksCount.count > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'Невозможно удалить отдел, так как с ним связаны задачи' 
      });
    }
    
    const deleteDepartment = db.prepare('DELETE FROM departments WHERE id = ?');
    const result = deleteDepartment.run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Отдел не найден' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Отдел успешно удален' 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth', (req, res) => {
  const { username, password } = req.body;
  
  try {
    const user = db.prepare(`
      SELECT u.id, u.username, u.name, u.role, d.name AS primary_department, u.primary_department_id
      FROM users u
      LEFT JOIN departments d ON u.primary_department_id = d.id
      WHERE u.username = ? AND u.password = ?
    `).get(username, password);
    
    if (user) {
      const departments = db.prepare(`
        SELECT d.id, d.name
        FROM departments d
        JOIN user_departments ud ON d.id = ud.department_id
        WHERE ud.user_id = ?
      `).all(user.id);
      
      user.departments = departments;
      
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: 'Неверное имя пользователя или пароль' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', (req, res) => {
  const { username, password, name, role, primary_department_id, department_ids } = req.body;
  
  if (!username || typeof username !== 'string' || username.trim() === '') {
    return res.status(400).json({ 
      success: false, 
      message: 'Имя пользователя обязательно и должно быть непустой строкой' 
    });
  }
  
  if (!password || typeof password !== 'string' || password.length < 4) {
    return res.status(400).json({ 
      success: false, 
      message: 'Пароль обязателен и должен содержать минимум 4 символа' 
    });
  }
  
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ 
      success: false, 
      message: 'Имя обязательно и должно быть непустой строкой' 
    });
  }
  
  if (!role || !['admin', 'user', 'superadmin'].includes(role)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Роль обязательна и должна быть одной из: admin, user, superadmin' 
    });
  }
  
  try {
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'Пользователь с таким именем уже существует' 
      });
    }
    
    if (primary_department_id) {
      const departmentExists = db.prepare('SELECT id FROM departments WHERE id = ?').get(primary_department_id);
      if (!departmentExists) {
        return res.status(404).json({ 
          success: false, 
          message: 'Указанный основной отдел не существует' 
        });
      }
    }
    
    if (department_ids && Array.isArray(department_ids) && department_ids.length > 0) {
      const placeholders = department_ids.map(() => '?').join(', ');
      const validDepartments = db.prepare(`SELECT COUNT(*) as count FROM departments WHERE id IN (${placeholders})`).get(...department_ids);
      
      if (validDepartments.count !== department_ids.length) {
        return res.status(404).json({ 
          success: false, 
          message: 'Один или несколько указанных отделов не существуют' 
        });
      }
    }
    
    const transaction = db.transaction(() => {
      const insertUser = db.prepare(`
        INSERT INTO users (username, password, name, role, primary_department_id)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const result = insertUser.run(username, password, name, role, primary_department_id);
      const userId = result.lastInsertRowid;
      
      const insertUserDepartment = db.prepare(`
        INSERT INTO user_departments (user_id, department_id)
        VALUES (?, ?)
      `);
      
      if (primary_department_id) {
        insertUserDepartment.run(userId, primary_department_id);
      }
      
      if (department_ids && Array.isArray(department_ids)) {
        department_ids.forEach(deptId => {
          if (deptId !== primary_department_id) {
            insertUserDepartment.run(userId, deptId);
          }
        });
      }
      
      return userId;
    });
    
    const userId = transaction();
    
    const newUser = db.prepare(`
        SELECT u.id, u.username, u.name, u.role, u.primary_department_id
        FROM users u
        WHERE u.id = ?
      `).get(userId);
      
    if (!newUser) {
      return res.status(500).json({ success: false, message: 'Не удалось получить созданного пользователя из базы данных' });
    }
      
    const newUserDepartments = db.prepare(`
        SELECT d.id, d.name
        FROM departments d
        JOIN user_departments ud ON d.id = ud.department_id
        WHERE ud.user_id = ?
      `).all(userId);
      
    newUser.departments = newUserDepartments;
    
    res.status(201).json({ 
      success: true, 
      user: newUser,
      message: 'Пользователь успешно создан' 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: 'Ошибка при создании пользователя',
      error: err.message 
    });
  }
});

app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { password, name, role, primary_department_id, department_ids } = req.body;
  
  try {
    const transaction = db.transaction(() => {
      const updateUser = db.prepare(`
        UPDATE users 
        SET 
          password = COALESCE(?, password),
          name = COALESCE(?, name),
          role = COALESCE(?, role),
          primary_department_id = COALESCE(?, primary_department_id)
        WHERE id = ?
      `);
      
      updateUser.run(password, name, role, primary_department_id, id);
      
      if (department_ids && Array.isArray(department_ids)) {
        db.prepare('DELETE FROM user_departments WHERE user_id = ?').run(id);
        
        const insertUserDepartment = db.prepare(`
          INSERT INTO user_departments (user_id, department_id)
          VALUES (?, ?)
        `);
        
        department_ids.forEach(deptId => {
          insertUserDepartment.run(id, deptId);
        });
      }
    });
    
    transaction();
    
    const updatedUser = db.prepare(`
        SELECT u.id, u.username, u.name, u.role, u.primary_department_id
        FROM users u
        WHERE u.id = ?
      `).get(id);
      
    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'Обновленный пользователь не найден после транзакции' });
    }
      
    const updatedDepartments = db.prepare(`
        SELECT d.id, d.name
        FROM departments d
        JOIN user_departments ud ON d.id = ud.department_id
        WHERE ud.user_id = ?
      `).all(id);
      
    updatedUser.departments = updatedDepartments;
    
    res.json({ 
      success: true, 
      message: 'Пользователь успешно обновлен',
      user: updatedUser
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  
  try {
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM user_departments WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM users WHERE id = ?').run(id);
    });
    
    transaction();
    
    res.json({ 
      success: true, 
      message: 'Пользователь успешно удален' 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tasks/:departmentId', (req, res) => {
  const { departmentId } = req.params;
  
  try {
    const taskData = db.prepare(
      'SELECT data FROM tasks WHERE department_id = ?'
    ).get(departmentId);
    
    if (taskData) {
      res.json({ 
        success: true, 
        tasks: JSON.parse(taskData.data)
      });
    } else {
      res.json({ 
        success: true, 
        tasks: {} 
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks/:departmentId', (req, res) => {
  const { departmentId } = req.params;
  const { tasks } = req.body;
  
  try {
    const existingTask = db.prepare(
      'SELECT id FROM tasks WHERE department_id = ?'
    ).get(departmentId);
    
    if (existingTask) {
      db.prepare(
        'UPDATE tasks SET data = ? WHERE department_id = ?'
      ).run(JSON.stringify(tasks), departmentId);
    } else {
      db.prepare(
        'INSERT INTO tasks (department_id, data) VALUES (?, ?)'
      ).run(departmentId, JSON.stringify(tasks));
    }
    
    res.json({ 
      success: true, 
      message: 'Задачи успешно сохранены' 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/departments/:departmentId/users', (req, res) => {
  const { departmentId } = req.params;
  
  try {
    const users = db.prepare(`
      SELECT u.id, u.username, u.name, u.role, d.name AS primary_department, u.primary_department_id
      FROM users u
      JOIN user_departments ud ON u.id = ud.user_id
      LEFT JOIN departments d ON u.primary_department_id = d.id
      WHERE ud.department_id = ?
    `).all(departmentId);
    
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
}); 