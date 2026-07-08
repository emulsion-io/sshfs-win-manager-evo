import ProcessHandlerLinux from './ProcessHandlerLinux.js'
import { currentPlatform } from '@/platform/index.js'

class ProcessHandlerMac extends ProcessHandlerLinux {
  getSshfsBinaryCandidates () {
    return [
      this.settings.sshfsBinary,
      currentPlatform.sshfsBinary,
      ...(currentPlatform.sshfsBinaryAlternatives || []),
      '/usr/bin/sshfs'
    ].filter((candidate, index, candidates) => candidate && candidates.indexOf(candidate) === index)
  }

  getMissingBinaryError (sshfsBinary) {
    return `SSHFS binary not found at "${sshfsBinary}". Install macFUSE and SSHFS, or update your SSHFS binary setting.`
  }

  getDefaultMountOptions (conn) {
    return [
      ...super.getDefaultMountOptions(conn),
      `-ovolname=${String(conn.name || 'SSHFS').substr(0, 32)}`
    ]
  }

  getUnmountCommands (mountPoint) {
    return [
      { file: 'diskutil', args: ['unmount', mountPoint] },
      { file: 'umount', args: [mountPoint] }
    ]
  }
}

export default ProcessHandlerMac
