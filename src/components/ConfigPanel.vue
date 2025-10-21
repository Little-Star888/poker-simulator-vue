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
          <label style="margin-right: 10px; width: auto;">
            <input type="checkbox" v-model="settingStore.suggestOnPreflop"> Preflop
          </label>
          <label style="margin-right: 10px; width: auto;">
            <input type="checkbox" v-model="settingStore.suggestOnFlop"> Flop
          </label>
          <label style="margin-right: 10px; width: auto;">
            <input type="checkbox" v-model="settingStore.suggestOnTurn"> Turn
          </label>
          <label style="margin-right: 10px; width: auto;">
            <input type="checkbox" v-model="settingStore.suggestOnRiver"> River
          </label>
        </div>
      </div>

      <div class="form-row">
        <label>GTO建议筛选:</label>
        <div id="gto-filter-players" style="display: flex; flex-wrap: wrap; align-items: center;">
          <label
            v-for="i in settingStore.playerCount"
            :key="i"
            style="margin-right: 10px; width: auto;"
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
          min="2"
          max="8"
          style="width: 50px;"
        />
        <label style="width: auto; margin-left: 15px; margin-right: 10px;">底池类型:</label>
        <select
          v-model="settingStore.potType"
          :disabled="settingStore.mode === 'manual'"
          style="width: 130px;"
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
        <label style="width: auto; margin-left: 20px;">
          <input type="checkbox" v-model="settingStore.usePresetCommunity" />
          预设公共牌
        </label>
        <label style="width: auto; margin-left: 10px;">
          <input type="checkbox" v-model="settingStore.usePresetHands" />
          预设手牌
        </label>
      </div>
      <div
        v-show="settingStore.usePresetCommunity || settingStore.usePresetHands"
        id="preset-controls"
      >
        <p style="color: #666; font-size: 12px; margin-top: 10px;">
          预设功能已启用（详细配置将在后续实现）
        </p>
      </div>
    </div>

    <!-- 快照管理 -->
    <div class="section" id="snapshot-management-section">
      <h3>💾 牌局快照管理</h3>
      <div id="snapshot-list-container">
        <p style="color: #666; text-align: center; padding: 20px;">
          快照管理功能（开发中）
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useSettingStore } from '@/stores/settingStore'
import type { PlayerRole } from '@/types'

const gameStore = useGameStore()
const settingStore = useSettingStore()

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

// 当 SB 改变时，自动更新 BB
const onSBChange = () => {
  settingStore.bb = settingStore.sb * 2
}

// 切换 GTO 筛选
const toggleGTOFilter = (playerId: string, event: Event) => {
  const target = event.target as HTMLInputElement
  gameStore.updateGTOFilter(playerId, target.checked)
}
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
</style>
