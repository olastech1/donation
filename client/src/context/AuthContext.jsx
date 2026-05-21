import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('dp_token');
    if (token) {
      authAPI.getMe()
        .then(res => setUser(res.data.data))
        .catch(() => localStorage.removeItem('dp_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    localStorage.setItem('dp_token', res.data.data.token);
    setUser(res.data.data.user);
    return res.data;
  };

  // Register no longer returns a token — user must verify email first.
  // Returns the response data which includes { email } so the page can show a "check your email" screen.
  const register = async (name, email, password) => {
    const res = await authAPI.register({ name, email, password });
    return res.data;
  };

  // Called after email link is clicked — logs the user in with the returned JWT.
  const loginWithToken = (userData, token) => {
    localStorage.setItem('dp_token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('dp_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
