import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Key, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/profile`
      });

      if (resetError) throw resetError;
      
      setMessage('Hemos enviado un enlace a tu correo. Revisa tu bandeja de entrada.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container animate-fade-in">
      <div className="login-card glass-panel" style={{ textAlign: 'center' }}>
        <div className="login-header">
          <Key size={48} className="logo-icon" style={{ margin: '0 auto 16px', color: 'var(--accent-primary)' }} />
          <h2>Restablecer Contraseña</h2>
          <p>Ingresa el correo de tu cuenta para recibir un enlace de recuperación.</p>
        </div>

        <form onSubmit={handleReset} className="login-form">
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label htmlFor="reset-email">Correo Electrónico</label>
            <div className="input-icon-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                type="email"
                id="reset-email"
                placeholder="tu@correo.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}
          {message && <p className="form-hint" style={{ color: 'var(--success)', marginTop: 8, fontSize: 14 }}>{message}</p>}

          <button type="submit" className="btn-primary login-btn" disabled={loading} style={{ marginTop: 24 }}>
            {loading ? 'Enviando...' : 'Enviar enlace'}
          </button>
        </form>

        <div className="login-footer">
          <button className="btn-ghost" onClick={() => navigate('/login')} style={{ marginTop: 16 }}>
            <LogIn size={16} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} /> Volver al Inicio
          </button>
        </div>
      </div>
    </div>
  );
}
