/**
 * Seamless looping splash GIF for EDA Cleaner.
 * Exact logo from App Icon1.svg; stroke-draw via geodesic reveal inside logo pixels.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import gifenc from 'gifenc'

const { GIFEncoder, quantize, applyPalette } = gifenc

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUT_DIR = join(ROOT, 'renderer', 'assets', 'app logo')
const OUT_GIF = join(OUT_DIR, 'splash-logo-loop.gif')
const OUT_GIF_RESOURCES = join(ROOT, 'resources', 'splash', 'splash-logo-loop.gif')

const BLUE = '#2563EB'
const BLUE_RGB = [37, 99, 235]
const SIZE = 512
const VB = 1024
const S = SIZE / VB
const FPS = 30
const DURATION_MS = 2600
const FRAME_COUNT = Math.round((DURATION_MS / 1000) * FPS)
const FRAME_DELAY = Math.round(1000 / FPS)

const PATH_LEFT = `M522.535 517.626V325.157C522.535 305.188 538.723 289 558.691 289C578.66 289 594.848 305.188 594.848 325.157V440.148V464.078V478.887V545.744C594.848 560.813 588.862 575.265 578.206 585.92L541.97 622.157L532.349 631.778L517.37 646.757L456.56 704.186C435.946 723.654 408.665 734.5 380.311 734.5H350.791C350.384 734.5 349.977 734.498 349.57 734.495C337.702 734.4 326.162 732.925 315.104 730.223C313.648 729.867 312.2 729.49 310.761 729.091C257.656 714.4 216.394 676.361 204.488 622.157C202.204 611.759 201 600.957 201 589.874C201 576.943 202.639 564.395 205.719 552.426C219.045 500.653 259.354 459.713 310.761 445.491C323.503 441.966 336.927 440.083 350.791 440.083C415.641 440.083 479.399 476.834 501.448 533.864C504.612 542.047 502.15 551.154 496.195 557.597L468.403 587.67C455.692 601.423 437.816 609.243 419.089 609.243H337.878C322.902 609.243 310.761 597.103 310.761 582.126C310.761 567.15 322.902 555.009 337.878 555.009H442.932C443.061 555.009 443.185 554.999 443.305 554.981C445.106 554.706 445.916 552.466 444.512 551.146C418.679 526.858 379.168 507.23 350.791 507.23C336.268 507.23 322.62 510.977 310.761 517.555C296.356 525.546 284.59 537.715 277.099 552.426C271.375 563.668 268.148 576.394 268.148 589.874C268.148 601.176 270.416 612.107 274.523 622.157C281.724 639.779 294.578 654.694 310.761 664.157C322.62 671.092 336.268 675.1 350.791 675.1C358.22 676.411 366.572 676.367 375.324 675.168C390.428 673.098 408.293 667.588 417.939 659.665L503.338 575.324C515.621 563.193 522.535 546.649 522.535 529.386V517.626Z`

const PATH_RIGHT = `M672.327 659.604C706.515 659.604 739.302 638.943 748.427 609.243C757.553 579.543 757.553 566.63 746.019 539.513C734.485 512.396 708.094 496.77 678.613 494.553C676.538 494.397 674.442 494.317 672.327 494.317C664.576 494.317 657.074 495.384 649.961 497.38C639.265 500.379 629.446 505.478 620.977 512.203C614.998 516.949 603.888 513.033 603.888 505.4V461.962C603.888 450.738 610.079 440.212 620.612 436.337C636.731 430.407 654.151 427.17 672.327 427.17C686.872 427.17 700.933 429.243 714.231 433.11C720.726 434.999 727.04 437.316 733.138 440.028C742.219 444.067 750.823 448.982 758.844 454.667C787.326 474.853 808.449 504.74 817.399 539.513C820.48 551.482 822.118 564.03 822.118 576.961V609.243V702.863C822.118 720.336 807.954 734.5 790.481 734.5C773.009 734.5 758.844 720.336 758.844 702.863V699.255C734.409 716.573 704.557 726.752 672.327 726.752C647.669 726.752 624.402 720.794 603.888 710.239C599.45 707.955 595.141 705.457 590.975 702.757C573.413 691.376 560.312 682.664 545.121 668.451C534.134 658.171 534.649 640.895 545.198 630.167L581.243 593.511C589.237 585.381 603.074 590.843 603.36 602.241L603.793 619.511C603.855 621.985 604.605 624.406 606.087 626.388C621.157 646.552 645.218 659.604 672.327 659.604Z`

const W_STEM = 1.0
const W_LEFT = 2.15
const W_RIGHT = 2.0
const W_TOTAL = W_STEM + W_LEFT + W_RIGHT

function clamp01(t) {
  return Math.max(0, Math.min(1, t))
}
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}
function easeInCubic(t) {
  return t * t * t
}

function sampleTimeline(t) {
  const emptyEnd = 0.05
  const stemEnd = 0.2
  const leftEnd = 0.46
  const drawEnd = 0.7
  const holdEnd = 0.86

  if (t <= emptyEnd) return { draw: 0, opacity: 1, scale: 1 }

  if (t < drawEnd) {
    let draw
    if (t < stemEnd) {
      draw = easeInOutCubic((t - emptyEnd) / (stemEnd - emptyEnd)) * (W_STEM / W_TOTAL)
    } else if (t < leftEnd) {
      draw =
        (W_STEM +
          easeInOutCubic((t - stemEnd) / (leftEnd - stemEnd)) * W_LEFT) /
        W_TOTAL
    } else {
      draw =
        (W_STEM +
          W_LEFT +
          easeInOutCubic((t - leftEnd) / (drawEnd - leftEnd)) * W_RIGHT) /
        W_TOTAL
    }
    return { draw: clamp01(draw), opacity: 1, scale: 1 }
  }

  if (t < holdEnd) {
    // ~200ms overshoot at start of hold, then settle + tiny breathe
    const u = (t - drawEnd) / (holdEnd - drawEnd)
    let scale = 1
    if (u < 0.32) scale = 1 + 0.02 * easeOutCubic(u / 0.32)
    else if (u < 0.6) scale = 1.02 - 0.02 * easeInOutCubic((u - 0.32) / 0.28)
    else scale = 1 + 0.012 * Math.sin(((u - 0.6) / 0.4) * Math.PI)
    return { draw: 1, opacity: 1, scale }
  }

  const u = easeInCubic((t - holdEnd) / (1 - holdEnd))
  return { draw: 1, opacity: 1 - u, scale: 1 - 0.008 * u }
}

function renderPathMask(pathD) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="#000000"/>
  <path d="${pathD}" fill="#FFFFFF"/>
</svg>`
  const rgba = new Resvg(svg, {
    fitTo: { mode: 'width', value: SIZE },
    background: '#000000'
  })
    .render().pixels
  const mask = new Uint8Array(SIZE * SIZE)
  for (let i = 0, p = 0; i < mask.length; i++, p += 4) {
    mask[i] = rgba[p] > 200 ? 1 : 0
  }
  return mask
}

function renderFullLogo() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="${BLUE}"/>
  <path d="${PATH_LEFT}" fill="#FFFFFF"/>
  <path d="${PATH_RIGHT}" fill="#FFFFFF"/>
</svg>`
  return new Resvg(svg, {
    fitTo: { mode: 'width', value: SIZE },
    background: BLUE
  })
    .render().pixels
}

/**
 * Multi-source 8-connected geodesic distance inside a binary mask.
 * Returns Float32Array of distances (Infinity outside / unreachable).
 */
