import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Image as ImageIcon, Loader2, Trash2, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { supabase } from '../lib/supabase';
import './SpaceChat.css';

export default function SpaceChat() {
  const { classId, spaceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const isAdmin = user?.role === 'admin';

  const [spaceInfo, setSpaceInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  // Fetch space info + initial messages
  useEffect(() => {
    const init = async () => {
      const [{ data: sp }, { data: msgs }] = await Promise.all([
        supabase.from('spaces').select('name, classes(name)').eq('id', spaceId).single(),
        supabase
          .from('messages')
          .select('*, profiles(username, avatar_url)')
          .eq('space_id', spaceId)
          .order('created_at', { ascending: true })
          .limit(100),
      ]);
      setSpaceInfo(sp);
      setMessages(msgs || []);
    };
    init();
  }, [spaceId]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`space-${spaceId}`)
      .on('postgres_changes', {
        event: '*', // Listen to all changes (INSERT, DELETE)
        schema: 'public',
        table: 'messages',
        filter: `space_id=eq.${spaceId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          // Optimization: fetch profile for the new message
          supabase.from('profiles').select('username, avatar_url').eq('id', payload.new.user_id).single()
            .then(({ data }) => {
              setMessages(prev => [...prev, { ...payload.new, profiles: data }]);
            });
        } else if (payload.eventType === 'DELETE') {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [spaceId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await supabase.from('messages').insert({
        space_id: spaceId,
        user_id: user.id,
        content: input.trim(),
      });
      setInput('');
    } finally {
      setSending(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit to 2MB for chat images
    if (file.size > 2 * 1024 * 1024) {
      showAlert('Imagen pesada', 'La imagen supera el límite de 2MB permitidos en el chat.');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${spaceId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('classback-images').upload(path, file);
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('classback-images').getPublicUrl(path);

      await supabase.from('messages').insert({
        space_id: spaceId,
        user_id: user.id,
        image_url: urlData.publicUrl,
      });
    } catch (err) {
      showAlert('Error', 'No se pudo subir la imagen: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteMessage = async (msgId) => {
    showConfirm(
      '¿Eliminar mensaje?',
      'Esta acción quitará el mensaje para todos en el espacio.',
      async () => {
        const { error } = await supabase.from('messages').delete().eq('id', msgId);
        if (error) showAlert('Error', 'No se pudo eliminar: ' + error.message);
      }
    );
  };

  const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="chat-layout animate-fade-in">
      <header className="chat-header glass-panel">
        <button className="back-btn" onClick={() => navigate(`/class/${classId}`)}>
          <ArrowLeft size={20} />
        </button>
        <div className="chat-title-info">
          <h2>{spaceInfo?.name || 'Espacio'}</h2>
          <span className="subtitle">{spaceInfo?.classes?.name}</span>
        </div>
      </header>

      <main className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-chat">
            <p>Aún no hay mensajes en este espacio. ¡Sé el primero!</p>
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.user_id === user?.id;
          return (
            <div key={msg.id} className={`message-wrapper ${isMe ? 'message-mine' : 'message-yours'}`}>
              {!isMe && (
                <div className="message-avatar-container">
                  {msg.profiles?.avatar_url ? (
                    <img src={msg.profiles.avatar_url} alt="Avatar" className="chat-avatar" />
                  ) : (
                    <div className="chat-avatar-placeholder"><User size={12} /></div>
                  )}
                </div>
              )}
              <div className="message-bubble glass-panel">
                <div className="message-header-row">
                  {!isMe && <span className="message-sender">{msg.profiles?.username}</span>}
                  {isAdmin && (
                    <button className="delete-msg-btn" onClick={() => handleDeleteMessage(msg.id)}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                {msg.image_url && (
                  <img
                    src={msg.image_url}
                    alt="Material compartido"
                    className="message-image"
                    onClick={() => window.open(msg.image_url, '_blank')}
                  />
                )}
                {msg.content && <p className="message-text">{msg.content}</p>}
                <span className="message-time">{formatTime(msg.created_at)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </main>

      <footer className="chat-input-area glass-panel">
        {uploading && (
          <div className="upload-indicator">
            <Loader2 size={16} className="spin" /> Subiendo imagen...
          </div>
        )}
        <form onSubmit={sendMessage} className="chat-input-form">
          <input
            type="file"
            accept="image/*"
            ref={fileRef}
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="icon-btn"
            title="Adjuntar imagen"
            onClick={() => fileRef.current?.click()}
          >
            <ImageIcon size={20} />
          </button>
          <input
            type="text"
            placeholder="Escribe un mensaje..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="chat-input"
          />
          <button type="submit" className="btn-primary send-btn" disabled={!input.trim() || sending}>
            <Send size={18} />
          </button>
        </form>
      </footer>
    </div>
  );
}
