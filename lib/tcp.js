'use strict'
const net = require('node:net')

function createTCPResource (config, resource) {
  const { tcpTimeout } = config
  const { port, href, hostname: host } = new URL(resource)
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
      socket = new net.Socket({
        signal
      })

      socket.setKeepAlive(false)
      socket.setTimeout(tcpTimeout)
    }

    socket.on('error', err => {
      const duration = Date.now() - start
      operation.reason = `TCP connection failed for ${href} - duration ${duration}ms - ${err.message}`

      if (!socket.destroyed) {
        socket.destroy()
      }

      res(operation)
    })

    socket.once('timeout', () => {
      const duration = Date.now() - start
      operation.reason = `TCP connection timed out for ${href} - duration ${duration}ms`

      if (!socket.destroyed) {
        socket.destroy()
      }

      res(operation)
    })

    socket.connect({ host, port }, () => {
      const duration = Date.now() - start
      operation.successfull = true
      operation.reason = `TCP connection established for ${href} - duration ${duration}ms`

      socket.destroy()
      res(operation)
    })

    return promise
  }
}

module.exports = {
  createTCPResource
}
