// Native DotCode encoder (AIM ISS DotCode 4.0): high-level encodation,
// GF(113) error correction, masking and dot placement.
// Algorithm and conformance work adapted from libzint backend/dotcode.c.
// Copyright (C) 2017-2026 Robin Stuart <rstuart114@gmail.com>
// SPDX-License-Identifier: BSD-3-Clause

const GF = 113
const DOT_PATTERNS = [
  0x155,0x0ab,0x0ad,0x0b5,0x0d5,0x156,0x15a,0x16a,0x1aa,0x0ae,0x0b6,0x0ba,0x0d6,0x0da,0x0ea,
  0x12b,0x12d,0x135,0x14b,0x14d,0x153,0x159,0x165,0x169,0x195,0x1a5,0x1a9,0x057,0x05b,0x05d,
  0x06b,0x06d,0x075,0x097,0x09b,0x09d,0x0a7,0x0b3,0x0b9,0x0cb,0x0cd,0x0d3,0x0d9,0x0e5,0x0e9,
  0x12e,0x136,0x13a,0x14e,0x15c,0x166,0x16c,0x172,0x174,0x196,0x19a,0x1a6,0x1ac,0x1b2,0x1b4,
  0x1ca,0x1d2,0x1d4,0x05e,0x06e,0x076,0x07a,0x09e,0x0bc,0x0ce,0x0dc,0x0e6,0x0ec,0x0f2,0x0f4,
  0x117,0x11b,0x11d,0x127,0x133,0x139,0x147,0x163,0x171,0x18b,0x18d,0x193,0x199,0x1a3,0x1b1,
  0x1c5,0x1c9,0x1d1,0x02f,0x037,0x03b,0x03d,0x04f,0x067,0x073,0x079,0x08f,0x0c7,0x0e3,0x0f1,
  0x11e,0x13c,0x178,0x18e,0x19c,0x1b8,0x1c6,0x1cc,
]

function toBytes(value) {
  if (value instanceof Uint8Array) return { bytes: value, utf8: false }
  if (typeof value !== 'string') throw new TypeError('DotCode data must be a string or Uint8Array.')
  return { bytes: new TextEncoder().encode(value), utf8: /[^\x00-\x7f]/u.test(value) }
}

const isDigit = b => b >= 48 && b <= 57
const twoDigits = (s, p) => p + 1 < s.length && isDigit(s[p]) && isDigit(s[p + 1])
const pair = (s, p) => (s[p] - 48) * 10 + s[p + 1] - 48
const datumA = (s, p) => p < s.length && s[p] <= 95
function datumB(s, p) {
  if (p >= s.length) return 0
  if (s[p] >= 32 && s[p] <= 127) return 1
  if ([9, 28, 29, 30].includes(s[p])) return 1
  return p + 1 < s.length && s[p] === 13 && s[p + 1] === 10 ? 2 : 0
}
function aheadC(s, p) { let n = 0; while (twoDigits(s, p + n * 2)) n++; return n }
function tryC(s, p) { return p < s.length && isDigit(s[p]) && aheadC(s, p) > aheadC(s, p + 1) ? aheadC(s, p) : 0 }
function aheadA(s, p) { let n = 0; while (datumA(s, p + n) && tryC(s, p + n) < 2) n++; return n }
function aheadB(s, p) {
  let chars = 0, used = 0, inc
  while ((inc = datumB(s, p + used)) && tryC(s, p + used) < 2) { chars++; used += inc }
  return { chars, used }
}
function seventeenTen(s,p){return p+9<s.length&&s[p]===49&&s[p+1]===55&&s[p+8]===49&&s[p+9]===48&&[2,3,4,5,6,7].every(i=>isDigit(s[p+i]))}
function pushB(out, s, state) {
  const b = s[state.p]
  if (b >= 32) out.push(b - 32)
  else if (b === 13) { out.push(96); state.p++ }
  else out.push({ 9: 97, 28: 98, 29: 99, 30: 100 }[b])
  state.p++
}
function emptyBinary(out, bin) {
  if (!bin.values.length) return
  let value = 0n
  for (const item of bin.values) value = value * 259n + BigInt(item)
  const words = Array(bin.values.length + 1)
  for (let i = words.length - 1; i >= 0; i--) { words[i] = Number(value % 103n); value /= 103n }
  out.push(...words); bin.values.length = 0
}
function appendBinary(out, bin, value) { bin.values.push(value); if (bin.values.length === 5) emptyBinary(out, bin) }

