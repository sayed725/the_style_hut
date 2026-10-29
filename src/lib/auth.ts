import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { query } from './db';

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const BCRYPT_COST = 11;

export const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: number) {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = sha256(token);
  const expiresAt = Date.now() + SESSION_TTL_MS;

  await query(
    'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
    [tokenHash, userId, expiresAt]
  );

  const cookieStore = await cookies();
  cookieStore.set('sid', token, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    secure: process.env.NODE_ENV === 'production',
  });

  return token;
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('sid')?.value;
  if (!token) return null;

  const tokenHash = sha256(token);
  const { rows } = await query(
    `SELECT s.token_hash, s.expires_at, u.id AS user_id, u.username
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1`,
    [tokenHash]
  );

  const s = rows[0];
  if (!s) return null;

  const now = Date.now();
  if (Number(s.expires_at) < now) {
    await query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
    cookieStore.delete('sid');
    return null;
  }

  // Slide expiration if half-life reached
  if (Number(s.expires_at) - now < SESSION_TTL_MS - 5 * 60 * 1000) {
    await query('UPDATE sessions SET expires_at = $1 WHERE token_hash = $2', [now + SESSION_TTL_MS, tokenHash]);
  }

  return { hash: tokenHash, userId: s.user_id as number, username: s.username as string };
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('sid')?.value;
  if (token) {
    await query('DELETE FROM sessions WHERE token_hash = $1', [sha256(token)]);
  }
  cookieStore.delete('sid');
}