function geodesicDistance(mask, seeds) {
  const dist = new Float32Array(SIZE * SIZE)
  dist.fill(Number.POSITIVE_INFINITY)
  const qx = new Int32Array(SIZE * SIZE)
  const qy = new Int32Array(SIZE * SIZE)
  let head = 0
  let tail = 0

  for (const [sx, sy] of seeds) {
    const x = Math.round(sx)
    const y = Math.round(sy)
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) continue
    const i = y * SIZE + x
    if (!mask[i]) continue
    dist[i] = 0
    qx[tail] = x
    qy[tail] = y
    tail++
  }

  const N8 = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1]
  ]

  while (head < tail) {
    const x = qx[head]
    const y = qy[head]
    head++
    const i = y * SIZE + x
    const d0 = dist[i]
    for (const [dx, dy] of N8) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) continue
      const ni = ny * SIZE + nx
      if (!mask[ni]) continue
      if (dist[ni] !== Number.POSITIVE_INFINITY) continue
      dist[ni] = d0 + 1
      qx[tail] = nx
      qy[tail] = ny
      tail++
    }
  }
  return dist
}

function maxFinite(dist, mask) {
  let m = 0
  for (let i = 0; i < dist.length; i++) {
    if (mask[i] && Number.isFinite(dist[i]) && dist[i] > m) m = dist[i]
  }
  return m || 1
}

