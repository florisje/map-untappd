import { singleIconDataUrl } from './layers'
import type { BeerColour } from './layers'
import type { Map as LeafletMap } from 'leaflet'
import type { VenueStore } from './venue-store'
import { parseCSV } from './csv-parse'

const LEGEND_ENTRIES: { colour: BeerColour; label: string }[] = [
  { colour: 'yellow', label: 'Lager · Pilsner · IPA · Wheat' },
  { colour: 'amber',  label: 'Bock · Porter · Brown Ale' },
  { colour: 'red',    label: 'Red Ale' },
  { colour: 'brown',  label: 'Dubbel · Quadrupel' },
  { colour: 'black',  label: 'Stout · Schwarzbier' },
  { colour: 'pink',   label: 'Sour · Gose · Lambic' },
  { colour: 'empty',  label: 'Unknown style' },
]

function legendRow(colour: BeerColour, label: string): string {
  return `
    <div class="legend-row">
      <img src="${singleIconDataUrl(colour)}" class="legend-icon" alt="${colour}" />
      <span>${label}</span>
    </div>`
}

/**
 * Mounts a hamburger toggle button and a fixed upload panel in the top-right corner.
 * The panel is hidden by default and revealed when the toggle is clicked.
 * Parses the selected CSV client-side and loads it into the VenueStore.
 * On success fires map 'moveend' to refresh the checkin layer.
 */
export function mountUploadPanel(map: LeafletMap, store: VenueStore): void {
  // Hamburger toggle button
  const toggle = document.createElement('button')
  toggle.id = 'upload-toggle'
  toggle.title = 'Upload checkins'
  toggle.innerHTML = '<span></span><span></span><span></span>'
  document.body.appendChild(toggle)

  const panel = document.createElement('div')
  panel.id = 'upload-panel'
  panel.innerHTML = `
    <div class="upload-panel__title">Map your Untappd checkins</div>
    <p class="upload-panel__description">Upload your Untappd CSV export to see your checkins on the map. Go to <strong>Account → Beer History</strong> on untappd.com to download it. Requires an <strong>Untappd Insider</strong> subscription.</p>
    <p class="upload-panel__privacy">Your data stays in your browser — nothing is uploaded to any server.</p>
    <input id="upload-file" type="file" accept=".csv" />
    <button id="upload-btn">Upload</button>
    <div id="upload-status" class="upload-panel__status"></div>
    <hr class="upload-panel__divider" />
    <div class="upload-panel__section-label">Legend</div>
    <div class="upload-panel__legend">
      ${LEGEND_ENTRIES.map(e => legendRow(e.colour, e.label)).join('')}
      <div class="legend-row">
        <img src="${import.meta.env.BASE_URL}icon-multi.svg" class="legend-icon legend-icon--multi" alt="multiple visits" />
        <span>Multiple checkins</span>
      </div>
    </div>
  `
  document.body.appendChild(panel)

  // Open panel automatically when no checkins are loaded
  panel.classList.add('upload-panel--open')

  toggle.addEventListener('click', () => {
    panel.classList.toggle('upload-panel--open')
  })

  // Close panel when clicking outside of it (and not on the toggle)
  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target as Node) && e.target !== toggle) {
      panel.classList.remove('upload-panel--open')
    }
  })

  const fileInput = document.getElementById('upload-file') as HTMLInputElement
  const btn = document.getElementById('upload-btn') as HTMLButtonElement
  const status = document.getElementById('upload-status') as HTMLDivElement

  btn.addEventListener('click', () => {
    const file = fileInput.files?.[0]
    if (!file) {
      status.textContent = 'Please select a CSV file.'
      status.className = 'upload-panel__status upload-panel__status--error'
      return
    }

    btn.disabled = true
    status.textContent = 'Processing…'
    status.className = 'upload-panel__status'

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const result = parseCSV(reader.result as string)
        store.setCheckins(result.checkins)

        const total = result.imported + result.skippedNoLocation + result.skippedInvalid
        const parts = [`${total} total`, `${result.imported} imported`]
        if (result.skippedNoLocation > 0) parts.push(`${result.skippedNoLocation} no location`)
        if (result.skippedInvalid > 0) parts.push(`${result.skippedInvalid} invalid`)
        status.textContent = parts.join(' · ')
        status.className = 'upload-panel__status upload-panel__status--ok'

        // Reset file input so the same file can be re-uploaded
        fileInput.value = ''

        // Close panel and refresh the map layer
        panel.classList.remove('upload-panel--open')
        map.fire('moveend')
      } catch (err) {
        status.textContent = `Error: ${(err as Error).message}`
        status.className = 'upload-panel__status upload-panel__status--error'
      } finally {
        btn.disabled = false
      }
    }
    reader.onerror = () => {
      status.textContent = 'Error reading file.'
      status.className = 'upload-panel__status upload-panel__status--error'
      btn.disabled = false
    }
    reader.readAsText(file)
  })

}
