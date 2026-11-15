// POST /.netlify/functions/applications
// Validates a submitted application, verifies Turnstile, hashes the password,
// and stores the application + account + login mapping in Sanity.

import { createHash, randomBytes } from 'node:crypto'
import { createSessionCookie } from './_lib/auth.mts'
import { hashPassword } from './_lib/auth.mts'
import { isHttps, json, methodNotAllowed, readJson } from './_lib/http.mts'
import { sanityEnv, sanityMutate } from './_lib/sanity.mts'

declare const Netlify: { env: { get(key: string): string | undefined } } | undefined

function env(key: string): string {
  const fromNetlify =
    typeof Netlify !== 'undefined' ? Netlify.env?.get(key) : undefined
  if (fromNetlify) return fromNetlify
  if (typeof process !== 'undefined' && process.env) return process.env[key] || ''
  return ''
}

type Body = {
  accountType?: unknown
  personal?: Record<string, unknown>
  contact?: Record<string, unknown>
  employment?: Record<string, unknown>
  financial?: Record<string, unknown>
  tax?: Record<string, unknown>
  agreements?: Record<string, unknown>
  turnstileToken?: unknown
}

const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

function makeReference(): string {
  const now = new Date()
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('')
  const random = randomBytes(3).toString('hex').toUpperCase()
  return `APP-${date}-${random}`
}

function hashIp(ip: string): string {
  return createHash('sha256')
    .update(`${ip}:${env('SESSION_SECRET')}`)
    .digest('hex')
    .slice(0, 32)
}

type TurnstileOutcome = { ok: boolean; verified: boolean; hostname?: string; action?: string }

async function verifyTurnstile(token: string, ip: string): Promise<TurnstileOutcome> {
  const secret = env('TURNSTILE_SECRET_KEY')
  const dev = env('NETLIFY_DEV') === 'true' || env('CONTEXT') === 'dev'

  // Local development has no Turnstile site key configured.
  if (dev || !secret) return { ok: true, verified: false }

  if (!token) return { ok: true, verified: false }

  const payload: Record<string, string> = { secret, response: token }
  if (ip) payload.remoteip = ip

  let result: {
    success?: boolean
    hostname?: string
    action?: string
    'error-codes'?: string[]
  }
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    result = (await res.json()) as typeof result
  } catch {
    // Verifier unreachable: do not hard-block a real applicant.
    return { ok: true, verified: false }
  }

  if (!result?.success) {
    return { ok: false, verified: false }
  }

  return { ok: true, verified: true, hostname: result.hostname, action: result.action }
}

