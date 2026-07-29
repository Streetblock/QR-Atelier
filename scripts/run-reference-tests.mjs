import { readdir } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const referenceRoot = new URL('../reference-tests/', import.meta.url)
const testFiles = await findModuleTests(referenceRoot)

if (testFiles.length === 0) {
  console.log('No reference tests found.')
  process.exit(0)
}

const result = spawnSync(process.execPath, ['--test', ...testFiles], { stdio: 'inherit' })
if (result.error) throw result.error
process.exit(result.status ?? 1)

async function findModuleTests(directory) {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    throw error
  }

  const files = []
  for (const entry of entries) {
    const child = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory)
    if (entry.isDirectory()) {
      files.push(...await findModuleTests(child))
    } else if (entry.isFile() && entry.name.endsWith('.mjs')) {
      files.push(fileURLToPath(child))
    }
  }
  return files.sort()
}
