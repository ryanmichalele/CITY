// GET /.netlify/functions/content
// Public dashboard defaults + site settings. No customer data.

import { json, methodNotAllowed } from './_lib/http.mts'
import { sanityQuery } from './_lib/sanity.mts'

const QUERY = `{
  "defaults": *[_id == "dashboardDefaults"][0].content,
  "site": *[_id == "siteSettings"][0]{
    brandName, tagline, navigation, footer, contactPage
  }
}`

export default async (req: Request) => {
  if (req.method !== 'GET') return methodNotAllowed()

  let result: { defaults?: Record<string, unknown> | null; site?: Record<string, unknown> | null }
  try {
    result = await sanityQuery<typeof result>(QUERY)
  } catch {
    return json({ ok: false, error: 'content_unavailable' }, 502)
  }

  return json(
    { ok: true, defaults: result.defaults || null, site: result.site || null },
    200,
    { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  )
}
