'use strict'
const { createServer } = require('node:http')
const { setTimeout } = require('node:timers/promises')

const { test } = require('tap')

const waitOn = require('..')

test('Wait-On#HTTP', context => {
  context.plan(4)

  context.test('Basic HTTP', t => {
    const server = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('Hello World')
    })

    t.plan(1)

    t.teardown(server.close.bind(server))

    const waiting = waitOn({
      resources: ['http://localhost:3001']
    })

    setTimeout(1500).then(() => {
      server.listen(3001, async e => {
        if (e != null) t.fail(e.message)

        const result = await waiting

        t.equal(result, true)
      })
    })
  })

  context.test('Basic HTTP - with initial delay', t => {
    const server = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('Hello World')
    })

    t.plan(1)

    t.teardown(server.close.bind(server))

    const waiting = waitOn({
      resources: ['http://localhost:3002'],
      delay: 1000
    })

    setTimeout(0).then(() => {
      server.listen(3002, async e => {
        if (e != null) t.fail(e.message)

        const result = await waiting

        t.equal(result, true)
      })
    })
  })

  context.test('Basic HTTP - immediate connect', t => {
    const server = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('Hello World')
    })

    t.plan(1)

    t.teardown(server.close.bind(server))

    server.listen(3003, async e => {
      if (e != null) t.fail(e.message)

      const result = await waitOn({
        resources: ['http://localhost:3003']
      })

      t.equal(result, true)
    })
  })

  context.test('Basic HTTP with timeout', async t => {
    t.plan(1)

    const result = await waitOn({
      resources: ['http://localhost:3004'],
      timeout: 1500
    })

    t.equal(result, false)
  })
})
