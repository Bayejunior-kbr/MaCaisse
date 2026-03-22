import { GoogleGenAI } from "@google/genai";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import multer from "multer";
import fs from "fs";
import http from "http";
import pg from "pg";
import { AsyncLocalStorage } from 'async_hooks';

import nodemailer from "nodemailer";

// Fix BigInt serialization for JSON.stringify
(BigInt.prototype as any).toJSON = function() {
  const num = Number(this);
  return Number.isSafeInteger(num) ? num : this.toString();
};

console.log("[Server] Initializing module...");
const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "public", "uploads");
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {
  console.warn("Could not create uploads directory (might be read-only):", e);
}

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Seuls les fichiers images (jpeg, jpg, png, webp, gif) sont autorisés."));
  }
});

// Database Initialization
const dbUrl = process.env.SUPABASE_URL || 
              process.env.DATABASE_URL || 
              process.env.POSTGRES_URL || 
              process.env.POSTGRES_URL_NON_POOLING ||
              process.env.STORAGE_URL;

// Support for individual PG environment variables
const pgConfig: any = {
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000, // Increased to 10s for slower connections
  idleTimeoutMillis: 30000,
  max: 10,
};

if (dbUrl) {
  pgConfig.connectionString = dbUrl;
} else {
  // Fallback to individual variables or Supabase defaults provided by user
  // Prioritize Vercel Postgres variables if they exist
  pgConfig.host = process.env.POSTGRES_HOST || process.env.STORAGE_HOST || process.env.PGHOST || process.env.DB_HOST || "db.gidymhffxqodmviqojwg.supabase.co";
  pgConfig.port = parseInt(process.env.POSTGRES_PORT || process.env.STORAGE_PORT || process.env.PGPORT || process.env.DB_PORT || "5432");
  pgConfig.database = process.env.POSTGRES_DATABASE || process.env.STORAGE_DATABASE || process.env.PGDATABASE || process.env.DB_NAME || "postgres";
  pgConfig.user = process.env.POSTGRES_USER || process.env.STORAGE_USER || process.env.PGUSER || process.env.DB_USER || "postgres";
  pgConfig.password = process.env.POSTGRES_PASSWORD || process.env.STORAGE_PASSWORD || process.env.PGPASSWORD || process.env.DB_PASSWORD;
}

const isPostgres = !!(pgConfig.connectionString || (pgConfig.host && pgConfig.password));

// Email Transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER || "kobarbayedame6@gmail.com",
    pass: process.env.EMAIL_PASS || "vncb yyuw wrpt ofrm",
  },
});

// Verify SMTP connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("[Email] SMTP Connection Error:", error.message);
  } else {
    console.log("[Email] SMTP Server is ready to take our messages");
  }
});

const sendEmail = async (to: string, subject: string, text: string) => {
  console.log(`[Email Debug] To: ${to}, Subject: ${subject}, Body: ${text}`);
  try {
    await transporter.sendMail({
      from: `"ShopMaster" <kobarbayedame6@gmail.com>`,
      to,
      subject,
      text,
    });
    console.log(`[Email] Sent to ${to}`);
  } catch (error) {
    console.error("[Email] Error sending email:", error);
    throw new Error("Erreur lors de l'envoi de l'email.");
  }
};

console.log("[Server] Database configuration:", { 
  mode: isPostgres ? "PostgreSQL" : "SQLite",
  hasUrl: !!dbUrl,
  hasHost: !!pgConfig.host,
  hasUser: !!pgConfig.user,
  hasDb: !!pgConfig.database,
  hasPassword: !!pgConfig.password,
  env: process.env.NODE_ENV,
  isVercel: !!process.env.VERCEL
});

if (process.env.VERCEL && !isPostgres) {
  console.error("[DB] CRITICAL: You are running on Vercel but no PostgreSQL database is connected.");
  console.error("[DB] ACTION REQUIRED: Go to the 'Storage' tab in Vercel, create a 'Postgres' database, and click 'Connect'.");
}

if (isPostgres && !pgConfig.connectionString && !pgConfig.password) {
  console.warn("[DB] WARNING: PostgreSQL mode detected but no password provided. Connection will likely fail.");
}

let sqliteDb: any;
let pool: any;

let dbInitPromise: Promise<void> | null = null;
let dbInitialized = false;

const getSqliteDb = () => {
  if (isPostgres) return null;
  if (!sqliteDb) {
    try {
      if (process.env.VERCEL) {
        throw new Error("SQLite is not supported in this environment. Please configure DATABASE_URL for PostgreSQL.");
      }
      // Lazy load better-sqlite3 to avoid crashes on environments where it's not supported (like Vercel)
      // if we are actually using PostgreSQL.
      const Database = require("better-sqlite3");
      sqliteDb = new Database("smartstock.db");
      sqliteDb.pragma('foreign_keys = ON');
    } catch (err: any) {
      console.error("Failed to initialize SQLite:", err.message);
      throw new Error("SQLite is not supported in this environment. Please configure DATABASE_URL for PostgreSQL.");
    }
  }
  return sqliteDb;
};

if (isPostgres) {
  console.log(`[DB] Using PostgreSQL at ${pgConfig.host || 'connection string'}`);
  pool = new Pool(pgConfig);
  
  pool.on('error', (err: any) => {
    console.error('Unexpected error on idle client', err);
  });
} else {
  console.log("Using SQLite database");
  if (process.env.VERCEL) {
    console.error("❌ CRITICAL: Running on Vercel but DATABASE_URL is missing! SQLite will not work correctly.");
  } else if (process.env.NODE_ENV === 'production') {
    console.warn("⚠️ WARNING: Running SQLite in production. Data will be lost on restart.");
  }
  // Use lazy loader to avoid crashes if better-sqlite3 is not available
  try {
    getSqliteDb();
  } catch (e) {
    console.error("SQLite initialization failed during startup.");
  }
}

const transactionStorage = new AsyncLocalStorage<any>();

const db = {
  get: async (sql: string, ...params: any[]) => {
    const actualParams = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
    const client = transactionStorage.getStore();
    
    if (isPostgres) {
      let count = 0;
      const pgSql = sql.replace(/\?/g, () => `$${++count}`);
      try {
        const res = await (client || pool).query(pgSql, actualParams.map(p => p === undefined ? null : p));
        return res.rows[0];
      } catch (err: any) {
        console.error("Postgres Get Error:", { sql: pgSql, params: actualParams, error: err.message });
        throw err;
      }
    } else {
      const sdb = getSqliteDb();
      return sdb.prepare(sql).get(...actualParams);
    }
  },
  all: async (sql: string, ...params: any[]) => {
    const actualParams = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
    const client = transactionStorage.getStore();

    if (isPostgres) {
      let count = 0;
      const pgSql = sql.replace(/\?/g, () => `$${++count}`);
      try {
        const res = await (client || pool).query(pgSql, actualParams.map(p => p === undefined ? null : p));
        return res.rows;
      } catch (err: any) {
        console.error("Postgres All Error:", { sql: pgSql, params: actualParams, error: err.message });
        throw err;
      }
    } else {
      const sdb = getSqliteDb();
      return sdb.prepare(sql).all(...actualParams);
    }
  },
  run: async (sql: string, ...params: any[]) => {
    const actualParams = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
    const client = transactionStorage.getStore();

    if (isPostgres) {
      let count = 0;
      let pgSql = sql.replace(/\?/g, () => `$${++count}`);
      if (pgSql.trim().toUpperCase().startsWith("INSERT") && !pgSql.toUpperCase().includes("RETURNING")) {
        pgSql += " RETURNING *";
      }
      try {
        return await (client || pool).query(pgSql, actualParams.map(p => p === undefined ? null : p));
      } catch (err: any) {
        if (!err.message.includes("unique constraint") && !err.message.includes("UNIQUE constraint")) {
          console.error("Postgres Query Error:", { sql: pgSql, params: actualParams, error: err.message });
        }
        throw err;
      }
    } else {
      const sdb = getSqliteDb();
      return sdb.prepare(sql).run(...actualParams);
    }
  },
  exec: async (sql: string) => {
    const client = transactionStorage.getStore();
    if (isPostgres) {
      return await (client || pool).query(sql);
    } else {
      const sdb = getSqliteDb();
      return sdb.exec(sql);
    }
  },
  transaction: async (fn: () => Promise<void>) => {
    if (isPostgres) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await transactionStorage.run(client, async () => {
          await fn();
        });
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } else {
      const sdb = getSqliteDb();
      sdb.exec('BEGIN');
      try {
        await fn();
        sdb.exec('COMMIT');
      } catch (e) {
        sdb.exec('ROLLBACK');
        throw e;
      }
    }
  }
};

