const fs = require('fs')
const path = require('path')

const buildDir = path.join(__dirname, '..', 'build')

const exactTargets = [
  'win-unpacked',
  'latest.yml',
  'builder-debug.yml',
  'builder-effective-config.yaml'
]

function removeTarget (targetPath) {
  fs.rmSync(targetPath, {
    recursive: true,
    force: true
  })
}

exactTargets.forEach(target => {
  removeTarget(path.join(buildDir, target))
})

if (fs.existsSync(buildDir)) {
  fs.readdirSync(buildDir).forEach(entry => {
    if (entry.endsWith('.exe') || entry.endsWith('.blockmap')) {
      removeTarget(path.join(buildDir, entry))
    }
  })
}
