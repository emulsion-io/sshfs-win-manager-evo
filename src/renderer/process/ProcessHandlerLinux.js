import { execFile, spawn } from 'child_process'
import { dirname, join } from 'path'
import { chmodSync, existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'

import { currentPlatform, getAutoMountPoint, getConnectionMountPoint } from '@/platform/index.js'

class ProcessHandlerLinux {
  constructor (settings) {
    this.settings = settings
    this.lastSpawnedProcess = null
  }

  create (conn) {
    return new Promise(async (resolve, reject) => {
      const sshfsBinary = this.getSshfsBinary()
      let mountPoint = conn.mountPoint

      if (mountPoint === 'auto' || !String(mountPoint || '').trim()) {
        mountPoint = getAutoMountPoint(conn)
        conn.preferredMountPoint = mountPoint
      }

      try {
        mkdirSync(mountPoint, { recursive: true })
      } catch (error) {
        reject(new Error(`Unable to create mount point "${mountPoint}": ${error.message}`))
        return
      }

      let cmdArgs = [
        `${conn.user}@${this.getRemoteHost(conn.host)}:${conn.folder}`,
        mountPoint,
        '-f',
        `-p${conn.port}`,
        '-odebug',
        '-ologlevel=debug1',
        '-oStrictHostKeyChecking=no',
        '-oUserKnownHostsFile=/dev/null'
      ]

      if (sshfsBinary.includes('/') && !existsSync(sshfsBinary)) {
        reject(new Error(this.getMissingBinaryError(sshfsBinary)))
        return
      }

      if (conn.advanced.customCmdlOptionsEnabled) {
        let optionalArgs = []

        conn.advanced.customCmdlOptions.forEach(arg => {
          cmdArgs = cmdArgs.filter(a => a.substr(2, arg.name.length) !== arg.name)

          if (arg.value !== '') {
            optionalArgs.push(`-o${arg.name}=${arg.value}`)
          } else {
            optionalArgs.push(`-o${arg.name}`)
          }
        })

        cmdArgs = [
          ...cmdArgs,
          ...optionalArgs
        ]
      } else {
        cmdArgs = [
          ...cmdArgs,
          ...this.getDefaultMountOptions(conn)
        ]
      }

      if (conn.advanced.reconnect && !cmdArgs.includes('-oreconnect')) {
        cmdArgs.push('-oreconnect')
      }

      if (conn.authType === 'password' || conn.authType === 'password-ask') {
        cmdArgs.push('-oPreferredAuthentications=password')
        cmdArgs.push('-opassword_stdin')
      }

      if (conn.authType === 'interactive') {
        cmdArgs.push('-oPreferredAuthentications=keyboard-interactive')
        cmdArgs.push('-oPasswordAuthentication=no')
        cmdArgs.push('-oKbdInteractiveAuthentication=yes')
        cmdArgs.push('-oChallengeResponseAuthentication=yes')
        cmdArgs.push('-oBatchMode=no')
      }

      if (conn.authType === 'key-file') {
        cmdArgs.push('-oPreferredAuthentications=publickey')
        cmdArgs.push(`-oIdentityFile=${conn.keyFile}`)
      }

      if (conn.authType === 'key-file-passphrase') {
        cmdArgs.push('-oPreferredAuthentications=publickey')
        cmdArgs.push(`-oIdentityFile=${conn.keyFile}`)
        cmdArgs.push('-oBatchMode=no')
      }

      if (conn.authType === 'key-file-interactive') {
        cmdArgs.push('-oPreferredAuthentications=publickey,keyboard-interactive')
        cmdArgs.push('-oPasswordAuthentication=no')
        cmdArgs.push('-oKbdInteractiveAuthentication=yes')
        cmdArgs.push('-oChallengeResponseAuthentication=yes')
        cmdArgs.push(`-oIdentityFile=${conn.keyFile}`)
        cmdArgs.push('-oBatchMode=no')
      }

      if (conn.authType === 'key-file-passphrase-interactive') {
        cmdArgs.push('-oPreferredAuthentications=publickey,keyboard-interactive')
        cmdArgs.push('-oPasswordAuthentication=no')
        cmdArgs.push('-oKbdInteractiveAuthentication=yes')
        cmdArgs.push('-oChallengeResponseAuthentication=yes')
        cmdArgs.push(`-oIdentityFile=${conn.keyFile}`)
        cmdArgs.push('-oBatchMode=no')
      }

      console.log('-'.repeat(80))
      console.log('date:', new Date().toISOString())
      console.log('conn:', `{${conn.uuid}}`, `(${conn.name})`)
      console.log('conntype:', conn.authType)
      console.log('cmd:', `"${sshfsBinary}" ${cmdArgs.join(' ')}`)

      const askpass = this.createAskpassScript(conn)
      const binaryDir = sshfsBinary.includes('/') ? dirname(sshfsBinary) : ''
      const childProcess = spawn(sshfsBinary, cmdArgs, {
        env: {
          ...globalThis.process.env,
          PATH: binaryDir
            ? `${binaryDir}${currentPlatform.pathListSeparator}${globalThis.process.env.PATH || ''}`
            : globalThis.process.env.PATH,
          ...(askpass
            ? {
              DISPLAY: globalThis.process.env.DISPLAY || 'sshfs-win-manager',
              SSH_ASKPASS: askpass.scriptPath,
              SSH_ASKPASS_REQUIRE: 'force',
              SSHFS_WIN_ASKPASS_STATE: askpass.statePath,
              ...this.getAskpassResponseEnv(conn)
            }
            : {})
        },
        detached: false
      })

      this.lastSpawnedProcess = {
        pid: childProcess.pid,
        creationDate: new Date()
      }

      if (conn.authType === 'password' || conn.authType === 'password-ask') {
        childProcess.stdin.write(conn.password + '\n')
      }

      let debugOutput = ''
      let lastDebugMessage = ''
      let connectionFinalized = false

      childProcess.stdout.on('data', data => {
        if (!connectionFinalized) {
          console.log(`{${conn.uuid}} stdout:`, data.toString())
        }
      })

      childProcess.stderr.on('data', data => {
        data = data.toString().trim()

        const visibleDebugOutput = this.getVisibleDebugOutput(data)

        if (!connectionFinalized && visibleDebugOutput) {
          console.log(`{${conn.uuid}} stderr:`, visibleDebugOutput)
        }

        debugOutput += data
        debugOutput = debugOutput.substr(-512)
        lastDebugMessage = data

        if (this.isConnectionStartedMessage(debugOutput)) {
          connectionFinalized = true
          console.log(`{${conn.uuid}}`, 'status:', 'sshfs started')
          resolve(childProcess)
        }
      })

      childProcess.on('error', error => {
        if (!connectionFinalized) {
          connectionFinalized = true
          reject(error)
        }
      })

      childProcess.on('close', exitCode => {
        if (!connectionFinalized) {
          console.log(`{${conn.uuid}}`, 'exit:', exitCode)
        }

        if (askpass) {
          askpass.paths.forEach(filePath => {
            try {
              unlinkSync(filePath)
            } catch {
              // Ignore cleanup errors for temporary askpass files.
            }
          })
        }

        if (connectionFinalized) {
          return
        }

        connectionFinalized = true

        if (debugOutput.includes('No such file or directory') && conn.keyFile && debugOutput.includes(conn.keyFile)) {
          reject(new Error('Private key not found: ' + conn.keyFile))
          return
        }

        if (debugOutput.includes('mountpoint is not empty') || debugOutput.includes('mount point in use')) {
          reject(new Error('Mount point in use'))
          return
        }

        if (debugOutput.includes('Permission denied')) {
          if (conn.authType === 'key-file' || conn.authType === 'key-file-passphrase' || conn.authType === 'key-file-interactive' || conn.authType === 'key-file-passphrase-interactive') {
            reject(new Error('Invalid user name, private key or key passphrase'))
          } else {
            reject(new Error('Invalid user name or password'))
          }
          return
        }

        reject(new Error(lastDebugMessage || `sshfs exited with code ${exitCode}`))
      })
    })
  }

  createAskpassScript (conn) {
    if (conn.authType !== 'interactive' && conn.authType !== 'key-file-passphrase' && conn.authType !== 'key-file-interactive' && conn.authType !== 'key-file-passphrase-interactive') {
      return null
    }

    const scriptPath = join(tmpdir(), `sshfs-win-manager-askpass-${conn.uuid}.sh`)
    const statePath = join(tmpdir(), `sshfs-win-manager-askpass-${conn.uuid}.state`)

    writeFileSync(
      scriptPath,
      [
        '#!/bin/sh',
        'state_path="$SSHFS_WIN_ASKPASS_STATE"',
        'index=0',
        'if [ -n "$state_path" ] && [ -f "$state_path" ]; then',
        '  raw="$(cat "$state_path" 2>/dev/null)"',
        '  case "$raw" in',
        '    *[!0-9]*|"") index=0 ;;',
        '    *) index="$raw" ;;',
        '  esac',
        'fi',
        'response_count="${SSHFS_WIN_ASKPASS_RESPONSE_COUNT:-0}"',
        'if [ "$response_count" -le 0 ] 2>/dev/null; then exit 0; fi',
        'if [ "$index" -ge "$response_count" ] 2>/dev/null; then index=$((response_count - 1)); fi',
        'eval "response=\\${SSHFS_WIN_ASKPASS_RESPONSE_${index}}"',
        'printf "%s" "$response"',
        'if [ -n "$state_path" ]; then printf "%s" "$((index + 1))" > "$state_path"; fi'
      ].join('\n'),
      'utf8'
    )

    chmodSync(scriptPath, 0o700)
    writeFileSync(statePath, '0', 'utf8')

    return {
      scriptPath,
      statePath,
      paths: [scriptPath, statePath]
    }
  }

  getAskpassResponseEnv (conn) {
    const responses = conn.authType === 'interactive' || conn.authType === 'key-file-interactive' || conn.authType === 'key-file-passphrase-interactive'
      ? conn.interactiveResponses || []
      : [conn.password || '']

    return responses.reduce((env, response, index) => {
      env[`SSHFS_WIN_ASKPASS_RESPONSE_${index}`] = response || ''
      env.SSHFS_WIN_ASKPASS_RESPONSE_COUNT = String(responses.length)
      return env
    }, {})
  }

  isConnectionStartedMessage (data) {
    const output = String(data).toLowerCase()

    return output.includes('server version:') ||
      output.includes('authentication succeeded') ||
      output.includes('remote_uid =')
  }

  getVisibleDebugOutput (data) {
    return String(data)
      .split(/\r?\n/)
      .filter(line => !this.isNoisySftpDebugLine(line))
      .join('\n')
      .trim()
  }

  isNoisySftpDebugLine (line) {
    return /^\[\d+\]\s+(stat|attrs|close|status)\b/i.test(String(line).trim())
  }

  getRemoteHost (host) {
    if (!host) {
      return ''
    }

    const sanitizedHost = String(host).trim()

    if (sanitizedHost.startsWith('[') && sanitizedHost.endsWith(']')) {
      return sanitizedHost
    }

    if (sanitizedHost.includes(':')) {
      return `[${sanitizedHost}]`
    }

    return sanitizedHost
  }

  terminate (pid, conn = null) {
    return new Promise(resolve => {
      const mountPoint = conn ? getConnectionMountPoint(conn) : null

      this.unmount(mountPoint)
        .then(() => resolve())
        .catch(() => {
          execFile('kill', ['-TERM', String(pid)], () => {
            resolve()
          })
        })
    })
  }

  exists (pid) {
    return new Promise(resolve => {
      try {
        process.kill(pid, 0)
        resolve(true)
      } catch {
        resolve(false)
      }
    })
  }

  getLastSpawnedProcess () {
    if (this.lastSpawnedProcess) {
      return Promise.resolve(this.lastSpawnedProcess)
    }

    return Promise.reject(new Error('Process not found'))
  }

  getSshfsBinary () {
    const configuredBinary = this.settings.sshfsBinary || currentPlatform.sshfsBinary

    if (!configuredBinary.includes('/') || existsSync(configuredBinary)) {
      return configuredBinary
    }

    return this.getSshfsBinaryCandidates().find(candidate => existsSync(candidate)) || configuredBinary
  }

  getSshfsBinaryCandidates () {
    return [
      currentPlatform.sshfsBinary,
      '/usr/bin/sshfs',
      '/bin/sshfs'
    ].filter((candidate, index, candidates) => candidate && candidates.indexOf(candidate) === index)
  }

  getMissingBinaryError (sshfsBinary) {
    return `SSHFS binary not found at "${sshfsBinary}". Check your settings`
  }

  getDefaultMountOptions () {
    return [
      '-oidmap=user',
      '-oreconnect',
      '-oServerAliveInterval=15',
      '-oServerAliveCountMax=3'
    ]
  }

  async unmount (mountPoint) {
    if (!mountPoint || mountPoint === 'auto') {
      throw new Error('Mount point not available')
    }

    const commands = this.getUnmountCommands(mountPoint)
    let lastError = null

    for (const command of commands) {
      try {
        await this.execFileQuiet(command.file, command.args)
        return
      } catch (error) {
        lastError = error
      }
    }

    throw lastError || new Error(`Unable to unmount "${mountPoint}"`)
  }

  getUnmountCommands (mountPoint) {
    return [
      { file: 'fusermount3', args: ['-u', mountPoint] },
      { file: 'fusermount', args: ['-u', mountPoint] },
      { file: 'umount', args: [mountPoint] }
    ]
  }

  execFileQuiet (file, args) {
    return new Promise((resolve, reject) => {
      execFile(file, args, error => {
        if (error) {
          reject(error)
          return
        }

        resolve()
      })
    })
  }
}

export default ProcessHandlerLinux
