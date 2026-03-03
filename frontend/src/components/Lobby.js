import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';

function Lobby({ playerName }) {
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!playerName) {
      navigate('/');
      return;
    }

    socket.emit('getRooms');

    socket.on('roomsList', (roomsList) => {
      setRooms(roomsList);
    });

    socket.on('joinedRoom', (room) => {
      navigate(`/room/${room.id}`);
    });

    socket.on('error', (err) => {
      setError(err);
    });

    return () => {
      socket.off('roomsList');
      socket.off('joinedRoom');
      socket.off('error');
    };
  }, [playerName, navigate]);

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (newRoomName.trim()) {
      socket.emit('createRoom', { roomName: newRoomName, playerName });
    }
  };

  const handleJoinRoom = (roomId) => {
    socket.emit('joinRoom', { roomId, playerName });
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2>Лобби</h2>
      <p>Привет, <b>{playerName}</b>!</p>

      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

      <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
        <div style={{ flex: 1, border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
          <h3>Создать комнату</h3>
          <form onSubmit={handleCreateRoom}>
            <input
              type="text"
              placeholder="Название комнаты"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              style={{ padding: '8px', width: '100%', marginBottom: '10px', boxSizing: 'border-box' }}
              required
            />
            <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Создать
            </button>
          </form>
        </div>

        <div style={{ flex: 2, border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
          <h3>Доступные комнаты</h3>
          {rooms.length === 0 ? (
            <p>Нет доступных комнат.</p>
          ) : (
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              {rooms.map((room) => (
                <li key={room.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', padding: '10px 0' }}>
                  <span><b>{room.name}</b> ({room.playersCount} / {room.maxPlayers})</span>
                  <button
                    onClick={() => handleJoinRoom(room.id)}
                    disabled={room.playersCount >= room.maxPlayers}
                    style={{ padding: '5px 10px', backgroundColor: room.playersCount >= room.maxPlayers ? '#ccc' : '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: room.playersCount >= room.maxPlayers ? 'not-allowed' : 'pointer' }}
                  >
                    Присоединиться
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default Lobby;
