import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, X, MessageCircle, Upload, CornerDownRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import './NotificationBell.css';

const TYPE_CONFIG = {
  new_post: {
    icon: <Upload size={14} />,
    color: '#DC143C',
    label: (n) => `${n.actor_username} publicó nuevo material en "${n.space_name}"`,
  },
  new_comment: {
    icon: <MessageCircle size={14} />,
    color: '#6366f1',
    label: (n) => `${n.actor_username} comentó en tu publicación`,
  },
  new_reply: {
    icon: <CornerDownRight size={14} />,
    color: '#10b981',
    label: (n) => `${n.actor_username} respondió tu comentario`,
  },
  new_reaction: {
    icon: <Check size={14} />,
    color: '#f59e0b',
    label: (n) => `${n.actor_username} reaccionó a tu contenido`,
  },
};

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Load notifications
  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    setNotifications(data || []);
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifs-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (!unreadIds.length) return;
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markOneRead = async (notif) => {
    if (!notif.read) {
      await supabase.from('notifications').update({ read: true }).eq('id', notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    }
    // Navigate to the relevant space if known
    if (notif.space_id && notif.post_id) {
      // find class_id from space somehow — for now just close
      setOpen(false);
    } else {
      setOpen(false);
    }
  };

  const deleteNotif = async (e, id) => {
    e.stopPropagation();
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const formatTime = (ts) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    return `hace ${Math.floor(hrs / 24)}d`;
  };

  return (
    <div className="notif-bell-wrapper" ref={dropdownRef}>
      <button
        className={`notif-bell-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setOpen(v => !v)}
        title="Notificaciones"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown glass-panel animate-fade-in">
          <div className="notif-dropdown-header">
            <h3>Notificaciones</h3>
            {unreadCount > 0 && (
              <button className="notif-mark-all-btn" onClick={markAllRead} title="Marcar todo como leído">
                <CheckCheck size={15} /> Todo leído
              </button>
            )}
          </div>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <Bell size={32} />
                <p>No hay notificaciones</p>
              </div>
            ) : (
              notifications.map(notif => {
                const config = TYPE_CONFIG[notif.type];
                return (
                  <div
                    key={notif.id}
                    className={`notif-item ${!notif.read ? 'unread' : ''}`}
                    onClick={() => markOneRead(notif)}
                  >
                    <div className="notif-icon" style={{ color: config?.color }}>
                      {config?.icon}
                    </div>
                    <div className="notif-body">
                      <p className="notif-text">{config?.label(notif)}</p>
                      <span className="notif-time">{formatTime(notif.created_at)}</span>
                    </div>
                    {!notif.read && <div className="notif-unread-dot" />}
                    <button className="notif-delete-btn" onClick={(e) => deleteNotif(e, notif.id)} title="Eliminar">
                      <X size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
