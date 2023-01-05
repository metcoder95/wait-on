'use strict'
const { stat } = require('node:fs/promises')

/**
 * @param {import('..').WaitOnOptions} _
 * @param {string} resource
 * @return {Promise<{ successfull: boolean, reason: string }>}
 */
function createFileResource (_, resource) {
  const { href } = new URL(resource)
  const path = href.split('file:/')[1]
  let prevSize = -1
  let prevMtime = -1

  return {
    exec,
    name: href
  }

  async function exec () {
    const operation = {
      successfull: false,
      reason: 'unknown'
    }

    // TODO: rediscuss the implementation for the file resource
    /**
     * On Node > v19 we can use fs.watch instead of polling
     */

    try {
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
