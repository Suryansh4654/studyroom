import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { Plus, Users, Calendar, ArrowRight, LogOut, Loader2, Sparkles, BookOpen, Clock } from 'lucide-react';

interface StudyRoom {
  id: string;
  name: string;
  description: string;
  invite_code: string;
  is_active: boolean;
  created_at: string;
  members_count: number;
  last_session_date: string | null;
  active_session: {
    id: string;
    started_by: string;
    start_time: string;
  } | null;
  member_usernames?: string[];
}

const DashboardPage: React.FC = () => {
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const fetchRooms = async () => {
    try {
      const res = await axiosInstance.get('/rooms/');
      if (res.status === 200) {
        setRooms(res.data);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch rooms. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleLeaveRoom = async (roomId: string, roomName: string) => {
    if (!window.confirm(`Are you sure you want to leave ${roomName}?`)) {
      return;
    }
    try {
      const res = await axiosInstance.post(`/rooms/${roomId}/leave/`);
      if (res.status === 200) {
        // Refresh rooms list
        fetchRooms();
      }
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.error) {
        alert(err.response.data.error);
      } else {
        alert('Failed to leave the room.');
      }
    }
  };

  // Date Formatting Helper
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No sessions yet';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: 'calc(100vh - 64px)',
        gap: '16px'
      }}>
        <Loader2 className="animate-spin" size={36} color="var(--accent-purple)" />
        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Syncing Dashboard...</span>
        <style>{`
          .animate-spin {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '40px 24px',
      minHeight: 'calc(100vh - 64px)'
    }}>
      <div className="radial-glow" style={{ top: '10%', left: '50%' }} />

      {/* Header and Quick Actions */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '20px',
        marginBottom: '40px'
      }}>
        <div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-1px', marginBottom: '6px' }}>
            Your Study Chambers
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            Enter your current study rooms or join/create new ones.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/rooms/join" className="btn btn-outline" style={{ display: 'inline-flex', gap: '8px' }}>
            <Users size={16} />
            <span>Join with Code</span>
          </Link>
          <Link to="/rooms/create" className="btn btn-primary" style={{ display: 'inline-flex', gap: '8px' }}>
            <Plus size={18} />
            <span>Create Room</span>
          </Link>
        </div>
      </div>

      {/* Stats Board */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '48px'
      }}>
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(147, 51, 234, 0.1)', padding: '12px', borderRadius: '12px' }}>
            <BookOpen size={24} color="var(--accent-purple)" />
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{rooms.length}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Chambers Joined</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(14, 165, 233, 0.1)', padding: '12px', borderRadius: '12px' }}>
            <Users size={24} color="var(--accent-blue)" />
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>
              {(() => { const uniquePeers = new Set<string>(); rooms.forEach(r => { if (r.member_usernames) { r.member_usernames.forEach(username => { uniquePeers.add(username); }); } }); return uniquePeers.size; })()}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Peers</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '12px' }}>
            <Clock size={24} color="var(--color-success)" />
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>
              {rooms.filter(r => r.active_session).length}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Live Sessions Now</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="glass-panel" style={{
          borderLeft: '4px solid var(--color-danger)',
          padding: '16px 20px',
          color: 'var(--color-danger)',
          marginBottom: '24px',
          fontSize: '0.95rem'
        }}>
          {error}
        </div>
      )}

      {/* Grid of Rooms */}
      {rooms.length === 0 ? (
        <div className="glass-panel animate-fade-in" style={{
          padding: '60px 40px',
          textAlign: 'center',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <Sparkles size={48} color="var(--accent-purple)" style={{ marginBottom: '20px' }} />
          <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '10px' }}>No Rooms Joined Yet</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '24px' }}>
            You aren't a member of any study chambers. Get started by creating your own room, or join an existing room with an invite code.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <Link to="/rooms/join" className="btn btn-secondary">Join with Code</Link>
            <Link to="/rooms/create" className="btn btn-primary">Create Your Room</Link>
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '24px'
        }}>
          {rooms.map((room) => (
            <div key={room.id} className="glass-panel glass-panel-hover" style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Highlight active session indicator */}
              {room.active_session && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid var(--color-success)',
                  color: 'var(--color-success)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '4px 8px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  animation: 'pulse 2s infinite'
                }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-success)' }} />
                  <span>LIVE SESSION</span>
                  <style>{`
                    @keyframes pulse {
                      0%, 100% { opacity: 1; }
                      50% { opacity: 0.6; }
                    }
                  `}</style>
                </div>
              )}

              <div style={{ padding: '24px 24px 16px 24px' }}>
                <h3 style={{
                  fontSize: '1.3rem',
                  fontWeight: 700,
                  marginBottom: '8px',
                  color: '#fff',
                  paddingRight: room.active_session ? '100px' : '0'
                }}>
                  {room.name}
                </h3>
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem',
                  lineHeight: 1.4,
                  minHeight: '40px',
                  marginBottom: '20px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {room.description || 'No description provided.'}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <Users size={16} color="var(--accent-purple)" />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{room.members_count}</span>
                    <span>members online/joined</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <Calendar size={16} color="var(--accent-blue)" />
                    <span>Last Active: </span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatDate(room.last_session_date)}</span>
                  </div>
                </div>
              </div>

              <div style={{
                padding: '16px 24px 24px 24px',
                borderTop: '1px solid var(--border-glass)',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.01)'
              }}>
                <button
                  onClick={() => handleLeaveRoom(room.id, room.name)}
                  className="btn btn-outline"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    borderColor: 'rgba(239, 68, 68, 0.2)',
                    color: 'var(--color-danger)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                    e.currentTarget.style.borderColor = 'var(--color-danger)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                  }}
                >
                  <LogOut size={16} />
                </button>

                <Link to={`/rooms/${room.id}`} className="btn btn-primary" style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  display: 'flex',
                  gap: '6px',
                  flex: 1
                }}>
                  <span>Enter Room</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
