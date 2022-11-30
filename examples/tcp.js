const { WaitOn } = require('..')

WaitOn({
  resources: ['tcp://localhost:3000'],
  timeout: 10000,
  events: {
    onResourceResponse: console.log
  }
}).then(res => console.log('done:', res), console.error)
