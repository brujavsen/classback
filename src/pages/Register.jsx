import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, UserPlus, User2, GraduationCap, ShieldCheck, Eye, EyeOff, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Typewriter from '../components/Typewriter';
import './Login.css';
import './Register.css';

export default function Register() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [role, setRole] = useState('alumno');
  const validateEmail = (email) => {
    // Basic regex
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) return false;
    
    // Strict Verification: Reject purely numeric domains (spam-like) or missing providers
    const domain = email.split('@')[1];
    // Reject things like "123123.net" or "83749.xxx"
    if (/^\d+\./.test(domain)) return false;
    
    // List of common disposable or known fake patterns (Basic prevention)
    const badDomains = ['example.com', 'test.com', 'mailinator.com', '10minutemail.com'];
    if (badDomains.includes(domain.toLowerCase())) return false;

    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    // MANUAL VALIDATIONS (replacing HTML required)
    if (!email.trim()) {
       setError('Por favor, ingresa tu correo electrónico.');
       return;
    }
    if (!validateEmail(email.trim())) {
       setError('Usa un correo real (ej: gmail, hotmail). De lo contrario, no podrás recuperar tu cuenta.');
       return;
    }
    if (!username.trim()) {
       setError('Por favor, elige un nombre de usuario.');
       return;
    }
    if (!password) {
       setError('Por favor, crea una contraseña.');
       return;
    }

    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (username.trim().includes(' ')) {
      setError('El nombre de usuario no puede tener espacios.');
      return;
    }

    setLoading(true);
    try {
      // 1. Create auth user with real email
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (signUpError) {
        if (signUpError.message.includes('User already registered') || signUpError.message.includes('already registered')) {
          throw new Error('Ese correo o nombre de usuario ya está inscrito.');
        }
        throw signUpError;
      }

      if (!data?.user) throw new Error('No se pudo obtener la sesión al registrar.');

      // 2. Insert profile row
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        username: username.trim(),
        role,
      });

      if (profileError) {
        if (profileError.message.includes('unique')) {
          throw new Error('El nombre de usuario ya está en uso, intenta con otro.');
        }
        throw profileError;
      }

      // 3. Force context update so roles are known immediately
      await refreshUser();
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Error al crear la cuenta.');
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
      setError('Error al registrarse con Google.');
    }
  };

  return (
    <div className="login-container animate-fade-in">
      <div className="login-card glass-panel">
        <div className="login-header">
          <div className="logo-icon-wrapper" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}>
            <img src="/classback-logo.png" alt="ClassBack" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: '10%' }} />
          </div>
          <p>Únete a ClassBack y organiza tu material.</p>
        </div>

        {/* Role selector */}
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

        <p className="role-description">
          {role === 'alumno'
            ? 'Podrás unirte a clases, elegir espacios y compartir material.'
            : 'Podrás crear clases, gestionar espacios y moderar contenido.'}
        </p>

        <button className="auth-provider-btn" onClick={handleGoogleLogin}>
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="auth-provider-icon" />
          Registrarse con Google
        </button>

        <div className="auth-separator">
          <span>o usa tu correo real</span>
        </div>

        <form onSubmit={handleRegister} className="login-form">
          <div className="form-group">
            <label htmlFor="reg-email">Correo electrónico</label>
            <div className="input-icon-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                type="email"
                id="reg-email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reg-username">Nombre de usuario</label>
            <div className="input-icon-wrapper">
              <User2 size={18} className="input-icon" />
              <input
                type="text"
                id="reg-username"
                placeholder="tu_usuario"
                minLength={3}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <span className="form-hint">Mínimo 3 caracteres, sin espacios.</span>
          </div>

          <div className="form-group">
            <label htmlFor="reg-password">Contraseña</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="reg-password"
                placeholder="••••••••"
                required
                minLength={6}
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

          <div className="form-group">
            <label htmlFor="reg-password-confirm">Confirmar contraseña</label>
            <div className="password-input-wrapper">
              <input
                type={showConfirm ? 'text' : 'password'}
                id="reg-password-confirm"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-primary login-btn" disabled={loading}>
            <UserPlus size={20} />
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <div className="login-footer">
          <p>¿Ya tienes una cuenta? <a href="#" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Iniciar Sesión</a></p>
        </div>
      </div>
    </div>
  );
}
