'use strict'
const net = require('node:net')

function createTCPResource (config, resource) {
  const { tcpTimeout } = config
  const { port, href, hostname: host, pathname: path } = new URL(resource)

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
    const socket = net.connect({
      host,
      port,
      signal,
      path,
      keepAlive: false,
      timeout: tcpTimeout
    })

    socket.once('connect', () => {
      const duration = Date.now() - start
      operation.successfull = true
      operation.reason = `TCP connection established for ${href} - duration ${duration}ms`

      socket.destroy()
      res(operation)
    })

    socket.on('error', err => {
      const duration = Date.now() - start
      operation.reason = `TCP connection failed for ${href} - duration ${duration}ms - ${err.message}`

      socket.destroy()
      res(operation)
    })

    socket.once('timeout', () => {
      const duration = Date.now() - start
      operation.reason = `TCP connection timed out for ${href} - duration ${duration}ms`

      socket.destroy()
      res(operation)
    })

    return promise
  }
}

module.exports = {
  createTCPResource
}
