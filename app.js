import { QrCore } from './libs/QRcore.js'
import { QrSvgRenderer } from './libs/QRsvg.js'

class QRPlaygroundApp {
  constructor() {
    this.state = {
      data: '',
      options: {
        format: 'qr',
        errorCorrectionLevel: 'Q',
        colorStart: '#0f172a',
        colorEnd: '#0ea5e9',
        dotStyle: 'rounded',
        cornerStyle: 'extra-rounded',
        logo: null,
        wifiAuth: 'WPA',
        wifiPassword: '',
        wifiHidden: false,
      },
      currentSvg: '',
    }

    this.isDownloading = false
    this.debounceTimer = null

    this.ui = {
      container: document.getElementById('qr-preview'),
      placeholder: document.getElementById('qr-placeholder'),
      downloadButtons: document.getElementById('download-buttons'),
      format: document.getElementById('code-format'),
      urlInput: document.getElementById('url-input'),
      urlLabel: document.querySelector('label[for="url-input"]'),
      dotShape: document.getElementById('dot-shape'),
      aztecStyle: document.getElementById('aztec-style'),
      cornerShape: document.getElementById('corner-shape'),
      dotShapeField: document.getElementById('field-dot-shape'),
      aztecStyleField: document.getElementById('field-aztec-style'),
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
    this.#syncFormatUi()
  }

  #bindEvents() {
    this.ui.urlInput.addEventListener('input', () => {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = setTimeout(() => {
        this.update({ data: this.ui.urlInput.value.trim() })
      }, 180)
    })

    if (this.ui.format) {
      this.ui.format.addEventListener('change', (e) => this.update({ format: e.target.value }))
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
    this.ui.urlInput.value = paramUrl
    this.ui.urlInput.dispatchEvent(new Event('input'))
  }

  update(newOptions = {}) {
    this.state.options = { ...this.state.options, ...newOptions }
    if (newOptions.data !== undefined) this.state.data = newOptions.data
    this.#syncFormatUi()

    if (!this.state.data) {
      this.ui.container.innerHTML = ''
      this.ui.container.appendChild(this.ui.placeholder)
      this.ui.placeholder.classList.remove('hidden')
      this.ui.downloadButtons.classList.add('hidden')
      this.state.currentSvg = ''
      return
    }

    this.ui.placeholder.classList.add('hidden')
    this.ui.downloadButtons.classList.remove('hidden')

    try {
      const renderer = this.#createRenderer(300)
      this.state.currentSvg = renderer.render()
      this.ui.container.innerHTML = this.state.currentSvg
    } catch (error) {
      console.error('Fehler beim Generieren des Codes:', error)
      this.ui.container.innerHTML = `<p style="color: var(--rose); text-align: center;">Ein Fehler ist aufgetreten:<br>${error.message}</p>`
    }
  }

  getDownloadSize() {
    return parseInt(this.ui.downloadSize.value, 10)
  }

  hasCode() {
    return !!this.state.currentSvg
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

  #createRenderer(size) {
    const payload = this.#buildPayload()
    const ecl = this.state.options.logo ? 'H' : this.state.options.errorCorrectionLevel
    const qr = new QrCore(payload, { errorCorrectionLevel: ecl }).generate()
    return new QrSvgRenderer(qr, { size, ...this.state.options })
  }

  #syncFormatUi() {
    if (!['qr', 'wifi'].includes(this.state.options.format)) {
      this.state.options.format = 'qr'
    }
    if (this.ui.format) this.ui.format.value = this.state.options.format

    const isWifi = this.state.options.format === 'wifi'

    if (this.ui.dotShape) this.ui.dotShape.disabled = false
    if (this.ui.cornerShape) this.ui.cornerShape.disabled = false
    if (this.ui.logoUpload) this.ui.logoUpload.disabled = false
    if (this.ui.clearLogoBtn) this.ui.clearLogoBtn.disabled = false
    if (this.ui.wifiPassword) this.ui.wifiPassword.disabled = isWifi && this.state.options.wifiAuth === 'nopass'

    if (this.ui.dotShapeField) this.ui.dotShapeField.classList.remove('hidden')
    if (this.ui.aztecStyleField) this.ui.aztecStyleField.classList.add('hidden')
    if (this.ui.cornerShapeField) this.ui.cornerShapeField.classList.remove('hidden')
    if (this.ui.logoUploadField) this.ui.logoUploadField.classList.remove('hidden')
    if (this.ui.wifiSection) this.ui.wifiSection.classList.toggle('hidden', !isWifi)

    if (this.ui.urlLabel) this.ui.urlLabel.textContent = isWifi ? 'SSID / Netzwerkname' : 'URL oder Text'
    this.ui.urlInput.placeholder = isWifi ? 'Mein WLAN' : 'https://example.com'
  }

  #buildPayload() {
    if (this.state.options.format === 'wifi') {
      return this.#buildWifiPayload()
    }
    return this.state.data
  }

  #filePrefix() {
    return this.state.options.format === 'wifi' ? 'wifi-qr' : 'qr-code'
  }

  #buildDownloadFilename(extension, size) {
    const prefix = this.#filePrefix()
    const dataHint = this.#dataHint()
    const timestamp = this.#timestampForFilename()
    return `${prefix}-${dataHint}-${size}-${timestamp}.${extension}`
  }

  #dataHint() {
    const raw = (this.state.data || '').trim().replace(/^https?:\/\//i, '')
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
    const ssid = (this.state.data || '').trim()
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
