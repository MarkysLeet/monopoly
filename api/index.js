const express = require('express');
const cors = require('cors');
const Game = require('./game');

const app = express();
app.use(cors());
app.use(express.json());

// Хранилище комнат и игроков (в памяти). В Vercel это может сбрасываться при холодном старте, 
// но для небольших игровых сессий и частых запросов контейнер может жить долго.
// В идеале нужен Redis/DB, но пока оставляем in-memory для простоты и скорости по ТЗ "без лишних интеграций"
let rooms = global.rooms || {};
global.rooms = rooms;

app.get('/api/rooms', (req, res) => {
  const availableRooms = Object.keys(rooms).map(roomId => ({
    id: roomId,
    name: rooms[roomId].name,
    playersCount: rooms[roomId].players.length,
    maxPlayers: rooms[roomId].maxPlayers,
    status: rooms[roomId].status
  }));
  res.json(availableRooms);
});

app.post('/api/rooms/create', (req, res) => {
  const { roomName, playerName, playerId } = req.body;
  if (!roomName || !playerName || !playerId) return res.status(400).json({ error: 'Missing data' });
  
  const roomId = `room_${Math.random().toString(36).substring(2, 9)}`;
  rooms[roomId] = {
    id: roomId,
    name: roomName,
    players: [],
    maxPlayers: 4,
    status: 'waiting', 
    game: null,
    messages: []
  };

  const player = { id: playerId, name: playerName };
  rooms[roomId].players.push(player);
  rooms[roomId].messages.push({ playerName: 'Система', text: `${playerName} создал комнату и присоединился!`, time: new Date().toLocaleTimeString() });

  res.json({ roomId, room: rooms[roomId] });
});

app.post('/api/rooms/join', (req, res) => {
  const { roomId, playerName, playerId } = req.body;
  const room = rooms[roomId];

  if (!room) return res.status(404).json({ error: 'Комната не найдена' });
  if (room.players.length >= room.maxPlayers) return res.status(400).json({ error: 'Комната заполнена' });
  if (room.status === 'playing') return res.status(400).json({ error: 'Игра уже идет' });
  
  if (!room.players.find(p => p.id === playerId)) {
    room.players.push({ id: playerId, name: playerName });
    room.messages.push({ playerName: 'Система', text: `${playerName} присоединился к игре!`, time: new Date().toLocaleTimeString() });
  }

  res.json({ room });
});

app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = rooms[roomId];
  if (!room) return res.status(404).json({ error: 'Комната не найдена' });

  let gameState = null;
  if (room.status === 'playing' && room.game) {
    gameState = room.game.getGameState();
  }

  res.json({ room, gameState });
});

app.post('/api/rooms/:roomId/start', (req, res) => {
  const { roomId } = req.params;
  const room = rooms[roomId];
  if (!room) return res.status(404).json({ error: 'Комната не найдена' });
  if (room.players.length < 2) return res.status(400).json({ error: 'Недостаточно игроков' });

  room.game = new Game(roomId, room.players);
  room.status = 'playing';
  res.json({ success: true, gameState: room.game.getGameState() });
});

app.post('/api/rooms/:roomId/action', (req, res) => {
  const { roomId } = req.params;
  const { action, playerId, ...payload } = req.body;
  const room = rooms[roomId];

  if (!room || !room.game) return res.status(404).json({ error: 'Игра не найдена' });
  if (room.game.currentPlayer.id !== playerId && action !== 'sendMessage') {
      return res.status(403).json({ error: 'Не ваш ход' });
  }

  try {
      let state = null;
      if (action === 'rollDice') {
        state = room.game.rollDice(playerId);
      } else if (action === 'buyProperty') {
        state = room.game.buyProperty(playerId, payload.buy);
      } else if (action === 'endTurn') {
        room.game.nextTurn();
        state = room.game.getGameState();
      } else if (action === 'sendMessage') {
        room.messages.push({ playerName: payload.playerName, text: payload.text, time: new Date().toLocaleTimeString() });
        return res.json({ success: true });
      } else if (action === 'payJail') {
        state = room.game.payJail(playerId);
      } else if (action === 'buildHouse') {
        state = room.game.buildHouse(playerId, payload.propertyId);
      } else if (action === 'proposeTrade') {
        state = room.game.proposeTrade(
            playerId, 
            payload.toPlayerId, 
            payload.offerProperties || [], 
            payload.requestProperties || [], 
            payload.offerMoney || 0, 
            payload.requestMoney || 0
        );
      } else if (action === 'respondTrade') {
        state = room.game.respondTrade(playerId, payload.accept);
      }
      res.json({ success: true, gameState: state || room.game.getGameState() });
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
  }
});

// Экспортируем app для Vercel Serverless
module.exports = app;

// Для локального запуска
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`API running on port ${PORT}`));
}
