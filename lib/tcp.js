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
  const primary = {
    host: '',
    port: 0
  }
  const secondary = {
    host: '',
    port: 0
  }

  if (href.includes('localhost')) {
    // IPv4
    primary.host = '127.0.0.1'
    primary.port = port

    // IPv6
    secondary.host = '[::1]'
    secondary.port = port
  } else {
    primary.host = host
    primary.port = port
  }

  return {
    exec,
    name: href
  }

  function exec (signal, handler = primary, handlerSecondary = secondary, isSecondary = false) {
    let res
    const operation = {
      successfull: false,
      reason: 'unknown'
    }
    const promise = new Promise(resolve => {
      res = resolve
    })
    const start = Date.now()
    const socketSettings = isSecondary ? handlerSecondary : handler

    const socket = new net.Socket({
      signal
    })

    socket.setKeepAlive(false)
    socket.setTimeout(timeout)

    socket.once('error', err => {
      const duration = Date.now() - start
      operation.reason = `TCP connection failed for ${href} - duration ${duration}ms - ${err.message}`

      if (!socket.destroyed) {
        socket.end()
        socket.destroy()
      }

      if (!isSecondary && handlerSecondary.host && !operation.successfull) {
        exec(signal, handler, handlerSecondary, true).then(res)
      } else {
        res(operation)
      }
    })

    socket.once('timeout', () => {
      const duration = Date.now() - start
      operation.reason = `TCP connection timed out for ${href} - duration ${duration}ms`

      if (!socket.destroyed) {
        socket.end()
        socket.destroy()
      }

      if (!isSecondary && handlerSecondary.host && !operation.successfull) {
        exec(signal, handler, handlerSecondary, true).then(res)
      } else {
        res(operation)
      }
    })

    socket.connect(socketSettings, () => {
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
