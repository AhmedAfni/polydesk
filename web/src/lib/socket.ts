import { io, Socket } from 'socket.io-client'

export const socket: Socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
  autoConnect: false,
})

export default socket
