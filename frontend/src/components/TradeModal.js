import React, { useState } from 'react';
import { performAction } from '../api';

function TradeModal({ gameState, playerId, roomId, onClose }) {
  const [targetPlayerId, setTargetPlayerId] = useState('');
  const [offerProperties, setOfferProperties] = useState([]);
  const [requestProperties, setRequestProperties] = useState([]);
  const [offerMoney, setOfferMoney] = useState(0);
  const [requestMoney, setRequestMoney] = useState(0);

  const me = gameState.players.find(p => p.id === playerId);
  const otherPlayers = gameState.players.filter(p => p.id !== playerId && !p.bankrupt);
  const targetPlayer = targetPlayerId ? gameState.players.find(p => p.id === targetPlayerId) : null;

  const myProps = gameState.board.filter(c => c.owner === playerId && ['street', 'railroad', 'utility'].includes(c.type));
  const theirProps = targetPlayerId ? gameState.board.filter(c => c.owner === targetPlayerId && ['street', 'railroad', 'utility'].includes(c.type)) : [];

  const handlePropose = async () => {
    if (!targetPlayerId) return;
    try {
      await performAction(roomId, 'proposeTrade', playerId, {
        toPlayerId: targetPlayerId,
        offerProperties,
        requestProperties,
        offerMoney,
        requestMoney
      });
      onClose();
    } catch (e) {
      console.error(e);
      alert('Ошибка при предложении обмена');
    }
  };

  const toggleProp = (id, list, setList) => {
    if (list.includes(id)) {
      setList(list.filter(item => item !== id));
    } else {
      setList([...list, id]);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="clay-card trade-modal">
        <h3>Предложить обмен</h3>
        <div className="flex-col gap-sm mb-md">
          <label>Выберите игрока:</label>
          <select className="clay-input" value={targetPlayerId} onChange={e => {
            setTargetPlayerId(e.target.value);
            setRequestProperties([]);
          }}>
            <option value="">-- Выберите --</option>
            {otherPlayers.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {targetPlayer && (
          <div className="trade-sections flex-row">
            <div className="flex-grow trade-side">
              <h4>Вы предлагаете:</h4>
              <div className="flex-col gap-sm">
                 <input type="number" min="0" max={me.money} value={offerMoney} onChange={e => setOfferMoney(Number(e.target.value))} className="clay-input" placeholder="Деньги" />
                 <div className="scrollable" style={{maxHeight: '150px'}}>
                   {myProps.map(p => (
                     <label key={p.id} className="flex-row gap-sm" style={{fontSize: '0.8rem'}}>
                       <input type="checkbox" checked={offerProperties.includes(p.id)} onChange={() => toggleProp(p.id, offerProperties, setOfferProperties)} />
                       {p.name}
                     </label>
                   ))}
                 </div>
              </div>
            </div>
            
            <div className="flex-grow trade-side">
              <h4>Вы просите:</h4>
              <div className="flex-col gap-sm">
                 <input type="number" min="0" max={targetPlayer.money} value={requestMoney} onChange={e => setRequestMoney(Number(e.target.value))} className="clay-input" placeholder="Деньги" />
                 <div className="scrollable" style={{maxHeight: '150px'}}>
                   {theirProps.map(p => (
                     <label key={p.id} className="flex-row gap-sm" style={{fontSize: '0.8rem'}}>
                       <input type="checkbox" checked={requestProperties.includes(p.id)} onChange={() => toggleProp(p.id, requestProperties, setRequestProperties)} />
                       {p.name}
                     </label>
                   ))}
                 </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-row-between mt-sm">
          <button className="clay-btn secondary-btn" onClick={onClose}>Отмена</button>
          <button className="clay-btn primary-btn" disabled={!targetPlayerId} onClick={handlePropose}>Отправить предложение</button>
        </div>
      </div>
    </div>
  );
}

export default TradeModal;
