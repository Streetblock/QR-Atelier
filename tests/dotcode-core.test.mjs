import test from 'node:test'
import assert from 'node:assert/strict'
import { DotCodeCore, encodeDotCodeData } from '../libs/DotCodeCore.js'
import { DotCodeSvgRenderer } from '../libs/DotCodeSvg.js'

test('Annex F high-level encodation covers text, numeric, ECI and binary modes',()=>{
  assert.deepEqual(encodeDotCodeData('A').codewords,[102,33])
  assert.deepEqual(encodeDotCodeData('00').codewords,[107,0])
  assert.deepEqual(encodeDotCodeData('A',{eci:40}).codewords,[108,40,0,0,102,33])
  assert.deepEqual(encodeDotCodeData(new Uint8Array([128,49,50,160,51,52,129,130,53,54])).codewords,[110,64,12,111,0,34,112,3,16,66,110,21,22])
  assert.deepEqual(encodeDotCodeData('1712345610').codewords,[107,100,12,34,56])
})

test('matches AIM DotCode Figure 7A top-left matrix',()=>{
  const symbol=new DotCodeCore('2741',{columns:13,mask:0}).generate()
  assert.equal(symbol.width,13);assert.equal(symbol.height,10)
  assert.equal(symbol.modules.map(row=>row.map(Number).join('')).join(''),[
    '1010101010100','0000010001010','0000101000101','0101000000000','0000101010100',
    '0100010101000','1000001000001','0101000101010','1000100010001','0000000000000',
  ].join(''))
})

test('matches all AIM Figure 7 mask variants and automatic mask selection',()=>{
  const expected=[
    '1010101010100|0000010001010|0000101000101|0101000000000|0000101010100|0100010101000|1000001000001|0101000101010|1000100010001|0000000000000',
    '1010001000101|0000000100010|0000100000001|0101010001000|1000101000000|0101010101010|1000101000101|0100010101010|0000000010001|0001000001000',
    '1010001010100|0001000000000|1000100010101|0100000101000|0000101000100|0100010000010|1000101010001|0101010001000|1000100010101|0001000100000',
    '1010001000100|0001000001010|1000001000000|0101000100010|1000101010100|0101010000010|1000100000000|0100000101000|1000001010001|0101010101010',
  ]
  for(let mask=0;mask<4;mask++)assert.equal(new DotCodeCore('2741',{columns:13,mask}).generate().modules.map(r=>r.map(Number).join('')).join('|'),expected[mask])
  assert.equal(new DotCodeCore('2741',{columns:13}).generate().mask,6)
})

test('GS1 separators use FNC1 and automatic sizing keeps alternating parity',()=>{
  const encoded=encodeDotCodeData(new Uint8Array([57,48,29,49,50,51]),{gs1:true})
  assert.ok(encoded.codewords.includes(107))
  const symbol=new DotCodeCore(new Uint8Array([57,48,29,49,50,51]),{gs1:true}).generate()
  assert.equal((symbol.width+symbol.height)%2,1)
})

test('SVG renderer emits one circle for every printed dot',()=>{
  const symbol=new DotCodeCore('ABC').generate(),svg=new DotCodeSvgRenderer(symbol).render()
  assert.equal((svg.match(/<circle /g)||[]).length,symbol.modules.flat().filter(Boolean).length)
  assert.match(svg,/aria-label="DotCode"/)
})

test('rejects invalid input and dimensions',()=>{
  assert.throws(()=>new DotCodeCore('').generate(),/must not be empty/)
  assert.throws(()=>new DotCodeCore('A',{columns:4}).generate(),/5 to 200/)
  assert.throws(()=>new DotCodeCore('A',{mask:8}).generate(),/0 to 7/)
})
