import type { VenueMarker } from './types/checkins'

/** Escape a string for safe HTML insertion. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Build the HTML string for a venue popup.
 * All CSV-sourced strings are escaped before insertion.
 */
export function buildVenuePopup(v: VenueMarker): string {
  const location = [v.venue_city, v.venue_state].filter(Boolean).map(s => esc(s!)).join(', ')
  const rating = v.avg_rating !== null ? `${v.avg_rating.toFixed(2)} / 5` : null

  const displayBeers = v.beers.slice(0, 5)
  const beerItems = displayBeers.map(b => {
    const style = b.style ? `<span class="venue-popup__beer-style">${esc(b.style)}</span>` : ''
    return `<li>${esc(b.name)}${style}</li>`
  }).join('')

  const shownBeers = displayBeers.length
  let beerSectionLabel: string
  if (shownBeers === 0) {
    beerSectionLabel = ''
  } else if (shownBeers < v.checkin_count) {
    beerSectionLabel = `Last ${shownBeers} checkins of ${v.checkin_count} total`
  } else {
    beerSectionLabel = `${v.checkin_count} checkin${v.checkin_count === 1 ? '' : 's'}`
  }

  // Build visit subheader: "Month D, YYYY" or "N visits (Mon YYYY – Mon YYYY)"
  const parsedDates = v.visit_dates
    .map(d => new Date(d))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())

  let visitSubheader: string
  if (parsedDates.length === 1) {
    visitSubheader = parsedDates[0].toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } else if (parsedDates.length >= 2) {
    const first = parsedDates[0].toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
    const last = parsedDates[parsedDates.length - 1].toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
    const range = first === last ? first : `${first} \u2013 ${last}`
    visitSubheader = `${v.visit_count} visit${v.visit_count === 1 ? '' : 's'} (${range})`
  } else {
    visitSubheader = `${v.visit_count} visit${v.visit_count === 1 ? '' : 's'}`
  }

  return `
    <div class="venue-popup">
      <strong class="venue-popup__name">${esc(v.venue_name)}</strong>
      ${location ? `<div class="venue-popup__location">${location}</div>` : ''}
      <div class="venue-popup__subheader">${esc(visitSubheader)}</div>
      <div class="venue-popup__meta">
        ${rating ? `<span>${rating}</span>` : ''}
      </div>
      ${beerItems ? `<div class="venue-popup__section-label">${esc(beerSectionLabel)}</div><ul class="venue-popup__beers">${beerItems}</ul>` : ''}
    </div>
  `.trim()
}
