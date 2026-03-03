import { io } from 'socket.io-client';

// 'http://localhost:3001' — адрес нашего бэкенда
const socket = io('http://localhost:3001');

export default socket;