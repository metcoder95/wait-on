'use strict';

const childProcess = require('child_process');
const { promisify } = require('node:util');
const test = require('node:test');

const waitOn = require('..');
const exec = promisify(childProcess.exec);

test('Import#Should throw if empty Options', async (t) => {
  await t.assert.rejects(waitOn(), 'Should throw if empty Options');
  await t.assert.rejects(waitOn(null), 'Should throw if empty Options');
});

test('Import#Should throw if empty Options#resources', async (t) => {
  await t.assert.rejects(
    waitOn({ resources: null }),
    'Should throw if empty Options#resources',
  );

  await t.assert.rejects(
    waitOn({}),
    'Should throw if empty Options#resources (null)',
  );
});

test('CLI#Should exit with code 1', async (t) => {
  try {
    await exec('./wait-on');
    t.assert.ifError(new Error('should not work'));
  } catch (err) {
    t.assert.equal(err.code, 1, 'Should exit with code 1');
  }
});
