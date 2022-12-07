'use strict'
const { createServer } = require('node:http')
const { setTimeout } = require('node:timers/promises')

const { test } = require('tap')

const waitOn = require('..')

test('Wait-On#HTTP', { only: true }, context => {
  context.plan(7)

  context.test('Basic HTTP', async t => {
    let called = false
    const server = createServer((_req, res) => {
      called = true
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('Hello World')
    })

    t.plan(2)

    t.teardown(server.close.bind(server))

    const waiting = waitOn({
      resources: ['http://localhost:3001']
    })

    await setTimeout(1500)

    await new Promise((resolve, reject) => {
      server.listen(3001, async e => {
        if (e != null) reject(e)

        resolve()
      })
    })

    const result = await waiting

    t.ok(called)
    t.equal(result, true)
  })

  context.test('Basic HTTP - with initial delay', async t => {
    let called = false
    const server = createServer((_req, res) => {
      called = true
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('Hello World')
    })

    t.plan(2)
    t.teardown(server.close.bind(server))

    const waiting = waitOn({
      resources: ['http://localhost:3002'],
      delay: 1000
    })

    await new Promise((resolve, reject) => {
      server.listen(3002, async e => {
        if (e != null) reject(e)

        resolve()
      })
    })

    const result = await waiting

    t.ok(called)
    t.equal(result, true)
  })

  context.test(
    'Basic HTTP - with initial delay - with custom status code check',
    async t => {
      let called = false
      let callbackCalled = 0
      const server = createServer((req, res) => {
        if (!called) {
          called = true
          res.writeHead(404, { 'Content-Type': 'text/plain' })
          res.end('Not Found')
        } else {
          res.writeHead(200, { 'Content-Type': 'text/plain' })
          res.end('Hello World')
          // Called twice because happy-eyeballs
          t.ok(called)
        }
      })

      t.plan(4)
      t.teardown(server.close.bind(server))

      const waiting = waitOn({
        resources: ['http://localhost:3010'],
        delay: 2000,
        http: {
          validateStatus: code => {
            callbackCalled++
            return code === 200
          }
        }
      })

      await setTimeout(500)
      await new Promise((resolve, reject) => {
        server.listen(3010, e => {
          if (e != null) reject(e)
          resolve()
        })
      })

      const result = await waiting

      t.equal(result, true)
      t.equal(callbackCalled, 3)
    }
  )

  context.test('Basic HTTP - immediate connect', async t => {
    let called = false
    const server = createServer((_req, res) => {
      called = true
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('Hello World')
    })

    t.plan(2)
    t.teardown(server.close.bind(server))

    await new Promise((resolve, reject) => {
      server.listen(3003, async e => {
        if (e != null) reject(e)

        resolve()
      })
    })

    const result = await waitOn({
      resources: ['http://localhost:3003']
    })

    t.ok(called)
    t.equal(result, true)
  })

  context.test(
    'Basic HTTP - fallback to ipv6 if ipv4 not available on localhost',
    async t => {
      let ipv4Called = false
      let ipv6Called = false

      const server4 = createServer((req, res) => {
        ipv4Called = true
        console.log('called - ipv4')
        res.writeHead(500, { 'Content-Type': 'text/plain' })
        res.end('oops!')
      })

      const server6 = createServer((req, res) => {
        ipv6Called = true
        console.log('called - ipv6')
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('Hello World')
      })

      t.plan(3)

      t.teardown(server4.close.bind(server4))
      t.teardown(server6.close.bind(server6))

      await new Promise((resolve, reject) => {
        server4.listen({ host: '127.0.0.1', port: 3006 }, e => {
          if (e != null) reject(e)
          else resolve()
        })
      })

      await new Promise((resolve, reject) => {
        server6.listen({ host: '::1', port: 3006 }, e => {
          if (e != null) reject(e)
          else resolve()
        })
      })

      const result = await waitOn({
        resources: ['http://localhost:3006'],
        window: 0,
        interval: 0
      })

      t.equal(result, true)
      t.ok(ipv4Called)
      t.ok(ipv6Called)
    }
  )

  context.test(
    'Basic HTTP - fallback to ipv4 if ipv6 not available on localhost',
    async t => {
      const server = createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('Hello World')
      })

      t.plan(1)

      t.teardown(server.close.bind(server))

      const promise = waitOn({
        resources: ['http://localhost:3007']
      })

      await setTimeout(1000)

      await new Promise((resolve, reject) => {
        server.listen({ host: '::1', port: 3007 }, e => {
          if (e != null) reject(e)
          else resolve()
        })
      })

      const result = await promise
      t.equal(result, true)
    }
  )

  context.test('Basic HTTP with timeout', async t => {
    t.plan(1)

    const result = await waitOn({
      resources: ['http://localhost:3004'],
      timeout: 1500
    })

    t.equal(result, false)
  })
})
