import { Pool, types } from 'pg';

// Parse NUMERIC / DECIMAL as numbers instead of strings
types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));
// Parse INT8 (BIGINT) as integer numbers
types.setTypeParser(20, (val) => (val === null ? null : parseInt(val, 10)));

let connectionString = process.env.DATABASE_URL;
if (connectionString && connectionString.includes('sslmode=require') && !connectionString.includes('uselibpqcompat')) {
  connectionString = connectionString.replace('sslmode=require', 'sslmode=verify-full');
}

declare global {
  // eslint-disable-next-line no-var
  var __dbPool: Pool | undefined;
}

const pool =
  global.__dbPool ||
  new Pool({
    connectionString,
    ssl:
      connectionString && connectionString.includes('neon.tech')
        ? { rejectUnauthorized: false }
        : process.env.DB_SSL === '1'
        ? { rejectUnauthorized: false }
        : undefined,
    max: 10,
    idleTimeoutMillis: 30000,
  });

if (process.env.NODE_ENV !== 'production') {
  global.__dbPool = pool;
}

let isInitialized = false;

export async function initDb() {
  if (isInitialized || !connectionString) return;

  const client = await pool.connect();
  try {
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
        note TEXT NOT NULL DEFAULT '',
        payment_method VARCHAR(20) NOT NULL DEFAULT 'cash'
      );

      ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) NOT NULL DEFAULT 'cash';

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
      CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method);
      CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
    `);
    isInitialized = true;
  } finally {
    client.release();
  }
}

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
  await initDb();
  const res = await pool.query(text, params);
  return { rows: res.rows as T[] };
}

export async function getClient() {
  await initDb();
  return pool.connect();
}

export { pool };
