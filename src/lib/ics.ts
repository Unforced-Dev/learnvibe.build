// Minimal iCalendar generator for cohort live sessions.
// Hardcoded to Mondays 5:30–7:30pm America/Denver. When schedule fields
// land on the cohorts table, replace the constants with those reads.

const SESSION_START_HOUR = 17 // 5pm
const SESSION_START_MIN = 30
const SESSION_DURATION_MIN = 120 // 2h
const SESSION_TZID = 'America/Denver'
const SESSION_VENUE_NAME = 'Regen Hub'
const SESSION_VENUE_ADDRESS = '1515 Walnut St, Suite 200, Boulder, CO 80302'

const VTIMEZONE_AMERICA_DENVER = [
  'BEGIN:VTIMEZONE',
  'TZID:America/Denver',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:-0700',
  'TZOFFSETTO:-0600',
  'TZNAME:MDT',
  'DTSTART:19700308T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:-0600',
  'TZOFFSETTO:-0700',
  'TZNAME:MST',
  'DTSTART:19701101T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
]

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function formatLocal(year: number, month: number, day: number, hour: number, minute: number): string {
  return `${year}${pad2(month)}${pad2(day)}T${pad2(hour)}${pad2(minute)}00`
}

function formatUTC(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`
  )
}

function escapeText(s: string): string {
  // RFC 5545 §3.3.11: escape backslash, semicolon, comma; newlines → \n
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

// Fold long lines at 75 octets (simplified: assume ASCII, fold by char count).
function foldLine(line: string): string {
  if (line.length <= 75) return line
  const parts: string[] = []
  let i = 0
  while (i < line.length) {
    parts.push((i === 0 ? '' : ' ') + line.slice(i, i + (i === 0 ? 75 : 74)))
    i += i === 0 ? 75 : 74
  }
  return parts.join('\r\n')
}

// Add N days to a YYYY-MM-DD date string (returns {year, month, day}).
function addDays(ymd: string, days: number): { year: number; month: number; day: number } {
  const [y, m, d] = ymd.split('-').map(Number)
  // Use UTC math to avoid local-timezone drift; we only need calendar math.
  const base = new Date(Date.UTC(y, m - 1, d))
  base.setUTCDate(base.getUTCDate() + days)
  return { year: base.getUTCFullYear(), month: base.getUTCMonth() + 1, day: base.getUTCDate() }
}

export interface CohortSession {
  weekNumber: number
  title?: string | null
  description?: string | null
}

export interface GenerateCohortICSInput {
  cohortSlug: string
  cohortTitle: string
  /** ISO date YYYY-MM-DD of the first session (Monday). */
  firstSessionDate: string
  /** Total number of weekly sessions. */
  weeks: number
  /** Live meeting link (Zoom, Meet, etc). Shown in URL + LOCATION + description. */
  meetingUrl?: string | null
  /** Optional lessons to pull titles/descriptions from (keyed by weekNumber). */
  sessions?: CohortSession[]
}

export function generateCohortICS(input: GenerateCohortICSInput): string {
  const { cohortSlug, cohortTitle, firstSessionDate, weeks, meetingUrl, sessions } = input
  const sessionByWeek = new Map<number, CohortSession>()
  for (const s of sessions ?? []) sessionByWeek.set(s.weekNumber, s)

  const dtstamp = formatUTC(new Date())
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Learn Vibe Build//Cohort Sessions//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(cohortTitle)}`,
    `X-WR-TIMEZONE:${SESSION_TZID}`,
    ...VTIMEZONE_AMERICA_DENVER,
  ]

  const endOffsetMin = SESSION_START_HOUR * 60 + SESSION_START_MIN + SESSION_DURATION_MIN
  const endHour = Math.floor(endOffsetMin / 60)
  const endMin = endOffsetMin % 60

  for (let week = 1; week <= weeks; week++) {
    const session = sessionByWeek.get(week)
    const { year, month, day } = addDays(firstSessionDate, (week - 1) * 7)
    const dtstart = formatLocal(year, month, day, SESSION_START_HOUR, SESSION_START_MIN)
    const dtend = formatLocal(year, month, day, endHour, endMin)
    const summary = session?.title
      ? `LearnVibeBuild Week ${week}: ${session.title}`
      : `LearnVibeBuild Week ${week}`

    const location = `${SESSION_VENUE_NAME} — ${SESSION_VENUE_ADDRESS}`

    const descParts: string[] = []
    descParts.push(`In person at ${SESSION_VENUE_NAME}: ${SESSION_VENUE_ADDRESS}`)
    if (meetingUrl) descParts.push(`Remote: ${meetingUrl}`)
    if (session?.description) descParts.push(session.description)
    descParts.push(`Dashboard: https://learnvibe.build/cohort/${cohortSlug}`)
    const description = descParts.join('\n\n')
    const uid = `lvb-${cohortSlug}-week-${week}@learnvibe.build`

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${uid}`)
    lines.push(`DTSTAMP:${dtstamp}`)
    lines.push(`DTSTART;TZID=${SESSION_TZID}:${dtstart}`)
    lines.push(`DTEND;TZID=${SESSION_TZID}:${dtend}`)
    lines.push(foldLine(`SUMMARY:${escapeText(summary)}`))
    lines.push(foldLine(`DESCRIPTION:${escapeText(description)}`))
    lines.push(foldLine(`LOCATION:${escapeText(location)}`))
    if (meetingUrl) {
      lines.push(foldLine(`URL:${escapeText(meetingUrl)}`))
    }
    lines.push('STATUS:CONFIRMED')
    lines.push('TRANSP:OPAQUE')
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}
