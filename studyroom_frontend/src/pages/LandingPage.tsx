import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Users, Clock, MessageSquare, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react';

const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div style={{
      position: 'relative',
      minHeight: 'calc(100vh - 64px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      overflow: 'hidden'
    }}>
      {/* Premium Background Glows */}
      <div className="radial-glow" style={{ top: '-10%', left: '-10%' }} />
      <div className="radial-glow-blue" style={{ bottom: '-10%', right: '-10%' }} />

      {/* Hero Section */}
      <div style={{
        maxWidth: '900px',
        textAlign: 'center',
        marginBottom: '60px',
        zIndex: 10
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '20px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-glass)',
          marginBottom: '24px',
          fontSize: '0.9rem',
          fontWeight: 600,
          color: 'var(--accent-blue)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <Sparkles size={14} />
          <span>Next-Gen Virtual Workspace</span>
        </div>
        
        <h1 style={{
          fontSize: '3.8rem',
          fontWeight: 800,
          lineHeight: 1.15,
          letterSpacing: '-2px',
          marginBottom: '20px',
          background: 'linear-gradient(to right, #fff, hsl(240, 5%, 80%), var(--accent-purple), var(--accent-blue))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Collaborative Study Rooms <br />
          Built For Focused Learners.
        </h1>
        
        <p style={{
          fontSize: '1.25rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          maxWidth: '650px',
          margin: '0 auto 36px auto',
          fontWeight: 400
        }}>
          Create bespoke virtual rooms, sync study sessions with live stopwatch & Pomodoro timers, message in real-time, and log your progress.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '1.05rem', gap: '10px' }}>
              <span>Enter Workspace</span>
              <ArrowRight size={18} />
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '1.05rem', gap: '10px' }}>
                <span>Get Started Now</span>
                <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="btn btn-secondary" style={{ padding: '14px 28px', fontSize: '1.05rem' }}>
                Explore Workspace
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Grid of Key Features */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '24px',
        width: '100%',
        maxWidth: '1200px',
        zIndex: 10
      }}>
        {/* Card 1 */}
        <div className="glass-panel glass-panel-hover" style={{ padding: '30px', textAlign: 'left' }}>
          <div style={{
            background: 'rgba(147, 51, 234, 0.1)',
            border: '1px solid rgba(147, 51, 234, 0.2)',
            padding: '12px',
            borderRadius: '12px',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px'
          }}>
            <Users size={24} color="var(--accent-purple)" />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '10px' }}>Virtual Study Rooms</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
            Create virtual spaces instantly and invite colleagues using secure 8-character invite codes.
          </p>
        </div>

        {/* Card 2 */}
        <div className="glass-panel glass-panel-hover" style={{ padding: '30px', textAlign: 'left' }}>
          <div style={{
            background: 'rgba(14, 165, 233, 0.1)',
            border: '1px solid rgba(14, 165, 233, 0.2)',
            padding: '12px',
            borderRadius: '12px',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px'
          }}>
            <Clock size={24} color="var(--accent-blue)" />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '10px' }}>Stopwatch & Pomodoro</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
            Synchronize active sessions across all online members. Run Pomodoro work-break timers with audio notifications.
          </p>
        </div>

        {/* Card 3 */}
        <div className="glass-panel glass-panel-hover" style={{ padding: '30px', textAlign: 'left' }}>
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            padding: '12px',
            borderRadius: '12px',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px'
          }}>
            <MessageSquare size={24} color="var(--color-success)" />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '10px' }}>Real-time Chat Logs</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
            Chat with colleagues in real-time via WebSockets with built-in Markdown rendering for sharing study references.
          </p>
        </div>

        {/* Card 4 */}
        <div className="glass-panel glass-panel-hover" style={{ padding: '30px', textAlign: 'left' }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            padding: '12px',
            borderRadius: '12px',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px'
          }}>
            <ShieldAlert size={24} color="var(--color-danger)" />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '10px' }}>Audit Activity Tracking</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
            Monitor memberships, connection status, and session intervals through a persistent audit activity trail.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
