import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionStatus, setSessionStatus] = useState(null);

  const refreshSessionStatus = async () => {
    try {
      const response = await axios.get('/api/auth/session-status');
      setSessionStatus(response.data);
      return response.data;
    } catch (error) {
      setSessionStatus(null);
      throw error;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('jwt');
    console.log('[AuthContext] JWT from localStorage:', token);
    if (token) {
      try {
        const decoded = jwtDecode(token);
        console.log('[AuthContext] Decoded JWT:', decoded);
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          console.log('[AuthContext] JWT expired:', new Date(decoded.exp * 1000), 'Current time:', new Date());
          localStorage.removeItem('jwt');
          setUser(null);
          setIsAuthenticated(false);
          setSessionStatus(null);
          setAuthError('Session expired. Please sign in again.');
          delete axios.defaults.headers.common['Authorization'];
        } else {
          setUser(decoded);
          setIsAuthenticated(true);
          setAuthError(null);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          refreshSessionStatus().catch(() => {});
          console.log('[AuthContext] JWT valid, user authenticated.');
        }
      } catch (e) {
        console.log('[AuthContext] Error decoding JWT:', e);
        setUser(null);
        setIsAuthenticated(false);
        setSessionStatus(null);
        setAuthError('Invalid session. Please sign in again.');
        delete axios.defaults.headers.common['Authorization'];
      }
    } else {
      console.log('[AuthContext] No JWT found in localStorage.');
      setUser(null);
      setIsAuthenticated(false);
      setSessionStatus(null);
      setAuthError(null);
      delete axios.defaults.headers.common['Authorization'];
    }
    setLoading(false);
  }, []);

  const login = async (token) => {
    localStorage.setItem('jwt', token);
    const decoded = jwtDecode(token);
    setUser(decoded);
    setIsAuthenticated(true);
    setAuthError(null);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    await refreshSessionStatus();
  };

  const logout = async () => {
    try {
      if (localStorage.getItem('jwt')) {
        await axios.post('/api/auth/logout');
      }
    } catch (error) {
      console.error('[AuthContext] Logout request failed:', error);
    }
    localStorage.removeItem('jwt');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    setSessionStatus(null);
    setAuthError(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, authError, loading, sessionStatus, refreshSessionStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// Add global axios interceptor for setup redirect and auth errors
if (typeof window !== 'undefined') {
  axios.interceptors.response.use(
    response => response,
    error => {
      // Handle initial setup redirect
      if (
        error.response &&
        error.response.status === 403 &&
        error.response.data &&
        typeof error.response.data.error === 'string' &&
        error.response.data.error.includes('Initial setup required')
      ) {
        window.location.href = '/setup';
      }
      // Handle expired/invalid JWT (401 Unauthorized)
      if (
        error.response &&
        error.response.status === 401 &&
        typeof window !== 'undefined'
      ) {
        localStorage.removeItem('jwt');
        delete axios.defaults.headers.common['Authorization'];
        // Optionally, force reload to reset app state
        window.location.href = '/signin';
      }
      return Promise.reject(error);
    }
  );
} 