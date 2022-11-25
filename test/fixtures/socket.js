const os = require('node:os')
const path = require('node:path')
const { createServer } = require('node:http')

const tmpdir = os.tmpdir()
const socketPath = path.join(tmpdir, 'sock')
const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('OK')
})

process.on('SIGINT', () => {
  server.close(() => console.log('server closed at', socketPath))
})

server.listen(socketPath, err => {
  if (err != null) console.error(err)
  else console.log('server listening at', socketPath)
})
