<template>
  <div class="action-bar">
    <div id="game-controls" style="display: flex; gap: 10px;">
      <button
        id="start-btn"
        class="game-control-btn"
        @click="handleStartStop"
        :disabled="isProcessing"
      >
        <i class="material-icons">{{ isGameRunning ? 'stop' : 'play_arrow' }}</i>
        <span>{{ isGameRunning ? '停止' : '开始' }}</span>
      </button>

      <button
        id="pause-btn"
        class="game-control-btn"
        @click="handlePause"
        :disabled="!isGameRunning || isProcessing"
      >
        <i class="material-icons">{{ isGamePaused ? 'play_arrow' : 'pause' }}</i>
        <span>{{ isGamePaused ? '继续' : '暂停' }}</span>
      </button>

      <button
        id="save-snapshot-btn"
        class="game-control-btn"
        @click="handleSaveSnapshot"
        :disabled="!isGameRunning || isProcessing"
        title="保存当前牌局快照"
      >
        <i class="material-icons">camera_alt</i>
        <span>保存快照</span>
      </button>

      <!-- Config Toggle Button (Mobile Only) -->
      <button
        id="config-toggle-btn"
        class="game-control-btn"
        @click="$emit('toggle-drawer')"
      >
        <i class="material-icons">settings</i>
        <span>配置</span>
      </button>
    </div>

    <!-- Replay Controls (shown only in replay mode) -->
    <div v-if="isInReplayMode" id="replay-controls" style="display: flex; gap: 10px;">
      <button
        id="replay-reset-btn"
        class="game-control-btn"
        @click="handleReplayReset"
        :disabled="isProcessing"
      >
        <i class="material-icons">replay</i>
        <span>重置</span>
      </button>

      <button
        id="replay-prev-btn"
        class="game-control-btn"
        @click="handleReplayPrev"
        :disabled="isProcessing"
      >
        <i class="material-icons">skip_previous</i>
      </button>

      <button
        id="replay-play-pause-btn"
        class="game-control-btn"
        @click="handleReplayPlayPause"
        :disabled="isProcessing"
      >
        <i class="material-icons">{{ isReplayPlaying ? 'pause' : 'play_arrow' }}</i>
      </button>

      <button
        id="replay-next-btn"
        class="game-control-btn"
        @click="handleReplayNext"
        :disabled="isProcessing"
      >
        <i class="material-icons">skip_next</i>
      </button>

      <button
        id="replay-exit-btn"
        class="game-control-btn danger-btn"
        @click="handleReplayExit"
        :disabled="isProcessing"
      >
        <i class="material-icons">exit_to_app</i>
        <span>退出回放</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '@/stores/gameStore'

// Emits
defineEmits<{
  'toggle-drawer': []
}>()

const gameStore = useGameStore()

// Local state
const isProcessing = ref(false)
const isReplayPlaying = ref(false)

// Computed
const isGameRunning = computed(() => gameStore.isGameRunning)
const isGamePaused = computed(() => gameStore.isGamePaused)
const isInReplayMode = computed(() => gameStore.isInReplayMode)

// Methods
const handleStartStop = async () => {
  if (isProcessing.value) return
  isProcessing.value = true

  try {
    if (isGameRunning.value) {
      gameStore.stopGame()
    } else {
      await gameStore.startNewGame()
    }
  } finally {
    setTimeout(() => {
      isProcessing.value = false
    }, 300)
  }
}

const handlePause = async () => {
  if (isProcessing.value) return
  isProcessing.value = true

  try {
    await gameStore.togglePause()
  } finally {
    setTimeout(() => {
      isProcessing.value = false
    }, 300)
  }
}

const handleSaveSnapshot = () => {
  if (isProcessing.value || !isGameRunning.value) return
  // TODO: Implement snapshot functionality
  gameStore.log('💾 保存快照功能（开发中）')
}

const handleReplayReset = () => {
  if (isProcessing.value) return
  // TODO: Implement replay reset
  gameStore.log('🔄 重置回放（开发中）')
}

const handleReplayPrev = () => {
  if (isProcessing.value) return
  // TODO: Implement replay previous
  gameStore.log('⏮️ 上一步（开发中）')
}

const handleReplayPlayPause = () => {
  if (isProcessing.value) return
  isReplayPlaying.value = !isReplayPlaying.value
  // TODO: Implement replay play/pause
  gameStore.log(`${isReplayPlaying.value ? '▶️' : '⏸️'} 回放${isReplayPlaying.value ? '播放' : '暂停'}（开发中）`)
}

const handleReplayNext = () => {
  if (isProcessing.value) return
  // TODO: Implement replay next
  gameStore.log('⏭️ 下一步（开发中）')
}

const handleReplayExit = () => {
  if (isProcessing.value) return
  gameStore.exitReplayMode()
  gameStore.log('🚪 退出回放模式')
}
</script>

<style scoped>
.action-bar {
  height: 80px;
  border-top: 1px solid #ccc;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0 10px;
  background: var(--bg-white);
  flex-wrap: wrap;
  gap: 10px;
}

#game-controls,
#replay-controls {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

#start-btn {
  background-color: var(--accent-color);
}

#start-btn:hover:not(:disabled) {
  background-color: #218838;
}

#pause-btn {
  background-color: #ffc107;
  color: #333;
}

#pause-btn:hover:not(:disabled) {
  background-color: #e0a800;
}

#pause-btn:disabled {
  background-color: #6c757d;
  color: #ffffff;
}

#save-snapshot-btn {
  background-color: #007bff;
}

#save-snapshot-btn:hover:not(:disabled) {
  background-color: #0069d9;
}

#config-toggle-btn {
  background-color: #6c757d;
}

#config-toggle-btn:hover:not(:disabled) {
  background-color: #5a6268;
}

.danger-btn {
  background-color: #dc3545;
}

.danger-btn:hover:not(:disabled) {
  background-color: #c82333;
}

/* Hide config toggle on desktop */
@media (min-width: 1200px) {
  #config-toggle-btn {
    display: none;
  }
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .action-bar {
    height: auto;
    min-height: 80px;
    padding: 10px;
  }

  .game-control-btn {
    font-size: 14px;
    padding: 6px 12px;
  }

  .game-control-btn span {
    display: none;
  }

  .game-control-btn i {
    margin: 0;
  }
}

@media (max-width: 480px) {
  #game-controls,
  #replay-controls {
    justify-content: center;
    width: 100%;
  }

  .game-control-btn {
    flex: 0 0 auto;
    min-width: 44px;
  }
}
</style>
