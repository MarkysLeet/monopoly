import React from 'react';

function Board({ boardState, players }) {
  // Классическая доска Монополии состоит из 40 клеток.
  // 0-10: нижний ряд (справа налево)
  // 10-20: левый ряд (снизу вверх)
  // 20-30: верхний ряд (слева направо)
  // 30-40: правый ряд (сверху вниз)

  const bottomRow = boardState.slice(0, 11).reverse();
  const leftRow = boardState.slice(11, 20).reverse();
  const topRow = boardState.slice(20, 31);
  const rightRow = boardState.slice(31, 40);

  const renderCell = (cell) => {
    // Ищем игроков на этой клетке
    const playersHere = players.filter((p) => p.position === cell.id);

    return (
      <div
        key={cell.id}
        style={{
          border: '1px solid #333',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2px',
          boxSizing: 'border-box',
          position: 'relative',
          backgroundColor: '#fff',
          textAlign: 'center',
          fontSize: '10px',
        }}
      >
        {cell.color && (
          <div
            style={{
              width: '100%',
              height: '15px',
              backgroundColor: cell.color,
              borderBottom: '1px solid #333',
            }}
          />
        )}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '2px' }}>
          {cell.name}
        </div>
        {cell.price > 0 && <div style={{ fontSize: '9px', fontWeight: 'bold' }}>{cell.price}$</div>}

        {/* Индикатор владельца */}
        {cell.owner && (
          <div
            style={{
              position: 'absolute',
              bottom: '2px',
              right: '2px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: players.find((p) => p.id === cell.owner)?.color || 'grey',
            }}
            title="Владелец"
          />
        )}

        {/* Фишки игроков */}
        <div style={{ display: 'flex', gap: '2px', position: 'absolute', top: '2px', left: '2px' }}>
          {playersHere.map((p) => (
            <div
              key={p.id}
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: p.color,
                border: '1px solid #000',
              }}
              title={p.name}
            />
          ))}
        </div>
      </div>
    );
  };

  // Создаем массивы клеток для каждой стороны
  const topRowCells = boardState.slice(20, 31);
  const rightColCells = boardState.slice(31, 40);
  const bottomRowCells = boardState.slice(0, 11).reverse();
  const leftColCells = boardState.slice(11, 20).reverse();

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '85vh', // Ограничиваем максимальный размер, чтобы доска не обрезалась
        aspectRatio: '1 / 1', // Квадратная доска
        backgroundColor: '#cde6d0',
        display: 'grid',
        margin: '0 auto',
        // 11 столбцов и 11 строк
        gridTemplateColumns: 'repeat(11, 1fr)',
        gridTemplateRows: 'repeat(11, 1fr)',
        gap: '2px',
        padding: '2px',
        border: '2px solid #333',
      }}
    >
      {/* Верхний ряд (от "Свободная стоянка" до "В тюрьму") */}
      {topRowCells.map((cell) => (
        <div key={cell.id} style={{ gridRow: '1', gridColumn: 'auto' }}>
          {renderCell(cell)}
        </div>
      ))}

      {/* Средняя часть: левый и правый столбцы */}
      {leftColCells.map((cell, index) => {
        const rightCell = rightColCells[index];
        const gridRow = index + 2; // со 2 по 10 строку
        return (
          <React.Fragment key={cell.id}>
            <div style={{ gridRow: gridRow, gridColumn: '1' }}>{renderCell(cell)}</div>
            {index === 0 && (
              <div
                style={{
                  gridRow: '2 / 11',
                  gridColumn: '2 / 11',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                  color: '#333',
                  opacity: 0.2,
                  fontWeight: 'bold',
                  fontFamily: 'sans-serif',
                  transform: 'rotate(-45deg)',
                }}
              >
                МОНОПОЛИЯ
              </div>
            )}
            <div style={{ gridRow: gridRow, gridColumn: '11' }}>{renderCell(rightCell)}</div>
          </React.Fragment>
        );
      })}

      {/* Нижний ряд (от "Вперед" до "Тюрьма") */}
      {bottomRowCells.map((cell) => (
        <div key={cell.id} style={{ gridRow: '11', gridColumn: 'auto' }}>
          {renderCell(cell)}
        </div>
      ))}
    </div>
  );
}

export default Board;