export function encodeDotCodeData(data, options = {}) {
  const converted = toBytes(data)
  const s = converted.bytes
  if (!s.length) throw new RangeError('DotCode data must not be empty.')
  const gs1 = Boolean(options.gs1)
  const eci = options.eci ?? (converted.utf8 ? 26 : 0)
  if (!Number.isInteger(eci) || eci < 0 || eci > 811799) throw new RangeError('ECI must be an integer from 0 to 811799.')
  const out = [], st = { p: 0 }, bin = { values: [] }
  let mode = 'C'
  if (options.readerProgramming) out.push(109)
  else if (!gs1 && eci === 0 && twoDigits(s, 0)) out.push(107)
  else if ([9, 28, 29, 30].includes(s[0])) { out.push(101, s[0] + 64); mode = 'A'; st.p++ }

  if (eci) {
    out.push(108)
    if (eci <= 39) out.push(eci)
    else { const v = eci - 40, a = Math.floor(v / 12769), b = Math.floor((v - a * 12769) / 113); out.push(a + 40, b, v - a * 12769 - b * 113) }
  }

  while (st.p < s.length) {
    if (mode === 'C') {
      if(seventeenTen(s,st.p)){out.push(100,pair(s,st.p+2),pair(s,st.p+4),pair(s,st.p+6));st.p+=10;continue}
      if (twoDigits(s, st.p) || (gs1 && s[st.p] === 29)) {
        if (s[st.p] === 29) { out.push(107); st.p++ } else { out.push(pair(s, st.p)); st.p += 2 }
      } else if (s[st.p] >= 128) {
        if (st.p + 1 < s.length && isDigit(s[st.p + 1])) {
          const b = s[st.p++] - 128; out.push(b < 32 ? 110 : 111, b < 32 ? b + 64 : b - 32)
        } else { out.push(112); mode = 'X' }
      } else {
        const a = aheadA(s, st.p), b = aheadB(s, st.p)
        if (a > b.chars) { out.push(101); mode = 'A' }
        else if (b.chars >= 1 && b.chars <= 4) { out.push(101 + b.chars); for (let i = 0; i < b.chars; i++) pushB(out, s, st) }
        else { out.push(106); mode = 'B' }
      }
      continue
    }
    if (mode === 'B') {
      const n = tryC(s, st.p)
      if (n >= 2) {
        if (n <= 4) { out.push(103 + n - 2); for (let i = 0; i < n; i++) { out.push(pair(s, st.p)); st.p += 2 } }
        else { out.push(106); mode = 'C' }
      } else if (gs1 && s[st.p] === 29) { out.push(107); st.p++ }
      else if (datumB(s, st.p)) { pushB(out, s, st) }
      else if (s[st.p] >= 128) {
        if (datumB(s, st.p + 1)) { const b = s[st.p++] - 128; out.push(b < 32 ? 110 : 111, b < 32 ? b + 64 : b - 32) }
        else { out.push(112); mode = 'X' }
      } else if (aheadA(s, st.p) === 1) { const b = s[st.p++]; out.push(101, b < 32 ? b + 64 : b - 32) }
      else { out.push(102); mode = 'A' }
      continue
    }
    if (mode === 'A') {
      const n = tryC(s, st.p)
      if (n >= 2) {
        if (n <= 4) { out.push(103 + n - 2); for (let i = 0; i < n; i++) { out.push(pair(s, st.p)); st.p += 2 } }
        else { out.push(106); mode = 'C' }
      } else if (gs1 && s[st.p] === 29) { out.push(107); st.p++ }
      else if (datumA(s, st.p)) { const b = s[st.p++]; out.push(b < 32 ? b + 64 : b - 32) }
      else if (s[st.p] >= 128) {
        if (datumA(s, st.p + 1)) { const b = s[st.p++] - 128; out.push(b < 32 ? 110 : 111, b < 32 ? b + 64 : b - 32) }
        else { out.push(112); mode = 'X' }
      } else {
        const nB = aheadB(s, st.p).chars
        if (nB >= 1 && nB <= 6) { out.push(95 + nB); for (let i = 0; i < nB; i++) pushB(out, s, st) }
        else { out.push(102); mode = 'B' }
      }
      continue
    }
    const n = tryC(s, st.p)
    if (n >= 2) {
      emptyBinary(out, bin)
      if (n <= 7) { out.push(101 + n); for (let i = 0; i < n; i++) { out.push(pair(s, st.p)); st.p += 2 } }
      else { out.push(111); mode = 'C' }
    } else if ([0, 1, 2, 3].some(i => st.p + i < s.length && s[st.p + i] >= 128)) appendBinary(out, bin, s[st.p++])
    else {
      emptyBinary(out, bin)
      if (aheadA(s, st.p) > aheadB(s, st.p).chars) { out.push(109); mode = 'A' } else { out.push(110); mode = 'B' }
    }
  }
  if (mode === 'X') emptyBinary(out, bin)
  return { codewords: out, binaryFinish: mode === 'X', finalMode:mode, eci, bytes: s }
}

