import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: COLORS[0] });
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const { notifications } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/projects').then(res => {
      setProjects(res.data);
      setLoading(false);
    });
  }, []);

  const createProject = async (e) => {
    e.preventDefault();
    const res = await axios.post('/api/projects', form);
    setProjects(prev => [res.data, ...prev]);
    setShowModal(false);
    setForm({ name: '', description: '', color: COLORS[0] });
  };

  const initials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div style={styles.page}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarTop}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>⬡</span>
            <span style={styles.logoText}>ProjectHub</span>
          </div>
          <nav>
            <div style={styles.navItem}>📋 Projects</div>
            <div style={{ ...styles.navItem, color: '#9ca3af' }}>📊 My Tasks</div>
          </nav>
        </div>
        <div style={styles.sidebarBottom}>
          <div style={styles.userRow}>
            <div style={{ ...styles.avatar, background: '#6366f1' }}>{initials(user?.name)}</div>
            <div>
              <div style={styles.userName}>{user?.name}</div>
              <div style={styles.userEmail}>{user?.email}</div>
            </div>
          </div>
          <button style={styles.logoutBtn} onClick={logout}>Sign out</button>
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.h1}>Projects</h1>
            <p style={styles.subtitle}>Manage all your team projects</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {notifications.length > 0 && (
              <div style={styles.notifBadge} title={notifications[0]?.message}>
                🔔 {notifications.length}
              </div>
            )}
            <button style={styles.createBtn} onClick={() => setShowModal(true)}>
              + New Project
            </button>
          </div>
        </div>

        {loading ? (
          <div style={styles.empty}>Loading projects...</div>
        ) : projects.length === 0 ? (
          <div style={styles.empty}>
            <p style={{ fontSize: 48 }}>📁</p>
            <p style={{ fontSize: 18, fontWeight: 600, color: '#374151' }}>No projects yet</p>
            <p style={{ color: '#9ca3af' }}>Create your first project to get started</p>
            <button style={styles.createBtn} onClick={() => setShowModal(true)}>Create Project</button>
          </div>
        ) : (
          <div style={styles.grid}>
            {projects.map(project => (
              <div
                key={project.id}
                style={styles.card}
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <div style={{ ...styles.cardStripe, background: project.color }} />
                <div style={styles.cardBody}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ ...styles.projectDot, background: project.color }} />
                    <h3 style={styles.cardTitle}>{project.name}</h3>
                  </div>
                  <p style={styles.cardDesc}>{project.description || 'No description'}</p>
                  <div style={styles.cardMeta}>
                    <span>📋 {project.task_count} tasks</span>
                    <span>👥 {project.member_count} members</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      {showModal && (
        <div style={styles.overlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 1.5rem', fontSize: 20, fontWeight: 700 }}>New Project</h2>
            <form onSubmit={createProject}>
              <div style={styles.field}>
                <label style={styles.label}>Project Name *</label>
                <input
                  style={styles.input}
                  placeholder="e.g. Website Redesign"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required autoFocus
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Description</label>
                <textarea
                  style={{ ...styles.input, height: 80, resize: 'vertical' }}
                  placeholder="What is this project about?"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Color</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <div
                      key={c}
                      onClick={() => setForm({ ...form, color: c })}
                      style={{
                        width: 32, height: 32, borderRadius: '50%', background: c, cursor: 'pointer',
                        border: form.color === c ? '3px solid #1a1a2e' : '3px solid transparent',
                        transition: 'border .15s'
                      }}
                    />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" style={styles.submitBtn}>Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { display: 'flex', minHeight: '100vh', background: '#f8f9fa' },
  sidebar: { width: 240, background: '#1a1a2e', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.5rem 1rem', flexShrink: 0 },
  sidebarTop: {},
  logo: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: '2rem' },
  logoIcon: { fontSize: 24, color: '#6366f1' },
  logoText: { fontSize: 18, fontWeight: 700, color: '#fff' },
  navItem: { padding: '10px 12px', borderRadius: 8, color: '#fff', fontSize: 14, cursor: 'pointer', marginBottom: 4 },
  sidebarBottom: {},
  userRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  avatar: { width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 },
  userName: { fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.2 },
  userEmail: { fontSize: 11, color: '#9ca3af' },
  logoutBtn: { width: '100%', padding: '8px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, color: '#9ca3af', fontSize: 13, cursor: 'pointer' },
  main: { flex: 1, padding: '2rem 2.5rem', overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' },
  h1: { margin: 0, fontSize: 28, fontWeight: 700, color: '#1a1a2e' },
  subtitle: { margin: '4px 0 0', color: '#6b7280', fontSize: 14 },
  notifBadge: { background: '#ef4444', color: '#fff', padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'default' },
  createBtn: { padding: '10px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 },
  card: { background: '#fff', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', border: '1px solid #e5e7eb', transition: 'transform .15s, box-shadow .15s', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  cardStripe: { height: 6 },
  cardBody: { padding: '1.25rem' },
  projectDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  cardTitle: { margin: 0, fontSize: 16, fontWeight: 700, color: '#1a1a2e' },
  cardDesc: { margin: '0 0 1rem', fontSize: 13, color: '#6b7280', lineHeight: 1.5 },
  cardMeta: { display: 'flex', gap: 16, fontSize: 12, color: '#9ca3af' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '5rem', textAlign: 'center' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#fff', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 },
  input: { width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  cancelBtn: { padding: '9px 20px', background: '#f3f4f6', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 500 },
  submitBtn: { padding: '9px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};
