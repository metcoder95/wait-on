'use strict'

const { once } = require('node:events')
const { setTimeout } = require('node:timers/promises')
const { join, isAbsolute } = require('node:path')

const { AsyncPool } = require('@metcoder95/tiny-pool')

const { clone } = require('./lib/utils')
const { WAIT_ON_RESOURCE_ABORTED, WAIT_ON_TIMEDOUT } = require('./lib/error')
const {
  validateOptions,
  validateHooks,
  parseAjvError,
  parseAjvErrors
} = require('./lib/validate')
const { createHTTPResource } = require('./lib/http')
const { createTCPResource } = require('./lib/tcp')
const { createSocketResource } = require('./lib/socket')
const { createFileResource } = require('./lib/file')

/**
 * @param {import(".").WaitOnOptions} opts
 * @param {(import(".").WaitOnCallback) | undefined} cb
 * @return {Promise<boolean> | void}
 */
function WaitOn (opts, cb) {
  if (cb != null && cb.constructor.name === 'Function') {
    waitOnImpl(opts).then(result => {
      cb(null, result)
    }, cb)
  } else {
    return waitOnImpl(opts)
  }
}

/**
 * @param {import(".").WaitOnOptions} opts
 * @return {boolean}
 */
async function waitOnImpl (opts) {
  /** @type {Required<import(".").WaitOnOptions>} */
  const waitOnOptions = clone(opts)
  const validResult = validateOptions(waitOnOptions)
  if (!validResult) {
    const parsedError = parseAjvErrors(validateOptions.errors)
    throw new Error(`Invalid options: ${parsedError}`)
  }

  // window needs to be at least interval
  if (waitOnOptions.window != null && waitOnOptions.window < waitOnOptions.interval) {
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
    any: atAnyResource,
    throwOnInvalidResource,
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
    if (throwOnInvalidResource) {
      throw new Error(`Invalid resources: ${invalidResources.join(', ')}`)
    }

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

    globalState.set(resource.name, false)

    const promise = pool.run(resource.exec.bind(null, controller.signal))
    promise.then(onResponse, onError).catch(onError)
  }

  const timer = timedout(timeout, controller, timerController.signal)

  let success
  let finished = false
  while (success == null) {
    // Serves as checkpoint to validate the status of all resources
    const result = await Promise.race([once(pool, 'idle'), timer])
    // If the `once` function returns an array when the event is emitted, then
    // the pool is idle, otherwise the timer has expired
    const timedout = Array.isArray(result) ? false : result

    // We do one more check of the global state in case
    // we exhausted the timer, otherwise the flow continues
    // as usual
    for (const [, done] of globalState) {
      if (atAnyResource && done) {
        success = true
        finished = true
        break
      } else if (!done && !atAnyResource) break
      else finished = true
    }

    if (success != null || finished || timedout) {
      timerController.abort()
      // In case there is any in-fly request
      controller.abort(new WAIT_ON_RESOURCE_ABORTED('Resource check aborted'))
      success = success ?? !timedout
      break
    }
  }

  return success
}

async function timedout (timeout, controller, signal) {
  const timed = await setTimeout(timeout, true, {
    signal
  })

  process.nextTick(() =>
    controller.abort(new WAIT_ON_TIMEDOUT('Resource check timedout'))
  )

  return timed
}

function handleResponse ({ resource, pool, signal, waitOnOptions, state }) {
  const { interval, events, reverse, window } = waitOnOptions
  const hasStabilityWindow = window != null && window > 0
  let isRunningStabilityWindow = false
  /** @type {boolean} */
  let isStable

  return {
    onError,
    onResponse
  }

  function onResponse ({ successfull, reason }) {
    // All done
    const isSuccessful = (reverse && !successfull) || (!reverse && successfull)
    isStable = isRunningStabilityWindow ? isSuccessful : !hasStabilityWindow

    if (isSuccessful && isStable) {
      events?.onResourceDone?.(resource.name)
      state.set(resource.name, true)

      return
    }

    if (signal.aborted) {
      events?.onResourceTimeout?.(
        resource.name,
        new Error('Stability check timed out')
      )
      state.set(resource.name, true)

      return
    }

    events?.onResourceResponse?.(resource.name, reason)

    /**  @type {Promise<void>} */
    let timerPromise
    if (hasStabilityWindow && isSuccessful) {
      isRunningStabilityWindow = true
      timerPromise = setTimeout(window, null, { signal })
    } else {
      isRunningStabilityWindow = false
      timerPromise = setTimeout(interval, null, { signal })
    }

    return timerPromise
      .then(() => pool.run(resource.exec.bind(null, signal)))
      .then(onResponse, onError)
      .catch(onError)
  }

  function onError (err) {
    if (signal.aborted) {
      events?.onResourceTimeout?.(resource.name, new Error('Request timed out'))
    } else {
      events?.onResourceError?.(resource.name, err)
    }

    state.set(resource.name, true)
  }
}

function createResource (deps, resource) {
  let protocol
  try {
    protocol = new URL(resource).protocol
  } catch {
    // Not a valid URL, fallback into file protocol
    const parsed = new URL(
      `file:/${isAbsolute(resource) ? resource : join(process.cwd(), resource)}`
    )
    protocol = parsed.protocol
    resource = parsed.href
  }

  switch (protocol) {
    case 'https-get:':
    case 'http-get:':
    case 'https:':
    case 'http:':
      return createHTTPResource(deps, resource)
    case 'tcp:':
      return createTCPResource(deps, resource)
    case 'socket:':
      return createSocketResource(deps, resource)
    case 'file:':
    default:
      return createFileResource(deps, resource)
  }
}

// Add support for multiple export combos
module.exports = WaitOn
module.exports.WaitOn = WaitOn
module.exports.default = WaitOn
