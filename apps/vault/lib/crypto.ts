/**
 * AES-256-GCM at-rest encryption for vault entries and Gmail tokens.
 *
 * Lifted from theautonomousorg/src/lib/db.ts (storeUserApiKey pattern).
 *
 * V1: shared ENCRYPTION_KEY env var. V2: per-user passphrase-derived KEK.
 * See design doc P5 + Reviewer Concerns (audit/breach section).
 *
 * Format: ciphertext + 12-byte IV + 16-byte auth tag, all stored separately
 * as BYTEA columns in Postgres.
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  type CipherGCM,
  type DecipherGCM,
} from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      'ENCRYPTION_KEY env var is required. Generate with: ' +
        'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  return Buffer.from(hex, 'hex');
}

export interface EncryptedBlob {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
}

export function encrypt(plaintext: string): EncryptedBlob {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv) as CipherGCM;
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return { ciphertext, iv, authTag };
}

export function decrypt(blob: EncryptedBlob): string {
  const key = getKey();
  if (blob.iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length: expected ${IV_LENGTH}, got ${blob.iv.length}`);
  }
  if (blob.authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error(
      `Invalid auth tag length: expected ${AUTH_TAG_LENGTH}, got ${blob.authTag.length}`,
    );
  }
  const decipher = createDecipheriv(ALGO, key, blob.iv) as DecipherGCM;
  decipher.setAuthTag(blob.authTag);
  return Buffer.concat([
    decipher.update(blob.ciphertext),
    decipher.final(),
  ]).toString('utf8');
}

/** Mask a key for display (preserves prefix + last 4 chars). */
export function mask(plaintext: string): string {
  if (plaintext.length <= 8) return '****';
  // sk-ant-abc123xyz → 'sk-ant-...3xyz'
  const prefixMatch = plaintext.match(/^([a-z]+(?:-[a-z]+)*[-_])/i);
  const prefix = prefixMatch ? prefixMatch[1] : plaintext.slice(0, 3);
  const suffix = plaintext.slice(-4);
  return `${prefix}...${suffix}`;
}
