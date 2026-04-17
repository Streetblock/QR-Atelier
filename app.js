import { QrCore } from './libs/QRcore.js'
import { QrSvgRenderer } from './libs/QRsvg.js'

class QRPlaygroundApp {
  constructor() {
    // 1. App State
    this.state = {
      data: '',
      options: {
        errorCorrectionLevel: 'Q',
        colorStart: '#0f172a',
        colorEnd: '#0ea5e9',
        dotStyle: 'rounded',
        cornerStyle: 'extra-rounded',
        logo: null,
      },
      currentSvg: '',
    }

    this.isDownloading = false
    this.debounceTimer = null

    // 2. DOM Elemente referenzieren
    this.ui = {
      container: document.getElementById('qr-preview'),
      placeholder: document.getElementById('qr-placeholder'),
      downloadButtons: document.getElementById('download-buttons'),
      urlInput: document.getElementById('url-input'),
      dotShape: document.getElementById('dot-shape'),
      cornerShape: document.getElementById('corner-shape'),
      downloadSize: document.getElementById('download-size'),
      logoUpload: document.getElementById('logo-upload'),
      clearLogoBtn: document.getElementById('btn-clear-logo'),
      logoStatus: document.getElementById('logo-status'),
      colorStart: document.getElementById('color-start'),
      colorEnd: document.getElementById('color-end'),
      colorStartHex: document.getElementById('color-start-hex'),
      colorEndHex: document.getElementById('color-end-hex'),
      btnSVG: document.getElementById('btn-download-svg'),
      btnPNG: document.getElementById('btn-download-png'),
    }

    this.#init()
  }

  // --- Initialisierung ---

