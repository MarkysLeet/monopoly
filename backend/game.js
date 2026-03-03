const { boardData } = require('./board');

class Game {
  constructor(roomId, playersData) {
    this.roomId = roomId;
    this.board = boardData.map(cell => ({ ...cell, owner: null, houses: 0 }));
    this.players = playersData.map((p, index) => ({
      ...p,
      money: 1500,
      position: 0,
      inJail: false,
      jailTurns: 0,
      bankrupt: false,
      color: ['red', 'blue', 'green', 'yellow'][index] // цвета фишек
    }));

    this.turnIndex = 0;
    this.state = 'waiting_roll'; // waiting_roll, waiting_buy, game_over
    this.logs = [];
    this.currentDice = [1, 1];
    this.doublesCount = 0;
  }

  addLog(msg) {
    this.logs.push({ time: new Date().toLocaleTimeString(), msg });
  }

  get currentPlayer() {
    return this.players[this.turnIndex];
  }

  nextTurn() {
    // Если игрок выкинул дубль и не в тюрьме, он ходит снова (но не более 3 раз)
    if (this.currentDice[0] === this.currentDice[1] && !this.currentPlayer.inJail && this.doublesCount < 3) {
      this.state = 'waiting_roll';
      return;
    }

    this.doublesCount = 0;
    let nextIdx = (this.turnIndex + 1) % this.players.length;

    // Пропускаем банкротов
    while (this.players[nextIdx].bankrupt) {
      nextIdx = (nextIdx + 1) % this.players.length;
      if (nextIdx === this.turnIndex) {
        this.state = 'game_over';
        this.addLog(`${this.currentPlayer.name} победил!`);
        return;
      }
    }

    this.turnIndex = nextIdx;
    this.state = 'waiting_roll';
  }

  rollDice(playerId) {
    if (this.currentPlayer.id !== playerId) return null;
    if (this.state !== 'waiting_roll') return null;

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    this.currentDice = [d1, d2];
    const total = d1 + d2;
    const isDouble = d1 === d2;

    this.addLog(`${this.currentPlayer.name} выбросил ${d1} и ${d2}`);

    if (isDouble) {
      this.doublesCount++;
      if (this.doublesCount === 3) {
        this.addLog(`${this.currentPlayer.name} выбросил 3 дубля подряд и отправляется в тюрьму!`);
        this.goToJail();
        this.nextTurn();
        return this.getGameState();
      }
    }

    if (this.currentPlayer.inJail) {
      if (isDouble) {
        this.addLog(`${this.currentPlayer.name} выбросил дубль и выходит из тюрьмы!`);
        this.currentPlayer.inJail = false;
        this.currentPlayer.jailTurns = 0;
        this.movePlayer(total);
      } else {
        this.currentPlayer.jailTurns++;
        if (this.currentPlayer.jailTurns >= 3) {
          if (this.currentPlayer.money >= 50) {
            this.addLog(`${this.currentPlayer.name} платит штраф 50$ и выходит из тюрьмы.`);
            this.currentPlayer.money -= 50;
            this.currentPlayer.inJail = false;
            this.currentPlayer.jailTurns = 0;
            this.movePlayer(total);
          } else {
            this.addLog(`${this.currentPlayer.name} не может заплатить штраф и становится банкротом!`);
            this.declareBankrupt(this.currentPlayer);
            this.nextTurn();
            return this.getGameState();
          }
        } else {
          this.addLog(`${this.currentPlayer.name} остается в тюрьме.`);
          this.nextTurn();
          return this.getGameState();
        }
      }
    } else {
      this.movePlayer(total);
    }

    return this.getGameState();
  }

  movePlayer(steps) {
    const player = this.currentPlayer;
    let newPos = player.position + steps;

    if (newPos >= 40) {
      newPos -= 40;
      player.money += 200; // Прохождение поля Вперед
      this.addLog(`${player.name} прошел поле Вперед и получил 200$`);
    }

    player.position = newPos;
    const cell = this.board[newPos];

    this.addLog(`${player.name} попадает на ${cell.name}`);

    this.handleCellAction(cell, player);
  }

  handleCellAction(cell, player) {
    if (['street', 'railroad', 'utility'].includes(cell.type)) {
      if (!cell.owner) {
        // Можно купить
        this.state = 'waiting_buy';
      } else if (cell.owner !== player.id) {
        // Оплата аренды (базовая реализация, без учета монополий и количества домов)
        const rentAmount = this.calculateRent(cell);
        player.money -= rentAmount;
        const owner = this.players.find(p => p.id === cell.owner);
        if (owner) {
          owner.money += rentAmount;
          this.addLog(`${player.name} платит аренду ${rentAmount}$ игроку ${owner.name}`);
        }

        if (player.money < 0) {
          this.addLog(`${player.name} обанкротился!`);
          this.declareBankrupt(player);
        }
        this.nextTurn();
      } else {
        // Своя клетка
        this.nextTurn();
      }
    } else if (cell.type === 'tax') {
      player.money -= cell.taxAmount;
      this.addLog(`${player.name} платит налог ${cell.taxAmount}$`);
      if (player.money < 0) this.declareBankrupt(player);
      this.nextTurn();
    } else if (cell.type === 'goto_jail') {
      this.goToJail();
      this.nextTurn();
    } else {
      // Шанс, Казна, Парковка, Тюрьма (просто посетитель) - пока без действий
      this.nextTurn();
    }
  }

  calculateRent(cell) {
    if (cell.type === 'street') {
      return cell.rent[cell.houses] || cell.rent[0];
    } else if (cell.type === 'railroad') {
      // Упрощенно 25. По-хорошему надо считать кол-во ЖД у владельца
      return 25;
    } else if (cell.type === 'utility') {
      // Упрощенно
      return (this.currentDice[0] + this.currentDice[1]) * 4;
    }
    return 0;
  }

  buyProperty(playerId, buy) {
    if (this.currentPlayer.id !== playerId || this.state !== 'waiting_buy') return null;

    const player = this.currentPlayer;
    const cell = this.board[player.position];

    if (buy) {
      if (player.money >= cell.price) {
        player.money -= cell.price;
        cell.owner = player.id;
        this.addLog(`${player.name} купил ${cell.name} за ${cell.price}$`);
      } else {
        this.addLog(`${player.name} не хватает денег на ${cell.name}`);
      }
    } else {
      this.addLog(`${player.name} отказался от покупки ${cell.name}`);
    }

    this.nextTurn();
    return this.getGameState();
  }

  goToJail() {
    this.currentPlayer.position = 10;
    this.currentPlayer.inJail = true;
    this.currentPlayer.jailTurns = 0;
    this.addLog(`${this.currentPlayer.name} отправляется в тюрьму!`);
  }

  declareBankrupt(player) {
    player.bankrupt = true;
    // Возвращаем собственность банку
    this.board.forEach(cell => {
      if (cell.owner === player.id) {
        cell.owner = null;
        cell.houses = 0;
      }
    });
  }

  getGameState() {
    return {
      board: this.board,
      players: this.players,
      turnIndex: this.turnIndex,
      state: this.state,
      logs: this.logs.slice(-10), // последние 10 логов
      currentDice: this.currentDice
    };
  }
}

module.exports = Game;