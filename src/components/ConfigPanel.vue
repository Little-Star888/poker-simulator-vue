<template>
  <div class="config-panel">
    <!-- 运行配置 -->
    <div class="section" id="runtime-config-section">
      <h3>⚙️ 运行配置</h3>

      <fieldset :disabled="isGameInProgress" :class="{ 'disabled-section': isGameInProgress }">
        <div class="form-row">
          <label>游戏模式:</label>
          <select v-model="settingStore.mode" class="mode-select" style="width:72px;">
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
            class="blind-input"
            style="width:50px;"
          /> /
          <input
            type="number"
            :value="settingStore.bb"
            readonly
            class="readonly-input blind-input"
            min="1"
            style="width:50px;"
          />
        </div>

        <div class="form-row">
          <label>底池类型:</label>
          <select
            v-model="settingStore.potType"
            :disabled="isGameInProgress || settingStore.mode === 'manual'"
            class="pot-type-select"
          >
            <option value="unrestricted">无限制</option>
            <option value="single_raised">单一加注底池</option>
            <option value="3bet">3-Bet 底池</option>
            <option value="4bet">4-Bet及以上</option>
          </select>
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
        </div>

        <div class="form-row">
          <label>玩家思考时间 (ms):</label>
          <input
            type="number"
            v-model.number="settingStore.autoDelay"
            min="100"
            class="delay-input"
            style="width:50px;"
          />
        </div>

        <div class="form-row">
          <label>P1开局位置:</label>
          <select v-model="settingStore.p1Role" class="role-select" style="width:72px;">
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
            class="stack-input"
            style="width:65px;"
          /> -
          <input
            type="number"
            v-model.number="settingStore.maxStack"
            min="1"
            class="stack-input"
            style="width:65px;"
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
      </fieldset>

      <fieldset :disabled="isReplayMode" :class="{ 'disabled-section': isReplayMode }">
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
      </fieldset>
    </div>

    <!-- 牌局预设 -->
    <div class="section" id="preset-section">
      <h3>🃏 牌局预设</h3>
      <fieldset :disabled="isGameInProgress" :class="{ 'disabled-section': isGameInProgress }">
        <div class="form-row">
          <label>预设选项:</label>
          <label>
            <input
              type="checkbox"
              v-model="settingStore.usePresetCommunity"
              @change="onPresetChange"
            />
            预设公共牌
          </label>
          <label>
            <input
              type="checkbox"
              v-model="settingStore.usePresetHands"
              @change="onPresetChange"
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
            <div class="community-cards-row">
              <strong>Flop:</strong>
              <PresetSlot
                v-for="i in 3"
                :key="`flop-${i}`"
                type="community"
                stage="flop"
                :card-index="i - 1"
                :card="settingStore.presetCards.flop[i - 1]"
              />
              <strong class="turn-label">Turn:</strong>
              <PresetSlot
                type="community"
                stage="turn"
                :card-index="0"
                :card="settingStore.presetCards.turn[0]"
              />
              <strong class="river-label">River:</strong>
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
            class="preset-player-hands-container"
          >
            <h4>玩家手牌:</h4>
            <div class="preset-player-hands-grid">
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
          </div>

          <!-- 卡牌选择器 -->
          <CardPicker v-if="anyPresetEnabled" />
        </div>
      </fieldset>
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

// 根据游戏状态禁用配置
const isGameInProgress = computed(() => gameStore.isGameRunning || gameStore.isInReplayMode)
const isReplayMode = computed(() => gameStore.isInReplayMode)

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
  } else if (enabled && !gameStore.isPresetUIInitialized) {
    // 预设功能刚启用时，初始化并激活第一个槽位
    initPresetUI()
    setTimeout(() => {
      activateNextEmptySlot()
    }, 200)
  }
})

// 组件挂载时检查预设状态
onMounted(() => {
  if (anyPresetEnabled.value) {
    initPresetUI()
    // 延迟激活第一个槽位，确保DOM已渲染
    setTimeout(() => {
      activateNextEmptySlot()
    }, 200)
  }
})
</script>

<style scoped>
fieldset {
  border: none;
  padding: 0;
  margin: 0;
}

.disabled-section {
  opacity: 0.6;
  pointer-events: none;
}

.config-panel {
  display: flex;
  flex-direction: column;
  gap: 0px; /* 减小间距，介于原版和当前之间 */
}

.section {
  background: #ffffff; /* 使用硬编码颜色值 */
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #ddd; /* 使用硬编码颜色值 */
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

/* 公共牌槽位布局 */
.community-cards-row {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: nowrap; /* 确保不换行 */
}

.community-cards-row .turn-label,
.community-cards-row .river-label {
  margin-left: 5px;
}

/* 玩家手牌槽位布局 - 修复标题对齐问题 */
.preset-player-hands-container {
  margin-top: 15px;
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preset-player-hands-container h4 {
  margin: 10px 0 8px 0; /* 与公共牌标题保持一致 */
  text-align: left; /* 左对齐，与公共牌标题一致 */
}

.preset-player-hands-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 160px); /* 与原版一致 */
  gap: 10px;
  justify-content: center;
}

/* 移动端手牌槽位布局优化 */
@media (max-width: 768px) {
  .preset-player-hands-grid {
    grid-template-columns: repeat(2, 1fr); /* 移动端固定两列 */
    gap: 8px;
    justify-content: stretch;
  }
}

/* 小屏幕手牌槽位进一步优化 */
@media (max-width: 480px) {
  .preset-player-hands-grid {
    grid-template-columns: repeat(2, 1fr); /* 保持两列 */
    gap: 6px;
    padding: 0 5px; /* 添加一些内边距 */
  }
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

  .player-hand-preset {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px;
    background: #f9f9f9;
    border-radius: 6px;
    border: 1px solid #eee;
  }

  .player-hand-preset strong {
    min-width: 35px;
    font-size: 12px;
    font-weight: 600;
    color: #333;
  }

  /* 优化PresetSlot在移动端的显示 */
  .preset-player-hands-grid .preset-card-slot {
    width: 28px;
    height: 40px;
    /* flex: 1; REMOVED */
  }
}
</style>
