function ErrorFactory (code = '') {
  return class WaitOnError {
    constructor (message = '', resource = '') {
      this.code = code
      this.message = message
      this.resource = resource
    }

    [Symbol.toStringTag] () {
      return this.resource
        ? `${this.code}: ${this.resource} - ${this.message}`
        : `${this.code}: ${this.message}`
    }
  }
}

module.exports = {
  // Wait-On
  WAIT_ON_TIMEDOUT: ErrorFactory('WAIT_ON_TIMEDOUT'),

  // Resources
  WAIT_ON_RESOURCE_ABORTED: ErrorFactory('WAIT_ON_RESOURCE_ABORTED')
}
