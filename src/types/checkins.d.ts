export interface RawCheckin {
  checkin_id: string
  beer_name: string
  brewery_name: string
  beer_style: string | null
  rating_score: number | null
  venue_name: string
  venue_city: string | null
  venue_state: string | null
  venue_lat: number
  venue_lng: number
  created_at: string
}

export interface VenueMarker {
  lat: number
  lng: number
  venue_name: string
  venue_city: string | null
  venue_state: string | null
  visit_count: number
  checkin_count: number
  avg_rating: number | null
  beers: { name: string; style: string | null }[]
  visit_dates: string[]
  beer_style: string | null
}

import type { HeatLatLngTuple } from './leaflet-heat'

export type VenuesResponse =
  | { mode: 'heatmap'; data: HeatLatLngTuple[] }
  | { mode: 'markers'; data: VenueMarker[] }
