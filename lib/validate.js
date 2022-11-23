const Ajv = require('ajv')

const SUPPORTED_HOOKS = [
  'onInvalidResource',
  'onResourceTimeout',
  'onResourceResponse',
  'onResourceError',
  'onResourceDone'
]

const ajv = new Ajv({
  strict: false,
  useDefaults: true
})

// TODO: add function keyword
// ajv.addKeyword({
//   keyword: 'function',
//   compile: (_, parent) => {
//     return data => {
//       const shouldValidateParams = parent.params ?? false
//       const shouldAllowAsync =
//         parent.allowAsync != null ? parent.allowAsync : false
//       let result = false

//       if (shouldAllowAsync) {
//         result =
//           data.constructor.name === 'AsyncFunction' ||
//           data.constructor.name === 'Function'
//       } else {
//         result = data.constructor.name === 'Function'
//       }

//       if (result && shouldValidateParams) {
//         result = data.length === parent.params
//       }
//     }
//   },
//   metaSchema: {
//     type: 'boolean',
//     additionalItems: false
//   }
// })

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

function validateHooks (hooks) {
  for (const hook of SUPPORTED_HOOKS) {
    if (hooks[hook] != null && hooks[hook].constructor.name !== 'Function') {
      return {
        message: `Invalid hook: ${hook} is not a function. Received: ${hooks[hook]?.constructor?.name}`
      }
    }
  }
}

module.exports = {
  parseAjvError,
  parseAjvErrors,
  validateHooks,
  validateOptions: ajv.compile({
    type: 'object',
    required: ['resources'],
    properties: {
      // Resource Handling
      resources: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'string'
        }
      },
      throwOnInvalidResource: {
        type: 'boolean',
        default: false
      },
      // Timing settings
      delay: {
        type: 'integer',
        minimum: 0,
        default: 0
      },
      timeout: {
        type: 'integer',
        minimum: 1,
        default: 60000
      },
      http: {
        type: 'object',
        properties: {
          bodyTimeout: {
            type: 'integer',
            minimum: 0
          },
          headersTimeout: {
            type: 'integer',
            minimum: 0
          }
        }
      },
      interval: {
        type: 'integer',
        minimum: 0,
        default: 250
      },
      reverse: {
        type: 'boolean',
        default: false
      },
      simultaneous: {
        type: 'integer',
        minimum: 1,
        defaults: 10
      },
      tcpTimeout: {
        type: 'integer',
        minimum: 0,
        default: 300 // 300ms
      },
      window: {
        type: 'integer',
        minimum: 0,
        default: 0
      },
      passphrase: {
        type: 'string'
      },
      strictSSL: {
        type: 'boolean',
        default: false
      },
      maxRedirects: {
        type: 'integer',
        minimum: 0,
        default: 5
      },
      followRedirect: {
        type: 'boolean',
        default: true
      },
      headers: {
        type: 'object'
      },
      auth: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: {
            type: 'string'
          },
          password: {
            type: 'string'
          }
        }
      },
      proxy: {
        type: 'object',
        required: ['uri'],
        properties: {
          uri: {
            type: 'string'
          },
          token: {
            type: 'string'
          }
        }
      },
      /**
       * Supports:
       * - onInvalidResource
       * - onResourceTimeout
       * - onResourceError
       * - onResourceResponse
       * - onResourceDone
       */
      events: {
        type: 'object'
      }
    }
  })
}
