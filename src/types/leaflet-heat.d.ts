/**
 * Ambient type declarations for leaflet.heat.
 *
 * The plugin has no official @types package. It mutates the global L namespace
 * by attaching L.HeatLayer and L.heatLayer after import, so we augment the
 * 'leaflet' module declaration here to keep TypeScript happy throughout the
 * rest of the codebase.
 *
 * leaflet.heat data point format:  [lat, lng]  or  [lat, lng, intensity]
 * intensity is a number in [0, max], defaults to 1.0 when omitted.
 */

import * as L from 'leaflet'

/** A heatmap data point: [latitude, longitude, intensity?] */
export type HeatLatLngTuple = [lat: number, lng: number, intensity?: number]

export interface HeatLayerOptions {
  /** Point radius in pixels (default: 25) */
  radius?: number
  /** Blur amount in pixels (default: 15) */
  blur?: number
  /** Minimum point opacity (default: 0.05) */
  minOpacity?: number
  /** Maximum intensity value for colour scaling (default: 1.0) */
  max?: number
  /** Zoom level at which intensity reaches its maximum (default: map maxZoom) */
  maxZoom?: number
  /** Custom colour gradient: keys are stops in [0,1], values are CSS colours */
  gradient?: Record<string, string>
}

declare module 'leaflet' {
  /** Canvas-based heatmap layer created by leaflet.heat */
  class HeatLayer extends L.Layer {
    constructor(latlngs: HeatLatLngTuple[], options?: HeatLayerOptions)
    setLatLngs(latlngs: HeatLatLngTuple[]): this
    addLatLng(latlng: HeatLatLngTuple): this
    setOptions(options: HeatLayerOptions): this
    redraw(): this
  }

  /** Factory function matching Leaflet's lowercase-factory convention */
  function heatLayer(latlngs: HeatLatLngTuple[], options?: HeatLayerOptions): HeatLayer
}
