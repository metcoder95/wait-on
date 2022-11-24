'use strict'

const fs = require('node:fs')
const { promisify } = require('node:util')
const { once } = require('node:events')
const { setTimeout } = require('node:timers/promises')

const { AsyncPool } = require('@metcoder95/tiny-pool')

const {
  validateHooks,
  validateOptions,
  parseAjvError,
  parseAjvErrors
} = require('./lib/validate')
const { createHTTPResource } = require('./lib/http')
const { createTCPResource } = require('./lib/tcp')

const fstat = promisify(fs.stat)
// const PREFIX_RE = /^((https?-get|https?|tcp|socket|file):)(.+)$/

/**
   Waits for resources to become available before calling callback

   Polls file, http(s), tcp ports, sockets for availability.

   Resource types are distinquished by their prefix with default being `file:`
   - file:/path/to/file - waits for file to be available and size to stabilize
   - http://foo.com:8000/bar verifies HTTP HEAD request returns 2XX
   - https://my.bar.com/cat verifies HTTPS HEAD request returns 2XX
   - http-get:  - HTTP GET returns 2XX response. ex: http://m.com:90/foo
   - https-get: - HTTPS GET returns 2XX response. ex: https://my/bar
   - tcp:my.server.com:3000 verifies a service is listening on port
   - socket:/path/sock verifies a service is listening on (UDS) socket
     For http over socket, use http://unix:SOCK_PATH:URL_PATH
                    like http://unix:/path/to/sock:/foo/bar or
                         http-get://unix:/path/to/sock:/foo/bar

   @param opts object configuring waitOn
   @param opts.resources array of string resources to wait for. prefix determines the type of resource with the default type of `file:`
   @param opts.delay integer - optional initial delay in ms, default 0
   @param opts.httpTimeout integer - optional http HEAD/GET timeout to wait for request, default 0
   @param opts.interval integer - optional poll resource interval in ms, default 250ms
   @param opts.log boolean - optional flag to turn on logging to stdout
   @param opts.reverse boolean - optional flag which reverses the mode, succeeds when resources are not available
   @param opts.simultaneous integer - optional limit of concurrent connections to a resource, default Infinity
   @param opts.tcpTimeout - Maximum time in ms for tcp connect, default 300ms
   @param opts.timeout integer - optional timeout in ms, default Infinity. Aborts with error.
   @param opts.verbose boolean - optional flag to turn on debug log
   @param opts.window integer - optional stabilization time in ms, default 750ms. Waits this amount of time for file sizes to stabilize or other resource availability to remain unchanged. If less than interval then will be reset to interval
   @param cb optional callback function with signature cb(err) - if err is provided then, resource checks did not succeed
   if not specified, wait-on will return a promise that will be rejected if resource checks did not succeed or resolved otherwise
 */
function WaitOn (opts, cb) {
  if (cb != null && cb.constructor.name === 'Function') {
    waitOnImpl(opts).then(cb, cb)
  } else {
    return waitOnImpl(opts)
  }
}

