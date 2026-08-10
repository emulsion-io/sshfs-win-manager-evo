const MANAGED_OPTIONS = [
  '-odebug',
  '-ologlevel=debug1',
  '-ostrictHostKeyChecking=no',
  '-ouserKnownHostsFile=/dev/null'
].map(option => option.toLowerCase())

function isSshfsExecutable (executable) {
  const name = String(executable || '').trim().replace(/\\/g, '/').split('/').pop().toLowerCase()

  return name === 'sshfs' || name === 'sshfs.exe'
}

function parseRemoteTarget (value) {
  const target = String(value || '')
  const separator = target.lastIndexOf('@')

  if (separator <= 0) {
    return null
  }

  const user = target.slice(0, separator)
  const remote = target.slice(separator + 1)
  let host
  let folder

  if (remote.startsWith('[')) {
    const closingBracket = remote.indexOf(']')

    if (closingBracket === -1 || remote[closingBracket + 1] !== ':') {
      return null
    }

    host = remote.slice(1, closingBracket)
    folder = remote.slice(closingBracket + 2)
  } else {
    const colon = remote.indexOf(':')

    if (colon <= 0) {
      return null
    }

    host = remote.slice(0, colon)
    folder = remote.slice(colon + 1)
  }

  if (!user || !host) {
    return null
  }

  return { user, host, folder }
}

function parsePort (args) {
  const ports = []

  for (let index = 2; index < args.length; index++) {
    const argument = String(args[index])
    let value

    if (/^-p\d+$/i.test(argument)) {
      value = argument.slice(2)
    } else if (argument === '-p' && /^\d+$/.test(String(args[index + 1] || ''))) {
      value = args[index + 1]
    } else {
      const match = argument.match(/^-oport=(\d+)$/i)
      value = match ? match[1] : null
    }

    if (value !== null) {
      const port = Number.parseInt(value, 10)

      if (port <= 0 || port > 65535) {
        return null
      }

      ports.push(port)
    }
  }

  const distinctPorts = [...new Set(ports)]

  return distinctPorts.length <= 1 ? (distinctPorts[0] || 22) : null
}

function hasManagedSignature (args) {
  const options = new Set(args.slice(2).map(argument => String(argument).toLowerCase()))

  return MANAGED_OPTIONS.every(option => options.has(option))
}

function parseSshfsArguments (pid, args) {
  if (!Number.isInteger(pid) || pid <= 0 || !Array.isArray(args) || args.length < 2 || !hasManagedSignature(args)) {
    return null
  }

  const target = parseRemoteTarget(args[0])
  const port = parsePort(args)

  if (!target || port === null || !String(args[1] || '').trim()) {
    return null
  }

  return {
    pid,
    ...target,
    mountPoint: String(args[1]),
    port
  }
}

function normalizeRemoteFolder (folder) {
  const normalized = String(folder || '').trim().replace(/\/{2,}/g, '/')

  return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized
}

function normalizeMountPoint (mountPoint, platform) {
  let normalized = String(mountPoint || '').trim()

  if (platform === 'win32') {
    normalized = normalized.replace(/\//g, '\\')

    if (/^[a-z]:\\?$/i.test(normalized)) {
      return normalized.slice(0, 2).toUpperCase()
    }

    return normalized.replace(/\\+$/, '').toLowerCase()
  }

  normalized = normalized.replace(/\/{2,}/g, '/')

  return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized
}

function matchesConnection (conn, mountPoint, runningMount, platform) {
  if (!conn || !runningMount || !mountPoint || mountPoint === 'auto') {
    return false
  }

  const configuredPort = Number.parseInt(conn.port, 10) || 22
  const configuredHost = String(conn.host || '').trim().replace(/^\[|\]$/g, '').toLowerCase()

  return String(conn.user || '') === runningMount.user &&
    configuredHost === String(runningMount.host || '').trim().toLowerCase() &&
    configuredPort === runningMount.port &&
    normalizeRemoteFolder(conn.folder) === normalizeRemoteFolder(runningMount.folder) &&
    normalizeMountPoint(mountPoint, platform) === normalizeMountPoint(runningMount.mountPoint, platform)
}

function parseWindowsCommandLine (commandLine) {
  const input = String(commandLine || '')
  const args = []
  let index = 0

  while (index < input.length) {
    while (/\s/.test(input[index] || '')) index++
    if (index >= input.length) break

    let argument = ''
    let quoted = false

    while (index < input.length) {
      let backslashes = 0

      while (input[index] === '\\') {
        backslashes++
        index++
      }

      if (input[index] === '"') {
        argument += '\\'.repeat(Math.floor(backslashes / 2))

        if (backslashes % 2 === 1) {
          argument += '"'
          index++
        } else if (quoted && input[index + 1] === '"') {
          argument += '"'
          index += 2
        } else {
          quoted = !quoted
          index++
        }

        continue
      }

      argument += '\\'.repeat(backslashes)

      if (index >= input.length || (!quoted && /\s/.test(input[index]))) {
        break
      }

      argument += input[index]
      index++
    }

    args.push(argument)
    while (/\s/.test(input[index] || '')) index++
  }

  return args
}

function parseMacProcessArguments (buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 5) {
    return []
  }

  const argumentCount = buffer.readInt32LE(0)
  let index = 4

  while (index < buffer.length && buffer[index] !== 0) index++
  while (index < buffer.length && buffer[index] === 0) index++

  const args = []

  while (index < buffer.length && args.length < argumentCount) {
    const end = buffer.indexOf(0, index)

    if (end === -1) break

    args.push(buffer.toString('utf8', index, end))
    index = end + 1
  }

  return args
}

export {
  isSshfsExecutable,
  matchesConnection,
  parseMacProcessArguments,
  parseSshfsArguments,
  parseWindowsCommandLine
}
