'use strict'
const { createServer } = require('node:net')
const { setTimeout } = require('node:timers/promises')

const { test } = require('tap')

const waitOn = require('..')

test('Wait-On#TCP', context => {
  context.plan(4)

  context.test('Basic TCP', async t => {
    const server = createServer({
      keepAlive: false
    })

    server.on('connection', socket => {
      socket.end('Hello World!')
    })

    t.plan(1)
    t.teardown(server.close.bind(server))

    const promise = waitOn({
      resources: ['tcp://localhost:4001']
    })

    await setTimeout(1500).then(
      () =>
        new Promise(resolve => {
          server.listen(4001, resolve)
        })
    )

    const result = await promise

    t.equal(result, true)
  })

  context.test('Basic TCP - with initial delay', async t => {
    const server = createServer({
      keepAlive: false
    })

    server.on('connection', socket => {
      socket.end('Hello World!')
    })

    t.plan(1)
    t.teardown(server.close.bind(server))

    const promise = waitOn({
      resources: ['tcp://localhost:4002'],
      delay: 1000
    })

    await new Promise(resolve => {
      server.listen(4002, resolve)
    })

    const result = await promise

    t.equal(result, true)
  })

  context.test('Basic TCP - immediate connect', async t => {
    const server = createServer({
      keepAlive: false
    })

    server.on('connection', socket => {
      socket.end('Hello World!')
    })

    t.plan(1)
    t.teardown(server.close.bind(server))

    await new Promise(resolve => {
      server.listen(4003, resolve)
    })

    const result = await waitOn({
      resources: ['tcp://localhost:4003']
    })

    t.equal(result, true)
  })

  context.test('Basic TCP with timeout', async t => {
    const server = createServer({
      keepAlive: false
    })

    server.on('connection', socket => {
      socket.end('Hello World!')
    })

    t.plan(1)
    t.teardown(server.close.bind(server))

    const promise = waitOn({
      resources: ['tcp://localhost:4004'],
      timeout: 1000
    })

    const result = await promise

    t.equal(result, false)
  })
})