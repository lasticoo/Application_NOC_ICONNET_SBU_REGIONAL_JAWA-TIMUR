import { createContext, useContext, useState } from 'react';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); }
    catch { return null; }
  });

  const login = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
