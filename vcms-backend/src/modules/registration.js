// Module 1: Pet and Owner Registration (SRS 4.1)
import {Router} from 'express';
import {z} from 'zod';
import {query, tx} from '../shared/db.js';
import {allow, ROLES as R} from '../shared/auth.js';
import {h, nul, HttpError} from '../shared/util.js';

const r = Router();
const STAFF = [R.REC, R.ADMIN, R.VET, R.TECH];
const FRONT = [R.REC, R.ADMIN];

const pet = z.object({
  name: z.string().min(1),
  species: z.string().min(1),
  breed: z.string().optional(),
  sex: z.enum(['M','F']).optional(),
  dob: z.string().optional(),
  microchip: z.string().optional()
});

const client = z.object({
  name: z.string().min(1),
  phone: z.string().min(5),
  email: z.string().email().or(z.literal('')).optional(),
  address: z.string().optional()
});

const insertPet = (c, clientId, p) => c.query(
  `INSERT INTO patients(client_id, name, species, breed, sex, date_of_birth, microchip_number) VALUES(?, ?, ?, ?, ?, ?, ?)`,
  [clientId, p.name, p.species, nul(p.breed), nul(p.sex), nul(p.dob), nul(p.microchip)]
);

r.get('/clients', allow(...STAFF), h(async (req, res) => {
  const {rows} = await query(`
    SELECT c.client_id AS id, c.name, c.phone, c.email, c.address, c.status,
      COALESCE(
        (SELECT JSON_ARRAYAGG(
          JSON_OBJECT('id', p.patient_id, 'name', p.name, 'species', p.species, 'breed', p.breed, 'sex', p.sex)
        ) FROM patients p WHERE p.client_id = c.client_id AND p.status = 'active'),
        JSON_ARRAY()
      ) AS pets
    FROM clients c
    WHERE c.status = 'active'
    ORDER BY c.name
  `);
  // Ensure pets is parsed properly if returned as JSON string
  const formatted = rows.map(r => ({
    ...r,
    pets: typeof r.pets === 'string' ? JSON.parse(r.pets) : (r.pets || [])
  }));
  res.json(formatted);
}));

// REG-1, REG-2, REG-3
r.post('/clients', allow(...FRONT), h(async (req, res) => {
  const b = z.object({client, pet, confirmDuplicate: z.boolean().optional()}).parse(req.body);
  const dup = await query(
    `SELECT name FROM clients WHERE status = 'active' AND (phone = ? OR (? IS NOT NULL AND LOWER(email) = LOWER(?))) LIMIT 1`,
    [b.client.phone, nul(b.client.email), nul(b.client.email)]
  );
  if (dup.rows[0] && !b.confirmDuplicate) {
    throw new HttpError(409, `A client with this phone or email already exists: ${dup.rows[0].name}.`);
  }

  const out = await tx(req.user, async c => {
    const res = await c.query(
      `INSERT INTO clients(name, phone, email, address) VALUES(?, ?, ?, ?)`,
      [b.client.name, b.client.phone, nul(b.client.email), nul(b.client.address)]
    );
    const clientId = res.insertId;
    await insertPet(c, clientId, b.pet);
    return {id: clientId};
  });
  res.status(201).json(out);
}));

r.post('/clients/:id/pets', allow(...FRONT), h(async (req, res) => {
  await tx(req.user, c => insertPet(c, +req.params.id, pet.parse(req.body)));
  res.status(201).json({ok: true});
}));

// REG-6: deactivate, never delete
r.patch('/clients/:id/deactivate', allow(...FRONT), h(async (req, res) => {
  await tx(req.user, c => c.query(`UPDATE clients SET status = 'inactive' WHERE client_id = ?`, [+req.params.id]));
  res.json({ok: true});
}));

// REG-4
r.post('/clients/merge', allow(...FRONT), h(async (req, res) => {
  const {keepId, dropId} = z.object({keepId: z.number(), dropId: z.number()}).parse(req.body);
  await tx(req.user, async c => {
    await c.query(`UPDATE patients SET client_id = ? WHERE client_id = ?`, [keepId, dropId]);
    await c.query(`UPDATE notification_log SET client_id = ? WHERE client_id = ?`, [keepId, dropId]);
    await c.query(`UPDATE clients SET status = 'merged' WHERE client_id = ?`, [dropId]);
  });
  res.json({ok: true});
}));

// REG-5: pet owner updates own contact details
r.patch('/clients/me', allow(R.OWNER), h(async (req, res) => {
  const b = client.partial().parse(req.body);
  await query(
    `UPDATE clients SET phone = COALESCE(?, phone), email = COALESCE(?, email), address = COALESCE(?, address) WHERE client_id = ?`,
    [nul(b.phone), nul(b.email), nul(b.address), req.user.clientId]
  );
  res.json({ok: true});
}));

// Patients: staff see all; owners see only their own (SE-6)
r.get('/patients', h(async (req, res) => {
  const own = req.user.role === R.OWNER;
  const sql = `SELECT p.patient_id AS id, p.client_id AS clientId, p.name, p.species, p.breed, p.sex, c.name AS owner
    FROM patients p JOIN clients c USING(client_id) WHERE p.status = 'active' ${own ? 'AND p.client_id = ?' : ''} ORDER BY p.name`;
  const {rows} = await query(sql, own ? [req.user.clientId] : []);
  res.json(rows);
}));

// REG-7: audit trail
r.get('/audit', allow(...STAFF), h(async (req, res) => {
  const {rows} = await query(`
    SELECT DATE_FORMAT(a.changed_at, '%d %b %Y %H:%i') AS \`at\`,
      COALESCE(s.name, 'System') AS who,
      CONCAT(a.action, ' ', a.entity_type, ' #', a.entity_id,
        CASE WHEN a.entity_type = 'appointments' AND JSON_UNQUOTE(JSON_EXTRACT(a.new_data, '$.status')) IS NOT NULL
             THEN CONCAT(' (', JSON_UNQUOTE(JSON_EXTRACT(a.new_data, '$.status')), ')')
             ELSE '' END
      ) AS what
    FROM audit_log a
    LEFT JOIN staff_accounts s ON s.staff_id = a.changed_by
    ORDER BY a.audit_id DESC
    LIMIT 200
  `);
  res.json(rows);
}));

export default r;
