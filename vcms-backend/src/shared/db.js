import mysql from 'mysql2/promise';
import 'dotenv/config';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'vcms_user',
  password: process.env.DB_PASSWORD || 'vcms_pass',
  database: process.env.DB_NAME || 'vcms',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});

// Wrapper to provide pg-like results: { rows: [...], rowCount: ... }
export async function query(sql, params = []){
  const [result] = await pool.query(sql, params);
  if (Array.isArray(result)) {
    return { rows: result, rowCount: result.length };
  }
  return { rows: [], rowCount: result.affectedRows || 0, insertId: result.insertId };
}

// Runs fn in a transaction; sets session variable for staff member who acted (REG-7).
export async function tx(user, fn){
  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    if (user?.kind === 'staff') {
      await c.query('SET @app_user_id = ?', [user.id]);
    } else {
      await c.query('SET @app_user_id = NULL');
    }

    const clientWrapper = {
      async query(sql, params = []) {
        const [result] = await c.query(sql, params);
        if (Array.isArray(result)) {
          return { rows: result, rowCount: result.length };
        }
        return { rows: [], rowCount: result.affectedRows || 0, insertId: result.insertId };
      }
    };

    const r = await fn(clientWrapper);
    await c.commit();
    return r;
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    c.release();
  }
}
