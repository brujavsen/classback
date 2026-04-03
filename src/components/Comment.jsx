import React, { useState } from 'react';
import { User, CornerDownRight, Send, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from '../lib/toast';
import ReadMoreText from './ReadMoreText';

const REACTIONS = [
  { emoji: '❤️', label: 'Me encanta' },
];

export default function Comment({ comment, postId, user, isAdmin, classAdminId, spaceInfo, onDelete, onReact, depth = 0 }) {
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
      const { data: replyData } = await supabase.from('comments').insert({
        post_id: postId,
        parent_id: comment.id,
        user_id: user.id,
        content: replyText.trim(),
      }).select().single();

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
