// Live API connecting to the Express + MySQL backend
export const USE_MOCK = false;
export const TRANSITIONS = {
  Requested: ['Scheduled', 'Cancelled'],
  Scheduled: ['Checked-In', 'Cancelled'],
  'Checked-In': ['In-Progress'],
  'In-Progress': ['Completed'],
  Completed: [],
  Cancelled: []
};

const BASE = import.meta.env.VITE_API_URL || '/api';

export const DEMO_USERS = [
  { label: 'Receptionist', email: 'ravi@vcms.test', desc: 'Ravi (Register clients & pets, book, check-in)' },
  { label: 'Pet Owner', email: 'meera@mail.com', desc: 'Meera (My pets, request appointments)' },
  { label: 'Veterinarian', email: 'rao@vcms.test', desc: 'Dr. Rao (Start/complete consultations)' },
  { label: 'Clinic Administrator', email: 'admin@vcms.test', desc: 'Anita (Full administration & audit)' }
];

let token = localStorage.getItem('vcms_token') || null;
let currentUser = JSON.parse(localStorage.getItem('vcms_user') || 'null');
const jsonHeaders = { 'Content-Type': 'application/json' };

async function http(method, path, body) {
  if (!token) throw { code: 401, message: 'Please sign in to continue.' };
  const r = await fetch(BASE + path, {
    method,
    headers: { ...jsonHeaders, Authorization: 'Bearer ' + token },
    body: body ? JSON.stringify(body) : undefined
  });
  const fresh = r.headers.get('X-Refreshed-Token');
  if (fresh) {
    token = fresh;
    localStorage.setItem('vcms_token', token);
  }
  const j = await r.json().catch(() => null);
  if (!r.ok) {
    if (r.status === 401) {
      api.logout();
    }
    throw { code: r.status, message: j?.message || 'Request failed.' };
  }
  return j;
}

const isOwner = () => currentUser?.role === 'Pet Owner';

export const api = {
  getUser: () => currentUser,

  async login(email, password) {
    const r = await fetch(BASE + '/auth/login', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email, password })
    });
    const j = await r.json();
    if (!r.ok) throw { code: r.status, message: j?.message || 'Login failed.' };
    token = j.token;
    currentUser = j.user;
    localStorage.setItem('vcms_token', token);
    localStorage.setItem('vcms_user', JSON.stringify(currentUser));
    return j;
  },

  async registerOwner(data) {
    const r = await fetch(BASE + '/auth/register-owner', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(data)
    });
    const j = await r.json();
    if (!r.ok) throw { code: r.status, message: j?.message || 'Registration failed.' };
    token = j.token;
    currentUser = j.user;
    localStorage.setItem('vcms_token', token);
    localStorage.setItem('vcms_user', JSON.stringify(currentUser));
    return j;
  },

  logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('vcms_token');
    localStorage.removeItem('vcms_user');
  },

  clients: async () => isOwner() ? [] : http('GET', '/clients'),
  patients: () => http('GET', '/patients'),
  vets: () => http('GET', '/vets'),
  appts: () => http('GET', '/appointments'),
  audit: async () => isOwner() ? [] : http('GET', '/audit'),
  notes: async () => (await http('GET', '/notifications')).map(n => ({ ...n, channel: n.channel })),
  myProfile: () => http('GET', '/clients/me'),
  updateProfile: (data) => http('PATCH', '/clients/me', data),
  addMyPet: (pet) => http('POST', '/clients/me/pets', pet),
  registerClient: ({ client, pet, confirm }) => http('POST', '/clients', { client, pet, confirmDuplicate: !!confirm }),
  addPet: (clientId, pet) => http('POST', `/clients/${clientId}/pets`, pet),
  deactivateClient: id => http('PATCH', `/clients/${id}/deactivate`),
  mergeClients: (keepId, dropId) => http('POST', '/clients/merge', { keepId, dropId }),
  slots: (vetId, date) => (vetId && date) ? http('GET', `/vets/${vetId}/slots?date=${date}`) : Promise.resolve([]),
  book: ({ patientId, vetId, service, date, time }) => http('POST', '/appointments', { patientId: +patientId, vetId: +vetId, service, date, time }),
  setStatus: (id, status, user, reason) => http('PATCH', `/appointments/${id}/status`, { status, reason }),
  reschedule: (id, date, time) => http('PATCH', `/appointments/${id}/reschedule`, { date, time }),
};
