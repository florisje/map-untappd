import type { LayerManager } from './layers'
import type { Map as LeafletMap } from 'leaflet'
import type { VenueStore } from './venue-store'

const DEBOUNCE_MS = 200      // wait this long after the last moveend before firing
const MIN_INTERVAL_MS = 1000 // never start a new update() sooner than 1s after the last

const HEATMAP_OPTIONS = {
  radius: 25,
  blur: 15,
  maxZoom: 10,
  minOpacity: 0.6,
  gradient: { '0': '#ffffff', '0.5': '#f5c832', '1': '#f5a623' },
}

const LAYER_KEY = 'checkins'

/**
 * Renders Untappd venue data within the current viewport on every 'moveend',
 * switching between a heatmap and circle markers based on venue count.
 *
 * Queries the in-memory VenueStore synchronously — no network calls.
 * Rate-limited to one update per second (debounce + throttle).
 */
export class CheckinRenderer {
  private readonly map: LeafletMap
  private readonly layers: LayerManager
  private readonly store: VenueStore
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private lastCallTime = 0

  constructor(map: LeafletMap, layers: LayerManager, store: VenueStore) {
    this.map = map
    this.layers = layers
    this.store = store
    this.map.on('moveend', () => this.scheduleUpdate())
  }

  private scheduleUpdate(): void {
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer)
    const elapsed = Date.now() - this.lastCallTime
    const delay = Math.max(DEBOUNCE_MS, MIN_INTERVAL_MS - elapsed)
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null
      this.update()
    }, delay)
  }

  private update(): void {
    this.lastCallTime = Date.now()

    const response = this.store.queryViewport(this.map.getBounds())

    if (response.mode === 'heatmap') {
      this.layers.removeVenueMarkers(LAYER_KEY)
      this.layers.addHeatmap(LAYER_KEY, response.data, HEATMAP_OPTIONS)
    } else {
      this.layers.removeHeatmap(LAYER_KEY)
      this.layers.addVenueMarkers(LAYER_KEY, response.data)
    }
  }
}
