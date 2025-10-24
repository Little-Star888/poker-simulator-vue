<template>
  <div class="info-panel">
    <!-- 行动历史表 -->
    <div class="section">
      <h3>📊 玩家行动 (ActionSheet)</h3>
      <div id="action-sheet-container">
        <table id="action-sheet">
          <thead>
            <tr>
              <th>玩家</th>
              <th colspan="4">Preflop</th>
              <th colspan="4">Flop</th>
              <th colspan="4">Turn</th>
              <th colspan="4">River</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="playerId in sortedPlayerIds" :key="playerId">
              <td><strong>{{ playerId }}<span v-if="getPlayerRole(playerId)"> ({{ getPlayerRole(playerId) }})</span></strong></td>
              <td v-for="i in 4" :key="`${playerId}-preflop-${i}`">{{ getAction(playerId, 'preflop', i - 1) }}</td>
              <td v-for="i in 4" :key="`${playerId}-flop-${i}`">{{ getAction(playerId, 'flop', i - 1) }}</td>
              <td v-for="i in 4" :key="`${playerId}-turn-${i}`">{{ getAction(playerId, 'turn', i - 1) }}</td>
              <td v-for="i in 4" :key="`${playerId}-river-${i}`">{{ getAction(playerId, 'river', i - 1) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- GTO 建议显示区域 -->
    <div class="section">
      <h3>💡 GTO 建议</h3>
      <div id="suggestion-display" ref="suggestionDisplay">
        <div v-if="currentSuggestions.length > 0">
          <div
            v-for="(phaseGroup, phaseIndex) in currentSuggestions"
            :key="phaseIndex"
            class="phase-container"
            :data-phase="phaseGroup.phase"
          >
            <!-- 阶段标题 -->
            <h3 class="phase-title">{{ phaseGroup.phase }}</h3>

            <!-- 该阶段的所有建议 -->
            <div
              v-for="(suggestion, index) in phaseGroup.suggestions"
              :key="index"
              class="suggestion-item"
              :data-player-id="suggestion.playerId"
            >
              <div v-html="formatSuggestion(suggestion)"></div>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          等待玩家行动...
        </div>
      </div>
    </div>

    <!-- 控制台日志 -->
    <div class="section">
      <h3>📜 Console 日志</h3>
      <textarea
        id="console-log"
        ref="consoleLog"
        :value="consoleText"
        readonly
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useSettingStore } from '@/stores/settingStore'
import { formatSuggestionToHTML } from '@/utils/suggestionFormatter'

const gameStore = useGameStore()
const settingStore = useSettingStore()

const suggestionDisplay = ref<HTMLElement>()
const consoleLog = ref<HTMLTextAreaElement>()

// 计算属性
const playerCount = computed(() => settingStore.playerCount)

// 按盲注顺序排序的玩家ID列表
const sortedPlayerIds = computed(() => {
  const gameState = gameStore.currentGameState
  if (!gameState || !gameState.players) {
    // 如果没有游戏状态，返回默认顺序
    return Array.from({ length: playerCount.value }, (_, i) => `P${i + 1}`)
  }

  // 角色顺序：SB, BB, 然后按位置顺序
  const roleOrder = ['SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'MP1', 'MP2', 'HJ', 'CO', 'BTN']

  // 创建玩家ID到角色的映射
  const playerRoleMap = new Map<string, string>()
  gameState.players.forEach(player => {
    if (player.role) {
      playerRoleMap.set(player.id, player.role)
    }
  })

  // 按角色顺序排序玩家
  const allPlayerIds = Array.from({ length: playerCount.value }, (_, i) => `P${i + 1}`)

  return allPlayerIds.sort((a, b) => {
    const roleA = playerRoleMap.get(a)
    const roleB = playerRoleMap.get(b)

    if (!roleA && !roleB) return 0
    if (!roleA) return 1
    if (!roleB) return -1

    const indexA = roleOrder.indexOf(roleA)
    const indexB = roleOrder.indexOf(roleB)

    if (indexA === -1 && indexB === -1) return 0
    if (indexA === -1) return 1
    if (indexB === -1) return -1

    return indexA - indexB
  })
})

// 获取玩家角色
const getPlayerRole = (playerId: string) => {
  const gameState = gameStore.currentGameState
  if (!gameState || !gameState.players) {
    return ''
  }

  const player = gameState.players.find(p => p.id === playerId)
  return player?.role || ''
}

const currentSuggestions = computed(() => {
  console.log('[InfoPanel] currentSuggestionsCache:', gameStore.currentSuggestionsCache)
  console.log('[InfoPanel] gtoSuggestionFilter:', Array.from(gameStore.gtoSuggestionFilter))

  // 按阶段组织的建议结构：{phase: {playerId: {suggestion, timestamp}}}
  const phaseSuggestions = new Map() // phase -> Map(playerId -> {suggestion, timestamp})
  const filterSet = gameStore.gtoSuggestionFilter

  // 遍历建议数组，按阶段和玩家组织
  gameStore.currentSuggestionsCache.forEach((item) => {
    if (filterSet.has(item.playerId) && item.suggestion) {
      // 使用直接存储的阶段信息，如果没有则使用默认值
      const phase = item.phase || 'unknown'

      if (!phaseSuggestions.has(phase)) {
        phaseSuggestions.set(phase, new Map())
      }

      const phaseMap = phaseSuggestions.get(phase)
      // 保留每个玩家在每个阶段的最新建议
      if (!phaseMap.has(item.playerId) ||
          (item.timestamp && phaseMap.get(item.playerId).timestamp <= item.timestamp)) {
        phaseMap.set(item.playerId, {
          suggestion: item.suggestion,
          timestamp: item.timestamp
        })
      }
    }
  })

  // 转换为按阶段分组的显示格式（类似原版JS项目的phase-container结构）
  const groupedSuggestions = []
  const phaseOrder = ['river', 'turn', 'flop', 'preflop'] // 阶段显示顺序：最新阶段在前

  for (const phase of phaseOrder) {
    if (phaseSuggestions.has(phase)) {
      const phaseMap = phaseSuggestions.get(phase)
      const phaseData = {
        phase: phase.toUpperCase(),
        suggestions: []
      }

      for (const [playerId, suggestionData] of phaseMap) {
        console.log(`[InfoPanel] 处理玩家 ${playerId} 在 ${phase} 阶段的建议`)
        phaseData.suggestions.push({
          playerId,
          data: suggestionData.suggestion,
          timestamp: suggestionData.timestamp
        })
      }

      // 按时间戳排序，最新的在前
      phaseData.suggestions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))

      if (phaseData.suggestions.length > 0) {
        groupedSuggestions.push(phaseData)
      }
    }
  }

  // 处理其他未知阶段的建议
  for (const [phase, phaseMap] of phaseSuggestions) {
    if (!phaseOrder.includes(phase)) {
      const phaseData = {
        phase: phase.toUpperCase(),
        suggestions: []
      }

      for (const [playerId, suggestionData] of phaseMap) {
        phaseData.suggestions.push({
          playerId,
          data: suggestionData.suggestion,
          timestamp: suggestionData.timestamp
        })
      }

      phaseData.suggestions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))

      if (phaseData.suggestions.length > 0) {
        groupedSuggestions.push(phaseData)
      }
    }
  }

  console.log('[InfoPanel] 最终分组建议列表:', groupedSuggestions)
  console.log('[InfoPanel] 建议组数:', groupedSuggestions.length)

  return groupedSuggestions
})

