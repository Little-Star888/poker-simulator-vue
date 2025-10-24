<template>
  <div class="poker-table-wrapper">
    <div class="poker-table">
      <!-- Players P1-P8 -->
      <div
        v-for="i in playerCount"
        :key="i"
        class="player"
        :class="getPlayerClasses(i)"
        :style="getPlayerPosition(i)"
        :data-player="`P${i}`"
      >
        <div class="fold-indicator">FOLD</div>
        <div class="player-info">
          P{{ i }} <span class="player-role">{{ getPlayerRole(i) }}</span><br>
          <span class="stack">{{ formatStack(i) }}</span>
        </div>
        <div v-if="getPlayerBet(i) > 0" class="player-bet">{{ getPlayerBet(i) }}</div>
        <div class="action-bubble" :class="getActionBubbleClass(i)">
          {{ getLastAction(i) }}
        </div>
        <div class="hole-cards">
          <div class="hole-card" :style="getHoleCardStyle(i, 0)"></div>
          <div class="hole-card" :style="getHoleCardStyle(i, 1)"></div>
        </div>

        <!-- Player Action Popup (for manual mode) -->
        <PlayerActionPopup
          v-if="gameStore.isWaitingForManualInput && gameStore.currentPlayerId === `P${i}`"
          :player-id="`P${i}`"
          :visible="true"
        />
      </div>

      <!-- Pot Display -->
      <div v-if="pot > 0" class="pot-display">
        底池: {{ pot }}
      </div>

      <!-- Community Cards -->
      <div v-if="communityCards.length > 0" class="community-cards">
        <div
          v-for="(card, index) in communityCards"
          :key="index"
          class="card"
          :style="{ backgroundImage: `url(${getCardImage(card)})` }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useSettingStore } from '@/stores/settingStore'
import { getCardImagePath, formatAmount } from '@/utils/helpers'
import PlayerActionPopup from './PlayerActionPopup.vue'

const gameStore = useGameStore()
const settingStore = useSettingStore()

// 玩家数量
const playerCount = computed(() => settingStore.playerCount)

// 游戏状态
const gameState = computed(() => gameStore.currentGameState)
const communityCards = computed(() => gameState.value?.communityCards || [])
const pot = computed(() => gameState.value?.pot || 0)

// 获取玩家位置（圆形布局）
const getPlayerPosition = (index: number) => {
  // P1 固定在最下方（90°），其他玩家平均分配角度
  let angle: number
  if (index === 1) {
    angle = 90 // P1 固定在最下方
  } else {
    // 其他玩家平均分配剩余角度
    const angleStep = 360 / playerCount.value
    angle = 90 + angleStep * (index - 1)
  }

  const radius = 42 // percentage

  const x = 50 + radius * Math.cos((angle * Math.PI) / 180)
  const y = 50 + radius * Math.sin((angle * Math.PI) / 180)

  return {
    left: `${x}%`,
    top: `${y}%`,
    transform: 'translate(-50%, -50%)'
  }
}

// 获取玩家类名
const getPlayerClasses = (index: number) => {
  const playerId = `P${index}`
  const player = gameState.value?.players.find(p => p.id === playerId)
  if (!player) return []

  return {
    'active': gameStore.currentPlayerId === playerId,
    'folded': player.isFolded
  }
}

// 获取玩家角色
const getPlayerRole = (index: number) => {
  const playerId = `P${index}`
  const player = gameState.value?.players.find(p => p.id === playerId)
  return player?.role || ''
}

// 格式化筹码显示
const formatStack = (index: number) => {
  const playerId = `P${index}`
  const player = gameState.value?.players.find(p => p.id === playerId)
  return player ? formatAmount(player.stack) : '0'
}

// 获取玩家下注额
const getPlayerBet = (index: number) => {
  const playerId = `P${index}`
  const player = gameState.value?.players.find(p => p.id === playerId)
  return player?.bet || 0
}

