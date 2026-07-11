import React, { useEffect, useState } from 'react';
import { Sidebar } from '../components/Sidebar.js';
import { Topbar } from '../components/Topbar.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../utils/axios.js';
import { useSocket } from '../hooks/useSocket.js';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../components/Modal.js';
import { 
  Megaphone, 
  AlertOctagon, 
  Info, 
  AlertTriangle,
  Plus,
  Trash2,
  Calendar
} from 'lucide-react';

const noticeSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  content: z.string().min(5, 'Content must be at least 5 characters'),
  severity: z.enum(['info', 'warning', 'emergency']),
  expiresInDays: z.number().int().positive().optional(),
});

type NoticeFields = z.infer<typeof noticeSchema>;

export const NoticeBoardPage: React.FC = () => {
  const { user } = useAuth();
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isStaffOrAdmin = user && ['staff', 'campus-admin', 'super-admin'].includes(user.role);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<NoticeFields>({
    resolver: zodResolver(noticeSchema)
  });

  const fetchNotices = async () => {
    try {
      const res = await api.get('/notices');
      setNotices(res.data.data);
    } catch (e) {
      console.error('Failed to fetch notices:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, [user]);

  // Real-time synchronization
  useSocket(user?.campusId, undefined, (event, data) => {
    if (event === 'new_notice') {
      setNotices((prev) => [data, ...prev]);
    }
  });

  const onSubmitNotice = async (data: NoticeFields) => {
    try {
      await api.post('/notices', data);
      setIsModalOpen(false);
      reset();
      fetchNotices();
    } catch (err) {
      console.error('Failed to create notice:', err);
    }
  };

  const handleDeleteNotice = async (noticeId: string) => {
    if (confirm('Are you sure you want to remove this notice?')) {
      try {
        await api.delete(`/notices/${noticeId}`);
        fetchNotices();
      } catch (err) {
        console.error('Failed to remove notice:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-wrapper">
          <Topbar />
          <div style={{ padding: '32px' }}>Loading notices...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-wrapper">
        <Topbar />

        <div style={{ padding: '32px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }} className="text-gradient">Notice Board</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
                Official broadcasts and warnings from your university administration
              </p>
            </div>

            {isStaffOrAdmin && (
              <button onClick={() => setIsModalOpen(true)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                <Plus size={16} />
                <span>Add Notice</span>
              </button>
            )}
          </div>

          {/* Emergency Alert banners list */}
          {notices.filter((n) => n.severity === 'emergency').map((n) => (
            <div key={n._id} className="emergency-banner" style={{ borderRadius: 'var(--border-radius)', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AlertOctagon size={20} />
                <div>
                  <strong style={{ display: 'block', fontSize: '1rem' }}>EMERGENCY: {n.title}</strong>
                  <span style={{ fontSize: '0.85rem', fontWeight: 400 }}>{n.content}</span>
                </div>
              </div>
              {isStaffOrAdmin && (
                <button 
                  onClick={() => handleDeleteNotice(n._id)} 
                  style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          ))}

          {/* Standard warnings grid */}
          <div className="grid-2">
            {notices.filter((n) => n.severity !== 'emergency').map((n) => {
              const isWarning = n.severity === 'warning';
              return (
                <div key={n._id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: `4px solid ${isWarning ? 'var(--status-progress)' : 'var(--primary)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isWarning ? <AlertTriangle size={18} color="var(--status-progress)" /> : <Info size={18} color="var(--primary)" />}
                      <span style={{ fontSize: '1.05rem', fontWeight: 700 }}>{n.title}</span>
                    </div>

                    {isStaffOrAdmin && (
                      <button 
                        onClick={() => handleDeleteNotice(n._id)} 
                        className="btn btn-outline" 
                        style={{ padding: '6px', borderRadius: '50%' }}
                      >
                        <Trash2 size={14} color="var(--status-open)" />
                      </button>
                    )}
                  </div>

                  <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.5', flexGrow: 1 }}>
                    {n.content}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                    <span>Published by admin</span>
                    {n.expiresAt && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} />
                        Expires {new Date(n.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {notices.length === 0 && (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No notifications or notices on the board.
            </div>
          )}
        </div>
      </div>

      {/* Add Notice Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Publish Notice">
        <form onSubmit={handleSubmit(onSubmitNotice)}>
          <div className="form-group">
            <label className="form-label">Notice Title</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="e.g. Science Library Lift Maintenance"
              {...register('title')} 
            />
            {errors.title && <p className="form-error">{errors.title.message}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Notice Content</label>
            <textarea 
              className="form-control" 
              style={{ minHeight: '100px', resize: 'vertical' }}
              placeholder="Describe the notice broadcast details here..."
              {...register('content')} 
            />
            {errors.content && <p className="form-error">{errors.content.message}</p>}
          </div>

          <div className="grid-2" style={{ marginBottom: '0px' }}>
            <div className="form-group">
              <label className="form-label">Severity Level</label>
              <select className="form-control" {...register('severity')}>
                <option value="info">Info (Blue)</option>
                <option value="warning">Warning (Amber)</option>
                <option value="emergency">Emergency (Red Flash Banner)</option>
              </select>
              {errors.severity && <p className="form-error">{errors.severity.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Expiration (Days)</label>
              <input 
                type="number" 
                className="form-control" 
                placeholder="e.g. 7 (Optional)"
                {...register('expiresInDays', { valueAsNumber: true })} 
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Publish Notice</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