function generator(degree) {
  let poly = [1], root = 3
  for (let i = 0; i < degree; i++) {
    const next = Array(poly.length + 1).fill(0)
    for (let j = 0; j < poly.length; j++) { next[j] = (next[j] + poly[j]) % GF; next[j + 1] = (next[j + 1] + poly[j] * (GF - root)) % GF }
    poly = next; root = root * 3 % GF
  }
  return poly
}
function addErrorCorrection(words, dataLength, eccLength) {
  const total = dataLength + eccLength, step = Math.ceil(total / (GF - 1))
  for (let start = 0; start < step; start++) {
    const nd = Math.ceil((dataLength - start) / step), nw = Math.ceil((total - start) / step), nc = nw - nd, c = generator(nc)
    const ecc = Array(nc).fill(0)
    for (let i = 0; i < nd; i++) {
      const k = (words[start + i * step] + ecc[0]) % GF
      for (let j = 0; j < nc - 1; j++) ecc[j] = (GF - c[j + 1] * k % GF + ecc[j + 1]) % GF
      ecc[nc - 1] = (GF - c[nc] * k % GF) % GF
    }
    for (let i = 0; i < nc; i++) words[start + (nd + i) * step] = ecc[i] ? GF - ecc[i] : 0
  }
}
function applyMask(mask, data) {
  const increments = [0, 3, 7, 17], words = [mask]
  for (let i = 0, weight = 0; i < data.length; i++, weight += increments[mask]) words.push((data[i] + weight) % GF)
  addErrorCorrection(words, data.length + 1, 3 + Math.floor(data.length / 2))
  return words
}
function dotStream(words) {
  const bits = [(words[0] >> 1) & 1, words[0] & 1]
  for (let i = 1; i < words.length; i++) for (let b = 8; b >= 0; b--) bits.push((DOT_PATTERNS[words[i]] >> b) & 1)
  return bits
}
function isCorner(x, y, w, h) {
  if (x === 0 && y === 0) return true
  if (h & 1 ? (x === w - 2 && y === 0) || (x === w - 1 && y === 1) : x === w - 1 && y === 0) return true
  if (h & 1 ? x === 0 && y === h - 1 : (x === 0 && y === h - 2) || (x === 1 && y === h - 1)) return true
  return (x === w - 2 && y === h - 1) || (x === w - 1 && y === h - 2)
}
function fold(bits, w, h) {
  const a = Array(w * h).fill(false); let p = 0
  if (h & 1) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!((x + y) & 1) && !isCorner(x, y, w, h)) a[(h - y - 1) * w + x] = Boolean(bits[p++])
    for (const i of [w-2,h*w-2,2*w-1,(h-1)*w-1,0,(h-1)*w]) a[i] = Boolean(bits[p++])
  } else {
    for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) if (!((x + y) & 1) && !isCorner(x, y, w, h)) a[y*w+x] = Boolean(bits[p++])
    for (const i of [(h-1)*w-1,(h-2)*w,h*w-2,(h-1)*w+1,w-1,0]) a[i] = Boolean(bits[p++])
  }
  return a
}
function forceCorners(a, w, h) {
  const indexes = w & 1 ? [0,w-1,(h-2)*w,(h-1)*w-1,(h-1)*w+1,h*w-2] : [0,w-2,2*w-1,(h-1)*w-1,(h-1)*w,h*w-2]
  for (const i of indexes) a[i] = true
}
const getDot = (a,w,h,x,y) => x >= 0 && x < w && y >= 0 && y < h && a[y*w+x]
function score(a,w,h) {
  const clearRow = y => { for (let x=y&1;x<w;x+=2) if (getDot(a,w,h,x,y)) return false; return true }
  const clearCol = x => { for (let y=x&1;y<h;y+=2) if (getDot(a,w,h,x,y)) return false; return true }
  const penaltyFor = (n, limit, clear) => { let total=0, run=0; for(let i=1;i<limit-1;i++) if(clear(i)) run=run?run*n:n; else {total+=run;run=0} return total+run }
  const penalty = penaltyFor(w,h,clearRow) + penaltyFor(h,w,clearCol)
  let worst = Infinity
  const edge = (limit, at, scale) => { let count=0, first=-1,last=-1; for(let i=0;i<limit;i+=2) if(at(i)){if(first<0)first=i;last=i;count++} return count ? (count+last-first)*scale : -1000000000 }
  worst=Math.min(worst,edge(w,x=>getDot(a,w,h,x,0),h))
  worst=Math.min(worst,edge(w-(w&1),x=>getDot(a,w,h,x+(w&1),h-1),h))
  worst=Math.min(worst,edge(h,y=>getDot(a,w,h,0,y),w))
  worst=Math.min(worst,edge(h-(h&1),y=>getDot(a,w,h,w-1,y+(h&1)),w))
  let gaps=0
  for(let y=0;y<h;y++) for(let x=y&1;x<w;x+=2) if(!getDot(a,w,h,x-1,y-1)&&!getDot(a,w,h,x+1,y-1)&&!getDot(a,w,h,x-1,y+1)&&!getDot(a,w,h,x+1,y+1)&&(!getDot(a,w,h,x,y)||(!getDot(a,w,h,x-2,y)&&!getDot(a,w,h,x,y-2)&&!getDot(a,w,h,x+2,y)&&!getDot(a,w,h,x,y+2)))) gaps++
  return worst-gaps*gaps-penalty
}
function dimensions(dataLength, columns) {
  const minArea = (9 * (dataLength + 3 + Math.floor(dataLength / 2)) + 2) * 2
  let w, h
  if (columns != null) {
    if (!Number.isInteger(columns) || columns < 5 || columns > 200) throw new RangeError('DotCode columns must be an integer from 5 to 200.')
    w=columns; h=Math.max(5,Math.ceil(minArea/w)); if(!((w+h)&1))h++
  } else {
    const hf=Math.sqrt(minArea*.666), wf=Math.sqrt(minArea*1.5); h=Math.floor(hf);w=Math.floor(wf)
    if((w+h)&1){if(w*h<minArea){w++;h++}} else if(hf*w<wf*h){w++;if(w*h<minArea){w--;h++;if(w*h<minArea)w+=2}} else {h++;if(w*h<minArea){w++;h--;if(w*h<minArea)h+=2}}
  }
  if(w>200||h>200)throw new RangeError(`DotCode dimensions ${w}x${h} exceed the 200-module limit.`)
  return { width:w,height:h,minArea }
}

