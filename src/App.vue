<template>
  <div class="app-container">
    <!-- Slide-out Drawer for Configurations -->
    <aside id="config-drawer" :class="['config-drawer', { 'is-open': isDrawerOpen }]">
      <button class="drawer-close-btn" @click="closeDrawer">&times;</button>
      <div class="config-drawer-content">
        <ConfigPanel ref="configPanelRef" />
      </div>
    </aside>
    <div
      class="drawer-overlay"
      :class="{ 'visible': isDrawerOpen }"
      @click="closeDrawer"
    ></div>

    <!-- Main Content -->
    <main class="main-content">
      <div class="table-area">
        <PokerTable />
        <ActionBar @toggle-drawer="toggleDrawer" />
      </div>

      <div class="info-panel-area">
        <InfoPanel />
      </div>
    </main>

    <!-- Screenshot Selection Overlay -->
    <ScreenshotSelector
      v-if="showScreenshotSelector"
      :visible="showScreenshotSelector"
      @complete="handleScreenshotCapture"
      @cancel="handleScreenshotCancel"
    />

    <!-- Snapshot Confirmation Modal -->
    <SnapshotModal
      v-model:visible="gameStore.showSnapshotModal"
      :preview-image="snapshotPreviewImage"
      :game-state="snapshotGameState"
      :gto-suggestions="snapshotGtoSuggestions"
      @confirm="handleSnapshotConfirm"
      @cancel="handleSnapshotCancel"
      @recapture="handleSnapshotRecapture"
      @saved="handleSnapshotSaved"
    />

    <!-- View Snapshot Modal -->
    <ViewSnapshotModal
      v-model:visible="gameStore.showViewSnapshotModal"
      :snapshot-id="gameStore.currentViewSnapshotId"
      @close="handleViewSnapshotClose"
    />

    <!-- End of Hand Modal -->
    <EndOfHandModal
      v-if="showEndOfHandModal"
      @confirm="handleEndOfHandConfirm"
      @cancel="handleEndOfHandCancel"
    />

    <!-- Toast Notification -->
    <div
      v-if="toastMessage"
      class="toast-notification"
      :class="{ show: toastVisible, error: toastIsError }"
    >
      {{ toastMessage }}
    </div>

    <!-- Loader Overlay -->
    <div v-if="isLoading" class="loader-overlay">
      <div class="loader-spinner"></div>
      <div class="loader-text">加载中...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import html2canvas from 'html2canvas'

import ConfigPanel from '@/components/ConfigPanel.vue'
import PokerTable from '@/components/PokerTable.vue'
import ActionBar from '@/components/ActionBar.vue'
import InfoPanel from '@/components/InfoPanel.vue'
import ScreenshotSelector from '@/components/ScreenshotSelector.vue'
import SnapshotModal from '@/components/SnapshotModal.vue'
import ViewSnapshotModal from '@/components/ViewSnapshotModal.vue'
import EndOfHandModal from '@/components/EndOfHandModal.vue'

// Stores
const gameStore = useGameStore()

// Refs
const configPanelRef = ref<InstanceType<typeof ConfigPanel> | null>(null)

// UI State
const isDrawerOpen = ref(false)
const showScreenshotSelector = ref(false)
const showEndOfHandModal = ref(false)
const toastMessage = ref('')
const toastVisible = ref(false)
const toastIsError = ref(false)
const isLoading = ref(false)

// Snapshot data
const snapshotPreviewImage = ref<string | null>(null)
const snapshotGameState = ref<any>(null)
const snapshotGtoSuggestions = ref<Record<string, any>>({})

// Methods
const toggleDrawer = () => {
  isDrawerOpen.value = !isDrawerOpen.value
}

const closeDrawer = () => {
  isDrawerOpen.value = false
}

