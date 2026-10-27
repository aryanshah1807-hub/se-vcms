import { useState } from 'react';
import { api, DEMO_USERS } from './api.js';

export default function Login({ onLoginSuccess }) {
  const [tab, setTab] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regForm, setRegForm] = useState({ name: '', phone: '', email: '', address: '', password: '' });
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e) => {
    e?.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await api.login(email, password);
      onLoginSuccess(res.user);
    } catch (ex) {
      setErr(ex.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async (demoEmail) => {
    setErr(null);
    setLoading(true);
    setEmail(demoEmail);
    setPassword('password');
    try {
      const res = await api.login(demoEmail, 'password');
      onLoginSuccess(res.user);
    } catch (ex) {
      setErr(ex.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await api.registerOwner(regForm);
      onLoginSuccess(res.user);
    } catch (ex) {
      setErr(ex.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      background: 'linear-gradient(135deg, #14272b 0%, #0f3d3e 50%, #0f766e 100%)'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: '32px 28px',
        maxWidth: 500,
        width: '100%',
        boxShadow: '0 20px 40px rgba(0,0,0,0.25)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: '#0f766e',
            color: '#fff',
            fontSize: 24,
            marginBottom: 10
          }}>
            🐾
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: 24, color: '#14272b' }}>VCMS Portal</h1>
          <p style={{ margin: 0, fontSize: 14, color: '#5c6f73' }}>
            Veterinary Clinic Management System
          </p>
        </div>

        {/* Tabs: Sign In / Register as Pet Owner */}
        <div style={{
          display: 'flex',
          borderBottom: '2px solid #d5e0e1',
          marginBottom: 20
        }}>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '10px 0',
              background: 'none',
              border: 'none',
              borderBottom: tab === 'signin' ? '3px solid #0f766e' : 'none',
              fontWeight: tab === 'signin' ? 'bold' : 'normal',
              color: tab === 'signin' ? '#0f766e' : '#5c6f73',
              cursor: 'pointer',
              fontSize: 15
            }}
            onClick={() => { setTab('signin'); setErr(null); }}
          >
            Sign In
          </button>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '10px 0',
              background: 'none',
              border: 'none',
              borderBottom: tab === 'signup' ? '3px solid #0f766e' : 'none',
              fontWeight: tab === 'signup' ? 'bold' : 'normal',
              color: tab === 'signup' ? '#0f766e' : '#5c6f73',
              cursor: 'pointer',
              fontSize: 15
            }}
            onClick={() => { setTab('signup'); setErr(null); }}
          >
            Register as Pet Owner
          </button>
        </div>

        {err && (
          <div className="err" role="alert" style={{
            background: '#ffebe9',
            border: '1px solid #b4443b',
            borderRadius: 6,
            padding: '10px 12px',
            fontSize: 14,
            marginBottom: 16
          }}>
            {err}
          </div>
        )}

        {tab === 'signin' ? (
          <div>
            <form onSubmit={handleSignIn} style={{ display: 'grid', gap: 14 }}>
              <label>Email address
                <input
                  type="email"
                  required
                  placeholder="e.g. ravi@vcms.test"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </label>
              <label>Password
                <input
                  type="password"
                  required
                  placeholder="Your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </label>
              <button className="btn" disabled={loading} style={{ width: '100%', marginTop: 6, padding: '11px 0' }}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 13, fontWeight: 'bold', color: '#5c6f73', marginBottom: 10, textAlign: 'center' }}>
                ⚡ Quick Demo Access (1-Click Login)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {DEMO_USERS.map(u => (
                  <button
                    key={u.email}
                    type="button"
                    className="btn alt"
                    onClick={() => handleDemoSignIn(u.email)}
                    style={{
                      padding: '10px 8px',
                      fontSize: 13,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <strong>{u.label}</strong>
                    <span style={{ fontSize: 11, color: '#5c6f73', marginTop: 2 }}>{u.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSignUp} style={{ display: 'grid', gap: 12 }}>
            <label>Full name
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Patel"
                value={regForm.name}
                onChange={e => setRegForm({ ...regForm, name: e.target.value })}
              />
            </label>
            <label>Phone number
              <input
                type="tel"
                required
                placeholder="e.g. 9820012345"
                value={regForm.phone}
                onChange={e => setRegForm({ ...regForm, phone: e.target.value })}
              />
            </label>
            <label>Email address
              <input
                type="email"
                required
                placeholder="e.g. ramesh@mail.com"
                value={regForm.email}
                onChange={e => setRegForm({ ...regForm, email: e.target.value })}
              />
            </label>
            <label>Address
              <input
                type="text"
                placeholder="e.g. Andheri East, Mumbai"
                value={regForm.address}
                onChange={e => setRegForm({ ...regForm, address: e.target.value })}
              />
            </label>
            <label>Choose a password
              <input
                type="password"
                required
                placeholder="At least 6 characters"
                value={regForm.password}
                onChange={e => setRegForm({ ...regForm, password: e.target.value })}
              />
            </label>
            <button className="btn" disabled={loading} style={{ width: '100%', marginTop: 8, padding: '11px 0' }}>
              {loading ? 'Creating account...' : 'Create Account & Sign In'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
