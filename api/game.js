const { boardData } = require('./board');

const chanceCards = [
  { text: 'Отправляйтесь на поле Вперед (получите $200)', action: 'advance', pos: 0 },
  { text: 'Банк платит вам дивиденды $50', action: 'addMoney', amount: 50 },
  { text: 'Оплатите штраф за превышение скорости $15', action: 'subMoney', amount: 15 },
  { text: 'Отправляйтесь в тюрьму!', action: 'goto_jail' },
  { text: 'Отправляйтесь на Тверскую', action: 'advance', pos: 21 },
  { text: 'Вы выиграли в конкурсе кроссвордов $100', action: 'addMoney', amount: 100 }
];

const chestCards = [
  { text: 'Ошибка банка в вашу пользу. Получите $200', action: 'addMoney', amount: 200 },
  { text: 'Оплата услуг врача. Заплатите $50', action: 'subMoney', amount: 50 },
  { text: 'Возврат налогов. Получите $20', action: 'addMoney', amount: 20 },
  { text: 'Отправляйтесь в тюрьму!', action: 'goto_jail' },
  { text: 'Получите наследство $100', action: 'addMoney', amount: 100 }
];

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
      color: ['#ff6b6b', '#4a90e2', '#50c878', '#f1c40f'][index]
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
    if (this.currentDice[0] === this.currentDice[1] && !this.currentPlayer.inJail && this.doublesCount > 0 && this.doublesCount < 3) {
      this.state = 'waiting_roll';
      return;
    }

    this.doublesCount = 0;
    let nextIdx = (this.turnIndex + 1) % this.players.length;

    let iterations = 0;
    while (this.players[nextIdx].bankrupt && iterations < this.players.length) {
      nextIdx = (nextIdx + 1) % this.players.length;
      iterations++;
    }

    if (iterations >= this.players.length - 1) {
      this.state = 'game_over';
      const winner = this.players.find(p => !p.bankrupt);
      if (winner) this.addLog(`${winner.name} победил!`);
      return;
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
            this.addLog(`${this.currentPlayer.name} обязан заплатить штраф $50 чтобы выйти!`);
            // Если он не заплатит (кнопка), то станет банкротом на след ходу если нет денег
        } else {
            this.addLog(`${this.currentPlayer.name} остается в тюрьме.`);
            this.nextTurn();
        }
      }
    } else {
      this.movePlayer(total);
    }

    return this.getGameState();
  }

  payJail(playerId) {
    if (this.currentPlayer.id !== playerId || !this.currentPlayer.inJail) return null;
    
    if (this.currentPlayer.money >= 50) {
      this.currentPlayer.money -= 50;
      this.currentPlayer.inJail = false;
      this.currentPlayer.jailTurns = 0;
      this.addLog(`${this.currentPlayer.name} заплатил $50 и вышел из тюрьмы.`);
      this.state = 'waiting_roll';
    } else {
      this.addLog(`${this.currentPlayer.name} не может заплатить штраф и становится банкротом!`);
      this.declareBankrupt(this.currentPlayer);
      this.nextTurn();
    }
    return this.getGameState();
  }

  movePlayer(steps) {
    const player = this.currentPlayer;
    let newPos = player.position + steps;

    if (newPos >= 40) {
      newPos -= 40;
      player.money += 200;
      this.addLog(`${player.name} прошел поле Вперед и получил $200`);
    }

    player.position = newPos;
    const cell = this.board[newPos];

    this.addLog(`${player.name} попадает на ${cell.name}`);
    this.handleCellAction(cell, player);
  }

  handleCellAction(cell, player) {
    if (['street', 'railroad', 'utility'].includes(cell.type)) {
      if (!cell.owner) {
        this.state = 'waiting_buy';
      } else if (cell.owner !== player.id) {
        const rentAmount = this.calculateRent(cell);
        player.money -= rentAmount;
        const owner = this.players.find(p => p.id === cell.owner);
        if (owner) {
          owner.money += rentAmount;
          this.addLog(`${player.name} платит аренду $${rentAmount} игроку ${owner.name}`);
        }

        if (player.money < 0) {
          this.addLog(`${player.name} обанкротился!`);
          this.declareBankrupt(player);
        }
        this.nextTurn();
      } else {
        this.nextTurn();
      }
    } else if (cell.type === 'tax') {
      player.money -= cell.taxAmount;
      this.addLog(`${player.name} платит налог $${cell.taxAmount}`);
      if (player.money < 0) this.declareBankrupt(player);
      this.nextTurn();
    } else if (cell.type === 'goto_jail') {
      this.goToJail();
      this.nextTurn();
    } else if (cell.type === 'chance' || cell.type === 'chest') {
      this.drawCard(cell.type, player);
    } else {
      this.nextTurn();
    }
  }

  drawCard(type, player) {
    const deck = type === 'chance' ? chanceCards : chestCards;
    const card = deck[Math.floor(Math.random() * deck.length)];
    this.addLog(`Карточка (${type === 'chance' ? 'Шанс' : 'Казна'}): ${card.text}`);

    if (card.action === 'addMoney') {
      player.money += card.amount;
      this.nextTurn();
    } else if (card.action === 'subMoney') {
      player.money -= card.amount;
      if (player.money < 0) this.declareBankrupt(player);
      this.nextTurn();
    } else if (card.action === 'goto_jail') {
      this.goToJail();
      this.nextTurn();
    } else if (card.action === 'advance') {
      let steps = card.pos - player.position;
      if (steps < 0) steps += 40;
      this.movePlayer(steps);
    }
  }

  calculateRent(cell) {
    if (cell.type === 'street') {
      return cell.rent[cell.houses] || cell.rent[0];
    } else if (cell.type === 'railroad') {
      // Подсчет количества ЖД у владельца
      let count = this.board.filter(c => c.type === 'railroad' && c.owner === cell.owner).length;
      return cell.rent[count - 1] || cell.rent[0];
    } else if (cell.type === 'utility') {
      let count = this.board.filter(c => c.type === 'utility' && c.owner === cell.owner).length;
      const multiplier = count === 2 ? 10 : 4;
      return (this.currentDice[0] + this.currentDice[1]) * multiplier;
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
        this.addLog(`${player.name} купил ${cell.name} за $${cell.price}`);
      } else {
        this.addLog(`${player.name} не хватает денег на ${cell.name}`);
      }
    } else {
      this.addLog(`${player.name} отказался от покупки ${cell.name}`);
    }

    this.nextTurn();
    return this.getGameState();
  }

  buildHouse(playerId, propertyId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return null;
    const cell = this.board.find(c => c.id === propertyId);
    if (!cell || cell.owner !== playerId || cell.type !== 'street') return null;

    // Упрощенная логика: можно строить до 5 домов (5й - отель), если есть деньги. (Без проверки полной монополии для упрощения геймплея на данном этапе)
    if (cell.houses < 5 && player.money >= cell.houseCost) {
      player.money -= cell.houseCost;
      cell.houses += 1;
      this.addLog(`${player.name} построил ${cell.houses === 5 ? 'отель' : 'дом'} на ${cell.name} за $${cell.houseCost}`);
    } else {
      this.addLog(`Невозможно построить дом на ${cell.name}`);
    }
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
    this.board.forEach(cell => {
      if (cell.owner === player.id) {
        cell.owner = null;
        cell.houses = 0;
      }
    });
  }

  proposeTrade(fromPlayerId, toPlayerId, offerProperties, requestProperties, offerMoney, requestMoney) {
    const fromPlayer = this.players.find(p => p.id === fromPlayerId);
    const toPlayer = this.players.find(p => p.id === toPlayerId);
    if (!fromPlayer || !toPlayer) return null;

    // Verify ownership and money
    if (offerMoney > fromPlayer.money) return null;
    for (let pId of offerProperties) {
      if (this.board.find(c => c.id === pId)?.owner !== fromPlayerId) return null;
    }
    for (let pId of requestProperties) {
      if (this.board.find(c => c.id === pId)?.owner !== toPlayerId) return null;
    }

    this.pendingTrade = {
      fromId: fromPlayerId,
      toId: toPlayerId,
      offerProperties,
      requestProperties,
      offerMoney: Number(offerMoney) || 0,
      requestMoney: Number(requestMoney) || 0,
      fromName: fromPlayer.name,
      toName: toPlayer.name
    };

    this.addLog(`${fromPlayer.name} предложил обмен игроку ${toPlayer.name}`);
    return this.getGameState();
  }

  respondTrade(playerId, accept) {
    if (!this.pendingTrade || this.pendingTrade.toId !== playerId) return null;

    const trade = this.pendingTrade;
    this.pendingTrade = null;

    if (accept) {
      const fromPlayer = this.players.find(p => p.id === trade.fromId);
      const toPlayer = this.players.find(p => p.id === trade.toId);

      // Final check before applying
      if (fromPlayer.money >= trade.offerMoney && toPlayer.money >= trade.requestMoney) {
        fromPlayer.money = fromPlayer.money - trade.offerMoney + trade.requestMoney;
        toPlayer.money = toPlayer.money - trade.requestMoney + trade.offerMoney;

        trade.offerProperties.forEach(pId => {
          const cell = this.board.find(c => c.id === pId);
          if (cell && cell.owner === fromPlayer.id) cell.owner = toPlayer.id;
        });

        trade.requestProperties.forEach(pId => {
          const cell = this.board.find(c => c.id === pId);
          if (cell && cell.owner === toPlayer.id) cell.owner = fromPlayer.id;
        });

        this.addLog(`${toPlayer.name} принял обмен от ${fromPlayer.name}`);
      } else {
         this.addLog(`Обмен отменен (недостаточно средств)`);
      }
    } else {
      this.addLog(`${this.players.find(p => p.id === playerId).name} отклонил обмен.`);
    }

    return this.getGameState();
  }

  getGameState() {
    return {
      board: this.board,
      players: this.players,
      turnIndex: this.turnIndex,
      state: this.state,
      logs: this.logs.slice(-15),
      currentDice: this.currentDice,
      pendingTrade: this.pendingTrade
    };
  }
}

module.exports = Game;
