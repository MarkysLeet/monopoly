import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket';
import Board from './Board';

function GameRoom({ playerName }) {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!playerName) {
      navigate('/');
      return;
    }

    // Если мы перезагрузили страницу, нужно переподключиться
    if (!room && !socket.connected) {
      navigate('/lobby');
    }

    // Запрашиваем состояние комнаты при монтировании,
    // чтобы получить свежие данные, если мы пропустили эвент joinRoom
    socket.emit('getRoomState', { roomId });

    socket.on('roomUpdate', (updatedRoom) => {
      setRoom(updatedRoom);
    });

    socket.on('gameStarted', (state) => {
      setGameState(state);
    });

    socket.on('gameStateUpdate', (state) => {
      setGameState(state);
    });

    socket.on('chatMessage', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off('roomUpdate');
      socket.off('gameStarted');
      socket.off('gameStateUpdate');
      socket.off('chatMessage');
    };
  }, [playerName, navigate, roomId, room]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      socket.emit('sendMessage', { roomId, text: newMessage, playerName });
      setNewMessage('');
    }
  };

  const leaveRoom = () => {
    navigate('/lobby');
    // server handles disconnect
  };

  const handleStartGame = () => {
    socket.emit('startGame', { roomId });
  };

  const handleRollDice = () => {
    socket.emit('rollDice', { roomId, playerId: socket.id });
  };

  const handleBuy = (buy) => {
    socket.emit('buyProperty', { roomId, playerId: socket.id, buy });
  };

  if (!room) {
    return <div>Загрузка комнаты...</div>;
  }

  const isCreator = room.players[0] && room.players[0].id === socket.id;
  const isMyTurn = gameState && gameState.players[gameState.turnIndex].id === socket.id;

  return (
    <div style={{ display: 'flex', gap: '20px', maxWidth: '1400px', margin: '0 auto', height: '95vh', padding: '10px' }}>
      {/* Игровое поле */}
      <div style={{ flex: 3, border: '1px solid #000', borderRadius: '8px', padding: '10px', backgroundColor: '#e6ffe6', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {gameState ? (
          <Board boardState={gameState.board} players={gameState.players} />
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <h2>Ожидание начала игры...</h2>
            {isCreator && room.players.length >= 2 && (
              <button onClick={handleStartGame} style={{ padding: '10px 20px', fontSize: '18px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                Начать игру
              </button>
            )}
            {room.players.length < 2 && <p>Для начала нужно минимум 2 игрока.</p>}
          </div>
        )}
      </div>

      {/* Панель управления и чат */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto' }}>

        {/* Инфо о комнате */}
        <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '10px' }}>
          <h3 style={{ margin: '0 0 10px 0' }}>Комната: {room.name}</h3>
          <button onClick={leaveRoom} style={{ padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', float: 'right' }}>
            Выйти
          </button>
          <div><b>Игроки ({room.players.length}/{room.maxPlayers}):</b></div>
          <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
            {room.players.map((p, idx) => {
               const playerState = gameState?.players.find(gp => gp.id === p.id);
               return (
                 <li key={idx}>
                   <b>{p.name}</b> {p.id === socket.id ? '(Вы)' : ''}
                   {playerState && (
                     <span style={{ marginLeft: '10px', color: playerState.bankrupt ? 'red' : 'green' }}>
                       - {playerState.money}$ {playerState.bankrupt ? '(Банкрот)' : ''}
                     </span>
                   )}
                 </li>
               );
            })}
          </ul>
        </div>

        {/* Игровые действия */}
        {gameState && (
          <div style={{ border: '2px solid #007bff', borderRadius: '8px', padding: '10px', backgroundColor: '#f8f9fa' }}>
             <h3 style={{ margin: '0 0 10px 0' }}>Управление</h3>
             <p>Текущий ход: <b>{gameState.players[gameState.turnIndex].name}</b></p>
             <div style={{ marginBottom: '10px' }}>
               Кубики: [ {gameState.currentDice[0]} ] [ {gameState.currentDice[1]} ]
             </div>

             {isMyTurn && gameState.state === 'waiting_roll' && (
               <button onClick={handleRollDice} style={{ padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%', marginBottom: '10px' }}>
                 Бросить кубики
               </button>
             )}

             {isMyTurn && gameState.state === 'waiting_buy' && (
               <div>
                 <p>Купить эту недвижимость?</p>
                 <button onClick={() => handleBuy(true)} style={{ padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '48%', marginRight: '4%' }}>Да</button>
                 <button onClick={() => handleBuy(false)} style={{ padding: '10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '48%' }}>Нет</button>
               </div>
             )}

             {gameState.state === 'game_over' && (
               <h3 style={{ color: 'red' }}>ИГРА ОКОНЧЕНА!</h3>
             )}

             <div style={{ marginTop: '15px', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
               <b>Логи игры:</b>
               <div style={{ height: '100px', overflowY: 'auto', fontSize: '12px', color: '#555', marginTop: '5px' }}>
                 {gameState.logs.map((log, i) => (
                   <div key={i}>[{log.time}] {log.msg}</div>
                 ))}
               </div>
             </div>
          </div>
        )}

        {/* Чат */}
        <div style={{ flex: 1, border: '1px solid #ccc', borderRadius: '8px', display: 'flex', flexDirection: 'column', minHeight: '200px' }}>
          <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #ccc', fontWeight: 'bold' }}>
            Игровой чат
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ fontSize: '14px' }}>
                <span style={{ color: '#888', fontSize: '12px' }}>[{msg.time}]</span>
                <b> {msg.playerName}:</b> {msg.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSendMessage} style={{ display: 'flex', borderTop: '1px solid #ccc' }}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Введите сообщение..."
              style={{ flex: 1, padding: '10px', border: 'none', outline: 'none' }}
            />
            <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>
              Отправить
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default GameRoom;
