import { QrCore } from './libs/QRcore.js'
import { QrSvgRenderer } from './libs/QRsvg.js'

const EXAMPLE_PAYLOAD = 'Grüße aus dem QR Atelier!'

class QRPlaygroundApp {
  constructor() {
    this.state = {
      data: '',
      options: {
        format: 'qr',
        contentMode: 'text',
        errorCorrectionLevel: 'Q',
        version: 0,
        mask: -1,
        encoding: 'utf-8',
        colorStart: '#0f172a',
        colorEnd: '#0ea5e9',
        dotStyle: 'rounded',
        cornerStyle: 'extra-rounded',
        logo: null,
        wifiAuth: 'WPA',
        wifiSsid: '',
        wifiPassword: '',
        wifiHidden: false,
      },
      currentSvg: '',
    }

    this.isDownloading = false
    this.debounceTimer = null

    this.ui = {
      container: document.getElementById('qr-preview'),
      status: document.getElementById('qr-status'),
      errorCorrection: document.getElementById('error-correction'),
      eccHelp: document.getElementById('ecc-help'),
      version: document.getElementById('qr-version'),
      mask: document.getElementById('qr-mask'),
      encoding: document.getElementById('qr-encoding'),
      downloadButtons: document.getElementById('download-buttons'),
      format: document.getElementById('code-format'),
      contentMode: document.getElementById('content-mode'),
      primaryInput: document.getElementById('primary-input'),
      primaryInputLabel: document.getElementById('primary-input-label'),
      primaryInputField: document.getElementById('field-primary-input'),
      dotShape: document.getElementById('dot-shape'),
      cornerShape: document.getElementById('corner-shape'),
      dotShapeField: document.getElementById('field-dot-shape'),
      cornerShapeField: document.getElementById('field-corner-shape'),
      wifiAuth: document.getElementById('wifi-auth'),
      wifiPassword: document.getElementById('wifi-password'),
      wifiHidden: document.getElementById('wifi-hidden'),
      wifiSection: document.getElementById('field-wifi-options'),
      downloadSize: document.getElementById('download-size'),
      logoUpload: document.getElementById('logo-upload'),
      logoUploadField: document.getElementById('field-logo-upload'),
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

  #init() {
    this.#bindEvents()
    this.#parseUrlParams()
    this.update()
  }

  #bindEvents() {
    this.ui.primaryInput.addEventListener('input', () => {
      // Save immediately so another control cannot overwrite pending input.
      if (this.state.options.contentMode === 'wifi') {
        this.state.options.wifiSsid = this.ui.primaryInput.value
      } else {
        this.state.data = this.ui.primaryInput.value
      }
      clearTimeout(this.debounceTimer)
      this.debounceTimer = setTimeout(() => this.update(), 180)
    })

    this.ui.errorCorrection.addEventListener('change', (e) => this.update({ errorCorrectionLevel: e.target.value }))
    this.ui.version.addEventListener('change', (e) => this.update({ version: Number(e.target.value) }))
    this.ui.mask.addEventListener('change', (e) => this.update({ mask: Number(e.target.value) }))
    this.ui.encoding.addEventListener('change', (e) => this.update({ encoding: e.target.value }))

    if (this.ui.format) {
      this.ui.format.addEventListener('change', (e) => this.update({ format: e.target.value }))
    }
    if (this.ui.contentMode) {
      this.ui.contentMode.addEventListener('change', (e) => this.update({ contentMode: e.target.value }))
    }
    this.ui.dotShape.addEventListener('change', (e) => this.update({ dotStyle: e.target.value }))
    this.ui.cornerShape.addEventListener('change', (e) => this.update({ cornerStyle: e.target.value }))
    if (this.ui.wifiAuth) this.ui.wifiAuth.addEventListener('change', (e) => this.update({ wifiAuth: e.target.value }))
    if (this.ui.wifiPassword) this.ui.wifiPassword.addEventListener('input', (e) => this.update({ wifiPassword: e.target.value }))
    if (this.ui.wifiHidden) this.ui.wifiHidden.addEventListener('change', (e) => this.update({ wifiHidden: e.target.checked }))

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

    this.ui.clearLogoBtn.addEventListener('click', () => {
      this.ui.logoUpload.value = ''
      this.ui.logoStatus.textContent = 'Kein Logo geladen.'
      this.update({ logo: null })
    })

    this.ui.btnSVG.addEventListener('click', () => this.#downloadSVG())
    this.ui.btnPNG.addEventListener('click', () => this.#downloadPNG())
  }

  #parseUrlParams() {
    const params = new URLSearchParams(window.location.search)
    const paramUrl = params.get('url')
    if (!paramUrl) return
    this.ui.primaryInput.value = paramUrl
    this.ui.primaryInput.dispatchEvent(new Event('input'))
  }

  update(newOptions = {}) {
    this.state.options = { ...this.state.options, ...newOptions }
    if (newOptions.data !== undefined) this.state.data = newOptions.data
    this.#syncFormatUi()

    const payload = this.#buildPayload()
    const isExample = !payload
    this.ui.downloadButtons.classList.toggle('hidden', isExample)

    try {
      const renderer = this.#createRenderer(300, payload || EXAMPLE_PAYLOAD)
      const svg = renderer.render()
      this.state.currentSvg = isExample ? '' : svg
      this.ui.container.innerHTML = svg
      const qr = renderer.qrCode
      this.ui.status.textContent = isExample
        ? 'Beispielvorschau – gib deinen eigenen Inhalt ein'
        : `Version ${qr.version} · ${qr.size} × ${qr.size} Module · Fehlerkorrektur ${qr.errorCorrectionLevel}${this.state.options.logo ? ' (Logo)' : ''}`
    } catch (error) {
      this.state.currentSvg = ''
      this.ui.downloadButtons.classList.add('hidden')
      const message = document.createElement('p')
      message.className = 'preview-error'
      message.textContent = 'Kein QR-Code'
      const explanation = error.message.includes('too large')
        ? 'Der Inhalt passt nicht in diese QR-Version. Wähle eine größere Version, „Automatisch“ oder eine geringere Fehlerkorrektur.'
        : error.message.includes('cannot be encoded')
          ? 'Diese Zeichen passen nicht zur gewählten Zeichencodierung. Wähle UTF-8.'
          : `Der QR-Code konnte nicht erstellt werden: ${error.message}`
      this.ui.container.replaceChildren(message)
      this.ui.status.textContent = explanation
    }
  }

  getDownloadSize() {
    return parseInt(this.ui.downloadSize.value, 10)
  }

  hasCode() {
    return !!this.state.currentSvg && !!this.#buildPayload()
  }

  async #downloadSVG() {
    if (this.isDownloading || !this.hasCode()) return

    this.isDownloading = true
    try {
      const size = this.getDownloadSize()
      const renderer = this.#createRenderer(size)
      const svg = renderer.render()
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
      this.#triggerBlobDownload(blob, this.#buildDownloadFilename('svg', size))
    } finally {
      this.isDownloading = false
    }
  }

