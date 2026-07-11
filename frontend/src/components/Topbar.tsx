import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../utils/axios.js';
import { useSocket } from '../hooks/useSocket.js';
import { AlertTriangle, Plus, School, Users } from 'lucide-react';

interface TopbarProps {
  onNewReportClick?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onNewReportClick }) => {
  const { user } = useAuth();
  const [campusName, setCampusName] = useState<string>('Campus Dashboard');
  const [onlineCount, setOnlineCount] = useState<number>(1);

  useEffect(() => {
    const fetchCampusInfo = async () => {
      if (user?.campusId) {
        try {
          const res = await api.get(`/campuses`);
          const campus = res.data.data.find((c: any) => c._id === user.campusId);
          if (campus) {
            setCampusName(campus.name);
          }
        } catch (e) {
          // ignore
        }
      }
    };
    fetchCampusInfo();
  }, [user]);

  // Real-time presence count updates listener
  const { socket } = useSocket(user?.campusId, undefined, (event, data) => {
    if (event === 'presence_count') {
      setOnlineCount(data.count);
    }
  });

  useEffect(() => {
    if (socket && user) {
      // Register presence metadata
      socket.emit('register_user', {
        userId: user.id,
        name: user.name,
        role: user.role,
        campusId: user.campusId,
      });
    }
  }, [socket, user]);

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <School size={20} color="var(--primary)" />
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>{campusName}</h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        
        {/* Presence Counter */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px', 
          color: 'var(--text-secondary)',
          backgroundColor: 'var(--border-color)',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '0.8rem',
          fontWeight: 600
        }}>
          <Users size={14} color="var(--status-resolved)" />
          <span>Online: {onlineCount}</span>
        </div>

        {!user?.isVerified && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            color: 'var(--status-progress)', 
            backgroundColor: 'var(--status-progress-bg)',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '0.8rem'
          }}>
            <AlertTriangle size={14} />
            <span>Unverified Email</span>
          </div>
        )}

        {onNewReportClick && (
          <button onClick={onNewReportClick} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            <Plus size={16} />
            <span>File Report</span>
          </button>
        )}
      </div>
    </header>
  );
};
export default Topbar;
