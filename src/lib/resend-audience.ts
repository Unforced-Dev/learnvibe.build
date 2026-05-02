// Thin Resend Audiences wrapper.
//
// Used by the interest-list signup flow (#35). On submit we want to:
//   1. Persist the row in our `interests` table (DB is source of truth)
//   2. Sync the contact to a Resend audience (for batch broadcasts later)
//
// Step 2 is best-effort — if the audience-add fails, step 1 still succeeds
// and the admin can resync later. Errors are logged, not raised.
//
// The audience itself is created lazily on first signup ("LVB Cohort 2
// Interest" by default). We cache the resolved audienceId in module scope
// so warm-isolate requests don't re-list audiences each time. Cold isolates
// pay a one-time list (or list+create) cost — negligible at this scale.

import { Resend } from 'resend'
import { isEmailConfigured } from './email'

export const DEFAULT_AUDIENCE_NAME = 'LVB Cohort 2 Interest'

let resendClient: Resend | null = null
let cachedAudienceId: string | null = null
let cachedAudienceName: string | null = null

function getResend(apiKey: string): Resend {
  // Don't share the singleton with email.ts — each module gets its own
  // client to avoid accidental state coupling. Resend SDK clients are
  // cheap to create (just an object holding the API key + headers).
  if (!resendClient) resendClient = new Resend(apiKey)
  return resendClient
}

/** Find the audience by name; create it if it doesn't exist. Returns the
 *  audience id, or null on any failure. */
async function resolveAudienceId(apiKey: string, name: string): Promise<string | null> {
  if (cachedAudienceId && cachedAudienceName === name) return cachedAudienceId
  const resend = getResend(apiKey)
  try {
    const list = await resend.audiences.list()
    const items = (list.data as any)?.data ?? []
    const existing = items.find((a: any) => a?.name === name)
    if (existing?.id) {
      cachedAudienceId = existing.id as string
      cachedAudienceName = name
      return cachedAudienceId
    }
    // Not found — create it
    const created = await resend.audiences.create({ name })
    const id = (created.data as any)?.id as string | undefined
    if (id) {
      cachedAudienceId = id
      cachedAudienceName = name
      return id
    }
    console.error('[resend-audience] create returned no id:', created)
    return null
  } catch (e) {
    console.error('[resend-audience] resolveAudienceId failed:', e)
    return null
  }
}

export interface AudienceContactResult {
  contactId: string | null
  /** True when we couldn't even resolve the audience (API failure /
   *  unconfigured key). The DB row is still persisted; the caller can
   *  retry the audience-add later. */
  audienceMissing: boolean
}

/** Add (or re-add — Resend dedupes by email per audience) a contact to the
 *  Cohort 2 Interest audience. Best-effort: returns null contactId on
 *  failure but never throws. */
export async function addToInterestAudience(
  apiKey: string | undefined,
  opts: { email: string; firstName?: string; audienceName?: string },
): Promise<AudienceContactResult> {
  if (!isEmailConfigured(apiKey)) {
    return { contactId: null, audienceMissing: true }
  }
  const audienceName = opts.audienceName ?? DEFAULT_AUDIENCE_NAME
  const audienceId = await resolveAudienceId(apiKey!, audienceName)
  if (!audienceId) return { contactId: null, audienceMissing: true }

  try {
    const resend = getResend(apiKey!)
    const result = await resend.contacts.create({
      audienceId,
      email: opts.email,
      firstName: opts.firstName,
      unsubscribed: false,
    })
    const id = (result.data as any)?.id as string | undefined
    if (!id) {
      console.error('[resend-audience] contacts.create returned no id:', result)
      return { contactId: null, audienceMissing: false }
    }
    return { contactId: id, audienceMissing: false }
  } catch (e) {
    console.error('[resend-audience] contacts.create failed:', e)
    return { contactId: null, audienceMissing: false }
  }
}
