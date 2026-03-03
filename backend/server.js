const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const Game = require('./game');

const PORT = process.env.PORT || 3001;

// Хранилище комнат и игроков
const rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Получение списка комнат
  socket.on('getRooms', () => {
    const availableRooms = Object.keys(rooms).map(roomId => ({
      id: roomId,
      name: rooms[roomId].name,
      playersCount: rooms[roomId].players.length,
      maxPlayers: rooms[roomId].maxPlayers
    }));
    socket.emit('roomsList', availableRooms);
  });

  // Создание комнаты
  socket.on('createRoom', ({ roomName, playerName }) => {
    const roomId = `room_${Math.random().toString(36).substring(2, 9)}`;
    rooms[roomId] = {
      id: roomId,
      name: roomName,
      players: [],
      maxPlayers: 4,
      status: 'waiting', // waiting, playing
      game: null // экземпляр Game
    };

    // Автоматически присоединяем создателя
    joinRoom(socket, roomId, playerName);

    // Обновляем список комнат для всех
    io.emit('roomsList', getRoomsList());
  });

  // Присоединение к комнате
  socket.on('joinRoom', ({ roomId, playerName }) => {
    joinRoom(socket, roomId, playerName);
  });

  // Явный запрос состояния комнаты клиентом
  socket.on('getRoomState', ({ roomId }) => {
    if (rooms[roomId]) {
      socket.emit('roomUpdate', rooms[roomId]);
      if (rooms[roomId].status === 'playing' && rooms[roomId].game) {
        socket.emit('gameStateUpdate', rooms[roomId].game.getGameState());
      }
    }
  });

  // Игровые действия
  socket.on('startGame', ({ roomId }) => {
    const room = rooms[roomId];
    if (room && room.players.length >= 2) {
      room.game = new Game(roomId, room.players);
      room.status = 'playing';
      io.to(roomId).emit('gameStarted', room.game.getGameState());
      io.emit('roomsList', getRoomsList());
    }
  });

  socket.on('rollDice', ({ roomId, playerId }) => {
    const room = rooms[roomId];
    if (room && room.game) {
      const state = room.game.rollDice(playerId);
      if (state) io.to(roomId).emit('gameStateUpdate', state);
    }
  });

  socket.on('buyProperty', ({ roomId, playerId, buy }) => {
    const room = rooms[roomId];
    if (room && room.game) {
      const state = room.game.buyProperty(playerId, buy);
      if (state) io.to(roomId).emit('gameStateUpdate', state);
    }
  });

  socket.on('endTurn', ({ roomId, playerId }) => {
    const room = rooms[roomId];
    if (room && room.game && room.game.currentPlayer.id === playerId) {
      room.game.nextTurn();
      io.to(roomId).emit('gameStateUpdate', room.game.getGameState());
    }
  });

  // Отправка сообщения в чат
  socket.on('sendMessage', ({ roomId, text, playerName }) => {
    if (rooms[roomId]) {
      io.to(roomId).emit('chatMessage', {
        playerName,
        text,
        time: new Date().toLocaleTimeString()
      });
    }
  });

  // Отключение
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Удаляем игрока из всех комнат, где он был
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const playerIndex = room.players.findIndex(p => p.id === socket.id);

      if (playerIndex !== -1) {
        const playerName = room.players[playerIndex].name;
        room.players.splice(playerIndex, 1);

        // Уведомляем остальных
        io.to(roomId).emit('chatMessage', {
          playerName: 'Система',
          text: `${playerName} покинул игру.`,
          time: new Date().toLocaleTimeString()
        });
        io.to(roomId).emit('roomUpdate', room);

        // Если комната пуста, удаляем её
        if (room.players.length === 0) {
          delete rooms[roomId];
        }

        io.emit('roomsList', getRoomsList());
      }
    }
  });
});

function joinRoom(socket, roomId, playerName) {
  const room = rooms[roomId];
  if (!room) {
    socket.emit('error', 'Комната не найдена');
    return;
  }
  if (room.players.length >= room.maxPlayers) {
    socket.emit('error', 'Комната заполнена');
    return;
  }

  const player = {
    id: socket.id,
    name: playerName,
    // В будущем здесь будут поля для самой игры (деньги, позиция и т.д.)
  };

  room.players.push(player);
  socket.join(roomId);

  // Уведомляем игрока
  socket.emit('joinedRoom', room);

  // Уведомляем остальных в комнате
  socket.to(roomId).emit('chatMessage', {
    playerName: 'Система',
    text: `${playerName} присоединился к игре!`,
    time: new Date().toLocaleTimeString()
  });

  // Обновляем состояние комнаты для всех в ней
  io.to(roomId).emit('roomUpdate', room);

  // Обновляем список комнат для лобби
  io.emit('roomsList', getRoomsList());
}

function getRoomsList() {
  return Object.keys(rooms).map(roomId => ({
    id: roomId,
    name: rooms[roomId].name,
    playersCount: rooms[roomId].players.length,
    maxPlayers: rooms[roomId].maxPlayers
  }));
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
