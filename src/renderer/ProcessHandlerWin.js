import { exec, spawn } from 'child_process'

import { dirname, join } from 'path'
import { existsSync as fileExistsSync, unlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'

class ProcessHandlerWin {
  constructor (settings) {
    this.settings = settings
  }

  create (conn) {
    return new Promise(async (resolve, reject) => {
      if (this.settings.sshfsBinary.endsWith('sshfs-win.exe')) {
        this.settings.sshfsBinary = this.settings.sshfsBinary.replace(/sshfs-win\.exe$/, 'sshfs.exe')
      }

      let mountPoint = conn.mountPoint

      if (mountPoint === 'auto') {
        mountPoint = await this.getFirstAvailableDriveLetter(conn.preferredMountPoint)

        conn.preferredMountPoint = mountPoint
      }

      let cmdArgs = [
        `${conn.user}@${this.getRemoteHost(conn.host)}:${conn.folder}`,
        mountPoint,
        `-p${conn.port}`,
        `-ovolname=${conn.name.substr(0, 32)}`,
        '-odebug',
        '-ologlevel=debug1',
        '-oStrictHostKeyChecking=no',
        '-oUserKnownHostsFile=/dev/null'
      ]

      if (!fileExistsSync(this.settings.sshfsBinary)) {
        reject(new Error(`SSHFS binary not found at "${this.settings.sshfsBinary}". Check your settings`)); return
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
          ...[
            '-oidmap=user',
            '-ouid=-1',
            '-ogid=-1',
            '-oumask=000',
            '-ocreate_umask=000',
            '-omax_readahead=1GB',
            '-oallow_other',
            '-olarge_read',
            '-okernel_cache',
            '-ofollow_symlinks'
          ]
        ]
      }

      if (conn.advanced.reconnect && (!conn.advanced.customCmdlOptionsEnabled && !conn.advanced.customCmdlOptions.includes('-oreconnect'))) {
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
        cmdArgs.push(`-oIdentityFile="${conn.keyFile.replace(/\\/g, '/')}"`)
      }

      if (conn.authType === 'key-file-passphrase') {
        cmdArgs.push('-oPreferredAuthentications=publickey')
        cmdArgs.push(`-oIdentityFile="${conn.keyFile.replace(/\\/g, '/')}"`)
        cmdArgs.push('-oBatchMode=no')
      }

      if (conn.authType === 'key-file-interactive') {
        cmdArgs.push('-oPreferredAuthentications=publickey\\,keyboard-interactive')
        cmdArgs.push('-oPasswordAuthentication=no')
        cmdArgs.push('-oKbdInteractiveAuthentication=yes')
        cmdArgs.push('-oChallengeResponseAuthentication=yes')
        cmdArgs.push(`-oIdentityFile="${conn.keyFile.replace(/\\/g, '/')}"`)
        cmdArgs.push('-oBatchMode=no')
      }

      if (conn.authType === 'key-file-passphrase-interactive') {
        cmdArgs.push('-oPreferredAuthentications=publickey\\,keyboard-interactive')
        cmdArgs.push('-oPasswordAuthentication=no')
        cmdArgs.push('-oKbdInteractiveAuthentication=yes')
        cmdArgs.push('-oChallengeResponseAuthentication=yes')
        cmdArgs.push(`-oIdentityFile="${conn.keyFile.replace(/\\/g, '/')}"`)
        cmdArgs.push('-oBatchMode=no')
      }

      console.log('-'.repeat(80))
      console.log('date:', new Date().toISOString())
      console.log('conn:', `{${conn.uuid}}`, `(${conn.name})`)
      console.log('conntype:', conn.authType)
      console.log('cmd:', `"${this.settings.sshfsBinary}" ${cmdArgs.join(' ')}`)

      const askpass = this.createAskpassScript(conn)

      const childProcess = spawn(this.settings.sshfsBinary, cmdArgs, {
        env: {
          ...globalThis.process.env,
          PATH: `${dirname(this.settings.sshfsBinary)};${globalThis.process.env.PATH || ''}`,
          ...(askpass
            ? {
              DISPLAY: 'sshfs-win-manager',
              SSH_ASKPASS: askpass.scriptPath,
              SSH_ASKPASS_REQUIRE: 'force',
              SSHFS_WIN_ASKPASS_STATE: askpass.statePath,
              ...this.getAskpassResponseEnv(conn)
            }
            : {})
        }
      })

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

      childProcess.on('close', exitCode => {
        if (!connectionFinalized) {
          console.log(`{${conn.uuid}}`, 'exit:', exitCode)
        }

        connectionFinalized = true

        if (debugOutput.includes('no such identity')) {
          reject(new Error('Private key not found: ' + conn.keyFile))
        }

        if (debugOutput.includes('mount point in use')) {
          reject(new Error('Mount point in use'))
        }

        if (debugOutput.includes('Permission denied')) {
          if (conn.authType === 'key-file' || conn.authType === 'key-file-passphrase' || conn.authType === 'key-file-interactive' || conn.authType === 'key-file-passphrase-interactive') {
            reject(new Error('Invalid user name, private key or key passphrase'))
          } else {
            reject(new Error('Invalid user name or password'))
          }
        }

        if (debugOutput.includes('Permission denied') && conn.authType !== 'key-file' && conn.authType !== 'key-file-passphrase' && conn.authType !== 'key-file-interactive' && conn.authType !== 'key-file-passphrase-interactive') {
          reject(new Error('Invalid user name or password'))
        }

        reject(new Error(lastDebugMessage))
      })

      childProcess.on('close', () => {
        if (askpass) {
          askpass.paths.forEach(filePath => {
            try {
              unlinkSync(filePath)
            } catch {}
          })
        }
      })
    })
  }

  createAskpassScript (conn) {
    if (conn.authType !== 'interactive' && conn.authType !== 'key-file-passphrase' && conn.authType !== 'key-file-interactive' && conn.authType !== 'key-file-passphrase-interactive') {
      return null
    }

    const scriptPath = join(tmpdir(), `sshfs-win-manager-askpass-${conn.uuid}.cmd`)
    const psScriptPath = join(tmpdir(), `sshfs-win-manager-askpass-${conn.uuid}.ps1`)
    const statePath = join(tmpdir(), `sshfs-win-manager-askpass-${conn.uuid}.state`)

    writeFileSync(
      scriptPath,
      `@echo off\r\npowershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${psScriptPath}"\r\n`,
      'utf8'
    )

    writeFileSync(
      psScriptPath,
      [
        '$statePath = $env:SSHFS_WIN_ASKPASS_STATE',
        '$index = 0',
        'if ($statePath -and (Test-Path $statePath)) {',
        '  $raw = Get-Content -Path $statePath -ErrorAction SilentlyContinue',
        '  if ($raw -match "^\\d+$") { $index = [int]$raw }',
        '}',
        '$responses = @($env:SSHFS_WIN_ASKPASS_RESPONSE_0, $env:SSHFS_WIN_ASKPASS_RESPONSE_1, $env:SSHFS_WIN_ASKPASS_RESPONSE_2)',
        '$responseCount = [int]($env:SSHFS_WIN_ASKPASS_RESPONSE_COUNT)',
        'if ($responseCount -le 0) { exit 0 }',
        'if ($index -ge $responseCount) { $index = $responseCount - 1 }',
        '[Console]::Out.Write($responses[$index])',
        'if ($statePath) { Set-Content -Path $statePath -Value ($index + 1) -NoNewline }'
      ].join('\r\n'),
      'utf8'
    )

    writeFileSync(statePath, '0', 'utf8')

    return {
      scriptPath,
      statePath,
      paths: [scriptPath, psScriptPath, statePath]
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

    return output.includes('service sshfs has been started') ||
      (
        output.includes('authentication succeeded') &&
        (output.includes('remote_uid =') || output.includes('server version:'))
      )
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

  terminate (pid) {
    return new Promise(resolve => {
      exec(`taskkill /PID ${pid} /T /F`, () => {
        resolve()
      })
    })
  }

  exists (pid) {
    return new Promise(resolve => {
      exec(`tasklist /FI "PID eq ${pid}"`, (err, stdout) => {
        if (!err) {
          if (stdout.toString().includes(pid)) {
            resolve(true)
          } else {
            resolve(false)
          }
        } else {
          resolve(false)
        }
      })
    })
  }

  getChildProcessPid (parentPid) {
    return new Promise((resolve, reject) => {
      exec(`wmic process where '(name="sshfs.exe" and parentprocessid=${parentPid})' get processid /value`, (err, stdout) => {
        if (!err) {
          resolve(parseInt(stdout.toString().trim().split('=')[1]))
        } else {
          reject(new Error('Process not found'))
        }
      })
    })
  }

  getLastSpawnedProcess () {
    return new Promise((resolve, reject) => {
      exec(`wmic process where '(name="sshfs.exe")' get processid, creationdate /value`, (err, stdout) => {
        if (!err) {
          let data = stdout.toString().trim().split('\n')
          let pid = null
          let creationDate = null

          data.forEach(item => {
            let itemParts = item.split('=')

            let key = itemParts[0].trim().toLowerCase()
            let value = itemParts[1].trim().toLowerCase()

            if (key === 'processid') {
              pid = parseInt(value)
            }

            if (key === 'creationdate') {
              let year = parseInt(value.substr(0, 4))
              let month = parseInt(value.substr(4, 2)) - 1
              let day = parseInt(value.substr(6, 2))
              let hours = parseInt(value.substr(8, 2))
              let minutes = parseInt(value.substr(10, 2))
              let seconds = parseInt(value.substr(13, 2))

              creationDate = new Date(year, month, day, hours, minutes, seconds)
            }
          })

          resolve({ pid, creationDate })
        } else {
          reject(new Error('Process not found'))
        }
      })
    })
  }

  getFirstAvailableDriveLetter (preferredMountPoint = null) {
    return new Promise((resolve, reject) => {
      exec(`wmic logicaldisk get name`, (err, stdout) => {
        const driveLetters = 'DEFGHIJKLMNOPQRSTUVWXYZ'.split('')

        if (!err) {
          const drivers = stdout.toString().trim().split('\n').slice(1)
            .map(i => i.substr(0, 1).toUpperCase())
          const availableDriveLetters = driveLetters.filter(i => !drivers.includes(i))

          if (preferredMountPoint && availableDriveLetters.includes(preferredMountPoint.substr(0, 1))) {
            resolve(preferredMountPoint)
          } else {
            resolve(availableDriveLetters[0] + ':')
          }
        } else {
          reject(new Error('Process not found'))
        }
      })
    })
  }
}

export default ProcessHandlerWin
