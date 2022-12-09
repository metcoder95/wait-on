# @metcoder95/wait-on - wait for files, ports, sockets, http(s) resources

[![CI](https://github.com/metcoder95/wait-on/actions/workflows/ci.yml/badge.svg)](https://github.com/metcoder95/wait-on/actions/workflows/ci.yml) [![Release](https://github.com/metcoder95/wait-on/actions/workflows/release.yml/badge.svg)](https://github.com/metcoder95/wait-on/actions/workflows/release.yml)

> **Note**:
> This is a fork of the original [`wait-on`](https://github.com/jeffbski/wait-on) made by @jeffbski. It respects the given LICENSE from the original fork, and aims to provide a similar functionality with slighlty differences compared to the original project
> The fork is meant to extend maintenance of the last project while upgrading it by adding support and using up-to-date technologies and practices, like providing TS types, or using Promise as its much extend.
> This fork is not meant to replace the original `wait-on` but rather coexists and open its arms to any person that wants to continue using `wait-on` while adding changes on a more regular basis.

wait-on is a cross-platform command line utility which will wait for files, ports, sockets, and http(s) resources to become available (or not available using reverse mode). Functionality is also available via a Node.js API. Cross-platform - runs everywhere Node.js runs (linux, unix, mac OS X, windows)

wait-on will wait for period of time for a file to stop growing before triggering availability which is good for monitoring files that are being built. Likewise wait-on will wait for period of time for other resources to remain available before triggering success.

For http(s) resources wait-on will check that the requests are returning 2XX (success) to HEAD or GET requests (after following any redirects).

wait-on can also be used in reverse mode which waits for resources to NOT be available. This is useful in waiting for services to shutdown before continuing. (Thanks @skarbovskiy for adding this feature)

## Installation

### Requirements

- `Node.js` >= 16

```bash
npm install @metcoder95/wait-on # local version and for programatic usage
OR
npm install -g @metcoder95/wait-on # global version
```

## Usage

Use from command line or using Node.js programmatic API.

### CLI Usage

Assuming NEXT_CMD is the command to run when resources are available, then wait-on will wait and then exit with a successful exit code (0) once all resources are available, causing NEXT_CMD to be run.

wait-on can also be used in reverse mode, which waits for resources to NOT be available. This is useful in waiting for services to shutdown before continuing. (Thanks @skarbovskiy for adding)

If wait-on is interrupted before all resources are available, it will exit with a non-zero exit code and thus NEXT_CMD will not be run.

```bash
wait-on file1 && NEXT_CMD # wait for file1, then exec NEXT_CMD
wait-on f1 f2 && NEXT_CMD # wait for both f1 and f2, the exec NEXT_CMD
wait-on http://localhost:8000/foo && NEXT_CMD # wait for http 2XX HEAD
wait-on https://myserver/foo && NEXT_CMD # wait for https 2XX HEAD
wait-on http-get://localhost:8000/foo && NEXT_CMD # wait for http 2XX GET
wait-on https-get://myserver/foo && NEXT_CMD # wait for https 2XX GET
wait-on tcp://localhost:4000 && NEXT_CMD # wait for service to listen on a TCP port
wait-on socket:/path/mysock # wait for service to listen on domain socket
wait-on http://unix:/var/SOCKPATH:/a/foo # wait for http HEAD on domain socket
wait-on http-get://unix:/var/SOCKPATH:/a/foo # wait for http GET on domain socket
```

```
Usage: wait-on {OPTIONS} resource [...resource]

Description:

     wait-on is a command line utility which will wait for files, ports,
     sockets, and http(s) resources to become available (or not available
     using reverse flag). Exits with  success code (0) when all resources
     are ready. Non-zero exit code if interrupted or timed out.

     Options may also be specified in a config file (js or json). For
     example --config configFile.js would result in configFile.js being
     required and the resulting object will be merged with any
     command line options before wait-on is called. See exampleConfig.js

     In shell combine with && to conditionally run another command
     once resources are available. ex: wait-on f1 && NEXT_CMD

     resources types are defined by their prefix, if no prefix is
     present, the resource is assumed to be of type 'file'. Resources
     can also be provided in the config file.

     resource prefixes are:

       file:      - regular file (also default type). ex: file:/path/to/file
       http:      - HTTP HEAD returns 2XX response. ex: http://m.com:90/foo
       https:     - HTTPS HEAD returns 2XX response. ex: https://my/bar
       http-get:  - HTTP GET returns 2XX response. ex: http://m.com:90/foo
       https-get: - HTTPS GET returns 2XX response. ex: https://my/bar
       tcp:       - TCP port is listening. ex: tcp://localhost:4000 or tcp://foo:7000
       socket:    - Domain Socket is listening. ex: socket:/path/to/sock
                    For http over socket, use http://unix:SOCK_PATH:URL_PATH
                    like http://unix:/path/to/sock:/foo/bar or
                         http-get://unix:/path/to/sock:/foo/bar

Standard Options:

 -c, --config

  js or json config file, useful for http(s) options and resources

 -d, --delay

  Initial delay before checking for resources in ms, default 0

 --httpTimeout

  Maximum time in ms to wait for an HTTP HEAD/GET request, default 60000

 --socketTimeout

  Maximum time in ms to wait for an Socket connection establishment, default 60000.

-i, --interval

  Interval to poll resources in ms, default 250ms

 -l, --log

  Log resources begin waited on and when complete or errored

 -r, --reverse

  Reverse operation, wait for resources to NOT be available

 -s, --simultaneous

  Simultaneous / Concurrent connections to a resource, default Infinity
  Setting this to 1 would delay new requests until previous one has completed.
  Used to limit the number of connections attempted to a resource at a time.

 -t, --timeout

  Maximum time in ms to wait before exiting with failure (1) code,
  default Infinity

  --tcpTimeout

   Maximum time in ms for tcp connect, default 60000

 -v, --verbose

  Enable debug output to stdout

 -w, --window

  Stability window, the time in ms defining the window of time that
  resource needs to have not changed (file size or availability) before
  signalling success, default 750ms. If less than interval, it will be
  reset to the value of interval. This is only used for files, other
  resources are considered available on first detection.

 -h, --help

  Show this message
```

### Node.js API usage

#### JavaScript

```javascript
const { WaitOn } = require('@metcoder95/wait-on');

WaitOn({
  resources: [
    'http://localhost:3000',
    'tcp://localhost:3001',
    'some-file.txt',
    '/Users/metcoder95/path-to-file',
    '../file.txt',
  ],
  timeout: 10000,
  events: {
    onResourceResponse: console.log,
  },
}).then((res) => console.log('done:', res), console.error);
```

#### TypeScript

```typescript
import WaitOn from '@metcoder95/wait-on';

WaitOn({
  resources: [
    'http://localhost:3000',
    'tcp://localhost:3001',
    'some-file.txt',
    '/Users/metcoder95/path-to-file',
    '../file.txt',
  ],
  timeout: 10000,
  events: {
    onResourceResponse: console.log,
  },
}, (err: Error, result: boolean) => {
  if (err != null) console.error(err)
  else console.log(result)
}).
```

`wait-on` function can be called by either passing a callback or just calling the function. If not callback provided, a `Promise<boolean>` will be returned, otherwise the callback provided will be called once the set of checks are done.

#### Type Definitions
```ts
type WaitOnCallback = (err?: Error, result: boolean) => unknown;

declare function WaitOn(
  options: WaitOnOptions,
  cb: WaitOnCallback
): Promise<boolean>;

declare function WaitOn(options: WaitOnOptions): Promise<boolean>;

type WaitOnProxyConfig = ProxyAgent.Options;

/**
 * @description Invoked when an unsuccessful response is received from resource
 */
type WaitOnEventHandler = (
  resource: WaitOnResourcesType,
  response: string
) => void;
/**
 * @description invoked when an invalid resource is encountered
 * @note It won't be invoked if the 'throwOnInvalidResource' option is on
 */
type WaitOnInvalidResourceEventHandler = (
  resource: WaitOnResourcesType
) => void;
/**
 * @description Invoked when the resource becomes available and stable
 */
type WaitOnDoneEventHandler = (resource: WaitOnResourcesType) => void;
/**
 * @description Invoked when an unexpected error or a timed out waiting for the resource
 * occurs
 */
type WaitOnErrorHandler = (resource: WaitOnResourcesType, error: Error) => void;

type WaitOnResourcesType =
  | `file:${string}`
  | `http-get:${string}`
  | `https-get:${string}`
  | `http:${string}`
  | `https:${string}`
  | `tcp:${string}`
  | `socket:${string}`;

type WaitOnValidateStatusCallback = (status: number) => boolean;

type WaitOnOptions = {
  resources: WaitOnResourcesType[];
  throwOnInvalidResource?: boolean;
  delay?: number;
  interval?: number;
  timeout?: number;
  reverse?: boolean;
  simultaneous?: number;
  http?: {
    bodyTimeout?: number;
    headersTimeout?: number;
    maxRedirects?: number;
    followRedirect?: boolean;
    headers?: Record<string, string | number>;
    validateStatus?: WaitOnValidateStatusCallback
  };
  socket?: {
    timeout?: number;
  };
  tcp?: {
    timeout?: number;
  };
  window?: number;
  proxy?: WaitOnProxyConfig;
  events?: {
    onInvalidResource?: WaitOnInvalidResourceEventHandler;
    onResourceTimeout?: WaitOnErrorHandler;
    onResourceError?: WaitOnErrorHandler;
    onResourceResponse?: WaitOnEventHandler;
    onResourceDone?: WaitOnDoneEventHandler;
  };
  validateStatus?: WaitOnValidateStatusCallback;
};
```

## Goals

- simple command line utility and Node.js API for waiting for resources
- wait for files to stabilize
- wait for http(s) resources to return 2XX in response to HEAD request
- wait for http(s) resources to return 2XX in response to GET request
- wait for services to be listening on tcp ports
- wait for services to be listening on unix domain sockets
- configurable initial delay, poll interval, stabilization window, timeout
- command line utility returns success code (0) when resources are availble
- command line utility that can also wait for resources to not be available using reverse flag. This is useful for waiting for services to shutdown before continuing.
- cross platform - runs anywhere Node.js runs (linux, unix, mac OS X, windows)

## Why

I frequently need to wait on build tasks to complete or services to be available before starting next command, so this project makes that easier and is portable to everywhere Node.js runs.

## Get involved

If you have input or ideas or would like to get involved, you may:

- Open an issue on github to begin a discussion - <https://github.com/metcoder95/wait-on/issues>
- Fork the repo and send a pull request (with tests, and possible documentation changes) - <https://github.com/metcoder95/wait-on>

## License

- [MIT license](http://github.com/metcoder95/wait-on/raw/master/LICENSE)
