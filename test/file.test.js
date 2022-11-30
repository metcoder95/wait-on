'use strict'
const os = require('node:os')
const path = require('node:path')
const { writeFile, unlink, appendFile } = require('node:fs/promises')
const { setTimeout } = require('node:timers/promises')

const { test } = require('tap')

const waitOn = require('..')

test('Wait-On#File', context => {
  context.plan(5)

  context.test('Basic File - write', async t => {
    const tmpdir = os.tmpdir()
    const filePath = path.join(tmpdir, 'test-file1.txt')

    t.plan(1)
    t.teardown(unlink.bind(null, filePath))

    const promise = waitOn({
      resources: [`file:/${filePath}`],
      window: 1500
    })

    await setTimeout(500)

    await writeFile(filePath, 'Hello World!')

    const result = await promise

    t.equal(result, true)
  })

  context.test('Basic File - append', async t => {
    const tmpdir = os.tmpdir()
    const filePath = path.join(tmpdir, 'test-file2.txt')

    t.plan(1)
    t.teardown(unlink.bind(null, filePath))

    const promise = waitOn({
      resources: [`file:/${filePath}`],
      window: 1500
    })

    await setTimeout(500)

    await writeFile(filePath, 'Hello World!')

    await setTimeout(500)

    await appendFile(filePath, 'Hello World!(x2)')

    const result = await promise

    t.equal(result, true)
  })

  context.test('Basic File - with initial delay', async t => {
    const tmpdir = os.tmpdir()
    const filePath = path.join(tmpdir, 'test-file1.txt')

    t.plan(1)
    t.teardown(unlink.bind(null, filePath))

    const promise = waitOn({
      resources: [`file:/${filePath}`],
      window: 500,
      delay: 1000
    })

    await setTimeout(1000)

    await writeFile(filePath, 'Hello World!')

    const result = await promise

    t.equal(result, true)
  })

  context.test('Basic File - file already exists', async t => {
    const tmpdir = os.tmpdir()
    const filePath = path.join(tmpdir, 'test-file3.txt')

    t.plan(1)
    t.teardown(unlink.bind(null, filePath))

    await writeFile(filePath, 'Hello World!')

    const result = await waitOn({
      resources: [`file:/${filePath}`],
      window: 1500
    })

    t.equal(result, true)
  })

  context.test('Basic File with timeout', async t => {
    const tmpdir = os.tmpdir()
    const filePath = path.join(tmpdir, 'test-file4.txt')

    t.plan(1)

    const result = await waitOn({
      resources: [`file:/${filePath}`],
      timeout: 1000
    })

    t.equal(result, false)
  })
})
