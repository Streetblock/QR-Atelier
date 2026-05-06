import { QrCore } from './libs/QRcore.js'
import { QrSvgRenderer } from './libs/QRsvg.js'
import { DmCore } from './libs/DMcore.js'
import { DmSvgRenderer } from './libs/DMsvg.js'

class QRPlaygroundApp {
  constructor() {
    this.state = {
      data: '',
      options: {
        codeType: 'qr',
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

    this.ui = {
      container: document.getElementById('qr-preview'),
      placeholder: document.getElementById('qr-placeholder'),
      downloadButtons: document.getElementById('download-buttons'),
      urlInput: document.getElementById('url-input'),
      codeType: document.getElementById('code-type'),
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

  #init() {
    this.#bindEvents()
    this.#parseUrlParams()
  }

  #bindEvents() {
    this.ui.urlInput.addEventListener('input', () => {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = setTimeout(() => {
        this.update({ data: this.ui.urlInput.value.trim() })
      }, 180)
    })

    this.ui.codeType.addEventListener('change', (e) => this.update({ codeType: e.target.value }))
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
    if (paramUrl) {
      this.ui.urlInput.value = paramUrl
      this.ui.urlInput.dispatchEvent(new Event('input'))
    }
  }

  update(newOptions = {}) {
    this.state.options = { ...this.state.options, ...newOptions }
    if (newOptions.data !== undefined) {
      this.state.data = newOptions.data
    }

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
      this.state.currentSvg = this.#buildSvg(300)
      this.ui.container.innerHTML = this.state.currentSvg
      this.#syncControlStates()
    } catch (error) {
      console.error('Fehler beim Generieren des Codes:', error)
      this.ui.container.innerHTML = `<p style="color: var(--rose); text-align: center;">Ein Fehler ist aufgetreten:<br>${error.message}</p>`
    }
  }

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
      const downloadSvgString = this.#buildSvg(size)
      const blob = new Blob([downloadSvgString], { type: 'image/svg+xml;charset=utf-8' })
      this.#triggerBlobDownload(blob, `${this.#getFilePrefix()}-${size}.svg`)
    } finally {
      this.isDownloading = false
    }
  }

  async #downloadPNG() {
    if (this.isDownloading || !this.hasQR()) return

    this.isDownloading = true
    try {
      const size = this.getDownloadSize()
      const downloadSvgString = this.#buildSvg(size)
      const blob = await this.#svgToPngBlob(downloadSvgString, size)
      this.#triggerBlobDownload(blob, `${this.#getFilePrefix()}-${size}.png`)
    } catch (error) {
      console.error('PNG Download fehlgeschlagen:', error)
      alert('Der PNG-Export ist fehlgeschlagen.')
    } finally {
      this.isDownloading = false
    }
  }

  #buildSvg(size) {
    if (this.state.options.codeType === 'dm') {
      const dmGenerator = new DmCore(this.state.data)
      const dmMatrix = dmGenerator.generate()
      const dmRenderer = new DmSvgRenderer(dmMatrix, {
        size,
        colorStart: '#000000',
        colorEnd: '#000000',
        dotStyle: 'square',
        margin: 12,
        background: '#ffffff',
      })
      return dmRenderer.render()
    }

    const ecl = this.state.options.logo ? 'H' : this.state.options.errorCorrectionLevel
    const qrGenerator = new QrCore(this.state.data, { errorCorrectionLevel: ecl })
    const qrMatrix = qrGenerator.generate()
    const qrRenderer = new QrSvgRenderer(qrMatrix, { size, ...this.state.options })
    return qrRenderer.render()
  }

  #syncControlStates() {
    const isDm = this.state.options.codeType === 'dm'
    this.ui.cornerShape.disabled = isDm
    this.ui.logoUpload.disabled = isDm
    this.ui.clearLogoBtn.disabled = isDm

    if (isDm && this.state.options.logo) {
      this.state.options.logo = null
      this.ui.logoUpload.value = ''
      this.ui.logoStatus.textContent = 'Logo deaktiviert fuer Data Matrix.'
    } else if (!isDm && this.ui.logoStatus.textContent === 'Logo deaktiviert fuer Data Matrix.') {
      this.ui.logoStatus.textContent = 'Kein Logo geladen.'
    }
  }

  #getFilePrefix() {
    return this.state.options.codeType === 'dm' ? 'data-matrix' : 'qr-code'
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
