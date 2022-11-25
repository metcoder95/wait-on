'use strict'
const net = require('node:net')
const { join } = require('node:path')

// TODO: add config for socke timeout
function createSocketResource (_, resource) {
  const { href, host, pathname } = new URL(resource)
  const path = join(host, pathname)

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
      path,
      signal
    })

    socket.once('connect', () => {
      const duration = Date.now() - start
      operation.successfull = true
      operation.reason = `Socket connection established for ${href} - duration ${duration}ms`

      socket.destroy()
      res(operation)
    })

    socket.on('error', err => {
      const duration = Date.now() - start
      operation.reason = `Socket connection failed for ${href} - duration ${duration}ms - ${err.message}`

      socket.destroy()
      res(operation)
    })

    socket.once('timeout', () => {
      const duration = Date.now() - start
      operation.reason = `Socket connection timed out for ${href} - duration ${duration}ms`

      socket.destroy()
      res(operation)
    })

    return promise
  }
}

module.exports = {
  createSocketResource
}