export default async (req: Request, ctx: { ip?: string | null }) => {
  if (req.method !== 'POST') return methodNotAllowed()

  const body = await readJson<Body>(req)
  if (!body) return json({ ok: false, error: 'invalid_request' }, 400)

  const personal = body.personal || {}
  const contact = body.contact || {}
  const employment = body.employment || {}
  const financial = body.financial || {}
  const tax = body.tax || {}
  const agreements = body.agreements || {}

  const email = str(contact.email)
  const phone = str(contact.phone).replace(/\D/g, '')
  const password = str(contact.password)
  const ssn = str(personal.ssn).replace(/\D/g, '')
  const ssnLast4Input = str(personal.ssnLast4).replace(/\D/g, '').slice(-4)

  const fields: Record<string, string> = {
    'personal.firstName': str(personal.firstName),
    'personal.lastName': str(personal.lastName),
    'personal.dob': str(personal.dob),
    'contact.email': email,
    'contact.phone': phone,
    'contact.street': str(contact.street),
    'contact.city': str(contact.city),
    'contact.state': str(contact.state),
    'contact.zip': str(contact.zip),
    'contact.password': password,
    'agreements.signature': str(agreements.signature),
  }

  const errors: Record<string, string> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (!value) errors[key] = 'Required'
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors['contact.email'] = 'Invalid email'
  if (phone && phone.length !== 10) errors['contact.phone'] = 'Enter a 10-digit phone number'
  if (ssn) {
    if (ssn.length !== 9) errors['personal.ssn'] = 'Enter a 9-digit SSN or ITIN'
  } else if (ssnLast4Input.length !== 4) {
    errors['personal.ssn'] = 'Enter a 9-digit SSN or ITIN'
  }
  if (password && password.length < 8) errors['contact.password'] = 'Password must be at least 8 characters'
  if (!agreements.consent) errors['agreements.consent'] = 'E-sign consent is required'
  if (!str(body.accountType)) errors['accountType'] = 'Select an account type'

  if (Object.keys(errors).length) {
    return json({ ok: false, error: 'validation_failed', fields: errors }, 400)
  }

  const turnstile = await verifyTurnstile(str(body.turnstileToken), ctx?.ip || '')
  if (!turnstile.ok) {
    return json({ ok: false, error: 'verification_failed' }, 403)
  }

  const reference = makeReference()
  const now = new Date().toISOString()
  const applicationId = `application.${reference}`
  const datePart = reference.split('-')[1]
  const idPart = reference.split('-')[2]
  const prototypeId = `P-${datePart}-${idPart}`

  const application = {
    _id: applicationId,
    _type: 'application',
    reference,
    status: 'approved',
    submittedAt: now,
    accountType: str(body.accountType),
    personal: {
      firstName: str(personal.firstName),
      middleName: str(personal.middleName),
      lastName: str(personal.lastName),
      dob: str(personal.dob),
      ssnLast4: ssn ? ssn.slice(-4) : ssnLast4Input,
      citizenship: str(personal.citizenship),
      ownership: str(personal.ownership),
    },
    contact: {
      email,
      phone,
      street: str(contact.street),
      apt: str(contact.apt),
      city: str(contact.city),
      state: str(contact.state),
      zip: str(contact.zip),
      country: str(contact.country) || 'US',
      mailingSame: str(contact.mailingSame),
      mailing: {
        street: str((contact.mailing as Record<string, unknown> | undefined)?.street),
        apt: str((contact.mailing as Record<string, unknown> | undefined)?.apt),
        city: str((contact.mailing as Record<string, unknown> | undefined)?.city),
        state: str((contact.mailing as Record<string, unknown> | undefined)?.state),
        zip: str((contact.mailing as Record<string, unknown> | undefined)?.zip),
      },
    },
    employment: {
      status: str(employment.status),
      occupation: str(employment.occupation),
      employer: str(employment.employer),
      jobTitle: str(employment.jobTitle),
      industry: str(employment.industry),
      income: str(employment.income),
    },
    financial: {
      incomeSource: str(financial.incomeSource),
      sourceFunds: str(financial.sourceFunds),
      monthlyDeposits: str(financial.monthlyDeposits),
      monthlyWithdrawals: str(financial.monthlyWithdrawals),
      purpose: str(financial.purpose),
      activity: str(financial.activity),
    },
    tax: {
      usResident: str(tax.usResident),
      tinType: str(tax.tinType),
      residencyCountry: str(tax.residencyCountry),
      certification: Boolean(tax.certification),
      declarations: Boolean(tax.declarations),
    },
    agreements: {
      accepted: Array.isArray(agreements.accepted) ? agreements.accepted.map(str).filter(Boolean) : [],
      signature: str(agreements.signature),
      consent: Boolean(agreements.consent),
      acceptedAt: now,
      docVersion: str(agreements.docVersion),
    },
    credentials: {
      loginId: reference,
      passwordHash: hashPassword(password),
      passwordAlgo: 'scrypt',
      passwordUpdatedAt: now,
    },
    turnstile: {
      success: turnstile.verified,
      hostname: turnstile.hostname || '',
      action: turnstile.action || '',
      challengeAt: now,
    },
    meta: {
      ipHash: ctx?.ip ? hashIp(ctx.ip) : '',
      userAgent: (req.headers.get('user-agent') || '').slice(0, 300),
      source: 'account-application',
    },
  }

  const account = {
    _id: `account.${reference}`,
    _type: 'account',
    owner: { _type: 'reference', _ref: applicationId },
    prototypeId,
    maskedNumber: `•••• •••• •••• ${idPart.slice(-4)}`,
    type: str(body.accountType),
    status: 'Active',
    openedAt: now,
    balances: { currency: 'USD' },
  }

  const login = {
    _id: `login.${reference}`,
    _type: 'login',
    loginId: reference,
    application: { _type: 'reference', _ref: applicationId },
    createdAt: now,
  }

  const audit = {
    _id: `audit.${Date.now()}-${randomBytes(4).toString('hex')}`,
    _type: 'auditEvent',
    action: 'application_submitted',
    actor: reference,
    target: applicationId,
    at: now,
    ipHash: ctx?.ip ? hashIp(ctx.ip) : '',
  }

  try {
    await sanityMutate([
      { createIfNotExists: application },
      { createIfNotExists: account },
      { createIfNotExists: login },
      { create: audit },
    ])
  } catch (error) {
    return json(
      { ok: false, error: 'storage_failed', detail: String(error).slice(0, 200) },
      502,
    )
  }

  const cookie = createSessionCookie(reference, isHttps(req))
  return json(
    {
      ok: true,
      reference,
      loginId: reference,
      status: 'approved',
    },
    201,
    { 'Set-Cookie': cookie },
  )
}
