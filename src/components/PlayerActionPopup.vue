<template>
  <div
    v-if="visible"
    class="player-action-popup"
    :style="popupStyle"
    @click.stop
  >
    <!-- 主操作面板 -->
    <div v-show="!showSlider" class="action-panel">
      <!-- 快速下注按钮（弧形排列）-->
      <div class="quick-bet-sizes">
        <button
          v-for="(multiplier, index) in betSizeMultipliers"
          :key="index"
          @click="quickBet(multiplier)"
          :disabled="!canBetRaise"
        >
          <span>{{ formatMultiplier(multiplier) }}</span>
          <small>{{ calculateQuickBetAmount(multiplier) }}</small>
        </button>
      </div>

      <!-- 主要动作按钮 -->
      <div class="main-action-buttons">
        <button
          class="main-action-btn fold"
          data-action="FOLD"
          @click="executeAction('FOLD')"
        >
          弃牌
        </button>

        <button
          class="main-action-btn bet-raise"
          :data-action="betRaiseAction"
          @click="handleBetRaise"
          :disabled="!canBetRaise"
        >
          {{ betRaiseLabel }}
        </button>

        <button
          class="main-action-btn check-call"
          :data-action="checkCallAction"
          @click="executeAction(checkCallAction, checkCallAmount)"
        >
          {{ checkCallLabel }}
          <span v-if="toCall > 0" class="amount">{{ toCall }}</span>
        </button>
      </div>
    </div>

    <!-- 滑块面板（垂直）-->
    <div v-show="showSlider" class="amount-slider-overlay">
      <div class="slider-container">
        <div class="slider-value-display">{{ sliderValue }}</div>
        <div class="slider-track-container">
          <input
            type="range"
            class="bet-slider-input"
            v-model.number="sliderValue"
            :min="sliderMin"
            :max="sliderMax"
            :step="sliderStep"
          />
        </div>
        <button
          class="main-action-btn confirm-bet"
          data-action="CONFIRM"
          @click="confirmBet"
        >
          确定
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useSettingStore } from '@/stores/settingStore'

interface Props {
  playerId: string
  visible: boolean
}

const props = defineProps<Props>()

const gameStore = useGameStore()
const settingStore = useSettingStore()

// 局部状态
const showSlider = ref(false)
const sliderValue = ref(0)
const currentAction = ref<'BET' | 'RAISE'>('BET')

// 快速下注倍数
const betSizeMultipliers = [0.33, 0.5, 0.66, 1, 1.2]

// 计算属性
const gameState = computed(() => gameStore.currentGameState)
const player = computed(() => gameState.value?.players.find(p => p.id === props.playerId))

const pot = computed(() => gameState.value?.pot || 0)
const highestBet = computed(() => gameState.value?.highestBet || 0)
const lastRaiseAmount = computed(() => gameState.value?.lastRaiseAmount || settingStore.bb)

const toCall = computed(() => {
  if (!player.value) return 0
  return Math.max(0, highestBet.value - player.value.bet)
})

const canBetRaise = computed(() => {
  if (!player.value) return false
  const availableStack = player.value.stack

  if (highestBet.value === 0) {
    // 可以下注
    return availableStack > settingStore.bb
  } else {
    // 可以加注
    const minRaiseTarget = highestBet.value + lastRaiseAmount.value
    return player.value.stack + player.value.bet > minRaiseTarget
  }
})

const betRaiseAction = computed(() => {
  if (!player.value) return 'BET'

  // 检查是否是 All-in
  if (highestBet.value === 0) {
    // 下注场景
    if (player.value.stack <= settingStore.bb) {
      return 'ALLIN'
    }
    return 'BET'
  } else {
    // 加注场景
    const minRaiseTarget = highestBet.value + lastRaiseAmount.value
    if (player.value.stack + player.value.bet <= minRaiseTarget) {
      return 'ALLIN'
    }
    return 'RAISE'
  }
})

const betRaiseLabel = computed(() => {
  const action = betRaiseAction.value
  if (action === 'ALLIN') return 'All-in'
  if (action === 'RAISE') return '加注'
  return '下注'
})

