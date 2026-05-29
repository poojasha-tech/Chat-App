import crypto from 'crypto';
import { promisify } from 'util';
import jwt from 'jsonwebtoken';

const scrypt = promisify(crypto.scrypt);

const SALT_BYTES = 16;
const KEY_BYTES = 64;
const TOKEN_TTL = '7d';
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET env var is required. Set it in Backend/.env');
}

export async function hashPassword(plain) {
  const salt = crypto.randomBytes(SALT_BYTES);
  const key = await scrypt(plain, salt, KEY_BYTES);
  return salt.toString('hex') + ':' + key.toString('hex');
}

export async function verifyPassword(plain, stored) {
  if (typeof stored !== 'string') return false;
  const parts = stored.split(':');
  if (parts.length !== 2) return false;

  const salt = Buffer.from(parts[0], 'hex');
  const expected = Buffer.from(parts[1], 'hex');
  if (expected.length !== KEY_BYTES) return false;

  const derived = await scrypt(plain, salt, KEY_BYTES);
  // constant-time compare; a naive === leaks how many bytes matched
  return crypto.timingSafeEqual(derived, expected);
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// must use same options on set and clear, or some browsers won't clear
export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  };
}

// Socket.IO handshake bypasses Express middleware, so cookie-parser doesn't apply.
// We get the raw Cookie header string and parse it ourselves.
export function parseCookieHeader(header) {
  const out = {};
  if (!header) return out;

  for (const piece of header.split(';')) {
    const idx = piece.indexOf('=');
    if (idx === -1) continue;
    const name = piece.slice(0, idx).trim();
    const value = piece.slice(idx + 1).trim();
    if (name) out[name] = decodeURIComponent(value);
  }
  return out;
}
