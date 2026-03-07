const { Pool } = require('pg');
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'helpdesk',
    user: 'helpdesk_user',
    password: 'helpdesk_pass'
});

async function test() {
    try {
        const volumeQuery = `
      WITH RECURSIVE dates AS (
        SELECT CURRENT_DATE - INTERVAL '6 days' AS date
        UNION ALL
        SELECT date + INTERVAL '1 day'
        FROM dates
        WHERE date < CURRENT_DATE
      )
      SELECT 
        to_char(d.date, 'Mon DD') as date,
        COUNT(t.id) as tickets
      FROM dates d
      LEFT JOIN tickets t ON DATE(t.created_at) = d.date 
      GROUP BY d.date
      ORDER BY d.date
    `;
        const res = await pool.query(volumeQuery);
        console.log("SUCCESS:", res.rows);
    } catch (e) {
        console.error('SQL ERROR:', e);
    }
    pool.end();
}
test();
