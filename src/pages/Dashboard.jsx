import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, Plus, Users, PlusCircle, Settings, Loader2, X, User, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { supabase } from '../lib/supabase';
import Typewriter from '../components/Typewriter';
import NotificationBell from '../components/NotificationBell';
import { showToast } from '../lib/toast';
import './Dashboard.css';

const CARD_COLORS = ['#6366f1', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const isAdmin = user?.role === 'admin';

  const [classes, setClasses] = useState([]);
  const [fetching, setFetching] = useState(true);

  // Join class modal
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  // Create class modal (admin)
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const handleNameChange = (e) => {
    const val = e.target.value;
    if (val.length > 10) {
      showToast('El nombre de la clase no puede exceder 10 caracteres', 'warning');
      return;
    }
    if (val && !/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]+$/.test(val)) {
      showToast('Solo se permiten letras y números sin espacios', 'warning');
      return;
    }
    setNewName(val);
  };

  const fetchClasses = async () => {
    if (!user) return;
    setFetching(true);
    try {
      // Fetch classes where user is the admin
      const { data: adminClasses } = await supabase
        .from('classes')
        .select('*')
        .eq('admin_id', user.id);

      // Fetch classes where user is a member
      const { data: memberClassesData } = await supabase
        .from('class_members')
        .select('class_id, classes(*)')
        .eq('user_id', user.id);

      const memberClasses = (memberClassesData || []).map(m => m.classes);

      // Combine and unique by ID (in case an admin is also a member, though unlikely)
      const combined = [...(adminClasses || []), ...memberClasses];
      const unique = Array.from(new Map(combined.map(c => [c.id, c])).values());

      setClasses(unique.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { fetchClasses(); }, [user]);

  const handleJoin = async (e) => {
    e.preventDefault();
    setJoinError('');

    if (!joinCode.trim()) {
      setJoinError('Por favor, ingresa el código de la clase.');
      return;
    }
    if (!joinPassword) {
      setJoinError('Por favor, ingresa la contraseña.');
      return;
    }

    setJoining(true);
    try {
      const { data: cls, error } = await supabase
        .from('classes')
        .select('id, password, admin_id')
        .eq('code', joinCode.trim().toUpperCase())
        .single();

      if (error || !cls) throw new Error('Código de clase no encontrado.');
      if (cls.password !== joinPassword) throw new Error('Contraseña incorrecta.');
      if (cls.admin_id === user.id) throw new Error('Ya eres el administrador de esta clase.');

      const { error: memberError } = await supabase.from('class_members').insert({
        class_id: cls.id,
        user_id: user.id,
      });
      if (memberError && memberError.code !== '23505') throw memberError;

      setShowJoin(false);
      setJoinCode(''); setJoinPassword('');
      fetchClasses();
    } catch (err) {
      setJoinError(err.message);
    } finally {
      setJoining(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (!newName.trim()) {
      setCreateError('Por favor, ingresa el nombre de la clase.');
      return;
    }
    if (!/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]+$/.test(newName)) {
      setCreateError('El nombre solo puede contener letras y números (sin espacios).');
      return;
    }
    if (newName.length > 10) {
      setCreateError('El nombre no puede tener más de 10 caracteres.');
      return;
    }
    if (!newCode.trim()) {
      setCreateError('Por favor, ingresa el código único.');
      return;
    }
    if (!newPassword) {
      setCreateError('Por favor, ingresa una contraseña de acceso.');
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase.from('classes').insert({
        name: newName,
        code: newCode.trim().toUpperCase(),
        password: newPassword,
        admin_id: user.id,
      });
      if (error) throw error;
      setShowCreate(false);
      setNewName(''); setNewCode(''); setNewPassword('');
      fetchClasses();
    } catch (err) {
      setCreateError(err.message.includes('unique') ? 'Ese código ya está en uso.' : err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteClass = async (e, classId) => {
    e.stopPropagation();
    showConfirm(
      '¿Eliminar clase?',
      'Se borrarán todos los espacios y mensajes asociados. Esta acción no se puede deshacer.',
      async () => {
        try {
          const { error } = await supabase.from('classes').delete().eq('id', classId);
          if (error) throw error;
          setClasses(prev => prev.filter(c => c.id !== classId));
        } catch (err) {
          showAlert('Error', 'No se pudo eliminar la clase: ' + err.message);
        }
      }
    );
  };

  return (
    <div className="dashboard-layout animate-fade-in">
      <header className="dashboard-header glass-panel">
        <div className="header-brand">
          <Typewriter />
        </div>
        <div className="header-actions">
          {isAdmin && (
            <button className="btn-primary header-btn" onClick={() => setShowCreate(true)}>
              <Plus size={18} /> Crear clase
            </button>
          )}
          <button className="btn-secondary header-btn" onClick={() => setShowJoin(true)}>
            <PlusCircle size={18} /> Unirse a clase
          </button>

          <div className="header-user">
            <span className={`role-badge ${user?.role}`}>
              {user?.role === 'admin' ? 'Admin' : 'Alumno'}
            </span>
            <NotificationBell />
            <button className="icon-action-btn" title="Perfil" onClick={() => navigate('/profile')}>
              <User size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="section-header">
          <h1>Mis Clases</h1>
          <p>{isAdmin
            ? 'Gestioná tus clases o unite a otras usando un código.'
            : 'Seleccioná una clase para elegir tus espacios y ver el material.'}</p>
        </div>

        {fetching ? (
          <div className="loading-state">
            <Loader2 size={32} className="spin" />
            <p>Cargando clases...</p>
          </div>
        ) : classes.length === 0 ? (
          <div className="empty-state">
            <p>{isAdmin ? 'Todavía no tenés ninguna clase.' : 'Todavía no te uniste a ninguna clase.'}</p>
            <div className="empty-actions">
              {isAdmin && (
                <button className="btn-primary" onClick={() => setShowCreate(true)}>
                  <Plus size={16} /> Crear primera clase
                </button>
              )}
              <button className="btn-secondary" onClick={() => setShowJoin(true)}>
                <PlusCircle size={16} /> Unirse a una clase
              </button>
            </div>
          </div>
        ) : (
          <div className="classes-grid">
            {classes.map((cls, i) => {
              const userIsAdminOfThis = cls.admin_id === user?.id;
              return (
                <div
                  key={cls.id}
                  className="class-card glass-panel"
                  style={{ '--card-color': CARD_COLORS[i % CARD_COLORS.length] }}
                  onClick={() => navigate(`/class/${cls.id}`)}
                >
                  <div className="class-card-header">
                    <div className="class-card-title-row">
                      <h3>{cls.name}</h3>
                      {userIsAdminOfThis && (
                        <button className="delete-btn-card" onClick={(e) => handleDeleteClass(e, cls.id)} title="Eliminar clase">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <span className="class-code">{cls.code}</span>
                  </div>
                  <div className="class-card-footer">
                    <div className="members-count">
                      <Users size={16} />
                      <span>{userIsAdminOfThis ? 'Administrador' : 'Miembro'}</span>
                    </div>
                    {userIsAdminOfThis ? (
                      <button className="enter-class-btn manage" onClick={(e) => { e.stopPropagation(); navigate(`/class/${cls.id}`); }}>
                        <Settings size={14} /> Gestionar
                      </button>
                    ) : (
                      <button className="enter-class-btn">Ingresar</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Join class modal */}
      {showJoin && (
        <div className="modal-overlay" onClick={() => setShowJoin(false)}>
          <div className="modal-box glass-panel animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Unirse a una clase</h2>
              <button className="close-popup-btn" onClick={() => setShowJoin(false)}><X size={20} /></button>
            </div>
            <p>Ingresá el código y contraseña que te dio tu administrador.</p>
            <form onSubmit={handleJoin}>
              <div className="form-group">
                <label>Código de clase</label>
                <input type="text" placeholder="Ej: AM-2024" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginTop: 12 }}>
                <label>Contraseña</label>
                <input type="password" placeholder="••••••••" value={joinPassword} onChange={(e) => setJoinPassword(e.target.value)} />
              </div>
              {joinError && <p className="form-error" style={{ marginTop: 8 }}>{joinError}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowJoin(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={joining}>{joining ? 'Uniéndose...' : 'Unirse'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create class modal (admin) */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-box glass-panel animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Crear nueva clase</h2>
              <button className="close-popup-btn" onClick={() => setShowCreate(false)}><X size={20} /></button>
            </div>
            <p>Los alumnos usarán el código y contraseña para unirse.</p>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Nombre de la clase</label>
                <input type="text" placeholder="Ej: Analisis" value={newName} onChange={handleNameChange} maxLength={10} />
              </div>
              <div className="form-group" style={{ marginTop: 12 }}>
                <label>Código único</label>
                <input type="text" placeholder="Ej: AM-2024" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginTop: 12 }}>
                <label>Contraseña de acceso</label>
                <input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              {createError && <p className="form-error" style={{ marginTop: 8 }}>{createError}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowCreate(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={creating}>{creating ? 'Creando...' : 'Crear clase'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
