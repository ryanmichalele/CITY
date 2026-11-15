// POST /.netlify/functions/logout
import { clearSessionCookie } from './_lib/auth.mts'
import { isHttps, json, methodNotAllowed } from './_lib/http.mts'

export default async (req: Request) => {
  if (req.method !== 'POST') return methodNotAllowed()
  return json({ ok: true }, 200, {
    'Set-Cookie': clearSessionCookie(isHttps(req)),
  })
}