async function waitOnImpl (opts) {
  // TODO: deepclone instead of shallow
  const waitOnOptions = Object.assign({}, opts)
  const validResult = validateOptions(waitOnOptions)
  if (!validResult) {
    const parsedError = parseAjvErrors(validateOptions.errors)
    throw new Error(`Invalid options: ${parsedError}`)
  }

  // window needs to be at least interval
  if (waitOnOptions.window < waitOnOptions.interval) {
    waitOnOptions.window = waitOnOptions.interval
  }

  // Validate hooks
  if (waitOnOptions.hooks != null) {
    const areHooksInvalid = validateHooks(waitOnOptions.hooks)
    if (areHooksInvalid != null) {
      const parsedError = parseAjvError(areHooksInvalid)
      throw new Error(`Invalid hook: ${parsedError}`)
    }
  }

  const {
    resources: incomingResources,
    timeout,
    simultaneous,
    events
  } = waitOnOptions
  const resources = []
  const invalidResources = []

  for (const resource of incomingResources) {
    const parsedResource = createResource(waitOnOptions, resource)
    if (parsedResource != null) {
      resources.push(parsedResource)
    } else {
      invalidResources.push(resource)
    }
  }

  if (invalidResources.length > 0 && events?.onInvalidResource != null) {
    for (const resource of invalidResources) {
      events.onInvalidResource(resource)
    }
  }

  if (resources.length === 0) {
    throw new Error(`No valid resources provided - ${resources.join(', ')}`)
  }

  const pool = new AsyncPool({
    maxConcurrent: simultaneous,
    maxEnqueued: resources.length * 2
  })
  const controller = new AbortController()
  const timerController = new AbortController()
  const globalState = new Map()

  if (waitOnOptions.delay != null && waitOnOptions.delay > 0) {
    await setTimeout(waitOnOptions.delay)
  }

  for (const resource of resources) {
    const { onResponse, onError } = handleResponse({
      resource,
      pool,
      waitOnOptions,
      signal: controller.signal,
      state: globalState
    })

    const promise = pool.run(resource.exec.bind(null, controller.signal))
    promise.then(onResponse, onError)
  }

  const timer = timedout(timeout, controller, timerController.signal)

  let success
  while (success == null) {
    let unfinished = false
    // Serves as checkpoint to validate the status of all resources
    const result = await Promise.race([once(pool, 'idle'), timer])
    // If the `once` function returns an array when the event is emitted, then
    // the pool is idle, otherwise the timer has expired
    const timedout = Array.isArray(result) ? false : result

    for (const [, state] of globalState) {
      if (!state) {
        unfinished = true
        break
      }
    }

    if (unfinished && !timedout) {
      continue
    } else {
      timerController.abort()
      success = !timedout
      break
    }
  }

  return success
}

async function timedout (timeout, controller, signal) {
  const timed = await setTimeout(timeout, true, {
    signal
  })

  process.nextTick(() => controller.abort())

  return timed
}

function handleResponse ({ resource, pool, signal, waitOnOptions, state }) {
  const { interval, events, reverse } = waitOnOptions

  state.set(resource.name, false)

  return {
    onError,
    onResponse
  }

  function onResponse ({ successfull, reason }) {
    // All done
    if ((reverse && !successfull) || (!reverse && successfull)) {
      events?.onResourceDone?.(resource.name)
      state.set(resource.name, true)

      return
    }

    events?.onResourceResponse?.(resource.name, reason)

    if (signal.aborted) {
      events?.onResourceError?.(resource.name, new Error('Request timed out'))
      state.set(resource.name, true)

      return
    }

    if (signal.aborted) {
      events?.onResourceTimeout?.(resource.name, new Error('Request timed out'))
      state.set(resource.name, true)

      return
    }

    return setTimeout(interval)
      .then(() => pool.run(resource.exec.bind(null, signal)))
      .then(onResponse, onError)
  }

  function onError (err) {
    if (signal.aborted) {
      events?.onResourceTimeout?.(resource.name, new Error('Request timed out'))
      state.set(resource.name, true)

      return
    }

    events?.onResourceError?.(resource.name, err)
  }
}

function createResource (deps, resource) {
  const protocol = new URL(resource).protocol
  switch (protocol) {
    case 'https-get:':
    case 'http-get:':
    case 'https:':
    case 'http:':
      return createHTTPResource(deps, resource)
    case 'tcp:':
      return createTCPResource(deps, resource)
    // case 'socket:':
    //   return createSocket$(deps, resource)
    // default:
    //   return createFileResource$(deps, resource)
    default:
      return null
  }
}

// async function getFileSize (filePath) {
//   try {
//     const { size } = await fstat(filePath)
//     return size
//   } catch (err) {
//     return -1
//   }
// }

// Add support for multiple export combos
module.exports = WaitOn
module.exports.WaitOn = WaitOn
module.exports.default = WaitOn
