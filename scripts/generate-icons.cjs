const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const rootDir = path.resolve(__dirname, '..')
const buildIconsDir = path.join(rootDir, 'build', 'icons')
const staticDir = path.join(rootDir, 'static')
const sourceSvgPath = path.join(buildIconsDir, 'sshfs-evo-logo.svg')
const errorSvgPath = path.join(buildIconsDir, 'sshfs-evo-error-logo.svg')

const pngSizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024]
const appIcoSizes = [16, 24, 32, 48, 64, 128, 256]
const trayIcoSizes = [16, 24, 32]
const icnsTypes = [
  { type: 'icp4', size: 16 },
  { type: 'icp5', size: 32 },
  { type: 'icp6', size: 64 },
  { type: 'ic07', size: 128 },
  { type: 'ic08', size: 256 },
  { type: 'ic09', size: 512 },
  { type: 'ic10', size: 1024 }
]

function ensureDir (dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function icoEntrySize (size) {
  return size === 256 ? 0 : size
}

function writeIco (outputPath, images) {
  const headerSize = 6
  const entrySize = 16
  const directorySize = headerSize + images.length * entrySize
  const imageBytes = images.map(image => image.bytes)
  const totalSize = directorySize + imageBytes.reduce((sum, bytes) => sum + bytes.length, 0)
  const buffer = Buffer.alloc(totalSize)

  let cursor = 0
  buffer.writeUInt16LE(0, cursor)
  cursor += 2
  buffer.writeUInt16LE(1, cursor)
  cursor += 2
  buffer.writeUInt16LE(images.length, cursor)
  cursor += 2

  let imageOffset = directorySize

  images.forEach((image, index) => {
    const entryOffset = headerSize + index * entrySize
    buffer.writeUInt8(icoEntrySize(image.size), entryOffset)
    buffer.writeUInt8(icoEntrySize(image.size), entryOffset + 1)
    buffer.writeUInt8(0, entryOffset + 2)
    buffer.writeUInt8(0, entryOffset + 3)
    buffer.writeUInt16LE(1, entryOffset + 4)
    buffer.writeUInt16LE(32, entryOffset + 6)
    buffer.writeUInt32LE(image.bytes.length, entryOffset + 8)
    buffer.writeUInt32LE(imageOffset, entryOffset + 12)
    imageOffset += image.bytes.length
  })

  imageOffset = directorySize

  imageBytes.forEach(bytes => {
    bytes.copy(buffer, imageOffset)
    imageOffset += bytes.length
  })

  fs.writeFileSync(outputPath, buffer)
}

function writeIcns (outputPath, entries) {
  const headerSize = 8
  const totalSize = headerSize + entries.reduce((sum, entry) => sum + 8 + entry.bytes.length, 0)
  const buffer = Buffer.alloc(totalSize)

  let cursor = 0
  buffer.write('icns', cursor)
  cursor += 4
  buffer.writeUInt32BE(totalSize, cursor)
  cursor += 4

  entries.forEach(entry => {
    buffer.write(entry.type, cursor)
    cursor += 4
    buffer.writeUInt32BE(entry.bytes.length + 8, cursor)
    cursor += 4
    entry.bytes.copy(buffer, cursor)
    cursor += entry.bytes.length
  })

  fs.writeFileSync(outputPath, buffer)
}

async function renderPng (size, outputPath, inputPath = sourceSvgPath) {
  const bytes = await sharp(inputPath, { density: 384 })
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer()

  fs.writeFileSync(outputPath, bytes)
  return bytes
}

async function renderIcoImages (sizes) {
  const images = []

  for (const size of sizes) {
    images.push({
      size,
      bytes: await sharp(sourceSvgPath, { density: 384 })
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer()
    })
  }

  return images
}

async function renderIcnsEntries () {
  const entries = []

  for (const item of icnsTypes) {
    entries.push({
      type: item.type,
      bytes: await sharp(sourceSvgPath, { density: 384 })
        .resize(item.size, item.size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer()
    })
  }

  return entries
}

async function main () {
  if (!fs.existsSync(sourceSvgPath)) {
    throw new Error(`Icon source not found: ${sourceSvgPath}`)
  }

  if (!fs.existsSync(errorSvgPath)) {
    throw new Error(`Error icon source not found: ${errorSvgPath}`)
  }

  ensureDir(buildIconsDir)
  ensureDir(staticDir)

  for (const size of pngSizes) {
    await renderPng(size, path.join(buildIconsDir, `sshfs-evo-logo-${size}.png`))
  }

  fs.copyFileSync(sourceSvgPath, path.join(staticDir, 'sshfs-evo-logo.svg'))

  await renderPng(256, path.join(staticDir, 'app-icon.png'))
  await renderPng(64, path.join(staticDir, 'app-icon-xs.png'))
  await renderPng(32, path.join(staticDir, 'tray-icon.png'))
  await renderPng(256, path.join(staticDir, 'error-icon.png'), errorSvgPath)

  const appIcoImages = await renderIcoImages(appIcoSizes)
  const trayIcoImages = await renderIcoImages(trayIcoSizes)
  const icnsEntries = await renderIcnsEntries()

  writeIco(path.join(buildIconsDir, 'sshfs-evo-logo.ico'), appIcoImages)
  writeIco(path.join(buildIconsDir, 'app-icon.ico'), appIcoImages)
  writeIco(path.join(buildIconsDir, 'setup-icon.ico'), appIcoImages)
  writeIcns(path.join(buildIconsDir, 'app-icon.icns'), icnsEntries)
  writeIco(path.join(staticDir, 'app-icon.ico'), appIcoImages)
  writeIco(path.join(staticDir, 'tray-icon.ico'), trayIcoImages)

  console.log('Generated icons from build/icons/sshfs-evo-logo.svg')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
