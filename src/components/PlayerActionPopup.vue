<template>
  <Teleport to="body">
    <div
      ref="popupRef"
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
            v-if="checkCallAction !== 'ALLIN'"
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
          </button>
        </div>
      </div>

      <!-- 滑块面板（垂直）-->
      <div v-show="showSlider" class="amount-slider-overlay" @click.self="showSlider = false">
        <div class="slider-container">
          <div class="slider-value-display">{{ sliderDisplayText }}</div>
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
            {{ confirmButtonText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, nextTick } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useSettingStore } from '@/stores/settingStore'

interface Props {
  playerId: string
  visible: boolean
}

const props = defineProps<Props>()

const gameStore = useGameStore()
const settingStore = useSettingStore()

const popupRef = ref<HTMLElement | null>(null)
const showSlider = ref(false)
const sliderValue = ref(0)
const currentAction = ref<'BET' | 'RAISE'>('BET')
const confirmButtonText = ref('确定')
const popupStyle = ref({})

const betSizeMultipliers = [0.33, 0.5, 0.66, 1, 1.2]

const gameState = computed(() => gameStore.currentGameState)
const player = computed(() => gameState.value?.players.find(p => p.id === props.playerId))

const pot = computed(() => gameState.value?.pot || 0)
const highestBet = computed(() => gameState.value?.highestBet || 0)
const lastRaiseAmount = computed(() => gameState.value?.lastRaiseAmount || settingStore.bb)

const toCall = computed(() => {
  if (!player.value) return 0
  return Math.max(0, highestBet.value - player.value.bet)
})

const checkCallAction = computed(() => {
  if (toCall.value === 0) return 'CHECK'
  if (player.value && player.value.stack <= toCall.value) {
    return 'ALLIN'
  }
  return 'CALL'
})

const betRaiseAction = computed(() => {
  if (!player.value) return 'BET'
  if (highestBet.value === 0) {
    return 'BET'
  }
  const minRaiseTarget = highestBet.value + lastRaiseAmount.value
  if (player.value.stack + player.value.bet < minRaiseTarget) {
    return 'ALLIN'
  }
  return 'RAISE'
})

const canBetRaise = computed(() => {
  if (!player.value || player.value.stack === 0) return false
  const minRaiseTarget = highestBet.value + lastRaiseAmount.value
  const canMakeStandardRaise = player.value.stack + player.value.bet >= minRaiseTarget
  if (canMakeStandardRaise) return true
  const isCallAnAllIn = player.value.stack <= toCall.value
  return !isCallAnAllIn
})

const betRaiseLabel = computed(() => {
  const action = betRaiseAction.value
  if (action === 'ALLIN') return 'All-in'
  if (action === 'RAISE') return '加注'
  return '下注'
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
    return player.value.stack
  }
  if (action === 'CALL') {
    return toCall.value
  }
  return undefined
})

const sliderMin = computed(() => {
  if (!player.value) return 0
  if (currentAction.value === 'BET') {
    return settingStore.bb
  }
  return highestBet.value + lastRaiseAmount.value
})

const sliderMax = computed(() => {
  if (!player.value) return 0
  return player.value.stack + player.value.bet
})

const sliderStep = computed(() => settingStore.bb)

const isAllInCondition = computed(() => {
  if (!player.value) return false;
  return sliderValue.value + sliderStep.value > sliderMax.value || sliderValue.value === sliderMax.value;
});

const sliderDisplayText = computed(() => {
  if (isAllInCondition.value) {
    return `ALL-IN ${sliderMax.value}`;
  }
  return sliderValue.value;
});

const updatePopupPosition = () => {
  if (!props.visible || !popupRef.value) return;
  const playerElement = document.querySelector(`.player[data-player="${props.playerId}"]`);
  if (playerElement) {
    const playerRect = playerElement.getBoundingClientRect();
    const popupRect = popupRef.value.getBoundingClientRect();

    let top = playerRect.top + (playerRect.height / 2) - (popupRect.height / 2);
    let left = playerRect.left + (playerRect.width / 2) - (popupRect.width / 2);

    if (top < 0) top = 5;
    if (left < 0) left = 5;
    if (top + popupRect.height > window.innerHeight) {
      top = window.innerHeight - popupRect.height - 5;
    }
    if (left + popupRect.width > window.innerWidth) {
      left = window.innerWidth - popupRect.width - 5;
    }

    popupStyle.value = {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      transform: 'none',
    };
  }
};

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
    const raiseTarget = Math.max(highestBet.value + lastRaiseAmount.value, highestBet.value + amount)
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
  if (!player.value) return;
  const action = isAllInCondition.value ? 'ALLIN' : currentAction.value;
  const amount = isAllInCondition.value ? sliderMax.value : sliderValue.value;
  executeAction(action, amount);
  showSlider.value = false;
};

