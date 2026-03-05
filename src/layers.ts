import L from 'leaflet'
import type { HeatLatLngTuple, HeatLayerOptions } from './types/leaflet-heat'
import type { VenueMarker } from './types/checkins'
import { buildVenuePopup } from './popup'

// ---------------------------------------------------------------------------
// Beer style → colour classification
// ---------------------------------------------------------------------------

export type BeerColour = 'yellow' | 'amber' | 'red' | 'brown' | 'black' | 'pink' | 'empty'

/** Map a raw Untappd beer_style string to one of six display colours. */
function beerColour(style: string | null): BeerColour {
  if (!style) return 'empty'
  const s = style.toLowerCase()

  // Brown — dark Belgian ales (mahogany, not black)
  if (
    s.includes('quadrupel') || s.includes('strong dark') || s.includes('dubbel')
  ) return 'brown'

  // Black — dark stouts, schwarzbier; checked before lager catch-all
  if (
    s.includes('stout') || s.includes('schwarzbier') ||
    s.includes('black') || s.includes('baltic') ||
    (s.includes('lager') && (s.includes('dark') || s.includes('tmavé')))
  ) return 'black'

  // Pink — sours, wilds, brett, lambic (before red so Flanders Red → pink)
  if (
    s.includes('sour') || s.includes('gose') ||
    s.includes('berliner') || s.includes('lambic') ||
    s.includes('gueuze') || s.includes('wild ale') ||
    s.includes('brett') || s.includes('flanders')
  ) return 'pink'

  // Red — red ales and amber/red lager variants
  if (
    s.includes('red ale') || s.includes('irish red') ||
    (s.includes('lager') && (s.includes('red') || s.includes('amber')))
  ) return 'red'

  // Amber — malty, brown, dark-ish; checked before yellow so Vienna/Dunkel
  // lager variants don't match the generic 'lager' below.
  if (
    s.includes('amber') ||
    s.includes('märzen') || s.includes('marzen') || s.includes('oktoberfest') ||
    s.includes('bock') || s.includes('dunkel') ||
    s.includes('brown ale') || s.includes('altbier') ||
    s.includes('vienna') || s.includes('scotch ale') ||
    s.includes('porter') ||
    s.includes('bitter') ||
    s.includes('scottish') || s.includes('rauchbier') ||
    s.includes('california common') || s.includes('winter ale') ||
    s.includes('dark ale') || s.includes('smoked beer') ||
    s.includes('polotmavé')
  ) return 'amber'

  // Yellow — light, golden, hoppy (broad catch-all; lager is safe here because
  // dark/amber/red lager variants have already been handled above)
  if (
    s.includes('pilsner') || s.includes('pils') ||
    s.includes('lager') || s.includes('helles') ||
    s.includes('kölsch') || s.includes('kolsch') ||
    s.includes('blonde') || s.includes('blond') ||
    s.includes('witbier') || s.includes('wheat') ||
    s.includes('hefeweizen') || s.includes('saison') ||
    s.includes('pale ale') || s.includes('ipa') ||
    s.includes('session ale') ||
    s.includes('shandy') || s.includes('radler') ||
    s.includes('golden ale') || s.includes('tripel') ||
    s.includes('cream ale') || s.includes('festbier') ||
    s.includes('kellerbier') || s.includes('zwickelbier') ||
    s.includes('grisette') || s.includes('malt liquor')
  ) return 'yellow'

  return 'empty'
}

// Colour tokens for each bucket
const COLOUR_TOKENS: Record<BeerColour, { fill: string; stroke: string; handleStroke: string; foam: string }> = {
  yellow: { fill: '#f5c832', stroke: '#c9961e', handleStroke: '#a07818', foam: 'rgba(255,253,231,0.5)' },
  amber:  { fill: '#f5a623', stroke: '#9b6200', handleStroke: '#c97d00', foam: 'rgba(255,253,231,0.5)' },
  red:    { fill: '#c0392b', stroke: '#7b241c', handleStroke: '#922b21', foam: 'rgba(255,253,231,0.5)' },
  brown:  { fill: '#6d3b1a', stroke: '#3d1e08', handleStroke: '#4a2510', foam: 'rgba(255,253,231,0.5)' },
  black:  { fill: '#1a1a1a', stroke: '#000000', handleStroke: '#333333', foam: 'rgba(255,253,231,0.5)' },
  pink:   { fill: '#e8a0c0', stroke: '#b5446e', handleStroke: '#c2185b', foam: 'rgba(252,228,236,0.5)' },
  empty:  { fill: 'none',    stroke: '#9b6200', handleStroke: '#c97d00', foam: 'none'    },
}

