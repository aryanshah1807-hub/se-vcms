import { useState, useEffect, useCallback } from 'react';
import { api } from './api.js';
import Registration from './Registration.jsx';
import Appointments from './Appointments.jsx';
import PetOwnerProfile from './PetOwnerProfile.jsx';
import Login from './Login.jsx';

export default function App() {
  const [user, setUser] = useState(api.getUser());
  const [tab, setTab] = useState(user?.role === 'Pet Owner' ? 'profile' : 'reg');
  const [data, setData] = useState({ clients: [], patients: [], vets: [], appts: [], audit: [], notes: [] });

  const load = useCallback(async () => {
    if (!api.getUser()) return;
    try {
      const [clients, patients, vets, appts, audit, notes] = await Promise.all([
        api.clients().catch(() => []),
        api.patients().catch(() => []),
        api.vets().catch(() => []),
        api.appts().catch(() => []),
        api.audit().catch(() => []),
        api.notes().catch(() => [])
      ]);
      setData({
        clients: clients || [],
        patients: patients || [],
        vets: vets || [],
        appts: appts || [],
        audit: audit || [],
        notes: notes || []
      });
    } catch (e) {
      console.error('Failed to load VCMS data:', e);
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setData({ clients: [], patients: [], vets: [], appts: [], audit: [], notes: [] });
  };

  if (!user) {
    return <Login onLoginSuccess={(loggedInUser) => {
      setUser(loggedInUser);
      setTab(loggedInUser.role === 'Pet Owner' ? 'profile' : 'reg');
    }} />;
  }

  const role = user.role;
  const staff = role !== 'Pet Owner';
  const isVet = role === 'Veterinarian';

  return (
    <>
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🐾</span>
          <h1 style={{ margin: 0, fontSize: 20 }}>VCMS</h1>
        </div>

        <nav>
          {staff && !isVet && (
            <button className={tab === 'reg' ? 'on' : ''} onClick={() => setTab('reg')}>
              Clients and pets
            </button>
          )}
          {!staff && (
            <button className={tab === 'profile' ? 'on' : ''} onClick={() => setTab('profile')}>
              My profile and pets
            </button>
          )}
          <button className={tab === 'apt' ? 'on' : ''} onClick={() => setTab('apt')}>
            Appointments
          </button>
          {staff && !isVet && (
            <button className={tab === 'log' ? 'on' : ''} onClick={() => setTab('log')}>
              Activity log
            </button>
          )}
          <button className={tab === 'note' ? 'on' : ''} onClick={() => setTab('note')}>
            Notifications
          </button>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'right', fontSize: 13, color: '#bcd0d2' }}>
            <span style={{ color: '#fff', fontWeight: 600 }}>{user.name}</span>
            <br />
            <span style={{ opacity: 0.85 }}>{user.role}</span>
          </div>
          <button
            type="button"
            className="btn alt"
            onClick={handleLogout}
            style={{
              padding: '6px 12px',
              fontSize: 13,
              borderRadius: 6,
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.25)'
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <main>
        {tab === 'reg' && staff && !isVet && (
          <Registration data={data} role={role} reload={load} />
        )}
        {tab === 'profile' && !staff && (
          <PetOwnerProfile data={data} reload={load} />
        )}
        {tab === 'apt' && (
          <Appointments data={data} role={role} reload={load} />
        )}
        {tab === 'log' && staff && !isVet && (
          <Table
            title="Activity log (REG-7)"
            cols={['When', 'Who', 'What']}
            rows={data.audit.map(a => [a.at, a.who, a.what])}
          />
        )}
        {tab === 'note' && (
          <Table
            title="Notifications sent (CI-1, CI-2)"
            cols={['When', 'Channel', 'Message', 'Status']}
            rows={data.notes.map(n => [n.at, n.channel, n.msg, n.status])}
          />
        )}
      </main>
    </>
  );
}

function Table({ title, cols, rows }) {
  return (
    <section>
      <h2>{title}</h2>
      {rows.length ? (
        <table>
          <thead>
            <tr>
              {cols.map(c => <th key={c}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => <td key={j}>{c}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty">Nothing here yet.</div>
      )}
    </section>
  );
}
