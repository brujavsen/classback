import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Plus, X, Loader2, BookOpen, Files, Check, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { supabase } from '../lib/supabase';
import './ClassView.css';

function SpaceIcon({ name }) {
  const n = name.toLowerCase();
  if (n.includes('teoría') || n.includes('teoria')) return <BookOpen size={22} />;
  if (n.includes('consulta') || n.includes('general')) return <MessageSquare size={22} />;
  return <Files size={22} />;
}

export default function ClassView() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showAlert, showConfirm } = useModal();

  const [classInfo, setClassInfo] = useState(null);
  const isAdmin = user?.role === 'admin' && classInfo?.admin_id === user?.id;
  const [allSpaces, setAllSpaces] = useState([]);
  const [joinedSpaceIds, setJoinedSpaceIds] = useState(new Set());
  const [fetching, setFetching] = useState(true);
  const [showPopup, setShowPopup] = useState(false);

  // Create space modal (admin)
  const [showCreate, setShowCreate] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setFetching(true);
    try {
      const { data: cls } = await supabase.from('classes').select('name, code, admin_id').eq('id', classId).single();
      const { data: sps } = await supabase.from('spaces').select('*').eq('class_id', classId).order('created_at');
      const { data: joined } = await supabase.from('user_spaces').select('space_id').eq('class_id', classId).eq('user_id', user.id);

      setClassInfo(cls);
      setAllSpaces(sps || []);
      setJoinedSpaceIds(new Set((joined || []).map(j => j.space_id)));
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { fetchData(); }, [classId, user]);

  const toggleSpaceSelection = async (spaceId) => {
    const isJoined = joinedSpaceIds.has(spaceId);
    if (isJoined) {
      await supabase.from('user_spaces').delete().eq('user_id', user.id).eq('space_id', spaceId);
      setJoinedSpaceIds(prev => {
        const next = new Set(prev);
        next.delete(spaceId);
        return next;
      });
    } else {
      await supabase.from('user_spaces').insert({
        user_id: user.id,
        space_id: spaceId,
        class_id: classId
      });
      setJoinedSpaceIds(prev => new Set(prev).add(spaceId));
    }
  };

  const handleCreateSpace = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (!newSpaceName.trim()) {
      setCreateError('Por favor, ingresa el nombre del espacio.');
      return;
    }
    if (!/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]+$/.test(newSpaceName)) {
      setCreateError('El nombre solo puede contener letras y números (sin espacios).');
      return;
    }
    if (newSpaceName.length > 10) {
      setCreateError('El nombre no puede tener más de 10 caracteres.');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.from('spaces').insert({
        class_id: classId,
        name: newSpaceName,
      }).select().single();

      if (error) throw error;
      
      // Auto-join the creator to the new space
      await supabase.from('user_spaces').insert({
        user_id: user.id,
        space_id: data.id,
        class_id: classId
      });

      setShowCreate(false);
      setNewSpaceName('');
      fetchData();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSpace = async (e, spaceId) => {
    e.stopPropagation();
    showConfirm(
      '¿Eliminar espacio?',
      'Se borrarán todos los mensajes e imágenes asociados.',
      async () => {
        try {
          const { error } = await supabase.from('spaces').delete().eq('id', spaceId);
          if (error) throw error;
          setAllSpaces(prev => prev.filter(s => s.id !== spaceId));
        } catch (err) {
          showAlert('Error', 'No se pudo eliminar el espacio: ' + err.message);
        }
      }
    );
  };

  const enterSpace = (spaceId) => navigate(`/class/${classId}/space/${spaceId}`);

  if (fetching) return (
    <div className="class-view-layout animate-fade-in">
      <div className="loading-state"><Loader2 size={32} className="spin" /><p>Cargando...</p></div>
    </div>
  );

  const visibleSpaces = allSpaces.filter(s => joinedSpaceIds.has(s.id));

  return (
    <div className="class-view-layout animate-fade-in">
      <header className="class-header glass-panel">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={20} /> Volver
        </button>
        <div className="class-title-info">
          <h2>{classInfo?.name || 'Clase'}</h2>
          <span className="class-badge">{classInfo?.code}</span>
        </div>
        <button className="btn-primary open-spaces-btn" onClick={() => setShowPopup(true)}>
          <MessageSquare size={16} /> Elegir Espacios
        </button>
      </header>

      <main className="class-content">
        <div className="view-intro">
          <h1>{isAdmin ? 'Gestión de clase' : 'Tus Espacios'}</h1>
          <p>{isAdmin 
            ? 'Gestioná los espacios disponibles para los alumnos.' 
            : 'Acá aparecen las materias que seleccionaste.'}</p>
        </div>

        {isAdmin && (
          <div className="admin-spaces-header">
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> Crear espacio
            </button>
          </div>
        )}

        {visibleSpaces.length === 0 ? (
          <div className="empty-state">
            <p>No tenés materias seleccionadas.</p>
            <button className="btn-primary" onClick={() => setShowPopup(true)}>
              <Plus size={16} /> Seleccionar materias
            </button>
          </div>
        ) : (
          <div className="spaces-grid">
            {visibleSpaces.map(space => (
              <div key={space.id} className="space-card glass-panel" onClick={() => enterSpace(space.id)}>
                <div className="space-icon-wrapper"><SpaceIcon name={space.name} /></div>
                <div className="space-info">
                  <h3>{space.name}</h3>
                </div>
                {isAdmin && (
                  <button className="delete-space-btn" onClick={(e) => handleDeleteSpace(e, space.id)} title="Eliminar espacio">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Subscription Popup (both roles) */}
      {showPopup && (
        <div className="modal-overlay" onClick={() => setShowPopup(false)}>
          <div className="spaces-popup glass-panel animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h2>Elegir Espacios</h2>
              <button className="close-popup-btn" onClick={() => setShowPopup(false)}><X size={20} /></button>
            </div>
            <p className="popup-subtitle">Seleccioná las materias que querés tener en tu pantalla principal.</p>
            {allSpaces.length === 0 ? (
              <p className="empty-hint">No hay espacios creados en esta clase.</p>
            ) : (
              <div className="popup-spaces-list">
                {allSpaces.map(space => {
                  const isJoined = joinedSpaceIds.has(space.id);
                  return (
                    <button 
                      key={space.id} 
                      className={`popup-space-item selection-mode ${isJoined ? 'selected' : ''}`} 
                      onClick={() => toggleSpaceSelection(space.id)}
                    >
                      <div className={`space-icon-wrapper small ${isJoined ? 'selected' : ''}`}>
                        <SpaceIcon name={space.name} />
                      </div>
                      <span className="popup-space-name">{space.name}</span>
                      {isJoined && <Check size={18} className="select-check" />}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button className="btn-primary" style={{ width: '100%' }} onClick={() => setShowPopup(false)}>
                Cerrar y ver materias
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create space modal (admin) */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-box glass-panel animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Crear espacio</h2>
              <button className="close-popup-btn" onClick={() => setShowCreate(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateSpace}>
              <div className="form-group">
                <label>Nombre del espacio</label>
                <input type="text" placeholder="Ej: Teoria" value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)} maxLength={10} />
              </div>
              {createError && <p className="form-error" style={{ marginTop: 8 }}>{createError}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowCreate(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={creating}>{creating ? 'Creando...' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