// Screenshot handling
const handleScreenshotCapture = async (cropOptions: any) => {
  gameStore.log('📸 正在根据选定区域生成快照...')
  showScreenshotSelector.value = false

  try {
    const canvas = await html2canvas(document.body, {
      useCORS: true,
      backgroundColor: null,
      scale: 2,
      ...cropOptions
    })

    const imageData = canvas.toDataURL('image/png')
    gameStore.log('✅ 截图已生成。正在整理当前GTO建议...')

    // 获取游戏状态和 GTO 建议
    const gameState = gameStore.game?.getGameState()

    // 将当前建议缓存转换为数组格式
    gameStore.log('✅ 所有当前GTO建议已整理。请在弹窗中确认保存。')

    // 设置快照数据
    snapshotPreviewImage.value = imageData
    snapshotGameState.value = gameState
    snapshotGtoSuggestions.value = gameStore.currentSuggestionsCache

    // 显示快照确认模态框
    gameStore.showSnapshotModal = true

  } catch (error: any) {
    gameStore.log('❌ 截图失败: ' + error.message)
    console.error('截图失败:', error)
    snapshotPreviewImage.value = null
    snapshotGameState.value = null
    snapshotGtoSuggestions.value = {}
  }
}

const handleScreenshotCancel = () => {
  showScreenshotSelector.value = false
  gameStore.log('截图操作已取消。')

  // 执行快照后的操作（如果有）
  if (gameStore.postSnapshotAction) {
    gameStore.postSnapshotAction()
    gameStore.postSnapshotAction = null
  }
}

// Snapshot modal handling
const handleSnapshotConfirm = () => {
  // 由 SnapshotModal 内部处理保存逻辑
  gameStore.log('快照已确认保存')
}

const handleSnapshotCancel = () => {
  gameStore.showSnapshotModal = false
  snapshotPreviewImage.value = null
  snapshotGameState.value = null
  snapshotGtoSuggestions.value = {}

  // 执行快照后的操作（如果有）
  if (gameStore.postSnapshotAction) {
    gameStore.postSnapshotAction()
    gameStore.postSnapshotAction = null
  }
}

const handleSnapshotRecapture = () => {
  gameStore.showSnapshotModal = false

  // 短暂延迟后重新打开截图选择器
  setTimeout(() => {
    showScreenshotSelector.value = true
  }, 100)
}

const handleSnapshotSaved = (snapshotId: number) => {
  // 刷新快照列表
  if (configPanelRef.value) {
    configPanelRef.value.refreshSnapshotList()
  }

  // 执行快照后的操作（如果有）
  if (gameStore.postSnapshotAction) {
    gameStore.postSnapshotAction()
    gameStore.postSnapshotAction = null
  }

  // 自动打开查看快照模态框
  setTimeout(() => {
    gameStore.currentViewSnapshotId = snapshotId
    gameStore.showViewSnapshotModal = true
  }, 300)
}

// View snapshot modal handling
const handleViewSnapshotClose = () => {
  gameStore.showViewSnapshotModal = false
  gameStore.currentViewSnapshotId = null
}

// End of hand modal handling
const handleEndOfHandConfirm = () => {
  showEndOfHandModal.value = false
  // 设置快照后要执行的操作
  gameStore.postSnapshotAction = () => {
    gameStore.stopGame()
  }
  // 启动快照流程
  showScreenshotSelector.value = true
}

const handleEndOfHandCancel = () => {
  showEndOfHandModal.value = false
  gameStore.stopGame()
}

// Toast notification
const showToast = (message: string, duration: number = 2000, isError: boolean = false) => {
  toastMessage.value = message
  toastIsError.value = isError
  toastVisible.value = true

  setTimeout(() => {
    toastVisible.value = false
    setTimeout(() => {
      toastMessage.value = ''
    }, 300)
  }, duration)
}

// Loader
const showLoader = () => {
  isLoading.value = true
}

const hideLoader = () => {
  isLoading.value = false
}

