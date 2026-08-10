const runtimeConnectionFields = new Set(['status', 'pid'])
const runtimeConnectionStatuses = new Set(['disconnected', 'connecting', 'connected', 'disconnecting'])

function toPersistedConnection (connection = {}) {
  return Object.fromEntries(
    Object.entries(connection).filter(([key]) => !runtimeConnectionFields.has(key))
  )
}

function toPersistedConnections (connections = []) {
  return connections.map(toPersistedConnection)
}

function createPersistedState (state = {}) {
  const data = state.Data || {}

  return {
    ...state,
    Data: {
      ...data,
      connections: toPersistedConnections(Array.isArray(data.connections) ? data.connections : [])
    }
  }
}

function createRuntimeConnection (connection = {}, currentConnection = null) {
  const currentStatus = currentConnection && runtimeConnectionStatuses.has(currentConnection.status)
    ? currentConnection.status
    : 'disconnected'
  const currentPid = currentConnection && Number.isInteger(currentConnection.pid) && currentConnection.pid > 0
    ? currentConnection.pid
    : null

  return {
    ...toPersistedConnection(connection),
    status: currentStatus,
    pid: currentPid
  }
}

function hydratePersistedConnections (connections = [], currentConnections = []) {
  const currentConnectionsByUuid = new Map(
    currentConnections.map(connection => [connection.uuid, connection])
  )

  return connections.map(connection => createRuntimeConnection(
    connection,
    currentConnectionsByUuid.get(connection.uuid)
  ))
}

export {
  createPersistedState,
  createRuntimeConnection,
  hydratePersistedConnections,
  toPersistedConnection,
  toPersistedConnections
}
