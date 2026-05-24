import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { clearSession, getCurrentUser, getStoredUser, getToken, loginUser, logoutUser } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getStoredUser());
  const [isAuthLoading, setIsAuthLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (!getToken()) {
        setIsAuthLoading(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        if (!cancelled) setUser(currentUser);
      } catch {
        clearSession();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsAuthLoading(false);
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (credentials) => {
    const session = await loginUser(credentials);
    setUser(session.user);
    return session;
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  const value = useMemo(() => {
    return { user, login, logout, isAuthLoading, isAuthenticated: Boolean(user) };
  }, [user, isAuthLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
