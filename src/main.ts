import './style.css'
import L from 'leaflet'
import { MapManager } from './map'
import { LayerManager } from './layers'
import { VenueStore } from './venue-store'
import { CheckinRenderer } from './checkin-renderer'
import { mountUploadPanel } from './upload'

// leaflet.heat is a browser-globals plugin that expects window.L to exist.
// Static imports are hoisted, so we must set window.L first, then
// dynamic-import leaflet.heat so it runs after.
;(window as unknown as Record<string, unknown>).L = L
await import('leaflet.heat')

// Continental USA
const DEFAULT_CENTER: [number, number] = [39.5, -98.35]
const DEFAULT_ZOOM = 3

const mapManager = new MapManager('map', DEFAULT_CENTER, DEFAULT_ZOOM)
const layerManager = new LayerManager(mapManager.map)
const store = new VenueStore()

// Expose on window for console-driven experimentation during dev
declare global {
  interface Window {
    mapManager: MapManager
    layerManager: LayerManager
  }
}

window.mapManager = mapManager
window.layerManager = layerManager

new CheckinRenderer(mapManager.map, layerManager, store)
mountUploadPanel(mapManager.map, store)
