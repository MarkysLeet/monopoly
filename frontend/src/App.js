import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';
import socket from './socket';

function App() {
  const [playerName, setPlayerName] = useState('');

  return (
    <Router>
      <div className="App" style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <Routes>
          <Route path="/" element={<Home setPlayerName={setPlayerName} playerName={playerName} />} />
          <Route path="/lobby" element={<Lobby playerName={playerName} />} />
          <Route path="/room/:roomId" element={<GameRoom playerName={playerName} />} />
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
    <div style={{ maxWidth: '400px', margin: '100px auto', textAlign: 'center', border: '1px solid #ccc', padding: '30px', borderRadius: '8px' }}>
      <h1>Монополия</h1>
      <form onSubmit={handleJoin}>
        <div style={{ marginBottom: '15px' }}>
          <input
            type="text"
            placeholder="Введите ваш никнейм"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            style={{ padding: '10px', width: '100%', boxSizing: 'border-box' }}
            required
          />
        </div>
        <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%' }}>
          Войти
        </button>
      </form>
    </div>
  );
}

export default App;
