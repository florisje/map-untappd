import L from 'leaflet'

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

export class MapManager {
  readonly map: L.Map

  constructor(elementId: string, center: [number, number], zoom: number) {
    this.map = L.map(elementId, { center, zoom })

    L.tileLayer(OSM_TILE_URL, {
      attribution: OSM_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(this.map)
  }
}
