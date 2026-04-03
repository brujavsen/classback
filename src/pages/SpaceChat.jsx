import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Upload, Loader2, Trash2, User,
  MessageCircle, FileText, ChevronDown, ChevronUp,
  CornerDownRight, Send, X, Image as ImageIcon, Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { supabase } from '../lib/supabase';
import { showToast } from '../lib/toast';
import Lightbox from "yet-another-react-lightbox";
import ZoomPlugin from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import './SpaceChat.css';

const REACTIONS = [
  { emoji: '❤️', label: 'Me encanta' },
];

function ReadMoreText({ text, maxLength = 150 }) {
  const [expanded, setExpanded] = useState(false);
  
  if (!text) return null;
  if (text.length <= maxLength) return <span>{text}</span>;

  return (
    <span>
      {expanded ? text : `${text.substring(0, maxLength)}...`}
      <button 
        className="read-more-btn" 
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
      >
        {expanded ? ' ver menos' : ' ver más'}
      </button>
    </span>
  );
}

// ─────────────────────────────────────────────
// Comment Component (handles replies recursively)
// ─────────────────────────────────────────────
function Comment({ comment, postId, user, isAdmin, classAdminId, spaceInfo, onDelete, onReact, depth = 0 }) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  const canDelete = isAdmin || comment.user_id === user?.id;
  const replies = comment.replies || [];

  const sendReply = async () => {
    if (!replyText.trim() || sendingReply) return;
    if (cooldown) {
      showToast('Espera unos segundos antes de enviar otro comentario.', 'warning');
      return;
    }
    setSendingReply(true);
    try {
      // Insert reply
      const { data: replyData } = await supabase.from('comments').insert({
        post_id: postId,
        parent_id: comment.id,
        user_id: user.id,
        content: replyText.trim(),
      }).select().single();

      // Notify original comment owner and class admin
      const toNotify = new Set();
      if (comment.user_id !== user.id) toNotify.add(comment.user_id);
      if (classAdminId && classAdminId !== user.id) toNotify.add(classAdminId);

      if (toNotify.size > 0) {
        const notifs = Array.from(toNotify).map(uid => ({
          user_id: uid,
          actor_id: user.id,
          actor_username: user.username || 'Alguien',
          type: 'new_reply',
          post_id: postId,
          comment_id: comment.id,
          space_id: spaceInfo?.id || null
        }));
        await supabase.from('notifications').insert(notifs).then(null, err => console.error('Reply Notif:', err));
      }

      setReplyText('');
      setShowReplyInput(false);
      setCooldown(true);
      setTimeout(() => setCooldown(false), 5000);
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className={`comment-item depth-${Math.min(depth, 2)}`}>
      <div className="comment-avatar-col">
        {comment.profiles?.avatar_url
          ? <img src={comment.profiles.avatar_url} alt="" className="tiny-avatar" />
          : <div className="tiny-avatar-placeholder"><User size={10} /></div>
        }
        {replies.length > 0 && <div className="reply-thread-line" />}
      </div>

      <div className="comment-content-col">
        <div className="comment-bubble">
          <span className="comment-author">{comment.profiles?.username}</span>
          <p className="comment-text">
            <ReadMoreText text={comment.content} />
          </p>
        </div>

        {/* Reactions for comment */}
        <div className="comment-reactions-row">
          {REACTIONS.map(r => {
            const count = (comment.reactions || []).filter(rx => rx.emoji === r.emoji).length;
            const isActive = (comment.reactions || []).some(rx => rx.emoji === r.emoji && rx.user_id === user?.id);
            return (
              <button
                key={r.emoji}
                className={`mini-reaction-btn ${isActive ? 'active' : ''}`}
                onClick={() => onReact(null, comment.id, r.emoji)}
                title={r.label}
              >
                {r.emoji}{count > 0 && <span className="mini-count">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="comment-meta-row">
          <span className="comment-time">
            {new Date(comment.created_at).toLocaleString('es', {
              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
            })}
          </span>
          {depth === 0 && (
            <button className="comment-action-link" onClick={() => setShowReplyInput(v => !v)}>
              Responder
            </button>
          )}
          {canDelete && (
            <button className="comment-action-link danger" onClick={() => onDelete(comment.id)}>
              Eliminar
            </button>
          )}
        </div>

        {/* Reply input */}
        {showReplyInput && (
          <div className="reply-input-row">
            <CornerDownRight size={14} className="reply-arrow" />
            <input
              type="text"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Escribe una respuesta..."
              className="reply-input"
              maxLength={200}
              onKeyDown={e => e.key === 'Enter' && sendReply()}
              autoFocus
            />
            <button className="reply-send-btn" onClick={sendReply} disabled={sendingReply || cooldown || !replyText.trim()}>
              {sendingReply ? <Loader2 size={13} className="spin" /> : <Send size={13} />}
            </button>
          </div>
        )}

        {/* Show/hide replies */}
        {replies.length > 0 && depth === 0 && (
          <button className="show-replies-btn" onClick={() => setShowReplies(v => !v)}>
            {showReplies
              ? <><ChevronUp size={13} /> Ocultar respuestas</>
              : <><ChevronDown size={13} /> Ver {replies.length} respuesta{replies.length > 1 ? 's' : ''}</>
            }
          </button>
        )}

        {showReplies && replies.map(reply => (
          <Comment
            key={reply.id}
            comment={reply}
            postId={postId}
            user={user}
            isAdmin={isAdmin}
            classAdminId={classAdminId}
            spaceInfo={spaceInfo}
            onDelete={onDelete}
            onReact={onReact}
            depth={depth + 1}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PostCard Component
// ─────────────────────────────────────────────
function PostCard({ post, user, isAdmin, classAdminId, spaceInfo, onDelete, onReact, onDeleteComment, onImageClick }) {
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

      // Notify post owner and class admin
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
      {/* ── Header ── */}
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

      {/* ── Caption ── */}
      {post.caption && (
        <p className="post-caption">
          <ReadMoreText text={post.caption} maxLength={200} />
        </p>
      )}

      {/* ── File Content ── */}
      {post.file_type === 'image' ? (() => {
        const urls = post.file_url.split(',');
        return (
          <div className="post-carousel-container">
            {urls.length > 1 && (
              <div className="carousel-counter-pill">
                {activeSlide + 1} / {urls.length}
              </div>
            )}
            <div className="post-image-carousel" ref={carouselRef} onScroll={handleScroll}>
              {urls.map((url, idx) => (
                <div className="carousel-slide" key={idx}>
                  <img
                    src={url}
                    alt={`Contenido ${idx + 1}`}
                    className="post-image"
                    style={{ cursor: 'pointer' }}
                    onClick={() => onImageClick && onImageClick({ urls, index: idx })}
                  />
                </div>
              ))}
            </div>
            {urls.length > 1 && (
              <div className="carousel-dots">
                {urls.map((_, idx) => (
                  <div key={idx} className={`carousel-dot ${activeSlide === idx ? 'active' : ''}`} />
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

      {/* ── Reactions Bar ── */}
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

      {/* ── Comments Section ── */}
      {showComments && (
        <div className="comments-section">
          {/* New comment input */}
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

          {/* Comments list */}
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

// ─────────────────────────────────────────────
// Main SpaceChat (now a Feed)
// ─────────────────────────────────────────────
export default function SpaceChat() {
  const { classId, spaceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showAlert, showConfirm } = useModal();

  const [spaceInfo, setSpaceInfo] = useState(null);
  const isAdmin = user?.role === 'admin' && spaceInfo?.classes?.admin_id === user?.id;
  const [posts, setPosts] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lightboxData, setLightboxData] = useState(null);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [caption, setCaption] = useState('');

  const fileRef = useRef(null);

  // ── Load posts + space info ──
  const fetchPosts = useCallback(async () => {
    try {
      const [{ data: sp }, { data: postsData }] = await Promise.all([
        supabase.from('spaces').select('name, classes(name, admin_id)').eq('id', spaceId).single(),
        supabase
          .from('posts')
          .select(`
            *,
            profiles(username, avatar_url),
            comments(*, profiles(username, avatar_url), reactions(*)),
            reactions(*)
          `)
          .eq('space_id', spaceId)
          .order('created_at', { ascending: false }),
      ]);
      setSpaceInfo(sp);
      setPosts(postsData || []);
    } finally {
      setFetching(false);
    }
  }, [spaceId]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // ── Realtime subscriptions (posts + comments + reactions) ──
  useEffect(() => {
    const channel = supabase
      .channel(`feed-${spaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `space_id=eq.${spaceId}` }, fetchPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, fetchPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, fetchPosts)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [spaceId, fetchPosts]);

  // ── Handle file selection ──
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const isPDF = files[0].type === 'application/pdf';

    if (isPDF) {
      if (files.length > 1) showToast('Solo puedes subir 1 archivo PDF a la vez.', 'warning');
      setSelectedFiles([files[0]]);
      setPreviewUrls([]);
    } else {
      const validImages = files.filter(f => f.type.startsWith('image/'));
      if (validImages.length === 0) return;
      if (validImages.length > 5) {
        showToast('Solo puedes subir hasta 5 imágenes.', 'warning');
        validImages.splice(5);
      }
      setSelectedFiles(validImages);
      setPreviewUrls(validImages.map(f => URL.createObjectURL(f)));
    }

    setShowUploadModal(true);
    e.target.value = '';
  };

  // ── Upload post ──
  const uploadPost = async () => {
    if (!selectedFiles.length || uploading) return;
    setUploading(true);
    try {
      const isImage = selectedFiles[0].type.startsWith('image/');
      let fileUrls = [];

      for (const file of selectedFiles) {
        const ext = file.name.split('.').pop();
        const path = `posts/${spaceId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

        const { error: upErr } = await supabase.storage.from('classback-images').upload(path, file, { upsert: false });
        if (upErr) throw upErr;

        const { data: urlData } = supabase.storage.from('classback-images').getPublicUrl(path);
        fileUrls.push(urlData.publicUrl);
      }

      await supabase.from('posts').insert({
        space_id: spaceId,
        user_id: user.id,
        file_url: fileUrls.join(','),
        file_type: isImage ? 'image' : 'pdf',
        caption: caption.trim() || null,
      });

      // Notify all space members (except poster) AND the class admin
      try {
        const { data: members } = await supabase
          .from('user_spaces')
          .select('user_id')
          .eq('space_id', spaceId)
          .neq('user_id', user.id);

        const notifyIds = new Set((members || []).map(m => m.user_id));
        const adminId = spaceInfo?.classes?.admin_id;
        if (adminId && adminId !== user.id) {
          notifyIds.add(adminId);
        }

        if (notifyIds.size > 0) {
          const notifs = Array.from(notifyIds).map(uid => ({
            user_id: uid,
            actor_id: user.id,
            actor_username: user.username || 'Alguien',
            type: 'new_post',
            space_id: spaceId,
            space_name: spaceInfo?.name || 'un espacio',
          }));
          await supabase.from('notifications').insert(notifs);
        }
      } catch (_) { /* notifications are best-effort */ }

      closeUploadModal();
    } catch (err) {
      showAlert('Error al subir', err.message);
    } finally {
      setUploading(false);
    }
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setSelectedFiles([]);
    setPreviewUrls([]);
    setCaption('');
  };

  // ── Delete post ──
  const handleDeletePost = (postId, fileUrl) => {
    showConfirm(
      '¿Eliminar publicación?',
      'Se borrará permanentemente el archivo y todos sus comentarios.',
      async () => {
        try {
          const { error } = await supabase.from('posts').delete().eq('id', postId);
          if (error) throw error;
          // Best-effort storage cleanup
          const urls = fileUrl ? fileUrl.split(',') : [];
          for (const url of urls) {
            const storagePath = url.split('/classback-images/')[1];
            if (storagePath) supabase.storage.from('classback-images').remove([storagePath]).then(null, () => {});
          }
        } catch (err) {
          showAlert('Error', 'No se pudo eliminar: ' + err.message);
        }
      }
    );
  };

  // ── Delete comment ──
  const handleDeleteComment = (commentId) => {
    showConfirm(
      '¿Eliminar comentario?',
      'Se eliminará este comentario y todas sus respuestas.',
      async () => {
        const { error } = await supabase.from('comments').delete().eq('id', commentId);
        if (error) showAlert('Error', error.message);
      }
    );
  };

  // ── React to post or comment ──
  const handleReact = async (postId, commentId, emoji) => {
    try {
      let query = supabase.from('reactions').select('id, emoji').eq('user_id', user.id);
      if (postId) query = query.eq('post_id', postId).is('comment_id', null);
      if (commentId) query = query.eq('comment_id', commentId).is('post_id', null);

      const { data: existing } = await query.maybeSingle();

      if (existing) {
        if (existing.emoji === emoji) {
          await supabase.from('reactions').delete().eq('id', existing.id);
        } else {
          await supabase.from('reactions').update({ emoji }).eq('id', existing.id);
        }
      } else {
        const payload = { user_id: user.id, emoji };
        if (postId) payload.post_id = postId;
        if (commentId) payload.comment_id = commentId;
        await supabase.from('reactions').insert(payload);

        // Notify class admin and owner
        const toNotify = new Set();
        let targetOwner = null;
        if (postId) {
          targetOwner = posts.find(p => p.id === postId)?.user_id;
        } else if (commentId) {
          outer: for (const p of posts) {
            for (const c of (p.comments || [])) {
              if (c.id === commentId) { targetOwner = c.user_id; break outer; }
            }
          }
        }
        if (targetOwner && targetOwner !== user.id) toNotify.add(targetOwner);
        const adminId = spaceInfo?.classes?.admin_id;
        if (adminId && adminId !== user.id) toNotify.add(adminId);

        if (toNotify.size > 0) {
          const notifs = Array.from(toNotify).map(uid => {
            const payload = {
              user_id: uid,
              actor_id: user.id,
              actor_username: user.username || 'Alguien',
              type: 'new_reaction',
              space_id: spaceInfo?.id || null
            };
            if (postId) payload.post_id = postId;
            if (commentId) payload.comment_id = commentId;
            return payload;
          });
          supabase.from('notifications').insert(notifs).then(null, err => console.error('Reaction Notif:', err));
        }
      }
    } catch (err) {
      console.error('Reaction error:', err);
    }
  };

  // ─────────────────────────────────────────
  return (
    <div className="feed-layout animate-fade-in">
      {/* Lightbox for zooming images */}
      <Lightbox
        open={!!lightboxData}
        close={() => setLightboxData(null)}
        index={lightboxData?.index || 0}
        slides={lightboxData?.urls.map(src => ({ src })) || []}
        plugins={[ZoomPlugin]}
        zoom={{ scrollToZoom: true, maxZoomPixelRatio: 3 }}
      />

      {/* Header */}
      <header className="chat-header glass-panel">
        <button className="back-btn" onClick={() => navigate(`/class/${classId}`)}>
          <ArrowLeft size={20} />
        </button>
        <div className="chat-title-info">
          <h2>{spaceInfo?.name || 'Espacio'}</h2>
          <span className="subtitle">{spaceInfo?.classes?.name}</span>
        </div>
        <button
          className="btn-primary upload-btn"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          <Upload size={16} />
          Subir
        </button>
        <input
          type="file"
          accept="image/*,application/pdf"
          ref={fileRef}
          onChange={handleFileSelect}
          multiple
          style={{ display: 'none' }}
        />
      </header>

      {/* Feed */}
      <main className="feed-content">
        {/* Search Bar */}
        {!fetching && posts.length > 0 && (
          <div className="feed-search-bar">
            <Search size={16} className="feed-search-icon" />
            <input
              type="text"
              placeholder="Buscar publicaciones por descripción o autor..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="feed-search-input"
            />
            {searchQuery && (
              <button className="feed-search-clear" onClick={() => setSearchQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {fetching ? (
          <div className="loading-state">
            <Loader2 size={32} className="spin" />
            <p>Cargando publicaciones...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-feed">
            <div className="empty-feed-icon">
              <ImageIcon size={48} />
            </div>
            <h3>No hay publicaciones todavía</h3>
            <p>Sube una imagen o PDF para empezar a compartir material.</p>
            <button className="btn-primary" onClick={() => fileRef.current?.click()}>
              <Upload size={16} /> Subir contenido
            </button>
          </div>
        ) : (() => {
          const q = searchQuery.trim().toLowerCase();
          const filtered = q
            ? posts.filter(p =>
                p.caption?.toLowerCase().includes(q) ||
                p.profiles?.username?.toLowerCase().includes(q)
              )
            : posts;

          return filtered.length === 0 ? (
            <div className="empty-feed">
              <div className="empty-feed-icon"><Search size={40} /></div>
              <h3>Sin resultados</h3>
              <p>No se encontraron publicaciones para <strong>"{searchQuery}"</strong></p>
            </div>
          ) : (
            <div className="posts-feed">
              {filtered.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  user={user}
                  isAdmin={isAdmin}
                  classAdminId={spaceInfo?.classes?.admin_id}
                  spaceInfo={spaceInfo}
                  onDelete={handleDeletePost}
                  onReact={handleReact}
                  onDeleteComment={handleDeleteComment}
                  onImageClick={setLightboxData}
                />
              ))}
            </div>
          );
        })()}
      </main>

      {/* Upload Modal */}
      {showUploadModal && selectedFiles.length > 0 && (
        <div className="modal-overlay" onClick={closeUploadModal}>
          <div className="modal-box glass-panel animate-fade-in upload-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nueva Publicación</h2>
              <button className="close-popup-btn" onClick={closeUploadModal}><X size={18} /></button>
            </div>

            {/* Preview */}
            {previewUrls.length > 0 ? (
              <div className="upload-preview-carousel">
                {previewUrls.map((url, i) => (
                  <div className="upload-preview-item" key={i}>
                    <img src={url} alt={`Preview ${i}`} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="pdf-upload-preview">
                <FileText size={52} />
                <span>{selectedFiles[0].name}</span>
              </div>
            )}

            <div className="form-group">
              <label>Descripción (opcional)</label>
              <input
                type="text"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="¿De qué trata este material?"
                onKeyDown={e => e.key === 'Enter' && uploadPost()}
              />
            </div>

            <div className="modal-actions">
              <button className="btn-ghost" onClick={closeUploadModal} disabled={uploading}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={uploadPost} disabled={uploading}>
                {uploading
                  ? <><Loader2 size={15} className="spin" /> Subiendo...</>
                  : <><Upload size={15} /> Publicar</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
