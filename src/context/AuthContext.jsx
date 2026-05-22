import { createContext, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = async (credentials) => {
    // Mock API call
    return new Promise((resolve) => {
      setTimeout(() => {
        if (credentials.role === 'admin') {
          setUser({ name: 'Admin', role: 'admin' });
        } else {
          setUser({ name: credentials.surname, matric: credentials.matric, role: 'student' });
        }
        resolve({ success: true });
      }, 1000);
    });
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
