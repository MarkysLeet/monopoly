import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';
import './index.css';

// Генерируем уникальный ID для игрока, чтобы идентифицировать его при перезагрузках
const getOrCreatePlayerId = () => {
  let id = localStorage.getItem('playerId');
  if (!id) {
    id = `user_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('playerId', id);
  }
  return id;
};

function App() {
  const [playerName, setPlayerName] = useState(localStorage.getItem('playerName') || '');
  const [playerId] = useState(getOrCreatePlayerId());

  useEffect(() => {
    localStorage.setItem('playerName', playerName);
  }, [playerName]);

  return (
    <Router>
      <div className="App clay-bg">
        <Routes>
          <Route path="/" element={<Home setPlayerName={setPlayerName} playerName={playerName} />} />
          <Route path="/lobby" element={<Lobby playerName={playerName} playerId={playerId} />} />
          <Route path="/room/:roomId" element={<GameRoom playerName={playerName} playerId={playerId} />} />
        </Routes>
      </div>
    </Router>
  );
}

function Home({ setPlayerName, playerName }) {
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    if (playerName.trim()) {
      navigate('/lobby');
    }
  };

  return (
    <div className="home-container">
      <div className="clay-card home-card">
        <h1 className="title">Монополия</h1>
        <form onSubmit={handleJoin}>
          <div className="input-group">
            <input
              type="text"
              placeholder="Введите ваш никнейм"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="clay-input"
              required
            />
          </div>
          <button type="submit" className="clay-btn primary-btn full-width">
            Войти в игру
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
