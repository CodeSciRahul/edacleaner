import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = join(root, 'renderer', 'assets', 'app logo', 'App Icon1.svg')
const iconDirectory = join(root, 'resources', 'icons')
const linuxIconDirectory = join(iconDirectory, 'linux')
const svg = await readFile(sourcePath)

const renderPng = (size) =>
  new Resvg(svg, {
    fitTo: { mode: 'width', value: size }
  })
    .render()
    .asPng()

const pngBySize = new Map()
const png = (size) => {
  if (!pngBySize.has(size)) {
    pngBySize.set(size, renderPng(size))
  }
  return pngBySize.get(size)
}

const createIco = (sizes) => {
  const images = sizes.map((size) => ({ size, data: png(size) }))
  const directorySize = 6 + images.length * 16
  const output = Buffer.alloc(directorySize + images.reduce((total, image) => total + image.data.length, 0))

  output.writeUInt16LE(0, 0)
  output.writeUInt16LE(1, 2)
  output.writeUInt16LE(images.length, 4)

  let imageOffset = directorySize
  images.forEach(({ size, data }, index) => {
    const entryOffset = 6 + index * 16
    output.writeUInt8(size === 256 ? 0 : size, entryOffset)
    output.writeUInt8(size === 256 ? 0 : size, entryOffset + 1)
    output.writeUInt8(0, entryOffset + 2)
    output.writeUInt8(0, entryOffset + 3)
    output.writeUInt16LE(1, entryOffset + 4)
    output.writeUInt16LE(32, entryOffset + 6)
    output.writeUInt32LE(data.length, entryOffset + 8)
    output.writeUInt32LE(imageOffset, entryOffset + 12)
    data.copy(output, imageOffset)
    imageOffset += data.length
  })

  return output
}

const createIcns = () => {
  const entries = [
    ['icp4', 16],
    ['icp5', 32],
    ['icp6', 64],
    ['ic07', 128],
    ['ic08', 256],
    ['ic09', 512],
    ['ic10', 1024],
    // Explicit Retina variants used by macOS Finder and the Dock.
    ['ic11', 32],
    ['ic12', 64],
    ['ic13', 256],
    ['ic14', 512]
  ].map(([type, size]) => {
    const data = png(size)
    const entry = Buffer.alloc(8 + data.length)
    entry.write(type, 0, 4, 'ascii')
    entry.writeUInt32BE(entry.length, 4)
    data.copy(entry, 8)
    return entry
  })

  const output = Buffer.alloc(8 + entries.reduce((total, entry) => total + entry.length, 0))
  output.write('icns', 0, 4, 'ascii')
  output.writeUInt32BE(output.length, 4)

  let offset = 8
  for (const entry of entries) {
    entry.copy(output, offset)
    offset += entry.length
  }
  return output
}

const windowsSizes = [16, 24, 32, 48, 64, 128, 256]
const standaloneSizes = [16, 24, 32, 48, 64, 96, 128, 192, 256]
const linuxSizes = [16, 24, 32, 48, 64, 96, 128, 256, 512, 1024]
const ico = createIco(windowsSizes)
const icns = createIcns()

await rm(linuxIconDirectory, { recursive: true, force: true })
await mkdir(linuxIconDirectory, { recursive: true })

await Promise.all([
  writeFile(join(iconDirectory, 'icon.png'), png(1024)),
  writeFile(join(iconDirectory, '512.png'), png(512)),
  writeFile(join(iconDirectory, 'icon-256.png'), png(256)),
  writeFile(join(iconDirectory, 'icon.ico'), ico),
  writeFile(join(iconDirectory, 'icon.icns'), icns),
  writeFile(join(root, 'resources', 'icon.png'), png(512)),
  writeFile(join(root, 'resources', 'icon.ico'), ico),
  writeFile(join(root, 'resources', 'icon.icns'), icns),
  ...standaloneSizes.map((size) =>
    writeFile(join(iconDirectory, `${size}.ico`), createIco([size]))
  ),
  ...linuxSizes.map((size) =>
    writeFile(join(linuxIconDirectory, `${size}x${size}.png`), png(size))
  ),
  writeFile(join(iconDirectory, 'logo.ico'), createIco([256]))
])

console.log(`Generated Windows, macOS, and Linux app icons from ${sourcePath}`)
