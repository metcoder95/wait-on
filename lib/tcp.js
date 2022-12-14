'use strict'
const net = require('node:net')

/**
 * @param {import('..').WaitOnOptions} config
 * @param {string} resource
 * @return {Promise<{ successfull: boolean, reason: string }>}
 */
function createTCPResource (config, resource) {
  const { tcp: { timeout = 30000 } = { timeout: 30000 } } = config
  const { port, href, hostname: host } = new URL(resource)

  return {
    exec,
    name: href
  }

  function exec (signal) {
    let res
    const operation = {
      successfull: false,
      reason: 'unknown'
    }
    const promise = new Promise(resolve => {
      res = resolve
    })
    const start = Date.now()

    const socket = new net.Socket({
      signal
    })

    socket.setKeepAlive(false)
    socket.setTimeout(timeout)

    socket.on('error', err => {
      const duration = Date.now() - start
      operation.reason = `TCP connection failed for ${href} - duration ${duration}ms - ${err.message}`

      if (!socket.destroyed) {
        socket.end()
        socket.destroy()
      }

      res(operation)
    })

    socket.once('timeout', () => {
      const duration = Date.now() - start
      operation.reason = `TCP connection timed out for ${href} - duration ${duration}ms`

      if (!socket.destroyed) {
        socket.end()
        socket.destroy()
      }

      res(operation)
    })

    socket.connect({ host, port }, () => {
      const duration = Date.now() - start
      operation.successfull = true
      operation.reason = `TCP connection established for ${href} - duration ${duration}ms`

      socket.end()
      socket.destroy()

      res(operation)
    })

    return promise
  }
}

module.exports = {
  createTCPResource
}
