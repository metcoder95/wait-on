'use strict'
const { stat } = require('node:fs/promises')
const { setTimeout } = require('node:timers/promises')

// TODO: add config for socke timeout
function createFileResource (config, resource) {
  const { window } = config
  const { href } = new URL(resource)
  const path = href.split('file:/')[1]
  let prevSize = -1
  let prevMtime = -1

  return {
    exec,
    name: href
  }

  async function exec (signal) {
    const operation = {
      successfull: false,
      reason: 'unknown'
    }

    // TODO: rediscuss the implementation for the file resource
    /**
     * On Node > v19 we can use fs.watch instead of polling
     * The stability might be better measured by comparing
     * the mtime of the file with the last mtime over the interval
     * window until the timeout finishes
     */

    try {
      if (prevSize > 0 && prevMtime > 0 && !signal.aborted) {
        await setTimeout(window, null, { signal })
      }

      const {
        size: currentSize,
        mtimeMs: lastMofiedAt,
        birthtime,
        mtime
      } = await stat(path)

      if (prevSize === -1 && prevMtime === -1) {
        prevSize = currentSize
        prevMtime = lastMofiedAt
        operation.reason = `File ${resource} found, specs: created: ${birthtime}, size: ${currentSize}, modified: ${mtime}`
      } else if (
        prevMtime - lastMofiedAt !== 0 ||
        prevSize - currentSize !== 0
      ) {
        // Control variables
        prevSize = currentSize
        prevMtime = lastMofiedAt

        // Reporting variables
        operation.reason = `File ${resource} modified, specs: created: ${birthtime}, old-size: ${prevSize}, new-size: ${currentSize}, modified: ${mtime}`
      } else {
        operation.successfull = true
        operation.reason = `File ${resource} stable, specs: created: ${birthtime}, size: ${currentSize}, modified: ${mtime}`
      }
    } catch (err) {
      operation.reason = err.message
    }

    return operation
  }
}

module.exports = {
  createFileResource
}