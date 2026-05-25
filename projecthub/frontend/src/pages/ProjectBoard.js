import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import TaskModal from '../components/TaskModal';

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: '#6b7280' },
  { id: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { id: 'review', label: 'In Review', color: '#6366f1' },
  { id: 'done', label: 'Done', color: '#10b981' },
];

const PRIORITY_COLORS = { low: '#10b981', medium: '#f59e0b', high: '#ef4444' };

export default function ProjectBoard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState('todo');
  const [dragging, setDragging] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteUserId, setInviteUserId] = useState('');

  useEffect(() => {
    Promise.all([
      axios.get(`/api/projects/${id}`),
      axios.get(`/api/projects/${id}/tasks`),
      axios.get('/api/users'),
    ]).then(([proj, taskRes, usersRes]) => {
      setProject(proj.data);
      setMembers(proj.data.members || []);
      setTasks(taskRes.data);
      setAllUsers(usersRes.data);
    });
  }, [id]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('join:project', id);
    socket.on('task:created', task => setTasks(prev => [...prev, task]));
    socket.on('task:updated', task => setTasks(prev => prev.map(t => t.id === task.id ? task : t)));
    socket.on('task:deleted', ({ id: taskId }) => setTasks(prev => prev.filter(t => t.id !== taskId)));
    socket.on('comment:created', () => {});
    return () => {
      socket.emit('leave:project', id);
      ['task:created', 'task:updated', 'task:deleted'].forEach(e => socket.off(e));
    };
  }, [socket, id]);

  const tasksByStatus = (status) => tasks.filter(t => t.status === status);

  const openNewTask = (status) => {
    setSelectedTask(null);
    setNewTaskStatus(status);
    setShowTaskModal(true);
  };

  const openTask = (task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleDragStart = (e, task) => {
    setDragging(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e, status) => {
    e.preventDefault();
    if (!dragging || dragging.status === status) { setDragging(null); return; }
    await axios.put(`/api/tasks/${dragging.id}`, { status });
    setTasks(prev => prev.map(t => t.id === dragging.id ? { ...t, status } : t));
    setDragging(null);
  };

  const inviteMember = async (e) => {
    e.preventDefault();
    if (!inviteUserId) return;
    await axios.post(`/api/projects/${id}/members`, { userId: inviteUserId });
    const user = allUsers.find(u => u.id === parseInt(inviteUserId));
    if (user) setMembers(prev => [...prev, { ...user, role: 'member' }]);
    setInviteUserId('');
    setShowInvite(false);
  };

  const initials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (!project) return <div style={styles.loading}>Loading project...</div>;

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={styles.backBtn} onClick={() => navigate('/')}>← Back</button>
          <div style={{ ...styles.colorDot, background: project.color }} />
          <div>
            <h1 style={styles.h1}>{project.name}</h1>
            {project.description && <p style={styles.desc}>{project.description}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Member avatars */}
          <div style={{ display: 'flex' }}>
            {members.slice(0, 4).map((m, i) => (
              <div key={m.id} style={{ ...styles.memberAvatar, marginLeft: i > 0 ? -10 : 0, zIndex: 10 - i }}
                title={m.name}>
                {initials(m.name)}
              </div>
            ))}
            {members.length > 4 && (
              <div style={{ ...styles.memberAvatar, marginLeft: -10, background: '#e5e7eb', color: '#374151' }}>
                +{members.length - 4}
              </div>
            )}
          </div>
          <button style={styles.inviteBtn} onClick={() => setShowInvite(true)}>+ Invite</button>
        </div>
      </header>

      {/* Board */}
      <div style={styles.board}>
        {COLUMNS.map(col => (
          <div
            key={col.id}
            style={styles.column}
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, col.id)}
          >
            <div style={styles.colHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ ...styles.colDot, background: col.color }} />
                <span style={styles.colTitle}>{col.label}</span>
                <span style={styles.colCount}>{tasksByStatus(col.id).length}</span>
              </div>
              <button style={styles.addBtn} onClick={() => openNewTask(col.id)}>+</button>
            </div>

            <div style={styles.cards}>
              {tasksByStatus(col.id).map(task => (
                <div
                  key={task.id}
                  style={{ ...styles.taskCard, opacity: dragging?.id === task.id ? 0.5 : 1 }}
                  draggable
                  onDragStart={e => handleDragStart(e, task)}
                  onClick={() => openTask(task)}
                >
                  <div style={styles.taskTop}>
                    <span style={{ ...styles.priorityBadge, background: PRIORITY_COLORS[task.priority] + '20', color: PRIORITY_COLORS[task.priority] }}>
                      {task.priority}
                    </span>
                    {task.comment_count > 0 && (
                      <span style={styles.commentCount}>💬 {task.comment_count}</span>
                    )}
                  </div>
                  <p style={styles.taskTitle}>{task.title}</p>
                  {task.description && <p style={styles.taskDesc}>{task.description.slice(0, 80)}{task.description.length > 80 ? '...' : ''}</p>}
                  <div style={styles.taskFooter}>
                    {task.assignee_name ? (
                      <div style={styles.assigneeChip}>
                        <div style={styles.assigneeAvatar}>{initials(task.assignee_name)}</div>
                        <span>{task.assignee_name}</span>
                      </div>
                    ) : (
                      <span style={{ color: '#d1d5db', fontSize: 12 }}>Unassigned</span>
                    )}
                    {task.due_date && (
                      <span style={styles.dueDate}>📅 {new Date(task.due_date).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button style={styles.addTaskBtn} onClick={() => openNewTask(col.id)}>
              + Add task
            </button>
          </div>
        ))}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div style={styles.overlay} onClick={() => setShowInvite(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 1rem', fontSize: 18, fontWeight: 700 }}>Invite Member</h2>
            <form onSubmit={inviteMember}>
              <select
                style={styles.select}
                value={inviteUserId}
                onChange={e => setInviteUserId(e.target.value)}
                required
              >
                <option value="">Select a user...</option>
                {allUsers.filter(u => !members.find(m => m.id === u.id)).map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowInvite(false)}>Cancel</button>
                <button type="submit" style={styles.submitBtn}>Invite</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <TaskModal
          task={selectedTask}
          projectId={id}
          defaultStatus={newTaskStatus}
          members={members}
          onClose={() => setShowTaskModal(false)}
          onSaved={(task, isNew) => {
            if (isNew) setTasks(prev => [...prev, task]);
            else setTasks(prev => prev.map(t => t.id === task.id ? task : t));
            setShowTaskModal(false);
          }}
          onDeleted={(taskId) => {
            setTasks(prev => prev.filter(t => t.id !== taskId));
            setShowTaskModal(false);
          }}
        />
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 18, color: '#6b7280' },
  header: { background: '#fff', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', flexShrink: 0 },
  backBtn: { background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14, padding: '4px 8px', borderRadius: 6 },
  colorDot: { width: 12, height: 12, borderRadius: '50%', flexShrink: 0 },
  h1: { margin: 0, fontSize: 20, fontWeight: 700, color: '#1a1a2e' },
  desc: { margin: '2px 0 0', fontSize: 13, color: '#6b7280' },
  memberAvatar: { width: 32, height: 32, borderRadius: '50%', background: '#6366f1', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' },
  inviteBtn: { padding: '7px 16px', background: '#f3f4f6', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151' },
  board: { display: 'flex', gap: 16, padding: '1.5rem', overflowX: 'auto', flex: 1, alignItems: 'flex-start' },
  column: { background: '#f8fafc', borderRadius: 12, padding: '1rem', minWidth: 280, maxWidth: 320, width: 300, border: '1px solid #e2e8f0', flexShrink: 0 },
  colHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  colDot: { width: 8, height: 8, borderRadius: '50%' },
  colTitle: { fontWeight: 700, fontSize: 13, color: '#374151' },
  colCount: { background: '#e5e7eb', color: '#6b7280', fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 20 },
  addBtn: { background: 'none', border: 'none', color: '#9ca3af', fontSize: 18, cursor: 'pointer', lineHeight: 1 },
  cards: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10, minHeight: 40 },
  taskCard: { background: '#fff', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', border: '1px solid #e5e7eb', transition: 'box-shadow .15s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  taskTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  priorityBadge: { fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, textTransform: 'capitalize' },
  commentCount: { fontSize: 11, color: '#9ca3af' },
  taskTitle: { margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#1a1a2e', lineHeight: 1.4 },
  taskDesc: { margin: '0 0 10px', fontSize: 12, color: '#9ca3af', lineHeight: 1.4 },
  taskFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  assigneeChip: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151' },
  assigneeAvatar: { width: 20, height: 20, borderRadius: '50%', background: '#6366f1', color: '#fff', fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  dueDate: { fontSize: 11, color: '#9ca3af' },
  addTaskBtn: { width: '100%', padding: '8px', background: 'none', border: '1.5px dashed #d1d5db', borderRadius: 8, color: '#9ca3af', fontSize: 13, cursor: 'pointer', transition: 'all .15s' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#fff', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  select: { width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff' },
  cancelBtn: { padding: '9px 20px', background: '#f3f4f6', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' },
  submitBtn: { padding: '9px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};
