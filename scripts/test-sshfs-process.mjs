import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/renderer/process/SshfsProcess.js', import.meta.url), 'utf8')
const processHelpers = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
const {
  matchesConnection,
  parseMacProcessArguments,
  parseSshfsArguments,
  parseWindowsCommandLine
} = processHelpers

const managedOptions = [
  '-odebug',
  '-ologlevel=debug1',
  '-oStrictHostKeyChecking=no',
  '-oUserKnownHostsFile=/dev/null'
]
const windowsCommand = [
  '"C:\\Program Files\\SSHFS-Win\\bin\\sshfs.exe"',
  'user@[2001:db8::1]:/srv',
  'X:',
  '-p2222',
  ...managedOptions,
  '-oIdentityFile="C:/Keys/my key"'
].join(' ')
const windowsArgs = parseWindowsCommandLine(windowsCommand)

assert.equal(windowsArgs[0], 'C:\\Program Files\\SSHFS-Win\\bin\\sshfs.exe')
assert.equal(windowsArgs.at(-1), '-oIdentityFile=C:/Keys/my key')

const runningMount = parseSshfsArguments(42, windowsArgs.slice(1))

assert.deepEqual(
  {
    user: runningMount.user,
    host: runningMount.host,
    folder: runningMount.folder,
    mountPoint: runningMount.mountPoint,
    port: runningMount.port
  },
  {
    user: 'user',
    host: '2001:db8::1',
    folder: '/srv',
    mountPoint: 'X:',
    port: 2222
  }
)
assert.equal(matchesConnection({
  user: 'user',
  host: '[2001:DB8::1]',
  folder: '/srv/',
  port: '2222'
}, 'x:\\', runningMount, 'win32'), true)
assert.equal(matchesConnection({
  user: 'user',
  host: '2001:db8::1',
  folder: '/srv',
  port: 22
}, 'X:', runningMount, 'win32'), false)

// A manually launched SSHFS process without the app's option signature must
// never be adopted, even if its remote target happens to match a connection.
assert.equal(parseSshfsArguments(43, ['user@host:/srv', 'Y:', '-p22']), null)
assert.equal(parseSshfsArguments(44, [
  'user@host:/srv',
  'Y:',
  '-p22',
  '-oPort=2222',
  ...managedOptions
]), null)

const macArguments = ['/opt/homebrew/bin/sshfs', 'user@host:/srv', '/Volumes/My Mount']
const macHeader = Buffer.alloc(4)

macHeader.writeInt32LE(macArguments.length)

const macBuffer = Buffer.concat([
  macHeader,
  Buffer.from(`/opt/homebrew/bin/sshfs\0\0${macArguments.join('\0')}\0`)
])

assert.deepEqual(parseMacProcessArguments(macBuffer), macArguments)

console.log('SSHFS process parser tests: OK')
