import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { open, stat, unlink } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'

const magic = Buffer.from('NIVAA001')
const headerSize = 8 + 32 + 12
const keyFor = (password, salt) => pbkdf2Sync(password, salt, 600000, 32, 'sha256')

export async function encryptArchive(source, destination, password) {
  if (!password || password.length < 20) throw new Error('Use a backup passphrase of at least 20 characters')
  const salt = randomBytes(32)
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyFor(password, salt), iv)
  const handle = await open(destination, 'wx', 0o600)
  const output = handle.createWriteStream()
  output.write(Buffer.concat([magic, salt, iv]))
  try {
    await pipeline(createReadStream(source), cipher, output, { end: false })
    output.end(cipher.getAuthTag())
    await new Promise((resolve, reject) => { output.on('finish', resolve); output.on('error', reject) })
  } catch (error) { output.destroy(); await unlink(destination).catch(() => {}); throw error }
}

export async function decryptArchive(source, destination, password) {
  const file = await open(source, 'r')
  try {
    const size = (await stat(source)).size
    if (size <= headerSize + 16) throw new Error('Invalid archive')
    const header = Buffer.alloc(headerSize)
    const tag = Buffer.alloc(16)
    await file.read(header, 0, headerSize, 0)
    await file.read(tag, 0, 16, size - 16)
    if (!header.subarray(0, 8).equals(magic)) throw new Error('Invalid archive')
    const decipher = createDecipheriv('aes-256-gcm', keyFor(password, header.subarray(8, 40)), header.subarray(40))
    decipher.setAuthTag(tag)
    const outputHandle = await open(destination, 'wx', 0o600)
    try {
      await pipeline(createReadStream(source, { start: headerSize, end: size - 17 }), decipher, outputHandle.createWriteStream())
    } catch (error) { await unlink(destination).catch(() => {}); throw error }
  } finally { await file.close() }
}
