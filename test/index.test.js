'use strict'
const { once } = require('node:events')
const { createServer: createServerTCP } = require('node:net')
const { createServer: createServerHTTP } = require('node:http')
const { exec } = require('node:child_process')

const { test } = require('tap')

const waitOn = require('..')

function noop () {}

test('Wait-On#Main', context => {
  context.plan(2)

  context.test('CLI', handler => {
    handler.plan(1)

    handler.test('Should finish after first resource avaialble', async t => {
      let calledHTTP = false
      const http = createServerHTTP((_req, res) => {
        calledHTTP = true
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('Hello World')
      })
      t.teardown(http.close.bind(http))

      try {
        const subprocess = exec(
          './wait-on --any "http://localhost:8000" "http://localhost:9000"'
        )

        await new Promise((resolve, reject) => {
          http.listen(8000, e => {
            if (e != null) reject(e)
            else resolve()
          })
        })

        await once(subprocess, 'exit')

        t.equal(subprocess.exitCode, 0)
        t.ok(calledHTTP)
      } catch (error) {
        t.fail(error)
      }
    })
  })

  context.test('API', handler => {
    handler.plan(1)

    handler.test('Should finish after first resource avaialble', async t => {
      const tcp = createServerTCP({
        keepAlive: false
      })

      tcp.on('connection', noop)

      tcp.on('error', noop)

      t.teardown(tcp.close.bind(tcp))
      t.plan(1)

      try {
        const promise = waitOn({
          any: true,
          resources: ['tcp://localhost:3000', 'tcp://localhost:9999']
        })

        await new Promise((resolve, reject) => {
          tcp.listen(9999, e => {
            if (e != null) reject(e)
            else resolve()
          })
        })

        const result = await promise

        t.ok(result)
      } catch (error) {
        t.fail(error)
      }
    })
  })
})
