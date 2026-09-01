import test from 'node:test'
import assert from 'node:assert/strict'

import * as atelier from '../libs/index.js'
import * as packageRoot from 'qr-atelier'
import { QrCore } from '../libs/QRcore.js'
import { DmCore } from '../libs/DMcore.js'
import { AztecCore } from '../libs/AztecCore.js'
import { MaxiCodeCore } from '../libs/MaxiCodeCore.js'
import { MicroQrCore } from '../libs/MicroQRcore.js'
import { RMqrCore } from '../libs/RMQRcore.js'
import { Pdf417Core, MicroPdf417Core } from '../libs/PDF417core.js'

test('exports every independent encoder core through one stable surface', () => {
  assert.equal(atelier.QrCore, QrCore)
  assert.equal(atelier.DmCore, DmCore)
  assert.equal(atelier.AztecCore, AztecCore)
  assert.equal(atelier.MaxiCodeCore, MaxiCodeCore)
  assert.equal(atelier.MicroQrCore, MicroQrCore)
  assert.equal(atelier.RMqrCore, RMqrCore)
  assert.equal(atelier.Pdf417Core, Pdf417Core)
  assert.equal(atelier.MicroPdf417Core, MicroPdf417Core)
  assert.equal(typeof atelier.generateLegacyDataMatrix, 'function')
  assert.equal(packageRoot.QrCore, QrCore)
})

test('keeps individual core modules independently usable', () => {
  assert.ok(new QrCore('QR').generate().modules.length > 0)
  assert.ok(new DmCore('DM').generate().modules.length > 0)
  assert.ok(new MicroQrCore('12345').generate().modules.length > 0)
  assert.ok(new RMqrCore('RMQR').generate().modules.length > 0)
})
