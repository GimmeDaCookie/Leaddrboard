import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    // Redirect will be handled by the component calling logout
    window.location.href = '/login';
  };

  const login = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setIsAuthenticated(true);
  };

  // Validate token periodically - only if authenticated
  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        // Call the /api/auth/me endpoint to verify token is still valid
        await api.get('/auth/me');
        setIsAuthenticated(true);
      } catch (error) {
        // Token is invalid or expired
        console.error('Token validation failed:', error);
        logout();
      }
    };

    // Only validate if we have a token
    if (isAuthenticated && localStorage.getItem('token')) {
      // Validate immediately on mount
      validateToken();

      // Set up polling interval (every 5 minutes)
      const interval = setInterval(() => {
        if (localStorage.getItem('token')) {
          validateToken();
        }
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Add response interceptor to handle 401 errors globally
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && localStorage.getItem('token')) {
          // Token is invalid, log out
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
