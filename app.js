import { QrCore } from './libs/QRcore.js'
import { QrSvgRenderer } from './libs/QRsvg.js'
import { AztecCore } from './libs/AztecCore.js'
import { AztecSvgRenderer } from './libs/AztecSvg.js'

class QRPlaygroundApp {
  constructor() {
    this.state = {
      data: '',
      options: {
        format: 'qr',
        errorCorrectionLevel: 'Q',
        colorStart: '#0f172a',
        colorEnd: '#0ea5e9',
        aztecStyle: 'square',
        dotStyle: 'rounded',
        cornerStyle: 'extra-rounded',
        logo: null,
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
      dotShape: document.getElementById('dot-shape'),
      aztecStyle: document.getElementById('aztec-style'),
      cornerShape: document.getElementById('corner-shape'),
      dotShapeField: document.getElementById('field-dot-shape'),
      aztecStyleField: document.getElementById('field-aztec-style'),
      cornerShapeField: document.getElementById('field-corner-shape'),
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

    this.ui.format.addEventListener('change', (e) => this.update({ format: e.target.value }))
    this.ui.aztecStyle.addEventListener('change', (e) => this.update({ aztecStyle: e.target.value }))
    this.ui.dotShape.addEventListener('change', (e) => this.update({ dotStyle: e.target.value }))
    this.ui.cornerShape.addEventListener('change', (e) => this.update({ cornerStyle: e.target.value }))

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
      this.#triggerBlobDownload(blob, `${this.#filePrefix()}-${size}.svg`)
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
      this.#triggerBlobDownload(blob, `${this.#filePrefix()}-${size}.png`)
    } catch (error) {
      console.error('PNG Download fehlgeschlagen:', error)
      alert('Der PNG-Export ist fehlgeschlagen.')
    } finally {
      this.isDownloading = false
    }
  }

  #createRenderer(size) {
    if (this.state.options.format === 'aztec') {
      const aztec = new AztecCore(this.state.data).generate()
      return new AztecSvgRenderer(aztec, {
        size,
        colorStart: this.state.options.colorStart,
        colorEnd: this.state.options.colorEnd,
        moduleStyle: this.state.options.aztecStyle,
      })
    }

    const ecl = this.state.options.logo ? 'H' : this.state.options.errorCorrectionLevel
    const qr = new QrCore(this.state.data, { errorCorrectionLevel: ecl }).generate()
    return new QrSvgRenderer(qr, { size, ...this.state.options })
  }

  #syncFormatUi() {
    const isAztec = this.state.options.format === 'aztec'
    this.ui.dotShape.disabled = isAztec
    this.ui.cornerShape.disabled = isAztec
    this.ui.logoUpload.disabled = isAztec
    this.ui.clearLogoBtn.disabled = isAztec

    this.ui.dotShapeField.classList.toggle('hidden', isAztec)
    this.ui.aztecStyleField.classList.toggle('hidden', !isAztec)
    this.ui.cornerShapeField.classList.toggle('hidden', isAztec)
    this.ui.logoUploadField.classList.toggle('hidden', isAztec)

    if (isAztec && this.state.options.logo) {
      this.state.options.logo = null
      this.ui.logoUpload.value = ''
      this.ui.logoStatus.textContent = 'Kein Logo geladen.'
    }
  }

  #filePrefix() {
    return this.state.options.format === 'aztec' ? 'aztec-code' : 'qr-code'
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
