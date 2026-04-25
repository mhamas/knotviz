#!/usr/bin/env node
/**
 * Take the user-provided logo PNGs which have solid backgrounds baked in
 * (white for the light variant, dark-charcoal for the dark variant) and
 * produce versions where that background is made transparent, so the logo
 * blends cleanly into any page background.
 *
 * Reads: public/{icon,logo}-{light,dark}.webp (the originals provided by the user)
 * Writes: public/{icon,logo}-{light,dark}.webp (overwritten, transparent bg)
 *
 * Uses the top-left pixel's colour as the "background" and makes every pixel
 * within `tolerance` match transparent.
 */

import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(__dirname, '..', 'public')

const files = [
  'icon-light.webp',
  'icon-dark.webp',
  'logo-light.webp',
  'logo-dark.webp',
]

const TOLERANCE = 18 // per-channel max distance to still count as bg

async function makeTransparent(filename) {
  const filePath = path.join(publicDir, filename)
  const img = sharp(filePath)
  const meta = await img.metadata()

  const { data, info } = await img
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info
  if (channels !== 4) throw new Error(`expected 4 channels, got ${channels}`)

  // Background colour = top-left pixel
  const bgR = data[0]
  const bgG = data[1]
  const bgB = data[2]

  let changed = 0
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (
      Math.abs(r - bgR) <= TOLERANCE &&
      Math.abs(g - bgG) <= TOLERANCE &&
      Math.abs(b - bgB) <= TOLERANCE
    ) {
      data[i + 3] = 0
      changed++
    }
  }

  const pct = ((changed / (width * height)) * 100).toFixed(1)

  // After making the background transparent, find the tightest bounding box
  // around the MAIN content by detecting the largest contiguous run of active
  // rows (rows with any opaque pixel). Small isolated decorations — e.g. the
  // small sparkle in the bottom-right of the dark variant — create their own
  // short active-row band that's separated from the main wordmark by empty
  // rows; we pick only the longest band so the icon stays fully visible but
  // the sparkle is excluded. No density threshold means the icon's thin
  // top/bottom edges are never clipped.
  const rowActive = new Uint8Array(height)
  const colActive = new Uint8Array(width)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 20) {
        rowActive[y] = 1
        colActive[x] = 1
      }
    }
  }

  // Find the longest contiguous run of active rows.
  let bestTop = 0, bestLen = 0, curStart = -1
  for (let y = 0; y <= height; y++) {
    if (y < height && rowActive[y]) {
      if (curStart === -1) curStart = y
    } else if (curStart !== -1) {
      const len = y - curStart
      if (len > bestLen) { bestLen = len; bestTop = curStart }
      curStart = -1
    }
  }
  const top = bestTop
  const bottom = bestTop + bestLen - 1

  // Columns are less likely to have isolated decorations, so a simple trim
  // of the leading/trailing inactive cols is enough.
  let left = 0
  while (left < width && !colActive[left]) left++
  let right = width - 1
  while (right > left && !colActive[right]) right--

  const cropW = right - left + 1
  const cropH = bottom - top + 1
  console.log(
    `  cropped to ${cropW}×${cropH} (removed ${width - cropW}px wide, ${height - cropH}px tall of empty/decorative space)`,
  )

  await sharp(data, { raw: { width, height, channels: 4 } })
    .extract({ left, top, width: cropW, height: cropH })
    .webp({ quality: 90 })
    .toFile(filePath + '.tmp')

  const fs = await import('node:fs/promises')
  await fs.rename(filePath + '.tmp', filePath)

  console.log(
    `${filename}: bg rgb(${bgR},${bgG},${bgB}) → transparent, ${pct}% of pixels (${width}×${height})`,
  )
}

for (const f of files) await makeTransparent(f)
console.log('done.')