const executeAction = async (action: string, amount?: number) => {
  if (!props.playerId) return
  await gameStore.executeManualAction(props.playerId, action, amount)
  showSlider.value = false
}

watch(sliderValue, (newValue) => {
  if (isAllInCondition.value) {
    confirmButtonText.value = 'All-in';
  } else {
    confirmButtonText.value = `确定 ${newValue}`;
  }
});

watch(() => props.visible, (newVal) => {
  if (newVal) {
    nextTick(() => {
      updatePopupPosition();
    });
  } else {
    showSlider.value = false
  }
});

onMounted(() => {
  if (props.visible) {
    updatePopupPosition();
  }
});

</script>

<style scoped>
.player-action-popup {
  width: 240px;
  z-index: 2100;
  background: transparent;
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  align-items: center;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

.action-panel { display: flex; flex-direction: column; align-items: center; gap: 10px; width: 100%; max-width: 100%; background: transparent; padding: 15px; border-radius: 0; box-shadow: none; }
.quick-bet-sizes { position: relative; width: 180px; height: 100px; margin: 0 auto 15px auto; }

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

.quick-bet-sizes button:nth-child(1) { left: 1%; top: 84%; }
.quick-bet-sizes button:nth-child(2) { left: 18%; top: 31%; }
.quick-bet-sizes button:nth-child(3) { left: 50%; top: 10%; }
.quick-bet-sizes button:nth-child(4) { left: 82%; top: 31%; }
.quick-bet-sizes button:nth-child(5) { left: 99%; top: 84%; }

.quick-bet-sizes button:hover { background-color: rgba(255, 255, 255, 0.3); transform: translate(-50%, -50%) scale(1.1); }
.quick-bet-sizes button:disabled, .quick-bet-sizes button:disabled:hover { background-color: rgba(0, 0, 0, 0.2); border-color: rgba(255, 255, 255, 0.2); color: rgba(255, 255, 255, 0.4); cursor: not-allowed; transform: translate(-50%, -50%) scale(1); }
.quick-bet-sizes button span { font-size: 1em; }
.quick-bet-sizes button small { font-size: 0.7em; font-weight: normal; margin-top: 2px; color: #eee; }

.main-action-buttons { display: flex; justify-content: center; align-items: center; gap: 15px; width: 100%; }

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

.main-action-btn:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(0,0,0,0.5); }
.main-action-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: scale(1); }

.main-action-btn.fold { background: linear-gradient(145deg, #d63031, #b71540); width: 55px; height: 55px; }
.main-action-btn.bet-raise { background: linear-gradient(145deg, #0984e3, #005cb2); width: 70px; height: 70px; font-size: 18px; flex: 0 0 70px; }
.main-action-btn.check-call { background: linear-gradient(145deg, #27ae60, #1e8449); width: 55px; height: 55px; flex: 0 0 55px; }
.main-action-btn.check-call .amount { display: block; font-size: 10px; margin-top: 2px; font-weight: normal; }

.main-action-btn[data-action="ALLIN"] { flex: 0 0 70px; width: 70px !important; max-width: 70px !important; }
.main-action-btn.check-call[data-action="ALLIN"] { flex: 0 0 55px !important; width: 55px !important; max-width: 55px !important; }

.amount-slider-overlay { width: 100%; padding: 0; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; background: transparent; border-radius: 0; }
.slider-container { display: flex; flex-direction: column; align-items: center; gap: 20px; position: relative; }
.slider-value-display { background: rgba(0,0,0,0.8); color: white; padding: 4px 15px; border-radius: 15px; font-size: 18px; font-weight: bold; border: 1px solid rgba(255,255,255,0.5); }

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

.bet-slider-input { -webkit-appearance: none; appearance: none; width: 170px; height: 10px; background: transparent; transform: rotate(-90deg); cursor: pointer; position: absolute; }
.bet-slider-input::-webkit-slider-runnable-track { background: #555; height: 2px; border-radius: 1px; }
.bet-slider-input::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 40px; height: 40px; background: #f39c12; border-radius: 50%; border: 4px solid white; margin-top: -19px; box-shadow: 0 0 10px rgba(243, 156, 18, 0.7); cursor: pointer; }
.bet-slider-input::-moz-range-track { background: #555; height: 2px; border-radius: 1px; }
.bet-slider-input::-moz-range-thumb { width: 40px; height: 40px; background: #f39c12; border-radius: 50%; border: 4px solid white; box-shadow: 0 0 10px rgba(243, 156, 18, 0.7); cursor: pointer; }

.confirm-bet { background: linear-gradient(145deg, #0984e3, #005cb2); width: 70px; height: 70px; font-size: 18px; border: 2px solid rgba(255, 255, 255, 0.5); box-shadow: 0 4px 15px rgba(0,0,0,0.4); margin-top: 10px; }
</style>
