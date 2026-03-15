
import pg from "pg";
const { Pool } = pg;

async function testConnection() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is not set in the environment.");
    process.exit(1);
  }

  console.log("Attempting to connect to PostgreSQL...");
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const res = await pool.query("SELECT 1 as ok");
    console.log("Connection successful!", res.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error("Connection failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();
