<template>
  <div class="card-picker-wrapper">
    <h4>选择扑克牌:</h4>
    <div class="card-picker" ref="cardPickerRef">
      <div
        v-for="card in allCards"
        :key="card"
        class="picker-card"
        :class="{ dimmed: usedCards.has(card) }"
        :data-card="card"
        :style="{ backgroundImage: `url(${getCardImagePath(card)})` }"
        @click="handleCardClick(card, $event)"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useSettingStore } from '@/stores/settingStore'
import { getCardImagePath } from '@/utils/helpers'

const gameStore = useGameStore()
const settingStore = useSettingStore()
const cardPickerRef = ref<HTMLElement>()

// 生成所有52张牌
const allCards = computed(() => {
  const suits = ['♠', '♥', '♦', '♣']
  const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2']
  return suits.flatMap(suit => ranks.map(rank => `${suit}${rank}`))
})

// 已使用的牌
const usedCards = computed(() => gameStore.usedCards)

// 处理卡牌点击
const handleCardClick = (cardText: string, event: MouseEvent) => {
  if (gameStore.isInReplayMode) return

  // 防抖：如果正在处理，直接返回
  if (gameStore.isProcessingCardSelection) {
    gameStore.log('正在处理上一张牌的选择，请稍候...')
    return
  }

  // 检查是否已被使用
  if (usedCards.value.has(cardText)) {
    gameStore.log(`这张牌 (${cardText}) 已经被使用了。请先点击已分配的卡槽来取消选择。`)
    return
  }

  // 检查是否有激活的槽位
  if (!gameStore.activeSelectionSlot) {
    gameStore.log('没有可用的空卡槽来放置扑克牌，或所有卡槽已满。')
    return
  }

  // 立即设置处理状态
  gameStore.isProcessingCardSelection = true

  // 立即标记为已使用
  gameStore.usedCards.add(cardText)

  const currentSlot = gameStore.activeSelectionSlot
  const pickerCard = event.currentTarget as HTMLElement

  // 执行动画
  let animationsInitiated = 0

  // 动画到槽位
  animateCardToSlot(pickerCard, currentSlot, cardText)
  animationsInitiated++

  // 如果是玩家手牌，还要动画到牌桌上
  const slotType = currentSlot.dataset.type
  const playerId = currentSlot.dataset.playerId
  const cardIndex = currentSlot.dataset.cardIndex

  console.log('🎯 卡牌分配调试:', {
    slotType,
    playerId,
    cardIndex,
    usePresetHands: settingStore.usePresetHands
  })

  if (slotType === 'player' && settingStore.usePresetHands && playerId && cardIndex) {
    const playerOnTable = document.querySelector(`.player[data-player="${playerId}"]`)
    console.log('🎲 查找牌桌玩家:', playerId, '结果:', playerOnTable)

    if (playerOnTable) {
      const holeCards = playerOnTable.querySelectorAll('.hole-card')
      console.log('🃏 找到手牌元素数量:', holeCards.length)

      const cardOnTable = holeCards[parseInt(cardIndex)]
      console.log('🎯 目标手牌元素:', cardOnTable, '索引:', cardIndex)

      if (cardOnTable) {
        console.log('✈️ 开始飞牌动画到牌桌')
        animateCardToSlot(pickerCard, cardOnTable as HTMLElement, cardText)
        animationsInitiated++
      } else {
        console.warn('⚠️ 未找到目标手牌元素')
      }
    } else {
      console.warn('⚠️ 未找到牌桌玩家元素:', playerId)
    }
  }

  // 动画完成后分配卡牌
  if (animationsInitiated > 0) {
    setTimeout(() => {
      assignCard(currentSlot, cardText)
      activateNextEmptySlot()
      gameStore.isProcessingCardSelection = false
    }, 420)
  } else {
    gameStore.isProcessingCardSelection = false
  }
}

