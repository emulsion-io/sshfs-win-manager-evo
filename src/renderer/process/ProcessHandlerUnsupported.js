class ProcessHandlerUnsupported {
  constructor (settings, platform) {
    this.settings = settings
    this.platform = platform
  }

  create () {
    return Promise.reject(new Error(`Unsupported platform: ${this.platform}`))
  }

  terminate () {
    return Promise.resolve()
  }

  exists () {
    return Promise.resolve(false)
  }

  getLastSpawnedProcess () {
    return Promise.reject(new Error(`Unsupported platform: ${this.platform}`))
  }
}

export default ProcessHandlerUnsupported
