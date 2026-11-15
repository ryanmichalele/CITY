// GET /.netlify/functions/session
// Returns the signed-in customer's own application, account, and dashboard data.

import { readSession } from './_lib/auth.mts'
import { json, methodNotAllowed } from './_lib/http.mts'
import { sanityQuery } from './_lib/sanity.mts'

type ApplicationRecord = {
  reference?: string
  status?: string
  submittedAt?: string
  accountType?: string
  personal?: Record<string, unknown>
  contact?: Record<string, unknown>
  dashboard?: Record<string, unknown> | null
  turnstile?: Record<string, unknown> | null
  hasPassword?: boolean
  account?: Record<string, unknown> | null
}

const QUERY = `*[_id == $id][0]{
  reference,
  status,
  submittedAt,
  accountType,
  personal,
  contact,
  dashboard,
  turnstile,
  "hasPassword": defined(credentials.passwordHash),
  "account": *[_type == "account" && references(^._id)][0]{
    prototypeId,
    maskedNumber,
    routingLast4,
    type,
    status,
    openedAt,
    balances,
    "transactions": *[_type == "transaction" && references(^._id)] | order(date desc)[0...25]{
      date, description, amount, type, status, balanceAfter
    },
    "activity": *[_type == "activityEvent" && references(^._id)] | order(at desc)[0...12]{
      title, meta, at, icon, tone
    },
    "payments": *[_type == "payment" && references(^._id)]{
      dueDate, amount, payee, status
    }
  }
}`

export default async (req: Request) => {
  if (req.method !== 'GET') return methodNotAllowed()

  const session = readSession(req)
  if (!session) return json({ ok: false, error: 'unauthenticated' }, 401)

  const id = `application.${session.reference}`

  let application: ApplicationRecord | null = null
  try {
    application = await sanityQuery<ApplicationRecord | null>(QUERY, { id })
  } catch (error) {
    return json({ ok: false, error: 'lookup_failed' }, 502)
  }

  if (!application) return json({ ok: false, error: 'not_found' }, 404)

  let defaults: Record<string, unknown> | null = null
  try {
    defaults = await sanityQuery<Record<string, unknown> | null>(
      `*[_id == "dashboardDefaults"][0].content`,
    )
  } catch {
    defaults = null
  }

  return json({
    ok: true,
    application,
    account: application.account || null,
    defaults,
  })
}
