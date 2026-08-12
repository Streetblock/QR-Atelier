import { MAXICODE_HEIGHT, MAXICODE_WIDTH, MAXICODE_BITNR, MAXICODE_FIXED_TEMPLATE, MAXICODE_GO_GRID, buildMaxiCodeLayout } from '../libs/MaxiCodeCore.js'

const canvas = document.getElementById('canvas')
const exportBox = document.getElementById('export')
const modeToolbar = document.getElementById('mode-toolbar')
const resetButton = document.getElementById('btn-reset')
const copyButton = document.getElementById('btn-copy')

const state = {
  mode: 'black',
  cells: createCellsFromTemplate(MAXICODE_FIXED_TEMPLATE),
}

const SIZE = 920
const MARGIN = 18
const LAYOUT = buildMaxiCodeLayout(SIZE, MARGIN, MAXICODE_WIDTH, MAXICODE_HEIGHT)
const {
  hexRadius: HEX_RADIUS,
  pitchX: PITCH_X,
  pitchY: PITCH_Y,
  hexWidth: HEX_WIDTH,
  hexHeight: HEX_HEIGHT,
  offsetX: OFFSET_X,
  offsetY: OFFSET_Y,
  bullseyeCenterX: BULLSEYE_CENTER_X,
  bullseyeCenterY: BULLSEYE_CENTER_Y,
  bullseyeOuterRadius: BULLSEYE_OUTER_RADIUS,
} = LAYOUT
init()

function init() {
  bindEvents()
  render()
}

function bindEvents() {
  modeToolbar.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-mode]')
    if (!button) return
    setMode(button.dataset.mode)
  })

  resetButton.addEventListener('click', () => {
    state.cells = createCellsFromTemplate(MAXICODE_FIXED_TEMPLATE)
    render()
  })

  copyButton.addEventListener('click', async () => {
    await navigator.clipboard.writeText(exportBox.value)
    copyButton.textContent = 'Copied'
    window.setTimeout(() => {
      copyButton.textContent = 'Copy'
    }, 900)
  })

  canvas.addEventListener('click', (event) => {
    const target = event.target.closest('[data-cell]')
    if (!target) return
    const key = target.dataset.cell
    state.cells.set(key, state.mode)
    render()
  })
}

function setMode(mode) {
  state.mode = mode
  for (const button of modeToolbar.querySelectorAll('button[data-mode]')) {
    button.classList.toggle('active', button.dataset.mode === mode)
  }
}

function render() {
  const cells = []

  for (let y = 0; y < MAXICODE_HEIGHT; y += 1) {
    const rowShift = (y & 1) ? PITCH_X / 2 : 0
    for (let x = 0; x < MAXICODE_WIDTH; x += 1) {
      const bit = MAXICODE_BITNR[y][x]
      const goBit = MAXICODE_GO_GRID[y][x]
      const cx = OFFSET_X + HEX_WIDTH / 2 + x * PITCH_X + rowShift
      const cy = OFFSET_Y + HEX_HEIGHT / 2 + y * PITCH_Y
      const key = `${y}:${x}`
      const cellState = state.cells.get(key) || 'clear'
      cells.push(renderCell(cx, cy, HEX_RADIUS, key, cellState, y, x, bit, goBit))
    }
  }

  canvas.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`)
  canvas.setAttribute('width', `${SIZE}`)
  canvas.setAttribute('height', `${SIZE}`)
  canvas.innerHTML = [
    `<rect width="100%" height="100%" fill="#ffffff"/>`,
    renderBullseye(BULLSEYE_CENTER_X, BULLSEYE_CENTER_Y, BULLSEYE_OUTER_RADIUS),
    `<g>${cells.join('')}</g>`,
  ].join('')

  exportBox.value = buildExportSnippet()
}

function renderCell(cx, cy, size, key, cellState, y, x, bit, goBit) {
  const fillClass = cellState === 'black' ? 'black' : cellState === 'white' ? 'white' : cellState === 'illegal' ? 'illegal' : 'clear'
  const title = `y=${y}, x=${x}, goBit=${goBit}, bit=${bit}, state=${cellState}`
  return `
    <path
      class="cell ${fillClass}"
      data-cell="${key}"
      d="${hexPath(cx, cy, size)}"
    >
      <title>${escapeHtml(title)}</title>
    </path>
  `
}

function renderBullseye(cx, cy, outerRadius) {
  const rings = [
    { r: outerRadius, fill: '#111827' },
    { r: outerRadius * 0.82, fill: '#ffffff' },
    { r: outerRadius * 0.64, fill: '#111827' },
    { r: outerRadius * 0.46, fill: '#ffffff' },
    { r: outerRadius * 0.28, fill: '#111827' },
    { r: outerRadius * 0.10, fill: '#ffffff' },
  ]

  return `<g>${rings
    .map((ring, index) => `<circle class="${index % 2 === 0 ? 'bullseye-ring' : 'bullseye-hole'}" cx="${cx}" cy="${cy}" r="${ring.r}" fill="${ring.fill}"/>`)
    .join('')}</g>`
}

function hexPath(cx, cy, size) {
  const w = size * 0.8660254037844386
  return `M ${cx} ${cy - size} L ${cx + w} ${cy - size * 0.5} L ${cx + w} ${cy + size * 0.5} L ${cx} ${cy + size} L ${cx - w} ${cy + size * 0.5} L ${cx - w} ${cy - size * 0.5} Z`
}

function buildExportSnippet() {
  const black = []
  const white = []
  const illegal = []

  for (const [key, value] of state.cells.entries()) {
    const [y, x] = key.split(':').map(Number)
    if (value === 'black') black.push([y, x])
    if (value === 'white') white.push([y, x])
    if (value === 'illegal') illegal.push([y, x])
  }

  return [
    'export const MAXICODE_FIXED_TEMPLATE = {',
    `  black: ${JSON.stringify(black)},`,
    `  white: ${JSON.stringify(white)},`,
    `  illegal: ${JSON.stringify(illegal)},`,
    '};',
  ].join('\n')
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function createCellsFromTemplate(template) {
  const cells = new Map()

  for (const [stateName, positions] of Object.entries(template)) {
    for (const [y, x] of positions) {
      cells.set(`${y}:${x}`, stateName)
    }
  }

  return cells
}
