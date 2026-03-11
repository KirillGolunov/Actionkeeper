import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import { translations } from '../i18n/translations';

const AuthContext = createContext();

function getLocaleAuthText(key) {
  const locale = (typeof window !== 'undefined' && localStorage.getItem('locale')) || 'ru';
  return translations[locale]?.auth?.[key] || translations.en.auth[key];
}

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
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem('jwt');
          setUser(null);
          setIsAuthenticated(false);
          setSessionStatus(null);
          setAuthError(getLocaleAuthText('sessionExpired'));
          delete axios.defaults.headers.common.Authorization;
        } else {
          setUser(decoded);
          setIsAuthenticated(true);
          setAuthError(null);
          axios.defaults.headers.common.Authorization = `Bearer ${token}`;
          refreshSessionStatus().catch(() => {});
        }
      } catch (e) {
        setUser(null);
        setIsAuthenticated(false);
        setSessionStatus(null);
        setAuthError(getLocaleAuthText('invalidSession'));
        delete axios.defaults.headers.common.Authorization;
      }
    } else {
      setUser(null);
      setIsAuthenticated(false);
      setSessionStatus(null);
      setAuthError(null);
      delete axios.defaults.headers.common.Authorization;
    }
    setLoading(false);
  }, []);

  const login = async (token) => {
    localStorage.setItem('jwt', token);
    const decoded = jwtDecode(token);
    setUser(decoded);
    setIsAuthenticated(true);
    setAuthError(null);
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
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
    delete axios.defaults.headers.common.Authorization;
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

if (typeof window !== 'undefined') {
  axios.interceptors.response.use(
    response => response,
    error => {
      if (
        error.response &&
        error.response.status === 403 &&
        error.response.data &&
        error.response.data.errorCode === 'setup.required'
      ) {
        window.location.href = '/setup';
      }
      if (error.response && error.response.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('jwt');
        delete axios.defaults.headers.common.Authorization;
        window.location.href = '/signin';
      }
      return Promise.reject(error);
    }
  );
}
