import React from 'react';
import '../index.css';

const Board = ({ gameState, playerId }) => {
  if (!gameState || !gameState.board) return null;

  return (
    <div className="monopoly-board-wrapper">
       <div className="monopoly-board">
         {/* Центр поля */}
         <div className="board-center clay-card flex-col center-content">
            <h1 className="logo">МОНОПОЛИЯ</h1>
            <div className="dice-display flex-row">
               <div className="die">{gameState.currentDice[0]}</div>
               <div className="die">{gameState.currentDice[1]}</div>
            </div>
            {gameState.state === 'game_over' && <h2 className="error mt-sm">Игра Окончена</h2>}
         </div>

         {/* Клетки поля */}
         {gameState.board.map((cell, index) => {
            const playersOnCell = gameState.players.filter(p => p.position === index && !p.bankrupt);
            const isOwner = cell.owner === playerId;
            const ownerPlayer = gameState.players.find(p => p.id === cell.owner);
            
            let cellClass = 'cell ';
            if (index === 0 || index === 10 || index === 20 || index === 30) cellClass += 'corner ';
            else if (index > 0 && index < 10) cellClass += 'bottom-row ';
            else if (index > 10 && index < 20) cellClass += 'left-col ';
            else if (index > 20 && index < 30) cellClass += 'top-row ';
            else if (index > 30 && index < 40) cellClass += 'right-col ';

            // Генерация индикаторов домов
            let houses = [];
            if (cell.houses > 0) {
              if (cell.houses === 5) {
                houses.push(<div key="hotel" className="hotel-indicator" title="Отель"></div>);
              } else {
                for (let i = 0; i < cell.houses; i++) {
                  houses.push(<div key={i} className="house-indicator" title="Дом"></div>);
                }
              }
            }

            return (
              <div key={index} className={`${cellClass} cell-${index}`}>
                 {cell.color && (
                    <div className="color-bar" style={{ backgroundColor: cell.color }}>
                      {houses}
                    </div>
                 )}
                 
                 <div className="cell-content">
                    <span className="cell-name">{cell.name}</span>
                    {cell.price > 0 && <span className="cell-price">${cell.price}</span>}
                    {cell.owner && ownerPlayer && (
                       <span className="cell-owner" style={{ color: ownerPlayer.color }}>
                          {isOwner ? '(Вы)' : ownerPlayer.name}
                       </span>
                    )}
                 </div>
                 
                 <div className="players-on-cell">
                    {playersOnCell.map((p, pIdx) => (
                       <div key={pIdx} className="player-token" style={{ backgroundColor: p.color }} title={p.name}></div>
                    ))}
                 </div>
              </div>
            );
         })}
       </div>
    </div>
  );
};

export default Board;