const consoleText = computed(() => {
  return gameStore.consoleMessages.join('\n')
})

// 格式化 GTO 建议
const formatSuggestion = (suggestion: any) => {
  console.log('[InfoPanel.formatSuggestion] 输入:', suggestion)

  // 格式与原版JS项目一致：给 P8 的建议 (12:36:01) [PREFLOP]:
  const timeStr = suggestion.timestamp ? new Date(suggestion.timestamp).toLocaleTimeString() : ''

  // 尝试从多个位置获取阶段信息，优先使用存储的phase信息
  let phaseText = 'UNKNOWN'
  if (suggestion.phase) {
    phaseText = suggestion.phase.toUpperCase()
  } else if (suggestion.data?.response?.gameState?.currentRound) {
    phaseText = suggestion.data.response.gameState.currentRound.toUpperCase()
  } else if (suggestion.data?.response?.phase) {
    phaseText = suggestion.data.response.phase.toUpperCase()
  }

  // 生成标题，但不让formatSuggestionToHTML重复生成
  const titleHtml = `
    <div class="suggestion-header">
      <h4 style="margin: 0 0 5px 0; color: #66d9ef;">
        给 ${suggestion.playerId} 的建议 (${timeStr}) <span style="color: #fd971f;">[${phaseText}]</span>:
      </h4>
    </div>
  `

  const contentHtml = formatSuggestionToHTML(suggestion, { includeTitle: false })

  const result = `
    <div class="suggestion-wrapper">
      ${titleHtml}
      <div class="suggestion-content">
        ${contentHtml}
      </div>
    </div>
  `

  console.log('[InfoPanel.formatSuggestion] 输出 HTML 长度:', result.length)
  return result
}

