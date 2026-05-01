#!/usr/bin/env python3
"""
Clean an SRT transcript into readable LVB lesson markdown.

Generalized from the original week-2 cleanup pass. Logic:

  1. Parse SRT into (start, end, text) entries.
  2. Find a session start (welcome marker) and end (closing marker), trim away
     pre-roll / post-roll chatter.
  3. Strip filler words ("um", "uh", "you know", duplicated words, "gonna").
  4. Group entries into paragraphs by silence gap or max line count.
  5. Optionally tag paragraphs with section headers (loaded from a JSON config).
  6. Emit markdown with a header and the boilerplate auto-transcribed disclaimer.

Used as both a module (imported by transcribe-week.sh's Python helper) and a
CLI:

    python3 transcript_clean.py <input.srt> <output.md> --week 2 --title "Context"
    python3 transcript_clean.py <input.srt> <output.md> --week 3 --title "Voice" \\
        --sections scripts/lib/sections/cohort-1-week-3.json

Section config format (optional JSON file):

    [
      ["welcome",        "Welcome",      10],
      ["share a bit",    "Share-back",   80],
      ["homework",       "Homework",   1200]
    ]

Each row is (phrase, title, max_paragraph_index). The phrase is matched
case-insensitive against paragraph text; the first paragraph (under max_idx)
that contains the phrase gets the title. Each title is used at most once.
"""

import argparse
import json
import re
import sys
from pathlib import Path

# Universal markers — work across LVB sessions because Aaron consistently
# opens with "welcome" and closes with "see you next ..." / "thanks everyone".
START_MARKERS = [
    'welcome back',
    'welcome everybody',
    'so um first off',
    'first off, welcome',
    'so welcome',
    'well welcome',
    'welcome to',
]

END_MARKERS = [
    'see you next week',
    'see you next monday',
    'see you next time',
    'thank you all so much',
    'container wrapped',
    'formally say',
    'see you on monday',
    'see you next',
    'thanks everyone',
    'thanks y\'all',
    'thanks everybody',
]

# Default sections — structural, not topic-specific. Override per-week with
# --sections when finer detail is wanted.
DEFAULT_SECTIONS = [
    ('welcome',           'Welcome',       20),
    ('share a bit about', 'Share-back',   100),
    ('how was your week', 'Share-back',   100),
    ('how did your week', 'Share-back',   100),
    ('practice',          "This Week's Practice", 9999),
    ('homework',          'Homework',     9999),
    ('next week',         "What's Next",  9999),
    ('connectors',        "What's Next",  9999),
]


def parse_srt(text: str):
    """Parse SRT text into (start_seconds, end_seconds, line) tuples."""
    blocks = re.split(r'\n\s*\n', text.strip())
    out = []
    for block in blocks:
        lines = [l for l in block.strip().split('\n') if l.strip()]
        if len(lines) < 3:
            continue
        ts_match = re.match(
            r'(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*'
            r'(\d{2}):(\d{2}):(\d{2})[,.](\d{3})',
            lines[1],
        )
        if not ts_match:
            continue
        sh, sm, ss, sms, eh, em, es, ems = map(int, ts_match.groups())
        start = sh * 3600 + sm * 60 + ss + sms / 1000
        end = eh * 3600 + em * 60 + es + ems / 1000
        out.append((start, end, ' '.join(lines[2:]).strip()))
    return out


def strip_fillers(text: str) -> str:
    """Remove common filler words and duplicated stutters."""
    text = re.sub(r'^(Um|Uh|Umm|Uhh)[,.]?\s+', '', text)
    text = re.sub(r'\s+(um|uh|umm|uhh)[,]?\s+', ' ', text, flags=re.IGNORECASE)
    text = re.sub(r'\blike\s+(um|uh)\s+', 'like ', text, flags=re.IGNORECASE)
    common = [
        'I', 'we', 'you', 'he', 'she', 'it', 'they',
        'a', 'an', 'the', 'and', 'or', 'but', 'so',
        'that', 'this', 'is', 'are', 'was', 'were',
        'to', 'of', 'in', 'on', 'for', 'with',
        'just', 'like', 'really', 'very', 'actually',
        'kind', 'sort', 'all', 'some', 'many', 'much', 'more', 'most',
        'any', 'no', 'not',
        'can', 'could', 'would', 'should', 'will', 'may', 'might',
        'do', 'does', 'did', 'have', 'has', 'had', 'be', 'been', 'being',
        "it's", "we're", "you're", "I'm", "they're", "that's",
        "there's", "here's", "what's", "how's", "who's",
        'about', 'from', 'into', 'there', 'here', 'where', 'when',
        'then', 'now', 'back', 'out', 'up', 'down', 'off', 'on', 'yeah',
    ]
    for w in common:
        pattern = re.compile(rf'\b({re.escape(w)})\s+\1\b', re.IGNORECASE)
        text = pattern.sub(r'\1', text)
    text = re.sub(r"\bI'm\s+I'm\b", "I'm", text, flags=re.IGNORECASE)
    text = re.sub(r'\bso\s+so\b', 'so', text, flags=re.IGNORECASE)
    text = re.sub(r',?\s*you know,?\s+', ' ', text)
    text = re.sub(r'\s+([,.!?])', r'\1', text)
    text = re.sub(r'([,.!?])([a-zA-Z])', r'\1 \2', text)
    text = re.sub(r'\s{2,}', ' ', text)
    text = re.sub(r'^[,.\s]+', '', text)
    text = text.strip()
    if text and text[0].islower():
        text = text[0].upper() + text[1:]
    text = text.replace('gonna', 'going to')
    return text


