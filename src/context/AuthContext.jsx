import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);

  const fetchProfile = async (authUser) => {
    if (!authUser) { setUser(null); setNeedsProfileSetup(false); return; }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, role, avatar_url')
        .eq('id', authUser.id)
        .single();
      
      if (data) {
        setNeedsProfileSetup(false);
        setUser({ 
          id: authUser.id,
          email: authUser.email,
          username: data.username, 
          role: data.role,
          avatar_url: data.avatar_url 
        });
      } else if (error) {
        if (error.code === 'PGRST116') {
          // El perfil no existe (posiblemente Auth de Google recién creado)
          setNeedsProfileSetup(true);
          setUser({ id: authUser.id, email: authUser.email });
        } else {
          console.error("Error fetching profile:", error.message);
        }
      }
    } catch (e) {
      console.error("Error fetching profile", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        fetchProfile(session?.user ?? null);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setNeedsProfileSetup(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setNeedsProfileSetup(false);
  };

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await fetchProfile(session.user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, needsProfileSetup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
