'use strict';
// Migrates data from local data/store.db (SQLite) to PostgreSQL (Neon)
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { Pool } = require('pg');

let connectionString = process.env.DATABASE_URL;
if (!connectionString && fs.existsSync(path.join(__dirname, '.env'))) {
  const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^DATABASE_URL\s*=\s*(.*)$/);
    if (match) {
      connectionString = match[1].trim().replace(/^['"]|['"]$/g, '');
      break;
    }
  }
}

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const sqliteFile = path.join(DATA_DIR, 'store.db');

if (!fs.existsSync(sqliteFile)) {
  console.error(`SQLite database not found at ${sqliteFile}`);
  process.exit(1);
}

if (!connectionString) {
  console.error('Please set DATABASE_URL in your .env file before migrating.');
  process.exit(1);
}

if (connectionString.includes('sslmode=require') && !connectionString.includes('uselibpqcompat')) {
  connectionString = connectionString.replace('sslmode=require', 'sslmode=verify-full');
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
});

(async () => {
  console.log('Connecting to PostgreSQL / Neon...');
  const client = await pool.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash VARCHAR(128) PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at BIGINT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      sku VARCHAR(40) NOT NULL DEFAULT '',
      name VARCHAR(120) NOT NULL,
      category VARCHAR(60) NOT NULL DEFAULT '',
      size VARCHAR(30) NOT NULL DEFAULT '',
      color VARCHAR(30) NOT NULL DEFAULT '',
      purchase_price NUMERIC(12, 2) NOT NULL CHECK (purchase_price >= 0),
      selling_price NUMERIC(12, 2) NOT NULL CHECK (selling_price >= 0),
      quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
      low_stock INTEGER NOT NULL DEFAULT 3,
      active SMALLINT NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id),
      product_name VARCHAR(150) NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_cost NUMERIC(12, 2) NOT NULL,
      unit_price NUMERIC(12, 2) NOT NULL,
      sold_at TIMESTAMPTZ NOT NULL,
      sold_date VARCHAR(10) NOT NULL,
      note TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS stock_log (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id),
      change INTEGER NOT NULL,
      unit_cost NUMERIC(12, 2),
      reason VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sold_date);
    CREATE INDEX IF NOT EXISTS idx_sales_product ON sales(product_id);
    CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
  `);

  const sqlite = new Database(sqliteFile, { readonly: true });

  try {
    await client.query('BEGIN');

    // 1. Users
    const users = sqlite.prepare('SELECT * FROM users ORDER BY id ASC').all();
    console.log(`Migrating ${users.length} users...`);
    for (const u of users) {
      await client.query(
        `INSERT INTO users (id, username, password_hash, created_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, password_hash=EXCLUDED.password_hash`,
        [u.id, u.username, u.password_hash, u.created_at]
      );
    }
    if (users.length > 0) {
      await client.query(`SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))`);
    }

    // 2. Products
    const products = sqlite.prepare('SELECT * FROM products ORDER BY id ASC').all();
    console.log(`Migrating ${products.length} products...`);
    for (const p of products) {
      await client.query(
        `INSERT INTO products (id, sku, name, category, size, color, purchase_price, selling_price, quantity, low_stock, active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET
           sku=EXCLUDED.sku, name=EXCLUDED.name, category=EXCLUDED.category, size=EXCLUDED.size,
           color=EXCLUDED.color, purchase_price=EXCLUDED.purchase_price, selling_price=EXCLUDED.selling_price,
           quantity=EXCLUDED.quantity, low_stock=EXCLUDED.low_stock, active=EXCLUDED.active`,
        [p.id, p.sku, p.name, p.category, p.size, p.color, p.purchase_price, p.selling_price, p.quantity, p.low_stock, p.active, p.created_at]
      );
    }
    if (products.length > 0) {
      await client.query(`SELECT setval('products_id_seq', (SELECT MAX(id) FROM products))`);
    }

    // 3. Sales
    const sales = sqlite.prepare('SELECT * FROM sales ORDER BY id ASC').all();
    console.log(`Migrating ${sales.length} sales...`);
    for (const s of sales) {
      await client.query(
        `INSERT INTO sales (id, product_id, product_name, quantity, unit_cost, unit_price, sold_at, sold_date, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [s.id, s.product_id, s.product_name, s.quantity, s.unit_cost, s.unit_price, s.sold_at, s.sold_date, s.note]
      );
    }
    if (sales.length > 0) {
      await client.query(`SELECT setval('sales_id_seq', (SELECT MAX(id) FROM sales))`);
    }

    // 4. Stock Log
    const logs = sqlite.prepare('SELECT * FROM stock_log ORDER BY id ASC').all();
    console.log(`Migrating ${logs.length} stock logs...`);
    for (const l of logs) {
      await client.query(
        `INSERT INTO stock_log (id, product_id, change, unit_cost, reason, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [l.id, l.product_id, l.change, l.unit_cost, l.reason, l.created_at]
      );
    }
    if (logs.length > 0) {
      await client.query(`SELECT setval('stock_log_id_seq', (SELECT MAX(id) FROM stock_log))`);
    }

    await client.query('COMMIT');
    console.log('\x1b[32m%s\x1b[0m', '✓ Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    sqlite.close();
    await pool.end();
  }
})();
