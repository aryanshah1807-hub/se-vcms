// Repositories for Module 1: Pet and Owner Registration (SRS 4.1)
import { query } from '../../shared/db.js';
import { nul } from '../../shared/util.js';

export class ClientRepository {
  async findById(id) {
    const { rows } = await query(`SELECT * FROM clients WHERE client_id = ?`, [id]);
    return rows[0] || null;
  }

  async findByPhoneOrEmail(phone, email) {
    const { rows } = await query(
      `SELECT * FROM clients WHERE status = 'active' AND (phone = ? OR (? IS NOT NULL AND LOWER(email) = LOWER(?))) LIMIT 1`,
      [phone, nul(email), nul(email)]
    );
    return rows[0] || null;
  }

  async findAllActive() {
    const { rows } = await query(`
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
    return rows.map(r => ({
      ...r,
      pets: typeof r.pets === 'string' ? JSON.parse(r.pets) : (r.pets || [])
    }));
  }

  async create(txClient, clientData) {
    const res = await txClient.query(
      `INSERT INTO clients(name, phone, email, address) VALUES(?, ?, ?, ?)`,
      [clientData.name, clientData.phone, nul(clientData.email), nul(clientData.address)]
    );
    return { client_id: res.insertId, ...clientData };
  }

  async update(clientId, data) {
    const res = await query(
      `UPDATE clients SET phone = COALESCE(?, phone), email = COALESCE(?, email), address = COALESCE(?, address) WHERE client_id = ?`,
      [nul(data.phone), nul(data.email), nul(data.address), clientId]
    );
    return res.rowCount > 0;
  }

  async deactivate(txClient, clientId) {
    const res = await txClient.query(
      `UPDATE clients SET status = 'inactive' WHERE client_id = ?`,
      [clientId]
    );
    return res.rowCount > 0;
  }

  async mergeClients(txClient, keepId, dropId) {
    await txClient.query(`UPDATE patients SET client_id = ? WHERE client_id = ?`, [keepId, dropId]);
    await txClient.query(`UPDATE notification_log SET client_id = ? WHERE client_id = ?`, [keepId, dropId]);
    await txClient.query(`UPDATE clients SET status = 'merged' WHERE client_id = ?`, [dropId]);
  }
}

export class PatientRepository {
  async findById(id) {
    const { rows } = await query(`SELECT * FROM patients WHERE patient_id = ?`, [id]);
    return rows[0] || null;
  }

  async findByClientId(clientId) {
    const { rows } = await query(
      `SELECT * FROM patients WHERE client_id = ? AND status = 'active' ORDER BY name`,
      [clientId]
    );
    return rows;
  }

  async findAllActive(ownerClientId = null) {
    const sql = `SELECT p.patient_id AS id, p.client_id AS clientId, p.name, p.species, p.breed, p.sex, c.name AS owner
      FROM patients p JOIN clients c USING(client_id) WHERE p.status = 'active' ${ownerClientId ? 'AND p.client_id = ?' : ''} ORDER BY p.name`;
    const { rows } = await query(sql, ownerClientId ? [ownerClientId] : []);
    return rows;
  }

  async create(txClient, clientId, p) {
    const res = await txClient.query(
      `INSERT INTO patients(client_id, name, species, breed, sex, date_of_birth, microchip_number) VALUES(?, ?, ?, ?, ?, ?, ?)`,
      [clientId, p.name, p.species, nul(p.breed), nul(p.sex), nul(p.dob), nul(p.microchip)]
    );
    return { patient_id: res.insertId, client_id: clientId, ...p };
  }
}

export class AuditRepository {
  async record(txClient, { entityType, entityId, action, oldData = null, newData = null, changedBy = null }) {
    const executor = txClient || { query };
    await executor.query(
      `INSERT INTO audit_log (entity_type, entity_id, action, old_data, new_data, changed_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        entityType,
        entityId,
        action,
        oldData ? JSON.stringify(oldData) : null,
        newData ? JSON.stringify(newData) : null,
        changedBy || null
      ]
    );
  }

  async getRecentAuditLogs(limit = 200) {
    const { rows } = await query(`
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
      LIMIT ?
    `, [limit]);
    return rows;
  }
}
