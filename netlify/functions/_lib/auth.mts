// Session cookie + password hashing helpers.
// Uses node:crypto only, so functions need no npm dependencies.

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const COOKIE_NAME = 'citi_session'
const SESSION_TTL_SECONDS = 60 * 60 * 12

declare const Netlify: { env: { get(key: string): string | undefined } } | undefined

function env(key: string): string {
  const fromNetlify =
    typeof Netlify !== 'undefined' ? Netlify.env?.get(key) : undefined
  if (fromNetlify) return fromNetlify
  if (typeof process !== 'undefined' && process.env) return process.env[key] || ''
  return ''
}

function secret(): string {
  const value = env('SESSION_SECRET')
  if (!value) throw new Error('session_secret_missing')
  return value
}

export function hashPassword(password: string): string {
  const N = 16384
  const r = 8
  const p = 1
  const keylen = 64
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, keylen, { N, r, p, maxmem: 64 * 1024 * 1024 })
  return `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${hash.toString('hex')}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const parts = String(stored || '').split('$')
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false
    const N = Number(parts[1])
    const r = Number(parts[2])
    const p = Number(parts[3])
    const salt = Buffer.from(parts[4], 'hex')
    const expected = Buffer.from(parts[5], 'hex')
    if (!N || !r || !p || !salt.length || !expected.length) return false
    const actual = scryptSync(password, salt, expected.length, {
      N,
      r,
      p,
      maxmem: 64 * 1024 * 1024,
    })
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

function toBase64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function fromBase64Url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

function sign(payload: string): string {
  return toBase64Url(createHmac('sha256', secret()).update(payload).digest())
}

export function createSessionCookie(reference: string, secure: boolean): string {
  const payload = toBase64Url(
    JSON.stringify({ r: reference, e: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS }),
  )
  const token = `${payload}.${sign(payload)}`
  const parts = [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

export function clearSessionCookie(secure: boolean): string {
  const parts = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

export function readSession(req: Request): { reference: string } | null {
  const header = req.headers.get('cookie') || ''
  const match = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))
  if (!match) return null
  const token = match.slice(COOKIE_NAME.length + 1)
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null
  if (sign(payload) !== signature) return null
  try {
    const data = JSON.parse(fromBase64Url(payload).toString('utf8')) as {
      r?: unknown
      e?: unknown
    }
    if (typeof data.r !== 'string' || typeof data.e !== 'number') return null
    if (data.e < Math.floor(Date.now() / 1000)) return null
    return { reference: data.r }
  } catch {
    return null
  }
}
