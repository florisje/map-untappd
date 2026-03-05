import type { RawCheckin, VenueMarker, VenuesResponse } from './types/checkins'
import type { LatLngBounds } from 'leaflet'

const THRESHOLD = 100

/** Hour at which a new "visit day" starts. Checkins before this hour count as the previous day. */
const DAY_CUTOFF_HOUR = 6

/**
 * In-memory store for parsed Untappd checkins.
 * Replaces the SQLite database + /api/venues endpoint.
 *
 * Checkins are grouped by rounded (lat, lng) at query time,
 * switching between heatmap and marker mode based on venue count.
 */
export class VenueStore {
  private checkins: RawCheckin[] = []

  /** Replace all checkins (called after CSV parse). */
  setCheckins(checkins: RawCheckin[]): void {
    this.checkins = checkins
  }

  /** Query checkins within a Leaflet bounds, returning a VenuesResponse. */
  queryViewport(bounds: LatLngBounds): VenuesResponse {
    const south = bounds.getSouth()
    const north = bounds.getNorth()
    const west = bounds.getWest()
    const east = bounds.getEast()

    // Filter to viewport
    const inView = this.checkins.filter(c =>
      c.venue_lat >= south && c.venue_lat <= north &&
      c.venue_lng >= west && c.venue_lng <= east
    )

    // Group by rounded coordinates (already rounded to 4dp in csv-parse)
    const groups = new Map<string, RawCheckin[]>()
    for (const c of inView) {
      const key = `${c.venue_lat},${c.venue_lng}`
      let group = groups.get(key)
      if (!group) {
        group = []
        groups.set(key, group)
      }
      group.push(c)
    }

    if (groups.size === 0) {
      return { mode: 'heatmap', data: [] }
    }

    // Heatmap mode: too many venues for markers
    if (groups.size > THRESHOLD) {
      let maxCount = 0
      for (const g of groups.values()) {
        if (g.length > maxCount) maxCount = g.length
      }
      const data: [number, number, number][] = []
      for (const [key, g] of groups) {
        const [lat, lng] = key.split(',').map(Number)
        data.push([lat, lng, g.length / maxCount])
      }
      return { mode: 'heatmap', data }
    }

    // Markers mode: aggregate per venue
    const markers: VenueMarker[] = []
    for (const g of groups.values()) {
      const first = g[0]

      // Average rating, excluding nulls
      let ratingSum = 0
      let ratingCount = 0
      for (const c of g) {
        if (c.rating_score !== null) {
          ratingSum += c.rating_score
          ratingCount++
        }
      }
      const avg_rating = ratingCount > 0
        ? Math.round((ratingSum / ratingCount) * 100) / 100
        : null

      // Beers sorted by checkin date (newest first), top 5
      const sorted = [...g].sort((a, b) => {
        if (a.created_at > b.created_at) return -1
        if (a.created_at < b.created_at) return 1
        return 0
      })
      const beers: { name: string; style: string | null }[] = []
      for (const c of sorted) {
        const b = c.beer_name.trim()
        if (b) beers.push({ name: b, style: c.beer_style })
      }

      // Visit dates: deduplicated by calendar date (with 6am cutoff), sorted newest-first
      const visitDays = new Set<string>()
      const dates: string[] = []
      for (const c of g) {
        const d = c.created_at.trim()
        if (!d) continue
        // Compute the "visit day" — subtract cutoff hours so late-night checkins
        // fall on the previous calendar date
        const dt = new Date(d)
        if (isNaN(dt.getTime())) continue
        const shifted = new Date(dt.getTime() - DAY_CUTOFF_HOUR * 3600_000)
        const dayKey = shifted.toISOString().slice(0, 10)
        if (!visitDays.has(dayKey)) {
          visitDays.add(dayKey)
          dates.push(d)
        }
      }
      dates.sort().reverse()
      const visit_count = visitDays.size

      // Dominant beer style — most frequent non-null style
      const styleCounts = new Map<string, number>()
      for (const c of g) {
        if (c.beer_style) {
          styleCounts.set(c.beer_style, (styleCounts.get(c.beer_style) ?? 0) + 1)
        }
      }
      let dominant: string | null = null
      let maxStyleCount = 0
      for (const [style, count] of styleCounts) {
        if (count > maxStyleCount) {
          maxStyleCount = count
          dominant = style
        }
      }

      markers.push({
        lat: first.venue_lat,
        lng: first.venue_lng,
        venue_name: first.venue_name,
        venue_city: first.venue_city,
        venue_state: first.venue_state,
        visit_count,
        checkin_count: g.length,
        avg_rating,
        beers: beers.slice(0, 5),
        visit_dates: dates,
        beer_style: dominant,
      })
    }

    return { mode: 'markers', data: markers }
  }
}
