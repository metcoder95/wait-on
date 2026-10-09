'use strict';
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('node:http');
const { setTimeout } = require('node:timers/promises');
const test = require('node:test');

const waitOn = require('..');

test('Basic Socket', async (t) => {
  const tmpdir = os.tmpdir();
  const socketPath = path.join(tmpdir, 'sock');
  const server = createServer((_, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  });

  t.after(server.close.bind(server));

  const promise = waitOn({
    resources: [`socket:${socketPath}`],
  });

  await setTimeout(1500).then(
    () =>
      new Promise((resolve, reject) => {
        server.listen(socketPath, (err) => {
          if (err != null) reject(err);

          resolve();
        });
      }),
  );

  const result = await promise;

  t.assert.equal(result, true);
});

test('Basic Socket - with initial delay', async (t) => {
  const tmpdir = os.tmpdir();
  const socketPath = path.join(tmpdir, 'sock');
  const server = createServer((_, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  });

  t.after(server.close.bind(server));

  await new Promise((resolve, reject) => {
    server.listen(socketPath, (err) => {
      if (err != null) reject(err);

      resolve();
    });
  });

  const result = await waitOn({
    resources: [`socket:${socketPath}`],
    delay: 1500,
  });

  t.assert.equal(result, true);
});

test('Basic Socket - immediate connect', async (t) => {
  const tmpdir = os.tmpdir();
  const socketPath = path.join(tmpdir, 'sock');
  const server = createServer((_, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  });

  t.after(server.close.bind(server));

  await new Promise((resolve, reject) => {
    server.listen(socketPath, (err) => {
      if (err != null) reject(err);

      resolve();
    });
  });

  const result = await waitOn({
    resources: [`socket:${socketPath}`],
  });

  t.assert.equal(result, true);
});

test('Basic Socket with timeout', async (t) => {
  const tmpdir = os.tmpdir();
  const socketPath = path.join(tmpdir, 'sock');

  const result = await waitOn({
    resources: [`socket:${socketPath}`],
    socket: {
      timeout: 500,
    },
    timeout: 1000,
  });

  t.assert.equal(result, false);
});
