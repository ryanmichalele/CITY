// Shared Sanity HTTP helpers for Netlify Functions.
// Uses fetch only, so functions need no npm dependencies.

declare const Netlify: { env: { get(key: string): string | undefined } } | undefined

function env(key: string): string {
  const fromNetlify =
    typeof Netlify !== 'undefined' ? Netlify.env?.get(key) : undefined
  if (fromNetlify) return fromNetlify
  if (typeof process !== 'undefined' && process.env) return process.env[key] || ''
  return ''
}

export function sanityConfig() {
  const projectId = env('SANITY_PROJECT_ID')
  const dataset = env('SANITY_DATASET')
  const apiVersion = env('SANITY_API_VERSION') || '2025-01-01'
  const token = env('SANITY_WRITE_TOKEN') || env('SANITY_READ_TOKEN')
  return { projectId, dataset, apiVersion, token }
}

function baseUrl() {
  const { projectId, dataset, apiVersion } = sanityConfig()
  if (!projectId || !dataset) {
    throw new Error('sanity_not_configured')
  }
  return `https://${projectId}.api.sanity.io/v${apiVersion}/data`
}

function authHeaders(): Record<string, string> {
  const { token } = sanityConfig()
  if (!token) throw new Error('sanity_token_missing')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

export async function sanityQuery<T>(
  groq: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const { dataset } = sanityConfig()
  const url = new URL(`${baseUrl()}/query/${dataset}`)
  url.searchParams.set('query', groq)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(`$${key}`, JSON.stringify(value))
  }
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`sanity_query_failed:${res.status}:${text.slice(0, 200)}`)
  }
  const body = (await res.json()) as { result: T }
  return body.result
}

export async function sanityMutate(
  mutations: unknown[],
): Promise<{ transactionId: string; results: Array<{ id: string; operation: string }> }> {
  const { dataset } = sanityConfig()
  const url = `${baseUrl()}/mutate/${dataset}?returnIds=true`
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ mutations }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`sanity_mutate_failed:${res.status}:${text.slice(0, 300)}`)
  }
  return (await res.json()) as {
    transactionId: string
    results: Array<{ id: string; operation: string }>
  }
}

export function sanityEnv(key: string): string {
  return env(key)
}
