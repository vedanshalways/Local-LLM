'use strict'

/**
 * Turns assets/logo.png into app icons.
 *
 * The source art is a mark floating in a lot of whitespace, which makes a poor
 * icon — macOS and Windows both expect the artwork to fill its tile. So: find the
 * mark's real bounding box, scale it to fill most of a square, and lay it on a
 * rounded tile. Run under Electron (`node scripts/start-electron.js scripts/make-icons.js`)
 * so we can use nativeImage instead of pulling in an image library.
 */

const { app, nativeImage } = require('electron')
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const ROOT = path.join(__dirname, '..')
const ASSETS = path.join(ROOT, 'assets')
const SOURCE = path.join(ASSETS, 'logo.png')

const CANVAS = 1024
const MARK_RATIO = 0.62 // how much of the tile the mark occupies
const CORNER_RATIO = 0.2237 // macOS squircle-ish corner radius

/** Scan the bitmap for pixels that aren't background, and return their bounds. */
function contentBounds(bitmap, width, height) {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const b = bitmap[i]
      const g = bitmap[i + 1]
      const r = bitmap[i + 2]
      const a = bitmap[i + 3]

      const transparent = a < 24
      const nearWhite = r > 242 && g > 242 && b > 242
      if (transparent || nearWhite) continue

      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }

  if (maxX < 0) return { x: 0, y: 0, width, height }
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

/** Rounded-rect coverage at a pixel, with a soft edge so corners aren't jagged. */
function tileAlpha(x, y, size, radius) {
  const cx = Math.min(x, size - 1 - x)
  const cy = Math.min(y, size - 1 - y)
  if (cx >= radius || cy >= radius) return 1

  const dx = radius - cx
  const dy = radius - cy
  const distance = Math.sqrt(dx * dx + dy * dy)
  const edge = distance - radius
  if (edge <= -1) return 1
  if (edge >= 1) return 0
  return (1 - (edge + 1) / 2)
}

function buildIcon() {
  const source = nativeImage.createFromPath(SOURCE)
  if (source.isEmpty()) throw new Error(`Could not read ${SOURCE}`)

  const sourceSize = source.getSize()
  const bitmap = source.toBitmap()
  const bounds = contentBounds(bitmap, sourceSize.width, sourceSize.height)
  console.log(`source ${sourceSize.width}x${sourceSize.height} → mark at`, bounds)

  // Crop to the mark, then scale it to fit inside the tile without distortion.
  const cropped = source.crop(bounds)
  const target = Math.round(CANVAS * MARK_RATIO)
  const scale = Math.min(target / bounds.width, target / bounds.height)
  const markWidth = Math.max(1, Math.round(bounds.width * scale))
  const markHeight = Math.max(1, Math.round(bounds.height * scale))
  const mark = cropped.resize({ width: markWidth, height: markHeight, quality: 'best' })
  const markBitmap = mark.toBitmap()

  const offsetX = Math.round((CANVAS - markWidth) / 2)
  const offsetY = Math.round((CANVAS - markHeight) / 2)
  const radius = CANVAS * CORNER_RATIO

  // Start with an opaque white tile, then composite the mark over it.
  const canvas = Buffer.alloc(CANVAS * CANVAS * 4)
  for (let y = 0; y < CANVAS; y++) {
    for (let x = 0; x < CANVAS; x++) {
      const i = (y * CANVAS + x) * 4
      const alpha = tileAlpha(x, y, CANVAS, radius)
      canvas[i] = 255
      canvas[i + 1] = 255
      canvas[i + 2] = 255
      canvas[i + 3] = Math.round(255 * alpha)
    }
  }

  for (let y = 0; y < markHeight; y++) {
    for (let x = 0; x < markWidth; x++) {
      const src = (y * markWidth + x) * 4
      const srcAlpha = markBitmap[src + 3] / 255
      const b = markBitmap[src]
      const g = markBitmap[src + 1]
      const r = markBitmap[src + 2]

      // The artwork is on a white background: treat white as transparent so the
      // mark blends into the tile instead of sitting on a visible box.
      const whiteness = Math.min(r, g, b) / 255
      const coverage = srcAlpha * (1 - Math.pow(whiteness, 3))
      if (coverage <= 0.002) continue

      const dstX = offsetX + x
      const dstY = offsetY + y
      if (dstX < 0 || dstY < 0 || dstX >= CANVAS || dstY >= CANVAS) continue

      const dst = (dstY * CANVAS + dstX) * 4
      canvas[dst] = Math.round(b * coverage + canvas[dst] * (1 - coverage))
      canvas[dst + 1] = Math.round(g * coverage + canvas[dst + 1] * (1 - coverage))
      canvas[dst + 2] = Math.round(r * coverage + canvas[dst + 2] * (1 - coverage))
    }
  }

  return nativeImage.createFromBitmap(canvas, { width: CANVAS, height: CANVAS })
}

function writeIcns(icon) {
  const iconset = path.join(ASSETS, 'icon.iconset')
  fs.rmSync(iconset, { recursive: true, force: true })
  fs.mkdirSync(iconset, { recursive: true })

  const specs = [
    [16, 'icon_16x16.png'], [32, 'icon_16x16@2x.png'],
    [32, 'icon_32x32.png'], [64, 'icon_32x32@2x.png'],
    [128, 'icon_128x128.png'], [256, 'icon_128x128@2x.png'],
    [256, 'icon_256x256.png'], [512, 'icon_256x256@2x.png'],
    [512, 'icon_512x512.png'], [1024, 'icon_512x512@2x.png'],
  ]

  for (const [size, name] of specs) {
    const resized = icon.resize({ width: size, height: size, quality: 'best' })
    fs.writeFileSync(path.join(iconset, name), resized.toPNG())
  }

  try {
    execFileSync('iconutil', ['-c', 'icns', iconset, '-o', path.join(ASSETS, 'icon.icns')])
    console.log('wrote assets/icon.icns')
  } catch (err) {
    console.warn('iconutil unavailable, skipping .icns:', err.message)
  }
  fs.rmSync(iconset, { recursive: true, force: true })
}

app.whenReady().then(() => {
  try {
    const icon = buildIcon()
    fs.writeFileSync(path.join(ASSETS, 'icon.png'), icon.toPNG())
    console.log(`wrote assets/icon.png (${CANVAS}x${CANVAS})`)

    // A trimmed, transparent-background mark for use inside the UI.
    fs.writeFileSync(
      path.join(ASSETS, 'icon-512.png'),
      icon.resize({ width: 512, height: 512, quality: 'best' }).toPNG(),
    )

    if (process.platform === 'darwin') writeIcns(icon)
    console.log('done')
    app.exit(0)
  } catch (err) {
    console.error('icon generation failed:', err)
    app.exit(1)
  }
})
