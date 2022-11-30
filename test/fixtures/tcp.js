const net = require('node:net')

const server = net.createServer({
  keepAlive: false
})

server.on('connection', socket => {
  socket.end('Hello World!')
})

server.listen(3000, () => {
  console.log('server bound')
})