function buildPhaseMasks(leftMask, rightMask) {
  // Stem = left-path pixels near the vertical column of the "d"
  const stemMask = new Uint8Array(SIZE * SIZE)
  const leftOnly = new Uint8Array(SIZE * SIZE)
  const cx0 = Math.round(522.535 * S)
  const cx1 = Math.round(594.848 * S)
  const yTop = Math.round(289 * S)
  const yJunc = Math.round(560 * S)

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x
      if (!leftMask[i]) continue
      const inStemCol = x >= cx0 - 2 && x <= cx1 + 2 && y >= yTop - 2 && y <= yJunc + 8
      if (inStemCol) stemMask[i] = 1
      else leftOnly[i] = 1
    }
  }

  // Ensure junction connectivity: a few pixels at stem base belong to stem
  const jx = Math.round(558.691 * S)
  const jy = Math.round(548 * S)
  for (let dy = -6; dy <= 6; dy++) {
    for (let dx = -20; dx <= 20; dx++) {
      const x = jx + dx
      const y = jy + dy
      if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) continue
      const i = y * SIZE + x
      if (leftMask[i] && y <= jy + 2) {
        stemMask[i] = 1
        leftOnly[i] = 0
      }
    }
  }

  return { stemMask, leftOnly, rightMask }
}

function precomputeReveal(leftMask, rightMask) {
  const { stemMask, leftOnly } = buildPhaseMasks(leftMask, rightMask)

  // Stem grows UP from a compact junction seed (vertical nub, not a wide bar)
  const stemSeeds = []
  const jx = Math.round(558.691 * S)
  const jy = Math.round(548 * S)
  for (let dx = -10; dx <= 10; dx++) {
    for (let dy = -1; dy <= 2; dy++) stemSeeds.push([jx + dx, jy + dy])
  }
  const stemDist = geodesicDistance(stemMask, stemSeeds)
  // Prefer upward growth: add a small bias so lower pixels reveal slightly earlier is OK (seeds at bottom)

  // Left e grows outward from junction
  const leftSeeds = []
  for (let dx = -8; dx <= 24; dx++) {
    for (let dy = -8; dy <= 24; dy++) leftSeeds.push([jx + dx, jy + dy])
  }
  // Also seed along stem/left boundary so reveal starts from center connection
  for (let y = jy - 10; y <= jy + 40; y++) {
    for (let x = jx - 40; x <= jx + 10; x++) {
      const i = y * SIZE + x
      if (i >= 0 && i < leftOnly.length && leftOnly[i]) leftSeeds.push([x, y])
    }
  }
  const leftDist = geodesicDistance(leftOnly, leftSeeds)

  // Right a from center junction area
  const rightSeeds = []
  for (let dx = -10; dx <= 40; dx++) {
    for (let dy = -20; dy <= 30; dy++) rightSeeds.push([jx + dx, jy + dy])
  }
  const rightDist = geodesicDistance(rightMask, rightSeeds)

  return {
    stemMask,
    leftOnly,
    rightMask,
    stemDist,
    leftDist,
    rightDist,
    stemMax: maxFinite(stemDist, stemMask),
    leftMax: maxFinite(leftDist, leftOnly),
    rightMax: maxFinite(rightDist, rightMask)
  }
}