// 动画效果
const animateCardToSlot = (
  pickerCard: HTMLElement,
  destinationElement: HTMLElement,
  cardText: string
) => {
  const startRect = pickerCard.getBoundingClientRect()
  const endRect = destinationElement.getBoundingClientRect()

  console.log('🎬 动画参数:', {
    card: cardText,
    start: { x: startRect.left, y: startRect.top, w: startRect.width, h: startRect.height },
    end: { x: endRect.left, y: endRect.top, w: endRect.width, h: endRect.height }
  })

  if (endRect.width === 0 || endRect.height === 0) {
    console.warn('⚠️ 目标元素不可见或尺寸为零，跳过动画', endRect)
    return
  }

  const movingCard = document.createElement('div')
  movingCard.style.position = 'fixed'
  movingCard.style.zIndex = '2001'
  movingCard.style.left = `${startRect.left}px`
  movingCard.style.top = `${startRect.top}px`
  movingCard.style.width = `${startRect.width}px`
  movingCard.style.height = `${endRect.height}px`
  movingCard.style.backgroundImage = `url(${getCardImagePath(cardText)})`
  movingCard.style.backgroundSize = 'contain'
  movingCard.style.backgroundRepeat = 'no-repeat'
  movingCard.style.backgroundPosition = 'center'
  movingCard.style.borderRadius = '4px'
  movingCard.style.transition = 'all 0.4s ease-in-out'
  document.body.appendChild(movingCard)

  setTimeout(() => {
    movingCard.style.left = `${endRect.left}px`
    movingCard.style.top = `${endRect.top}px`
    movingCard.style.width = `${endRect.width}px`
    movingCard.style.height = `${endRect.height}px`
  }, 20)

  setTimeout(() => {
    document.body.removeChild(movingCard)
  }, 420)
}

// 分配卡牌
const assignCard = (slot: HTMLElement, cardText: string) => {
  slot.style.backgroundImage = `url(${getCardImagePath(cardText)})`
  slot.dataset.card = cardText

  const type = slot.dataset.type
  const playerId = slot.dataset.playerId
  const cardIndex = slot.dataset.cardIndex
  const stage = slot.dataset.stage

  if (type === 'player' && playerId && cardIndex) {
    settingStore.presetCards.players[playerId][parseInt(cardIndex)] = cardText

    // 更新桌面上的牌
    const playerOnTable = document.querySelector(`.player[data-player="${playerId}"]`)
    if (playerOnTable) {
      const cardOnTable = playerOnTable.querySelectorAll('.hole-card')[parseInt(cardIndex)] as HTMLElement
      if (cardOnTable) {
        cardOnTable.style.backgroundImage = `url(${getCardImagePath(cardText)})`
      }
    }
  } else if (type === 'community' && stage && cardIndex) {
    const stageKey = stage as 'flop' | 'turn' | 'river'
    settingStore.presetCards[stageKey][parseInt(cardIndex)] = cardText
  }
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
</script>

<style scoped>
.card-picker-wrapper {
  margin-top: 15px;
}

.card-picker-wrapper h4 {
  margin-bottom: 10px;
  font-size: 14px;
  color: #333;
}

.card-picker {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
  gap: 5px;
  max-height: 200px;
  overflow-y: auto;
  padding: 10px;
  background: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.picker-card {
  width: 40px;
  height: 50px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  cursor: pointer;
  border-radius: 4px;
  transition: transform 0.2s, opacity 0.2s, box-shadow 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.picker-card:hover:not(.dimmed) {
  transform: scale(1.1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

.picker-card.dimmed {
  opacity: 0.3;
  cursor: not-allowed;
  filter: grayscale(100%);
}

/* 滚动条样式 */
.card-picker::-webkit-scrollbar {
  width: 6px;
}

.card-picker::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.card-picker::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

.card-picker::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .card-picker {
    grid-template-columns: repeat(auto-fill, minmax(35px, 1fr));
    gap: 4px;
    max-height: 150px;
  }

  .picker-card {
    width: 35px;
    height: 45px;
  }
}
</style>
