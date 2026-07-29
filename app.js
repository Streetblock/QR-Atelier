import { formatRegistry } from './formats/index.js'

class QRPlaygroundApp {
  constructor() {
    this.state = {
      data: '',
      options: {
        format: 'qr',
        contentMode: 'text',
        errorCorrectionLevel: 'Q',
        colorStart: '#0f172a',
        colorEnd: '#0ea5e9',
        dotStyle: 'rounded',
        cornerStyle: 'extra-rounded',
        logo: null,
        wifiAuth: 'WPA',
        wifiSsid: '',
        wifiPassword: '',
        wifiHidden: false,
        ...formatRegistry.defaults(),
      },
      currentSvg: '',
    }

    this.isDownloading = false
    this.debounceTimer = null
    this.renderedFormatId = null
    this.ui = {
      container: document.getElementById('qr-preview'),
      placeholder: document.getElementById('qr-placeholder'),
      downloadButtons: document.getElementById('download-buttons'),
      format: document.getElementById('code-format'),
      formatOptions: document.getElementById('format-options'),
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
    this.#populateFormatSelect()
    this.#bindEvents()
    this.#parseUrlParams()
    this.#syncUi()
  }

  #populateFormatSelect() {
    this.ui.format.replaceChildren()
    for (const format of formatRegistry.list()) {
      const option = document.createElement('option')
      option.value = format.id
      option.textContent = format.label
      this.ui.format.appendChild(option)
    }
    this.ui.format.value = this.state.options.format
  }

  #bindEvents() {
    this.ui.primaryInput.addEventListener('input', () => {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = setTimeout(() => {
        if (this.state.options.contentMode === 'wifi') {
          this.update({ wifiSsid: this.ui.primaryInput.value.trim() })
          return
        }
        const format = formatRegistry.get(this.state.options.format)
        const preserveWhitespace = format.preserveWhitespace?.(this.state.options) ?? false
        this.update({ data: preserveWhitespace ? this.ui.primaryInput.value : this.ui.primaryInput.value.trim() })
      }, 180)
    })

    this.ui.format.addEventListener('change', (event) => this.update({ format: event.target.value }))
    this.ui.contentMode.addEventListener('change', (event) => this.update({ contentMode: event.target.value }))
    this.ui.dotShape.addEventListener('change', (event) => this.update({ dotStyle: event.target.value }))
    this.ui.cornerShape.addEventListener('change', (event) => this.update({ cornerStyle: event.target.value }))
    this.ui.wifiAuth.addEventListener('change', (event) => this.update({ wifiAuth: event.target.value }))
    this.ui.wifiPassword.addEventListener('input', (event) => this.update({ wifiPassword: event.target.value }))
    this.ui.wifiHidden.addEventListener('change', (event) => this.update({ wifiHidden: event.target.checked }))

    const onColorChange = () => {
      this.ui.colorStartHex.textContent = this.ui.colorStart.value
      this.ui.colorEndHex.textContent = this.ui.colorEnd.value
      this.update({ colorStart: this.ui.colorStart.value, colorEnd: this.ui.colorEnd.value })
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
    const paramUrl = new URLSearchParams(window.location.search).get('url')
    if (!paramUrl) return
    this.ui.primaryInput.value = paramUrl
    this.ui.primaryInput.dispatchEvent(new Event('input'))
  }

  update(newOptions = {}) {
    this.state.options = { ...this.state.options, ...newOptions }
    if (newOptions.data !== undefined) this.state.data = newOptions.data
    this.#syncUi()

    const payload = this.#buildPayload()
    if (!payload) {
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
    return Boolean(this.state.currentSvg)
  }

  async #downloadSVG() {
    if (this.isDownloading || !this.hasCode()) return

    this.isDownloading = true
    try {
      const size = this.getDownloadSize()
      const svg = this.#createRenderer(size).render()
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
      const svg = this.#createRenderer(size).render()
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
    return formatRegistry.createRenderer(this.state.options.format, {
      payload: this.#buildPayload(),
      size,
      options: this.state.options,
    })
  }

  #syncUi() {
    if (!formatRegistry.has(this.state.options.format)) this.state.options.format = 'qr'
    if (!['text', 'wifi'].includes(this.state.options.contentMode)) this.state.options.contentMode = 'text'

    const format = formatRegistry.get(this.state.options.format)
    const isWifi = this.state.options.contentMode === 'wifi'
    this.ui.format.value = format.id
    this.ui.contentMode.value = this.state.options.contentMode

    this.#syncCapabilityField(this.ui.dotShape, this.ui.dotShapeField, format.capabilities.dotStyle)
    this.#syncCapabilityField(this.ui.cornerShape, this.ui.cornerShapeField, format.capabilities.cornerStyle)
    this.#syncCapabilityField(this.ui.logoUpload, this.ui.logoUploadField, format.capabilities.logo)
    this.ui.clearLogoBtn.disabled = !format.capabilities.logo
    this.ui.wifiPassword.disabled = isWifi && this.state.options.wifiAuth === 'nopass'
    this.#setVisible(this.ui.wifiSection, isWifi)

    if (this.renderedFormatId !== format.id) this.#renderFormatOptions(format)
    this.#syncFormatOptions(format)

    this.ui.primaryInputLabel.textContent = isWifi
      ? 'SSID'
      : resolve(format.inputLabel, this.state.options, 'URL oder Text')
    this.ui.primaryInput.placeholder = isWifi
      ? 'Mein WLAN'
      : resolve(format.inputPlaceholder, this.state.options, 'https://example.com')
    if (document.activeElement !== this.ui.primaryInput) {
      this.ui.primaryInput.value = isWifi ? (this.state.options.wifiSsid || '') : this.state.data
    }
    this.ui.primaryInput.autocomplete = 'off'

    if (!format.capabilities.logo && this.state.options.logo) {
      this.state.options.logo = null
      this.ui.logoUpload.value = ''
      this.ui.logoStatus.textContent = `Logo deaktiviert fuer ${format.label}.`
    } else if (format.capabilities.logo && this.ui.logoStatus.textContent.startsWith('Logo deaktiviert fuer')) {
      this.ui.logoStatus.textContent = 'Kein Logo geladen.'
    }
  }

