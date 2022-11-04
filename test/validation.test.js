'use strict'

const childProcess = require('child_process')
const { promisify } = require('util')

const { test } = require('tap')

const waitOn = require('..')

test('Wait-On#Programatically', context => {
  context.plan(2)

  context.test('Should throw if empty Options', async t => {
    t.plan(2)

    await t.rejects(waitOn(), 'Should throw if empty Options')
    await t.rejects(waitOn(null), 'Should throw if empty Options')
  })

  context.test('Should throw if empty Options#resources', async t => {
    t.plan(2)

    await t.rejects(
      waitOn({ resources: null }),
      'Should throw if empty Options#resources'
    )

    await t.rejects(
      waitOn({}),
      'Should throw if empty Options#resources (null)'
    )
  })
})

test('Wait-On#CLI', context => {
  const exec = promisify(childProcess.exec)
  context.plan(1)

  context.test('Should exit with code 1', async t => {
    t.plan(2)

    try {
      await exec('./wait-on')
    } catch (err) {
      t.equal(err.code, 1, 'Should exit with code 1')
      t.match(
        err.stderr,
        "Invalid options: must have required property 'resources'",
        'Should not have stderr'
      )
    }
  })
})
