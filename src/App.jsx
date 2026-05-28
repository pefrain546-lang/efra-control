import { useState } from 'react';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import './index.css';

function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('efra_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (userData) => {
    localStorage.setItem('efra_user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('efra_user');
    setUser(null);
  };

  return (
    <>
      {!user ? (
        <Login onLogin={handleLogin} />
      ) : (
        <AdminDashboard user={user} onLogout={handleLogout} />
      )}
    </>
  );
}

export default App;
