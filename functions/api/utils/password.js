const encoder = new TextEncoder();
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32;

function toHex(bytes) { return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(''); }
function fromHex(hex) { return new Uint8Array(hex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []); }
function constantTimeEqual(actual, expected) {
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
  return difference === 0;
}

function deriveScrypt(password, salt, options = {}) {
  return import('node:crypto').then(({ scrypt: nodeScrypt }) => new Promise((resolve, reject) => {
    nodeScrypt(password, salt, KEY_LENGTH, { maxmem: 64 * 1024 * 1024, ...options }, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(new Uint8Array(derivedKey));
    });
  }));
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await deriveScrypt(password, salt, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${toHex(salt)}$${toHex(derived)}`;
}

async function verifyLegacyPbkdf2(password, stored) {
  const [, iterations, saltHex, expectedHex] = stored.split('$');
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations: Number(iterations) }, key, 256);
  return constantTimeEqual(new Uint8Array(bits), fromHex(expectedHex));
}

export async function verifyPassword(password, stored) {
  if (stored?.startsWith('pbkdf2_sha256$')) return verifyLegacyPbkdf2(password, stored);
  if (!stored?.startsWith('scrypt$')) return false;
  const [, n, r, p, saltHex, expectedHex] = stored.split('$');
  const actual = await deriveScrypt(password, fromHex(saltHex), { N: Number(n), r: Number(r), p: Number(p) });
  return constantTimeEqual(actual, fromHex(expectedHex));
}
