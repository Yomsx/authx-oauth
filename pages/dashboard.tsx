import { useEffect, useState } from 'react';
import axios from 'axios';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    axios.get('/api/me')
      .then(res => setUser(res.data))
      .catch(() => setUser(null));
  }, []);

  if (!user) return <p>🔒 Not logged in.</p>;

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <p>Email: {user.email}</p>
      <p>Joined: {new Date(user.createdAt).toLocaleDateString()}</p>

      <ul>
        <li><a href="/tokens">🔐 Tokens</a></li>
        <li><a href="/profile">👤 Profile</a></li>
        <li><a href="/activity">📈 Activity</a></li>
        <li><a href="/settings">⚙️ Settings</a></li>
        <li><a href="/refresh-status">🔁 Refresh Token Status</a></li>
        <li><a href="/logout-all">❌ Logout Everywhere</a></li>
      </ul>
    </div>
  );
}
