const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:3000', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

const JWT_SECRET = 'supersecretkey123';
const PORT = 5000;
const DB_FILE = path.join(__dirname, 'db.json');

// JSON "database" helpers 
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const empty = { users: [], projects: [], members: [], tasks: [], comments: [], notifications: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(empty, null, 2));
    return empty;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}
function nextId(arr) {
  return arr.length === 0 ? 1 : Math.max(...arr.map(x => x.id)) + 1;
}

// AUTH MIDDLEWARE 
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

// AUTH ROUTES 
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  const db = readDB();
  if (db.users.find(u => u.email === email)) return res.status(400).json({ error: 'Email already in use' });
  const user = { id: nextId(db.users), name, email, password: bcrypt.hashSync(password, 10), created_at: new Date().toISOString() };
  db.users.push(user);
  writeDB(db);
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

app.get('/api/auth/me', auth, (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  const { password: _, ...safeUser } = user;
  res.json(safeUser);
});

// USER ROUTES 
app.get('/api/users', auth, (req, res) => {
  const db = readDB();
  res.json(db.users.map(({ password: _, ...u }) => u));
});

// PROJECT ROUTES 
app.get('/api/projects', auth, (req, res) => {
  const db = readDB();
  const myProjectIds = [
    ...db.projects.filter(p => p.owner_id === req.user.id).map(p => p.id),
    ...db.members.filter(m => m.user_id === req.user.id).map(m => m.project_id)
  ];
  const unique = [...new Set(myProjectIds)];
  const projects = unique.map(pid => {
    const p = db.projects.find(x => x.id === pid);
    if (!p) return null;
    const owner = db.users.find(u => u.id === p.owner_id);
    return {
      ...p,
      owner_name: owner?.name,
      task_count: db.tasks.filter(t => t.project_id === pid).length,
      member_count: db.members.filter(m => m.project_id === pid).length,
    };
  }).filter(Boolean).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(projects);
});