/** Build an inline SVG data URL for the single-visit icon with the given colour. */
export function singleIconDataUrl(colour: BeerColour): string {
  const { fill, stroke, handleStroke, foam } = COLOUR_TOKENS[colour]
  // Foam is hidden for the empty glass — use transparent
  const foamFill = foam === 'none' ? 'transparent' : foam
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 36" width="32" height="36">
  <circle cx="8"  cy="10" r="4.5" fill="${foamFill}"/>
  <circle cx="13" cy="8"  r="5"   fill="${foamFill}"/>
  <circle cx="18" cy="10" r="4"   fill="${foamFill}"/>
  <path d="M3,13 L21,13 L19,35 L5,35 Z" fill="${fill}" stroke="${stroke}" stroke-width="1.2"/>
  <path d="M21,17 C30,17 30,29 21,29" fill="none" stroke="${handleStroke}" stroke-width="4.5" stroke-linecap="round"/>
  <circle cx="8"  cy="12" r="4"   fill="${foamFill}"/>
  <circle cx="13" cy="10" r="4.5" fill="${foamFill}"/>
  <circle cx="18" cy="12" r="3.5" fill="${foamFill}"/>
  <path d="M6,16 Q6.5,25 6,33" stroke="rgba(255,255,255,0.4)" stroke-width="2" stroke-linecap="round" fill="none"/>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

// Cache icons so we create at most one L.Icon per colour
const iconCache = new Map<BeerColour, L.Icon>()

function singleVisitIcon(colour: BeerColour): L.Icon {
  if (iconCache.has(colour)) return iconCache.get(colour)!
  const icon = L.icon({
    iconUrl: singleIconDataUrl(colour),
    iconSize: [32, 36],
    iconAnchor: [12, 35],
    popupAnchor: [0, -35],
  })
  iconCache.set(colour, icon)
  return icon
}

export class LayerManager {
  private readonly map: L.Map
  private readonly heatLayers = new Map<string, L.HeatLayer>()
  private readonly markerLayers = new Map<string, L.LayerGroup>()

  constructor(map: L.Map) {
    this.map = map
  }

  /**
   * Add (or replace) a named heatmap layer.
   * Requires that 'leaflet.heat' has been imported as a side-effect before
   * this method is called so that L.heatLayer is available.
   */
  addHeatmap(name: string, points: HeatLatLngTuple[], options?: HeatLayerOptions): void {
    this.removeHeatmap(name)
    const layer = L.heatLayer(points, options).addTo(this.map)
    this.heatLayers.set(name, layer)
  }

  removeHeatmap(name: string): void {
    const layer = this.heatLayers.get(name)
    if (layer) {
      layer.remove()
      this.heatLayers.delete(name)
    }
  }

  /**
   * Add (or replace) a named marker layer from [lat, lng, intensity] triples.
   * Intensity is ignored for plain markers but kept in the signature so callers
   * can pass heatmap data directly.
   */
  addMarkers(name: string, points: HeatLatLngTuple[]): void {
    this.removeMarkers(name)
    const group = L.layerGroup(
      points.map(([lat, lng]) => L.circleMarker([lat, lng], { radius: 6 }))
    ).addTo(this.map)
    this.markerLayers.set(name, group)
  }

  removeMarkers(name: string): void {
    const layer = this.markerLayers.get(name)
    if (layer) {
      layer.remove()
      this.markerLayers.delete(name)
    }
  }

  /**
   * Add (or replace) a named layer of venue markers with beer glass icons.
   * Single visit → one pint glass; multiple visits → three pint glasses.
   */
  addVenueMarkers(name: string, venues: VenueMarker[]): void {
    this.removeVenueMarkers(name)
    const multiIcon = L.icon({
      iconUrl: `${import.meta.env.BASE_URL}icon-multi.svg`,
      iconSize: [56, 42],
      iconAnchor: [28, 38], // centre between the two mug bases
      popupAnchor: [0, -38],
    })
    const group = L.layerGroup(
      venues.map(v => {
        const icon = v.checkin_count === 1
          ? singleVisitIcon(beerColour(v.beer_style))
          : multiIcon
        const marker = L.marker([v.lat, v.lng], { icon })
          .bindTooltip(buildVenuePopup(v), {
            direction: 'top',
            sticky: false,
            opacity: 1,
            offset: L.point(0, -20),
            className: 'venue-tooltip',
          })

        const positionAndOpen = () => {
          const px = this.map.latLngToContainerPoint(marker.getLatLng())
          const size = this.map.getSize()
          const tooltip = marker.getTooltip()
          if (!tooltip) return

          const nearLeft = px.x < size.x * 0.2
          const nearRight = px.x > size.x * 0.8
          const nearTop = px.y < size.y * 0.3
          // Corner detection uses tighter thresholds
          const cornerLeft = px.x < size.x * 0.1
          const cornerRight = px.x > size.x * 0.9
          const cornerTop = px.y < size.y * 0.15
          const cornerBottom = px.y > size.y * 0.85
          const inCorner = (cornerLeft || cornerRight) && (cornerTop || cornerBottom)
          if (inCorner) {
            tooltip.options.direction = 'center'
            tooltip.options.offset = L.point(
              cornerLeft ? 60 : -60,
              cornerTop ? 40 : -40,
            )
            tooltip.getElement()?.classList.add('venue-tooltip--no-arrow')
          } else {
            let dir: 'top' | 'bottom' | 'left' | 'right' = 'top'
            if (nearLeft) dir = 'right'
            else if (nearRight) dir = 'left'
            else if (nearTop) dir = 'bottom'
            tooltip.options.direction = dir
            tooltip.options.offset = L.point(0, -20)
            tooltip.getElement()?.classList.remove('venue-tooltip--no-arrow')
          }

          marker.closeTooltip()
          marker.openTooltip()
        }

        const isTouch = 'ontouchstart' in window
        if (isTouch) {
          // Touch: tap to open, tap again or tap elsewhere to close
          marker.on('click', () => {
            if (marker.isTooltipOpen()) {
              marker.closeTooltip()
            } else {
              positionAndOpen()
            }
          })
        } else {
          // Desktop: hover to open/close
          marker.on('mouseover', positionAndOpen)
          marker.on('mouseout', () => marker.closeTooltip())
        }
        return marker
      })
    ).addTo(this.map)
    this.markerLayers.set(name, group)
  }

  removeVenueMarkers(name: string): void {
    this.removeMarkers(name)
  }

  clearAll(): void {
    for (const name of [...this.heatLayers.keys()]) {
      this.removeHeatmap(name)
    }
    for (const name of [...this.markerLayers.keys()]) {
      this.removeMarkers(name)
    }
  }
}
