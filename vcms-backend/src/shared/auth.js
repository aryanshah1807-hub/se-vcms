import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import {query} from './db.js';

const SECRET = process.env.JWT_SECRET || 'dev-secret';
export const ROLES = {
  REC: 'Receptionist',
  VET: 'Veterinarian',
  TECH: 'Veterinary Technician',
  ADMIN: 'Clinic Administrator',
  OWNER: 'Pet Owner'
};

const pick = u => ({id: u.id, name: u.name, role: u.role, kind: u.kind, clientId: u.clientId});

// 20 min token, refreshed on every request => 20 min of inactivity ends the session (SE-5)
export const sign = u => jwt.sign(pick(u), SECRET, {expiresIn: '20m'});

export async function login(email, password){
  const s = await query(
    `SELECT staff_id AS id, name, role, password_hash FROM staff_accounts WHERE LOWER(email) = LOWER(?) AND active`,
    [email]
  );
  if (s.rows[0] && await bcrypt.compare(password, s.rows[0].password_hash)){
    const u = {...s.rows[0], kind: 'staff'};
    return {token: sign(u), user: pick(u)};
  }

  const c = await query(
    `SELECT client_id AS id, name, password_hash FROM clients WHERE LOWER(email) = LOWER(?) AND status = 'active' AND password_hash IS NOT NULL`,
    [email]
  );
  if (c.rows[0] && await bcrypt.compare(password, c.rows[0].password_hash)){
    const u = {id: c.rows[0].id, name: c.rows[0].name, role: ROLES.OWNER, kind: 'client', clientId: c.rows[0].id};
    return {token: sign(u), user: pick(u)};
  }

  return null;
}

export async function registerPetOwner({ name, phone, email, address, password }){
  const existing = await query(
    `SELECT client_id FROM clients WHERE status = 'active' AND (phone = ? OR (email IS NOT NULL AND LOWER(email) = LOWER(?))) LIMIT 1`,
    [phone, email]
  );
  if (existing.rows[0]) {
    const err = new Error('A client with this phone or email already exists.');
    err.status = 409;
    throw err;
  }
  const hash = await bcrypt.hash(password, 10);
  const ins = await query(
    `INSERT INTO clients (name, phone, email, address, password_hash) VALUES (?, ?, ?, ?, ?)`,
    [name, phone, email || null, address || null, hash]
  );
  const clientId = ins.insertId;
  const u = { id: clientId, name, role: ROLES.OWNER, kind: 'client', clientId };
  return { token: sign(u), user: pick(u) };
}

export function auth(req, res, next){ // SE-2
  try {
    const u = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), SECRET);
    req.user = u;
    res.set('X-Refreshed-Token', sign(u));
    next();
  } catch {
    res.status(401).json({message: 'Your session has expired. Sign in again.'});
  }
}

export const allow = (...roles) => (req, res, next) => // SE-4 role-based access
  roles.includes(req.user.role) ? next() : res.status(403).json({message: 'Your role cannot do this.'});
