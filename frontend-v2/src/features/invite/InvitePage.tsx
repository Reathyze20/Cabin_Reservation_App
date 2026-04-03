import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { AvatarPicker } from '@/components/shared/AvatarPicker';
import { ColorPicker } from '@/components/shared/ColorPicker';

export function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cabinInfo, setCabinInfo] = useState<{ name: string; inviterUsername: string } | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    animalIcon: 'liska',
    color: '#0ea5e9'
  });
  
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function validateToken() {
      try {
        const res = await apiClient.get(`/invites/validate/${token}`);
        if (!res.data.valid) {
          setError(res.data.message || 'Pozvánka není platná.');
        } else {
          setCabinInfo(res.data.cabin);
        }
      } catch (err: unknown) {
        const axiosMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
        setError(axiosMsg || 'Neplatný nebo expirovaný odkaz.');
      } finally {
        setLoading(false);
      }
    }
    
    if (token) validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cabinInfo) return;
    
    setSubmitting(true);
    try {
      // 1. Zaregistrovat / připojit přes invite endpoint
      await apiClient.post(`/invites/accept/${token}`, {
        username: formData.username,
        password: formData.password,
        animalIcon: formData.animalIcon,
        color: formData.color
      });
      
      // 2. Přihlásit se s novými credentials
      const loginRes = await apiClient.post('/login', {
        username: formData.username,
        password: formData.password,
      });
      
      const { token: authToken, username, userId, role, animalIcon, cabinId } = loginRes.data;
      login({ token: authToken, username, userId, role, animalIcon, cabinId, remember: true });
      navigate('/dashboard');
    } catch (err: unknown) {
      const axiosMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(axiosMsg || 'Chyba při registraci.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="invite-page p-6 max-w-md mx-auto mt-10">
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p>Ověřuji pozvánku...</p>
        </div>
      </div>
    );
  }

  if (error || !cabinInfo) {
    return (
      <div className="invite-page p-6 max-w-md mx-auto mt-10">
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
          <h2 style={{ marginBottom: '1rem' }}>Neplatná pozvánka</h2>
          <p style={{ color: 'var(--color-text-light)', marginBottom: '2rem' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/login')}>
            Přejít na přihlášení
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="invite-page p-6 max-w-md mx-auto mt-10">
      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✉️</div>
          <h2>Pozvánka na chatu</h2>
          <p style={{ color: 'var(--color-text-light)', marginTop: '0.5rem' }}>
            Uživatel <strong>{cabinInfo.inviterUsername}</strong> vás zve na chatu <strong>{cabinInfo.name}</strong>.
          </p>
        </div>

        <form id="invite-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Zvolte si přezdívku</label>
            <input 
              type="text" 
              name="username" 
              required 
              placeholder="Např. Tomáš"
              value={formData.username}
              onChange={e => setFormData({ ...formData, username: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Heslo (pro budoucí přihlášení)</label>
            <input 
              type="password" 
              name="password" 
              required 
              minLength={6} 
              placeholder="Min. 6 znaků"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Zvolte si avatara (zvíře)</label>
            <AvatarPicker 
              value={formData.animalIcon}
              onChange={val => setFormData({ ...formData, animalIcon: val })}
            />
          </div>

          <div className="form-group">
            <label>Zvolte si barvu</label>
            <ColorPicker 
              value={formData.color}
              onChange={val => setFormData({ ...formData, color: val })}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={submitting}
          >
            {submitting ? 'Připojuji...' : 'Připojit se k chatě'}
          </button>
        </form>
      </div>
    </div>
  );
}
