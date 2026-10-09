'use strict';
const { createServer } = require('node:http');
const { setTimeout } = require('node:timers/promises');
const { once } = require('node:events');
const test = require('node:test');

const waitOn = require('..');

test('Basic HTTP', async (t) => {
  let called = false;
  const server = createServer((_req, res) => {
    called = true;
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello World');
  });

  t.plan(2);

  t.after(server.close.bind(server));

  const waiting = waitOn({
    resources: ['http://localhost:3001'],
  });

  await setTimeout(1500);

  server.listen(3001);
  await once(server, 'listening');

  const result = await waiting;

  t.assert.ok(called);
  t.assert.equal(result, true);
});

test('Basic HTTP - with initial delay', async (t) => {
  let called = false;
  const server = createServer((_req, res) => {
    called = true;
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello World');
  });

  t.after(server.close.bind(server));

  const waiting = waitOn({
    resources: ['http://localhost:3002'],
    delay: 1000,
  });

  server.listen(3002);
  await once(server, 'listening');

  const result = await waiting;

  t.assert.ok(called);
  t.assert.equal(result, true);
});

test('Basic HTTP - with initial delay - with custom status code check', async (t) => {
  let called = false;
  let callbackCalled = 0;
  const server = createServer((req, res) => {
    if (!called) {
      called = true;
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Hello World');
      // Called twice because happy-eyeballs
      t.assert.ok(called);
    }
  });

  t.plan(3);
  t.after(server.close.bind(server));

  const waiting = waitOn({
    resources: ['http://localhost:3010'],
    delay: 2000,
    http: {
      validateStatus: (code) => {
        callbackCalled++;
        return code === 200;
      },
    },
  });

  await setTimeout(500);

  server.listen(3010);
  await once(server, 'listening');

  const result = await waiting;

  t.assert.equal(result, true);
  t.assert.equal(callbackCalled, 2);
});

test('Basic HTTP - immediate connect', async (t) => {
  let called = false;
  const server = createServer((_req, res) => {
    called = true;
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello World');
  });

  t.after(server.close.bind(server));

  server.listen(3003);
  await once(server, 'listening');

  const result = await waitOn({
    resources: ['http://localhost:3003'],
  });

  t.assert.ok(called);
  t.assert.equal(result, true);
});

test('Basic HTTP - fallback to ipv6 if ipv4 not available on localhost', async (t) => {
  let ipv6Called = false;

  const server6 = createServer((req, res) => {
    ipv6Called = true;
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello World');
  });

  t.after(server6.close.bind(server6));

  server6.listen({ host: '::1', port: 3006 });
  await once(server6, 'listening');

  const result = await waitOn({
    resources: ['http://localhost:3006'],
    window: 0,
    interval: 0,
  });

  t.assert.equal(result, true);
  t.assert.ok(ipv6Called);
});

test('Basic HTTP - fallback to ipv4 if ipv6 not available on localhost', async (t) => {
  const server = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello World');
  });

  t.after(server.close.bind(server));

  const promise = waitOn({
    resources: ['http://localhost:3007'],
  });

  await setTimeout(1000);

  server.listen({ host: '::1', port: 3007 });
  await once(server, 'listening');

  const result = await promise;
  t.assert.equal(result, true);
});

test('Basic HTTP with timeout', (t) => {
  return waitOn({
    resources: ['http://localhost:3004'],
    timeout: 500,
  }).then(
    (result) => t.assert.equal(result, false),
    (err) => t.assert.ifError(err),
  );
});
