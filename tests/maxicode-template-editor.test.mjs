import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import {
  MAXICODE_BITNR,
  MAXICODE_FIXED_TEMPLATE,
  MAXICODE_GO_GRID,
  MAXICODE_HEIGHT,
  MAXICODE_WIDTH,
  buildMaxiCodeLayout,
} from '../libs/MaxiCodeCore.js'

const htmlUrl = new URL('../dev/maxicode-template-editor.html', import.meta.url)
const scriptUrl = new URL('../dev/maxicode-template-editor.js', import.meta.url)

test('keeps the MaxiCode template editor connected to the current core layout', () => {
  assert.equal(MAXICODE_WIDTH, 30)
  assert.equal(MAXICODE_HEIGHT, 33)
  assert.equal(MAXICODE_BITNR.length, MAXICODE_HEIGHT)
  assert.equal(MAXICODE_GO_GRID.length, MAXICODE_HEIGHT)
  assert.deepEqual(Object.keys(MAXICODE_FIXED_TEMPLATE).sort(), ['black', 'illegal', 'white'])
  assert.equal(typeof buildMaxiCodeLayout, 'function')

  const html = readFileSync(htmlUrl, 'utf8')
  for (const id of ['canvas', 'mode-toolbar', 'btn-reset', 'btn-copy', 'export']) {
    assert.match(html, new RegExp(`id=["']${id}["']`))
  }
  assert.match(html, /<script type="module" src="\.\/maxicode-template-editor\.js"><\/script>/)

  const syntax = spawnSync(process.execPath, ['--check', fileURLToPath(scriptUrl)], { encoding: 'utf8' })
  assert.equal(syntax.status, 0, syntax.stderr)
})
