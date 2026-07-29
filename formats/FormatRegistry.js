export class FormatRegistry {
  constructor(formats) {
    if (!Array.isArray(formats) || formats.length === 0) {
      throw new Error('FormatRegistry requires at least one format adapter.')
    }

    this.formats = new Map()
    for (const format of formats) this.register(format)
  }

  register(format) {
    validateFormat(format)
    if (this.formats.has(format.id)) throw new Error(`Duplicate barcode format: ${format.id}`)
    this.formats.set(format.id, Object.freeze({
      ...format,
      defaults: Object.freeze({ ...(format.defaults ?? {}) }),
      capabilities: Object.freeze({
        dotStyle: false,
        cornerStyle: false,
        logo: false,
        ...(format.capabilities ?? {}),
      }),
      fields: Object.freeze([...(format.fields ?? [])]),
    }))
    return this
  }

  list() {
    return [...this.formats.values()]
  }

  has(id) {
    return this.formats.has(id)
  }

  get(id) {
    const format = this.formats.get(id)
    if (!format) throw new Error(`Unknown barcode format: ${id}`)
    return format
  }

  defaults() {
    return Object.assign({}, ...this.list().map((format) => format.defaults))
  }

  preparePayload(id, payload, options) {
    const format = this.get(id)
    return format.preparePayload ? format.preparePayload(payload, options) : payload
  }

  createRenderer(id, context) {
    return this.get(id).createRenderer(context)
  }
}

function validateFormat(format) {
  if (!format || typeof format !== 'object') throw new Error('Barcode format adapter must be an object.')
  if (typeof format.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(format.id)) {
    throw new Error('Barcode format adapter requires a lowercase id.')
  }
  if (typeof format.label !== 'string' || format.label.length === 0) {
    throw new Error(`Barcode format ${format.id} requires a label.`)
  }
  if (typeof format.filePrefix !== 'string' || format.filePrefix.length === 0) {
    throw new Error(`Barcode format ${format.id} requires a filePrefix.`)
  }
  if (typeof format.createRenderer !== 'function') {
    throw new Error(`Barcode format ${format.id} requires createRenderer().`)
  }
}
