<template>
  <div
    v-if="visible"
    class="player-action-popup"
    :style="popupStyle"
    @click.stop
  >
    <!-- 主操作面板 -->
    <div v-show="!showSlider" class="action-panel">
      <!-- 快速下注按钮 -->
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
          @click="executeAction(checkCallAction)"
        >
          {{ checkCallLabel }}
          <span v-if="toCall > 0" class="amount">{{ toCall }}</span>
        </button>
      </div>
    </div>

    <!-- 滑块面板 -->
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
          @click="confirmBet"
        >
          确定
        </button>
        <button
          class="game-control-btn secondary-btn"
          @click="cancelSlider"
          style="margin-top: 10px;"
        >
          取消
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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

// 弹窗位置（简化版，实际应该根据玩家位置动态计算）
const popupStyle = computed(() => {
  return {
    position: 'fixed' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 1000
  }
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

const cancelSlider = () => {
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
  if (!newVal) {
    showSlider.value = false
  }
})
</script>

<style scoped>
.player-action-popup {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  padding: 20px;
  min-width: 320px;
  max-width: 400px;
}

.action-panel {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.quick-bet-sizes {
  display: flex;
  gap: 8px;
  justify-content: space-between;
}

.quick-bet-sizes button {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #f8f9fa;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 0;
}

.quick-bet-sizes button:hover:not(:disabled) {
  background: #e9ecef;
  border-color: #007bff;
  transform: translateY(-2px);
}

.quick-bet-sizes button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quick-bet-sizes button span {
  font-weight: bold;
  font-size: 14px;
  color: #333;
}

.quick-bet-sizes button small {
  font-size: 11px;
  color: #666;
  margin-top: 2px;
}

.main-action-buttons {
  display: flex;
  gap: 10px;
}

.main-action-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  color: white;
  position: relative;
}

.main-action-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.main-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.main-action-btn.fold {
  background: #dc3545;
}

.main-action-btn.fold:hover:not(:disabled) {
  background: #c82333;
}

.main-action-btn.bet-raise {
  background: #ffc107;
  color: #333;
}

.main-action-btn.bet-raise:hover:not(:disabled) {
  background: #e0a800;
}

.main-action-btn.check-call {
  background: #28a745;
}

.main-action-btn.check-call:hover:not(:disabled) {
  background: #218838;
}

.main-action-btn .amount {
  display: block;
  font-size: 12px;
  margin-top: 2px;
  opacity: 0.9;
}

.amount-slider-overlay {
  display: flex;
  flex-direction: column;
}

.slider-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.slider-value-display {
  text-align: center;
  font-size: 24px;
  font-weight: bold;
  color: #007bff;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 8px;
}

.slider-track-container {
  padding: 10px 0;
}

.bet-slider-input {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #ddd;
  outline: none;
  cursor: pointer;
}

.bet-slider-input::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #007bff;
  cursor: pointer;
  transition: all 0.2s;
}

.bet-slider-input::-webkit-slider-thumb:hover {
  background: #0056b3;
  transform: scale(1.2);
}

.bet-slider-input::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #007bff;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.bet-slider-input::-moz-range-thumb:hover {
  background: #0056b3;
  transform: scale(1.2);
}

.confirm-bet {
  background: #28a745;
  padding: 12px;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.confirm-bet:hover {
  background: #218838;
  transform: translateY(-2px);
}

/* 响应式调整 */
@media (max-width: 480px) {
  .player-action-popup {
    min-width: 280px;
    padding: 15px;
  }

  .quick-bet-sizes button {
    padding: 6px 2px;
  }

  .quick-bet-sizes button span {
    font-size: 12px;
  }

  .quick-bet-sizes button small {
    font-size: 10px;
  }

  .main-action-btn {
    padding: 10px;
    font-size: 14px;
  }
}
</style>
