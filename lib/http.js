'use strict'
const { Agent, ProxyAgent, request } = require('undici')

const HTTP_GET_RE = /^https?-get:/
const HTTP_UNIX_RE = /^http:\/\/unix:([^:]+):([^:]+)$/

function getHTTPAgent (config, href) {
  const {
    timeout,
    http: { bodyTimeout, headersTimeout, followRedirect, maxRedirections } = {},
    proxy,
    strictSSL: rejectUnauthorized
  } = config
  const isProxied = proxy != null
  // http://unix:/sock:/url
  const matchHttpUnixSocket = HTTP_UNIX_RE.exec(href)
  const socketPath = matchHttpUnixSocket != null ? matchHttpUnixSocket[1] : null

  const httpOptions = {
    maxRedirections: followRedirect != null ? maxRedirections : 0,
    bodyTimeout,
    headersTimeout,
    connections: 1, // Single connection per resource
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
  const source = new URL(resource)
  const dispatcher = getHTTPAgent(config, resource)
  const {
    http: { headers }
  } = config
  const method = HTTP_GET_RE.test(resource) ? 'get' : 'head'
  const href = source.href.replace('-get:', ':')
  // TODO: this will last as long as happy-eyeballs is not implemented
  // within node core
  /** @type {URL} */
  let primaryURL
  /** @type {URL} */
  let secondaryURL

  if (href.includes('localhost')) {
    primaryURL = new URL(href.replace('localhost', '127.0.0.1'))
    secondaryURL = new URL(href.replace('localhost', '[::1]'))
  } else {
    primaryURL = new URL(href)
  }

  return {
    exec,
    name: resource
  }

  async function exec (signal, urlResource = primaryURL, isSecondary = false) {
    const start = Date.now()
    const operation = {
      successfull: false,
      reason: 'unknown'
    }

    try {
      const { statusCode, body } = await request(urlResource.href, {
        method,
        dispatcher,
        signal,
        headers
      })

      const duration = Date.now() - start

      // We allow data to flow without worrying about it
      body.resume()

      // TODO: add support allow range of status codes
      operation.successfull = statusCode >= 200 && statusCode < 500
      operation.reason = `HTTP(s) request for ${method}-${resource} replied with code ${statusCode} - duration ${duration}ms`
    } catch (e) {
      if (!isSecondary && secondaryURL != null) {
        return exec(signal, secondaryURL, true)
      }

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
