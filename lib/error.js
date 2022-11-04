'use strict'

function parseAjvError (error) {
  return error.message
}

function parseAjvErrors (errors) {
  let result = ''
  for (const error of errors) {
    result += parseAjvError(error)
  }

  return result
}

module.exports = {
  parseAjvError,
  parseAjvErrors
}
