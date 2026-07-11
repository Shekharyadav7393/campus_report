import React, { useEffect, useState } from 'react';
import { Sidebar } from '../components/Sidebar.js';
import { Topbar } from '../components/Topbar.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../utils/axios.js';
import { Plus, Users, ShieldAlert, Award } from 'lucide-react';
import { Modal } from '../components/Modal.js';

export const DepartmentPage: React.FC = () => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form input
  const [deptName, setDeptName] = useState('');
  const [deptHead, setDeptHead] = useState('');

  const fetchDepartments = async () => {
    try {
      const deptsRes = await api.get('/departments');
      setDepartments(deptsRes.data.data);

      const staffRes = await api.get('/departments/staff');
      setStaff(staffRes.data.data);
    } catch (e) {
      console.error('Failed to load department panels:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [user]);

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) return;

    try {
      await api.post('/departments', {
        name: deptName,
        head: deptHead || undefined,
      });
      setDeptName('');
      setDeptHead('');
      setIsModalOpen(false);
      fetchDepartments();
    } catch (err) {
      console.error('Failed to create department:', err);
    }
  };

  if (loading) {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-wrapper">
          <Topbar />
          <div style={{ padding: '32px' }}>Loading panel...</div>
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
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }} className="text-gradient">Department Panel</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
                Manage campus resolving groups and staff assignments
              </p>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              <Plus size={16} />
              <span>Add Department</span>
            </button>
          </div>

          <div className="grid-2">
            {/* Departments List card */}
            <div className="card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={18} color="var(--primary)" />
                <span>Departments</span>
              </h3>
              
              <div className="table-container" style={{ border: 'none' }}>
                <table className="table" style={{ border: 'none' }}>
                  <thead>
                    <tr>
                      <th>Dept Name</th>
                      <th>Lead Head</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((d) => (
                      <tr key={d._id}>
                        <td style={{ fontWeight: 600 }}>{d.name}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {d.head ? d.head.name : <em style={{ color: 'var(--text-muted)' }}>No lead appointed</em>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Resolvers List card */}
            <div className="card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="var(--primary)" />
                <span>Resolvers Staff Roster</span>
              </h3>

              <div className="table-container" style={{ border: 'none' }}>
                <table className="table" style={{ border: 'none' }}>
                  <thead>
                    <tr>
                      <th>Resolver Name</th>
                      <th>Department</th>
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((s) => (
                      <tr key={s._id}>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {s.departmentId ? s.departmentId.name : <span style={{ color: 'var(--status-progress)', fontSize: '0.8rem' }}>Unassigned Group</span>}
                        </td>
                        <td style={{ textTransform: 'capitalize', fontSize: '0.85rem' }}>{s.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Department Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Department">
        <form onSubmit={handleCreateDept}>
          <div className="form-group">
            <label className="form-label">Department Name</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="e.g. IT Helpdesk, Campus Safety"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Appoint Department Head (Staff Resolver)</label>
            <select 
              className="form-control"
              value={deptHead}
              onChange={(e) => setDeptHead(e.target.value)}
            >
              <option value="">Choose head...</option>
              {staff.map((s) => (
                <option key={s._id} value={s._id}>{s.name} ({s.email})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Create Department</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
