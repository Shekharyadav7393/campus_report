import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar.js';
import { Topbar } from '../components/Topbar.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../utils/axios.js';
import { useSocket } from '../hooks/useSocket.js';
import { TicketDetailSkeleton } from '../components/LoadingSkeleton.js';
import { 
  ArrowLeft, 
  Clock, 
  MapPin, 
  Send, 
  ShieldAlert, 
  User, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [report, setReport] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Forms states
  const [commentContent, setCommentContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  // Typing status tracker
  const [typingStatus, setTypingStatus] = useState<string | null>(null);
  const typingTimeoutRef = useRef<any>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const isStaffOrAdmin = user && ['staff', 'campus-admin', 'super-admin'].includes(user.role);

  const fetchTicket = async () => {
    try {
      const res = await api.get(`/reports/${id}`);
      setReport(res.data.data);

      const commentsRes = await api.get(`/reports/${id}/comments`);
      setComments(commentsRes.data.data);
    } catch (e) {
      console.error('Error fetching ticket details:', e);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffAndDepts = async () => {
    if (isStaffOrAdmin) {
      try {
        const staffRes = await api.get('/departments/staff');
        setStaffList(staffRes.data.data);

        const deptsRes = await api.get('/departments');
        setDepartments(deptsRes.data.data);
      } catch (e) {
        console.error('Failed to load admin selectors');
      }
    }
  };

  useEffect(() => {
    fetchTicket();
    fetchStaffAndDepts();
  }, [id]);

  // Real-time synchronization
  const { emit } = useSocket(undefined, id, (event, data) => {
    if (event === 'new_comment') {
      setComments((prev) => [...prev, data.comment]);
    } else if (event === 'status_updated' || event === 'assignment_updated') {
      fetchTicket();
    } else if (event === 'typing_status') {
      setTypingStatus(data.isTyping ? `${data.name} is typing...` : null);
    }
  });

  useEffect(() => {
    // Scroll chat to bottom on new comments
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim()) return;

    try {
      // Clear typing indicator on message send
      emit('typing', { ticketId: id, name: user?.name, isTyping: false });
      
      await api.post(`/reports/${id}/comments`, {
        content: commentContent,
        isInternal: isInternal,
      });
      // Reset input
      setCommentContent('');
      setIsInternal(false);
    } catch (err) {
      console.error('Failed to post comment:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCommentContent(e.target.value);
    
    // Broadcast typing true
    emit('typing', { ticketId: id, name: user?.name, isTyping: true });
    
    // Clear typing indicator after 2 seconds of inactivity
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      emit('typing', { ticketId: id, name: user?.name, isTyping: false });
    }, 2000);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      await api.put(`/reports/${id}`, { status: newStatus });
      fetchTicket();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleAssignResolver = async (staffId: string) => {
    try {
      await api.put(`/reports/${id}`, { assignedTo: staffId || null });
      fetchTicket();
    } catch (err) {
      console.error('Failed to assign resolver:', err);
    }
  };

  const handleAssignDepartment = async (deptId: string) => {
    try {
      await api.put(`/reports/${id}`, { departmentId: deptId || null });
      fetchTicket();
    } catch (err) {
      console.error('Failed to assign department:', err);
    }
  };

  if (loading) {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-wrapper">
          <Topbar />
          <TicketDetailSkeleton />
        </div>
      </div>
    );
  }

  // Calculate SLA countdown
  const slaDate = new Date(report.slaDeadline);
  const now = new Date();
  const isBreached = now > slaDate && !['resolved', 'rejected', 'closed'].includes(report.status);
  const slaRemainingHours = Math.ceil((slaDate.getTime() - now.getTime()) / (1000 * 60 * 60));

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-wrapper">
        <Topbar />

        <div style={{ padding: '32px' }}>
          {/* Back button */}
          <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '24px', fontWeight: 500 }}>
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </Link>

          {/* Ticket Header Card */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>{report.ticketId}</span>
                  <span className={`badge badge-status-${report.status}`}>{report.status.replace('-', ' ')}</span>
                  <span className={`badge badge-sev-${report.severity}`}>{report.severity} Severity</span>
                </div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '8px' }}>{report.title}</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '16px' }}>
                  {report.description}
                </p>

                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} />
                    {report.location.building} {report.location.room && `, Room ${report.location.room}`}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} />
                    Filed {new Date(report.createdAt).toLocaleDateString()}
                  </span>
                  {report.reporter ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={14} />
                      By {report.reporter.name} ({report.reporter.role})
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--status-progress)' }}>
                      <User size={14} />
                      Anonymous Reporter
                    </span>
                  )}
                </div>
              </div>

              {/* SLA Target / Alerts block */}
              <div className="card" style={{ padding: '16px', minWidth: '220px', backgroundColor: 'rgba(9, 13, 22, 0.4)' }}>
                <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px', marginBottom: '10px' }}>
                  SLA Target Timeline
                </h4>
                {isBreached ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-open)' }}>
                    <ShieldAlert size={18} />
                    <span style={{ fontWeight: 700 }}>SLA Breached</span>
                  </div>
                ) : report.status === 'resolved' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-resolved)' }}>
                    <CheckCircle size={18} />
                    <span style={{ fontWeight: 700 }}>Resolved in SLA</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-progress)' }}>
                    <AlertCircle size={18} />
                    <span>Resolve in <strong style={{ fontWeight: 700 }}>{slaRemainingHours}h</strong></span>
                  </div>
                )}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Deadline: {new Date(report.slaDeadline).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <div className="grid-2">
            {/* Conversation/Replies Card */}
            <div className="card" style={{ padding: '0px', display: 'flex', flexDirection: 'column', height: '550px' }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Discussion Feed</h3>
              </div>

              <div className="chat-messages">
                {comments.map((c) => {
                  const isAuthorMe = c.author?._id === user?.id || c.author?.id === user?.id;
                  const isSystemLog = c.type !== 'comment';

                  if (isSystemLog) {
                    return (
                      <div key={c._id} style={{ alignSelf: 'center', margin: '8px 0', fontSize: '0.8rem', color: 'var(--text-muted)', backgroundColor: 'var(--border-color)', padding: '4px 12px', borderRadius: '12px' }}>
                        {c.content}
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={c._id} 
                      className={`chat-message ${isAuthorMe ? 'outgoing' : 'incoming'}`}
                      style={c.isInternal ? { borderLeft: '3px solid var(--status-progress)', backgroundColor: 'rgba(245,158,11,0.05)' } : {}}
                    >
                      <div className="chat-message-info">
                        <span style={{ fontWeight: 700, color: isAuthorMe ? '#fff' : 'var(--primary)' }}>
                          {c.author?.name || 'User'} ({c.authorRole})
                        </span>
                        <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p>{c.content}</p>
                      {c.isInternal && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--status-progress)', marginTop: '6px', fontWeight: 600 }}>
                          Internal resolver note
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={chatEndRef}></div>
              </div>

              {/* Typing indicator renderer */}
              {typingStatus && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '4px 24px' }}>
                  {typingStatus}
                </div>
              )}

              <form onSubmit={handleSendComment} className="chat-input-area">
                <input
                  type="text"
                  placeholder="Type your message reply..."
                  className="form-control"
                  style={{ flexGrow: 1 }}
                  value={commentContent}
                  onChange={handleInputChange}
                />
                
                {isStaffOrAdmin && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                    <input 
                      type="checkbox" 
                      id="internalNote" 
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)} 
                    />
                    <label htmlFor="internalNote" style={{ fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                      Internal Note
                    </label>
                  </div>
                )}

                <button type="submit" className="btn btn-primary" style={{ padding: '12px' }}>
                  <Send size={16} />
                </button>
              </form>
            </div>

            {/* Admin Management Controls Card */}
            {isStaffOrAdmin ? (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                  Administrative Panel
                </h3>

                <div className="form-group">
                  <label className="form-label">Update Ticket Status</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['open', 'under-review', 'in-progress', 'resolved', 'rejected', 'closed'].map((st) => (
                      <button
                        key={st}
                        onClick={() => handleUpdateStatus(st)}
                        className={`btn ${report.status === st ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '6px 12px', fontSize: '0.8rem', textTransform: 'capitalize' }}
                      >
                        {st.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Assign Department</label>
                  <select 
                    className="form-control"
                    value={report.departmentId?._id || report.departmentId || ''}
                    onChange={(e) => handleAssignDepartment(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Assign Resolver Staff</label>
                  <select 
                    className="form-control"
                    value={report.assignedTo?._id || report.assignedTo || ''}
                    onChange={(e) => handleAssignResolver(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {staffList
                      .filter((s) => !report.departmentId || String(s.departmentId?._id || s.departmentId) === String(report.departmentId?._id || report.departmentId))
                      .map((s) => (
                        <option key={s._id} value={s._id}>{s.name} ({s.role})</option>
                      ))
                    }
                  </select>
                </div>
              </div>
            ) : (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Ticket Information</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  This ticket has been assigned to our maintenance department. Any progress or status change will trigger a notification.
                </p>
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Department Assigned:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{report.departmentId?.name || 'Assessing'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Resolver Handled:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{report.assignedTo?.name || 'Pending assignment'}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default TicketDetailPage;