function revealThreshold(draw, data) {
  const d = draw * W_TOTAL
  const stemT = clamp01(d / W_STEM) * data.stemMax
  const leftT = clamp01((d - W_STEM) / W_LEFT) * data.leftMax
  const rightT = clamp01((d - W_STEM - W_LEFT) / W_RIGHT) * data.rightMax
  return { stemT, leftT, rightT }
}

function composeFrame(logoRgba, data, state) {
  const out = new Uint8Array(SIZE * SIZE * 4)
  // Fill blue background first
  for (let i = 0; i < out.length; i += 4) {
    out[i] = BLUE_RGB[0]
    out[i + 1] = BLUE_RGB[1]
    out[i + 2] = BLUE_RGB[2]
    out[i + 3] = 255
  }

  if (state.draw <= 0 || state.opacity <= 0.001) return out

  const full = state.draw >= 0.999
  const thr = full ? null : revealThreshold(state.draw, data)
  const scale = state.scale
  const opacity = state.opacity
  const cx = SIZE / 2
  const cy = SIZE / 2

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const oi = (y * SIZE + x) * 4

      const sx = Math.round(cx + (x - cx) / scale)
      const sy = Math.round(cy + (y - cy) / scale)
      if (sx < 0 || sy < 0 || sx >= SIZE || sy >= SIZE) continue

      const si = sy * SIZE + sx
      if (!full) {
        let ok = false
        if (thr.stemT > 0 && data.stemMask[si] && data.stemDist[si] <= thr.stemT) ok = true
        else if (thr.leftT > 0 && data.leftOnly[si] && data.leftDist[si] <= thr.leftT)
          ok = true
        else if (thr.rightT > 0 && data.rightMask[si] && data.rightDist[si] <= thr.rightT)
          ok = true
        if (!ok) continue
      }

      const li = si * 4
      if (!(logoRgba[li] > 200 && logoRgba[li + 1] > 200 && logoRgba[li + 2] > 200)) continue

      const a = opacity
      out[oi] = Math.round(255 * a + BLUE_RGB[0] * (1 - a))
      out[oi + 1] = Math.round(255 * a + BLUE_RGB[1] * (1 - a))
      out[oi + 2] = Math.round(255 * a + BLUE_RGB[2] * (1 - a))
    }
  }
  return out
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true })

  console.log('Rendering exact logo paths…')
  const leftMask = renderPathMask(PATH_LEFT)
  const rightMask = renderPathMask(PATH_RIGHT)
  const logo = renderFullLogo()
  const data = precomputeReveal(leftMask, rightMask)
  console.log('Geodesic maxima', {
    stem: data.stemMax.toFixed(1),
    left: data.leftMax.toFixed(1),
    right: data.rightMax.toFixed(1)
  })

  const frames = []
  for (let i = 0; i < FRAME_COUNT; i++) {
    const state = sampleTimeline(i / FRAME_COUNT)
    frames.push(composeFrame(logo, data, state))
    if (i % 10 === 0 || i === FRAME_COUNT - 1) console.log(`frame ${i + 1}/${FRAME_COUNT}`)
  }

  const sample = frames[Math.floor(FRAME_COUNT * 0.78)]
  const palette = quantize(sample, 24, { format: 'rgba4444' })
  const gif = GIFEncoder()
  for (const rgba of frames) {
    gif.writeFrame(applyPalette(rgba, palette, 'rgba4444'), SIZE, SIZE, {
      palette,
      delay: FRAME_DELAY,
      repeat: 0
    })
  }
  gif.finish()
  const bytes = Buffer.from(gif.bytes())
  writeFileSync(OUT_GIF, bytes)
  mkdirSync(dirname(OUT_GIF_RESOURCES), { recursive: true })
  writeFileSync(OUT_GIF_RESOURCES, bytes)
  console.log(`Wrote ${OUT_GIF} (${bytes.length} bytes, ${FRAME_COUNT} frames @ ${FRAME_DELAY}ms)`)
  console.log(`Wrote ${OUT_GIF_RESOURCES}`)
}

main()
