import React from 'react';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div style={{ padding: '32px' }}>
      <div className="grid-3" style={{ marginBottom: '32px' }}>
        {[1, 2, 3].map((i) => (
          <div className="card" key={i} style={{ height: '140px' }}>
            <div className="skeleton skeleton-text" style={{ width: '40%', height: '24px' }}></div>
            <div className="skeleton skeleton-text" style={{ width: '60%', height: '40px', marginTop: '16px' }}></div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="skeleton skeleton-text" style={{ width: '20%', height: '24px', marginBottom: '24px' }}></div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div className="skeleton skeleton-text" style={{ width: '15%' }}></div>
            <div className="skeleton skeleton-text" style={{ width: '55%' }}></div>
            <div className="skeleton skeleton-text" style={{ width: '15%' }}></div>
            <div className="skeleton skeleton-text" style={{ width: '15%' }}></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const TicketDetailSkeleton: React.FC = () => {
  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="skeleton skeleton-text" style={{ width: '40%', height: '36px' }}></div>
      <div className="grid-2">
        <div className="card" style={{ height: '300px' }}>
          <div className="skeleton skeleton-text" style={{ width: '30%', height: '20px' }}></div>
          <div className="skeleton skeleton-text" style={{ width: '90%', height: '80px', marginTop: '16px' }}></div>
        </div>
        <div className="card" style={{ height: '300px' }}>
          <div className="skeleton skeleton-text" style={{ width: '40%', height: '20px' }}></div>
          <div className="skeleton skeleton-text" style={{ width: '70%', height: '40px', marginTop: '16px' }}></div>
        </div>
      </div>
    </div>
  );
};
