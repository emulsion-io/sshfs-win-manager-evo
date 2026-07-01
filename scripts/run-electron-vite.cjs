const { spawn } = require('child_process')
const path = require('path')

const electronViteCli = path.join(
  __dirname,
  '..',
  'node_modules',
  'electron-vite',
  'bin',
  'electron-vite.js'
)

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

try {
  require('electron')
} catch (error) {
  console.error(error)
  process.exit(1)
}

const child = spawn(process.execPath, [electronViteCli, ...process.argv.slice(2)], {
  env,
  stdio: 'inherit'
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code || 0)
})
