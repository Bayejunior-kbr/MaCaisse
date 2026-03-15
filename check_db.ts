
import Database from "better-sqlite3";
const db = new Database("smartstock.db");

try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[];
  console.log("Tables found:", tables.map(t => t.name).join(", "));
  
  for (const table of tables) {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as { count: number };
    console.log(`Table ${table.name}: ${count.count} rows`);
  }
} catch (e) {
  console.error("Error:", e.message);
}
