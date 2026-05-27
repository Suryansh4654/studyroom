import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, KeyRound, User as UserIcon, AlertCircle } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please provide both username and password.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Invalid username or password. Please try again.');
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
      <div className="radial-glow" style={{ top: '20%', left: '30%' }} />

      <div className="glass-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '40px 32px',
        zIndex: 10,
        textAlign: 'center'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))',
          padding: '14px',
          borderRadius: '16px',
          marginBottom: '24px',
          boxShadow: '0 8px 24px var(--accent-purple-glow)'
        }}>
          <LogIn size={28} color="#fff" />
        </div>

        <h2 style={{
          fontSize: '2rem',
          fontWeight: 800,
          letterSpacing: '-1px',
          marginBottom: '8px'
        }}>Welcome Back</h2>
        
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '0.95rem',
          marginBottom: '32px'
        }}>
          Sign in to access your virtual study chambers.
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
            <label className="form-label" htmlFor="username">Username</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--text-muted)' }}>
                <UserIcon size={18} />
              </span>
              <input
                id="username"
                type="text"
                className="input-field"
                style={{ paddingLeft: '48px' }}
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '32px' }}>
            <label className="form-label" htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--text-muted)' }}>
                <KeyRound size={18} />
              </span>
              <input
                id="password"
                type="password"
                className="input-field"
                style={{ paddingLeft: '48px' }}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            {isSubmitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <p style={{
          marginTop: '28px',
          color: 'var(--text-secondary)',
          fontSize: '0.9rem'
        }}>
          Don't have an account?{' '}
          <Link to="/register" style={{
            color: 'var(--accent-purple)',
            textDecoration: 'none',
            fontWeight: 600,
            transition: 'var(--transition-smooth)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
          >
            Register Here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