app.post('/api/projects', auth, (req, res) => {
  const { name, description, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const db = readDB();
  const project = { id: nextId(db.projects), name, description: description || '', owner_id: req.user.id, color: color || '#6366f1', created_at: new Date().toISOString() };
  db.projects.push(project);
  db.members.push({ project_id: project.id, user_id: req.user.id, role: 'owner' });
  writeDB(db);
  io.emit('project:created', project);
  res.json(project);
});

app.get('/api/projects/:id', auth, (req, res) => {
  const db = readDB();
  const pid = parseInt(req.params.id);
  const project = db.projects.find(p => p.id === pid);
  if (!project) return res.status(404).json({ error: 'Not found' });
  const owner = db.users.find(u => u.id === project.owner_id);
  const members = db.members.filter(m => m.project_id === pid).map(m => {
    const u = db.users.find(u => u.id === m.user_id);
    return { id: u.id, name: u.name, email: u.email, role: m.role };
  });
  res.json({ ...project, owner_name: owner?.name, members });
});

app.delete('/api/projects/:id', auth, (req, res) => {
  const db = readDB();
  const pid = parseInt(req.params.id);
  const project = db.projects.find(p => p.id === pid);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (project.owner_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const taskIds = db.tasks.filter(t => t.project_id === pid).map(t => t.id);
  db.comments = db.comments.filter(c => !taskIds.includes(c.task_id));
  db.tasks = db.tasks.filter(t => t.project_id !== pid);
  db.members = db.members.filter(m => m.project_id !== pid);
  db.projects = db.projects.filter(p => p.id !== pid);
  writeDB(db);
  res.json({ message: 'Deleted' });
});

app.post('/api/projects/:id/members', auth, (req, res) => {
  const db = readDB();
  const pid = parseInt(req.params.id);
  const uid = parseInt(req.body.userId);
  if (!db.members.find(m => m.project_id === pid && m.user_id === uid)) {
    db.members.push({ project_id: pid, user_id: uid, role: 'member' });
    writeDB(db);
  }
  res.json({ message: 'Added' });
});

// TASK ROUTES 
app.get('/api/projects/:id/tasks', auth, (req, res) => {
  const db = readDB();
  const pid = parseInt(req.params.id);
  const tasks = db.tasks.filter(t => t.project_id === pid).map(t => {
    const assignee = db.users.find(u => u.id === t.assignee_id);
    return { ...t, assignee_name: assignee?.name, comment_count: db.comments.filter(c => c.task_id === t.id).length };
  }).sort((a, b) => a.position - b.position);
  res.json(tasks);
});

app.post('/api/projects/:id/tasks', auth, (req, res) => {
  const { title, description, status, priority, assignee_id, due_date } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const db = readDB();
  const pid = parseInt(req.params.id);
  const statusTasks = db.tasks.filter(t => t.project_id === pid && t.status === (status || 'todo'));
  const maxPos = statusTasks.length ? Math.max(...statusTasks.map(t => t.position)) : 0;
  const task = {
    id: nextId(db.tasks), title, description: description || '',
    status: status || 'todo', priority: priority || 'medium',
    project_id: pid, assignee_id: assignee_id ? parseInt(assignee_id) : null,
    due_date: due_date || null, created_by: req.user.id,
    position: maxPos + 1, created_at: new Date().toISOString()
  };
  db.tasks.push(task);
  if (assignee_id && parseInt(assignee_id) !== req.user.id) {
    const creator = db.users.find(u => u.id === req.user.id);
    db.notifications.push({ id: nextId(db.notifications), user_id: parseInt(assignee_id), type: 'task_assigned', message: `${creator.name} assigned you "${title}"`, is_read: 0, ref_id: task.id, created_at: new Date().toISOString() });
    io.to(`user:${assignee_id}`).emit('notification', { message: `${creator.name} assigned you "${title}"` });
  }
  writeDB(db);
  const assignee = db.users.find(u => u.id === task.assignee_id);
  const fullTask = { ...task, assignee_name: assignee?.name, comment_count: 0 };
  io.to(`project:${pid}`).emit('task:created', fullTask);
  res.json(fullTask);
});

app.put('/api/tasks/:id', auth, (req, res) => {
  const db = readDB();
  const tid = parseInt(req.params.id);
  const idx = db.tasks.findIndex(t => t.id === tid);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const task = db.tasks[idx];
  const { title, description, status, priority, assignee_id, due_date, position } = req.body;
  db.tasks[idx] = {
    ...task,
    title: title ?? task.title,
    description: description ?? task.description,
    status: status ?? task.status,
    priority: priority ?? task.priority,
    assignee_id: assignee_id !== undefined ? (assignee_id ? parseInt(assignee_id) : null) : task.assignee_id,
    due_date: due_date ?? task.due_date,
    position: position ?? task.position,
  };
  writeDB(db);
  const assignee = db.users.find(u => u.id === db.tasks[idx].assignee_id);
  const updated = { ...db.tasks[idx], assignee_name: assignee?.name, comment_count: db.comments.filter(c => c.task_id === tid).length };
  io.to(`project:${task.project_id}`).emit('task:updated', updated);
  res.json(updated);
});

app.delete('/api/tasks/:id', auth, (req, res) => {
  const db = readDB();
  const tid = parseInt(req.params.id);
  const task = db.tasks.find(t => t.id === tid);
  if (!task) return res.status(404).json({ error: 'Not found' });
  db.comments = db.comments.filter(c => c.task_id !== tid);
  db.tasks = db.tasks.filter(t => t.id !== tid);
  writeDB(db);
  io.to(`project:${task.project_id}`).emit('task:deleted', { id: tid });
  res.json({ message: 'Deleted' });
});

// COMMENT ROUTES 
app.get('/api/tasks/:id/comments', auth, (req, res) => {
  const db = readDB();
  const tid = parseInt(req.params.id);
  const comments = db.comments.filter(c => c.task_id === tid).map(c => {
    const user = db.users.find(u => u.id === c.user_id);
    return { ...c, user_name: user?.name };
  }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  res.json(comments);
});

app.post('/api/tasks/:id/comments', auth, (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
  const db = readDB();
  const tid = parseInt(req.params.id);
  const task = db.tasks.find(t => t.id === tid);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const user = db.users.find(u => u.id === req.user.id);
  const comment = { id: nextId(db.comments), content: content.trim(), task_id: tid, user_id: req.user.id, created_at: new Date().toISOString() };
  db.comments.push(comment);
  writeDB(db);
  const fullComment = { ...comment, user_name: user?.name };
  io.to(`project:${task.project_id}`).emit('comment:created', fullComment);
  res.json(fullComment);
});

// NOTIFICATION ROUTES 
app.get('/api/notifications', auth, (req, res) => {
  const db = readDB();
  res.json(db.notifications.filter(n => n.user_id === req.user.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 20));
});

app.put('/api/notifications/read', auth, (req, res) => {
  const db = readDB();
  db.notifications.forEach(n => { if (n.user_id === req.user.id) n.is_read = 1; });
  writeDB(db);
  res.json({ message: 'Done' });
});

//  WEBSOCKET 
io.on('connection', (socket) => {
  socket.on('join:project', (id) => socket.join(`project:${id}`));
  socket.on('join:user', (id) => socket.join(`user:${id}`));
  socket.on('leave:project', (id) => socket.leave(`project:${id}`));
});

server.listen(PORT, () => console.log(`ProjectHub running on http://localhost:${PORT}`));