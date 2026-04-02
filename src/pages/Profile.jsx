import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Shield, Camera, Loader2, MessageSquare, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { supabase } from '../lib/supabase';
import './Profile.css';

export default function Profile() {
  const { user, logout } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [joinedSpaces, setJoinedSpaces] = useState([]);
  
  // Edit states
  const [editing, setEditing] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [editingPassword, setEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfileData = async () => {
      setLoading(true);
      try {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        const { data: spaces } = await supabase
          .from('user_spaces')
          .select(`
            space_id,
            class_id,
            spaces (name),
            classes (name)
          `)
          .eq('user_id', user.id);

        setProfile(prof);
        setNewUsername(prof?.username || '');
        setJoinedSpaces(spaces || []);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, [user]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!newUsername.trim()) {
      showAlert('Error', 'Por favor, ingresa un nombre de usuario.');
      return;
    }
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: newUsername.trim() })
        .eq('id', user.id);
      
      if (error) throw error;
      setProfile({ ...profile, username: newUsername.trim() });
      setEditing(false);
    } catch (err) {
      showAlert('Error', 'No se pudo actualizar el nombre: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword) {
      showAlert('Error', 'Por favor, ingresa la nueva contraseña.');
      return;
    }
    setUpdatingPassword(true);
    try {
      if (newPassword.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showAlert('Éxito', 'Tu contraseña ha sido actualizada correctamente.');
      setEditingPassword(false);
      setNewPassword('');
    } catch (err) {
      showAlert('Error', 'No se pudo actualizar la contraseña: ' + err.message);
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit to 1MB for profile avatars
    if (file.size > 1 * 1024 * 1024) {
      showAlert('Foto pesada', 'La foto de perfil debe pesar menos de 1MB.');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      
      const { error: upErr } = await supabase.storage.from('classback-avatars').upload(path, file, {
        upsert: true
      });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('classback-avatars').getPublicUrl(path);

      const { error: profErr } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', user.id);
      
      if (profErr) throw profErr;

      setProfile({ ...profile, avatar_url: urlData.publicUrl });
    } catch (err) {
      showAlert('Error', 'No se pudo cargar la imagen. Asegúrate de que el bucket sea público.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (loading) return <div className="loading-container"><Loader2 className="spin" /></div>;

  return (
    <div className="profile-layout animate-fade-in">
      <header className="profile-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={20} /> Volver
        </button>
        <h1>Mi Perfil</h1>
      </header>

      <main className="profile-content">
        <section className="profile-card glass-panel">
          <div className="avatar-section">
            <div className="avatar-wrapper">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="profile-avatar" />
              ) : (
                <div className="default-avatar">
                   <User size={48} />
                </div>
              )}
              <input 
                type="file" 
                accept="image/*" 
                ref={fileRef} 
                onChange={handleImageUpload} 
                style={{ display: 'none' }} 
              />
              <button 
                className="edit-avatar-btn" 
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 size={16} className="spin" /> : <Camera size={16} />}
              </button>
            </div>
            <div className="profile-info">
              <h2>{profile?.username}</h2>
              <span className={`role-badge ${profile?.role}`}>
                {profile?.role === 'admin' ? <Shield size={14} style={{ marginRight: 4 }} /> : null}
                {profile?.role?.toUpperCase()}
              </span>
            </div>
          </div>

          {!editing ? (
            <button className="btn-secondary" onClick={() => setEditing(true)}>Cambiar nombre</button>
          ) : (
            <form onSubmit={handleUpdate} className="edit-form">
              <div className="form-group">
                <label>Nombre de usuario</label>
                <input 
                  type="text" 
                  value={newUsername} 
                  onChange={e => setNewUsername(e.target.value)} 
                />
              </div>
              <div className="edit-actions">
                <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={updating}>
                  {updating ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          )}

          <div style={{ padding: '24px 0', borderTop: '1px solid var(--border-color)', marginTop: '24px' }}>
            <h3 style={{ fontSize: 18, marginBottom: 16 }}>Seguridad de la cuenta</h3>
            {!editingPassword ? (
              <button className="btn-secondary" onClick={() => setEditingPassword(true)}>Cambiar contraseña</button>
            ) : (
              <form onSubmit={handleUpdatePassword} className="edit-form">
                 <div className="form-group">
                   <label>Nueva contraseña</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)} 
                      minLength={6}
                    />
                 </div>
                 <div className="edit-actions">
                   <button type="button" className="btn-ghost" onClick={() => setEditingPassword(false)}>Cancelar</button>
                   <button type="submit" className="btn-primary" disabled={updatingPassword}>
                     {updatingPassword ? 'Guardando...' : 'Guardar contraseña'}
                   </button>
                 </div>
              </form>
            )}
          </div>
        </section>

        <section className="spaces-section">
          <h3>Mis Espacios</h3>
          {joinedSpaces.length === 0 ? (
            <p className="empty-hint">No estás en ningún espacio todavía.</p>
          ) : (
            <div className="joined-spaces-list">
              {joinedSpaces.map((item, idx) => (
                <div key={idx} className="joined-space-card glass-panel" onClick={() => navigate(`/class/${item.class_id}/space/${item.space_id}`)}>
                  <div className="space-icon-wrapper small">
                    <MessageSquare size={18} />
                  </div>
                  <div className="space-details">
                    <span className="space-name">{item.spaces?.name}</span>
                    <span className="class-name">{item.classes?.name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <button className="logout-btn" onClick={() => { logout(); navigate('/login'); }}>
          Cerrar sesión
        </button>
      </main>
    </div>
  );
}
