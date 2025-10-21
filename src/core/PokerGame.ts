import type { Player, GameState, Settings, GameRound, PlayerRole } from '@/types'

/**
 * 德州扑克核心引擎
 * 职责：管理牌局状态、执行动作、提供状态查询
 * 不负责：UI 更新、AI 决策、流程自动推进
 */
export class PokerGame {
  players: Player[] = []
  communityCards: string[] = []
  pot: number = 0
  currentRound: GameRound | null = null
  currentPlayerIndex: number = -1
  highestBet: number = 0
  minRaise: number = 0
  lastRaiseAmount: number = 0
  deck: string[] = []
  lastAggressorIndex: number = -1
  preflopRaiseCount: number = 0
  dealerIndex: number = 0
  sbIndex: number = 0
  bbIndex: number = 0
  handCount: number = 0
  settings!: Settings
  usePresetHands: boolean = false
  usePresetCommunity: boolean = false
  presetCards: Settings['presetCards'] | null = null

  constructor() {
    this.handCount = 0
  }

  /**
   * 重置整个牌局（新游戏开始前调用）
   */
  reset(settings: Settings, forceDealerIndex: number | null = null): void {
    if (!settings) {
      throw new Error("Settings object must be provided to the game engine.")
    }
    this.settings = settings
    this.usePresetHands = this.settings && this.settings.usePresetHands
    this.usePresetCommunity = this.settings && this.settings.usePresetCommunity
    this.presetCards = this.settings ? this.settings.presetCards : null

    const playerCount = this.settings.playerCount
    // 玩家状态：根据设置创建
    this.players = Array.from({ length: playerCount }, (_, i) => {
      const min = Math.min(this.settings.minStack, this.settings.maxStack)
      const max = Math.max(this.settings.minStack, this.settings.maxStack)
      const randomStack = Math.floor(Math.random() * (max - min + 1)) + min

      return {
        id: `P${i + 1}`,
        stack: randomStack,
        holeCards: [],
        bet: 0,
        totalInvested: 0,
        isFolded: false,
        isAllIn: false,
        hasActed: false,
        role: null,
      }
    })

    this.communityCards = []
    this.pot = 0
    this.currentRound = null
    this.currentPlayerIndex = -1
    this.highestBet = 0
    this.minRaise = this.settings.bb
    this.lastRaiseAmount = this.settings.bb
    this.deck = []
    this.lastAggressorIndex = -1
    this.preflopRaiseCount = 0

    // 动态确定位置
    if (forceDealerIndex !== null) {
      this.dealerIndex = forceDealerIndex
    } else if (this.settings.p1Role === 'random') {
      this.dealerIndex = Math.floor(Math.random() * playerCount)
    } else {
      const roles = this._getRoleOrder(playerCount)
      const roleIndex = roles.indexOf(this.settings.p1Role as PlayerRole)

      if (roleIndex !== -1) {
        this.dealerIndex = playerCount - 1 - roleIndex
      } else {
        console.warn(`Role ${this.settings.p1Role} is not valid for ${playerCount} players. Assigning roles randomly.`)
        this.dealerIndex = Math.floor(Math.random() * playerCount)
      }
    }

    this.sbIndex = (this.dealerIndex + 1) % playerCount
    this.bbIndex = (this.dealerIndex + 2) % playerCount
    this.handCount++

    this._assignPlayerRoles()
  }

  /**
   * 根据玩家人数和庄家位置分配角色
   */
  private _assignPlayerRoles(): void {
    const playerCount = this.players.length
    const roles = this._getRoleOrder(playerCount)

    this.players.forEach(player => player.role = null)

    for (let i = 0; i < playerCount; i++) {
      const playerIndex = (this.dealerIndex + i + 1) % playerCount
      this.players[playerIndex].role = roles[i]
    }
  }

