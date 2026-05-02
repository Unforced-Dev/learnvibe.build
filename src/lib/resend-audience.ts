// Thin Resend Audiences wrapper.
//
// Adds a contact to an existing Resend audience by id. Audience creation is
// deliberately NOT handled here — we may want different audiences per
// surface (Cohort 2 interest, alumni community, CU class, etc.), so the
// audience id stays a parameter. Audiences are created once by hand in the
// Resend dashboard; their ids are then plumbed through env config.
//
// Best-effort: failures log and return null contactId so callers can still
// persist their DB row. Never throws.

import { Resend } from 'resend'
import { isEmailConfigured } from './email'

let resendClient: Resend | null = null

function getResend(apiKey: string): Resend {
  // Separate cached client from email.ts — keeps concerns isolated.
  if (!resendClient) resendClient = new Resend(apiKey)
  return resendClient
}

export interface AudienceAddResult {
  contactId: string | null
}

/** Add (or re-add — Resend dedupes by email per audience) a contact to a
 *  Resend audience. Returns null contactId on any failure or when email
 *  isn't configured. */
export async function addToAudience(
  env: { RESEND_API_KEY?: string },
  email: string,
  name: string | null | undefined,
  audienceId: string,
): Promise<AudienceAddResult> {
  if (!isEmailConfigured(env.RESEND_API_KEY)) {
    return { contactId: null }
  }
  if (!audienceId) {
    return { contactId: null }
  }
  try {
    const resend = getResend(env.RESEND_API_KEY!)
    const firstName = name?.split(' ')[0]
    const result = await resend.contacts.create({
      audienceId,
      email,
      firstName,
      unsubscribed: false,
    })
    const id = (result.data as any)?.id as string | undefined
    if (!id) {
      console.error('[resend-audience] contacts.create returned no id:', result)
      return { contactId: null }
    }
    return { contactId: id }
  } catch (e) {
    console.error('[resend-audience] contacts.create failed:', e)
    return { contactId: null }
  }
}
