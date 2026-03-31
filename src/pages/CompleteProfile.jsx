import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { User2, ShieldCheck, GraduationCap, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import './CompleteProfile.css';

export default function CompleteProfile() {
  const { user, needsProfileSetup, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('alumno');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If there's no user, or profile is already setup, bounce back
  if (!user) return <Navigate to="/login" replace />;
  if (!needsProfileSetup) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (username.trim().includes(' ')) {
      setError('El nombre de usuario no puede tener espacios.');
      return;
    }

    setLoading(true);
    try {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: user.id,
        username: username.trim(),
        role,
      });

      if (profileError) throw profileError;

      // Force AuthContext to refetch profile
      await refreshUser();
      navigate('/dashboard');
    } catch (err) {
      setError(err.message.includes('unique') ? 'Este nombre de usuario ya está en uso.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="complete-profile-layout animate-fade-in">
      <div className="login-card glass-panel">
        <div className="login-header">
          <h2>¡Casi listo!</h2>
          <p>Solo falta un último paso para completar tu perfil.</p>
        </div>

        <div className="role-toggle">
          <button
            type="button"
            className={`role-btn ${role === 'alumno' ? 'active' : ''}`}
            onClick={() => setRole('alumno')}
          >
            <GraduationCap size={20} />
            Alumno
          </button>
          <button
            type="button"
            className={`role-btn ${role === 'admin' ? 'active' : ''}`}
            onClick={() => setRole('admin')}
          >
            <ShieldCheck size={20} />
            Administrador
          </button>
        </div>

        <p className="role-description" style={{ marginBottom: 20 }}>
          {role === 'alumno'
            ? 'Los alumnos pueden unirse a clases creadas por administradores.'
            : 'Los administradores pueden crear clases y gestionar el contenido.'}
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="comp-username">Nombre de usuario (único)</label>
            <div className="input-icon-wrapper">
              <User2 size={18} className="input-icon" />
              <input
                type="text"
                id="comp-username"
                placeholder="Ej: juanperez23"
                required
                minLength={3}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <span className="form-hint">Con el que te verán los demás usuarios.</span>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-primary login-btn" disabled={loading}>
            {loading ? 'Guardando...' : 'Completar perfil'} <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