// Expose methods to global scope for use by other components
;(window as any).showScreenshotSelector = () => {
  if (!gameStore.isGameRunning) {
    gameStore.log('⚠️ 游戏未开始，无法保存快照。')
    return
  }
  showScreenshotSelector.value = true
}

;(window as any).showEndOfHandModal = () => {
  showEndOfHandModal.value = true
}

;(window as any).showToast = showToast
;(window as any).showLoader = showLoader
;(window as any).hideLoader = hideLoader

// Initialize on mount
onMounted(() => {
  gameStore.log('德州扑克 AI 测试模拟器已加载')
  gameStore.log('Vue 3 + TypeScript + Pinia 版本')
})
</script>

<style scoped>
/* --- Base & Reset --- */
:root {
  --drawer-width: 420px;
  --header-height: 50px;
  --border-color: #ddd;
  --bg-light: #f5f5f5;
  --bg-white: #ffffff;
  --text-dark: #333;
  --text-light: #888;
  --accent-color: #28a745;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* --- Main Layout --- */
.app-container {
  display: flex;
  height: 100vh;
  position: relative;
  background-color: var(--bg-light);
  overflow: hidden;
}

/* --- Config Drawer --- */
.config-drawer {
  position: fixed;
  top: 0;
  left: 0;
  height: 100%;
  width: var(--drawer-width);
  max-width: 90vw;
  background: var(--bg-white);
  z-index: 2000;
  transform: translateX(-100%);
  transition: transform 0.3s ease-in-out;
  overflow-y: auto;
  border-right: 1px solid var(--border-color);
  box-shadow: 0 0 0 rgba(0,0,0,0);
}

.config-drawer.is-open {
  transform: translateX(0);
  box-shadow: 3px 0 15px rgba(0,0,0,0.2);
}

.config-drawer-content {
  padding: 20px;
  padding-top: 60px;
}

.drawer-close-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  font-size: 32px;
  font-weight: bold;
  color: #888;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  z-index: 10;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.drawer-close-btn:hover {
  color: #333;
  background-color: #f0f0f0;
}

/* --- Drawer Overlay --- */
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.4);
  z-index: 1999;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease-in-out, visibility 0.3s ease-in-out;
  pointer-events: none;
}

.drawer-overlay.visible {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

/* --- Main Content Area --- */
.main-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  transition: margin-left 0.3s ease-in-out;
}

/* --- Table Area --- */
.table-area {
  width: 100%;
  height: 70vh;
  min-height: 500px;
  position: relative;
  display: flex;
  flex-direction: column;
  background: #e8f5e9;
}

/* --- Info Panel Area --- */
.info-panel-area {
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex-grow: 1;
  overflow-y: auto;
  background: var(--bg-light);
}

/* --- Desktop Layout --- */
@media (min-width: 1200px) {
  .config-drawer {
    position: relative;
    transform: translateX(0);
    box-shadow: none;
    width: 25%;
    flex-shrink: 0;
  }

  .drawer-overlay,
  .drawer-close-btn {
    display: none !important;
  }

  .config-drawer-content {
    padding-top: 20px;
  }

  .main-content {
    flex-direction: row;
    width: 75%;
  }

  .table-area {
    width: 66.67%; /* 50% of viewport = 50/75 = 66.67% of main-content */
    height: 100%;
    border-right: 1px solid var(--border-color);
  }

  .info-panel-area {
    width: 33.33%; /* 25% of viewport = 25/75 = 33.33% of main-content */
    height: 100%;
    overflow-y: auto;
    padding: 20px;
  }
}

/* --- Toast Notification --- */
.toast-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #28a745;
  color: white;
  padding: 15px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  z-index: 10000;
  opacity: 0;
  transform: translateY(-20px);
  transition: opacity 0.3s, transform 0.3s;
  max-width: 400px;
  word-wrap: break-word;
}

.toast-notification.show {
  opacity: 1;
  transform: translateY(0);
}

.toast-notification.error {
  background: #dc3545;
}

