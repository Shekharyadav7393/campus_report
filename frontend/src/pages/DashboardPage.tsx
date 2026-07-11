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
import { DashboardSkeleton } from '../components/LoadingSkeleton.js';
import { Link } from 'react-router-dom';
import { 
  AlertOctagon, 
  CheckCircle2, 
  Hourglass, 
  Layers, 
  TrendingUp, 
  ThumbsUp, 
  MessageSquare,
  MapPin,
  Clock
} from 'lucide-react';

const reportSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().min(1, 'Category is required'),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  anonymous: z.boolean().default(false),
  location: z.object({
    building: z.string().min(1, 'Building is required'),
    room: z.string().optional(),
  }),
});

type ReportFields = z.infer<typeof reportSchema>;

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [tab, setTab] = useState<'my-reports' | 'all-reports'>('my-reports');
  const [searchQuery, setSearchQuery] = useState('');

  const isStaffOrAdmin = user && ['staff', 'campus-admin', 'super-admin'].includes(user.role);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ReportFields>({
    resolver: zodResolver(reportSchema),
  });

  const fetchData = async () => {
    try {
      // 1. Get reports
      const reportsRes = await api.get('/reports', {
        params: {
          limit: 50,
          search: searchQuery || undefined,
        }
      });
      setReports(reportsRes.data.data.reports);

      // 2. Get analytics if administrative
      if (isStaffOrAdmin) {
        const statsRes = await api.get('/analytics/dashboard-stats');
        setStats(statsRes.data.data);
      }

      // 3. Get campus details for categories
      if (user?.campusId) {
        const campusRes = await api.get('/campuses');
        const currentCampus = campusRes.data.data.find((c: any) => c._id === user.campusId);
        if (currentCampus) {
          setCategories(currentCampus.settings.allowedCategories);
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, tab, searchQuery]);

  // Real-time listener
  useSocket(user?.campusId, undefined, (event, data) => {
    console.log('Real-time event received:', event, data);
    fetchData(); // Silently reload data
  });

  const onSubmitReport = async (data: ReportFields) => {
    try {
      await api.post('/reports', data);
      setIsModalOpen(false);
      reset();
      fetchData();
    } catch (err) {
      console.error('Failed to create report:', err);
    }
  };

  const handleUpvote = async (reportId: string, e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const res = await api.post(`/reports/${reportId}/upvote`);
      setReports((prev) =>
        prev.map((r) => {
          if (r._id === reportId) {
            return {
              ...r,
              upvotes: res.data.data.hasUpvoted 
                ? [...r.upvotes, user?.id] 
                : r.upvotes.filter((id: string) => id !== user?.id),
            };
          }
          return r;
        })
      );
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  };

  if (loading) {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-wrapper">
          <Topbar />
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  // Filter reports for non-staff (they either see their own or all campus reports tab)
  const displayedReports = isStaffOrAdmin 
    ? reports 
    : tab === 'my-reports'
      ? reports.filter((r) => r.reporter?.id === user?.id || r.reporter?._id === user?.id)
      : reports;

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-wrapper">
        <Topbar onNewReportClick={() => setIsModalOpen(true)} />

        <div style={{ padding: '32px' }}>
          {/* Header */}
          <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }} className="text-gradient">
                Hello, {user?.name}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
                {isStaffOrAdmin 
                  ? 'Here are your campus resolution stats and ticket updates' 
                  : 'Submit new issues or validate existing reports'
                }
              </p>
            </div>
          </div>

          {/* Stats Section for Admins / Staff */}
          {isStaffOrAdmin && stats && (
            <div className="grid-3" style={{ marginBottom: '32px' }}>
              <div className="card card-glow">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Tickets</span>
                  <Hourglass size={18} color="var(--primary)" />
                </div>
                <h2 style={{ fontSize: '2rem', marginTop: '16px', fontWeight: 700 }}>
                  {stats.summary.open + stats.summary.inProgress}
                </h2>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                  {stats.summary.open} open &middot; {stats.summary.inProgress} resolving
                </div>
              </div>

              <div className="card" style={{ borderTop: '4px solid var(--status-open)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>SLA Breaches</span>
                  <AlertOctagon size={18} color="var(--status-open)" />
                </div>
                <h2 style={{ fontSize: '2rem', marginTop: '16px', fontWeight: 700 }}>
                  {stats.summary.slaBreached}
                </h2>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Require immediate attention
                </div>
              </div>

              <div className="card" style={{ borderTop: '4px solid var(--status-resolved)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Resolved Tickets</span>
                  <CheckCircle2 size={18} color="var(--status-resolved)" />
                </div>
                <h2 style={{ fontSize: '2rem', marginTop: '16px', fontWeight: 700 }}>
                  {stats.summary.resolved}
                </h2>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Cumulative resolved issues
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Visualizations for Admin */}
          {isStaffOrAdmin && stats && stats.categoryCounts?.length > 0 && (
            <div className="grid-2" style={{ marginBottom: '32px' }}>
              <div className="card">
                <h3 style={{ fontSize: '1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={16} color="var(--primary)" />
                  <span>Category Breakdown</span>
                </h3>
                <div className="bar-chart">
                  {stats.categoryCounts.slice(0, 5).map((c: any) => {
                    const maxVal = Math.max(...stats.categoryCounts.map((cc: any) => cc.count)) || 1;
                    const heightPercent = `${(c.count / maxVal) * 100}%`;
                    return (
                      <div className="bar-column" key={c.category}>
                        <div className="bar-fill" style={{ height: heightPercent }}>
                          <span style={{ 
                            position: 'absolute', 
                            top: '-24px', 
                            left: '50%', 
                            transform: 'translateX(-50%)',
                            fontSize: '0.7rem',
                            fontWeight: 700
                          }}>{c.count}</span>
                        </div>
                        <span className="bar-label" style={{ 
                          width: '60px', 
                          textAlign: 'center', 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis' 
                        }} title={c.category}>
                          {c.category}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={16} color="var(--primary)" />
                  <span>Status Overview</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.entries(stats.statusCounts).map(([status, count]: any) => (
                    <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className={`badge badge-status-${status}`} style={{ width: '110px', justifyContent: 'center' }}>
                        {status}
                      </span>
                      <div style={{ flexGrow: 1, backgroundColor: 'var(--border-color)', height: '8px', borderRadius: '4px' }}>
                        <div style={{ 
                          backgroundColor: 'var(--primary)', 
                          width: `${stats.summary.total ? (count / stats.summary.total) * 100 : 0}%`, 
                          height: '100%', 
                          borderRadius: '4px' 
                        }}></div>
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Search and Tabs */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '20px', 
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            {!isStaffOrAdmin ? (
              <div style={{ display: 'flex', gap: '8px', backgroundColor: 'var(--bg-card)', padding: '4px', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
                <button 
                  onClick={() => setTab('my-reports')} 
                  className="btn" 
                  style={{ 
                    padding: '8px 16px', 
                    fontSize: '0.85rem', 
                    backgroundColor: tab === 'my-reports' ? 'var(--bg-card-hover)' : 'transparent',
                    color: tab === 'my-reports' ? 'var(--text-primary)' : 'var(--text-secondary)'
                  }}
                >
                  My Reports
                </button>
                <button 
                  onClick={() => setTab('all-reports')} 
                  className="btn" 
                  style={{ 
                    padding: '8px 16px', 
                    fontSize: '0.85rem', 
                    backgroundColor: tab === 'all-reports' ? 'var(--bg-card-hover)' : 'transparent',
                    color: tab === 'all-reports' ? 'var(--text-primary)' : 'var(--text-secondary)'
                  }}
                >
                  All Campus Feed
                </button>
              </div>
            ) : (
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Report Management</h3>
            )}

            <div style={{ width: '100%', maxWidth: '300px' }}>
              <input
                type="text"
                placeholder="Search tickets..."
                className="form-control"
                style={{ padding: '8px 16px' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Reports Table list */}
          <div className="card" style={{ padding: '0px', overflow: 'hidden' }}>
            {displayedReports.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No incident reports found matching requirements.
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Issue</th>
                      <th>Category</th>
                      <th>Severity</th>
                      <th>Status</th>
                      <th>Location</th>
                      <th>Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedReports.map((r) => {
                      const isUpvoted = r.upvotes?.includes(user?.id);
                      return (
                        <tr key={r._id}>
                          <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                            <Link to={`/tickets/${r._id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                              {r.ticketId}
                            </Link>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <Link to={`/tickets/${r._id}`} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>
                                {r.title}
                              </Link>
                              {r.anonymous && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Filed Anonymously</span>
                              )}
                            </div>
                          </td>
                          <td>{r.category}</td>
                          <td>
                            <span className={`badge badge-sev-${r.severity}`}>
                              {r.severity}
                            </span>
                          </td>
                          <td>
                            <span className={`badge badge-status-${r.status}`}>
                              {r.status.replace('-', ' ')}
                            </span>
                          </td>
                          <td>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                              <MapPin size={12} color="var(--text-secondary)" />
                              {r.location.building} {r.location.room && `(Rm ${r.location.room})`}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <button 
                                onClick={(e) => handleUpvote(r._id, e)} 
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '4px', 
                                  background: 'none', 
                                  border: 'none', 
                                  color: isUpvoted ? 'var(--primary)' : 'var(--text-muted)',
                                  cursor: 'pointer',
                                  outline: 'none'
                                }}
                              >
                                <ThumbsUp size={14} />
                                <span style={{ fontSize: '0.8rem' }}>{r.upvotes?.length || 0}</span>
                              </button>

                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                                <MessageSquare size={14} />
                                <span style={{ fontSize: '0.8rem' }}>comments</span>
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* File Report Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="File Incident Report">
        <form onSubmit={handleSubmit(onSubmitReport)}>
          <div className="form-group">
            <label className="form-label">Issue Title</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="e.g. Broken elevator in Physics building"
              {...register('title')} 
            />
            {errors.title && <p className="form-error">{errors.title.message}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Describe Details</label>
            <textarea 
              className="form-control" 
              style={{ minHeight: '100px', resize: 'vertical' }}
              placeholder="Provide exact details of the incident or damage..."
              {...register('description')} 
            />
            {errors.description && <p className="form-error">{errors.description.message}</p>}
          </div>

          <div className="grid-2" style={{ marginBottom: '0px' }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-control" {...register('category')}>
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors.category && <p className="form-error">{errors.category.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Severity Level</label>
              <select className="form-control" {...register('severity')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              {errors.severity && <p className="form-error">{errors.severity.message}</p>}
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: '0px' }}>
            <div className="form-group">
              <label className="form-label">Building Name</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. Science Center A"
                {...register('location.building')} 
              />
              {errors.location?.building && <p className="form-error">{errors.location.building.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Room Number (Optional)</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. 302"
                {...register('location.room')} 
              />
            </div>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <input type="checkbox" id="anonymous" {...register('anonymous')} />
            <label htmlFor="anonymous" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
              File report anonymously
            </label>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">File Report</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
