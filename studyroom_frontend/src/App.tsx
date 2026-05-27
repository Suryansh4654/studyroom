import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CreateRoomPage from './pages/CreateRoomPage';
import JoinRoomPage from './pages/JoinRoomPage';
import StudyRoomPage from './pages/StudyRoomPage';
import { BookOpen, LogOut, LayoutDashboard, User as UserIcon } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: 'var(--bg-base)',
        color: 'var(--text-primary)',
        gap: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '3px solid var(--border-glass)',
          borderTopColor: 'var(--accent-purple)',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{ fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.5px' }}>Syncing Session...</div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      width: '100%',
      background: 'rgba(10, 10, 12, 0.7)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border-glass)',
      padding: '0 24px',
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <Link to="/" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        textDecoration: 'none',
        color: '#fff',
        fontSize: '1.3rem',
        fontWeight: 800,
        letterSpacing: '-0.5px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))',
          padding: '6px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <BookOpen size={20} color="#fff" />
        </div>
        <span>Collaborative Study Room Platform</span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {isAuthenticated ? (
          <>
            <Link to="/dashboard" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.95rem',
              fontWeight: 600,
              transition: 'var(--transition-smooth)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </Link>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-glass)'
            }}>
              <UserIcon size={16} color="var(--accent-purple)" />
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {user?.username}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="btn btn-outline"
              style={{
                padding: '6px 14px',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: '10px'
              }}
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link to="/login" className="btn btn-secondary" style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '0.9rem' }}>
              Sign In
            </Link>
            <Link to="/register" className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '0.9rem' }}>
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

const AppContent: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1, position: 'relative' }}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          
          <Route path="/rooms/create" element={
            <ProtectedRoute>
              <CreateRoomPage />
            </ProtectedRoute>
          } />
          
          <Route path="/rooms/join" element={
            <ProtectedRoute>
              <JoinRoomPage />
            </ProtectedRoute>
          } />
          
          <Route path="/rooms/:id" element={
            <ProtectedRoute>
              <StudyRoomPage />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
};

export default App;