  async #downloadPNG() {
    if (this.isDownloading || !this.hasCode()) return

    this.isDownloading = true
    try {
      const size = this.getDownloadSize()
      const renderer = this.#createRenderer(size)
      const svg = renderer.render()
      const blob = await this.#svgToPngBlob(svg, size)
      this.#triggerBlobDownload(blob, this.#buildDownloadFilename('png', size))
    } catch (error) {
      console.error('PNG Download fehlgeschlagen:', error)
      alert('Der PNG-Export ist fehlgeschlagen.')
    } finally {
      this.isDownloading = false
    }
  }

  #createRenderer(size, payload = this.#buildPayload()) {
    const ecl = this.state.options.logo ? 'H' : this.state.options.errorCorrectionLevel
    const { version, mask, encoding } = this.state.options
    const qr = new QrCore(payload, {
      errorCorrectionLevel: ecl,
      minVersion: version || 1,
      maxVersion: version || 40,
      mask,
      encoding,
    }).generate()
    return new QrSvgRenderer(qr, { size, ...this.state.options })
  }

  #syncFormatUi() {
    if (!['qr'].includes(this.state.options.format)) {
      this.state.options.format = 'qr'
    }
    if (!['text', 'wifi'].includes(this.state.options.contentMode)) {
      this.state.options.contentMode = 'text'
    }
    if (this.ui.format) this.ui.format.value = this.state.options.format
    if (this.ui.contentMode) this.ui.contentMode.value = this.state.options.contentMode
    const hasLogo = !!this.state.options.logo
    this.ui.errorCorrection.value = hasLogo ? 'H' : this.state.options.errorCorrectionLevel
    this.ui.errorCorrection.disabled = hasLogo
    this.ui.eccHelp.textContent = hasLogo
      ? 'Mit Logo ist H aktiv. Nach dem Entfernen gilt wieder deine gewählte Stufe. Prüfe den fertigen Code mit einem Scanner.'
      : 'Höhere Fehlerkorrektur macht den Code robuster, benötigt aber mehr Platz.'

    const isWifi = this.state.options.contentMode === 'wifi'

    if (this.ui.dotShape) this.ui.dotShape.disabled = false
    if (this.ui.cornerShape) this.ui.cornerShape.disabled = false
    if (this.ui.logoUpload) this.ui.logoUpload.disabled = false
    if (this.ui.clearLogoBtn) this.ui.clearLogoBtn.disabled = false
    if (this.ui.wifiPassword) this.ui.wifiPassword.disabled = isWifi && this.state.options.wifiAuth === 'nopass'

    if (this.ui.dotShapeField) this.ui.dotShapeField.classList.remove('hidden')
    if (this.ui.cornerShapeField) this.ui.cornerShapeField.classList.remove('hidden')
    if (this.ui.logoUploadField) this.ui.logoUploadField.classList.remove('hidden')
    if (this.ui.wifiSection) {
      this.ui.wifiSection.hidden = !isWifi
      this.ui.wifiSection.classList.toggle('hidden', !isWifi)
      this.ui.wifiSection.style.display = isWifi ? '' : 'none'
    }

    if (this.ui.primaryInputField) {
      this.ui.primaryInputField.hidden = false
      this.ui.primaryInputField.classList.remove('hidden')
      this.ui.primaryInputField.style.display = ''
    }
    if (this.ui.primaryInputLabel) {
      this.ui.primaryInputLabel.textContent = isWifi ? 'SSID' : 'URL oder Text'
    }
    if (this.ui.primaryInput) {
      this.ui.primaryInput.placeholder = isWifi ? 'Mein WLAN' : 'https://example.com'
      this.ui.primaryInput.value = isWifi ? (this.state.options.wifiSsid || '') : this.state.data
      this.ui.primaryInput.autocomplete = 'off'
    }
  }

  #buildPayload() {
    if (this.state.options.contentMode === 'wifi') {
      return this.#buildWifiPayload()
    }
    return this.state.data
  }

  #filePrefix() {
    return this.state.options.contentMode === 'wifi' ? 'wifi-qr' : 'qr-code'
  }

  #buildDownloadFilename(extension, size) {
    const prefix = this.#filePrefix()
    const dataHint = this.#dataHint()
    const timestamp = this.#timestampForFilename()
    return `${prefix}-${dataHint}-${size}-${timestamp}.${extension}`
  }

  #dataHint() {
    const source = this.state.options.contentMode === 'wifi' ? this.state.options.wifiSsid : this.state.data
    const raw = (source || '').trim().replace(/^https?:\/\//i, '')
    const ascii = raw
      .normalize('NFKD')
      .replace(/[^\x00-\x7F]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    return (ascii || 'code').slice(0, 32)
  }

  #timestampForFilename() {
    const now = new Date()
    const pad = (value) => String(value).padStart(2, '0')
    const year = now.getFullYear()
    const month = pad(now.getMonth() + 1)
    const day = pad(now.getDate())
    const hours = pad(now.getHours())
    const minutes = pad(now.getMinutes())
    const seconds = pad(now.getSeconds())
    return `${year}${month}${day}-${hours}${minutes}${seconds}`
  }

  #buildWifiPayload() {
    const ssid = (this.state.options.wifiSsid || '').trim()
    if (!ssid) return ''

    const auth = this.state.options.wifiAuth || 'WPA'
    const password = this.state.options.wifiPassword || ''
    const hidden = !!this.state.options.wifiHidden
    const segments = [
      'WIFI:',
      `T:${auth};`,
      `S:${this.#escapeWifiValue(ssid)};`,
    ]

    if (auth !== 'nopass') {
      segments.push(`P:${this.#escapeWifiValue(password)};`)
    }

    if (hidden) {
      segments.push('H:true;')
    }

    segments.push(';')
    return segments.join('')
  }

  #escapeWifiValue(value) {
    return String(value)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/:/g, '\\:')
      .replace(/"/g, '\\"')
      .replace(/\r?\n/g, ' ')
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

document.addEventListener('DOMContentLoaded', () => {
  new QRPlaygroundApp()
})