export class DotCodeCore {
  constructor(data, options = {}) { this.data=data;this.options={...options} }
  generate() {
    const encoded=encodeDotCodeData(this.data,this.options), data=[...encoded.codewords]
    let ecc=3+Math.floor(data.length/2), dims=dimensions(data.length,this.options.columns), free=Math.floor(dims.width*dims.height/2)-(9*(data.length+ecc)+2)
    let first=true
    while(free>=9){if(free<18&&data.length%2===0)free-=9;else if(free>=18){free-=data.length%2===0?9:18}else break;data.push(first&&encoded.binaryFinish?109:106);first=false}
    ecc=3+Math.floor(data.length/2)
    const dotCount=Math.floor(dims.width*dims.height/2), candidates=[]
    for(let m=0;m<4;m++){const bits=dotStream(applyMask(m,data));while(bits.length<dotCount)bits.push(1);const a=fold(bits,dims.width,dims.height);candidates.push({mask:m,array:a,score:score(a,dims.width,dims.height)})}
    let best
    if(this.options.mask!=null){if(!Number.isInteger(this.options.mask)||this.options.mask<0||this.options.mask>7)throw new RangeError('DotCode mask must be an integer from 0 to 7.');best={...candidates[this.options.mask%4]};if(this.options.mask>=4)forceCorners(best.array,dims.width,dims.height);best.mask=this.options.mask}
    else {best=candidates.reduce((a,b)=>b.score>=a.score?b:a);if(best.score<=dims.width*dims.height/2){for(const c of candidates){const forced={mask:c.mask+4,array:[...c.array]};forceCorners(forced.array,dims.width,dims.height);forced.score=score(forced.array,dims.width,dims.height);if(forced.score>=best.score)best=forced}}}
    const modules=Array.from({length:dims.height},(_,y)=>Array.from({length:dims.width},(_,x)=>best.array[y*dims.width+x]))
    return {format:'DotCode',modules,width:dims.width,height:dims.height,mask:best.mask,codewords:data,eccCodewords:ecc,eci:encoded.eci,gs1:Boolean(this.options.gs1)}
  }
}