  /**
   * 根据玩家人数获取角色顺序
   */
  private _getRoleOrder(playerCount: number): PlayerRole[] {
    const baseRoles: PlayerRole[] = ['SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'MP1', 'MP2', 'HJ', 'CO', 'BTN']
    switch (playerCount) {
      case 2: return ['SB', 'BTN']
      case 3: return ['SB', 'BB', 'BTN']
      case 4: return ['SB', 'BB', 'CO', 'BTN']
      case 5: return ['SB', 'BB', 'UTG', 'CO', 'BTN']
      case 6: return ['SB', 'BB', 'UTG', 'HJ', 'CO', 'BTN']
      case 7: return ['SB', 'BB', 'UTG', 'MP1', 'HJ', 'CO', 'BTN']
      case 8: return ['SB', 'BB', 'UTG', 'UTG+1', 'MP1', 'HJ', 'CO', 'BTN']
      default: return baseRoles.slice(0, playerCount - 1).concat(['BTN']) as PlayerRole[]
    }
  }

  /**
   * 设置当前游戏阶段并记录日志
   */
  setCurrentRound(round: GameRound): void {
    this.currentRound = round
    console.log(`游戏阶段已更改为: ${round}`)
  }

  /**
   * 创建一副标准52张牌
   */
  createDeck(): string[] {
    const suits = ['♠', '♥', '♦', '♣']
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
    return suits.flatMap(suit => ranks.map(rank => `${suit}${rank}`))
  }

  /**
   * 洗牌（Fisher-Yates）
   */
  shuffleDeck(): void {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]]
    }
  }

  /**
   * 发底牌给所有玩家
   */
  dealHoleCards(): void {
    this.deck = this.createDeck()
    const cardsToRemove = new Set<string>()

    if (this.usePresetCommunity && this.presetCards) {
      (this.presetCards.flop || []).forEach(c => c && cardsToRemove.add(c));
      (this.presetCards.turn || []).forEach(c => c && cardsToRemove.add(c));
      (this.presetCards.river || []).forEach(c => c && cardsToRemove.add(c))
    }

    if (this.usePresetHands && this.presetCards) {
      this.players.forEach(player => {
        const cards = this.presetCards!.players[player.id]
        if (cards && cards.length === 2 && cards[0] && cards[1]) {
          player.holeCards = [...cards]
          cardsToRemove.add(cards[0])
          cardsToRemove.add(cards[1])
        } else {
          throw new Error(`玩家 ${player.id} 的预设手牌无效。`)
        }
      })
    }

    this.deck = this.deck.filter(card => !cardsToRemove.has(card))
    this.shuffleDeck()

    if (!this.usePresetHands) {
      this.players.forEach(player => {
        if (this.deck.length < 2) throw new Error("没有足够的牌来发手牌。")
        player.holeCards = [this.deck.pop()!, this.deck.pop()!]
      })
    }
  }

  /**
   * 发Flop（3张公共牌）
   */
  dealFlop(): void {
    if (this.usePresetCommunity) {
      if (!this.presetCards || !this.presetCards.flop || this.presetCards.flop.length !== 3) {
        throw new Error('无效的预设翻牌。')
      }
      this.communityCards = [...this.presetCards.flop] as string[]
    } else {
      if (this.deck.length < 4) throw new Error('没有足够的牌来发翻牌')
      this.deck.pop() // 烧掉一张牌
      this.communityCards = [
        this.deck.pop()!,
        this.deck.pop()!,
        this.deck.pop()!
      ]
    }
  }

  /**
   * 发Turn或River（1张公共牌）
   */
  dealTurnOrRiver(): void {
    if (this.usePresetCommunity) {
      if (this.communityCards.length === 3) {
        if (!this.presetCards || !this.presetCards.turn || this.presetCards.turn.length !== 1) {
          throw new Error('无效的预设转牌。')
        }
        this.communityCards.push(this.presetCards.turn[0]!)
      } else if (this.communityCards.length === 4) {
        if (!this.presetCards || !this.presetCards.river || this.presetCards.river.length !== 1) {
          throw new Error('无效的预设河牌。')
        }
        this.communityCards.push(this.presetCards.river[0]!)
      }
    } else {
      if (this.deck.length < 2) throw new Error('没有足够的牌来发转牌/河牌')
      this.deck.pop() // 烧掉一张牌
      this.communityCards.push(this.deck.pop()!)
    }
  }

  /**
   * 初始化一个新的下注轮
   */
  startNewRound(roundName: GameRound): void {
    if (!['preflop', 'flop', 'turn', 'river'].includes(roundName)) {
      throw new Error(`Invalid round name: ${roundName}`)
    }

    this.setCurrentRound(roundName)
    this.highestBet = 0
    this.minRaise = this.settings.bb
    this.lastRaiseAmount = this.settings.bb
    this.lastAggressorIndex = -1

    this.players.forEach(p => {
      if (roundName !== 'preflop') {
        this.pot += p.bet
        p.bet = 0
      }
      if (!p.isFolded) {
        p.hasActed = false
      }
    })

    const playerCount = this.players.length

    if (roundName === 'preflop') {
      this.currentPlayerIndex = playerCount === 2 ? this.sbIndex : (this.bbIndex + 1) % playerCount
      this.lastAggressorIndex = this.bbIndex
      this._postBlinds()
    } else {
      this.currentPlayerIndex = (this.dealerIndex + 1) % playerCount
    }

    let attempts = 0
    while (attempts < playerCount &&
           (this.players[this.currentPlayerIndex].isFolded || this.players[this.currentPlayerIndex].isAllIn)) {
      console.log(`[startNewRound] Skipping player ${this.players[this.currentPlayerIndex].id} (folded: ${this.players[this.currentPlayerIndex].isFolded}, allIn: ${this.players[this.currentPlayerIndex].isAllIn})`)
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % playerCount
      attempts++
    }
  }

  /**
   * 内部：放置小盲和大盲
   */
  private _postBlinds(): void {
    const playerCount = this.players.length
    if (playerCount < 2) return

    const sbPlayer = this.players[this.sbIndex]
    const bbPlayer = this.players[this.bbIndex]

    const sb = Math.min(this.settings.sb, sbPlayer.stack)
    const bb = Math.min(this.settings.bb, bbPlayer.stack)

    sbPlayer.bet = sb
    sbPlayer.stack -= sb
    sbPlayer.totalInvested += sb
    if (sbPlayer.stack === 0) sbPlayer.isAllIn = true

    bbPlayer.bet = bb
    bbPlayer.stack -= bb
    bbPlayer.totalInvested += bb
    if (bbPlayer.stack === 0) bbPlayer.isAllIn = true

    this.highestBet = bb
  }

  /**
   * 执行玩家动作
   */
  executeAction(playerId: string, action: string, amount: number = 0): void {
    const playerIndex = this._getPlayerIndexById(playerId)
    if (playerIndex === -1) throw new Error(`Player ${playerId} not found`)
    if (playerIndex !== this.currentPlayerIndex) {
      throw new Error(`It's not ${playerId}'s turn`)
    }

    const player = this.players[playerIndex]
    if (player.isFolded || player.isAllIn) {
      throw new Error(`${playerId} cannot act (folded or all-in)`)
    }

    if (action === 'ALLIN') {
      amount = player.stack + player.bet
      action = this.highestBet > 0 ? 'RAISE' : 'BET'
    }

    const currentBet = player.bet
    const stack = player.stack
    player.hasActed = true

    switch (action) {
      case 'FOLD':
        player.isFolded = true
        break

      case 'CHECK':
        if (player.bet < this.highestBet) {
          throw new Error(`Cannot check, must call ${this.highestBet} or fold.`)
        }
        break

      case 'CALL': {
        const callAmount = this.highestBet - currentBet
        const actualCall = Math.min(callAmount, stack)
        player.bet += actualCall
        player.stack -= actualCall
        player.totalInvested += actualCall
        if (player.stack === 0) player.isAllIn = true
        break
      }

      case 'RAISE': {
        const raiseAmount = amount - this.highestBet
        const isAllIn = (player.stack + player.bet) === amount

        console.log('--- RAISE DEBUG ---')
        console.log(`Player ID: ${player.id}`)
        console.log(`Player Stack: ${player.stack}, Player Bet: ${player.bet}`)
        console.log(`Total Chips: ${player.stack + player.bet}`)
        console.log(`Raise To Amount: ${amount}`)
        console.log(`Is All-In: ${isAllIn}`)
        console.log(`Raise Amount: ${raiseAmount}`)
        console.log(`Last Raise Amount: ${this.lastRaiseAmount}`)
        console.log('-------------------')

        if (raiseAmount < this.lastRaiseAmount && !isAllIn) {
          throw new Error(`Raise must be at least ${this.lastRaiseAmount}. Your raise of ${raiseAmount} is too small.`)
        }

        const totalBetAfterRaise = amount
        if (player.stack + player.bet < totalBetAfterRaise) {
          throw new Error('Not enough stack to raise to this amount.')
        }

        const amountToPutInForRaise = totalBetAfterRaise - player.bet
        player.bet += amountToPutInForRaise
        player.stack -= amountToPutInForRaise
        player.totalInvested += amountToPutInForRaise

        if (player.stack === 0) {
          player.isAllIn = true
        }

        this.highestBet = totalBetAfterRaise

        if (raiseAmount >= this.lastRaiseAmount) {
          if (this.currentRound === 'preflop') {
            this.preflopRaiseCount++
          }
          this.lastRaiseAmount = raiseAmount
          this.lastAggressorIndex = playerIndex
          this.players.forEach(p => { if (!p.isFolded && !p.isAllIn) p.hasActed = false })
        }

        player.hasActed = true
        break
      }

      case 'BET': {
        if (this.highestBet > 0) {
          throw new Error('Cannot BET, there is already a bet. Action should be RAISE.')
        }
        const betAmount = Math.min(amount, player.stack)
        if (betAmount < this.minRaise && betAmount < player.stack) {
          throw new Error(`Bet must be at least ${this.minRaise}`)
        }
        player.bet = betAmount
        player.stack -= betAmount
        player.totalInvested += betAmount
        if (player.stack === 0) player.isAllIn = true
        this.highestBet = betAmount
        this.lastRaiseAmount = betAmount
        this.lastAggressorIndex = playerIndex
        this.players.forEach(p => { if (!p.isFolded && !p.isAllIn) p.hasActed = false })
        player.hasActed = true
        break
      }

      default:
        throw new Error(`Unknown action: ${action}`)
    }
  }

  /**
   * 推进到下一位需要行动的玩家
   */
  moveToNextPlayer(): void {
    console.log(`[moveToNextPlayer] Starting. Current index: ${this.currentPlayerIndex}`)
    let attempts = 0
    const totalPlayers = this.players.length
    do {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % totalPlayers
      const currentPlayer = this.players[this.currentPlayerIndex]
      console.log(`[moveToNextPlayer] Trying index ${this.currentPlayerIndex} (${currentPlayer.id}). isFolded: ${currentPlayer.isFolded}`)
      if (!currentPlayer.isFolded && !currentPlayer.isAllIn) {
        console.log(`[moveToNextPlayer] Found active player: ${currentPlayer.id}. Returning.`)
        return
      }
      attempts++
    } while (attempts < totalPlayers)
    console.log(`[moveToNextPlayer] No active player found.`)
  }

  /**
   * 判断当前下注轮是否结束
   */
  isBettingRoundComplete(): boolean {
    const activePlayers = this.players.filter(p => !p.isFolded)
    if (activePlayers.length <= 1) {
      return true
    }

    const bettingPlayers = activePlayers.filter(p => !p.isAllIn)
    if (bettingPlayers.length <= 1) {
      if (bettingPlayers.length === 1) {
        const lastManStanding = bettingPlayers[0]
        if (lastManStanding.bet < this.highestBet) {
          return false
        }
      }
      return true
    }

    const allHaveActed = bettingPlayers.every(p => p.hasActed)
    if (!allHaveActed) {
      return false
    }

    const firstBet = bettingPlayers[0].bet
    const allBetsEqual = bettingPlayers.every(p => p.bet === firstBet)

    return allBetsEqual
  }

  /**
   * 检查是否进入摊牌阶段
   */
  isShowdown(): boolean {
    const activePlayers = this.players.filter(p => !p.isFolded)
    if (activePlayers.length < 2) {
      return false
    }
    const bettingPlayers = activePlayers.filter(p => !p.isAllIn)
    return bettingPlayers.length === 0
  }

  /**
   * 获取当前行动玩家 ID
   */
  getCurrentPlayerId(): string | null {
    if (this.currentPlayerIndex >= 0 && this.players[this.currentPlayerIndex]) {
      return this.players[this.currentPlayerIndex].id
    }
    return null
  }

  /**
   * 获取完整游戏状态
   */
  getGameState(): GameState {
    const currentRoundBets = this.players.reduce((sum, p) => sum + p.bet, 0)
    const totalPot = this.pot + currentRoundBets

    return {
      players: this.players.map(p => ({ ...p })),
      communityCards: [...this.communityCards],
      currentRound: this.currentRound,
      currentPlayerId: this.getCurrentPlayerId(),
      pot: totalPot,
      highestBet: this.highestBet,
      lastRaiseAmount: this.lastRaiseAmount,
      preflopRaiseCount: this.preflopRaiseCount,
      minRaise: this.minRaise,
      dealerIndex: this.dealerIndex,
      sbIndex: this.sbIndex,
      bbIndex: this.bbIndex,
      lastAggressorIndex: this.lastAggressorIndex,
      currentPlayerIndex: this.currentPlayerIndex
    }
  }

  /**
   * 从保存的状态对象加载游戏
   */
  loadState(savedState: GameState): void {
    if (!savedState || !savedState.players || !savedState.communityCards) {
      throw new Error("Invalid saved game state provided.")
    }

    this.players = savedState.players.map(p => ({ ...p }))
    this.communityCards = [...savedState.communityCards]
    this.pot = savedState.pot
    this.currentRound = savedState.currentRound
    this.currentPlayerIndex = savedState.currentPlayerIndex
    this.highestBet = savedState.highestBet
    this.minRaise = savedState.minRaise || this.settings.bb
    this.lastRaiseAmount = savedState.lastRaiseAmount
    this.lastAggressorIndex = savedState.lastAggressorIndex || -1
    this.preflopRaiseCount = savedState.preflopRaiseCount
    this.dealerIndex = savedState.dealerIndex
    this.sbIndex = savedState.sbIndex || 0
    this.bbIndex = savedState.bbIndex || 0

    this._assignPlayerRoles()

    console.log("游戏状态已从快照加载。")
  }

  /**
   * 工具方法：通过ID获取玩家索引
   */
  private _getPlayerIndexById(playerId: string): number {
    return this.players.findIndex(p => p.id === playerId)
  }
}
