import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { 
  LayoutDashboard, 
  Megaphone, 
  Settings, 
  LogOut, 
  UserCircle 
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['student', 'faculty', 'visitor', 'staff', 'campus-admin', 'super-admin'] },
    { name: 'Notice Board', path: '/notices', icon: Megaphone, roles: ['student', 'faculty', 'visitor', 'staff', 'campus-admin', 'super-admin'] },
    { name: 'Settings', path: '/profile', icon: UserCircle, roles: ['student', 'faculty', 'visitor', 'staff', 'campus-admin', 'super-admin'] },
  ];

  // Admins & staff see department settings
  if (user && ['campus-admin', 'super-admin'].includes(user.role)) {
    menuItems.push({
      name: 'Department Panel',
      path: '/departments',
      icon: Settings,
      roles: ['campus-admin', 'super-admin'],
    });
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span>CampusReport <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>SaaS</span></span>
      </div>

      <ul className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <li key={item.name} className={`sidebar-item ${isActive ? 'active' : ''}`}>
              <Link to={item.path}>
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user?.name}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
            {user?.role.replace('-', ' ')}
          </span>
        </div>
        <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '8px', borderRadius: '50%' }}>
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
};
