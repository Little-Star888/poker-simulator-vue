<template>
  <div
    class="preset-card-slot"
    :class="{ 'active-selection': isActive, 'has-card': hasCard }"
    :data-type="type"
    :data-player-id="playerId"
    :data-card-index="cardIndex"
    :data-stage="stage"
    :data-card="card || ''"
    :style="{ backgroundImage: card ? `url(${getCardImagePath(card)})` : '' }"
    @click="handleClick"
    :ref="setSlotRef"
  >
    <div v-if="!card" class="slot-placeholder">?</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useSettingStore } from '@/stores/settingStore'
import { getCardImagePath } from '@/utils/helpers'

interface Props {
  type: 'player' | 'community'
  playerId?: string
  cardIndex?: number
  stage?: 'flop' | 'turn' | 'river'
  card?: string | null
}

const props = defineProps<Props>()

const gameStore = useGameStore()
const settingStore = useSettingStore()

// 计算属性
const hasCard = computed(() => !!props.card)
const isActive = computed(() => {
  if (!gameStore.activeSelectionSlot) return false

  // 比较槽位的唯一标识
  if (props.type === 'player') {
    const activeSlot = gameStore.activeSelectionSlot
    return activeSlot.dataset.type === 'player' &&
           activeSlot.dataset.playerId === props.playerId &&
           activeSlot.dataset.cardIndex === props.cardIndex?.toString()
  } else {
    const activeSlot = gameStore.activeSelectionSlot
    return activeSlot.dataset.type === 'community' &&
           activeSlot.dataset.stage === props.stage &&
           activeSlot.dataset.cardIndex === props.cardIndex?.toString()
  }
})

// 设置槽位引用
let slotElement: HTMLElement | null = null

const setSlotRef = (el: any) => {
  slotElement = el as HTMLElement
}

// 处理点击
const handleClick = () => {
  if (gameStore.isInReplayMode) return

  if (!slotElement) return

  // 如果已有卡牌，取消分配
  if (hasCard.value && props.card) {
    unassignCard(slotElement, props.card)
    return
  }

  // 如果点击的是已激活的槽位，取消激活
  if (isActive.value) {
    gameStore.activeSelectionSlot?.classList.remove('active-selection')
    gameStore.activeSelectionSlot = null
    return
  }

  // 激活当前槽位
  if (gameStore.activeSelectionSlot) {
    gameStore.activeSelectionSlot.classList.remove('active-selection')
  }

  gameStore.activeSelectionSlot = slotElement
  gameStore.activeSelectionSlot.classList.add('active-selection')
}

// 取消分配卡牌
const unassignCard = (slot: HTMLElement, cardText: string) => {
  const elementsToAnimate: HTMLElement[] = [slot]

  // 如果是玩家手牌，还要清除桌面上的牌
  if (props.type === 'player' && props.playerId && props.cardIndex !== undefined) {
    const playerOnTable = document.querySelector(`.player[data-player="${props.playerId}"]`)
    if (playerOnTable) {
      const cardOnTable = playerOnTable.querySelectorAll('.hole-card')[props.cardIndex] as HTMLElement
      if (cardOnTable) {
        elementsToAnimate.push(cardOnTable)
      }
    }
  }

  // 添加动画类
  elementsToAnimate.forEach(el => el.classList.add('card-unassigned'))

  setTimeout(() => {
    // 更新设置
    if (props.type === 'player' && props.playerId && props.cardIndex !== undefined) {
      settingStore.presetCards.players[props.playerId][props.cardIndex] = null
    } else if (props.type === 'community' && props.stage && props.cardIndex !== undefined) {
      settingStore.presetCards[props.stage][props.cardIndex] = null
    }

    // 从已使用卡牌中移除
    gameStore.usedCards.delete(cardText)

    // 清除槽位显示
    elementsToAnimate.forEach(el => {
      el.style.backgroundImage = ''
      el.classList.remove('card-unassigned')
    })

    delete slot.dataset.card

    // 激活下一个空槽位
    activateNextEmptySlot()
  }, 300)
}

// 激活下一个空槽位
const activateNextEmptySlot = () => {
  if (gameStore.activeSelectionSlot) {
    gameStore.activeSelectionSlot.classList.remove('active-selection')
    gameStore.activeSelectionSlot = null
  }

  const sequence = getSlotSequence()
  for (const slot of sequence) {
    if (!slot.dataset.card) {
      gameStore.activeSelectionSlot = slot
      gameStore.activeSelectionSlot.classList.add('active-selection')
      return
    }
  }

  // 所有槽位都满了
  gameStore.isProcessingCardSelection = false
}

// 获取槽位序列
const getSlotSequence = (): HTMLElement[] => {
  const sequence: HTMLElement[] = []

  if (settingStore.usePresetCommunity) {
    document.querySelectorAll('#preset-community-cards-container .preset-card-slot').forEach(slot => {
      sequence.push(slot as HTMLElement)
    })
  }

  if (settingStore.usePresetHands) {
    document.querySelectorAll('#preset-player-hands-container .preset-card-slot').forEach(slot => {
      sequence.push(slot as HTMLElement)
    })
  }

  return sequence
}

// 组件卸载时清理
onUnmounted(() => {
  if (gameStore.activeSelectionSlot === slotElement) {
    gameStore.activeSelectionSlot = null
  }
})
</script>

<style scoped>
.preset-card-slot {
  width: 40px;
  height: 50px;
  border: 2px dashed #ccc;
  border-radius: 4px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background-color: #fff;
}

.preset-card-slot:hover {
  border-color: #007bff;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
  transform: translateY(-2px);
}

.preset-card-slot.active-selection {
  border-color: #28a745;
  border-style: solid;
  border-width: 3px;
  box-shadow: 0 0 12px rgba(40, 167, 69, 0.5);
  animation: pulse 1s infinite;
}

.preset-card-slot.has-card {
  border-style: solid;
  border-color: #007bff;
}

.preset-card-slot.has-card:hover {
  border-color: #dc3545;
  box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3);
}

.slot-placeholder {
  font-size: 20px;
  color: #ccc;
  font-weight: bold;
  user-select: none;
}

.preset-card-slot.has-card .slot-placeholder {
  display: none;
}

/* 取消分配动画 */
.card-unassigned {
  animation: fadeOut 0.3s ease-out;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 12px rgba(40, 167, 69, 0.5);
  }
  50% {
    box-shadow: 0 0 20px rgba(40, 167, 69, 0.8);
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.8);
  }
}

/* 响应式调整 */
@media (max-width: 768px) {
  .preset-card-slot {
    width: 35px;
    height: 45px;
  }

  .slot-placeholder {
    font-size: 16px;
  }
}
</style>
