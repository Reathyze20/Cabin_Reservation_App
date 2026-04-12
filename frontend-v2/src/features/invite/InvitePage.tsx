import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { AvatarPicker } from '@/components/shared/AvatarPicker';
import { ColorPicker } from '@/components/shared/ColorPicker';
import cabinBg from '@/img/olivier-guillard-FKJgBUDoVC0-unsplash.jpg';

interface ValidateResponse {
  valid: boolean;
  cabinName: string;
  welcomeMessage: string | null;
  role: string;
  invitedBy: string;
  invitedByIcon: string | null;
  message?: string;
}

interface AcceptResponse {
  token: string;
  username: string;
  userId: string;
  role: string;
  color: string;
  animalIcon: string;
  cabinId: string;
  cabinName: string;
}

export function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<ValidateResponse | null>(null);
  const [step, setStep] = useState<'welcome' | 'register'>('welcome');

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    animalIcon: 'liska',
    color: '#0ea5e9'
  });
  
  const [submitting, setSubmitting] = useState(false);

  const bgStyle: React.CSSProperties = {
    backgroundImage: `url(${cabinBg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  useEffect(() => {
    async function validateToken() {
      try {
        const res = await apiClient.get<ValidateResponse>(`/invites/validate/${token}`);
        if (!res.data.valid) {
          setError(res.data.message || 'Pozvánka není platná.');
        } else {
          setInviteInfo(res.data);
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
    if (!inviteInfo) return;
    
    setSubmitting(true);
    try {
      const res = await apiClient.post<AcceptResponse>(`/invites/accept/${token}`, {
        username: formData.username,
        password: formData.password,
        email: formData.email || undefined,
        animalIcon: formData.animalIcon,
        color: formData.color
      });
      
      // Accept returns JWT directly — no separate login needed
      const { token: authToken, username, userId, role, animalIcon, cabinId } = res.data;
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
      <div className="invite-page" style={bgStyle}>
        <div style={{ textAlign: 'center' }}>
          <div className="invite-spinner" />
          <p style={{ color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>Ověřuji pozvánku…</p>
        </div>
      </div>
    );
  }

  if (error || !inviteInfo) {
    return (
      <div className="invite-page" style={bgStyle}>
        <div className="invite-card invite-card-narrow">
          <div className="invite-icon" style={{ fontSize: '2rem', color: '#dc2626' }}>×</div>
          <h2 className="invite-title">Neplatná pozvánka</h2>
          <p className="invite-text">{error}</p>
          <button className="invite-btn invite-btn-primary invite-btn-full" onClick={() => navigate('/login')}>
            Přejít na přihlášení
          </button>
        </div>
      </div>
    );
  }

  const roleLabel = inviteInfo.role === 'admin' ? 'Admin' : inviteInfo.role === 'guest' ? 'Host' : 'Člen';

  // ── Step 1: Welcome ──────────────────────────────────────────────────
  if (step === 'welcome') {
    return (
      <div className="invite-page" style={bgStyle}>
        <div className="invite-card invite-card-narrow">
          <h1 className="invite-heading" style={{ fontSize: '1.5rem' }}>
            Pozvánka na chatu
          </h1>
          <p className="invite-text" style={{ fontSize: '1.1rem', marginBottom: '8px' }}>
            <strong>{inviteInfo.invitedBy}</strong> vás zve na chatu
          </p>
          <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-text, #1a2721)', margin: '0 0 16px' }}>
            „{inviteInfo.cabinName}"
          </p>
          <span className="invite-role-badge" style={{ marginBottom: '16px', display: 'inline-block' }}>{roleLabel}</span>
          {inviteInfo.welcomeMessage && (
            <p className="invite-text invite-text-muted" style={{ marginTop: '8px', fontStyle: 'italic' }}>
              „{inviteInfo.welcomeMessage}"
            </p>
          )}
          <div style={{ marginTop: '24px' }}>
            <button
              className="invite-btn invite-btn-primary invite-btn-full"
              onClick={() => setStep('register')}
            >
              Pokračovat →
            </button>
          </div>
          <div className="invite-back-link">
            Už máte účet? <a onClick={() => navigate('/login')}>Přihlásit se</a>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Registration form ────────────────────────────────────────
  return (
    <div className="invite-page" style={bgStyle}>
      <div className="invite-card invite-card-compact">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <button
            type="button"
            className="invite-back-btn"
            onClick={() => setStep('welcome')}
            title="Zpět"
          >
            ←
          </button>
          <h2 className="invite-heading" style={{ margin: 0, fontSize: '1.15rem' }}>
            Vytvořte si účet — {inviteInfo.cabinName}
          </h2>
        </div>

        {error && <div className="invite-error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="invite-form-row">
            <div className="invite-form-group">
              <label>Přezdívka</label>
              <input 
                type="text" 
                required 
                minLength={3}
                maxLength={50}
                placeholder="Např. Tomáš"
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
                autoFocus
              />
            </div>
            <div className="invite-form-group">
              <label>Heslo</label>
              <input 
                type="password" 
                required 
                minLength={6}
                maxLength={100}
                placeholder="Min. 6 znaků"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <div className="invite-form-group">
            <label>E-mail <span className="invite-optional">(nepovinné)</span></label>
            <input 
              type="email" 
              placeholder="vas@email.cz"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="invite-form-row">
            <div className="invite-form-group" style={{ flex: '1 1 60%' }}>
              <label>Avatar</label>
              <AvatarPicker 
                value={formData.animalIcon}
                onChange={val => setFormData({ ...formData, animalIcon: val })}
                compact
              />
            </div>
            <div className="invite-form-group" style={{ flex: '1 1 35%' }}>
              <label>Barva</label>
              <ColorPicker 
                value={formData.color}
                onChange={val => setFormData({ ...formData, color: val })}
                size={26}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="invite-btn invite-btn-primary invite-btn-full"
            disabled={submitting}
          >
            {submitting ? 'Připojuji…' : 'Připojit se k chatě →'}
          </button>
        </form>
      </div>
    </div>
  );
}
