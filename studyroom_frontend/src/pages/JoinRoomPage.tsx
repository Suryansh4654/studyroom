import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { Users, ArrowLeft, AlertCircle, Sparkles } from 'lucide-react';

const JoinRoomPage: React.FC = () => {
  const navigate = useNavigate();

  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteCode.trim()) {
      setError('Invite code is required.');
      return;
    }

    if (inviteCode.trim().length !== 8) {
      setError('Invite code must be exactly 8 characters.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const res = await axiosInstance.post('/rooms/join/', {
        invite_code: inviteCode.trim().toUpperCase(),
      });

      if (res.status === 201 || res.status === 200) {
        // Redirect directly to the joined room
        navigate(`/rooms/${res.data.room.id}`);
      }
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to join room. Please check the code and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'relative',
      minHeight: 'calc(100vh - 64px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      overflow: 'hidden'
    }}>
      <div className="radial-glow-blue" style={{ top: '10%', right: '20%' }} />

      <div className="glass-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '480px',
        padding: '40px 32px',
        zIndex: 10
      }}>
        {/* Back navigation */}
        <Link to="/dashboard" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          textDecoration: 'none',
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          fontWeight: 600,
          marginBottom: '28px',
          transition: 'var(--transition-smooth)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </Link>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '20px'
        }}>
          <div style={{
            background: 'rgba(14, 165, 233, 0.1)',
            padding: '12px',
            borderRadius: '12px'
          }}>
            <Users size={28} color="var(--accent-blue)" />
          </div>
        </div>

        <h2 style={{
          fontSize: '1.8rem',
          fontWeight: 800,
          letterSpacing: '-0.5px',
          marginBottom: '8px',
          textAlign: 'center'
        }}>Join Study Chamber</h2>
        
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '0.95rem',
          marginBottom: '32px',
          textAlign: 'center'
        }}>
          Enter the unique 8-character invite code to join a virtual study room.
        </p>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '12px',
            padding: '12px 16px',
            color: 'var(--color-danger)',
            fontSize: '0.9rem',
            marginBottom: '24px',
            textAlign: 'left'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div className="form-group" style={{ marginBottom: '32px' }}>
            <label className="form-label" htmlFor="invite-code">Invite Code</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--text-muted)' }}>
                <Sparkles size={18} />
              </span>
              <input
                id="invite-code"
                type="text"
                className="input-field"
                style={{ paddingLeft: '48px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700 }}
                placeholder="e.g. A1B2C3D4"
                maxLength={8}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '1rem', borderRadius: '12px' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Entering Chamber...' : 'Enter Chamber'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default JoinRoomPage;