// Initialize Database Tables
const initDb = async () => {
  if (dbInitialized) return;
  
  console.log(`[DB] Starting initialization... Mode: ${isPostgres ? 'PostgreSQL' : 'SQLite'}`);
  
  if (isPostgres) {
    if (!pool) {
      throw new Error("PostgreSQL pool not initialized. Check your environment variables (DATABASE_URL or SUPABASE_URL).");
    }
    try {
      console.log("[DB] Testing PostgreSQL connection...");
      const client = await pool.connect();
      console.log("[DB] PostgreSQL connection successful");
      client.release();
    } catch (err: any) {
      console.error("[DB] CRITICAL: Failed to connect to PostgreSQL:", err.message);
      dbInitPromise = null;
      throw new Error(`Database connection failed: ${err.message}. Verify your DATABASE_URL and Supabase status.`);
    }
  } else if (process.env.VERCEL) {
    console.error("[DB] CRITICAL: SQLite is not supported on Vercel. You MUST set DATABASE_URL or SUPABASE_URL in Vercel project settings.");
    throw new Error("SQLite not supported on Vercel. Please configure a PostgreSQL database (e.g., Supabase).");
  }

  try {
    console.log("[DB] Checking for existing tables...");
    const tableExists = await db.get(isPostgres 
      ? "SELECT 1 FROM information_schema.tables WHERE table_name = 'shops' AND table_schema = 'public' LIMIT 1" 
      : "SELECT 1 FROM sqlite_master WHERE type='table' AND name='shops'");
    
    console.log(`[DB] Table 'shops' exists: ${!!tableExists}`);

    const schema = `
      -- Schema initialization
      CREATE TABLE IF NOT EXISTS verification_codes (
        id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        expires_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} NOT NULL,
        used INTEGER DEFAULT 0,
        created_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS shops (
        id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
        name TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        plan TEXT DEFAULT 'free',
        logo_url TEXT,
        theme TEXT DEFAULT 'light',
        language TEXT DEFAULT 'fr',
        currency TEXT DEFAULT 'FCFA',
        receipt_footer TEXT,
        show_tax INTEGER DEFAULT 0,
        sms_enabled INTEGER DEFAULT 0,
        whatsapp_enabled INTEGER DEFAULT 0,
        notification_template TEXT,
        status TEXT DEFAULT 'active',
        is_signaled INTEGER DEFAULT 0,
        subscription_expires_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'},
        has_ai_features INTEGER DEFAULT 0,
        created_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
        shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'employee',
        created_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categories (
        id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
        shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        name TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS suppliers (
        id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
        shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        contact_name TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        created_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
        shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        barcode TEXT,
        image_url TEXT,
        purchase_price REAL NOT NULL,
        sale_price REAL NOT NULL,
        quantity INTEGER DEFAULT 0,
        min_quantity INTEGER DEFAULT 5,
        created_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS customers (
        id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
        shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        total_debt REAL DEFAULT 0,
        created_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sales (
        id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
        shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        total_amount REAL NOT NULL,
        total_profit REAL NOT NULL,
        tax_amount REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        payment_method TEXT DEFAULT 'cash',
        payment_status TEXT DEFAULT 'paid',
        amount_paid REAL DEFAULT 0,
        created_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sale_items (
        id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
        sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        product_name TEXT,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        unit_profit REAL NOT NULL,
        total_price REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS customer_payments (
        id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
        shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount REAL NOT NULL,
        payment_method TEXT DEFAULT 'cash',
        notes TEXT,
        created_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
        shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS subscription_requests (
        id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
        shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        plan TEXT NOT NULL,
        duration_months INTEGER DEFAULT 1,
        payment_method TEXT,
        phone_number TEXT,
        transaction_ref TEXT,
        status TEXT DEFAULT 'pending',
        created_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
        shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        date ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP,
        created_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        created_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS platform_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS broadcasts (
        id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'SYSTEM',
        target_shop_id INTEGER REFERENCES shops(id) ON DELETE SET NULL,
        created_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    try {
      await db.exec(schema);
      console.log("[DB] Database schema ensured.");
    } catch (schemaErr: any) {
      console.error("[DB] Failed to execute schema:", schemaErr.message);
      throw new Error(`Schema initialization failed: ${schemaErr.message}`);
    }

    if (!tableExists) {
      console.log("[DB] No existing tables found. Initializing default data...");
    }
  } catch (e: any) {
    console.error("[DB] Initialization error:", e.message);
    throw e;
  }

  // Migration for new columns - only run if needed
  try {
    if (isPostgres) {
      const migrations = [
        { table: "shops", column: "show_tax", type: "INTEGER DEFAULT 0" },
        { table: "shops", column: "sms_enabled", type: "INTEGER DEFAULT 0" },
        { table: "shops", column: "whatsapp_enabled", type: "INTEGER DEFAULT 0" },
        { table: "shops", column: "notification_template", type: "TEXT" },
        { table: "shops", column: "status", type: "TEXT DEFAULT 'active'" },
        { table: "shops", column: "is_signaled", type: "INTEGER DEFAULT 0" },
        { table: "shops", column: "subscription_expires_at", type: "TIMESTAMP" },
        { table: "shops", column: "has_ai_features", type: "INTEGER DEFAULT 0" },
        { table: "shops", column: "address", type: "TEXT" },
        { table: "shops", column: "phone", type: "TEXT" },
        { table: "sales", column: "discount_amount", type: "REAL DEFAULT 0" },
        { table: "products", column: "category_id", type: "INTEGER REFERENCES categories(id) ON DELETE SET NULL" },
        { table: "products", column: "barcode", type: "TEXT" },
        { table: "products", column: "image_url", type: "TEXT" },
        { table: "products", column: "min_quantity", type: "INTEGER DEFAULT 5" },
        { table: "products", column: "supplier_id", type: "INTEGER REFERENCES suppliers(id) ON DELETE SET NULL" },
        { table: "sales", column: "total_profit", type: "REAL DEFAULT 0" },
        { table: "sales", column: "tax_amount", type: "REAL DEFAULT 0" },
        { table: "sale_items", column: "unit_profit", type: "REAL DEFAULT 0" },
        { table: "sales", column: "user_id", type: "INTEGER REFERENCES users(id) ON DELETE CASCADE" },
        { table: "sales", column: "customer_id", type: "INTEGER REFERENCES customers(id) ON DELETE SET NULL" },
        { table: "sales", column: "payment_method", type: "TEXT DEFAULT 'cash'" },
        { table: "sales", column: "amount_paid", type: "REAL DEFAULT 0" },
        { table: "sales", column: "payment_status", type: "TEXT DEFAULT 'paid'" },
        { table: "customers", column: "total_debt", type: "REAL DEFAULT 0" },
        { table: "customers", column: "phone", type: "TEXT" },
        { table: "customers", column: "email", type: "TEXT" },
        { table: "customers", column: "address", type: "TEXT" },
        { table: "subscription_requests", column: "duration_months", type: "INTEGER DEFAULT 1" },
        { table: "subscription_requests", column: "payment_method", type: "TEXT" },
        { table: "subscription_requests", column: "phone_number", type: "TEXT" },
        { table: "subscription_requests", column: "transaction_ref", type: "TEXT" },
        { table: "sale_items", column: "product_name", type: "TEXT" },
      ];

      // Get all existing columns in one query
      const tables = [...new Set(migrations.map(m => m.table))];
      const existingColsRes = await pool.query(`
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = ANY($1::text[])
      `, [tables]);
      
      const existingCols = new Set(existingColsRes.rows.map((r: any) => `${r.table_name}.${r.column_name}`));

      for (const m of migrations) {
        if (!existingCols.has(`${m.table}.${m.column}`)) {
          console.log(`[DB] Adding missing column ${m.column} to ${m.table}`);
          try {
            await pool.query(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.type}`);
          } catch (e: any) {
            console.warn(`[DB] Failed to add column ${m.column} to ${m.table}:`, e.message);
          }
        }
      }
    } else {
      const sqliteMigrations = [
        "ALTER TABLE shops ADD COLUMN show_tax INTEGER DEFAULT 0",
        "ALTER TABLE shops ADD COLUMN sms_enabled INTEGER DEFAULT 0",
        "ALTER TABLE shops ADD COLUMN whatsapp_enabled INTEGER DEFAULT 0",
        "ALTER TABLE shops ADD COLUMN notification_template TEXT",
        "ALTER TABLE shops ADD COLUMN status TEXT DEFAULT 'active'",
        "ALTER TABLE shops ADD COLUMN is_signaled INTEGER DEFAULT 0",
        "ALTER TABLE shops ADD COLUMN subscription_expires_at DATETIME",
        "ALTER TABLE shops ADD COLUMN has_ai_features INTEGER DEFAULT 0",
        "ALTER TABLE shops ADD COLUMN address TEXT",
        "ALTER TABLE shops ADD COLUMN phone TEXT",
        "ALTER TABLE sales ADD COLUMN discount_amount REAL DEFAULT 0",
        "ALTER TABLE products ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL",
        "ALTER TABLE products ADD COLUMN barcode TEXT",
        "ALTER TABLE products ADD COLUMN image_url TEXT",
        "ALTER TABLE products ADD COLUMN min_quantity INTEGER DEFAULT 5",
        "ALTER TABLE products ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL",
        "ALTER TABLE sales ADD COLUMN total_profit REAL DEFAULT 0",
        "ALTER TABLE sales ADD COLUMN tax_amount REAL DEFAULT 0",
        "ALTER TABLE sale_items ADD COLUMN unit_profit REAL DEFAULT 0",
        "ALTER TABLE sales ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE",
        "ALTER TABLE sales ADD COLUMN customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL",
        "ALTER TABLE sales ADD COLUMN payment_method TEXT DEFAULT 'cash'",
        "ALTER TABLE sales ADD COLUMN amount_paid REAL DEFAULT 0",
        "ALTER TABLE sales ADD COLUMN payment_status TEXT DEFAULT 'paid'",
        "ALTER TABLE customers ADD COLUMN total_debt REAL DEFAULT 0",
        "ALTER TABLE customers ADD COLUMN phone TEXT",
        "ALTER TABLE customers ADD COLUMN email TEXT",
        "ALTER TABLE customers ADD COLUMN address TEXT",
        "ALTER TABLE subscription_requests ADD COLUMN duration_months INTEGER DEFAULT 1",
        "ALTER TABLE subscription_requests ADD COLUMN payment_method TEXT",
        "ALTER TABLE subscription_requests ADD COLUMN phone_number TEXT",
        "ALTER TABLE subscription_requests ADD COLUMN transaction_ref TEXT",
        "ALTER TABLE sale_items ADD COLUMN product_name TEXT",
      ];
      for (const sql of sqliteMigrations) {
        try { 
          // For ALTER TABLE ADD COLUMN, we can check if it already exists to avoid errors
          if (sql.includes("ADD COLUMN")) {
            const parts = sql.split(" ");
            const tableName = parts[2];
            const columnName = parts[5];
            const info = await db.all(`PRAGMA table_info(${tableName})`);
            if (info.some((c: any) => c.name === columnName)) {
              continue;
            }
          }
          await db.run(sql); 
        } catch (e: any) {
          console.warn(`[DB] SQLite Migration Warning for "${sql}":`, e.message);
        }
      }
    }
  } catch (e) {}

  // Ensure admin user exists
  try {
    const adminEmail = "kobarbayedame6@gmail.com";
    const existingAdmin = await db.get(isPostgres ? "SELECT id, role FROM users WHERE email = $1::text" : "SELECT id, role FROM users WHERE email = ?", adminEmail);
    if (!existingAdmin) {
      console.log("Creating default admin account...");
      const passwordHash = await bcrypt.hash("admin123", 10);
      await db.run(
        isPostgres 
          ? "INSERT INTO users (name, email, password_hash, role) VALUES ($1::text, $2::text, $3::text, $4::text)" 
          : "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
        "Administrateur", adminEmail, passwordHash, "admin"
      );
    } else if (existingAdmin.role !== 'admin') {
      console.log(`Promoting ${adminEmail} to admin...`);
      await db.run(isPostgres 
        ? "UPDATE users SET role = 'admin', shop_id = NULL WHERE email = $1::text" 
        : "UPDATE users SET role = 'admin', shop_id = NULL WHERE email = ?", adminEmail);
    }
    
    // Also ensure baye@gmail.com is admin
    await db.run(isPostgres 
      ? "UPDATE users SET role = 'admin', shop_id = NULL WHERE email = $1::text" 
      : "UPDATE users SET role = 'admin', shop_id = NULL WHERE email = ?", 'baye@gmail.com');
  } catch (e) {
    console.error("Failed to ensure admin user:", e);
  }

  dbInitialized = true;
};

const JWT_SECRET_STR = process.env.JWT_SECRET || "smartstock-senegal-secret-key-2024";
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STR);

// Initialize Firebase Admin (for token verification)
async function initFirebaseAdmin() {
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      console.log("[Firebase] Loading config from:", configPath);
      const { default: admin } = await import("firebase-admin");
      if (admin.apps.length === 0) {
        const configRaw = fs.readFileSync(configPath, "utf8");
        const firebaseConfig = JSON.parse(configRaw);
        console.log("[Firebase] Initializing admin for project:", firebaseConfig.projectId);
        admin.initializeApp({
          projectId: firebaseConfig.projectId,
        });
        console.log("[Firebase] Admin initialized successfully");
      }
      return admin;
    } else {
      console.error("[Firebase] Config file NOT found at:", configPath);
    }
  } catch (e) {
    console.error("Failed to initialize Firebase Admin:", e);
  }
  return null;
}

let firebaseAdmin: any = null;
initFirebaseAdmin().then(a => firebaseAdmin = a);

async function sendNotification(to: string, message: string, type: 'sms' | 'whatsapp', shopId: number) {
  // Twilio disabled as requested
  console.log(`[Notification Disabled] To ${to} via ${type}: ${message}`);
  return;
}

function formatNotificationMessage(template: string, data: { customer_name: string, amount: number, currency: string, shop_name: string }) {
  return template
    .replace(/{customer_name}/g, data.customer_name || 'Client')
    .replace(/{amount}/g, data.amount.toLocaleString())
    .replace(/{currency}/g, data.currency || 'FCFA')
    .replace(/{shop_name}/g, data.shop_name || 'Boutique');
}

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // AI Studio handles CSP
  crossOriginEmbedderPolicy: false
}));

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: { error: "Trop de tentatives. Veuillez réessayer plus tard." }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per windowMs
  message: { error: "Trop de tentatives de connexion. Veuillez réessayer plus tard." }
});

// Store active WS connections by shopId
const clients = new Map<number, Set<any>>();

const broadcastToShop = (shopId: number, data: any) => {
  const shopClients = clients.get(shopId);
  if (shopClients) {
    const message = JSON.stringify(data);
    shopClients.forEach(client => {
      // Use numeric value for readyState to avoid type issues with dynamic ws import
      if (client.readyState === 1) { // 1 is OPEN
        client.send(message);
      }
    });
  }
};

const alertAdmin = async (title: string, message: string) => {
  try {
    const alertEmail = await db.get(isPostgres ? "SELECT value FROM platform_settings WHERE key = $1::text" : "SELECT value FROM platform_settings WHERE key = ?", 'admin_alert_email');
    const email = alertEmail ? alertEmail.value : 'kobarbayedame6@gmail.com';
    console.log(`[ADMIN ALERT] To: ${email} | ${title}: ${message}`);
  } catch (e) {
    console.error("Failed to alert admin:", e);
  }
};

const createNotification = async (shopId: number, type: string, title: string, message: string) => {
  try {
    const id = await db.run(
      isPostgres 
        ? "INSERT INTO notifications (shop_id, type, title, message) VALUES ($1::int, $2::text, $3::text, $4::text) RETURNING id"
        : "INSERT INTO notifications (shop_id, type, title, message) VALUES (?, ?, ?, ?)",
      shopId, type, title, message
    );
    const notification = { id: isPostgres ? (id as any).rows[0].id : (id as any).lastInsertRowid, shop_id: shopId, type, title, message, is_read: 0, created_at: new Date().toISOString() };
    broadcastToShop(shopId, { type: 'NOTIFICATION', payload: notification });
    return notification;
  } catch (e) {
    console.error("Failed to create notification:", e);
  }
};

const logAdminAction = async (userId: number, action: string, details: string, ip: string) => {
  try {
    await db.run(isPostgres 
      ? "INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1::int, $2::text, $3::text, $4::text)"
      : "INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)",
      userId, action, details, ip);
  } catch (e) {
    console.error("Failed to log admin action:", e);
  }
};

app.use(async (req, res, next) => {
  if (req.path.startsWith('/api')) {
    if (!dbInitialized) {
      if (!dbInitPromise) {
        console.log(`[Init] Starting DB initialization for request: ${req.path}`);
        dbInitPromise = initDb().then(() => {
          dbInitialized = true;
          console.log("[Init] DB initialization complete");
        }).catch(err => {
          console.error("[Init] DB initialization failed:", err);
          dbInitPromise = null; // Allow retry on next request
          throw err;
        });
      }
      
      try {
        await dbInitPromise;
      } catch (err: any) {
        return res.status(500).json({ 
          error: "Database initialization failed", 
          details: err.message 
        });
      }
    }
  }
  next();
});

// Health check endpoints
app.get("/api/health", async (req, res) => {
  try {
    // Basic check without full init to avoid timeouts if init is broken
    const result = isPostgres ? await pool.query("SELECT 1 as ok") : await db.get("SELECT 1 as ok");
    res.json({ 
      status: "ok", 
      database: isPostgres ? "PostgreSQL" : "SQLite",
      db_connection: !!result,
      env: process.env.NODE_ENV,
      isVercel: !!process.env.VERCEL
    });
  } catch (e: any) {
    res.status(500).json({ 
      status: "error", 
      message: e.message,
      isVercel: !!process.env.VERCEL,
      hasDbUrl: !!dbUrl
    });
  }
});

app.get("/api/debug-db", async (req, res) => {
  const info = {
    isVercel: !!process.env.VERCEL,
    nodeEnv: process.env.NODE_ENV,
    dbMode: isPostgres ? "PostgreSQL" : "SQLite",
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasPostgresUrl: !!process.env.POSTGRES_URL,
    dbInitialized,
    dbInitPromise: !!dbInitPromise
  };
  
  try {
    if (isPostgres) {
      if (!pool) throw new Error("Pool not initialized");
      const client = await pool.connect();
      const ver = await client.query("SELECT version()");
      client.release();
      res.json({ ...info, connection: "OK", pgVersion: ver.rows[0].version });
    } else {
      res.json({ ...info, connection: "SQLite (Local)" });
    }
  } catch (err: any) {
    res.status(500).json({ ...info, connection: "FAILED", error: err.message });
  }
});

app.get("/api/health-db", async (req, res) => {
  try {
    await initDb();
    res.json({ status: "Database initialized successfully" });
  } catch (e: any) {
    res.status(500).json({ status: "Database initialization failed", error: e.message });
  }
});