def collapse_double_sentences(text: str) -> str:
    """Drop adjacent identical sentences ("yeah. yeah.") that survive cleanup."""
    sents = re.split(r'(?<=[.!?])\s+', text)
    out = []
    for s in sents:
        if out and s.strip().lower() == out[-1].strip().lower():
            continue
        out.append(s)
    return ' '.join(out)


def find_start_index(entries, markers):
    for i, (_, _, t) in enumerate(entries):
        lower = t.lower()
        for m in markers:
            if m in lower:
                return i
    return 0


def find_end_index(entries, markers):
    for i in range(len(entries) - 1, -1, -1):
        lower = entries[i][2].lower()
        for m in markers:
            if m in lower:
                return i + 1
    last_substantive = 0
    for i, (_, _, t) in enumerate(entries):
        if len(t) > 100:
            last_substantive = i
    return min(last_substantive + 8, len(entries))


def group_into_paragraphs(entries, gap_threshold=4.0, max_lines=6):
    if not entries:
        return []
    paragraphs = []
    current = [entries[0]]
    for i in range(1, len(entries)):
        gap = entries[i][0] - entries[i - 1][1]
        if gap > gap_threshold or len(current) >= max_lines:
            paragraphs.append(current)
            current = [entries[i]]
        else:
            current.append(entries[i])
    if current:
        paragraphs.append(current)
    return paragraphs


def assign_sections(paragraphs, section_markers):
    used = set()
    out = [None] * len(paragraphs)
    for i, para in enumerate(paragraphs):
        para_text = ' '.join(t for _, _, t in para).lower()
        for phrase, title, max_idx in section_markers:
            if i >= max_idx:
                continue
            if title in used:
                continue
            if phrase in para_text:
                out[i] = title
                used.add(title)
                break
    return out


def fmt_ts(seconds: float) -> str:
    m = int(seconds // 60)
    s = int(seconds % 60)
    return f"{m}:{s:02d}"


def load_section_markers(path: Path | None):
    if path is None:
        return DEFAULT_SECTIONS
    raw = json.loads(path.read_text(encoding='utf-8'))
    out = []
    for row in raw:
        if not isinstance(row, list) or len(row) != 3:
            raise ValueError(f"bad section row: {row!r} — want [phrase, title, max_idx]")
        phrase, title, max_idx = row
        out.append((str(phrase), str(title), int(max_idx)))
    return out


def clean(srt_text: str, *, header: str, section_markers=None) -> str:
    """Run the full cleanup pipeline and return markdown."""
    if section_markers is None:
        section_markers = DEFAULT_SECTIONS
    entries = parse_srt(srt_text)
    start_i = find_start_index(entries, START_MARKERS)
    end_i = find_end_index(entries, END_MARKERS)
    entries = entries[start_i:end_i]

    entries = [(s, e, strip_fillers(t)) for s, e, t in entries if t.strip()]
    entries = [(s, e, t) for s, e, t in entries if len(t) >= 4]

    paragraphs = group_into_paragraphs(entries)
    sections = assign_sections(paragraphs, section_markers)

    out_lines = [
        header,
        '',
        '_Auto-transcribed from the live recording (parakeet-mlx) and lightly '
        'edited for readability — filler words removed, paragraph breaks added, '
        'section markers inserted from content. Some transcription errors '
        'remain — names and technical terms especially. The recording above is '
        'the canonical source._',
        '',
    ]
    # Time offset of first kept entry — section timestamps shown relative to it.
    base_t = paragraphs[0][0][0] if paragraphs else 0.0
    for i, para in enumerate(paragraphs):
        if sections[i]:
            out_lines.append('')
            out_lines.append(f'## {sections[i]}')
            out_lines.append(f'_{fmt_ts(para[0][0] - base_t)}_')
            out_lines.append('')
        text_joined = ' '.join(t for _, _, t in para)
        text_joined = collapse_double_sentences(text_joined)
        out_lines.append(text_joined)
        out_lines.append('')

    return '\n'.join(out_lines).rstrip() + '\n'


def main():
    ap = argparse.ArgumentParser(description='Clean an SRT into LVB lesson transcript markdown.')
    ap.add_argument('input', help='Path to .srt file')
    ap.add_argument('output', help='Path to write .md file')
    ap.add_argument('--week', type=int, required=True, help='Week number (for header)')
    ap.add_argument('--title', default='', help='Lesson title (for header)')
    ap.add_argument('--sections', default=None, help='Optional JSON file overriding section markers')
    args = ap.parse_args()

    in_path = Path(args.input)
    out_path = Path(args.output)
    sections_path = Path(args.sections) if args.sections else None

    srt = in_path.read_text(encoding='utf-8')
    title_part = f' — {args.title}' if args.title else ''
    header = f'# Week {args.week}{title_part}: Session transcript'
    section_markers = load_section_markers(sections_path)
    md = clean(srt, header=header, section_markers=section_markers)
    out_path.write_text(md, encoding='utf-8')
    print(f'wrote {out_path} ({len(md)} bytes)', file=sys.stderr)


if __name__ == '__main__':
    main()
