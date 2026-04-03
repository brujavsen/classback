import React, { useState, useRef } from 'react';
import { Upload, Trash2, User, MessageCircle, FileText, ChevronDown, ChevronUp, Send, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from '../lib/toast';
import ReadMoreText from './ReadMoreText';
import Comment from './Comment';

const REACTIONS = [
  { emoji: '❤️', label: 'Me encanta' },
];

export default function PostCard({ post, user, isAdmin, classAdminId, spaceInfo, onDelete, onReact, onDeleteComment }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  
  const carouselRef = useRef(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const handleScroll = () => {
    if (!carouselRef.current) return;
    const scrollLeft = carouselRef.current.scrollLeft;
    const width = carouselRef.current.clientWidth;
    setActiveSlide(Math.round(scrollLeft / width));
  };

  const scrollPrev = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -carouselRef.current.clientWidth, behavior: 'smooth' });
    }
  };

  const scrollNext = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: carouselRef.current.clientWidth, behavior: 'smooth' });
    }
  };

  const canDelete = isAdmin || post.user_id === user?.id;
  const rootComments = (post.comments || []).filter(c => !c.parent_id);
  const totalComments = (post.comments || []).length;

  const sendComment = async () => {
    if (!commentText.trim() || sending) return;
    if (cooldown) {
      showToast('Espera unos segundos antes de enviar otro comentario.', 'warning');
      return;
    }
    setSending(true);
    try {
      await supabase.from('comments').insert({
        post_id: post.id,
        parent_id: null,
        user_id: user.id,
        content: commentText.trim(),
      });

      const toNotify = new Set();
      if (post.user_id !== user.id) toNotify.add(post.user_id);
      if (classAdminId && classAdminId !== user.id) toNotify.add(classAdminId);
      
      if (toNotify.size > 0) {
        const notifs = Array.from(toNotify).map(uid => ({
          user_id: uid,
          actor_id: user.id,
          actor_username: user.username || 'Alguien',
          type: 'new_comment',
          post_id: post.id,
          space_id: spaceInfo?.id || null
        }));
        supabase.from('notifications').insert(notifs).then(null, err => console.error('Comment Notif:', err));
      }

      setCommentText('');
      setShowComments(true);
      setCooldown(true);
      setTimeout(() => setCooldown(false), 5000);
    } finally {
      setSending(false);
    }
  };

  return (
    <article className="post-card glass-panel">
      <div className="post-header">
        <div className="post-author-info">
          {post.profiles?.avatar_url
            ? <img src={post.profiles.avatar_url} alt="" className="post-avatar" />
            : <div className="post-avatar-placeholder"><User size={16} /></div>
          }
          <div className="post-author-details">
            <span className="post-author-name">{post.profiles?.username}</span>
            <span className="post-time">
              {new Date(post.created_at).toLocaleString('es', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })}
            </span>
          </div>
        </div>
        {canDelete && (
          <button className="delete-post-btn" onClick={() => onDelete(post.id, post.file_url)} title="Eliminar publicación">
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {post.caption && (
        <p className="post-caption">
          <ReadMoreText text={post.caption} maxLength={200} />
        </p>
      )}

      {post.file_type === 'image' ? (() => {
        const urls = post.file_url ? post.file_url.split(',') : [];
        if (urls.length === 0) return null;
        return (
          <div className="post-content-wrap">
            <div className="post-carousel-container">
              <div className="post-image-carousel" ref={carouselRef} onScroll={handleScroll}>
                {urls.map((url, idx) => (
                  <div className="carousel-slide" key={idx}>
                    <img
                      src={url}
                      alt={`Contenido ${idx + 1}`}
                      className="post-image"
                    />
                  </div>
                ))}
              </div>
              {urls.length > 1 && (
                <>
                  {activeSlide > 0 && (
                    <button className="carousel-arrow left" onClick={scrollPrev}>
                      <ChevronLeft size={20} />
                    </button>
                  )}
                  {activeSlide < urls.length - 1 && (
                    <button className="carousel-arrow right" onClick={scrollNext}>
                      <ChevronRight size={20} />
                    </button>
                  )}
                </>
              )}
            </div>
            {urls.length > 1 && (
              <div className="carousel-indicators">
                {urls.map((_, idx) => (
                  <div key={idx} className={`indicator-bar ${activeSlide === idx ? 'active' : ''}`} />
                ))}
              </div>
            )}
          </div>
        );
      })() : (
        <a
          href={post.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="pdf-preview-card"
          onClick={e => { e.preventDefault(); window.open(post.file_url, '_blank', 'noopener,noreferrer'); }}
        >
          <div className="pdf-icon-wrap">
            <FileText size={40} />
          </div>
          <div className="pdf-text-info">
            <span className="pdf-label">Documento PDF</span>
            <span className="pdf-hint">Clic para abrir en nueva pestaña</span>
          </div>
          <div className="pdf-open-icon">
            <Upload size={16} style={{ transform: 'rotate(90deg)' }} />
          </div>
        </a>
      )}

      <div className="post-reactions-bar">
        <div className="reaction-pills">
          {REACTIONS.map(r => {
            const count = (post.reactions || []).filter(rx => rx.emoji === r.emoji).length;
            const isActive = (post.reactions || []).some(rx => rx.emoji === r.emoji && rx.user_id === user?.id);
            return (
              <button
                key={r.emoji}
                className={`reaction-pill ${isActive ? 'active' : ''}`}
                onClick={() => onReact(post.id, null, r.emoji)}
                title={r.label}
              >
                <span>{r.emoji}</span>
                {count > 0 && <span className="reaction-pill-count">{count}</span>}
              </button>
            );
          })}
        </div>
        <button
          className={`comment-toggle-btn ${showComments ? 'open' : ''}`}
          onClick={() => setShowComments(v => !v)}
        >
          <MessageCircle size={15} />
          <span>{totalComments > 0 ? `${totalComments}` : ''} comentario{totalComments !== 1 ? 's' : ''}</span>
          {showComments ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {showComments && (
        <div className="comments-section">
          <div className="new-comment-row">
            <div className="tiny-avatar-placeholder">
              <User size={10} />
            </div>
            <div className="comment-input-wrapper">
              <input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Escribe un comentario..."
                className="comment-input"
                maxLength={200}
                onKeyDown={e => e.key === 'Enter' && sendComment()}
              />
              <button
                className="comment-send-btn"
                onClick={sendComment}
                disabled={sending || cooldown || !commentText.trim()}
              >
                {sending ? <Loader2 size={13} className="spin" /> : <Send size={13} />}
              </button>
            </div>
          </div>

          {rootComments.length > 0 && (
            <div className="comments-list">
              {rootComments.map(comment => {
                const replies = (post.comments || []).filter(c => c.parent_id === comment.id);
                return (
                  <Comment
                    key={comment.id}
                    comment={{ ...comment, replies }}
                    postId={post.id}
                    user={user}
                    isAdmin={isAdmin}
                    classAdminId={classAdminId}
                    spaceInfo={spaceInfo}
                    onDelete={onDeleteComment}
                    onReact={onReact}
                    depth={0}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
