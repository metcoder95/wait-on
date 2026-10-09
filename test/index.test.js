'use strict';
const { once } = require('node:events');
const { createServer: createServerTCP } = require('node:net');
const { createServer: createServerHTTP } = require('node:http');
const { exec } = require('node:child_process');
const test = require('node:test');

const waitOn = require('..');

function noop() {}
test('CLI#Should finish after first resource avaialble', async (t) => {
  let calledHTTP = false;
  const http = createServerHTTP((_req, res) => {
    calledHTTP = true;
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello World');
  });
  const subprocess = exec(
    './wait-on --any "http://localhost:8000" "http://localhost:9000"',
  );

  t.after(http.close.bind(http));

  http.listen(8000);
  await once(http, 'listening');
  await once(subprocess, 'exit');

  t.assert.equal(subprocess.exitCode, 0);
  t.assert.ok(calledHTTP);
});

test('Import#Should finish after first resource avaialble', async (t) => {
  const tcp = createServerTCP({
    keepAlive: false,
  });

  tcp.on('connection', noop);

  tcp.on('error', noop);

  t.after(tcp.close.bind(tcp));

  const promise = waitOn({
    any: true,
    resources: ['tcp://localhost:3000', 'tcp://localhost:9999'],
  });

  tcp.listen(9999);
  await once(tcp, 'listening');

  const result = await promise;

  t.assert.ok(result);
});
