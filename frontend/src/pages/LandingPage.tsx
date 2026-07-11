import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Sparkles, Zap, MapPin } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-dark)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '24px 40px',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'rgba(10, 14, 23, 0.5)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, background: 'linear-gradient(90deg, #ffffff, var(--primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          CampusReport
        </h1>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button onClick={() => navigate('/login')} className="btn btn-outline" style={{ padding: '8px 20px', fontSize: '0.875rem' }}>Login</button>
          <button onClick={() => navigate('/signup')} className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.875rem' }}>Sign Up</button>
        </div>
      </header>

      <main style={{ flexGrow: 1 }}>
        <section className="hero-section">
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            backgroundColor: 'var(--primary-glow)', 
            border: '1px solid var(--border-glow)',
            color: 'var(--primary)',
            padding: '6px 16px',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            fontWeight: 600,
            marginBottom: '24px'
          }}>
            <Sparkles size={14} />
            <span>Next-Generation Multi-Tenant Campus Incident Tracker</span>
          </div>

          <h1 className="hero-title">
            Keep Your Campus <br />
            <span style={{ color: 'var(--primary)' }}>Safe & Functional.</span>
          </h1>

          <p style={{ 
            fontSize: '1.15rem', 
            color: 'var(--text-secondary)', 
            maxWidth: '650px', 
            lineHeight: '1.6', 
            marginBottom: '40px' 
          }}>
            Real-time reporting, automated resolver routing, SLA performance indicators, and secure, anonymous communication channel for students, faculty, and administrative staff.
          </p>

          <div style={{ display: 'flex', gap: '20px' }}>
            <button onClick={() => navigate('/signup')} className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '1rem' }}>
              Onboard Your Campus
            </button>
            <button onClick={() => navigate('/login')} className="btn btn-secondary" style={{ padding: '14px 32px', fontSize: '1rem' }}>
              Access Dashboard
            </button>
          </div>
        </section>

        <section style={{ padding: '60px 40px 100px', maxWidth: '1200px', margin: '0 auto' }}>
          <div className="grid-3">
            <div className="card card-glow">
              <Zap size={24} color="var(--primary)" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>Real-time Notifications</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                Instant notifications and live chat sync updates directly through WebSocket protocol connection.
              </p>
            </div>

            <div className="card" style={{ borderTop: '4px solid var(--status-resolved)' }}>
              <Shield size={24} color="var(--status-resolved)" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>Privacy & Anonymity</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                Option to file reports completely anonymously while maintaining communication with resolvers.
              </p>
            </div>

            <div className="card" style={{ borderTop: '4px solid var(--status-progress)' }}>
              <MapPin size={24} color="var(--status-progress)" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>Smart Geolocation</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                Pinpoint issue locations using interactive coordinates mapping to detect duplicate reports quickly.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer style={{ 
        borderTop: '1px solid var(--border-color)', 
        padding: '30px 40px', 
        textAlign: 'center', 
        color: 'var(--text-muted)',
        fontSize: '0.85rem'
      }}>
        <p>&copy; {new Date().getFullYear()} CampusReport SaaS. Built for Modern Universities.</p>
      </footer>
    </div>
  );
};
