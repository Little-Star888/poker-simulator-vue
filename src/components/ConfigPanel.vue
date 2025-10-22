<template>
  <div class="config-panel">
    <!-- 运行配置 -->
    <div class="section" id="runtime-config-section">
      <h3>⚙️ 运行配置</h3>

      <div class="form-row">
        <label>游戏模式:</label>
        <select v-model="settingStore.mode">
          <option value="auto">自动</option>
          <option value="manual">手动</option>
        </select>
      </div>

      <div class="form-row">
        <label>盲注设置:</label>
        <input
          type="number"
          v-model.number="settingStore.sb"
          @input="onSBChange"
          min="1"
          style="width:80px;"
        /> /
        <input
          type="number"
          :value="settingStore.bb"
          readonly
          class="readonly-input"
          min="1"
          style="width:80px;"
        />
      </div>

      <div class="form-row">
        <label>玩家思考时间 (ms):</label>
        <input
          type="number"
          v-model.number="settingStore.autoDelay"
          min="100"
          style="width:100px;"
        />
      </div>

      <div class="form-row">
        <label>GTO建议阶段:</label>
        <div id="suggestion-phases">
          <label>
            <input type="checkbox" v-model="settingStore.suggestOnPreflop"> Preflop
          </label>
          <label>
            <input type="checkbox" v-model="settingStore.suggestOnFlop"> Flop
          </label>
          <label>
            <input type="checkbox" v-model="settingStore.suggestOnTurn"> Turn
          </label>
          <label>
            <input type="checkbox" v-model="settingStore.suggestOnRiver"> River
          </label>
        </div>
      </div>

      <div class="form-row">
        <label>GTO建议筛选:</label>
        <div id="gto-filter-players" class="gto-filter-players">
          <label
            v-for="i in settingStore.playerCount"
            :key="i"
          >
            <input
              type="checkbox"
              :checked="gameStore.gtoSuggestionFilter.has(`P${i}`)"
              @change="toggleGTOFilter(`P${i}`, $event)"
            >
            P{{ i }}
          </label>
        </div>
      </div>

      <div class="form-row">
        <label>玩家数量:</label>
        <input
          type="number"
          v-model.number="settingStore.playerCount"
          @change="onPlayerCountChange"
          min="2"
          max="8"
          class="player-count-input"
        />
        <label class="pot-type-label">底池类型:</label>
        <select
          v-model="settingStore.potType"
          :disabled="settingStore.mode === 'manual'"
          class="pot-type-select"
        >
          <option value="unrestricted">无限制</option>
          <option value="single_raised">单一加注底池</option>
          <option value="3bet">3-Bet 底池</option>
          <option value="4bet">4-Bet及以上</option>
        </select>
      </div>

      <div class="form-row">
        <label>P1开局位置:</label>
        <select v-model="settingStore.p1Role">
          <option value="random">随机</option>
          <option v-for="role in availableRoles" :key="role" :value="role">
            {{ role }}
          </option>
        </select>
      </div>

      <div class="form-row">
        <label>初始筹码范围:</label>
        <input
          type="number"
          v-model.number="settingStore.minStack"
          min="1"
          style="width:80px;"
        /> -
        <input
          type="number"
          v-model.number="settingStore.maxStack"
          min="1"
          style="width:80px;"
        />
      </div>
    </div>

    <!-- 牌局预设 -->
    <div class="section" id="preset-section">
      <h3>🃏 牌局预设</h3>
      <div class="form-row">
        <label>预设选项:</label>
        <label>
          <input
            type="checkbox"
            v-model="settingStore.usePresetCommunity"
            @change="onPresetChange"
            :disabled="gameStore.isInReplayMode"
          />
          预设公共牌
        </label>
        <label>
          <input
            type="checkbox"
            v-model="settingStore.usePresetHands"
            @change="onPresetChange"
            :disabled="gameStore.isInReplayMode"
          />
          预设手牌
        </label>
      </div>

      <div
        v-show="anyPresetEnabled"
        id="preset-controls"
        style="margin-top: 15px;"
      >
        <!-- 公共牌预设 -->
        <div
          v-show="settingStore.usePresetCommunity"
          id="preset-community-cards-container"
          style="margin-top: 15px;"
        >
          <h4>公共牌:</h4>
          <div style="display: flex; align-items: center; gap: 5px; flex-wrap: wrap;">
            <strong>Flop:</strong>
            <PresetSlot
              v-for="i in 3"
              :key="`flop-${i}`"
              type="community"
              stage="flop"
              :card-index="i - 1"
              :card="settingStore.presetCards.flop[i - 1]"
            />
            <strong style="margin-left: 5px;">Turn:</strong>
            <PresetSlot
              type="community"
              stage="turn"
              :card-index="0"
              :card="settingStore.presetCards.turn[0]"
            />
            <strong style="margin-left: 5px;">River:</strong>
            <PresetSlot
              type="community"
              stage="river"
              :card-index="0"
              :card="settingStore.presetCards.river[0]"
            />
          </div>
        </div>

        <!-- 玩家手牌预设 -->
        <div
          v-show="settingStore.usePresetHands"
          id="preset-player-hands-container"
          style="margin-top: 15px; margin-bottom: 15px;"
        >
          <h4>玩家手牌:</h4>
          <div
            v-for="i in settingStore.playerCount"
            :key="`player-${i}`"
            class="player-hand-preset"
          >
            <strong>P{{ i }}:</strong>
            <PresetSlot
              v-for="j in 2"
              :key="`player-${i}-card-${j}`"
              type="player"
              :player-id="`P${i}`"
              :card-index="j - 1"
              :card="getPlayerCard(i, j - 1)"
            />
          </div>
        </div>

        <!-- 卡牌选择器 -->
        <CardPicker v-if="anyPresetEnabled" />
      </div>
    </div>

    <!-- 快照管理 -->
    <div class="section" id="snapshot-management-section">
      <SnapshotList
        ref="snapshotListRef"
        @view-snapshot="handleViewSnapshot"
        @start-replay="handleStartReplay"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useSettingStore } from '@/stores/settingStore'