  #init() {
    this.#bindEvents()
    this.#parseUrlParams()
  }

  #bindEvents() {
    // Text Input (mit Debounce, damit er nicht bei jedem Tastenanschlag rendert)
    this.ui.urlInput.addEventListener('input', () => {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = setTimeout(() => {
        this.update({ data: this.ui.urlInput.value.trim() })
      }, 180)
    })

    // Dropdowns
    this.ui.dotShape.addEventListener('change', (e) => this.update({ dotStyle: e.target.value }))
    this.ui.cornerShape.addEventListener('change', (e) => this.update({ cornerStyle: e.target.value }))

    // Farbauswahl
    const onColorChange = () => {
      this.ui.colorStartHex.textContent = this.ui.colorStart.value
      this.ui.colorEndHex.textContent = this.ui.colorEnd.value
      this.update({
        colorStart: this.ui.colorStart.value,
        colorEnd: this.ui.colorEnd.value,
      })
    }
    this.ui.colorStart.addEventListener('input', onColorChange)
    this.ui.colorEnd.addEventListener('input', onColorChange)

    // Logo Upload
    this.ui.logoUpload.addEventListener('change', () => {
      const file = this.ui.logoUpload.files[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = () => {
        this.ui.logoStatus.textContent = `Logo: ${file.name}`
        this.update({ logo: reader.result })
      }
      reader.onerror = () => {
        this.ui.logoStatus.textContent = 'Logo konnte nicht geladen werden.'
        this.update({ logo: null })
      }
      reader.readAsDataURL(file)
    })

    // Logo Entfernen
    this.ui.clearLogoBtn.addEventListener('click', () => {
      this.ui.logoUpload.value = ''
      this.ui.logoStatus.textContent = 'Kein Logo geladen.'
      this.update({ logo: null })
    })

    // Download Buttons
    this.ui.btnSVG.addEventListener('click', () => this.#downloadSVG())
    this.ui.btnPNG.addEventListener('click', () => this.#downloadPNG())
  }

  #parseUrlParams() {
    const params = new URLSearchParams(window.location.search)
    const paramUrl = params.get('url')
    if (paramUrl) {
      this.ui.urlInput.value = paramUrl
      // Event manuell triggern, damit die Vorschau generiert wird
      this.ui.urlInput.dispatchEvent(new Event('input'))
    }
  }

  // --- Haupt-Render-Zyklus ---

  update(newOptions = {}) {
    // State aktualisieren
    this.state.options = { ...this.state.options, ...newOptions }
    if (newOptions.data !== undefined) {
      this.state.data = newOptions.data
    }

    // Wenn kein Text da ist, Platzhalter anzeigen und abbrechen
    if (!this.state.data) {
      this.ui.container.innerHTML = ''
      this.ui.container.appendChild(this.ui.placeholder)
      this.ui.placeholder.classList.remove('hidden')
      this.ui.downloadButtons.classList.add('hidden')
      this.state.currentSvg = ''
      return
    }

    // Platzhalter verstecken, Buttons zeigen
    this.ui.placeholder.classList.add('hidden')
    this.ui.downloadButtons.classList.remove('hidden')

    try {
      // 1. Matrix mit QrCore generieren
      // Fehlerkorrekturlevel auf 'H' (High) setzen, wenn ein Logo verwendet wird
      const ecl = this.state.options.logo ? 'H' : this.state.options.errorCorrectionLevel
      const qrGenerator = new QrCore(this.state.data, { errorCorrectionLevel: ecl })
      const qrMatrix = qrGenerator.generate()

      // 2. SVG mit QrSvgRenderer generieren
      const renderer = new QrSvgRenderer(qrMatrix, {
        size: 300, // Vorschaugröße bleibt auf 300px fixiert
        ...this.state.options,
      })
      
      this.state.currentSvg = renderer.render()
      this.ui.container.innerHTML = this.state.currentSvg

    } catch (error) {
      console.error('Fehler beim Generieren des QR Codes:', error)
      this.ui.container.innerHTML = `<p style="color: var(--rose); text-align: center;">Ein Fehler ist aufgetreten:<br>${error.message}</p>`
    }
  }

  // --- Download Logik ---

  getDownloadSize() {
    return parseInt(this.ui.downloadSize.value, 10)
  }

  hasQR() {
    return !!this.state.currentSvg
  }

  async #downloadSVG() {
    if (this.isDownloading || !this.hasQR()) return

    this.isDownloading = true
    try {
      const size = this.getDownloadSize()
      
      // Um das SVG in der richtigen Größe herunterzuladen, rendern wir es kurz neu
      const ecl = this.state.options.logo ? 'H' : this.state.options.errorCorrectionLevel
      const qrGenerator = new QrCore(this.state.data, { errorCorrectionLevel: ecl })
      const qrMatrix = qrGenerator.generate()
      const renderer = new QrSvgRenderer(qrMatrix, { size, ...this.state.options })
      const downloadSvgString = renderer.render()

      const blob = new Blob([downloadSvgString], { type: 'image/svg+xml;charset=utf-8' })
      this.#triggerBlobDownload(blob, `qr-code-${size}.svg`)
    } finally {
      this.isDownloading = false
    }
  }

  async #downloadPNG() {
    if (this.isDownloading || !this.hasQR()) return

    this.isDownloading = true
    try {
      const size = this.getDownloadSize()
      
      // Auch hier: in der Exportgröße neu rendern
      const ecl = this.state.options.logo ? 'H' : this.state.options.errorCorrectionLevel
      const qrGenerator = new QrCore(this.state.data, { errorCorrectionLevel: ecl })
      const qrMatrix = qrGenerator.generate()
      const renderer = new QrSvgRenderer(qrMatrix, { size, ...this.state.options })
      const downloadSvgString = renderer.render()

      const blob = await this.#svgToPngBlob(downloadSvgString, size)
      this.#triggerBlobDownload(blob, `qr-code-${size}.png`)
    } catch (error) {
      console.error('PNG Download fehlgeschlagen:', error)
      alert('Der PNG-Export ist fehlgeschlagen.')
    } finally {
      this.isDownloading = false
    }
  }

  #triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  #svgToPngBlob(svgString, size) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' }))
      const image = new Image()

      image.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const context = canvas.getContext('2d')
        
        // Hintergrund transparent halten oder weiß füllen (hier transparent gelassen)
        context.drawImage(image, 0, 0, size, size)
        
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url)
          if (blob) resolve(blob)
          else reject(new Error('Canvas to Blob failed.'))
        }, 'image/png')
      }

      image.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('SVG konnte nicht als PNG gerendert werden.'))
      }

      image.src = url
    })
  }
}

// App starten, sobald das DOM vollständig geladen ist
document.addEventListener('DOMContentLoaded', () => {
  new QRPlaygroundApp()
})