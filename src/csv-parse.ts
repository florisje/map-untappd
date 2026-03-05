import type { RawCheckin } from './types/checkins'

export interface ParseResult {
  checkins: RawCheckin[]
  imported: number
  skippedNoLocation: number
  skippedInvalid: number
}

/**
 * Parse an Untappd CSV export into typed checkin records.
 *
 * Handles UTF-8 BOM, flexible column names (checkin_id vs beer_checkin_id,
 * beer_type vs beer_style, etc.), and skips rows missing required fields
 * or geocoordinates.
 */
export function parseCSV(text: string): ParseResult {
  // Strip UTF-8 BOM
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text

  const lines = clean.split(/\r?\n/)
  if (lines.length < 2) return { checkins: [], imported: 0, skippedNoLocation: 0, skippedInvalid: 0 }

  const headers = parseCsvLine(lines[0])
  const checkins: RawCheckin[] = []
  let skippedInvalid = 0
  let skippedNoLocation = 0

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = parseCsvLine(line)
    const row = Object.create(null) as Record<string, string>
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (values[j] ?? '').trim()
    }

    const checkin_id = row['checkin_id'] || row['beer_checkin_id'] || ''
    const beer_name = row['beer_name'] || ''
    const brewery_name = row['brewery_name'] || ''
    const beer_style = row['beer_type'] || row['beer_style'] || null
    const venue_name = row['venue_name'] || ''
    const venue_city = row['venue_city'] || null
    const venue_state = row['venue_state'] || null
    const created_at = row['created_at'] || row['checkin_date'] || ''
    const raw_lat = row['venue_lat'] || ''
    const raw_lng = row['venue_lng'] || ''
    const raw_rating = row['rating_score'] || ''

    // Skip rows missing required identity fields
    if (!checkin_id || !beer_name || !brewery_name) {
      skippedInvalid++
      continue
    }

    // Skip rows with no venue name or no geocoordinates
    if (!venue_name) {
      skippedNoLocation++
      continue
    }

    const lat = parseFloat(raw_lat)
    const lng = parseFloat(raw_lng)
    if (!isFinite(lat) || !isFinite(lng)) {
      skippedNoLocation++
      continue
    }

    // "0" rating means unrated in Untappd exports
    let rating_score: number | null = null
    const parsed = parseFloat(raw_rating)
    if (isFinite(parsed) && parsed > 0) rating_score = parsed

    checkins.push({
      checkin_id,
      beer_name,
      brewery_name,
      beer_style,
      rating_score,
      venue_name,
      venue_city,
      venue_state,
      venue_lat: Math.round(lat * 10000) / 10000,
      venue_lng: Math.round(lng * 10000) / 10000,
      created_at,
    })
  }

  return { checkins, imported: checkins.length, skippedNoLocation, skippedInvalid }
}

/** Parse a single CSV line, respecting quoted fields with embedded commas/newlines. */
function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let i = 0
  while (i <= line.length) {
    if (i === line.length) { fields.push(''); break }
    if (line[i] === '"') {
      // Quoted field
      let value = ''
      i++ // skip opening quote
      while (i < line.length) {
        if (line[i] === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            value += '"'
            i += 2
          } else {
            i++ // skip closing quote
            break
          }
        } else {
          value += line[i]
          i++
        }
      }
      fields.push(value)
      if (i < line.length && line[i] === ',') i++ // skip delimiter
    } else {
      // Unquoted field
      const next = line.indexOf(',', i)
      if (next === -1) {
        fields.push(line.slice(i))
        break
      }
      fields.push(line.slice(i, next))
      i = next + 1
    }
  }
  return fields
}
