import { Server, type ServerOptions, type Socket } from 'socket.io'
import type { H3Event } from 'h3'

const options: Partial<ServerOptions> = {
  path: '/api/socket.io',
  serveClient: false
}

export const io = new Server(options)
export function initSocket(event: H3Event) {

  // @ts-ignore
  io.attach(event.node.res.socket?.server)

  io.on('connection', (socket: Socket) => {
    console.log('ws connected', socket.id)

    io.emit('currentUsers', { user: socket.id })

    // orders update
    socket.on('ordersUpdate', (payload) => {
      io.emit('recieveUpdate', payload)
    })

    // disconnect
    socket.on('disconnect', () => {
      console.log('disconnect', socket.id)
    })
  })
}