const API_URL = '/api';

export const getRooms = async () => {
  const res = await fetch(`${API_URL}/rooms`);
  return res.json();
};

export const createRoom = async (roomName, playerName, playerId) => {
  const res = await fetch(`${API_URL}/rooms/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomName, playerName, playerId })
  });
  return res.json();
};

export const joinRoom = async (roomId, playerName, playerId) => {
  const res = await fetch(`${API_URL}/rooms/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, playerName, playerId })
  });
  return res.json();
};

export const getRoomState = async (roomId) => {
  const res = await fetch(`${API_URL}/rooms/${roomId}`);
  return res.json();
};

export const startGame = async (roomId) => {
  const res = await fetch(`${API_URL}/rooms/${roomId}/start`, { method: 'POST' });
  return res.json();
};

export const performAction = async (roomId, action, playerId, payload = {}) => {
  const res = await fetch(`${API_URL}/rooms/${roomId}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, playerId, ...payload })
  });
  return res.json();
};