import PresetSlot from './PresetSlot.vue'
import CardPicker from './CardPicker.vue'
import SnapshotList from './SnapshotList.vue'
import type { PlayerRole } from '@/types'

const gameStore = useGameStore()
const settingStore = useSettingStore()

// 快照列表引用
const snapshotListRef = ref<InstanceType<typeof SnapshotList> | null>(null)

// 计算可用的角色选项
const availableRoles = computed<PlayerRole[]>(() => {
  const count = settingStore.playerCount
  const roles: Record<number, PlayerRole[]> = {
    2: ['SB', 'BTN'],
    3: ['SB', 'BB', 'BTN'],
    4: ['SB', 'BB', 'CO', 'BTN'],
    5: ['SB', 'BB', 'UTG', 'CO', 'BTN'],
    6: ['SB', 'BB', 'UTG', 'HJ', 'CO', 'BTN'],
    7: ['SB', 'BB', 'UTG', 'MP1', 'HJ', 'CO', 'BTN'],
    8: ['SB', 'BB', 'UTG', 'UTG+1', 'MP1', 'HJ', 'CO', 'BTN']
  }
  return roles[count] || []
})

// 是否有任何预设启用
const anyPresetEnabled = computed(() => {
  return settingStore.usePresetCommunity || settingStore.usePresetHands
})

// 当 SB 改变时，自动更新 BB
const onSBChange = () => {
  settingStore.bb = settingStore.sb * 2
}

// 切换 GTO 筛选
const toggleGTOFilter = (playerId: string, event: Event) => {
  const target = event.target as HTMLInputElement
  gameStore.updateGTOFilter(playerId, target.checked)
}

// 玩家数量改变
const onPlayerCountChange = () => {
  // 重新初始化玩家手牌预设
  if (settingStore.usePresetHands) {
    initPlayerPresetCards()
  }
}

// 预设选项改变
const onPresetChange = () => {
  if (gameStore.isInReplayMode) return

  if (anyPresetEnabled.value && !gameStore.isPresetUIInitialized) {
    initPresetUI()
  }

  if (!anyPresetEnabled.value && gameStore.isPresetUIInitialized) {
    resetPresetData()
  }

  if (settingStore.usePresetHands) {
    initPlayerPresetCards()
  }

  // 激活第一个空槽位
  setTimeout(() => {
    activateNextEmptySlot()
  }, 100)
}