  #syncCapabilityField(control, wrapper, enabled) {
    control.disabled = !enabled
    this.#setVisible(wrapper, enabled)
  }

  #renderFormatOptions(format) {
    this.ui.formatOptions.replaceChildren()
    for (const field of format.fields) {
      const wrapper = document.createElement('div')
      wrapper.className = `field${field.wide ? ' field-wide' : ''}`
      wrapper.dataset.formatField = field.key

      const label = document.createElement('label')
      const id = `format-option-${format.id}-${field.key}`
      label.className = 'field-label'
      label.htmlFor = id
      wrapper.appendChild(label)

      const control = field.type === 'select' ? document.createElement('select') : document.createElement('input')
      control.id = id
      control.className = field.type === 'select' ? 'select-input' : 'text-input'
      control.dataset.formatOption = field.key
      if (field.type === 'select') {
        for (const [value, optionLabel] of field.options) {
          const option = document.createElement('option')
          option.value = value
          option.textContent = optionLabel
          control.appendChild(option)
        }
      } else {
        control.type = field.type ?? 'text'
        for (const [name, value] of Object.entries(field.attributes ?? {})) control.setAttribute(name, value)
      }
      const eventName = field.event ?? (field.type === 'select' ? 'change' : 'input')
      control.addEventListener(eventName, (event) => {
        const value = field.normalize ? field.normalize(event.target.value) : event.target.value
        const patch = field.update ? field.update(value, this.state.options) : { [field.key]: value }
        this.update(patch)
      })
      wrapper.appendChild(control)

      if (field.hint) {
        const hint = document.createElement('span')
        hint.className = 'field-hint'
        hint.textContent = field.hint
        wrapper.appendChild(hint)
      }
      this.ui.formatOptions.appendChild(wrapper)
    }
    this.renderedFormatId = format.id
  }

  #syncFormatOptions(format) {
    for (const field of format.fields) {
      const wrapper = this.ui.formatOptions.querySelector(`[data-format-field="${field.key}"]`)
      const control = wrapper.querySelector(`[data-format-option="${field.key}"]`)
      const label = wrapper.querySelector('label')
      label.textContent = resolve(field.label, this.state.options, field.key)
      control.placeholder = resolve(field.placeholder, this.state.options, '')
      if (document.activeElement !== control) control.value = this.state.options[field.key] ?? ''
      this.#setVisible(wrapper, field.visible ? field.visible(this.state.options) : true)
    }
  }

  #setVisible(element, visible) {
    element.hidden = !visible
    element.classList.toggle('hidden', !visible)
    element.style.display = visible ? '' : 'none'
  }

  #buildPayload() {
    const rawPayload = this.state.options.contentMode === 'wifi' ? this.#buildWifiPayload() : this.state.data
    return formatRegistry.preparePayload(this.state.options.format, rawPayload, this.state.options)
  }

  #buildDownloadFilename(extension, size) {
    const format = formatRegistry.get(this.state.options.format)
    const prefix = this.state.options.contentMode === 'wifi' ? `wifi-${format.filePrefix}` : format.filePrefix
    return `${prefix}-${this.#dataHint()}-${size}-${this.#timestampForFilename()}.${extension}`
  }

  #dataHint() {
    const source = this.state.options.contentMode === 'wifi' ? this.state.options.wifiSsid : this.state.data
    const ascii = (source || '')
      .trim()
      .replace(/^https?:\/\//i, '')
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
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  }

  #buildWifiPayload() {
    const ssid = (this.state.options.wifiSsid || '').trim()
    if (!ssid) return ''
    const auth = this.state.options.wifiAuth || 'WPA'
    const segments = ['WIFI:', `T:${auth};`, `S:${this.#escapeWifiValue(ssid)};`]
    if (auth !== 'nopass') segments.push(`P:${this.#escapeWifiValue(this.state.options.wifiPassword || '')};`)
    if (this.state.options.wifiHidden) segments.push('H:true;')
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

function resolve(value, options, fallback) {
  if (typeof value === 'function') return value(options)
  return value ?? fallback
}

document.addEventListener('DOMContentLoaded', () => {
  new QRPlaygroundApp()
})