// Middleware and Routes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Apply rate limiting to auth routes
app.use("/api/auth/send-registration-code", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/send-code", authLimiter);
app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/verify-code", loginLimiter);

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

// Auth Middleware
const authenticate = async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const token = authHeader.split(" ")[1];
      const { payload } = await jwtVerify(token, JWT_SECRET);
      
      // Check if shop is blocked or expired (only if user has a shop)
      if (payload.shopId && payload.role !== 'admin') {
        const shop = await db.get(isPostgres 
          ? "SELECT status, plan, subscription_expires_at FROM shops WHERE id = $1::int" 
          : "SELECT status, plan, subscription_expires_at FROM shops WHERE id = ?", 
          payload.shopId
        );

        if (shop) {
          // Automatic rupture check
          if (shop.plan !== 'free' && shop.subscription_expires_at) {
            const expiresAt = new Date(shop.subscription_expires_at).getTime();
            if (Date.now() > expiresAt && shop.status === 'active') {
              console.log(`[Auth] Shop ${payload.shopId} subscription EXPIRED. Moving to grace_period.`);
              await db.run(isPostgres 
                ? "UPDATE shops SET status = 'grace_period' WHERE id = $1::int" 
                : "UPDATE shops SET status = 'grace_period' WHERE id = ?", 
                payload.shopId
              );
              shop.status = 'grace_period';
            }
          }

          if (shop.status === 'blocked') {
            console.log(`[Auth] Shop ${payload.shopId} BLOCKED`);
            return res.status(403).json({ error: "Votre compte a été bloqué par l'administrateur." });
          }
          if (shop.status === 'expired') {
            console.log(`[Auth] Shop ${payload.shopId} EXPIRED`);
            return res.status(403).json({ error: "Votre abonnement a expiré et la période de grâce est terminée. Vos données seront bientôt supprimées." });
          }
        }
      }

      req.user = payload;
      next();
    } catch (e) {
      console.error("Auth error:", e);
      res.status(401).json({ error: "Invalid or expired token" });
    }
  };

  // Admin Middleware
  const isAdmin = (req: any, res: any, next: any) => {
    console.log(`[AdminCheck] User: ${req.user?.userId}, Role: ${req.user?.role}`);
    if (!req.user || req.user.role !== 'admin') {
      console.log(`[AdminCheck] Denied: role is ${req.user?.role}`);
      return res.status(403).json({ error: "Access denied. Admin only." });
    }
    console.log(`[AdminCheck] Granted`);
    next();
  };

  // Auth Routes
  app.get("/api/auth/test-email", async (req, res) => {
    try {
      await transporter.verify();
      res.json({ success: true, message: "La configuration email est correcte. Le serveur SMTP est prêt." });
    } catch (error: any) {
      console.error("[Email Test] Error:", error.message);
      res.status(500).json({ 
        success: false, 
        error: "Erreur de connexion SMTP.", 
        details: error.message,
        hint: "Vérifiez votre EMAIL_USER et EMAIL_PASS. Si vous utilisez Gmail, assurez-vous d'utiliser un 'Mot de passe d'application'."
      });
    }
  });

  app.post("/api/auth/send-registration-code", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email requis." });

      // Check if user already exists
      let existingUser;
      try {
        existingUser = await db.get(isPostgres ? "SELECT id FROM users WHERE email = $1::text" : "SELECT id FROM users WHERE email = ?", email);
      } catch (dbErr: any) {
        throw new Error(`Erreur base de données (check user): ${dbErr.message}`);
      }

      if (existingUser) {
        return res.status(400).json({ error: "Cet email est déjà utilisé." });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      try {
        await db.run(isPostgres ? 
          "INSERT INTO verification_codes (email, code, expires_at) VALUES ($1::text, $2::text, $3::timestamp)" : 
          "INSERT INTO verification_codes (email, code, expires_at) VALUES (?, ?, ?)",
          email, code, isPostgres ? expiresAt : expiresAt.toISOString());
      } catch (dbErr: any) {
        throw new Error(`Erreur base de données (insert code): ${dbErr.message}`);
      }

      try {
        await sendEmail(email, "Code de vérification ShopMaster", `Votre code de vérification pour la création de votre boutique est : ${code}`);
      } catch (mailErr: any) {
        throw new Error(`Erreur envoi email: ${mailErr.message}`);
      }
      
      res.json({ message: "Code envoyé avec succès." });
    } catch (e: any) {
      console.error("Send registration code error:", e);
      res.status(500).json({ error: e.message || "Erreur lors de l'envoi du code." });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { shopName, name, email, password, code } = req.body;
      if (!shopName || !name || !email || !password || !code) {
        return res.status(400).json({ error: "Tous les champs sont obligatoires." });
      }

      // Verify code
      const verification = await db.get(isPostgres ? 
        "SELECT id FROM verification_codes WHERE email = $1::text AND code = $2::text AND used = 0 AND expires_at > NOW()" : 
        "SELECT id FROM verification_codes WHERE email = ? AND code = ? AND used = 0 AND expires_at > datetime('now')",
        email, code);

      if (!verification) {
        return res.status(400).json({ error: "Code de vérification invalide ou expiré." });
      }
      
      // Password complexity check
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({ 
          error: "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre." 
        });
      }

      const shopResult = await db.run(isPostgres ? "INSERT INTO shops (name) VALUES ($1::text) RETURNING id" : "INSERT INTO shops (name) VALUES (?)", shopName);
      const shopId = isPostgres ? shopResult.rows[0].id : shopResult.lastInsertRowid;
      
      await alertAdmin('Nouvelle Boutique', `Une nouvelle boutique "${shopName}" a été créée par ${name} (${email}).`);

      const passwordHash = await bcrypt.hash(password, 10);
      const userResult = await db.run(isPostgres ? "INSERT INTO users (shop_id, name, email, password_hash, role) VALUES ($1::int, $2::text, $3::text, $4::text, $5::text) RETURNING id" : "INSERT INTO users (shop_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
        shopId, name, email, passwordHash, "owner");
      
      const userId = isPostgres ? userResult.rows[0].id : userResult.lastInsertRowid;

      // Mark code as used
      await db.run(isPostgres ? 
        "UPDATE verification_codes SET used = 1 WHERE id = $1::int" : 
        "UPDATE verification_codes SET used = 1 WHERE id = ?",
        verification.id);

      const token = await new SignJWT({ userId, shopId, role: "owner" })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("30d")
        .sign(JWT_SECRET);

      res.json({ token, user: { 
        id: userId,
        name, 
        email, 
        role: "owner", 
        shopName, 
        plan: 'free',
        theme: 'light',
        language: 'fr',
        currency: 'FCFA',
        show_tax: false,
        sms_enabled: false,
        whatsapp_enabled: false,
        notification_template: ''
      } });
    } catch (e: any) {
      console.error("Register error:", e);
      if (e.message.includes("unique constraint") || e.message.includes("UNIQUE constraint")) {
        return res.status(400).json({ error: "Cet email est déjà utilisé par un autre compte." });
      }
      res.status(500).json({ error: e.message || "Erreur lors de l'inscription." });
    }
  });

  app.post("/api/auth/send-code", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email requis" });

    try {
      // Check if user exists
      let user;
      try {
        user = await db.get(isPostgres ? "SELECT id FROM users WHERE email = $1::text" : "SELECT id FROM users WHERE email = ?", email);
      } catch (dbErr: any) {
        throw new Error(`Erreur base de données (check user): ${dbErr.message}`);
      }

      if (!user) {
        return res.status(404).json({ error: "Aucun compte n'est associé à cet email." });
      }

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      try {
        await db.run(isPostgres 
          ? "INSERT INTO verification_codes (email, code, expires_at) VALUES ($1::text, $2::text, $3::timestamp)"
          : "INSERT INTO verification_codes (email, code, expires_at) VALUES (?, ?, ?)",
          email, code, expiresAt.toISOString());
      } catch (dbErr: any) {
        throw new Error(`Erreur base de données (insert code): ${dbErr.message}`);
      }

      try {
        await sendEmail(email, "Code de vérification ShopMaster", `Votre code de vérification pour la connexion est : ${code}`);
      } catch (mailErr: any) {
        throw new Error(`Erreur envoi email: ${mailErr.message}`);
      }
      
      res.json({ message: "Code envoyé avec succès" });
    } catch (e: any) {
      console.error("Send code error:", e);
      res.status(500).json({ error: e.message || "Erreur lors de l'envoi du code" });
    }
  });

  app.post("/api/auth/verify-code", async (req, res) => {
    try {
      const { email, code, password } = req.body;
      if (!email || !code || !password) return res.status(400).json({ error: "Tous les champs sont requis" });

      // 1. Verify code
      const verification = await db.get(isPostgres 
        ? "SELECT * FROM verification_codes WHERE email = $1::text AND code = $2::text AND used = 0 AND expires_at > CURRENT_TIMESTAMP ORDER BY created_at DESC LIMIT 1"
        : "SELECT * FROM verification_codes WHERE email = ? AND code = ? AND used = 0 AND expires_at > datetime('now') ORDER BY created_at DESC LIMIT 1",
        email, code);

      if (!verification) {
        return res.status(400).json({ error: "Code invalide ou expiré" });
      }

      // 2. Verify user and password
      const user = await db.get(isPostgres 
        ? "SELECT u.*, s.name as shopName, s.plan, s.logo_url, s.theme, s.language, s.currency, s.receipt_footer, s.show_tax, s.sms_enabled, s.whatsapp_enabled, s.notification_template, s.status as shopStatus FROM users u LEFT JOIN shops s ON u.shop_id = s.id WHERE u.email = $1::text" 
        : "SELECT u.*, s.name as shopName, s.plan, s.logo_url, s.theme, s.language, s.currency, s.receipt_footer, s.show_tax, s.sms_enabled, s.whatsapp_enabled, s.notification_template, s.status as shopStatus FROM users u LEFT JOIN shops s ON u.shop_id = s.id WHERE u.email = ?", email);
      
      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ error: "Mot de passe incorrect" });
      }

      if (user.shopStatus === 'blocked' && user.role !== 'admin') {
        return res.status(403).json({ error: "Votre compte a été bloqué par l'administrateur." });
      }

      // Mark code as used
      await db.run(isPostgres 
        ? "UPDATE verification_codes SET used = 1 WHERE id = $1::int"
        : "UPDATE verification_codes SET used = 1 WHERE id = ?", verification.id);

      const token = await new SignJWT({ userId: user.id, shopId: user.shop_id, role: user.role })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("30d")
        .sign(JWT_SECRET);
      
      res.json({ token, user: { 
        id: user.id,
        shopId: user.shop_id,
        name: user.name, 
        email: user.email, 
        role: user.role, 
        shopName: user.shopName || 'Administration Centrale', 
        shopAddress: user.shopAddress,
        shopPhone: user.shopPhone,
        plan: user.plan || 'premium',
        logo_url: user.logo_url,
        theme: user.theme || 'light',
        language: user.language || 'fr',
        currency: user.currency || 'FCFA',
        receipt_footer: user.receipt_footer,
        show_tax: !!user.show_tax,
        sms_enabled: !!user.sms_enabled,
        whatsapp_enabled: !!user.whatsapp_enabled,
        notification_template: user.notification_template || ''
      } });
    } catch (e: any) {
      console.error("Verify code error:", e);
      res.status(500).json({ error: "Une erreur est survenue lors de la vérification." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await db.get(isPostgres 
        ? "SELECT u.*, s.name as shopName, s.address as shopAddress, s.phone as shopPhone, s.plan, s.logo_url, s.theme, s.language, s.currency, s.receipt_footer, s.show_tax, s.sms_enabled, s.whatsapp_enabled, s.notification_template, s.status as shopStatus FROM users u LEFT JOIN shops s ON u.shop_id = s.id WHERE u.email = $1::text" 
        : "SELECT u.*, s.name as shopName, s.address as shopAddress, s.phone as shopPhone, s.plan, s.logo_url, s.theme, s.language, s.currency, s.receipt_footer, s.show_tax, s.sms_enabled, s.whatsapp_enabled, s.notification_template, s.status as shopStatus FROM users u LEFT JOIN shops s ON u.shop_id = s.id WHERE u.email = ?", email);
      
      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

    if (user.shopStatus === 'blocked' && user.role !== 'admin') {
      return res.status(403).json({ error: "Votre compte a été bloqué par l'administrateur." });
    }

    const token = await new SignJWT({ userId: user.id, shopId: user.shop_id, role: user.role })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("30d")
      .sign(JWT_SECRET);
    
    res.json({ token, user: { 
      id: user.id,
      shopId: user.shop_id,
      name: user.name, 
      email: user.email, 
      role: user.role, 
      shopName: user.shopName || 'Administration Centrale', 
      shopAddress: user.shopAddress,
      shopPhone: user.shopPhone,
      plan: user.plan || 'premium',
      logo_url: user.logo_url,
      theme: user.theme || 'light',
      language: user.language || 'fr',
      currency: user.currency || 'FCFA',
      receipt_footer: user.receipt_footer,
      show_tax: !!user.show_tax,
      sms_enabled: !!user.sms_enabled,
      whatsapp_enabled: !!user.whatsapp_enabled,
      notification_template: user.notification_template || ''
    } });
    } catch (e: any) {
      console.error("Login error:", e);
      res.status(500).json({ error: "Une erreur est survenue lors de la connexion." });
    }
  });

  app.post("/api/auth/google", async (req, res) => {
    try {
      const { idToken } = req.body;
      if (!idToken) return res.status(400).json({ error: "Token manquant" });

      // Verify Firebase ID Token
      const fAdmin = firebaseAdmin || await initFirebaseAdmin();
      if (!fAdmin) {
        console.error("[Auth] Firebase Admin not initialized - check firebase-applet-config.json");
        return res.status(500).json({ error: "Service d'authentification indisponible (Admin non initialisé)" });
      }
      
      let decodedToken;
      try {
        decodedToken = await fAdmin.auth().verifyIdToken(idToken);
      } catch (verifyError: any) {
        console.error("[Auth] Firebase token verification failed:", verifyError.message);
        return res.status(401).json({ error: `Token invalide: ${verifyError.message}` });
      }
      
      const { email, name, picture, uid } = decodedToken;

      if (!email) return res.status(400).json({ error: "Email non fourni par Google" });

      // Special case: kobarbayedame6@gmail.com is always an admin
      const isAdminEmail = email === "kobarbayedame6@gmail.com";

      // Check if user exists
      let user = await db.get(isPostgres 
        ? "SELECT u.*, s.name as shopName, s.address as shopAddress, s.phone as shopPhone, s.plan, s.logo_url, s.theme, s.language, s.currency, s.receipt_footer, s.show_tax, s.sms_enabled, s.whatsapp_enabled, s.notification_template, s.status as shopStatus FROM users u LEFT JOIN shops s ON u.shop_id = s.id WHERE u.email = $1::text" 
        : "SELECT u.*, s.name as shopName, s.address as shopAddress, s.phone as shopPhone, s.plan, s.logo_url, s.theme, s.language, s.currency, s.receipt_footer, s.show_tax, s.sms_enabled, s.whatsapp_enabled, s.notification_template, s.status as shopStatus FROM users u LEFT JOIN shops s ON u.shop_id = s.id WHERE u.email = ?", email);

      if (!user) {
        // Create new shop and user if not exists
        // If admin email, they don't get a shop by default
        let shopId = null;
        let shopName = null;
        let role = isAdminEmail ? "admin" : "owner";

        if (!isAdminEmail) {
          shopName = `Boutique de ${name || email.split('@')[0]}`;
          const shopResult = await db.run(isPostgres ? "INSERT INTO shops (name) VALUES ($1::text) RETURNING id" : "INSERT INTO shops (name) VALUES (?)", shopName);
          shopId = isPostgres ? shopResult.rows[0].id : shopResult.lastInsertRowid;
        }
        
        // Use a random password hash for Google users (they'll use Google to login anyway)
        const passwordHash = await bcrypt.hash(Math.random().toString(36), 10);
        
        const userResult = await db.run(isPostgres ? "INSERT INTO users (shop_id, name, email, password_hash, role) VALUES ($1::int, $2::text, $3::text, $4::text, $5::text) RETURNING id" : "INSERT INTO users (shop_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
          shopId, name || email.split('@')[0], email, passwordHash, role);
        
        const userId = isPostgres ? userResult.rows[0].id : userResult.lastInsertRowid;
        
        user = {
          id: userId,
          shop_id: shopId,
          name: name || email.split('@')[0],
          email,
          role: role,
          shopName,
          plan: 'free',
          theme: 'light',
          language: 'fr',
          currency: 'FCFA',
          show_tax: 0,
          sms_enabled: 0,
          whatsapp_enabled: 0,
          notification_template: ''
        };
      } else if (isAdminEmail && user.role !== 'admin') {
        // Promote existing user to admin if they are using the admin email
        await db.run(isPostgres ? "UPDATE users SET role = 'admin', shop_id = NULL WHERE id = $1::int" : "UPDATE users SET role = ? WHERE id = ?", "admin", user.id);
        user.role = 'admin';
        user.shop_id = null;
      }

      const token = await new SignJWT({ userId: user.id, shopId: user.shop_id, role: user.role })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("30d")
        .sign(JWT_SECRET);

      res.json({ token, user: { 
        id: user.id,
        shopId: user.shop_id,
        name: user.name, 
        email: user.email, 
        role: user.role, 
        shopName: user.shopName, 
        shopAddress: user.shopAddress,
        shopPhone: user.shopPhone,
        plan: user.plan || 'free',
        logo_url: user.logo_url,
        theme: user.theme || 'light',
        language: user.language || 'fr',
        currency: user.currency || 'FCFA',
        receipt_footer: user.receipt_footer,
        show_tax: !!user.show_tax,
        sms_enabled: !!user.sms_enabled,
        whatsapp_enabled: !!user.whatsapp_enabled,
        notification_template: user.notification_template || ''
      } });

    } catch (e: any) {
      console.error("Google auth error:", e);
      res.status(500).json({ error: "Erreur d'authentification Google" });
    }
  });

  app.get("/api/auth/me", authenticate, async (req: any, res) => {
    try {
      const user = await db.get(isPostgres 
        ? `SELECT u.*, sh.name as "shopName", sh.address as "shopAddress", sh.phone as "shopPhone", sh.logo_url, sh.plan, sh.theme, sh.language, sh.currency, sh.receipt_footer, sh.show_tax, sh.sms_enabled, sh.whatsapp_enabled, sh.notification_template
           FROM users u 
           LEFT JOIN shops sh ON u.shop_id = sh.id 
           WHERE u.id = $1::int`
        : `SELECT u.*, sh.name as shopName, sh.address as shopAddress, sh.phone as shopPhone, sh.logo_url, sh.plan, sh.theme, sh.language, sh.currency, sh.receipt_footer, sh.show_tax, sh.sms_enabled, sh.whatsapp_enabled, sh.notification_template
           FROM users u 
           LEFT JOIN shops sh ON u.shop_id = sh.id 
           WHERE u.id = ?`, 
        req.user.userId);

      if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

      res.json({ 
        id: user.id,
        shopId: user.shop_id,
        name: user.name, 
        email: user.email, 
        role: user.role, 
        shopName: user.shopName || (user.role === 'admin' ? 'Administration Centrale' : 'Ma Boutique'), 
        shopAddress: user.shopAddress,
        shopPhone: user.shopPhone,
        plan: user.plan || 'free',
        logo_url: user.logo_url,
        theme: user.theme || 'light',
        language: user.language || 'fr',
        currency: user.currency || 'FCFA',
        receipt_footer: user.receipt_footer,
        show_tax: !!user.show_tax,
        sms_enabled: !!user.sms_enabled,
        whatsapp_enabled: !!user.whatsapp_enabled,
        notification_template: user.notification_template || ''
      });
    } catch (e: any) {
      console.error("Get profile error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/shop/subscription", authenticate, async (req: any, res) => {
    console.log(`[API] Fetching subscription for shop ${req.user.shopId}`);
    try {
      const shop = await db.get(isPostgres 
        ? "SELECT plan, subscription_expires_at, status FROM shops WHERE id = $1::int" 
        : "SELECT plan, subscription_expires_at, status FROM shops WHERE id = ?", 
        req.user.shopId
      );
      if (!shop) {
        console.warn(`[API] Shop ${req.user.shopId} not found for subscription check`);
        return res.status(404).json({ error: "Shop not found" });
      }
      res.json(shop);
    } catch (e: any) {
      console.error("Get shop subscription error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Shop Routes
  app.post("/api/shop/upgrade", authenticate, async (req: any, res) => {
    try {
      const { plan } = req.body; // 'premium'
      await db.run(isPostgres 
        ? "UPDATE shops SET plan = $1::text, has_ai_features = $3::int WHERE id = $2::int" 
        : "UPDATE shops SET plan = ?, has_ai_features = ? WHERE id = ?", 
        plan, req.user.shopId, plan === 'premium' ? 1 : 0);
      res.json({ success: true, plan });
    } catch (e: any) {
      console.error("Upgrade shop error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Subscription Request Routes
  app.post("/api/subscription/request", authenticate, async (req: any, res) => {
    try {
      const { plan, duration_months, payment_method, phone_number, transaction_ref } = req.body;
      const result = await db.run(isPostgres 
        ? `INSERT INTO subscription_requests (shop_id, user_id, plan, duration_months, payment_method, phone_number, transaction_ref)
           VALUES ($1::int, $2::int, $3::text, $4::int, $5::text, $6::text, $7::text) RETURNING id`
        : `INSERT INTO subscription_requests (shop_id, user_id, plan, duration_months, payment_method, phone_number, transaction_ref)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        req.user.shopId, req.user.userId, plan, duration_months || 1, payment_method, phone_number, transaction_ref);
      
      const requestId = isPostgres ? result.rows[0].id : result.lastInsertRowid;
      
      await alertAdmin('Demande d\'Abonnement', `La boutique ID ${req.user.shopId} a demandé le plan ${plan} (${duration_months || 1} mois) via ${payment_method}.`);
      
      res.json({ id: requestId });
    } catch (e: any) {
      console.error("Subscription request error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/subscription/my-requests", authenticate, async (req: any, res) => {
    try {
      const requests = await db.all(isPostgres ? "SELECT * FROM subscription_requests WHERE shop_id = $1::int ORDER BY created_at DESC" : "SELECT * FROM subscription_requests WHERE shop_id = ? ORDER BY created_at DESC", req.user.shopId);
      res.json(requests);
    } catch (e: any) {
      console.error("Get my requests error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/shop/settings", authenticate, async (req: any, res) => {
    try {
      const { name, logo_url, theme, language, currency, receipt_footer, show_tax, has_ai_features } = req.body;
      await db.run(isPostgres
        ? `UPDATE shops 
           SET name = COALESCE($1::text, name),
               logo_url = COALESCE($2::text, logo_url), 
               theme = COALESCE($3::text, theme), 
               language = COALESCE($4::text, language), 
               currency = COALESCE($5::text, currency), 
               receipt_footer = COALESCE($6::text, receipt_footer), 
               show_tax = COALESCE($7::int, show_tax),
               has_ai_features = COALESCE($8::int, has_ai_features)
           WHERE id = $9::int`
        : `UPDATE shops 
           SET name = COALESCE(?, name),
               logo_url = COALESCE(?, logo_url), 
               theme = COALESCE(?, theme), 
               language = COALESCE(?, language), 
               currency = COALESCE(?, currency), 
               receipt_footer = COALESCE(?, receipt_footer), 
               show_tax = COALESCE(?, show_tax),
               has_ai_features = COALESCE(?, has_ai_features)
           WHERE id = ?`,
        name, logo_url, theme, language, currency, receipt_footer, 
        show_tax === undefined ? null : (show_tax ? 1 : 0), 
        has_ai_features === undefined ? null : (has_ai_features ? 1 : 0),
        req.user.shopId);
      res.json({ success: true });
    } catch (e: any) {
      console.error("Update settings error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/auth/promote-to-admin", authenticate, async (req: any, res) => {
    try {
      // Check if the user is the authorized admin email
      const user = await db.get(isPostgres ? "SELECT email FROM users WHERE id = $1::int" : "SELECT email FROM users WHERE id = ?", req.user.userId);
      const superAdmins = ['baye@gmail.com', 'kobarbayedame6@gmail.com'];
      if (!superAdmins.includes(user?.email)) {
        return res.status(403).json({ error: "Seul l'administrateur principal peut effectuer cette action." });
      }

      await db.run(isPostgres ? "UPDATE users SET role = 'admin' WHERE id = $1::int" : "UPDATE users SET role = 'admin' WHERE id = ?", req.user.userId);
      
      // Generate a new token with the updated role
      const newToken = await new SignJWT({ 
        userId: req.user.userId, 
        shopId: req.user.shopId, 
        role: 'admin' 
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("30d")
        .sign(JWT_SECRET);

      res.json({ success: true, role: 'admin', token: newToken });
    } catch (err: any) {
      console.error("Promote to admin error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Upload Route
  app.post("/api/upload", authenticate, upload.single("image"), (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const imageUrl = `/uploads/${req.file.filename}`;
      res.json({ imageUrl });
    } catch (e: any) {
      console.error("Upload error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/user/profile", authenticate, async (req: any, res) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: "Name is required" });
      
      await db.run(isPostgres ? "UPDATE users SET name = $1::text WHERE id = $2::int" : "UPDATE users SET name = ? WHERE id = ?", name, req.user.userId);
      res.json({ success: true });
    } catch (e: any) {
      console.error("Update profile error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Notification Routes (Disabled)
  app.get("/api/notifications/status", authenticate, async (req: any, res) => {
    res.json({ configured: false });
  });

  app.post("/api/notifications/send", authenticate, async (req: any, res) => {
    res.status(501).json({ error: "Notifications are currently disabled" });
  });

  app.post("/api/shop/notifications/settings", authenticate, async (req: any, res) => {
    try {
      const { sms_enabled, whatsapp_enabled, notification_template } = req.body;
      await db.run(isPostgres
        ? `UPDATE shops 
           SET sms_enabled = COALESCE($1::int, sms_enabled), 
               whatsapp_enabled = COALESCE($2::int, whatsapp_enabled), 
               notification_template = COALESCE($3::text, notification_template)
           WHERE id = $4::int`
        : `UPDATE shops 
           SET sms_enabled = COALESCE(?, sms_enabled), 
               whatsapp_enabled = COALESCE(?, whatsapp_enabled), 
               notification_template = COALESCE(?, notification_template)
           WHERE id = ?`,
        sms_enabled === undefined ? null : (sms_enabled ? 1 : 0),
        whatsapp_enabled === undefined ? null : (whatsapp_enabled ? 1 : 0),
        notification_template,
        req.user.shopId);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  // Suppliers Routes
  app.get("/api/suppliers", authenticate, async (req: any, res) => {
    try {
      const suppliers = await db.all(isPostgres ? 'SELECT * FROM suppliers WHERE shop_id = $1::int ORDER BY name ASC' : 'SELECT * FROM suppliers WHERE shop_id = ? ORDER BY name ASC', req.user.shopId);
      res.json(suppliers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/suppliers", authenticate, async (req: any, res) => {
    try {
      const { name, contact_name, phone, email, address } = req.body;
      const result = await db.run(
        isPostgres ? 'INSERT INTO suppliers (shop_id, name, contact_name, phone, email, address) VALUES ($1::int, $2::text, $3::text, $4::text, $5::text, $6::text) RETURNING id' : 'INSERT INTO suppliers (shop_id, name, contact_name, phone, email, address) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.shopId, name, contact_name, phone, email, address]
      );
      const supplierId = isPostgres ? result.rows[0].id : result.lastInsertRowid;
      const newSupplier = await db.get(isPostgres ? 'SELECT * FROM suppliers WHERE id = $1::int AND shop_id = $2::int' : 'SELECT * FROM suppliers WHERE id = ? AND shop_id = ?', supplierId, req.user.shopId);
      res.status(201).json(newSupplier);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/suppliers/:id", authenticate, async (req: any, res) => {
    try {
      const { name, contact_name, phone, email, address } = req.body;
      await db.run(
        isPostgres ? 'UPDATE suppliers SET name = $1::text, contact_name = $2::text, phone = $3::text, email = $4::text, address = $5::text WHERE id = $6::int AND shop_id = $7::int' : 'UPDATE suppliers SET name = ?, contact_name = ?, phone = ?, email = ?, address = ? WHERE id = ? AND shop_id = ?',
        [name, contact_name, phone, email, address, req.params.id, req.user.shopId]
      );
      const updatedSupplier = await db.get(isPostgres ? 'SELECT * FROM suppliers WHERE id = $1::int AND shop_id = $2::int' : 'SELECT * FROM suppliers WHERE id = ? AND shop_id = ?', req.params.id, req.user.shopId);
      res.json(updatedSupplier);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/suppliers/:id", authenticate, async (req: any, res) => {
    try {
      await db.run(isPostgres ? 'DELETE FROM suppliers WHERE id = $1::int AND shop_id = $2::int' : 'DELETE FROM suppliers WHERE id = ? AND shop_id = ?', req.params.id, req.user.shopId);
      res.json({ message: "Supplier deleted" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Export Routes
  app.get("/api/export/:type", authenticate, async (req: any, res) => {
    try {
      const { type } = req.params;
      let data: any[] = [];
      
      if (type === "sales") {
        data = await db.all(isPostgres ? "SELECT s.*, u.name as \"userName\", c.name as \"customerName\" FROM sales s LEFT JOIN users u ON s.user_id = u.id LEFT JOIN customers c ON s.customer_id = c.id WHERE s.shop_id = $1::int ORDER BY s.created_at DESC" : "SELECT s.*, u.name as userName, c.name as customerName FROM sales s LEFT JOIN users u ON s.user_id = u.id LEFT JOIN customers c ON s.customer_id = c.id WHERE s.shop_id = ? ORDER BY s.created_at DESC", req.user.shopId);
      } else if (type === "products") {
        data = await db.all(isPostgres ? "SELECT p.*, c.name as \"categoryName\", s.name as \"supplierName\" FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.shop_id = $1::int ORDER BY p.name ASC" : "SELECT p.*, c.name as categoryName, s.name as supplierName FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.shop_id = ? ORDER BY p.name ASC", req.user.shopId);
      } else {
        return res.status(400).json({ error: "Invalid export type" });
      }

      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/debug/db", authenticate, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Unauthorized" });
    try {
      const tables = isPostgres 
        ? await db.all("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
        : await db.all("SELECT name FROM sqlite_master WHERE type='table'");
      
      const productsInfo = isPostgres
        ? await db.all("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products'")
        : await db.all("PRAGMA table_info(products)");

      res.json({ tables, productsInfo });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/products", authenticate, async (req: any, res) => {
    try {
      const products = await db.all(isPostgres 
        ? "SELECT p.*, c.name as \"categoryName\", s.name as \"supplierName\" FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.shop_id = $1::int" 
        : "SELECT p.*, c.name as categoryName, s.name as supplierName FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.shop_id = ?", 
        req.user.shopId);
      res.json(products);
    } catch (e: any) {
      console.error("Get products error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/products", authenticate, async (req: any, res) => {
    try {
      console.log("[API] Creating product:", req.body);
      const { name, barcode, category_id, supplier_id, purchase_price, sale_price, quantity, min_quantity, image_url } = req.body;
      const shopId = req.user.shopId;
      
      if (!name) return res.status(400).json({ error: "Le nom du produit est requis" });

      // Verify category belongs to shop if provided
      if (category_id) {
        const category = await db.get(isPostgres ? "SELECT id FROM categories WHERE id = $1::int AND shop_id = $2::int" : "SELECT id FROM categories WHERE id = ? AND shop_id = ?", category_id, shopId);
        if (!category) return res.status(400).json({ error: "Catégorie invalide" });
      }

      // Verify supplier belongs to shop if provided
      if (supplier_id) {
        const supplier = await db.get(isPostgres ? "SELECT id FROM suppliers WHERE id = $1::int AND shop_id = $2::int" : "SELECT id FROM suppliers WHERE id = ? AND shop_id = ?", supplier_id, shopId);
        if (!supplier) return res.status(400).json({ error: "Fournisseur invalide" });
      }

      const result = await db.run(isPostgres 
        ? "INSERT INTO products (shop_id, category_id, supplier_id, name, barcode, purchase_price, sale_price, quantity, min_quantity, image_url) VALUES ($1::int, $2::int, $3::int, $4::text, $5::text, $6::real, $7::real, $8::int, $9::int, $10::text) RETURNING id"
        : "INSERT INTO products (shop_id, category_id, supplier_id, name, barcode, purchase_price, sale_price, quantity, min_quantity, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        shopId, 
        category_id || null, 
        supplier_id || null, 
        name, 
        barcode || null, 
        purchase_price || 0, 
        sale_price || 0, 
        quantity || 0, 
        min_quantity || 0, 
        image_url || null
      );
      
      const productId = isPostgres ? result.rows[0].id : result.lastInsertRowid;
      res.json({ id: productId });
    } catch (e: any) {
      console.error("Create product error:", e);
      res.status(500).json({ error: "Erreur lors de la création du produit: " + e.message });
    }
  });

  app.put("/api/products/:id", authenticate, async (req: any, res) => {
    try {
      console.log(`[API] Updating product ${req.params.id}:`, req.body);
      const { name, barcode, category_id, supplier_id, purchase_price, sale_price, quantity, min_quantity, image_url } = req.body;
      const productId = req.params.id;
      const shopId = req.user.shopId;
      
      if (!name) return res.status(400).json({ error: "Le nom du produit est requis" });

      // Verify category belongs to shop if provided
      if (category_id) {
        const category = await db.get(isPostgres ? "SELECT id FROM categories WHERE id = $1::int AND shop_id = $2::int" : "SELECT id FROM categories WHERE id = ? AND shop_id = ?", category_id, shopId);
        if (!category) return res.status(400).json({ error: "Catégorie invalide" });
      }

      // Verify supplier belongs to shop if provided
      if (supplier_id) {
        const supplier = await db.get(isPostgres ? "SELECT id FROM suppliers WHERE id = $1::int AND shop_id = $2::int" : "SELECT id FROM suppliers WHERE id = ? AND shop_id = ?", supplier_id, shopId);
        if (!supplier) return res.status(400).json({ error: "Fournisseur invalide" });
      }

      await db.run(isPostgres 
        ? "UPDATE products SET name = $1::text, barcode = $2::text, category_id = $3::int, supplier_id = $4::int, purchase_price = $5::real, sale_price = $6::real, quantity = $7::int, min_quantity = $8::int, image_url = $9::text WHERE id = $10::int AND shop_id = $11::int"
        : "UPDATE products SET name = ?, barcode = ?, category_id = ?, supplier_id = ?, purchase_price = ?, sale_price = ?, quantity = ?, min_quantity = ?, image_url = ? WHERE id = ? AND shop_id = ?",
        name, 
        barcode || null, 
        category_id || null, 
        supplier_id || null, 
        purchase_price || 0, 
        sale_price || 0, 
        quantity || 0, 
        min_quantity || 0, 
        image_url || null, 
        productId, 
        shopId
      );
      res.json({ success: true });
    } catch (e: any) {
      console.error("Update product error:", e);
      res.status(500).json({ error: "Erreur lors de la mise à jour du produit: " + e.message });
    }
  });

  app.delete("/api/products/:id", authenticate, async (req: any, res) => {
    const productId = req.params.id;
    const shopId = req.user.shopId;
    try {
      await db.transaction(async () => {
        // Explicitly delete sale items first to be safe
        await db.run(isPostgres ? "DELETE FROM sale_items WHERE product_id = $1::int AND sale_id IN (SELECT id FROM sales WHERE shop_id = $2::int)" : "DELETE FROM sale_items WHERE product_id = ? AND sale_id IN (SELECT id FROM sales WHERE shop_id = ?)", productId, shopId);
        
        // Then delete the product
        const result = await db.run(isPostgres ? "DELETE FROM products WHERE id = $1::int AND shop_id = $2::int" : "DELETE FROM products WHERE id = ? AND shop_id = ?", productId, shopId);
        
        // In some drivers, we can check if anything was deleted
        // For now, we'll just assume success if no error was thrown
      });
      res.json({ success: true });
    } catch (e: any) {
      console.error("Delete product error:", e);
      res.status(500).json({ error: "Erreur lors de la suppression du produit: " + e.message });
    }
  });

  // Category Routes
  app.get("/api/categories", authenticate, async (req: any, res) => {
    try {
      const categories = await db.all(isPostgres ? "SELECT * FROM categories WHERE shop_id = $1::int" : "SELECT * FROM categories WHERE shop_id = ?", req.user.shopId);
      res.json(categories);
    } catch (e: any) {
      console.error("Get categories error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/categories", authenticate, async (req: any, res) => {
    try {
      const { name } = req.body;
      const result = await db.run(isPostgres ? "INSERT INTO categories (shop_id, name) VALUES ($1::int, $2::text) RETURNING id" : "INSERT INTO categories (shop_id, name) VALUES (?, ?)", req.user.shopId, name);
      const categoryId = isPostgres ? result.rows[0].id : result.lastInsertRowid;
      res.json({ id: categoryId });
    } catch (e: any) {
      console.error("Create category error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/categories/:id", authenticate, async (req: any, res) => {
    try {
      const categoryId = req.params.id;
      // Products have ON DELETE SET NULL for category_id, so we can just delete the category
      await db.run(isPostgres ? "DELETE FROM categories WHERE id = $1::int AND shop_id = $2::int" : "DELETE FROM categories WHERE id = ? AND shop_id = ?", categoryId, req.user.shopId);
      res.json({ success: true });
    } catch (e: any) {
      console.error("Delete category error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Customer Routes
  app.get("/api/customers", authenticate, async (req: any, res) => {
    try {
      const customers = await db.all(isPostgres ? "SELECT * FROM customers WHERE shop_id = $1::int" : "SELECT * FROM customers WHERE shop_id = ?", req.user.shopId);
      res.json(customers);
    } catch (e: any) {
      console.error("Get customers error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/customers", authenticate, async (req: any, res) => {
    try {
      const { name, phone, email, address } = req.body;
      const result = await db.run(isPostgres 
        ? "INSERT INTO customers (shop_id, name, phone, email, address) VALUES ($1::int, $2::text, $3::text, $4::text, $5::text) RETURNING id"
        : "INSERT INTO customers (shop_id, name, phone, email, address) VALUES (?, ?, ?, ?, ?)",
        req.user.shopId, name, phone, email, address);
      const customerId = isPostgres ? result.rows[0].id : result.lastInsertRowid;
      res.json({ id: customerId });
    } catch (e: any) {
      console.error("Create customer error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/customers/:id", authenticate, async (req: any, res) => {
    try {
      const { name, phone, email, address } = req.body;
      await db.run(
        isPostgres 
          ? "UPDATE customers SET name = $1::text, phone = $2::text, email = $3::text, address = $4::text WHERE id = $5::int AND shop_id = $6::int"
          : "UPDATE customers SET name = ?, phone = ?, email = ?, address = ? WHERE id = ? AND shop_id = ?",
        name, phone, email, address, req.params.id, req.user.shopId
      );
      res.json({ success: true });
    } catch (e: any) {
      console.error("Update customer error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/customers/:id", authenticate, async (req: any, res) => {
    try {
      await db.run(
        isPostgres 
          ? "DELETE FROM customers WHERE id = $1::int AND shop_id = $2::int"
          : "DELETE FROM customers WHERE id = ? AND shop_id = ?",
        req.params.id, req.user.shopId
      );
      res.json({ success: true });
    } catch (e: any) {
      console.error("Delete customer error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Sales Routes
  app.post("/api/sales", authenticate, async (req: any, res) => {
    const { items, total_amount, customer_id, tax_amount, discount_amount, payment_method, payment_status, amount_paid } = req.body;
    const shopId = req.user.shopId;
    const userId = req.user.userId;

    try {
      // Verify customer belongs to shop if provided
      if (customer_id) {
        const customer = await db.get(isPostgres ? "SELECT id FROM customers WHERE id = $1::int AND shop_id = $2::int" : "SELECT id FROM customers WHERE id = ? AND shop_id = ?", customer_id, shopId);
        if (!customer) return res.status(400).json({ error: "Client invalide" });
      }

      let saleId: number | null = null;
      await db.transaction(async () => {
        let totalProfit = 0;
        // Calculate total profit and verify stock
        for (const item of items) {
          const product = await db.get(isPostgres ? "SELECT * FROM products WHERE id = $1::int AND shop_id = $2::int" : "SELECT * FROM products WHERE id = ? AND shop_id = ?", item.product_id, shopId);
          if (!product || product.quantity < item.quantity) {
            throw new Error(`Stock insuffisant pour ${product?.name || 'produit inconnu'}`);
          }
          const profit = (item.unit_price - product.purchase_price) * item.quantity;
          totalProfit += profit;
          item.unit_profit = item.unit_price - product.purchase_price;
          item.product_name = product.name;
          console.log(`[Sales] Item: ${item.product_name}, ID: ${item.product_id}, Profit: ${item.unit_profit}`);
        }

        const saleResult = await db.run(isPostgres 
          ? `INSERT INTO sales (shop_id, user_id, customer_id, total_amount, total_profit, tax_amount, discount_amount, payment_method, payment_status, amount_paid) 
             VALUES ($1::int, $2::int, $3::int, $4::numeric, $5::numeric, $6::numeric, $7::numeric, $8::text, $9::text, $10::numeric) RETURNING id`
          : `INSERT INTO sales (shop_id, user_id, customer_id, total_amount, total_profit, tax_amount, discount_amount, payment_method, payment_status, amount_paid) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          shopId, userId, customer_id || null, total_amount, totalProfit, tax_amount || 0, discount_amount || 0, payment_method || 'cash', payment_status || 'paid', amount_paid || total_amount);
        
        saleId = isPostgres ? saleResult.rows[0].id : saleResult.lastInsertRowid;

        // Update customer debt if applicable
        if (customer_id && (payment_status === 'debt' || payment_status === 'partial')) {
          const debtAmount = total_amount - (amount_paid || 0);
          await db.run(isPostgres 
            ? "UPDATE customers SET total_debt = total_debt + $1::numeric WHERE id = $2::int AND shop_id = $3::int"
            : "UPDATE customers SET total_debt = total_debt + ? WHERE id = ? AND shop_id = ?",
            debtAmount, customer_id, shopId);
        }

        for (const item of items) {
          const totalPrice = item.quantity * item.unit_price;
          await db.run(isPostgres 
            ? "INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, unit_profit, total_price) VALUES ($1::int, $2::int, $3::text, $4::numeric, $5::numeric, $6::numeric, $7::numeric)" 
            : "INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, unit_profit, total_price) VALUES (?, ?, ?, ?, ?, ?, ?)",
            saleId, item.product_id, item.product_name, item.quantity, item.unit_price, item.unit_profit, totalPrice);
          await db.run(isPostgres ? "UPDATE products SET quantity = quantity - $1::numeric WHERE id = $2::int AND shop_id = $3::int" : "UPDATE products SET quantity = quantity - ? WHERE id = ? AND shop_id = ?", item.quantity, item.product_id, shopId);
          
          // Check for low stock after update
          const updatedProduct = await db.get(isPostgres ? "SELECT * FROM products WHERE id = $1::int AND shop_id = $2::int" : "SELECT * FROM products WHERE id = ? AND shop_id = ?", item.product_id, shopId);
          if (updatedProduct.quantity <= updatedProduct.min_quantity) {
            await createNotification(
              shopId, 
              'LOW_STOCK', 
              'Stock Faible', 
              `Le produit "${updatedProduct.name}" est presque épuisé (${updatedProduct.quantity} restants).`
            );
          }
        }
      });

      // Send notification if customer is selected
      if (customer_id) {
        try {
          const customer = await db.get(isPostgres ? "SELECT * FROM customers WHERE id = $1::int" : "SELECT * FROM customers WHERE id = ?", customer_id);
          const shop = await db.get(isPostgres ? "SELECT * FROM shops WHERE id = $1::int" : "SELECT * FROM shops WHERE id = ?", shopId);
          
          if (customer && customer.phone && shop && shop.notification_template) {
            const message = formatNotificationMessage(shop.notification_template, {
              customer_name: customer.name,
              amount: total_amount,
              currency: shop.currency || 'FCFA',
              shop_name: shop.name
            });
            
            if (shop.sms_enabled) {
              await sendNotification(customer.phone, message, 'sms', shopId);
            }
            if (shop.whatsapp_enabled) {
              await sendNotification(customer.phone, message, 'whatsapp', shopId);
            }
          }
        } catch (notifErr) {
          console.error("Failed to send sale notification:", notifErr);
        }
      }

      // Alert manager if sale is made by an employee
      if (req.user.role === 'employee') {
        try {
          const user = await db.get(isPostgres ? "SELECT name FROM users WHERE id = $1::int" : "SELECT name FROM users WHERE id = ?", userId);
          const shop = await db.get(isPostgres ? "SELECT * FROM shops WHERE id = $1::int" : "SELECT * FROM shops WHERE id = ?", shopId);
          await createNotification(
            shopId,
            'SALE_ALERT',
            'Nouvelle Vente',
            `L'employé(e) ${user.name} vient d'effectuer une vente de ${total_amount.toLocaleString()} ${shop.currency || 'FCFA'}.`
          );
        } catch (alertErr) {
          console.error("Failed to send manager alert:", alertErr);
        }
      }

      res.json({ id: saleId });
    } catch (e: any) {
      console.error("Sale error:", e);
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/customers/:id/history", authenticate, async (req: any, res) => {
    try {
      const sales = await db.all(isPostgres 
        ? "SELECT * FROM sales WHERE customer_id = $1::int AND shop_id = $2::int ORDER BY created_at DESC"
        : "SELECT * FROM sales WHERE customer_id = ? AND shop_id = ? ORDER BY created_at DESC",
        req.params.id, req.user.shopId);
      
      const payments = await db.all(isPostgres
        ? "SELECT * FROM customer_payments WHERE customer_id = $1::int AND shop_id = $2::int ORDER BY created_at DESC"
        : "SELECT * FROM customer_payments WHERE customer_id = ? AND shop_id = ? ORDER BY created_at DESC",
        req.params.id, req.user.shopId);

      res.json({ sales, payments });
    } catch (e: any) {
      console.error("Get customer history error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/customers/:id/payments", authenticate, async (req: any, res) => {
    const { amount, payment_method, notes } = req.body;
    const shopId = req.user.shopId;
    const userId = req.user.userId;
    const customerId = req.params.id;

    try {
      // Verify customer belongs to shop
      const customer = await db.get(isPostgres ? "SELECT * FROM customers WHERE id = $1::int AND shop_id = $2::int" : "SELECT * FROM customers WHERE id = ? AND shop_id = ?", customerId, shopId);
      if (!customer) return res.status(404).json({ error: "Client non trouvé" });

      await db.transaction(async () => {
        await db.run(isPostgres
          ? "INSERT INTO customer_payments (shop_id, customer_id, user_id, amount, payment_method, notes) VALUES ($1::int, $2::int, $3::int, $4::numeric, $5::text, $6::text)"
          : "INSERT INTO customer_payments (shop_id, customer_id, user_id, amount, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?)",
          shopId, customerId, userId, amount, payment_method || 'cash', notes || '');

        await db.run(isPostgres
          ? "UPDATE customers SET total_debt = total_debt - $1::numeric WHERE id = $2::int AND shop_id = $3::int"
          : "UPDATE customers SET total_debt = total_debt - ? WHERE id = ? AND shop_id = ?",
          amount, customerId, shopId);
      });

      // Send payment notification
      try {
        const shop = await db.get(isPostgres ? "SELECT * FROM shops WHERE id = $1::int" : "SELECT * FROM shops WHERE id = ?", shopId);
        
        if (customer && customer.phone && shop) {
          const template = shop.notification_template || "Bonjour {customer_name}, nous avons bien reçu votre paiement de {amount} {currency}. Merci !";
          const message = formatNotificationMessage(template, {
            customer_name: customer.name,
            amount: amount,
            currency: shop.currency || 'FCFA',
            shop_name: shop.name
          });
          
          if (shop.sms_enabled) {
            await sendNotification(customer.phone, message, 'sms', shopId);
          }
          if (shop.whatsapp_enabled) {
            await sendNotification(customer.phone, message, 'whatsapp', shopId);
          }
        }
      } catch (notifErr) {
        console.error("Failed to send payment notification:", notifErr);
      }

      res.json({ success: true });
    } catch (e: any) {
      console.error("Add customer payment error:", e);
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/sales/history", authenticate, async (req: any, res) => {
    try {
      const sales = await db.all(isPostgres 
        ? `SELECT s.*, u.name as "userName", COALESCE(sh.name, 'Boutique Inconnue') as "shopName"
           FROM sales s 
           JOIN users u ON s.user_id = u.id 
           LEFT JOIN shops sh ON s.shop_id = sh.id
           WHERE s.shop_id = $1::int 
           ORDER BY s.created_at DESC`
        : `SELECT s.*, u.name as userName, COALESCE(sh.name, 'Boutique Inconnue') as shopName
           FROM sales s 
           JOIN users u ON s.user_id = u.id 
           LEFT JOIN shops sh ON s.shop_id = sh.id
           WHERE s.shop_id = ? 
           ORDER BY s.created_at DESC`,
        req.user.shopId);
      res.json(sales);
    } catch (e: any) {
      console.error("Get sales history error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/sales/:id", authenticate, async (req: any, res) => {
    try {
      const sale = await db.get(isPostgres
        ? `SELECT s.*, u.name as userName, COALESCE(sh.name, 'Boutique Inconnue') as shopName, sh.address as shopAddress, sh.phone as shopPhone, sh.logo_url, sh.receipt_footer, sh.currency, sh.show_tax,
                 c.name as customerName, c.phone as customerPhone, c.address as customerAddress
          FROM sales s 
          JOIN users u ON s.user_id = u.id 
          LEFT JOIN shops sh ON s.shop_id = sh.id
          LEFT JOIN customers c ON s.customer_id = c.id
          WHERE s.id = $1::int AND s.shop_id = $2::int`
        : `SELECT s.*, u.name as userName, COALESCE(sh.name, 'Boutique Inconnue') as shopName, sh.address as shopAddress, sh.phone as shopPhone, sh.logo_url, sh.receipt_footer, sh.currency, sh.show_tax,
                 c.name as customerName, c.phone as customerPhone, c.address as customerAddress
          FROM sales s 
          JOIN users u ON s.user_id = u.id 
          LEFT JOIN shops sh ON s.shop_id = sh.id
          LEFT JOIN customers c ON s.customer_id = c.id
          WHERE s.id = ? AND s.shop_id = ?`,
        req.params.id, req.user.shopId);

      if (!sale) return res.status(404).json({ error: "Vente non trouvée" });

      const items = await db.all(isPostgres
        ? `SELECT si.*, COALESCE(si.product_name, p.name, 'Produit Inconnu') as "productName"
          FROM sale_items si
          LEFT JOIN products p ON si.product_id = p.id
          WHERE si.sale_id = $1::int`
        : `SELECT si.*, COALESCE(si.product_name, p.name, 'Produit Inconnu') as productName
          FROM sale_items si
          LEFT JOIN products p ON si.product_id = p.id
          WHERE si.sale_id = ?`,
        req.params.id);

      res.json({ ...sale, items });
    } catch (e: any) {
      console.error("Get sale error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // User Management (for shop owners)
  app.get("/api/users", authenticate, async (req: any, res) => {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ error: "Accès refusé" });
    }
    try {
      const users = await db.all(isPostgres
        ? "SELECT id, name, email, role, created_at FROM users WHERE shop_id = $1::int AND role != 'admin' ORDER BY created_at DESC"
        : "SELECT id, name, email, role, created_at FROM users WHERE shop_id = ? AND role != 'admin' ORDER BY created_at DESC",
        req.user.shopId);
      res.json(users);
    } catch (e: any) {
      console.error("Get users error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/users", authenticate, async (req: any, res) => {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ error: "Accès refusé" });
    }
    const { name, email, password, role } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await db.run(isPostgres
        ? "INSERT INTO users (name, email, password_hash, role, shop_id) VALUES ($1::text, $2::text, $3::text, $4::text, $5::int) RETURNING id"
        : "INSERT INTO users (name, email, password_hash, role, shop_id) VALUES (?, ?, ?, ?, ?)",
        name, email, hashedPassword, role || 'employee', req.user.shopId);
      
      const newUserId = isPostgres ? result.rows[0].id : result.lastInsertRowid;
      res.json({ id: newUserId, name, email, role: role || 'employee' });
    } catch (e: any) {
      console.error("Create user error:", e);
      if (e.message.includes('UNIQUE constraint failed') || e.message.includes('duplicate key value')) {
        return res.status(400).json({ error: "Cet email est déjà utilisé" });
      }
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/users/:id", authenticate, async (req: any, res) => {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ error: "Accès refusé" });
    }
    const { name, email, role, password } = req.body;
    try {
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.run(isPostgres
          ? "UPDATE users SET name = $1::text, email = $2::text, role = $3::text, password_hash = $4::text WHERE id = $5::int AND shop_id = $6::int"
          : "UPDATE users SET name = ?, email = ?, role = ?, password_hash = ? WHERE id = ? AND shop_id = ?",
          name, email, role, hashedPassword, req.params.id, req.user.shopId);
      } else {
        await db.run(isPostgres
          ? "UPDATE users SET name = $1::text, email = $2::text, role = $3::text WHERE id = $4::int AND shop_id = $5::int"
          : "UPDATE users SET name = ?, email = ?, role = ? WHERE id = ? AND shop_id = ?",
          name, email, role, req.params.id, req.user.shopId);
      }
      res.json({ success: true });
    } catch (e: any) {
      console.error("Update user error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/users/:id", authenticate, async (req: any, res) => {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ error: "Accès refusé" });
    }
    try {
      // Don't allow deleting yourself
      if (parseInt(req.params.id) === req.user.userId) {
        return res.status(400).json({ error: "Vous ne pouvez pas supprimer votre propre compte" });
      }
      await db.run(isPostgres
        ? "DELETE FROM users WHERE id = $1::int AND shop_id = $2::int"
        : "DELETE FROM users WHERE id = ? AND shop_id = ?",
        req.params.id, req.user.shopId);
      res.json({ success: true });
    } catch (e: any) {
      console.error("Delete user error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/dashboard/stats", authenticate, async (req: any, res) => {
    try {
      const shopId = req.user.shopId;
      const filterDate = req.query.date; // YYYY-MM-DD
      
      const salesTodaySql = isPostgres 
        ? `SELECT SUM(total_amount) as total FROM sales WHERE shop_id = $1::int AND created_at::date = ${filterDate ? '$2::date' : 'CURRENT_DATE'}`
        : `SELECT SUM(total_amount) as total FROM sales WHERE shop_id = ? AND date(created_at) = ${filterDate ? '?' : "date('now')"}`;
      
      const profitTodaySql = isPostgres
        ? `SELECT SUM(total_profit) as total FROM sales WHERE shop_id = $1::int AND created_at::date = ${filterDate ? '$2::date' : 'CURRENT_DATE'}`
        : `SELECT SUM(total_profit) as total FROM sales WHERE shop_id = ? AND date(created_at) = ${filterDate ? '?' : "date('now')"}`;

      const expensesTodaySql = isPostgres
        ? `SELECT SUM(amount) as total FROM expenses WHERE shop_id = $1::int AND date::date = ${filterDate ? '$2::date' : 'CURRENT_DATE'}`
        : `SELECT SUM(amount) as total FROM expenses WHERE shop_id = ? AND date(date) = ${filterDate ? '?' : "date('now')"}`;
  
      const recentSalesSql = isPostgres
        ? `SELECT created_at::date as date, SUM(total_amount) as amount 
           FROM sales 
           WHERE shop_id = $1::int AND created_at >= ${filterDate ? '$2::date' : 'CURRENT_DATE'} - INTERVAL '7 days'
           GROUP BY created_at::date
           ORDER BY date`
        : `SELECT date(created_at) as date, SUM(total_amount) as amount 
           FROM sales 
           WHERE shop_id = ? AND created_at >= date(${filterDate ? '?' : "'now'"}, '-7 days')
           GROUP BY date(created_at)
           ORDER BY date`;
  
      const params = filterDate ? [shopId, filterDate] : [shopId];

      const salesToday = await db.get(salesTodaySql, ...params);
      const profitToday = await db.get(profitTodaySql, ...params);
      const expensesToday = await db.get(expensesTodaySql, ...params);
      const lowStock = await db.get(isPostgres ? "SELECT COUNT(*) as count FROM products WHERE shop_id = $1::int AND quantity <= min_quantity" : "SELECT COUNT(*) as count FROM products WHERE shop_id = ? AND quantity <= min_quantity", shopId);
      const totalProducts = await db.get(isPostgres ? "SELECT COUNT(*) as count FROM products WHERE shop_id = $1::int" : "SELECT COUNT(*) as count FROM products WHERE shop_id = ?", shopId);
      const totalStock = await db.get(isPostgres ? "SELECT SUM(quantity) as total FROM products WHERE shop_id = $1::int" : "SELECT SUM(quantity) as total FROM products WHERE shop_id = ?", shopId);
      const totalDebt = await db.get(isPostgres ? "SELECT SUM(total_debt) as total FROM customers WHERE shop_id = $1::int" : "SELECT SUM(total_debt) as total FROM customers WHERE shop_id = ?", shopId);
      const recentSales = await db.all(recentSalesSql, ...params);
  
      res.json({
        salesToday: salesToday?.total || 0,
        profitToday: profitToday?.total || 0,
        expensesToday: expensesToday?.total || 0,
        lowStockCount: lowStock?.count || 0,
        totalProducts: totalProducts?.count || 0,
        totalStock: totalStock?.total || 0,
        totalDebt: totalDebt?.total || 0,
        recentSales
      });
    } catch (e: any) {
      console.error("Dashboard stats error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // AI Insights Data Route
  app.get("/api/ai/insights-data", authenticate, async (req: any, res) => {
    try {
      const shopId = req.user.shopId;
      const products = await db.all(isPostgres ? "SELECT * FROM products WHERE shop_id = $1::int" : "SELECT * FROM products WHERE shop_id = ?", shopId);
      const categories = await db.all(isPostgres ? "SELECT * FROM categories WHERE shop_id = $1::int" : "SELECT * FROM categories WHERE shop_id = ?", shopId);
      const expenses = await db.all(isPostgres ? 
        "SELECT * FROM expenses WHERE shop_id = $1::int AND created_at >= CURRENT_DATE - INTERVAL '30 days'" : 
        "SELECT * FROM expenses WHERE shop_id = ? AND created_at >= date('now', '-30 days')", 
        shopId
      );
      
      const salesSql = isPostgres
        ? `SELECT s.total_amount, s.total_profit, s.created_at, si.quantity, COALESCE(si.product_name, p.name) as "productName", p.category_id
           FROM sales s
           JOIN sale_items si ON s.id = si.sale_id
           LEFT JOIN products p ON si.product_id = p.id
           WHERE s.shop_id = $1::int AND s.created_at >= CURRENT_DATE - INTERVAL '30 days'`
        : `SELECT s.total_amount, s.total_profit, s.created_at, si.quantity, COALESCE(si.product_name, p.name) as productName, p.category_id
           FROM sales s
           JOIN sale_items si ON s.id = si.sale_id
           LEFT JOIN products p ON si.product_id = p.id
           WHERE s.shop_id = ? AND s.created_at >= date('now', '-30 days')`;

      const sales = await db.all(salesSql, shopId);
      res.json({ products, sales, categories, expenses });
    } catch (e: any) {
      console.error("AI insights data error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Admin Routes
  app.get("/api/admin/stats", authenticate, isAdmin, async (req, res) => {
    try {
      const totalShops = await db.get("SELECT COUNT(*) as count FROM shops");
      const totalUsers = await db.get("SELECT COUNT(*) as count FROM users");
      const totalSales = await db.get("SELECT SUM(total_amount) as total FROM sales");
      const totalProfit = await db.get("SELECT SUM(total_profit) as total FROM sales");
      const premiumShops = await db.get("SELECT COUNT(*) as count FROM shops WHERE plan = 'premium'");
      const totalSubscriptionRevenue = await db.get("SELECT COUNT(*) * 10000 as total FROM subscription_requests WHERE status = 'approved'");

      // Chart data: Subscription revenue (10000 per approved subscription)
      const subscriptionsByDaySql = isPostgres
        ? `SELECT created_at::date as date, COUNT(*) * 10000 as amount 
           FROM subscription_requests 
           WHERE status = 'approved' AND created_at >= CURRENT_DATE - INTERVAL '30 days'
           GROUP BY created_at::date
           ORDER BY date`
        : `SELECT date(created_at) as date, COUNT(*) * 10000 as amount 
           FROM subscription_requests 
           WHERE status = 'approved' AND created_at >= date('now', '-30 days')
           GROUP BY date(created_at)
           ORDER BY date`;

      const subscriptionsByDay = await db.all(subscriptionsByDaySql);

      const recentUsers = await db.all(`
        SELECT u.id, u.name, u.email, u.created_at, s.name as shopName
        FROM users u
        LEFT JOIN shops s ON u.shop_id = s.id
        ORDER BY u.created_at DESC
        LIMIT 5
      `);

      const recentSubscriptions = await db.all(`
        SELECT sr.id, sr.plan, sr.payment_method, sr.created_at, sh.name as shopName, u.name as userName
        FROM subscription_requests sr
        JOIN shops sh ON sr.shop_id = sh.id
        JOIN users u ON sr.user_id = u.id
        ORDER BY sr.created_at DESC
        LIMIT 5
      `);

      res.json({
        totalShops: totalShops.count,
        totalUsers: totalUsers.count,
        totalSales: totalSales.total || 0,
        totalProfit: totalProfit.total || 0,
        premiumShops: premiumShops.count,
        totalSubscriptionRevenue: totalSubscriptionRevenue.total || 0,
        subscriptionsByDay,
        recentUsers,
        recentSubscriptions
      });
    } catch (err: any) {
      console.error("Admin stats error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/shops", authenticate, isAdmin, async (req, res) => {
    try {
      const shops = await db.all(`
        SELECT s.*, 
          (SELECT COUNT(*) FROM users WHERE shop_id = s.id) as userCount,
          (SELECT COUNT(*) FROM products WHERE shop_id = s.id) as productCount,
          (SELECT SUM(total_amount) FROM sales WHERE shop_id = s.id) as totalSales
        FROM shops s
      `);
      res.json(shops);
    } catch (e: any) {
      console.error("Admin get shops error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Admin Shop Management
  app.post("/api/admin/users/create-admin", authenticate, isAdmin, async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Tous les champs sont obligatoires." });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const result = await db.run(isPostgres 
        ? "INSERT INTO users (name, email, password_hash, role, shop_id) VALUES ($1::text, $2::text, $3::text, 'admin', NULL) RETURNING id" 
        : "INSERT INTO users (name, email, password_hash, role, shop_id) VALUES (?, ?, ?, 'admin', NULL)",
        name, email, passwordHash);
      
      const userId = isPostgres ? result.rows[0].id : result.lastInsertRowid;
      
      await logAdminAction((req as any).user.userId, 'CREATE_ADMIN', `New Admin: ${email} (ID: ${userId})`, req.ip);
      
      res.status(201).json({ success: true, userId });
    } catch (e: any) {
      console.error("Create admin error:", e);
      if (e.message.includes("unique constraint") || e.message.includes("UNIQUE constraint")) {
        return res.status(400).json({ error: "Cet email est déjà utilisé." });
      }
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/shops/:id/block", authenticate, isAdmin, async (req, res) => {
    try {
      const { status } = req.body; // 'blocked' or 'active'
      await db.run(isPostgres ? "UPDATE shops SET status = $1::text WHERE id = $2::int" : "UPDATE shops SET status = ? WHERE id = ?", status, req.params.id);
      
      await logAdminAction((req as any).user.userId, status === 'blocked' ? 'BLOCK_SHOP' : 'UNBLOCK_SHOP', `Shop ID: ${req.params.id}`, req.ip);
      
      res.json({ success: true });
    } catch (e: any) {
      console.error("Block shop error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/shops/:id/signal", authenticate, isAdmin, async (req, res) => {
    try {
      const { signaled } = req.body; // 1 or 0
      await db.run(isPostgres ? "UPDATE shops SET is_signaled = $1::int WHERE id = $2::int" : "UPDATE shops SET is_signaled = ? WHERE id = ?", signaled ? 1 : 0, req.params.id);
      
      await logAdminAction((req as any).user.userId, signaled ? 'SIGNAL_SHOP' : 'UNSIGNAL_SHOP', `Shop ID: ${req.params.id}`, req.ip);
      
      res.json({ success: true });
    } catch (e: any) {
      console.error("Signal shop error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/admin/shops/:id", authenticate, isAdmin, async (req, res) => {
    const shopId = req.params.id;
    try {
      await db.transaction(async () => {
        // Thorough cleanup to avoid foreign key issues
        await db.run(isPostgres ? "DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE shop_id = $1::int)" : "DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE shop_id = ?)", shopId);
        await db.run(isPostgres ? "DELETE FROM sale_items WHERE product_id IN (SELECT id FROM products WHERE shop_id = $1::int)" : "DELETE FROM sale_items WHERE product_id IN (SELECT id FROM products WHERE shop_id = ?)", shopId);
        await db.run(isPostgres ? "DELETE FROM sales WHERE shop_id = $1::int" : "DELETE FROM sales WHERE shop_id = ?", shopId);
        await db.run(isPostgres ? "DELETE FROM customer_payments WHERE shop_id = $1::int" : "DELETE FROM customer_payments WHERE shop_id = ?", shopId);
        await db.run(isPostgres ? "DELETE FROM expenses WHERE shop_id = $1::int" : "DELETE FROM expenses WHERE shop_id = ?", shopId);
        await db.run(isPostgres ? "DELETE FROM products WHERE shop_id = $1::int" : "DELETE FROM products WHERE shop_id = ?", shopId);
        await db.run(isPostgres ? "DELETE FROM categories WHERE shop_id = $1::int" : "DELETE FROM categories WHERE shop_id = ?", shopId);
        await db.run(isPostgres ? "DELETE FROM suppliers WHERE shop_id = $1::int" : "DELETE FROM suppliers WHERE shop_id = ?", shopId);
        await db.run(isPostgres ? "DELETE FROM customers WHERE shop_id = $1::int" : "DELETE FROM customers WHERE shop_id = ?", shopId);
        await db.run(isPostgres ? "DELETE FROM notifications WHERE shop_id = $1::int" : "DELETE FROM notifications WHERE shop_id = ?", shopId);
        await db.run(isPostgres ? "DELETE FROM subscription_requests WHERE shop_id = $1::int" : "DELETE FROM subscription_requests WHERE shop_id = ?", shopId);
        await db.run(isPostgres ? "DELETE FROM users WHERE shop_id = $1::int" : "DELETE FROM users WHERE shop_id = ?", shopId);
        await db.run(isPostgres ? "DELETE FROM shops WHERE id = $1::int" : "DELETE FROM shops WHERE id = ?", shopId);
      });
      
      await logAdminAction((req as any).user.userId, 'DELETE_SHOP', `Shop ID: ${shopId}`, req.ip);
      
      res.json({ success: true });
    } catch (err: any) {
      console.error("Delete shop error:", err);
      res.status(500).json({ error: "Erreur lors de la suppression de la boutique: " + err.message });
    }
  });

  app.get("/api/admin/users", authenticate, isAdmin, async (req, res) => {
    try {
      const users = await db.all(`
        SELECT u.*, s.name as shopName 
        FROM users u
        LEFT JOIN shops s ON u.shop_id = s.id
        ORDER BY u.created_at DESC
      `);
      res.json(users);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/admin/users/:id", authenticate, isAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      // Don't allow deleting the super admin
      const user = await db.get(isPostgres ? "SELECT email FROM users WHERE id = $1::int" : "SELECT email FROM users WHERE id = ?", userId);
      const superAdmins = ['baye@gmail.com', 'kobarbayedame6@gmail.com'];
      if (superAdmins.includes(user?.email)) {
        return res.status(403).json({ error: "Impossible de supprimer un administrateur principal." });
      }
      await db.run(isPostgres ? "DELETE FROM users WHERE id = $1::int" : "DELETE FROM users WHERE id = ?", userId);
      
      await logAdminAction((req as any).user.userId, 'DELETE_USER', `User ID: ${userId} (${user?.email})`, req.ip);
      
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/broadcast", authenticate, isAdmin, async (req, res) => {
    try {
      const { title, message, shopId, type = 'SYSTEM' } = req.body;
      
      // Save broadcast history
      await db.run(isPostgres 
        ? "INSERT INTO broadcasts (title, message, type, target_shop_id) VALUES ($1::text, $2::text, $3::text, $4::int)"
        : "INSERT INTO broadcasts (title, message, type, target_shop_id) VALUES (?, ?, ?, ?)",
        title, message, type, shopId || null);

      if (shopId) {
        // Send to specific shop
        await createNotification(shopId, type, title, message);
        broadcastToShop(shopId, { type: 'NOTIFICATION', payload: { title, message } });
      } else {
        // Broadcast to ALL shops
        const shops = await db.all("SELECT id FROM shops");
        for (const shop of shops) {
          await createNotification(shop.id, type, title, message);
          broadcastToShop(shop.id, { type: 'NOTIFICATION', payload: { title, message } });
        }
      }
      
      await logAdminAction((req as any).user.userId, 'SEND_BROADCAST', `Title: ${title}`, req.ip);
      
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/broadcasts", authenticate, isAdmin, async (req, res) => {
    try {
      const broadcasts = await db.all(isPostgres
        ? "SELECT b.*, s.name as shopName FROM broadcasts b LEFT JOIN shops s ON b.target_shop_id = s.id ORDER BY b.created_at DESC"
        : "SELECT b.*, s.name as shopName FROM broadcasts b LEFT JOIN shops s ON b.target_shop_id = s.id ORDER BY b.created_at DESC");
      res.json(broadcasts);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/subscription-requests", authenticate, isAdmin, async (req, res) => {
    try {
      const requests = await db.all(`
        SELECT sr.*, s.name as shopName, u.name as userName 
        FROM subscription_requests sr
        JOIN shops s ON sr.shop_id = s.id
        JOIN users u ON sr.user_id = u.id
        ORDER BY sr.created_at DESC
      `);
      res.json(requests);
    } catch (e: any) {
      console.error("Admin get subscription requests error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/subscription-requests/:id/approve", authenticate, isAdmin, async (req, res) => {
    console.log(`[Approve] Request received for ID: ${req.params.id}`);
    const requestId = parseInt(req.params.id);
    if (isNaN(requestId)) {
      console.log(`[Approve] Invalid ID: ${req.params.id}`);
      return res.status(400).json({ error: "Invalid request ID" });
    }

    const request = await db.get(isPostgres ? "SELECT * FROM subscription_requests WHERE id = $1::int" : "SELECT * FROM subscription_requests WHERE id = ?", requestId);
    if (!request) {
      console.log(`[Approve] Request ${requestId} not found in DB`);
      return res.status(404).json({ error: "Request not found" });
    }

    console.log(`[Approve] Found request for shop ${request.shop_id}, plan ${request.plan}`);
 
    try {
      await db.transaction(async () => {
        console.log(`[Approve] Updating request status...`);
        await db.run(isPostgres ? "UPDATE subscription_requests SET status = 'approved' WHERE id = $1::int" : "UPDATE subscription_requests SET status = 'approved' WHERE id = ?", requestId);
        
        console.log(`[Approve] Fetching current shop status...`);
        const shop = await db.get(isPostgres ? "SELECT plan, subscription_expires_at FROM shops WHERE id = $1::int" : "SELECT plan, subscription_expires_at FROM shops WHERE id = ?", request.shop_id);
        
        const durationMonths = request.duration_months || 1;
        let expiresAt = new Date();
        
        // If shop already has an active subscription, extend it from the current expiry date
        if (shop && shop.plan !== 'free' && shop.subscription_expires_at) {
          const currentExpiry = new Date(shop.subscription_expires_at);
          if (currentExpiry > new Date()) {
            expiresAt = currentExpiry;
          }
        }
        
        expiresAt.setMonth(expiresAt.getMonth() + durationMonths);
        const expiresAtStr = expiresAt.toISOString().replace('T', ' ').replace('Z', '');

        console.log(`[Approve] Updating shop plan to ${request.plan}, expires at ${expiresAtStr}`);
        await db.run(isPostgres 
          ? "UPDATE shops SET plan = $1::text, subscription_expires_at = $2::timestamp, status = 'active', has_ai_features = $4::int WHERE id = $3::int" 
          : "UPDATE shops SET plan = ?, subscription_expires_at = ?, status = 'active', has_ai_features = ? WHERE id = ?", 
          request.plan, expiresAtStr, request.shop_id, request.plan === 'premium' ? 1 : 0);
        
        console.log(`[Approve] Creating notification...`);
        await createNotification(
          request.shop_id,
          'SUBSCRIPTION_APPROVED',
          'Abonnement Activé !',
          `Félicitations ! Votre demande d'abonnement ${request.plan} a été approuvée. Profitez de vos nouvelles fonctionnalités.`
        );

        broadcastToShop(request.shop_id, { type: 'PLAN_UPDATED', payload: { plan: request.plan } });
      });
      
      await logAdminAction((req as any).user.userId, 'APPROVE_SUBSCRIPTION', `Request ID: ${requestId}, Shop ID: ${request.shop_id}, Plan: ${request.plan}`, req.ip);
      
      console.log(`[Approve] Success for request ${requestId}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Approve] Transaction error:", error);
      res.status(500).json({ error: "Failed to approve subscription: " + error.message });
    }
  });

  app.post("/api/admin/subscription-requests/:id/reject", authenticate, isAdmin, async (req, res) => {
    console.log(`[Reject] Request received for ID: ${req.params.id}`);
    const requestId = parseInt(req.params.id);
    if (isNaN(requestId)) {
      console.log(`[Reject] Invalid ID: ${req.params.id}`);
      return res.status(400).json({ error: "Invalid request ID" });
    }

    const request = await db.get(isPostgres ? "SELECT * FROM subscription_requests WHERE id = $1::int" : "SELECT * FROM subscription_requests WHERE id = ?", requestId);
    if (!request) {
      console.log(`[Reject] Request ${requestId} not found in DB`);
      return res.status(404).json({ error: "Request not found" });
    }

    try {
      console.log(`[Reject] Updating request status...`);
      await db.run(isPostgres ? "UPDATE subscription_requests SET status = 'rejected' WHERE id = $1::int" : "UPDATE subscription_requests SET status = 'rejected' WHERE id = ?", requestId);
      
      console.log(`[Reject] Creating notification...`);
      await createNotification(
        request.shop_id,
        'SUBSCRIPTION_REJECTED',
        'Abonnement Refusé',
        `Votre demande d'abonnement a été refusée. Veuillez vérifier vos informations de paiement ou contacter le support.`
      );

      await logAdminAction((req as any).user.userId, 'REJECT_SUBSCRIPTION', `Request ID: ${requestId}, Shop ID: ${request.shop_id}`, req.ip);

      console.log(`[Reject] Success for request ${requestId}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Reject] Error:", error);
      res.status(500).json({ error: "Failed to reject subscription: " + error.message });
    }
  });

  // Admin Logs & Settings
  app.get("/api/admin/logs", authenticate, isAdmin, async (req, res) => {
    try {
      const logs = await db.all(isPostgres
        ? "SELECT l.*, u.name as userName, u.email as userEmail FROM audit_logs l LEFT JOIN users u ON l.user_id = u.id ORDER BY l.created_at DESC LIMIT 100"
        : "SELECT l.*, u.name as userName, u.email as userEmail FROM audit_logs l LEFT JOIN users u ON l.user_id = u.id ORDER BY l.created_at DESC LIMIT 100");
      res.json(logs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/settings", authenticate, isAdmin, async (req, res) => {
    try {
      const settings = await db.all("SELECT * FROM platform_settings");
      const settingsMap = settings.reduce((acc: any, s: any) => {
        acc[s.key] = s.value;
        return acc;
      }, {});
      res.json(settingsMap);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/settings", authenticate, isAdmin, async (req, res) => {
    try {
      const settings = req.body;
      await db.transaction(async () => {
        for (const [key, value] of Object.entries(settings)) {
          if (isPostgres) {
            await db.run(`
              INSERT INTO platform_settings (key, value, updated_at) 
              VALUES ($1::text, $2::text, CURRENT_TIMESTAMP)
              ON CONFLICT (key) DO UPDATE SET value = $2::text, updated_at = CURRENT_TIMESTAMP
            `, key, String(value));
          } else {
            await db.run("INSERT OR REPLACE INTO platform_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)", key, String(value));
          }
        }
      });
      
      await logAdminAction((req as any).user.userId, 'UPDATE_SETTINGS', 'Updated platform settings', req.ip);
      
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Notifications Routes
  app.get("/api/notifications", authenticate, async (req: any, res) => {
    try {
      const notifications = await db.all(isPostgres ? "SELECT * FROM notifications WHERE shop_id = $1::int ORDER BY created_at DESC LIMIT 50" : "SELECT * FROM notifications WHERE shop_id = ? ORDER BY created_at DESC LIMIT 50", req.user.shopId);
      res.json(notifications);
    } catch (e: any) {
      console.error("Get notifications error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Expense Routes
  app.get("/api/expenses", authenticate, async (req: any, res) => {
    try {
      const expenses = await db.all(isPostgres 
        ? "SELECT e.*, u.name as userName FROM expenses e JOIN users u ON e.user_id = u.id WHERE e.shop_id = $1::int ORDER BY e.date DESC" 
        : "SELECT e.*, u.name as userName FROM expenses e JOIN users u ON e.user_id = u.id WHERE e.shop_id = ? ORDER BY e.date DESC", 
        req.user.shopId);
      res.json(expenses);
    } catch (e: any) {
      console.error("Get expenses error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/expenses", authenticate, async (req: any, res) => {
    try {
      let { title, amount, category, description, date } = req.body;
      
      // Ensure amount is a number if it's a string
      if (typeof amount === 'string') {
        amount = parseFloat(amount.replace(',', '.'));
      }

      if (!title || amount === undefined || amount === null || isNaN(amount) || !category) {
        return res.status(400).json({ error: "Le titre, le montant et la catégorie sont obligatoires." });
      }
      const result = await db.run(isPostgres 
        ? "INSERT INTO expenses (shop_id, user_id, title, amount, category, description, date) VALUES ($1::int, $2::int, $3::text, $4::numeric, $5::text, $6::text, $7::timestamp) RETURNING id"
        : "INSERT INTO expenses (shop_id, user_id, title, amount, category, description, date) VALUES (?, ?, ?, ?, ?, ?, ?)",
        req.user.shopId, req.user.userId, title, amount, category, description, date || new Date().toISOString());
      const expenseId = isPostgres ? result.rows[0].id : result.lastInsertRowid;
      res.json({ id: expenseId });
    } catch (e: any) {
      console.error("Create expense error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/expenses/:id", authenticate, async (req: any, res) => {
    try {
      await db.run(isPostgres ? "DELETE FROM expenses WHERE id = $1::int AND shop_id = $2::int" : "DELETE FROM expenses WHERE id = ? AND shop_id = ?", req.params.id, req.user.shopId);
      res.json({ success: true });
    } catch (e: any) {
      console.error("Delete expense error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Daily Closing Report Route
  app.get("/api/reports/daily-closing", authenticate, async (req: any, res) => {
    try {
      const shopId = req.user.shopId;
      const date = req.query.date || new Date().toISOString().split('T')[0];

      const salesByMethodSql = isPostgres
        ? "SELECT payment_method, SUM(total_amount) as total, COUNT(*) as count FROM sales WHERE shop_id = $1::int AND created_at::date = $2::date GROUP BY payment_method"
        : "SELECT payment_method, SUM(total_amount) as total, COUNT(*) as count FROM sales WHERE shop_id = ? AND date(created_at) = ? GROUP BY payment_method";

      const expensesSql = isPostgres
        ? "SELECT category, SUM(amount) as total FROM expenses WHERE shop_id = $1::int AND date::date = $2::date GROUP BY category"
        : "SELECT category, SUM(amount) as total FROM expenses WHERE shop_id = ? AND date(date) = ? GROUP BY category";

      const [salesByMethod, expenses] = await Promise.all([
        db.all(salesByMethodSql, shopId, date),
        db.all(expensesSql, shopId, date)
      ]);

      const totalSales = salesByMethod.reduce((sum: number, s: any) => sum + (s.total || 0), 0);
      const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (e.total || 0), 0);

      res.json({
        date,
        salesByMethod,
        expenses,
        totalSales,
        totalExpenses,
        netCash: totalSales - totalExpenses
      });
    } catch (e: any) {
      console.error("Daily closing report error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/notifications/read-all", authenticate, async (req: any, res) => {
    try {
      await db.run(isPostgres ? "UPDATE notifications SET is_read = 1 WHERE shop_id = $1::int" : "UPDATE notifications SET is_read = 1 WHERE shop_id = ?", req.user.shopId);
      res.json({ success: true });
    } catch (e: any) {
      console.error("Read all notifications error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/notifications/:id/read", authenticate, async (req: any, res) => {
    try {
      await db.run(isPostgres ? "UPDATE notifications SET is_read = 1 WHERE id = $1::int AND shop_id = $2::int" : "UPDATE notifications SET is_read = 1 WHERE id = ? AND shop_id = ?", req.params.id, req.user.shopId);
      res.json({ success: true });
    } catch (e: any) {
      console.error("Read notification error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // API 404 handler - must be before Vite/Static middleware
  app.use("/api", (req, res) => {
    console.log(`API 404: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ 
      error: "API route not found", 
      method: req.method, 
      path: req.originalUrl 
    });
  });

  // Global Error Handler for API
  app.use((err: any, req: any, res: any, next: any) => {
    if (req.path.startsWith('/api/')) {
      console.error("API Error:", err);
      return res.status(err.status || 500).json({ 
        error: err.message || "Internal Server Error",
        path: req.path
      });
    }
    next(err);
  });

  // Vite middleware for development
  async function startServerSetup() {
    if (process.env.NODE_ENV !== "production") {
      try {
        const { createServer: createViteServer } = await import("vite");
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: "spa",
        });
        app.use(vite.middlewares);
      } catch (e) {
        console.error("Failed to load Vite:", e);
      }
    } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      const indexPath = path.join(__dirname, "dist", "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Frontend not built. Run npm run build.");
      }
    });
  }

  // Subscription Automation Task
  const runSubscriptionAutomation = async () => {
    console.log("[Automation] Running subscription checks...");
    try {
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
      const oneMonthAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

      const nowStr = now.toISOString().replace('T', ' ').replace('Z', '');
      const threeDaysStr = threeDaysFromNow.toISOString().replace('T', ' ').replace('Z', '');
      const oneMonthAgoStr = oneMonthAgo.toISOString().replace('T', ' ').replace('Z', '');

      // 1. Reminders (3 days before)
      const shopsToRemind = await db.all(
        isPostgres 
          ? "SELECT id, name FROM shops WHERE plan != 'free' AND status = 'active' AND subscription_expires_at <= $1::timestamp AND subscription_expires_at > $2::timestamp"
          : "SELECT id, name FROM shops WHERE plan != 'free' AND status = 'active' AND subscription_expires_at <= ? AND subscription_expires_at > ?",
        threeDaysStr, nowStr
      );

      for (const shop of shopsToRemind) {
        await createNotification(
          shop.id,
          'SUBSCRIPTION_REMINDER',
          'Rappel d\'abonnement',
          `Votre abonnement expire dans moins de 3 jours. Veuillez renouveler pour éviter toute interruption.`
        );
      }

      // 2. Expiry (Move to grace period)
      const expiredShops = await db.all(
        isPostgres
          ? "SELECT id FROM shops WHERE plan != 'free' AND status = 'active' AND subscription_expires_at <= $1::timestamp"
          : "SELECT id FROM shops WHERE plan != 'free' AND status = 'active' AND subscription_expires_at <= ?",
        nowStr
      );

      for (const shop of expiredShops) {
        await db.run(
          isPostgres ? "UPDATE shops SET status = 'grace_period' WHERE id = $1::int" : "UPDATE shops SET status = 'grace_period' WHERE id = ?",
          shop.id
        );
        await createNotification(
          shop.id,
          'SUBSCRIPTION_EXPIRED',
          'Abonnement Expiré',
          `Votre abonnement a expiré. Vous êtes maintenant en période de grâce de 30 jours avant la suppression de vos données.`
        );
        broadcastToShop(shop.id, { type: 'SUBSCRIPTION_EXPIRED', payload: { status: 'grace_period' } });
      }

      // 3. Deletion (After 1 month of grace period)
      const shopsToDelete = await db.all(
        isPostgres
          ? "SELECT id FROM shops WHERE status = 'grace_period' AND subscription_expires_at <= $1::timestamp"
          : "SELECT id FROM shops WHERE status = 'grace_period' AND subscription_expires_at <= ?",
        oneMonthAgoStr
      );

      for (const shop of shopsToDelete) {
        console.log(`[Automation] Deleting shop ${shop.id} due to long-term expiry`);
        await db.transaction(async () => {
          await db.run(isPostgres ? "DELETE FROM shops WHERE id = $1::int" : "DELETE FROM shops WHERE id = ?", shop.id);
        });
      }

    } catch (err) {
      console.error("[Automation] Error in subscription automation:", err);
    }
  };

  // Run every 24 hours
  if (!process.env.VERCEL) {
    setInterval(runSubscriptionAutomation, 24 * 60 * 60 * 1000);
    // Also run once on startup after a short delay
    setTimeout(runSubscriptionAutomation, 10000);
  }

  const server = http.createServer(app);
  try {
    const { WebSocketServer } = await import("ws");
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        ws.close();
        return;
      }

      jwtVerify(token, JWT_SECRET).then(({ payload }: any) => {
        const shopId = payload.shopId;
        if (!clients.has(shopId)) {
          clients.set(shopId, new Set());
        }
        clients.get(shopId)!.add(ws);

        ws.on('close', () => {
          clients.get(shopId)?.delete(ws);
          if (clients.get(shopId)?.size === 0) {
            clients.delete(shopId);
          }
        });
      }).catch(() => {
        ws.close();
      });
    });
  } catch (e) {
    console.error("Failed to load WebSocket server:", e);
  }

  if (!process.env.VERCEL) {
    const PORT = 3000;
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
      console.log(`Database mode: ${isPostgres ? 'PostgreSQL' : 'SQLite'}`);
      if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
        console.warn("⚠️ WARNING: JWT_SECRET is missing. Using default secret. Set it in Settings for security.");
      }
    });
  }
}

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server setup (top-level await)
startServerSetup().catch(err => console.error("Startup error:", err));

console.log("[Server] Module loaded and ready.");
export default app;
