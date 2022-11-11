'use strict'
const { Agent, ProxyAgent, request } = require('undici')

const HTTP_GET_RE = /^https?-get:/
const HTTP_UNIX_RE = /^http:\/\/unix:([^:]+):([^:]+)$/

function getHTTPAgent (config, resource) {
  const {
    followRedirect,
    maxRedirections,
    timeout,
    http: { bodyTimeout, headersTimeout },
    proxy,
    strictSSL: rejectUnauthorized
  } = config
  const isProxied = proxy != null
  const url = resource.replace('-get:', ':')
  // http://unix:/sock:/url
  const matchHttpUnixSocket = HTTP_UNIX_RE.exec(url)
  const socketPath = matchHttpUnixSocket != null ? matchHttpUnixSocket[1] : null

  const httpOptions = {
    maxRedirections: followRedirect != null ? maxRedirections : 0,
    bodyTimeout: Math.min(bodyTimeout, timeout),
    headersTimeout: Math.min(headersTimeout, timeout),
    connections: 1, // Single agent per resource
    pipelining: 0, // to disable keep-alive
    connect: {
      timeout,
      socketPath,
      rejectUnauthorized
    }
  }

  return isProxied
    ? new ProxyAgent(Object.assign({}, httpOptions, proxy))
    : new Agent(httpOptions)
}

function createHTTPResource (config, resource) {
  const agent = getHTTPAgent(config, resource)
  const method = HTTP_GET_RE.test(resource) ? 'get' : 'head'
  const url = resource.replace('-get:', ':')

  return {
    exec
  }

  async function exec () {
    const start = Date.now()
    const operation = {
      successfull: false,
      reason: 'unknown'
    }
    try {
      // TODO: implement small happy eyeballs algorithm for IPv4/IPv6 on localhost
      const { statusCode, body } = await request(url, { method, agent })
      const duration = Date.now() - start

      // We allow data to flow without worrying about it
      body.resume()

      // TODO: add support allow range of status codes
      operation.successfull = statusCode >= 200 && statusCode < 500
      operation.reason = `HTTP(s) request for ${method}-${resource} replied with code ${statusCode} - duration ${duration}`
    } catch (e) {
      operation.reason = `HTTP(s) request for ${method}-${resource} errored: ${
        e.message
      } - duration ${Date.now() - start}`
    }

    return operation
  }
}

module.exports = {
  createHTTPResource
}