const checkCallAction = computed(() => {
  if (toCall.value === 0) return 'CHECK'

  // 检查是否是 Call All-in
  if (player.value && player.value.stack <= toCall.value) {
    return 'ALLIN'
  }
  return 'CALL'
})

const checkCallLabel = computed(() => {
  const action = checkCallAction.value
  if (action === 'ALLIN') return 'All-in'
  if (action === 'CALL') return '跟注'
  return '让牌'
})

const checkCallAmount = computed(() => {
  const action = checkCallAction.value
  if (action === 'ALLIN' && player.value) {
    return player.value.stack + player.value.bet
  }
  if (action === 'CALL') {
    return highestBet.value
  }
  return undefined
})

// 滑块范围
const sliderMin = computed(() => {
  if (!player.value) return 0

  if (currentAction.value === 'BET') {
    return settingStore.bb
  } else {
    return highestBet.value + lastRaiseAmount.value
  }
})

const sliderMax = computed(() => {
  if (!player.value) return 0
  return player.value.stack + player.value.bet
})

const sliderStep = computed(() => {
  return settingStore.bb
})

// 弹窗位置（可以扩展为动态定位）
const popupStyle = computed(() => {
  return {}
})

// 方法
const formatMultiplier = (multiplier: number): string => {
  if (multiplier === 0.33) return '1/3'
  if (multiplier === 0.5) return '1/2'
  if (multiplier === 0.66) return '2/3'
  return multiplier.toString()
}

const calculateQuickBetAmount = (multiplier: number): number => {
  const targetPot = pot.value
  return Math.floor(targetPot * multiplier)
}

const quickBet = (multiplier: number) => {
  if (!canBetRaise.value || !player.value) return

  const amount = calculateQuickBetAmount(multiplier)
  const action = betRaiseAction.value

  if (action === 'ALLIN') {
    executeAction('ALLIN', player.value.stack + player.value.bet)
  } else if (action === 'BET') {
    const betAmount = Math.max(settingStore.bb, Math.min(amount, player.value.stack))
    executeAction('BET', betAmount)
  } else if (action === 'RAISE') {
    const raiseTarget = Math.max(
      highestBet.value + lastRaiseAmount.value,
      highestBet.value + amount
    )
    const maxRaise = player.value.stack + player.value.bet
    const finalRaise = Math.min(raiseTarget, maxRaise)
    executeAction('RAISE', finalRaise)
  }
}

const handleBetRaise = () => {
  if (!canBetRaise.value || !player.value) return

  const action = betRaiseAction.value

  if (action === 'ALLIN') {
    executeAction('ALLIN', player.value.stack + player.value.bet)
  } else {
    currentAction.value = action
    showSlider.value = true
    sliderValue.value = sliderMin.value
  }
}

const confirmBet = () => {
  if (!player.value) return

  executeAction(currentAction.value, sliderValue.value)
  showSlider.value = false
}

const executeAction = async (action: string, amount?: number) => {
  if (!props.playerId) return

  await gameStore.executeManualAction(props.playerId, action, amount)

  // 重置状态
  showSlider.value = false
}

// 监听可见性变化，重置滑块
watch(() => props.visible, (newVal) => {
  console.log('👁️ PlayerActionPopup visible changed:', newVal, 'playerId:', props.playerId)
  if (!newVal) {
    showSlider.value = false
  }
})

// 组件挂载时输出调试信息
onMounted(() => {
  console.log('🎮 PlayerActionPopup mounted:', props.playerId, 'visible:', props.visible)
  console.log('  - isWaitingForManualInput:', gameStore.isWaitingForManualInput)
  console.log('  - currentPlayerId:', gameStore.currentPlayerId)
  console.log('  - player:', player.value)
})
</script>

<style scoped>
/* 主容器 - 透明背景 */
.player-action-popup {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 240px;
  z-index: 200;
  background: transparent;
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  align-items: center;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

/* 操作面板 */
.action-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 100%;
  background: transparent;
  padding: 15px;
  border-radius: 0;
  box-shadow: none;
}

/* 快速下注按钮容器（弧形布局）*/
.quick-bet-sizes {
  position: relative;
  width: 180px;
  height: 100px;
  margin: 0 auto 15px auto;
}

