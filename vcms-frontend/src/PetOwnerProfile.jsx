import { useState, useEffect } from 'react';
import { api } from './api.js';

const blankPet = { name: '', species: 'Dog', breed: '', sex: 'M', dob: '', microchip: '' };

export default function PetOwnerProfile({ data, reload }) {
  const [profile, setProfile] = useState({ name: '', phone: '', email: '', address: '', pets: [] });
  const [petForm, setPetForm] = useState(blankPet);
  const [profileMsg, setProfileMsg] = useState(null);
  const [petMsg, setPetMsg] = useState(null);

  useEffect(() => {
    api.myProfile().then(p => {
      if (p) {
        setProfile({
          name: p.name || '',
          phone: p.phone || '',
          email: p.email || '',
          address: p.address || '',
          pets: p.pets || []
        });
      }
    }).catch(console.error);
  }, [data.patients]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg(null);
    try {
      await api.updateProfile({
        phone: profile.phone,
        email: profile.email,
        address: profile.address
      });
      setProfileMsg({ ok: 'Contact details updated successfully (REG-5).' });
      reload();
    } catch (err) {
      setProfileMsg({ err: err.message });
    }
  };

  const registerPet = async (e) => {
    e.preventDefault();
    setPetMsg(null);
    try {
      await api.addMyPet(petForm);
      setPetForm(blankPet);
      setPetMsg({ ok: `Pet "${petForm.name}" registered successfully!` });
      reload();
    } catch (err) {
      setPetMsg({ err: err.message });
    }
  };

  const setPet = (k) => (e) => setPetForm({ ...petForm, [k]: e.target.value });
  const setProf = (k) => (e) => setProfile({ ...profile, [k]: e.target.value });

  return (
    <>
      <section>
        <h2>Register a new pet</h2>
        <form onSubmit={registerPet}>
          <div className="grid">
            <label>Pet name
              <input type="text" required value={petForm.name} onChange={setPet('name')} placeholder="e.g. Charlie" />
            </label>
            <label>Species
              <select value={petForm.species} onChange={setPet('species')}>
                {['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'].map(s => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label>Breed
              <input type="text" value={petForm.breed} onChange={setPet('breed')} placeholder="e.g. Beagle" />
            </label>
            <label>Sex
              <select value={petForm.sex} onChange={setPet('sex')}>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </label>
            <label>Date of birth
              <input type="date" value={petForm.dob} onChange={setPet('dob')} />
            </label>
            <label>Microchip number
              <input type="text" value={petForm.microchip} onChange={setPet('microchip')} placeholder="e.g. MC9821" />
            </label>
          </div>
          {petMsg?.err && <div className="err" role="alert">{petMsg.err}</div>}
          {petMsg?.ok && <div className="ok">{petMsg.ok}</div>}
          <button className="btn" style={{ marginTop: 12 }}>Register pet</button>
        </form>
      </section>

      <section>
        <h2>My registered pets ({data.patients.length})</h2>
        {data.patients.length ? (
          <table>
            <thead>
              <tr>
                <th>Pet name</th>
                <th>Species</th>
                <th>Breed</th>
                <th>Sex</th>
              </tr>
            </thead>
            <tbody>
              {data.patients.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong><br /><small>ID #{p.id}</small></td>
                  <td>{p.species}</td>
                  <td>{p.breed || '—'}</td>
                  <td>{p.sex === 'M' ? 'Male' : p.sex === 'F' ? 'Female' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">No pets registered yet. Add your first pet above!</div>
        )}
      </section>

      <section>
        <h2>My contact details (REG-5)</h2>
        <form onSubmit={saveProfile}>
          <div className="grid">
            <label>Owner name
              <input type="text" disabled value={profile.name} style={{ background: '#f5f7f8' }} />
            </label>
            <label>Phone
              <input type="tel" required value={profile.phone} onChange={setProf('phone')} />
            </label>
            <label>Email
              <input type="email" value={profile.email} onChange={setProf('email')} />
            </label>
            <label>Address
              <input type="text" value={profile.address} onChange={setProf('address')} />
            </label>
          </div>
          {profileMsg?.err && <div className="err" role="alert">{profileMsg.err}</div>}
          {profileMsg?.ok && <div className="ok">{profileMsg.ok}</div>}
          <button className="btn" style={{ marginTop: 12 }}>Update contact details</button>
        </form>
      </section>
    </>
  );
}
