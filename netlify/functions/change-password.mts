// POST /.netlify/functions/change-password
import { hashPassword, readSession } from './_lib/auth.mts'
import { json, methodNotAllowed, readJson } from './_lib/http.mts'
import { sanityMutate } from './_lib/sanity.mts'

export default async (req: Request) => {
  if (req.method !== 'POST') return methodNotAllowed()

  const session = readSession(req)
  if (!session) return json({ ok: false, error: 'unauthenticated' }, 401)

  const body = await readJson<{ newPassword?: unknown }>(req)
  const password = typeof body?.newPassword === 'string' ? body.newPassword : ''
  if (password.length < 8) {
    return json({ ok: false, error: 'weak_password' }, 400)
  }

  const now = new Date().toISOString()
  try {
    await sanityMutate([
      {
        patch: {
          id: `application.${session.reference}`,
          set: {
            'credentials.passwordHash': hashPassword(password),
            'credentials.passwordAlgo': 'scrypt',
            'credentials.passwordUpdatedAt': now,
          },
        },
      },
    ])
  } catch {
    return json({ ok: false, error: 'update_failed' }, 502)
  }

  return json({ ok: true })
}