/* --- Loader Overlay --- */
.loader-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.6);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.loader-spinner {
  border: 5px solid #f3f3f3;
  border-top: 5px solid #3498db;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  animation: spin 1s linear infinite;
}

.loader-text {
  color: white;
  margin-top: 20px;
  font-size: 16px;
  font-weight: 500;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* --- Mobile Responsive --- */
@media (max-width: 768px) {
  .table-area {
    height: 60vh;
    min-height: 400px;
  }

  .info-panel-area {
    padding: 10px;
    gap: 10px;
  }

  .toast-notification {
    right: 10px;
    left: 10px;
    max-width: none;
  }

  /* 移动端配置面板样式调整，与桌面端保持一致 */
  .config-drawer {
    max-width: 85vw; /* 增加最大宽度 */
    background: #ffffff !important; /* 确保背景色正确显示 */
    border-right: 1px solid #ddd !important; /* 确保边框显示 */
    box-shadow: 3px 0 15px rgba(0,0,0,0.2) !important; /* 确保阴影显示 */
  }

  .config-drawer-content {
    padding: 15px;
    padding-top: 60px; /* 保持顶部空间给关闭按钮 */
  }

  .section {
    padding: 12px; /* 稍微减少内边距 */
    margin-bottom: 10px;
    background: #ffffff !important; /* 确保section背景色 */
    border: 1px solid #ddd !important; /* 确保边框显示 */
  }

  .section h3 {
    font-size: 15px; /* 稍微减小标题字体 */
    margin-bottom: 10px;
  }

  .form-row {
    margin: 6px 0; /* 减少行间距 */
    font-size: 13px; /* 稍微减小字体 */
  }

  .form-row label {
    font-size: 13px;
  }

  .form-row input,
  .form-row select {
    font-size: 13px;
    padding: 5px 8px; /* 稍微减小内边距 */
  }

  /* 移动端特殊样式调整 */
  @media (max-width: 480px) {
    .config-drawer-content {
      padding: 12px;
      padding-top: 60px;
    }

    .section {
      padding: 10px;
      background: #ffffff !important; /* 确保小屏幕背景色 */
      border: 1px solid #ddd !important; /* 确保边框显示 */
    }

    .section h3 {
      font-size: 14px;
    }

    .form-row {
      font-size: 12px;
    }

    .form-row label {
      font-size: 12px;
    }

    .form-row input,
    .form-row select {
      font-size: 12px;
      padding: 4px 6px;
    }

    /* 表单行在小屏幕上的布局调整 */
    .form-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 5px;
    }

    .form-row label {
      margin-right: 0;
      margin-bottom: 2px;
    }

    /* GTO筛选在小屏幕上的布局 */
    .gto-filter-players {
      flex-wrap: wrap;
      gap: 8px;
    }

    /* GTO建议阶段容器在小屏幕上的布局 */
    #suggestion-phases {
      flex-direction: column;
      align-items: flex-start;
      gap: 5px;
    }

    #suggestion-phases label {
      width: 100%;
      justify-content: flex-start;
    }
  }
}
</style>

<style>
/* Global styles that need to be unscoped */
html, body {
  height: 100%;
  overflow: hidden;
  background-color: #f5f5f5;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

#app {
  height: 100%;
  width: 100%;
}

/* Section heading style */
.section {
  background: #ffffff !important;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #ddd !important;
}

/* 移动端配置面板强制背景色 */
@media (max-width: 768px) {
  .config-drawer .section {
    background: #ffffff !important;
    border: 1px solid #ddd !important;
  }
}

.section h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #333;
  border-bottom: 1px solid #ddd;
  padding-bottom: 8px;
  font-weight: 600;
}

/* Form row style */
.form-row {
  display: flex;
  align-items: center;
  margin: 8px 0;
  flex-wrap: wrap;
  gap: 8px;
}

.form-row label {
  font-size: 14px;
  color: #555;
  flex-shrink: 0;
  width: auto; /* 让标签根据其内容自动调整宽度 */
  margin-right: 10px; /* 在标签和输入框之间添加一些间距 */
}