// 初始化预设 UI
const initPresetUI = () => {
  if (gameStore.isPresetUIInitialized) return

  gameStore.isPresetUIInitialized = true
  gameStore.log('✅ 预设功能已启用')

  // 初始化玩家手牌数据结构
  if (settingStore.usePresetHands) {
    initPlayerPresetCards()
  }
}

// 初始化玩家预设手牌数据
const initPlayerPresetCards = () => {
  const players: Record<string, (string | null)[]> = {}
  for (let i = 1; i <= settingStore.playerCount; i++) {
    const playerId = `P${i}`
    players[playerId] = [null, null]
  }
  settingStore.presetCards.players = players
}

// 重置预设数据
const resetPresetData = () => {
  gameStore.usedCards.clear()
  settingStore.resetPresetCards()

  // 清除所有槽位显示
  setTimeout(() => {
    document.querySelectorAll('.preset-card-slot').forEach(slot => {
      const el = slot as HTMLElement
      el.style.backgroundImage = ''
      delete el.dataset.card
    })
  }, 0)

  if (gameStore.activeSelectionSlot) {
    gameStore.activeSelectionSlot.classList.remove('active-selection')
    gameStore.activeSelectionSlot = null
  }

  gameStore.isProcessingCardSelection = false
  gameStore.isPresetUIInitialized = false

  gameStore.log('🔄 预设数据已重置')
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

// 获取玩家卡牌
const getPlayerCard = (playerIndex: number, cardIndex: number): string | null => {
  const playerId = `P${playerIndex}`
  const cards = settingStore.presetCards.players[playerId]
  return cards ? cards[cardIndex] : null
}

// 处理查看快照
const handleViewSnapshot = (snapshotId: number) => {
  gameStore.log(`📖 打开快照详情 (ID: ${snapshotId})...`)
  gameStore.currentViewSnapshotId = snapshotId
  gameStore.showViewSnapshotModal = true
}

// 处理开始回放
const handleStartReplay = async (snapshotId: number) => {
  gameStore.log(`▶️ 准备回放快照 (ID: ${snapshotId})...`)

  try {
    await gameStore.startReplay(snapshotId)
  } catch (error: any) {
    gameStore.log(`❌ 回放失败: ${error.message}`)
    console.error('回放失败:', error)
  }
}

// 刷新快照列表（供外部调用）
const refreshSnapshotList = () => {
  if (snapshotListRef.value) {
    snapshotListRef.value.refresh(snapshotListRef.value.currentPage)
  }
}

// 暴露方法供父组件使用
defineExpose({
  refreshSnapshotList
})

// 监听预设启用状态变化</text>
// 监听游戏模式变化
watch(() => settingStore.mode, (newMode) => {
  if (newMode === 'auto') {
    gameStore.isWaitingForManualInput = false
    // TODO: hideAllActionPopups()
    gameStore.log('🔄 切换到自动模式')
  }
})

// 监听预设启用状态变化
watch(anyPresetEnabled, (enabled) => {
  if (!enabled) {
    resetPresetData()
  }
})

// 组件挂载时检查预设状态
onMounted(() => {
  if (anyPresetEnabled.value) {
    initPresetUI()
  }
})
</script>

<style scoped>
.config-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section {
  background: var(--bg-white);
  padding: 15px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.readonly-input {
  background-color: #f0f0f0;
  cursor: not-allowed;
}

select:disabled {
  background-color: #eee;
  cursor: not-allowed;
}

/* 预设相关样式 */
#preset-controls h4 {
  margin: 10px 0 8px 0;
  font-size: 13px;
  color: #555;
  font-weight: 600;
}

.player-hand-preset {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 8px;
}

.player-hand-preset strong {
  min-width: 30px;
  font-size: 12px;
  color: #333;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .config-panel {
    gap: 15px;
  }

  .section {
    padding: 12px;
  }

  .form-row {
    font-size: 13px;
  }

  .form-row input,
  .form-row select {
    font-size: 13px;
  }

  .player-hand-preset strong {
    min-width: 25px;
    font-size: 11px;
  }
}
</style>
