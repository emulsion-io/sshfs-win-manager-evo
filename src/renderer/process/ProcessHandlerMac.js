import { execFile } from 'child_process'
import { basename } from 'path'

import ProcessHandlerLinux from './ProcessHandlerLinux.js'
import { currentPlatform, getConnectionMountPoint } from '@/platform/index.js'
import { isSshfsExecutable, parseMacProcessArguments, parseSshfsArguments } from './SshfsProcess.js'

class ProcessHandlerMac extends ProcessHandlerLinux {
  async listRunningMounts () {
    let processList

    try {
      processList = await this.execFileOutput('/bin/ps', ['-axo', 'pid=,comm='])
    } catch {
      return []
    }

    const candidates = processList.toString().split(/\r?\n/).map(line => {
      const match = line.match(/^\s*(\d+)\s+(.+)$/)

      if (!match || !isSshfsExecutable(basename(match[2].trim()))) {
        return null
      }

      return Number.parseInt(match[1], 10)
    }).filter(Boolean)

    const processes = await Promise.all(candidates.map(async pid => {
      try {
        const output = await this.execFileOutput('/usr/sbin/sysctl', ['-n', 'kern.procargs2', String(pid)], { encoding: null })
        const args = parseMacProcessArguments(output)

        if (!isSshfsExecutable(args[0])) {
          return null
        }

        return parseSshfsArguments(pid, args.slice(1))
      } catch {
        return null
      }
    }))

    return processes.filter(Boolean)
  }

  // FUSE-T unmounts its local NFS volume when sshfs exits. Terminating the
  // process first also works with macFUSE; the unmount pass cleans up any
  // volume that remains registered by macOS.
  terminate (pid, conn = null) {
    return new Promise(resolve => {
      execFile('kill', ['-TERM', String(pid)], () => {
        const mountPoint = conn ? getConnectionMountPoint(conn) : null

        if (!mountPoint || mountPoint === 'auto') {
          resolve()
          return
        }

        setTimeout(() => {
          this.unmount(mountPoint)
            .catch(() => {})
            .then(() => resolve())
        }, 500)
      })
    })
  }

  getSshfsBinaryCandidates () {
    return [
      this.settings.sshfsBinary,
      currentPlatform.sshfsBinary,
      ...(currentPlatform.sshfsBinaryAlternatives || []),
      '/usr/bin/sshfs'
    ].filter((candidate, index, candidates) => candidate && candidates.indexOf(candidate) === index)
  }

  getMissingBinaryError (sshfsBinary) {
    return `SSHFS binary not found at "${sshfsBinary}". Install SSHFS for macFUSE or FUSE-T, or update your SSHFS binary setting.`
  }

  getDefaultMountOptions (conn) {
    return [
      ...super.getDefaultMountOptions(conn),
      `-ovolname=${String(conn.name || 'SSHFS').substr(0, 32)}`
    ]
  }

  getUnmountCommands (mountPoint) {
    return [
      { file: 'umount', args: [mountPoint] },
      { file: 'diskutil', args: ['unmount', mountPoint] },
      { file: 'diskutil', args: ['unmount', 'force', mountPoint] }
    ]
  }

  execFileOutput (file, args, options = {}) {
    return new Promise((resolve, reject) => {
      execFile(file, args, { maxBuffer: 1024 * 1024, ...options }, (error, stdout) => {
        if (error) {
          reject(error)
          return
        }

        resolve(stdout)
      })
    })
  }
}

export default ProcessHandlerMac
