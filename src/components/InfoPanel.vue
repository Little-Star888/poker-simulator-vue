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
              <th>Preflop</th>
              <th>Flop</th>
              <th>Turn</th>
              <th>River</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in playerCount" :key="i">
              <td><strong>P{{ i }}</strong></td>
              <td>{{ getActions(i, 'preflop') }}</td>
              <td>{{ getActions(i, 'flop') }}</td>
              <td>{{ getActions(i, 'turn') }}</td>
              <td>{{ getActions(i, 'river') }}</td>
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
            v-for="(suggestion, index) in currentSuggestions"
            :key="index"
            class="suggestion-item"
          >
            <strong>{{ suggestion.playerId }}:</strong>
            <pre>{{ formatSuggestion(suggestion.data) }}</pre>
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

const gameStore = useGameStore()
const settingStore = useSettingStore()

const suggestionDisplay = ref<HTMLElement>()
const consoleLog = ref<HTMLTextAreaElement>()

// 计算属性
const playerCount = computed(() => settingStore.playerCount)

const currentSuggestions = computed(() => {
  const suggestions = []
  for (const playerId in gameStore.currentSuggestionsCache) {
    suggestions.push({
      playerId,
      data: gameStore.currentSuggestionsCache[playerId]
    })
  }
  return suggestions
})

const consoleText = computed(() => {
  return gameStore.consoleMessages.join('\n')
})

// 格式化 GTO 建议
const formatSuggestion = (suggestion: any) => {
  if (!suggestion || !suggestion.response) {
    return '无建议数据'
  }

  try {
    const response = suggestion.response
    let output = ''

    if (response.advices && Array.isArray(response.advices)) {
      output += '建议动作:\n'
      response.advices.forEach((advice: any, index: number) => {
        output += `  ${index + 1}. ${advice.action} - 频率: ${(advice.frequency * 100).toFixed(1)}%`
        if (advice.sizingRange) {
          output += ` (${advice.sizingRange.min}-${advice.sizingRange.max})`
        }
        output += '\n'
      })
    }

    if (response.explanation) {
      output += `\n说明: ${response.explanation}`
    }

    return output || JSON.stringify(suggestion, null, 2)
  } catch (error) {
    return JSON.stringify(suggestion, null, 2)
  }
}

// 获取玩家的行动记录
const getActions = (playerIndex: number, round: 'preflop' | 'flop' | 'turn' | 'river') => {
  const playerId = `P${playerIndex}`
  const actions = gameStore.actionRecords[playerId]?.[round]
  return actions && actions.length > 0 ? actions.join(', ') : '-'
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
  min-height: 0;
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

.suggestion-item {
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #444;
}

.suggestion-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.suggestion-item strong {
  color: #66d9ef;
  display: block;
  margin-bottom: 5px;
}

.suggestion-item pre {
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
  flex: 1;
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
