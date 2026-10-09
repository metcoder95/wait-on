'use strict'
const { Client, ProxyAgent, interceptors } = require('undici')

const HTTP_GET_RE = /^https?-get:/
const HTTP_UNIX_RE = /^http:\/\/unix:([^:]+):([^:]+)$/

/**
 * @param {import('..').WaitOnOptions} config
 * @param {string} resource
 * @return {import('undici').ProxyAgent | import('undici').Agent}
 */
function getHTTPAgent (config, href) {
  const {
    timeout,
    http: {
      bodyTimeout,
      headersTimeout,
      followRedirect,
      maxRedirections,
      rejectUnauthorized,
      happyEyeballs
    } = {},
    proxy
  } = config
  const isProxied = proxy != null
  // http://unix:/sock:/url
  const matchHttpUnixSocket = HTTP_UNIX_RE.exec(href)
  const socketPath = matchHttpUnixSocket != null ? matchHttpUnixSocket[1] : null

  /** @type {import('undici').Agent.Options} */
  const httpOptions = {
    maxRedirections: followRedirect != null ? maxRedirections : 0,
    bodyTimeout,
    headersTimeout,
    connections: 1, // Single connection per resource
    pipelining: 0, // to disable keep-alive
    autoSelectFamily: happyEyeballs != null ? happyEyeballs : true,
    connect: {
      timeout,
      socketPath,
      rejectUnauthorized
    }
  }

  return isProxied
    ? new ProxyAgent(Object.assign({}, httpOptions, proxy))
    : new Client(href, httpOptions).compose(interceptors.dump())
}

/**
 * @param {import('..').WaitOnOptions} config
 * @param {string} resource
 * @return {Promise<{ successfull: boolean, reason: string }>}
 */
function createHTTPResource (config, resource) {
  const source = new URL(resource)
  const dispatcher = getHTTPAgent(config, resource)
  /** @type { import('..').WaitOnOptions } */
  const { http: httpConfig } = config
  const method = HTTP_GET_RE.test(resource) ? 'GET' : 'HEAD'
  const href = source.href.replace('-get:', ':')
  const isStatusValid = httpConfig?.validateStatus
  const url = new URL(href)
  const handler = {
    dispatcher,
    options: {
      path: url.pathname,
      origin: url.origin,
      query: url.search,
      method,
      signal: null,
      headers: httpConfig?.headers
    }
  }

  return {
    exec,
    name: resource
  }

  async function exec (signal) {
    const start = Date.now()
    const operation = {
      successfull: false,
      reason: 'unknown'
    }

    handler.options.signal = signal

    try {
      const { options, dispatcher } = handler
      const { statusCode } = await dispatcher.request(options)
      const duration = Date.now() - start

      operation.successfull =
        isStatusValid != null
          ? isStatusValid(statusCode)
          : statusCode > 199 && statusCode < 500
      operation.reason = `HTTP(s) request for ${method}-${resource} replied with code ${statusCode} - duration ${duration}ms`
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
