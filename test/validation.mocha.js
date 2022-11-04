'use strict'

const waitOn = require('../')
const childProcess = require('child_process')

const { test } = require('tap')

function execCLI (args, options) {
  return childProcess.exec('../wait-on', args, options)
}

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

  describe('CLI', function () {
    it('should exit with non-zero error code when no resources provided', function (done) {
      execCLI([]).on('exit', function (code) {
        expect(code).toNotBe(0)
        done()
      })
    })
  })
})
