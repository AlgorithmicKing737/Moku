import { platformService } from '$lib/platform-service'

const VAULT_STORE_KEY  = 'moku-vault'
const SALT_ITERATIONS  = 200_000
const KEY_USAGE: KeyUsage[] = ['encrypt', 'decrypt']

export interface VaultPayload {
  refreshToken?: string
  basicUser?:    string
  basicPass?:    string
  authMode:      'UI_LOGIN' | 'BASIC_AUTH' | 'NONE'
}

interface StoredVault {
  salt: string
  iv:   string
  data: string
}

function toB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function fromB64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0))
}

async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc    = new TextEncoder()
  const keyMat = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: SALT_ITERATIONS, hash: 'SHA-256' },
    keyMat,
    { name: 'AES-GCM', length: 256 },
    false,
    KEY_USAGE,
  )
}

async function readRaw(): Promise<StoredVault | null> {
  try {
    const raw = await platformService.getCredential(VAULT_STORE_KEY)
    return raw ? JSON.parse(raw) as StoredVault : null
  } catch {
    return null
  }
}

async function writeRaw(vault: StoredVault): Promise<void> {
  await platformService.storeCredential(VAULT_STORE_KEY, JSON.stringify(vault))
}

export async function vaultExists(): Promise<boolean> {
  return (await readRaw()) !== null
}

export async function lockVault(pin: string, payload: VaultPayload): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv   = crypto.getRandomValues(new Uint8Array(12))
  const key  = await deriveKey(pin, salt)
  const enc  = new TextEncoder()

  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(JSON.stringify(payload)),
  )

  await writeRaw({ salt: toB64(salt), iv: toB64(iv), data: toB64(cipher) })
}

export async function unlockVault(pin: string): Promise<VaultPayload | null> {
  const stored = await readRaw()
  if (!stored) return null

  try {
    const key   = await deriveKey(pin, fromB64(stored.salt))
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromB64(stored.iv) },
      key,
      fromB64(stored.data),
    )
    return JSON.parse(new TextDecoder().decode(plain)) as VaultPayload
  } catch {
    return null
  }
}

export async function clearVault(): Promise<void> {
  await platformService.storeCredential(VAULT_STORE_KEY, '')
}

export async function rekeyVault(oldPin: string, newPin: string): Promise<boolean> {
  const payload = await unlockVault(oldPin)
  if (!payload) return false
  await lockVault(newPin, payload)
  return true
}