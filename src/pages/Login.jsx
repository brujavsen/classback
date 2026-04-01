import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, LogIn, Mail, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Typewriter from '../components/Typewriter';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) throw signInError;

      navigate('/dashboard');
    } catch (err) {
      setError('Correo electrónico o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/dashboard` }
      });
      if (error) throw error;
    } catch (err) {
      setError('Error al iniciar sesión con Google.');
    }
  };

  return (
    <div className="login-container animate-fade-in">
      <div className="login-card glass-panel">
        <div className="login-header">
          <div className="logo-icon-wrapper" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}>
            <img src="/classback-logo.png" alt="ClassBack" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: '50%' }} />
          </div>
          <p>Tu material de estudio, organizado.</p>
        </div>

        <button className="auth-provider-btn" onClick={handleGoogleLogin}>
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="auth-provider-icon" />
          Continuar con Google
        </button>

        <div className="auth-separator">
          <span>o usa tu correo</span>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Correo electrónico</label>
            <div className="input-icon-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                type="email"
                id="email"
                placeholder="tu@correo.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label htmlFor="password">Contraseña</label>
              <a href="#" className="forgot-password" onClick={(e) => { e.preventDefault(); navigate('/reset-password'); }}>
                ¿Olvidaste tu contraseña?
              </a>
            </div>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-primary login-btn" disabled={loading}>
            <LogIn size={20} />
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div className="login-footer">
          <p>¿No tienes una cuenta? <a href="#" onClick={(e) => { e.preventDefault(); navigate('/register'); }}>Crea una</a></p>
        </div>
      </div>
    </div>
  );
}
