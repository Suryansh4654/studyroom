import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { PlusCircle, ArrowLeft, AlertCircle, FileText, Landmark, Clock } from 'lucide-react';

const CreateRoomPage: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dailyTargetHours, setDailyTargetHours] = useState<number>(2);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Room name is required.');
      return;
    }

    if (dailyTargetHours <= 0) {
      setError('Daily target must be at least 1 hour.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const res = await axiosInstance.post('/rooms/', {
        name: name.trim(),
        description: description.trim(),
        daily_target_hours: dailyTargetHours
      });

      if (res.status === 201) {
        navigate(`/rooms/${res.data.id}`);
      }
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Failed to create the room. Please try again.');
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
      <div className="radial-glow" style={{ top: '10%', left: '20%' }} />

      <div className="glass-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '500px',
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
            background: 'rgba(147, 51, 234, 0.1)',
            padding: '12px',
            borderRadius: '12px'
          }}>
            <PlusCircle size={28} color="var(--accent-purple)" />
          </div>
        </div>

        <h2 style={{
          fontSize: '1.8rem',
          fontWeight: 800,
          letterSpacing: '-0.5px',
          marginBottom: '8px',
          textAlign: 'center'
        }}>Establish Study Chamber</h2>
        
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '0.95rem',
          marginBottom: '32px',
          textAlign: 'center'
        }}>
          Set up a new workspace. You will be appointed as the chamber owner.
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
          <div className="form-group">
            <label className="form-label" htmlFor="room-name">Chamber Name</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--text-muted)' }}>
                <Landmark size={18} />
              </span>
              <input
                id="room-name"
                type="text"
                className="input-field"
                style={{ paddingLeft: '48px' }}
                placeholder="e.g. Pathology Focus Group"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="room-goal">Daily Study Goal (in hours)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--text-muted)' }}>
                <Clock size={18} />
              </span>
              <input
                id="room-goal"
                type="number"
                className="input-field"
                style={{ paddingLeft: '48px' }}
                placeholder="e.g. 2"
                min={1}
                max={24}
                value={dailyTargetHours}
                onChange={(e) => setDailyTargetHours(parseInt(e.target.value) || 0)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '32px' }}>
            <label className="form-label" htmlFor="room-desc">Description (Optional)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--text-muted)' }}>
                <FileText size={18} />
              </span>
              <textarea
                id="room-desc"
                className="input-field"
                style={{ paddingLeft: '48px', minHeight: '100px', resize: 'vertical' }}
                placeholder="Describe the topics or goals of this study room..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
            {isSubmitting ? 'Establishing Chamber...' : 'Establish Chamber'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateRoomPage;
