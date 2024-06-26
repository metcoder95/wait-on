'use strict'
const { Socket } = require('node:net')
const { join } = require('node:path')

/**
 * @param {import('..').WaitOnOptions} config
 * @param {string} resource
 * @return {Promise<{ successfull: boolean, reason: string }>}
 */
function createSocketResource (config, resource) {
  const {
    // Default to half of the overall timeout
    socket: { timeout = 30000 } = { timeout: 30000 }
  } = config
  const { href, host, pathname } = new URL(resource)
  const path = join(host, pathname)
  /** @type {import('node:net').Socket} */
  let socket

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

    if (socket == null) {
      socket = new Socket({
        signal
      })

      socket.setTimeout(timeout)
      socket.setKeepAlive(false)
    }

    socket.once('connect', () => {
      const duration = Date.now() - start
      operation.successfull = true
      operation.reason = `Socket connection established for ${href} - duration ${duration}ms`

      if (!socket.destroyed) {
        socket.destroy()
      }

      res(operation)
    })

    socket.on('error', err => {
      const duration = Date.now() - start
      operation.reason = `Socket connection failed for ${href} - duration ${duration}ms - ${err.message}`

      if (!socket.destroyed) {
        socket.destroy()
      }
      res(operation)
    })

    socket.once('timeout', () => {
      const duration = Date.now() - start
      operation.reason = `Socket connection timed out for ${href} - duration ${duration}ms`

      if (!socket.destroyed) {
        socket.destroy()
      }
      res(operation)
    })

    socket.connect(path)

    return promise
  }
}

module.exports = {
  createSocketResource
}
