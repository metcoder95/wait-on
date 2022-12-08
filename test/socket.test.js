'use strict'
const os = require('node:os')
const path = require('node:path')
const { createServer } = require('node:http')
const { setTimeout } = require('node:timers/promises')

const { test } = require('tap')

const waitOn = require('..')

test('Wait-On#Socket', context => {
  context.plan(4)

  context.test('Basic Socket', async t => {
    const tmpdir = os.tmpdir()
    const socketPath = path.join(tmpdir, 'sock')
    const server = createServer((_, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('OK')
    })

    t.plan(1)
    t.teardown(server.close.bind(server))

    const promise = waitOn({
      resources: [`socket:${socketPath}`]
    })

    await setTimeout(1500).then(
      () =>
        new Promise((resolve, reject) => {
          server.listen(socketPath, err => {
            if (err != null) reject(err)

            resolve()
          })
        })
    )

    const result = await promise

    t.equal(result, true)
  })

  context.test('Basic Socket - with initial delay', async t => {
    const tmpdir = os.tmpdir()
    const socketPath = path.join(tmpdir, 'sock')
    const server = createServer((_, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('OK')
    })

    t.plan(1)
    t.teardown(server.close.bind(server))

    await new Promise((resolve, reject) => {
      server.listen(socketPath, err => {
        if (err != null) reject(err)

        resolve()
      })
    })

    const result = await waitOn({
      resources: [`socket:${socketPath}`],
      delay: 1500
    })

    t.equal(result, true)
  })

  context.test('Basic Socket - immediate connect', async t => {
    const tmpdir = os.tmpdir()
    const socketPath = path.join(tmpdir, 'sock')
    const server = createServer((_, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('OK')
    })

    t.plan(1)
    t.teardown(server.close.bind(server))

    await new Promise((resolve, reject) => {
      server.listen(socketPath, err => {
        if (err != null) reject(err)

        resolve()
      })
    })

    const result = await waitOn({
      resources: [`socket:${socketPath}`]
    })

    t.equal(result, true)
  })

  context.test('Basic Socket with timeout', async t => {
    const tmpdir = os.tmpdir()
    const socketPath = path.join(tmpdir, 'sock')

    t.plan(1)

    const result = await waitOn({
      resources: [`socket:${socketPath}`],
      socket: {
        timeout: 500
      },
      timeout: 1000
    })

    t.equal(result, false)
  })
})
