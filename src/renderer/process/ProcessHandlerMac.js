import { execFile } from 'child_process'

import ProcessHandlerLinux from './ProcessHandlerLinux.js'
import { currentPlatform, getConnectionMountPoint } from '@/platform/index.js'

class ProcessHandlerMac extends ProcessHandlerLinux {
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
}

export default ProcessHandlerMac