// 获取手牌样式（用于飞牌动画目标）
const getHoleCardStyle = (playerIndex: number, cardIndex: number) => {
  // If no game state, show nothing
  if (!gameState.value) {
    return { backgroundImage: 'none' }
  }

  const playerId = `P${playerIndex}`
  const player = gameState.value.players.find(p => p.id === playerId)

  // If no player for this slot, show nothing
  if (!player) {
      return { backgroundImage: 'none' };
  }

  const cards = player.holeCards || []
  const card = cards[cardIndex];

  // 弃牌后仍然显示手牌（修改前：弃牌会隐藏手牌）
  // 注释掉弃牌隐藏逻辑，保留手牌显示
  // if (player.isFolded) {
  //     return { backgroundImage: 'none' };
  // }

  // If the card exists, show it
  if (card) {
    return { backgroundImage: `url(${getCardImage(card)})` }
  }

  // Otherwise, show nothing (e.g., pre-deal)
  return { backgroundImage: 'none' }
}

// 获取卡牌图片
const getCardImage = (card: string) => {
  return getCardImagePath(card)
}

// 获取最后的动作
const getLastAction = (index: number) => {
  const playerId = `P${index}`
  const round = gameState.value?.currentRound
  if (!round) return ''

  const actions = gameStore.actionRecords[playerId]?.[round]
  return actions && actions.length > 0 ? actions[actions.length - 1] : ''
}

// 获取动作气泡类名
const getActionBubbleClass = (index: number) => {
  const action = getLastAction(index)
  return action ? ['show'] : []
}

// 监听玩家数量变化，更新布局
watch(playerCount, () => {
  // 玩家数量变化时重新布局
})

onMounted(() => {
  // 初始化布局
})
</script>

<style scoped>
.poker-table-wrapper {
  flex-grow: 1;
  position: relative;
  display: flex;
  flex-direction: column;
}

.poker-table {
  flex-grow: 1;
  position: relative;
  background-color: #2E8B57;
  margin: 10px;
  border-radius: 80px;
  overflow: visible;
}

/* --- Player Styles --- */
.player {
  position: absolute;
  text-align: center;
  width: 100px;
  height: 100px;
  background: white;
  border: 1px solid #999;
  border-radius: 50%;
  padding: 8px;
  font-size: 12px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: all 0.3s ease;
}

.player-info {
  line-height: 1.2;
}

.player-role {
  font-size: 10px;
  color: #e67e22;
  font-weight: bold;
}

.stack {
  font-size: 11px;
  color: #3498db;
  font-weight: bold;
}

.player-bet {
  position: absolute;
  bottom: -20px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: bold;
}

.action-bubble {
  position: absolute;
  top: -30px;
  background-color: #f39c12;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.3s, transform 0.3s;
  z-index: 100;
  white-space: nowrap;
}

.action-bubble.show {
  opacity: 1;
  transform: translateY(0);
}

.fold-indicator {
  display: none;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-25deg);
  color: #e74c3c;
  font-size: 22px;
  font-weight: bold;
  border: 3px solid #c0392b;
  padding: 5px 10px;
  border-radius: 8px;
  opacity: 0.85;
  z-index: 50;
  background: white;
}

.player.folded {
  opacity: 0.4;
}

.player.folded .fold-indicator {
  display: block;
}

.player.active {
  border: 2px solid gold;
  box-shadow: 0 0 12px rgba(255, 215, 0, 0.8);
}

.hole-cards {
  margin-top: 4px;
  min-height: 45px;
  display: flex;
  gap: 4px;
  justify-content: center;
}

.hole-card {
  width: 40px;
  height: 50px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

/* --- Community Cards --- */
.community-cards {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  gap: 6px;
  z-index: 5;
}

.card {
  width: 40px;
  height: 50px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  border-radius: 3px;
}

/* --- Pot Display --- */
.pot-display {
  position: absolute;
  top: 25%;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.6);
  color: #FFD700;
  padding: 4px 12px;
  border-radius: 15px;
  font-size: 16px;
  font-weight: bold;
  z-index: 6;
  border: 1px solid #FFD700;
  box-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .player {
    width: 80px;
    height: 80px;
    font-size: 10px;
  }

  .hole-card,
  .card {
    width: 30px;
    height: 40px;
  }

  .pot-display {
    font-size: 14px;
  }
}
</style>