.quick-bet-sizes button {
  background-color: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.6);
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-size: 10px;
  font-weight: bold;
  transition: all 0.2s ease;
  position: absolute;
  transform: translate(-50%, -50%);
}

/* 弧形定位（5个按钮）*/
.quick-bet-sizes button:nth-child(1) {
  left: 1%;
  top: 84%;
}

.quick-bet-sizes button:nth-child(2) {
  left: 18%;
  top: 31%;
}

.quick-bet-sizes button:nth-child(3) {
  left: 50%;
  top: 10%;
}

.quick-bet-sizes button:nth-child(4) {
  left: 82%;
  top: 31%;
}

.quick-bet-sizes button:nth-child(5) {
  left: 99%;
  top: 84%;
}

.quick-bet-sizes button:hover {
  background-color: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%) scale(1.1);
}

.quick-bet-sizes button:disabled,
.quick-bet-sizes button:disabled:hover {
  background-color: rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.4);
  cursor: not-allowed;
  transform: translate(-50%, -50%) scale(1);
}

.quick-bet-sizes button span {
  font-size: 1em;
}

.quick-bet-sizes button small {
  font-size: 0.7em;
  font-weight: normal;
  margin-top: 2px;
  color: #eee;
}

/* 主要动作按钮 */
.main-action-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  width: 100%;
}

.main-action-btn {
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  color: white;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 15px rgba(0,0,0,0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}

.main-action-btn:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 20px rgba(0,0,0,0.5);
}

.main-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: scale(1);
}

.main-action-btn.fold {
  background: linear-gradient(145deg, #d63031, #b71540);
  width: 55px;
  height: 55px;
}

.main-action-btn.bet-raise {
  background: linear-gradient(145deg, #0984e3, #005cb2);
  width: 70px;
  height: 70px;
  font-size: 18px;
  flex: 0 0 70px;
}

.main-action-btn.check-call {
  background: linear-gradient(145deg, #27ae60, #1e8449);
  width: 55px;
  height: 55px;
  flex: 0 0 55px;
}

.main-action-btn.check-call .amount {
  display: block;
  font-size: 10px;
  margin-top: 2px;
  font-weight: normal;
}

/* 确保 All-in 按钮保持圆形 */
.main-action-btn[data-action="ALLIN"] {
  max-width: 55px !important;
}

.main-action-btn.bet-raise[data-action="ALLIN"] {
  flex: 0 0 70px;
}

/* 滑块面板（垂直）*/
.amount-slider-overlay {
  width: 100%;
  padding: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: transparent;
  border-radius: 0;
}

.slider-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  position: relative;
}

.slider-value-display {
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 4px 15px;
  border-radius: 15px;
  font-size: 18px;
  font-weight: bold;
  border: 1px solid rgba(255,255,255,0.5);
}

.slider-track-container {
  position: relative;
  height: 200px;
  width: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: none;
  border-radius: 25px;
  padding: 15px 0;
}

.bet-slider-input {
  -webkit-appearance: none;
  appearance: none;
  width: 170px;
  height: 10px;
  background: transparent;
  transform: rotate(-90deg);
  cursor: pointer;
  position: absolute;
}

.bet-slider-input::-webkit-slider-runnable-track {
  background: #555;
  height: 2px;
  border-radius: 1px;
}

.bet-slider-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 40px;
  height: 40px;
  background: #f39c12;
  border-radius: 50%;
  border: 4px solid white;
  margin-top: -19px;
  box-shadow: 0 0 10px rgba(243, 156, 18, 0.7);
  cursor: pointer;
}

.bet-slider-input::-moz-range-track {
  background: #555;
  height: 2px;
  border-radius: 1px;
}

.bet-slider-input::-moz-range-thumb {
  width: 40px;
  height: 40px;
  background: #f39c12;
  border-radius: 50%;
  border: 4px solid white;
  box-shadow: 0 0 10px rgba(243, 156, 18, 0.7);
  cursor: pointer;
}

.confirm-bet {
  background: linear-gradient(145deg, #0984e3, #005cb2);
  width: 70px;
  height: 70px;
  font-size: 18px;
  border: 2px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 4px 15px rgba(0,0,0,0.4);
}
</style>
