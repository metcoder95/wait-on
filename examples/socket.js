const { WaitOn } = require('..')

WaitOn({
  resources: ['socket:/path/to/socket.sock'],
  timeout: 10000,
  events: {
    onResourceResponse: console.log
  }
}).then(res => console.log('done:', res), console.error)
