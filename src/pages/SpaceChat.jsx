import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Upload, Loader2, X, Image as ImageIcon, Search, ChevronLeft, ChevronRight, Plus, User, Trash2, FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { supabase } from '../lib/supabase';
import { showToast } from '../lib/toast';
import './SpaceChat.css';

import PostCard from '../components/PostCard';

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
  const fileRef = useRef(null);
  const addMoreRef = useRef(null);
  const [posts, setPosts] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Upload state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [caption, setCaption] = useState('');

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
    let timeoutId = null;
    const debouncedFetch = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fetchPosts(), 600);
    };

    const channel = supabase
      .channel(`feed-${spaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `space_id=eq.${spaceId}` }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, debouncedFetch)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [spaceId, fetchPosts]);

  // ── Handle file selection ──
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const isPDF = files[0].type === 'application/pdf';

    if (isPDF) {
      if (files[0].size > 15 * 1024 * 1024) {
        showToast('El archivo PDF no puede superar los 15MB.', 'warning');
        e.target.value = '';
        return;
      }
      if (files.length > 1) showToast('Solo puedes subir 1 archivo PDF a la vez.', 'warning');
      setSelectedFiles([files[0]]);
      setPreviewUrls([]);
    } else {
      const validImages = files.filter(f => f.type.startsWith('image/'));
      const sizeOkImages = validImages.filter(f => f.size <= 5 * 1024 * 1024);

      if (validImages.length !== sizeOkImages.length) {
        showToast('Algunas imágenes superan los 5MB y fueron descartadas.', 'warning');
      }

      if (sizeOkImages.length === 0) { e.target.value = ''; return; }

      if (sizeOkImages.length > 5) {
        showToast('Solo puedes subir hasta 5 imágenes.', 'warning');
        sizeOkImages.splice(5);
      }
      setSelectedFiles(sizeOkImages);
      setPreviewUrls(sizeOkImages.map(f => URL.createObjectURL(f)));
    }
    e.target.value = '';
  };

  const handleAddMoreFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const validImages = files.filter(f => f.type.startsWith('image/'));
    const sizeOkImages = validImages.filter(f => f.size <= 5 * 1024 * 1024);
    
    if (validImages.length !== sizeOkImages.length) {
      showToast('Algunas imágenes superaban los 5MB y fueron omitidas.', 'warning');
    }

    if (sizeOkImages.length === 0) return;

    const newFiles = [...selectedFiles, ...sizeOkImages].slice(0, 5);
    if ([...selectedFiles, ...sizeOkImages].length > 5) {
      showToast('Límite de 5 imágenes alcanzado.', 'warning');
    }

    setSelectedFiles(newFiles);
    setPreviewUrls(newFiles.map(f => URL.createObjectURL(f)));
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
      } catch { /* notifications are best-effort */ }

      cancelUpload();
    } catch (err) {
      showAlert('Error al subir', err.message);
    } finally {
      setUploading(false);
    }
  };

  const cancelUpload = () => {
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
          
          setPosts(prev => prev.filter(p => p.id !== postId));

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
        {/* Inline Composer */}
        {selectedFiles.length > 0 && (
          <div className="composer-card glass-panel animate-fade-in" style={{ marginBottom: '24px', padding: '20px' }}>
            <div className="composer-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', margin: 0 }}>Nueva Publicación</h2>
              <button className="close-popup-btn" onClick={cancelUpload}><X size={18} /></button>
            </div>

            {/* Preview */}
            {previewUrls.length > 0 ? (
              <div className="upload-preview-carousel">
                {previewUrls.map((url, i) => (
                  <div className="upload-preview-item" key={i} style={{ position: 'relative' }}>
                    <img src={url} alt={`Preview ${i}`} />
                  </div>
                ))}

                {selectedFiles.length < 5 && (
                  <div 
                    className="upload-preview-item add-more"
                    onClick={() => addMoreRef.current?.click()}
                    style={{ cursor: 'pointer', background: 'var(--bg-secondary)', flexDirection: 'column', color: 'var(--text-secondary)' }}
                  >
                    <Plus size={24} />
                    <span style={{ fontSize: '12px', marginTop: '4px' }}>Agregar</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  ref={addMoreRef}
                  onChange={handleAddMoreFiles}
                  multiple
                  style={{ display: 'none' }}
                />
              </div>
            ) : (
              <div className="pdf-upload-preview" style={{ marginBottom: '16px' }}>
                <FileText size={40} />
                <span>{selectedFiles[0].name}</span>
              </div>
            )}

            <div className="composer-form-group" style={{ marginTop: '16px' }}>
              <input
                type="text"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="¿De qué trata este material? (opcional)"
                onKeyDown={e => e.key === 'Enter' && uploadPost()}
                className="composer-input"
              />
            </div>

            <div className="composer-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
              <button className="btn-ghost" onClick={cancelUpload} disabled={uploading}>
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
        )}

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
                />
              ))}
            </div>
          );
        })()}
      </main>

    </div>
  );
}