// 获取特定索引位置的动作
const getAction = (playerId: string, round: 'preflop' | 'flop' | 'turn' | 'river', index: number) => {
  const actions = gameStore.actionRecords[playerId]?.[round]
  if (!actions || index >= actions.length) {
    return '-'
  }
  return actions[index]
}

// 根据玩家ID获取行动记录（保留兼容性）
const getActionsByPlayerId = (playerId: string, round: 'preflop' | 'flop' | 'turn' | 'river') => {
  const actions = gameStore.actionRecords[playerId]?.[round]
  return actions && actions.length > 0 ? actions.join(', ') : '-'
}

// 获取玩家的行动记录（保留兼容性）
const getActions = (playerIndex: number, round: 'preflop' | 'flop' | 'turn' | 'river') => {
  const playerId = `P${playerIndex}`
  return getActionsByPlayerId(playerId, round)
}

// 自动滚动控制台到底部
watch(consoleText, async () => {
  await nextTick()
  if (consoleLog.value) {
    consoleLog.value.scrollTop = consoleLog.value.scrollHeight
  }
})
</script>

<style scoped>
.info-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.section {
  background: var(--bg-white);
  padding: 15px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
}

.section:last-child {
  flex: 1;
  min-height: 200px;
  margin-bottom: 0;
}

#suggestion-display {
  padding: 10px;
  background: #272822;
  color: #f8f8f2;
  border-radius: 4px;
  min-height: 150px;
  max-height: 40vh;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  border: 1px solid #333;
}

/* 阶段容器样式（类似原版JS项目的phase-container） */
.phase-container {
  margin-bottom: 20px;
}

.phase-title {
  color: #fd971f;
  border-bottom: 1px solid #fd971f;
  padding-bottom: 5px;
  margin-bottom: 10px;
  margin-top: 0;
  font-size: 1.2em;
}

.suggestion-item {
  margin-bottom: 15px;
  border-bottom: 1px solid #444;
  padding-bottom: 10px;
  margin-left: 10px;
}

.suggestion-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.suggestion-item :deep(h4) {
  margin: 0 0 8px 0;
  color: #66d9ef;
}

.suggestion-item :deep(h5) {
  color: #f92672;
  margin-top: 12px;
  margin-bottom: 8px;
  border-bottom: 1px solid #555;
  padding-bottom: 4px;
  font-size: 14px;
}

.suggestion-item :deep(strong) {
  color: #a6e22e;
}

.suggestion-item :deep(pre) {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
}

.empty-state {
  color: #888;
  text-align: center;
  padding: 20px;
  font-style: italic;
}

#action-sheet-container {
  overflow-x: auto;
}

#action-sheet {
  border-collapse: collapse;
  width: 100%;
  font-size: 12px;
}

#action-sheet th,
#action-sheet td {
  border: 1px solid #ddd;
  padding: 4px 8px;
  text-align: center;
  white-space: nowrap;
}

#action-sheet thead {
  background-color: #f2f2f2;
  position: sticky;
  top: 0;
}

#action-sheet th {
  font-weight: bold;
  color: #333;
}

#action-sheet tbody tr:nth-child(even) {
  background-color: #f9f9f9;
}

#action-sheet tbody tr:hover {
  background-color: #f0f0f0;
}

#console-log {
  flex: 1;
  background: #1e1e1e;
  color: #0f0;
  padding: 12px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  border: 1px solid #333;
  border-radius: 4px;
  resize: none;
  min-height: 150px;
  width: 100%;
}

#console-log::-webkit-scrollbar {
  width: 8px;
}

#console-log::-webkit-scrollbar-track {
  background: #2d2d2d;
}

#console-log::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;
}

#console-log::-webkit-scrollbar-thumb:hover {
  background: #777;
}

/* 响应式调整 */
@media (max-width: 768px) {
  #suggestion-display {
    font-size: 11px;
    max-height: 200px;
  }

  #action-sheet {
    font-size: 10px;
  }

  #action-sheet th,
  #action-sheet td {
    padding: 2px 4px;
  }

  #console-log {
    font-size: 11px;
    min-height: 100px;
  }
}
</style>
