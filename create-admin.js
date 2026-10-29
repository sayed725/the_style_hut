'use strict';
// Reset a password or add a user from the command line:  npm run create-admin
const readline = require('readline');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Read DATABASE_URL from .env if present
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

if (!connectionString) {
  console.error('DATABASE_URL is missing. Please set it in your .env file.');
  process.exit(1);
}

if (connectionString.includes('sslmode=require') && !connectionString.includes('uselibpqcompat')) {
  connectionString = connectionString.replace('sslmode=require', 'sslmode=verify-full');
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
});

const BCRYPT_COST = 11;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
let muted = false;
const origWrite = rl._writeToOutput;
rl._writeToOutput = function (s) {
  if (muted && s.trim() !== '' && !s.includes('\n')) return this.output.write('*');
  return origWrite.call(this, s);
};
const ask = (label, hidden) =>
  new Promise((resolve) => {
    rl.question(label, (a) => {
      muted = false;
      if (hidden) process.stdout.write('\n');
      resolve(a);
    });
    muted = !!hidden;
  });

(async () => {
  try {
    await pool.query(`
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
    `);

    const username = (await ask('Username (new, or existing to reset its password): ')).trim();
    const p1 = await ask('New password (8-72 characters): ', true);
    const p2 = await ask('Repeat password: ', true);
    rl.close();

    if (!username) return console.error('Username is required.');
    if (p1 !== p2) return console.error('Passwords do not match.');
    if (p1.length < 8 || p1.length > 72) return console.error('Password must be 8 to 72 characters.');

    const hash = await bcrypt.hash(p1, BCRYPT_COST);
    const existing = (await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [username])).rows[0];

    if (existing) {
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, existing.id]);
      await pool.query('DELETE FROM sessions WHERE user_id = $1', [existing.id]);
      console.log(`Password updated for "${username}". All devices were signed out.`);
    } else {
      await pool.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [username, hash]);
      console.log(`User "${username}" created.`);
    }
  } catch (err) {
    console.error('Error creating admin:', err);
  } finally {
    await pool.end();
  }
})();
