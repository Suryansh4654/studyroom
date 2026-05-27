import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { UserPlus, KeyRound, Mail, User as UserIcon, AlertCircle, CheckCircle } from 'lucide-react';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('All fields are required.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please provide a valid email address.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const res = await axiosInstance.post('/auth/register/', {
        username: username.trim(),
        email: email.trim(),
        password: password
      });

      if (res.status === 201) {
        setSuccess('Registration successful! Redirecting to login page...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data) {
        // Collect errors from response
        const data = err.response.data;
        if (typeof data === 'object') {
          const keys = Object.keys(data);
          if (keys.length > 0) {
            const firstError = data[keys[0]];
            setError(Array.isArray(firstError) ? firstError[0] : String(firstError));
          } else {
            setError('Registration failed. Please check your inputs.');
          }
        } else {
          setError(String(data));
        }
      } else {
        setError('Connection failed. Please try again.');
      }
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
      <div className="radial-glow-blue" style={{ bottom: '20%', right: '30%' }} />

      <div className="glass-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '460px',
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
          <UserPlus size={28} color="#fff" />
        </div>

        <h2 style={{
          fontSize: '2rem',
          fontWeight: 800,
          letterSpacing: '-1px',
          marginBottom: '8px'
        }}>Create Account</h2>
        
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '0.95rem',
          marginBottom: '32px'
        }}>
          Join study rooms and start collaborating with peers.
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

        {success && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '12px',
            padding: '12px 16px',
            color: 'var(--color-success)',
            fontSize: '0.9rem',
            marginBottom: '24px',
            textAlign: 'left'
          }}>
            <CheckCircle size={18} style={{ flexShrink: 0 }} />
            <span>{success}</span>
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
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isSubmitting || !!success}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--text-muted)' }}>
                <Mail size={18} />
              </span>
              <input
                id="email"
                type="email"
                className="input-field"
                style={{ paddingLeft: '48px' }}
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting || !!success}
              />
            </div>
          </div>

          <div className="form-group">
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
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting || !!success}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '32px' }}>
            <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--text-muted)' }}>
                <KeyRound size={18} />
              </span>
              <input
                id="confirmPassword"
                type="password"
                className="input-field"
                style={{ paddingLeft: '48px' }}
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting || !!success}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '1rem', borderRadius: '12px' }}
            disabled={isSubmitting || !!success}
          >
            {isSubmitting ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p style={{
          marginTop: '28px',
          color: 'var(--text-secondary)',
          fontSize: '0.9rem'
        }}>
          Already have an account?{' '}
          <Link to="/login" style={{
            color: 'var(--accent-purple)',
            textDecoration: 'none',
            fontWeight: 600,
            transition: 'var(--transition-smooth)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
