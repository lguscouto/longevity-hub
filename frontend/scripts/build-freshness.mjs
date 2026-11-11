import { createHash } from 'node:crypto'
import { access, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const stampPath = path.join(root, 'dist', '.source-fingerprint')
const roots = ['src', 'public', 'index.html', 'package.json', 'package-lock.json', 'vite.config.ts', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'scripts/build-freshness.mjs']

async function collect(relativePath) {
  const absolutePath = path.join(root, relativePath)
  let entries
  try { entries = await readdir(absolutePath, { withFileTypes: true }) }
  catch (error) {
    if (error.code === 'ENOENT') return []
    if (error.code === 'ENOTDIR') return [relativePath]
    throw error
  }
  const nested = await Promise.all(entries.filter(entry => !entry.isSymbolicLink()).map(entry => collect(path.join(relativePath, entry.name))))
  return nested.flat()
}

const files = (await Promise.all(roots.map(collect))).flat().sort()
const hash = createHash('sha256')
for (const filename of files) {
  hash.update(filename.replaceAll('\\', '/'))
  hash.update('\0')
  hash.update(await readFile(path.join(root, filename)))
  hash.update('\0')
}
const fingerprint = hash.digest('hex')
if (process.argv.includes('--write')) {
  await writeFile(stampPath, `${fingerprint}\n`, 'utf8')
  console.log('Identificação da versão do frontend registrada.')
} else {
  let recorded = ''
  try { recorded = (await readFile(stampPath, 'utf8')).trim() } catch (error) { if (error.code !== 'ENOENT') throw error }
  let artifactsPresent = false
  try {
    const html = await readFile(path.join(root, 'dist', 'index.html'), 'utf8')
    const assets = [...html.matchAll(/(?:src|href)=["']\/?(assets\/[^"']+)["']/g)].map(match => match[1])
    if (assets.length > 0) {
      await Promise.all(assets.map(asset => access(path.join(root, 'dist', asset))))
      artifactsPresent = true
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error }
  if (recorded !== fingerprint || !artifactsPresent) {
    console.log('Frontend ausente ou desatualizado.')
    process.exitCode = 1
  } else console.log('Frontend atualizado.')
}
