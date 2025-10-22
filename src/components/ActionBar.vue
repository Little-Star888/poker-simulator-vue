<template>
  <div class="action-bar">
    <div id="game-controls" v-show="!isInReplayMode" style="display: flex; gap: 10px;">
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
    <div v-show="isInReplayMode" id="replay-controls" style="display: flex; gap: 10px;">
      <button
        id="replay-play-pause-btn"
        class="game-control-btn"
        @click="handleReplayPlayPause"
        :disabled="isProcessing"
      >
        {{ isReplayPlaying ? '⏸️ 暂停' : '▶️ 播放' }}
      </button>

      <button
        id="replay-next-btn"
        class="game-control-btn"
        @click="handleReplayNext"
        :disabled="isProcessing"
      >
        ⏭️ 下一步
      </button>

      <button
        id="replay-prev-btn"
        class="game-control-btn"
        @click="handleReplayPrev"
        :disabled="isProcessing"
      >
        ⏮️ 上一步
      </button>

      <button
        id="replay-reset-btn"
        class="game-control-btn"
        @click="handleReplayReset"
        :disabled="isProcessing"
      >
        🔄 重置
      </button>

      <button
        id="replay-exit-btn"
        class="game-control-btn danger-btn"
        @click="handleReplayExit"
        :disabled="isProcessing"
      >
        ⏹️ 退出
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

// Computed
const isGameRunning = computed(() => gameStore.isGameRunning)
const isGamePaused = computed(() => gameStore.isGamePaused)
const isInReplayMode = computed(() => gameStore.isInReplayMode)

// 回放播放状态：基于replayInterval判断，与原版逻辑一致
const isReplayPlaying = computed(() => gameStore.replayInterval !== null)

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

  // 调用全局方法打开截图选择器
  if ((window as any).showScreenshotSelector) {
    (window as any).showScreenshotSelector()
  } else {
    gameStore.log('⚠️ 截图功能未初始化')
  }
}

const handleReplayReset = () => {
  if (isProcessing.value) return
  isProcessing.value = true

  try {
    gameStore.resetReplay()
    gameStore.log('🔄 回放已重置')
  } finally {
    setTimeout(() => {
      isProcessing.value = false
    }, 300)
  }
}

const handleReplayPrev = () => {
  if (isProcessing.value) return
  isProcessing.value = true

  try {
    gameStore.prevReplayStep()
  } finally {
    setTimeout(() => {
      isProcessing.value = false
    }, 300)
  }
}

const handleReplayPlayPause = () => {
  if (isProcessing.value) return
  isProcessing.value = true

  try {
    gameStore.playPauseReplay()
  } finally {
    setTimeout(() => {
      isProcessing.value = false
    }, 300)
  }
}

const handleReplayNext = () => {
  if (isProcessing.value) return
  isProcessing.value = true

  try {
    gameStore.nextReplayStep(true) // 手动点击
  } finally {
    setTimeout(() => {
      isProcessing.value = false
    }, 300)
  }
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

/* 回放控制面板按钮颜色 - 与原版完全一致 */
#replay-play-pause-btn {
  background-color: #28a745;
  color: white;
}

#replay-play-pause-btn:hover:not(:disabled) {
  background-color: #218838;
}

#replay-play-pause-btn:disabled {
  background-color: #6c757d;
  color: white;
}

#replay-play-pause-btn:disabled:hover {
  background-color: #6c757d;
}

#replay-next-btn,
#replay-prev-btn {
  background-color: #17a2b8;
  color: white;
}

#replay-next-btn:hover:not(:disabled),
#replay-prev-btn:hover:not(:disabled) {
  background-color: #138496;
}

#replay-next-btn:disabled,
#replay-prev-btn:disabled {
  background-color: #6c757d;
  color: white;
}

#replay-next-btn:disabled:hover,
#replay-prev-btn:disabled:hover {
  background-color: #6c757d;
}

#replay-reset-btn {
  background-color: #ffc107;
  color: #212529;
}

#replay-reset-btn:hover:not(:disabled) {
  background-color: #e0a800;
}

#replay-reset-btn:disabled {
  background-color: #6c757d;
  color: white;
}

#replay-reset-btn:disabled:hover {
  background-color: #6c757d;
}

#replay-exit-btn {
  background-color: #dc3545;
  color: white;
}

#replay-exit-btn:hover:not(:disabled) {
  background-color: #c82333;
}

#replay-exit-btn:disabled {
  background-color: #6c757d;
  color: white;
}

#replay-exit-btn:disabled:hover {
  background-color: #6c757d;
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