/* 特殊处理包含checkbox的label */
.form-row label:has(input[type="checkbox"]) {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-right: 8px;
}

.form-row label:has(input[type="checkbox"]) input[type="checkbox"] {
  min-width: auto;
  margin: 0;
}

/* GTO筛选玩家选项容器 */
.gto-filter-players {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0px;
}

.gto-filter-players label {
  margin-right: 0; /* 覆盖默认的margin-right */
}

/* GTO建议阶段容器 */
#suggestion-phases {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

#suggestion-phases label {
  margin-right: 0 !important; /* 强制覆盖默认的margin-right */
  white-space: nowrap; /* 防止文字换行 */
}

/* 确保GTO建议阶段的checkbox在一行显示 */
#suggestion-phases label:has(input[type="checkbox"]) {
  margin-right: 0 !important;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

/* 玩家数量和底池类型的特殊样式 */
.player-count-input {
  width: 40px !important;
  min-width: 30px !important;
}

.pot-type-label {
  margin-left: 12px; /* 减小左边距 */
  margin-right: 8px;  /* 减小右边距 */
}

.pot-type-select {
  width: 130px; /* 减小宽度以节省空间 */
}

/* 当屏幕宽度有限时，确保两个选项能在一行显示 */
@media (max-width: 480px) {
  .player-count-input {
    width: 45px;
  }

  .pot-type-label {
    margin-left: 10px;
    margin-right: 5px;
    font-size: 13px;
  }

  .pot-type-select {
    width: 95px; /* 移动端进一步减小宽度 */
    font-size: 13px;
  }
}

.form-row input:not(.player-count-input),
.form-row select:not(.mode-select):not(.pot-type-select) {
  padding: 6px 10px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 4px;
  min-width: 80px;
  transition: border-color 0.2s;
}

.form-row input.player-count-input {
  padding: 6px 10px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 50px;
  min-width: 50px;
  transition: border-color 0.2s;
}

.form-row input.blind-input,
.form-row input.delay-input {
  padding: 6px 10px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 50px;
  min-width: 45px;
  transition: border-color 0.2s;
}

.form-row select.mode-select {
  padding: 6px 10px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 50px;
  min-width: 45px;
  transition: border-color 0.2s;
}

.form-row input:focus,
.form-row select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

/* Hidden utility class */
.hidden-by-js {
  display: none !important;
}

/* Button common styles */
.game-control-btn {
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  border: none;
  color: white;
  background-color: #007bff;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
}

.game-control-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background-color: #0069d9;
}

.game-control-btn:active:not(:disabled) {
  transform: translateY(0);
}

.game-control-btn:disabled {
  background-color: #cccccc;
  color: #888888;
  cursor: not-allowed;
  opacity: 0.6;
}

.game-control-btn.secondary-btn {
  background-color: #6c757d;
}

.game-control-btn.secondary-btn:hover:not(:disabled) {
  background-color: #5a6268;
}

.game-control-btn.danger-btn {
  background-color: #dc3545;
}

.game-control-btn.danger-btn:hover:not(:disabled) {
  background-color: #c82333;
}

/* Start button specific style - green */
#start-btn {
  background-color: #28a745 !important;
}

#start-btn:hover:not(:disabled) {
  background-color: #218838 !important;
}

/* Modal overlay base styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 3000;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s, visibility 0.3s;
}

.modal-overlay.is-visible {
  opacity: 1;
  visibility: visible;
}

.modal-content {
  background: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  animation: modal-slide-up 0.3s ease-out;
}

@keyframes modal-slide-up {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-content h3 {
  margin: 0 0 20px 0;
  font-size: 20px;
  color: #333;
  border-bottom: 2px solid #007bff;
  padding-bottom: 10px;
}

.modal-body {
  margin-bottom: 20px;
}

.modal-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

/* Scrollbar styles */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 10px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
