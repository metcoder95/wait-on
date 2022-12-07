'use strict'
const { Agent, ProxyAgent, request } = require('undici')

const HTTP_GET_RE = /^https?-get:/
const HTTP_UNIX_RE = /^http:\/\/unix:([^:]+):([^:]+)$/

function getHTTPAgent (config, href) {
  const {
    timeout,
    http: {
      bodyTimeout,
      headersTimeout,
      followRedirect,
      maxRedirections,
      rejectUnauthorized
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
  /** @type { import('..').WaitOnOptions } */
  const { http: httpConfig } = config
  const method = HTTP_GET_RE.test(resource) ? 'GET' : 'HEAD'
  const href = source.href.replace('-get:', ':')
  const isStatusValid = httpConfig?.validateStatus
  // TODO: this will last as long as happy-eyeballs is not implemented
  // within node core
  /** @type {{ options: import('undici').Dispatcher.RequestOptions, url: URL }} */
  const primary = {
    options: null,
    url: null
  }
  /** @type {{ options?: import('undici').Dispatcher.RequestOptions, url?: URL }} */
  const secondary = {
    options: null,
    url: null
  }

  if (href.includes('localhost')) {
    primary.url = new URL(href.replace('localhost', '127.0.0.1'))

    secondary.url = new URL(href.replace('localhost', '[::1]'))
    secondary.options = {
      path: secondary.url.pathname,
      origin: secondary.url.origin,
      query: secondary.url.search,
      method,
      dispatcher,
      signal: null,
      headers: httpConfig?.headers
    }
  } else {
    primary.url = new URL(href)
  }

  primary.options = {
    path: primary.url.pathname,
    origin: primary.url.origin,
    query: primary.url.search,
    method,
    dispatcher,
    signal: null,
    headers: httpConfig?.headers
  }

  return {
    exec,
    name: resource
  }

  async function exec (
    signal,
    handler = primary,
    handlerSecondary = secondary,
    isSecondary = false
  ) {
    const start = Date.now()
    const operation = {
      successfull: false,
      reason: 'unknown'
    }

    handler.options.signal = signal

    if (handlerSecondary.options != null) {
      handlerSecondary.options.signal = signal
    }

    try {
      const options = isSecondary ? handlerSecondary.options : handler.options
      const { statusCode, body } = await request(options)
      const duration = Date.now() - start

      // We allow data to flow without worrying about it
      body.resume()

      // TODO: add support allow range of status codes
      operation.successfull =
        isStatusValid != null
          ? isStatusValid(statusCode)
          : statusCode >= 200 && statusCode < 500
      operation.reason = `HTTP(s) request for ${method}-${resource} replied with code ${statusCode} - duration ${duration}ms`
    } catch (e) {
      if (!isSecondary && handlerSecondary.url != null) {
        return exec(signal, handler, handlerSecondary, true)
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
