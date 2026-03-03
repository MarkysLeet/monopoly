import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRooms, createRoom } from '../api';

function Lobby({ playerName, playerId }) {
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!playerName) {
      navigate('/');
      return;
    }

    const fetchRooms = async () => {
      try {
        const data = await getRooms();
        setRooms(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchRooms();
    const interval = setInterval(fetchRooms, 3000); // Polling каждые 3 сек
    return () => clearInterval(interval);
  }, [navigate, playerName]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (newRoomName.trim()) {
      try {
        const { roomId } = await createRoom(newRoomName, playerName, playerId);
        navigate(`/room/${roomId}`);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="lobby-container container">
      <h2 className="clay-title">Лобби</h2>

      <div className="clay-card create-room-card">
        <h3>Создать новую комнату</h3>
        <form onSubmit={handleCreateRoom} className="flex-row">
          <input
            type="text"
            placeholder="Название комнаты"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            required
            className="clay-input"
          />
          <button type="submit" className="clay-btn primary-btn">Создать</button>
        </form>
      </div>

      <div className="clay-card rooms-list-card">
        <h3>Доступные комнаты</h3>
        {rooms.length === 0 ? (
          <p className="text-muted">Нет доступных комнат.</p>
        ) : (
          <ul className="rooms-list">
            {rooms.map((room) => (
              <li key={room.id} className="clay-list-item flex-row-between">
                <div>
                  <strong>{room.name}</strong>
                  <span className="badge">{room.playersCount}/{room.maxPlayers}</span>
                  {room.status === 'playing' && <span className="badge playing">В игре</span>}
                </div>
                <button
                  className="clay-btn secondary-btn"
                  onClick={() => navigate(`/room/${room.id}`)}
                  disabled={room.playersCount >= room.maxPlayers || room.status === 'playing'}
                >
                  Присоединиться
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Lobby;
