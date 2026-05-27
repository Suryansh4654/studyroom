import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useWebSocket } from '../hooks/useWebSocket';
import type { WebSocketMessage } from '../hooks/useWebSocket';
import { useTimer } from '../hooks/useTimer';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, Copy, Check, Users, Clock, Send, Scroll, Play, Square, Loader2,
  MessageSquare, Flame, AlertCircle, Award, Sparkles, Settings, Crown, UserMinus
} from 'lucide-react';

interface User {
  id: string;
  username: string;
  email: string;
}

interface RoomMember {
  id: string;
  user: User;
  role: string;
  joined_at: string;
}

interface StudyRoom {
  id: string;
  name: string;
  description: string;
  invite_code: string;
  created_by: User;
  daily_target_hours: number;
}

interface ChatMessage {
  id: string;
  room: string;
  sender: User;
  message: string;
  sent_at: string;
}

interface RoomActivity {
  id: string;
  room: string;
  user: User | null;
  action: string;
  timestamp: string;
}

const StudyRoomPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  
  // Room state
  const [room, setRoom] = useState<StudyRoom | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [onlineUsernames, setOnlineUsernames] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activities, setActivities] = useState<RoomActivity[]>([]);
  const [totalStudySeconds, setTotalStudySeconds] = useState<number>(0);
  
  // Active session state
  const [sessionActive, setSessionActive] = useState<boolean>(false);
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  
  // Pomodoro Mode state
  const [pomodoroEnabled, setPomodoroEnabled] = useState<boolean>(false);
  const [pomodoroPhase, setPomodoroPhase] = useState<'work' | 'break'>('work');
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useState<number>(25 * 60); // 25 mins

  // Edit settings modal state
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editGoalHours, setEditGoalHours] = useState<number>(2);

  // General UI state
  const [copied, setCopied] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const [isActivityOpen, setIsActivityOpen] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  // Audio synthesizer chime helper
  const playChime = useCallback((type: 'start' | 'end' | 'break') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'start') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.3); // G5
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.55);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.55);
      } else if (type === 'end') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime); // G5
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime + 0.15); // C5
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } else { // break
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
        osc.frequency.setValueAtTime(554.37, audioCtx.currentTime + 0.2); // C#5
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      }
    } catch (e) {
      console.warn('Audio Context auto-play blocked by browser policy:', e);
    }
  }, []);

  // Fetch initial API state
  const fetchRoomData = useCallback(async () => {
    if (!id) return;
    try {
      // 1. Fetch Room details
      const roomRes = await axiosInstance.get(`/rooms/${id}/`);
      setRoom(roomRes.data);
      
      // Auto-load values for editing modal
      setEditName(roomRes.data.name);
      setEditDescription(roomRes.data.description || '');
      setEditGoalHours(roomRes.data.daily_target_hours || 2);

      // Determine active session from nested details
      if (roomRes.data.active_session) {
        setSessionActive(true);
        setSessionStartTime(roomRes.data.active_session.start_time);
      } else {
        setSessionActive(false);
        setSessionStartTime(null);
      }

      // 2. Fetch Members
      const membersRes = await axiosInstance.get(`/rooms/${id}/members/`);
      setMembers(membersRes.data);

      // 3. Fetch past Messages
      const msgRes = await axiosInstance.get(`/rooms/${id}/messages/`);
      setMessages(msgRes.data);

      // 4. Fetch Activities
      const actRes = await axiosInstance.get(`/rooms/${id}/activity/`);
      setActivities(actRes.data);

      // 5. Fetch completed Sessions (to compute total seconds)
      const sessionsRes = await axiosInstance.get(`/rooms/${id}/sessions/`);
      const total = sessionsRes.data.reduce((acc: number, curr: any) => acc + (curr.duration_seconds || 0), 0);
      setTotalStudySeconds(total);

      setError('');
    } catch (err: any) {
      console.error(err);
      setError('Access Denied. You are not a member of this room.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRoomData();
  }, [fetchRoomData]);

  // WebSocket Message dispatcher
  const handleWebSocketMessage = useCallback((msg: WebSocketMessage) => {
    if (msg.type === 'chat.message') {
      setMessages((prev) => [...prev, msg.message]);
    } else if (msg.type === 'session.update') {
      // Refresh room, members, sessions, and activity logs
      fetchRoomData();
      if (msg.action === 'started') {
        playChime('start');
      } else if (msg.action === 'ended') {
        playChime('end');
      }
    } else if (msg.type === 'user.status') {
      setOnlineUsernames(msg.online_users);
    } else if (msg.type === 'activity.update') {
      setActivities((prev) => [msg.activity, ...prev]);
    }
  }, [fetchRoomData, playChime]);

  // Integrate our useWebSocket hook
  const { isConnected, sendMessage } = useWebSocket(id, handleWebSocketMessage);

  // Integrate our precision useTimer hook for standard count-up timer
  const liveTimerStr = useTimer(sessionActive && !pomodoroEnabled, sessionStartTime);

  // Pomodoro countdown timer logic
  useEffect(() => {
    let interval: number | null = null;
    if (sessionActive && pomodoroEnabled) {
      interval = window.setInterval(() => {
        setPomodoroTimeLeft((prev) => {
          if (prev <= 1) {
            if (pomodoroPhase === 'work') {
              playChime('break');
              setPomodoroPhase('break');
              return 5 * 60; // 5 minute break
            } else {
              playChime('start');
              setPomodoroPhase('work');
              return 25 * 60; // 25 minute work
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setPomodoroTimeLeft(pomodoroPhase === 'work' ? 25 * 60 : 5 * 60);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionActive, pomodoroEnabled, pomodoroPhase, playChime]);

  // Format Pomodoro Time
  const formatPomodoroTime = () => {
    const mins = Math.floor(pomodoroTimeLeft / 60);
    const secs = pomodoroTimeLeft % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Format Total Seconds to Hours/Mins
  const formatTotalTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  // Copy invite code animation helper
  const copyInviteCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Session Start Handler
  const startSession = async () => {
    try {
      const res = await axiosInstance.post(`/rooms/${id}/sessions/start/`);
      if (res.status === 201) {
        sendMessage({ type: 'session.start' });
        fetchRoomData();
        playChime('start');
      }
    } catch (err: any) {
      console.error(err);
      alert('Failed to start session.');
    }
  };

  // Session End Handler
  const endSession = async () => {
    try {
      const res = await axiosInstance.post(`/rooms/${id}/sessions/end/`);
      if (res.status === 200) {
        sendMessage({ type: 'session.end' });
        fetchRoomData();
        playChime('end');
      }
    } catch (err: any) {
      console.error(err);
      alert('Failed to end session.');
    }
  };

  // Promote other member to Owner (Shift ownership)
  const handlePromoteMember = async (memberId: string, memberUsername: string) => {
    if (!window.confirm(`Are you sure you want to transfer ownership to ${memberUsername}? You will be demoted to a standard member.`)) {
      return;
    }
    try {
      const res = await axiosInstance.post(`/rooms/${id}/promote-member/`, { member_id: memberId });
      if (res.status === 200) {
        alert(res.data.message);
        sendMessage({ type: 'session.update', action: 'started' }); // force WS sync refetch across all clients
        fetchRoomData();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to transfer ownership.');
    }
  };

  // Kick member from room
  const handleKickMember = async (memberId: string, memberUsername: string) => {
    if (!window.confirm(`Are you sure you want to remove ${memberUsername} from this study chamber?`)) {
      return;
    }
    try {
      const res = await axiosInstance.post(`/rooms/${id}/kick-member/`, { member_id: memberId });
      if (res.status === 200) {
        alert(res.data.message);
        sendMessage({ type: 'session.update', action: 'started' }); // force WS sync refetch across all clients
        fetchRoomData();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to remove member.');
    }
  };

  // Save updated room settings (owner only)
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      alert('Chamber name is required.');
      return;
    }
    if (editGoalHours <= 0) {
      alert('Daily target must be at least 1 hour.');
      return;
    }

    try {
      const res = await axiosInstance.patch(`/rooms/${id}/`, {
        name: editName.trim(),
        description: editDescription.trim(),
        daily_target_hours: editGoalHours
      });
      if (res.status === 200) {
        setSettingsModalOpen(false);
        sendMessage({ type: 'session.update', action: 'started' }); // force WS sync refetch across all clients
        fetchRoomData();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update chamber settings.');
    }
  };

  // Send Chat message
  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    sendMessage({
      type: 'chat.message',
      message: chatInput.trim()
    });

    setChatInput('');
  };

  // Simple Markdown Renderer
  const renderMarkdown = (text: string) => {
    let formatted = text.replace(/`([^`]+)`/g, '<code class="chat-code">$1</code>');
    formatted = formatted.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*([^\*]+)\*/g, '<em>$1</em>');
    return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  // Auto scroll chat list
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

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
        <Loader2 className="spinner" size={36} color="var(--accent-purple)" />
        <span style={{ color: 'var(--text-secondary)' }}>Syncing Chamber State...</span>
        <style>{`
          .spinner { animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div style={{
        maxWidth: '500px',
        margin: '80px auto',
        padding: '32px',
        textAlign: 'center'
      }} className="glass-panel">
        <AlertCircle size={48} color="var(--color-danger)" style={{ marginBottom: '20px' }} />
        <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '12px' }}>Forbidden</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '28px' }}>
          {error || 'This chamber is inaccessible.'}
        </p>
        <Link to="/dashboard" className="btn btn-primary" style={{ display: 'inline-flex', gap: '8px' }}>
          <ArrowLeft size={16} />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    );
  }

  // Dynamic values based on active room details
  const isOwner = members.find(m => m.user.username === currentUser?.username)?.role === 'owner';
  const dailyTargetHours = room.daily_target_hours || 2;
  const DAILY_GOAL_SECONDS = dailyTargetHours * 3600;
  const goalPercentage = Math.min(Math.round((totalStudySeconds / DAILY_GOAL_SECONDS) * 100), 100);
  const isGoalAchieved = totalStudySeconds >= DAILY_GOAL_SECONDS;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isActivityOpen ? '1fr 320px' : '1fr',
      height: 'calc(100vh - 64px)',
      background: 'transparent',
      transition: 'all 0.3s ease'
    }}>
      <div className="radial-glow" style={{ top: '20%', left: '10%' }} />

      {/* Main Workspace (Left Column) */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '24px',
        overflowY: 'auto'
      }}>
        
        {/* Room Header */}
        <div className="glass-panel" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '24px',
          marginBottom: '20px',
          padding: '20px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <Link to="/dashboard" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                <ArrowLeft size={20} />
              </Link>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.5px' }}>{room.name}</h2>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: isConnected ? 'var(--color-success)' : 'var(--color-danger)',
                background: isConnected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                padding: '4px 8px',
                borderRadius: '12px'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: isConnected ? 'var(--color-success)' : 'var(--color-danger)'
                }} />
                <span>{isConnected ? 'SYNCED' : 'OFFLINE'}</span>
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', paddingLeft: '32px' }}>
              {room.description || 'Virtual study room for medical pioneers.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* Invite code copier */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>
                Invite Code
              </span>
              <button
                onClick={copyInviteCode}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border-glass)',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  color: '#fff',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              >
                <span>{room.invite_code}</span>
                {copied ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} color="var(--text-secondary)" />}
              </button>
            </div>

            {/* Owner settings gear */}
            {isOwner && (
              <button
                onClick={() => setSettingsModalOpen(true)}
                className="btn btn-outline"
                style={{ padding: '10px', borderRadius: '10px', borderColor: 'var(--accent-purple)', color: 'var(--accent-purple)' }}
              >
                <Settings size={20} />
              </button>
            )}

            {/* Toggle Activity Drawer */}
            <button
              onClick={() => setIsActivityOpen(!isActivityOpen)}
              className="btn btn-outline"
              style={{ padding: '10px', borderRadius: '10px' }}
            >
              <Scroll size={20} />
            </button>
          </div>
        </div>

        {/* Central Panels Grid (Timer + Peers + Chat) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '340px 1fr',
          gap: '20px',
          flex: 1,
          minHeight: 0
        }}>
          
          {/* Left Column: Timer & Peers List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Timer Panel */}
            <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Study Session
                </span>
                
                {/* Pomodoro Toggle */}
                <button
                  onClick={() => setPomodoroEnabled(!pomodoroEnabled)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-glass)',
                    background: pomodoroEnabled ? 'rgba(147, 51, 234, 0.12)' : 'transparent',
                    color: pomodoroEnabled ? 'var(--accent-purple)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'var(--transition-smooth)'
                  }}
                >
                  <Flame size={12} />
                  <span>POMODORO</span>
                </button>
              </div>

              {/* Live Status indicator */}
              <div style={{ marginBottom: '12px' }}>
                {sessionActive ? (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: pomodoroEnabled && pomodoroPhase === 'break' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(147,51,234,0.08)',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: pomodoroEnabled && pomodoroPhase === 'break' ? 'var(--color-success)' : 'var(--accent-purple)'
                  }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: pomodoroEnabled && pomodoroPhase === 'break' ? 'var(--color-success)' : 'var(--accent-purple)',
                      animation: 'pulse 1.5s infinite'
                    }} />
                    <span>
                      {pomodoroEnabled ? (pomodoroPhase === 'work' ? 'WORK PHASE' : 'BREAK PHASE') : 'ACTIVE SESSION'}
                    </span>
                  </div>
                ) : (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--text-secondary)'
                  }}>
                    <span>SESSION IDLE</span>
                  </div>
                )}
              </div>

              {/* Dynamic Daily Target Progress checklist bar (Bonus Points) */}
              <div style={{ margin: '16px 0 24px 0', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ 
                    fontSize: '0.8rem', 
                    fontWeight: 700, 
                    color: isGoalAchieved ? 'var(--color-warning)' : 'var(--text-secondary)',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px' 
                  }}>
                    {isGoalAchieved ? <Award size={14} color="var(--color-warning)" /> : <Sparkles size={14} color="var(--accent-blue)" />}
                    <span>Daily Goal: {dailyTargetHours}h Study</span>
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: isGoalAchieved ? 'var(--color-warning)' : '#fff' }}>
                    {goalPercentage}%
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  border: '1px solid var(--border-glass)'
                }}>
                  <div style={{
                    width: `${goalPercentage}%`,
                    height: '100%',
                    background: isGoalAchieved 
                      ? 'linear-gradient(90deg, var(--color-warning), hsl(50, 100%, 60%))'
                      : 'linear-gradient(90deg, var(--accent-purple), var(--accent-blue))',
                    boxShadow: isGoalAchieved 
                      ? '0 0 8px rgba(234, 179, 8, 0.4)'
                      : '0 0 8px var(--accent-purple-glow)',
                    borderRadius: '4px',
                    transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                  }} />
                </div>
              </div>

              {/* Timer Display */}
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '3rem',
                fontWeight: 800,
                color: pomodoroEnabled && pomodoroPhase === 'break' ? 'var(--color-success)' : '#fff',
                letterSpacing: '-1px',
                margin: '16px 0'
              }}>
                {pomodoroEnabled ? formatPomodoroTime() : liveTimerStr}
              </div>

              {/* Session Control Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                {!sessionActive ? (
                  <button onClick={startSession} className="btn btn-success" style={{ width: '100%', borderRadius: '10px' }}>
                    <Play size={16} />
                    <span>Start Session</span>
                  </button>
                ) : (
                  <button onClick={endSession} className="btn btn-danger" style={{ width: '100%', borderRadius: '10px' }}>
                    <Square size={14} />
                    <span>End Session</span>
                  </button>
                )}
              </div>

              {/* Total Room Study Time summary */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                borderTop: '1px solid var(--border-glass)',
                paddingTop: '16px',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)'
              }}>
                <Clock size={16} color="var(--accent-blue)" />
                <span>Total Chamber Hours:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {formatTotalTime(totalStudySeconds)}
                </span>
              </div>
            </div>

            {/* Peers Directory Panel */}
            <div className="glass-panel" style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
                <Users size={18} color="var(--accent-blue)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                  Peers Directory ({onlineUsernames.length} online)
                </span>
              </div>

              {/* Members List Container */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {members.map((member) => {
                  const isOnline = onlineUsernames.includes(member.user.username);
                  const isMemberOwner = member.role === 'owner';
                  
                  return (
                    <div key={member.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      background: isOnline ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                      border: isOnline ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid transparent'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Initials Avatar */}
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: isOnline 
                            ? 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))' 
                            : 'var(--bg-surface-elevated)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: '#fff'
                        }}>
                          {member.user.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{member.user.username}</span>
                            {isMemberOwner && (
                              <span style={{
                                fontSize: '0.65rem',
                                color: 'var(--color-warning)',
                                background: 'rgba(234, 179, 8, 0.08)',
                                border: '1px solid rgba(234, 179, 8, 0.2)',
                                padding: '1px 4px',
                                borderRadius: '4px',
                                fontWeight: 700
                              }}>OWNER</span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Joined {new Date(member.joined_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Online/Offline and Owner Control Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* If current user is owner, show promote and kick controls */}
                        {isOwner && !isMemberOwner && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={() => handlePromoteMember(member.id, member.user.username)}
                              title="Shift Ownership to this member"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--color-warning)',
                                padding: '4px'
                              }}
                            >
                              <Crown size={14} />
                            </button>
                            <button
                              onClick={() => handleKickMember(member.id, member.user.username)}
                              title="Kick member from chamber"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--color-danger)',
                                padding: '4px'
                              }}
                            >
                              <UserMinus size={14} />
                            </button>
                          </div>
                        )}

                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: isOnline ? 'var(--color-success)' : 'transparent',
                          border: isOnline ? 'none' : '1px solid var(--text-muted)'
                        }} />
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Column: Chat Panel */}
          <div className="glass-panel" style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden'
          }}>
            
            {/* Chat header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-glass)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <MessageSquare size={18} color="var(--accent-purple)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                Study Chamber Chat
              </span>
            </div>

            {/* Chat history scroll container */}
            <div style={{
              flex: 1,
              padding: '20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {messages.length === 0 ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'var(--text-muted)',
                  gap: '8px'
                }}>
                  <MessageSquare size={32} />
                  <span style={{ fontSize: '0.9rem' }}>No messages in this chamber yet. Start the conversation!</span>
                </div>
              ) : (
                messages.map((msg) => {
                  const isSelf = msg.sender.username === currentUser?.username;
                  return (
                    <div key={msg.id} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      maxWidth: '80%',
                      alignSelf: isSelf ? 'flex-end' : 'flex-start',
                      flexDirection: isSelf ? 'row-reverse' : 'row'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: isSelf ? 'var(--accent-purple)' : 'var(--bg-surface-elevated)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        flexShrink: 0
                      }}>
                        {msg.sender.username.slice(0, 2).toUpperCase()}
                      </div>

                      <div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          marginBottom: '4px',
                          justifyContent: isSelf ? 'flex-end' : 'flex-start'
                        }}>
                          <span style={{ fontWeight: 600, color: '#fff' }}>{msg.sender.username}</span>
                          <span>•</span>
                          <span>{new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <div style={{
                          background: isSelf ? 'linear-gradient(135deg, var(--accent-purple), hsl(270, 76%, 45%))' : 'var(--bg-surface-elevated)',
                          border: isSelf ? 'none' : '1px solid var(--border-glass)',
                          padding: '10px 16px',
                          borderRadius: isSelf ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                          color: '#fff',
                          fontSize: '0.9rem',
                          lineHeight: 1.4,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}>
                          {renderMarkdown(msg.message)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Send Form */}
            <form onSubmit={sendChatMessage} style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--border-glass)',
              background: 'rgba(0,0,0,0.2)',
              display: 'flex',
              gap: '12px'
            }}>
              <input
                type="text"
                className="input-field"
                placeholder="Type your study references... (supports **bold**, `code`)"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '12px', borderRadius: '12px' }}>
                <Send size={18} />
              </button>
            </form>

          </div>

        </div>

      </div>

      {/* Activity Log Drawer (Right Column) */}
      {isActivityOpen && (
        <div style={{
          borderLeft: '1px solid var(--border-glass)',
          background: 'rgba(10, 10, 12, 0.7)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden'
        }} className="animate-fade-in">
          
          <div style={{
            padding: '20px',
            borderBottom: '1px solid var(--border-glass)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Scroll size={18} color="var(--color-success)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
              Chamber Activity Log
            </span>
          </div>

          <div style={{
            flex: 1,
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {activities.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-muted)',
                gap: '8px',
                textAlign: 'center'
              }}>
                <Scroll size={28} />
                <span style={{ fontSize: '0.85rem' }}>No activity logged yet.</span>
              </div>
            ) : (
              activities.map((act) => {
                const username = act.user ? act.user.username : 'Unknown User';
                let actionText = '';
                let color = 'var(--text-secondary)';

                if (act.action === 'joined') {
                  actionText = 'joined the study chamber';
                  color = 'var(--accent-blue)';
                } else if (act.action === 'left') {
                  actionText = 'left the study chamber';
                  color = 'var(--text-muted)';
                } else if (act.action === 'started_session') {
                  actionText = 'commenced a study session';
                  color = 'var(--color-success)';
                } else if (act.action === 'ended_session') {
                  actionText = 'concluded the study session';
                  color = 'var(--color-danger)';
                } else {
                  // Fallback for custom actions like transferred ownership or updated settings
                  actionText = act.action;
                  color = 'var(--color-warning)';
                }

                return (
                  <div key={act.id} style={{
                    fontSize: '0.85rem',
                    lineHeight: 1.4,
                    paddingBottom: '12px',
                    borderBottom: '1px dashed var(--border-glass)'
                  }}>
                    <div style={{ color: '#fff', fontWeight: 600 }}>
                      {username}{' '}
                      <span style={{ color, fontWeight: 500 }}>{actionText}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                      • {new Date(act.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

      {/* CHAMBER SETTINGS MODAL (OWNER ONLY) */}
      {settingsModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '24px'
        }}
        onClick={() => setSettingsModalOpen(false)}
        >
          <div className="glass-panel animate-fade-in" style={{
            width: '100%',
            maxWidth: '480px',
            padding: '32px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '20px', letterSpacing: '-0.5px' }}>
              Manage Chamber Settings
            </h3>

            <form onSubmit={handleSaveSettings}>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-name">Chamber Name</label>
                <input
                  id="edit-name"
                  type="text"
                  className="input-field"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="edit-goal">Daily Goal (in hours)</label>
                <input
                  id="edit-goal"
                  type="number"
                  className="input-field"
                  value={editGoalHours}
                  onChange={(e) => setEditGoalHours(parseInt(e.target.value) || 0)}
                  min={1}
                  max={24}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '28px' }}>
                <label className="form-label" htmlFor="edit-desc">Chamber Description</label>
                <textarea
                  id="edit-desc"
                  className="input-field"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px', borderRadius: '10px' }}
                  onClick={() => setSettingsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '8px 18px', borderRadius: '10px' }}
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Styles for markdown codes */}
      <style>{`
        .chat-code {
          background: rgba(0, 0, 0, 0.4);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: var(--font-mono);
          font-size: 0.85rem;
          color: var(--accent-blue);
          border: 1px solid var(--border-glass);
        }
      `}</style>
    </div>
  );
};

export default StudyRoomPage;
