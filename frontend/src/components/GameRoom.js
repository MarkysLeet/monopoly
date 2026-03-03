import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { joinRoom, getRoomState, startGame, performAction } from '../api';
import Board from './Board';
import TradeModal from './TradeModal';
import '../index.css';

function GameRoom({ playerName, playerId }) {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTradeModal, setShowTradeModal] = useState(false);

  useEffect(() => {
    if (!playerName) {
      navigate('/');
      return;
    }

    const init = async () => {
      try {
        const { room: r, gameState: g } = await joinRoom(roomId, playerName, playerId);
        setRoom(r);
        setGameState(g);
        setLoading(false);
      } catch (err) {
        setError(err.message || 'Ошибка подключения');
        setLoading(false);
      }
    };
    init();

    const fetchState = async () => {
      try {
        const { room: r, gameState: g } = await getRoomState(roomId);
        if (r) setRoom(r);
        if (g) setGameState(g);
      } catch (err) {
        console.error(err);
      }
    };

    const interval = setInterval(fetchState, 1500);
    return () => clearInterval(interval);
  }, [roomId, playerName, playerId, navigate]);

  if (loading) return <div className="clay-container container center-text"><h2>Загрузка...</h2></div>;
  if (error) return <div className="clay-container container center-text"><h2 className="error">{error}</h2></div>;

  const handleStartGame = async () => {
    try {
      await startGame(roomId);
    } catch (e) {
      alert(e.message || 'Не удалось начать игру');
    }
  };

  const handleRollDice = async () => performAction(roomId, 'rollDice', playerId);
  const handleEndTurn = async () => performAction(roomId, 'endTurn', playerId);
  const handleBuy = async (buy) => performAction(roomId, 'buyProperty', playerId, { buy });
  const handlePayJail = async () => performAction(roomId, 'payJail', playerId);
  const handleBuildHouse = async (propertyId) => performAction(roomId, 'buildHouse', playerId, { propertyId });
  const handleTradeResponse = async (accept) => performAction(roomId, 'respondTrade', playerId, { accept });

  const isMyTurn = gameState && !gameState.players.find(p => p.id === playerId)?.bankrupt && gameState.players[gameState.turnIndex].id === playerId;
  const myPlayer = gameState?.players.find(p => p.id === playerId);
  const myProperties = gameState?.board.filter(c => c.owner === playerId && c.type === 'street');

  return (
    <div className="game-room container">
      <div className="game-header clay-card flex-row-between">
        <h2 className="clay-title">Комната: {room.name}</h2>
        {room.status === 'waiting' && room.players.length >= 2 && room.players[0].id === playerId && (
          <button className="clay-btn primary-btn" onClick={handleStartGame}>Начать игру</button>
        )}
      </div>

      {room.status === 'waiting' ? (
        <div className="waiting-room flex-col">
          <div className="clay-card list-card full-width">
             <h3>Ожидание игроков... ({room.players.length}/4)</h3>
             <ul className="players-list">
               {room.players.map((p, i) => <li key={i} className="clay-list-item">{p.name} {p.id === playerId ? '(Вы)' : ''}</li>)}
             </ul>
          </div>
        </div>
      ) : (
        <div className="gameplay-area flex-row">
          <div className="board-section clay-card flex-grow">
             {gameState && <Board gameState={gameState} playerId={playerId} />}
          </div>
          
          <div className="side-panel flex-col">
            <div className="clay-card logs-card">
              <h3>Игроки</h3>
              <ul className="players-stats list-unstyled">
                {gameState?.players.map((p, i) => (
                   <li key={i} className={`player-stat ${i === gameState.turnIndex ? 'active-turn' : ''} ${p.bankrupt ? 'bankrupt' : ''}`}>
                      <span className="dot" style={{ backgroundColor: p.color }}></span> 
                      <strong>{p.name}</strong> - ${p.money}
                      {p.bankrupt && <span className="badge error">Банкрот</span>}
                      {p.inJail && <span className="badge warning">В тюрьме</span>}
                   </li>
                ))}
              </ul>
            </div>
            
            <div className="clay-card controls-card">
              <h3>Действия</h3>
              
              {isMyTurn && gameState?.state === 'waiting_roll' && myPlayer?.inJail && myPlayer.jailTurns >= 3 && (
                 <button className="clay-btn danger-btn full-width mt-sm" onClick={handlePayJail}>Заплатить штраф $50</button>
              )}
              {isMyTurn && gameState?.state === 'waiting_roll' && !myPlayer?.inJail && (
                 <button className="clay-btn primary-btn full-width" onClick={handleRollDice}>Бросить кубик</button>
              )}
              {isMyTurn && gameState?.state === 'waiting_buy' && (
                 <div className="flex-col gap-sm">
                    <p className="text-muted text-center">Хотите купить: {gameState.board[myPlayer.position].name} за ${gameState.board[myPlayer.position].price}?</p>
                    <button className="clay-btn success-btn full-width" onClick={() => handleBuy(true)}>Купить</button>
                    <button className="clay-btn danger-btn full-width" onClick={() => handleBuy(false)}>Отказаться</button>
                 </div>
              )}
              {isMyTurn && gameState?.state === 'waiting_roll' && gameState?.currentDice[0] && !myPlayer?.inJail && (
                 <button className="clay-btn secondary-btn full-width mt-sm" onClick={handleEndTurn}>Завершить ход</button>
              )}
              
              {!isMyTurn && <p className="text-muted center-text mt-sm">Ожидайте свой ход...</p>}

              {/* Trade button - available anytime it's my turn or I just wait */}
              {!gameState?.pendingTrade && !myPlayer?.bankrupt && gameState?.players.filter(p => !p.bankrupt).length > 1 && (
                <button className="clay-btn secondary-btn full-width mt-sm" onClick={() => setShowTradeModal(true)}>Предложить обмен</button>
              )}
            </div>

            {/* Incoming Trade Alert */}
            {gameState?.pendingTrade && gameState.pendingTrade.toId === playerId && (
              <div className="clay-card list-card" style={{ border: '2px solid var(--warning-color)' }}>
                <h3>Входящий обмен от {gameState.pendingTrade.fromName}</h3>
                <p>Предлагает: ${gameState.pendingTrade.offerMoney} + {gameState.pendingTrade.offerProperties.length} недвиж.</p>
                <p>Просит: ${gameState.pendingTrade.requestMoney} + {gameState.pendingTrade.requestProperties.length} недвиж.</p>
                <div className="flex-row-between mt-sm">
                   <button className="clay-btn success-btn" onClick={() => handleTradeResponse(true)}>Принять</button>
                   <button className="clay-btn danger-btn" onClick={() => handleTradeResponse(false)}>Отклонить</button>
                </div>
              </div>
            )}
            {gameState?.pendingTrade && gameState.pendingTrade.fromId === playerId && (
              <div className="clay-card list-card">
                <p className="text-muted center-text">Ожидание ответа на обмен от {gameState.pendingTrade.toName}...</p>
              </div>
            )}

            {myProperties?.length > 0 && (
              <div className="clay-card build-card">
                <h3>Ваша недвижимость (Строительство)</h3>
                <div className="scrollable" style={{ maxHeight: '150px' }}>
                  {myProperties.map(prop => (
                    <div key={prop.id} className="flex-row-between mt-sm">
                      <span style={{ fontSize: '0.8rem' }}>{prop.name} (Домов: {prop.houses}/5)</span>
                      <button 
                        className="clay-btn success-btn" 
                        style={{ padding: '0.3rem 0.5rem', fontSize: '0.7rem' }}
                        disabled={prop.houses >= 5 || myPlayer.money < prop.houseCost || (!isMyTurn && gameState?.state !== 'waiting_roll')}
                        onClick={() => handleBuildHouse(prop.id)}
                      >
                        Строить (${prop.houseCost})
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="clay-card logs-card flex-grow scrollable">
               <h3>События</h3>
               {gameState?.logs.slice().reverse().map((log, idx) => (
                  <p key={idx} className="log-entry">
                    <span className="log-time">[{log.time}]</span> {log.msg}
                  </p>
               ))}
            </div>
          </div>
        </div>
      )}
      
      {showTradeModal && gameState && (
        <TradeModal 
          gameState={gameState} 
          playerId={playerId} 
          roomId={roomId} 
          onClose={() => setShowTradeModal(false)} 
        />
      )}
    </div>
  );
}

export default GameRoom;
