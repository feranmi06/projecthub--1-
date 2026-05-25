import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const PRIORITY_OPTS = ['low', 'medium', 'high'];
const STATUS_OPTS = ['todo', 'in_progress', 'review', 'done'];

export default function TaskModal({ task, projectId, defaultStatus, members, onClose, onSaved, onDeleted }) {
  const { user } = useAuth();
  const isNew = !task;
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: defaultStatus || 'todo',
    priority: 'medium',
    assignee_id: '',
    due_date: '',
  });
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        assignee_id: task.assignee_id || '',
        due_date: task.due_date || '',
      });
      setLoading(true);
      axios.get(`/api/tasks/${task.id}/comments`)
        .then(res => setComments(res.data))
        .finally(() => setLoading(false));
    }
  }, [task]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, assignee_id: form.assignee_id || null };
      if (isNew) {
        const res = await axios.post(`/api/projects/${projectId}/tasks`, payload);
        onSaved(res.data, true);
      } else {
        const res = await axios.put(`/api/tasks/${task.id}`, payload);
        onSaved(res.data, false);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this task?')) return;
    await axios.delete(`/api/tasks/${task.id}`);
    onDeleted(task.id);
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const res = await axios.post(`/api/tasks/${task.id}/comments`, { content: newComment });
    setComments(prev => [...prev, res.data]);
    setNewComment('');
  };

  const initials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const formatTime = (dt) => new Date(dt).toLocaleString();

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>{isNew ? 'Create Task' : 'Edit Task'}</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {!isNew && (
              <button style={styles.deleteBtn} onClick={handleDelete}>🗑 Delete</button>
            )}
            <button style={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        <div style={styles.modalBody}>
          {/* Left: Form */}
          <form onSubmit={handleSave} style={styles.formCol}>
            <div style={styles.field}>
              <label style={styles.label}>Title *</label>
              <input
                style={styles.input}
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Task title..."
                required autoFocus={isNew}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Description</label>
              <textarea
                style={{ ...styles.input, height: 90, resize: 'vertical' }}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the task..."
              />
            </div>

            <div style={styles.row2}>
              <div style={styles.field}>
                <label style={styles.label}>Status</label>
                <select style={styles.select} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {STATUS_OPTS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Priority</label>
                <select style={styles.select} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                  {PRIORITY_OPTS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div style={styles.row2}>
              <div style={styles.field}>
                <label style={styles.label}>Assignee</label>
                <select style={styles.select} value={form.assignee_id} onChange={e => setForm({ ...form, assignee_id: e.target.value })}>
                  <option value="">Unassigned</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Due Date</label>
                <input
                  style={styles.input}
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" style={saving ? styles.btnDisabled : styles.btn} disabled={saving}>
              {saving ? 'Saving...' : (isNew ? 'Create Task' : 'Save Changes')}
            </button>
          </form>

          {/* Right: Comments (only for existing tasks) */}
          {!isNew && (
            <div style={styles.commentsCol}>
              <h3 style={styles.commentsTitle}>Comments</h3>
              {loading ? (
                <p style={{ color: '#9ca3af', fontSize: 13 }}>Loading...</p>
              ) : comments.length === 0 ? (
                <p style={styles.noComments}>No comments yet. Be the first!</p>
              ) : (
                <div style={styles.commentList}>
                  {comments.map(c => (
                    <div key={c.id} style={styles.comment}>
                      <div style={styles.commentHeader}>
                        <div style={styles.commentAvatar}>{initials(c.user_name)}</div>
                        <div>
                          <span style={styles.commentAuthor}>{c.user_name}</span>
                          <span style={styles.commentTime}>{formatTime(c.created_at)}</span>
                        </div>
                      </div>
                      <p style={styles.commentText}>{c.content}</p>
                    </div>
                  ))}
                </div>
              )}
              <form onSubmit={submitComment} style={styles.commentForm}>
                <div style={styles.commentAvatar}>{initials(user?.name)}</div>
                <input
                  style={styles.commentInput}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                />
                <button type="submit" style={styles.commentBtn}>Send</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal: { background: '#fff', borderRadius: 16, width: '90vw', maxWidth: 800, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.25)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb' },
  modalTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a2e' },
  closeBtn: { background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 15, color: '#6b7280' },
  deleteBtn: { background: '#fef2f2', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13, color: '#dc2626' },
  modalBody: { display: 'flex', flex: 1, overflow: 'hidden' },
  formCol: { flex: 1, padding: '1.5rem', overflowY: 'auto', borderRight: '1px solid #e5e7eb' },
  field: { marginBottom: 14, flex: 1 },
  row2: { display: 'flex', gap: 12 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.5px' },
  input: { width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  select: { width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff', cursor: 'pointer' },
  btn: { width: '100%', padding: '10px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  btnDisabled: { width: '100%', padding: '10px', background: '#a5b4fc', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'not-allowed', marginTop: 8 },
  commentsCol: { width: 300, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 },
  commentsTitle: { margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#1a1a2e' },
  noComments: { color: '#9ca3af', fontSize: 13 },
  commentList: { display: 'flex', flexDirection: 'column', gap: 12, flex: 1 },
  comment: { background: '#f9fafb', borderRadius: 10, padding: '10px 12px' },
  commentHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  commentAvatar: { width: 28, height: 28, borderRadius: '50%', background: '#6366f1', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  commentAuthor: { fontSize: 13, fontWeight: 600, color: '#374151', display: 'block' },
  commentTime: { fontSize: 11, color: '#9ca3af', marginLeft: 6 },
  commentText: { margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.5 },
  commentForm: { display: 'flex', gap: 8, alignItems: 'center', paddingTop: 12, borderTop: '1px solid #e5e7eb' },
  commentInput: { flex: 1, padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none' },
  commentBtn: { padding: '8px 14px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 },
};
