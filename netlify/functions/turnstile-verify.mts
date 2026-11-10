// Netlify Function: verify a Cloudflare Turnstile token server-side.
// The secret key is read from the TURNSTILE_SECRET_KEY environment variable
// (set with `netlify env:set`, scope: functions) and is never present in the repo.

type TurnstileResult = {
  success: boolean
  "error-codes"?: string[]
  challenge_ts?: string
  hostname?: string
  action?: string
  cdata?: string
}

type FnContext = {
  ip?: string | null
}

declare const Netlify: { env: { get(key: string): string | undefined } }

function readSecret(): string | undefined {
  const fromNetlify = Netlify?.env?.get("TURNSTILE_SECRET_KEY")
  if (fromNetlify) return fromNetlify
  return typeof process !== "undefined" ? process.env.TURNSTILE_SECRET_KEY : undefined
}

export default async (req: Request, ctx: FnContext) => {
  if (req.method !== "POST") {
    return Response.json({ success: false, error: "method_not_allowed" }, { status: 405 })
  }

  const secret = readSecret()
  if (!secret) {
    // Misconfiguration: the function cannot verify anything.
    return Response.json({ success: false, error: "server_misconfigured" }, { status: 500 })
  }

  let body: { token?: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json({ success: false, error: "invalid_request" }, { status: 400 })
  }

  const token = typeof body.token === "string" ? body.token.trim() : ""
  if (!token) {
    return Response.json({ success: false, error: "missing_token" }, { status: 400 })
  }

  const payload: Record<string, string> = { secret, response: token }
  if (ctx?.ip) payload.remoteip = ctx.ip

  let result: TurnstileResult
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    result = (await res.json()) as TurnstileResult
  } catch {
    return Response.json({ success: false, error: "verify_unavailable" }, { status: 502 })
  }

  if (!result?.success) {
    return Response.json(
      { success: false, error: "verification_failed", codes: result?.["error-codes"] ?? [] },
      { status: 403 },
    )
  }

  return Response.json({
    success: true,
    hostname: result.hostname ?? null,
    action: result.action ?? null,
  })
}
