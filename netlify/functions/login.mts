// POST /.netlify/functions/login
// Verifies a login ID + password and issues the signed session cookie.

import { verifyPassword, createSessionCookie } from './_lib/auth.mts'
import { isHttps, json, methodNotAllowed, readJson } from './_lib/http.mts'
import { sanityQuery } from './_lib/sanity.mts'

type Attempt = { count: number; first: number; blockedUntil: number }
const attempts = new Map<string, Attempt>()
const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5

function clientKey(req: Request, loginId: string): string {
  const ip =
    req.headers.get('x-nf-client-connection-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  return `${ip}:${loginId}`
}

function tooManyAttempts(key: string): boolean {
  const now = Date.now()
  const entry = attempts.get(key)
  if (!entry) return false
  if (entry.blockedUntil && entry.blockedUntil > now) return true
  if (now - entry.first > WINDOW_MS) {
    attempts.delete(key)
    return false
  }
  return false
}

function recordFailure(key: string) {
  const now = Date.now()
  const entry = attempts.get(key)
  if (!entry || now - entry.first > WINDOW_MS) {
    attempts.set(key, { count: 1, first: now, blockedUntil: 0 })
    return
  }
  entry.count += 1
  if (entry.count >= MAX_ATTEMPTS) entry.blockedUntil = now + WINDOW_MS
}

function clearFailures(key: string) {
  attempts.delete(key)
}

type LoginRow = {
  loginId?: string
  app?: { reference?: string; credentials?: { passwordHash?: string } } | null
}

const QUERY = `*[_type == "login" && loginId == $loginId][0]{
  loginId,
  "app": application->{reference, credentials}
}`

export default async (req: Request) => {
  if (req.method !== 'POST') return methodNotAllowed()

  const body = await readJson<{ loginId?: unknown; password?: unknown }>(req)
  if (!body) return json({ ok: false, error: 'invalid_request' }, 400)

  const loginId = typeof body.loginId === 'string' ? body.loginId.trim().toUpperCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!loginId || !password) {
    return json({ ok: false, error: 'missing_credentials' }, 400)
  }

  const key = clientKey(req, loginId)
  if (tooManyAttempts(key)) {
    return json({ ok: false, error: 'too_many_attempts' }, 429)
  }

  let row: LoginRow | null = null
  try {
    row = await sanityQuery<LoginRow | null>(QUERY, { loginId })
  } catch {
    return json({ ok: false, error: 'lookup_failed' }, 502)
  }

  const hash = row?.app?.credentials?.passwordHash
  if (!row || !hash || !verifyPassword(password, hash)) {
    recordFailure(key)
    return json({ ok: false, error: 'invalid_credentials' }, 401)
  }

  clearFailures(key)

  const reference = row.app?.reference || row.loginId || loginId
  const cookie = createSessionCookie(reference, isHttps(req))
  return json({ ok: true, reference }, 200, { 'Set-Cookie': cookie })
}
