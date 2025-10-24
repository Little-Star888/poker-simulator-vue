<template>
  <div class="modal-overlay is-visible">
    <div class="modal-content" style="max-width: 400px">
      <h3>牌局结束</h3>
      <div class="modal-body">
        <p>是否需要为本局游戏保存快照？</p>
      </div>
      <div class="modal-footer">
        <button
          @click="confirmSave"
          class="game-control-btn"
          style="background-color: var(--accent-color)"
        >
          确认
        </button>
        <button
          @click="cancelSave"
          class="game-control-btn secondary-btn"
        >
          取消
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const confirmSave = () => {
  // 触发确认保存事件，让父组件处理
  const event = new CustomEvent('endOfHandConfirm')
  window.dispatchEvent(event)
}

const cancelSave = () => {
  // 触发取消保存事件，让父组件处理
  const event = new CustomEvent('endOfHandCancel')
  window.dispatchEvent(event)
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999; /* 确保在所有元素之上 */
}

.modal-overlay.is-visible {
  opacity: 1;
  visibility: visible;
}

.modal-content {
  background: #ffffff; /* 使用固定的白色背景 */
  border-radius: 8px;
  padding: 20px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  opacity: 0;
  transform: scale(0.9);
  transition: all 0.3s ease;
  position: relative;
  z-index: 10000;
}

.modal-overlay.is-visible .modal-content {
  opacity: 1;
  transform: scale(1);
}

.modal-content h3 {
  margin: 0 0 15px 0;
  color: #333; /* 使用固定的深色文字 */
  border-bottom: 1px solid #ddd; /* 使用固定的边框颜色 */
  padding-bottom: 10px;
}

.modal-body {
  margin-bottom: 20px;
  color: #666; /* 使用固定的文字颜色 */
  line-height: 1.5;
}

.modal-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  flex-shrink: 0;
}

.game-control-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
  min-width: 80px;
}

.game-control-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.game-control-btn[style*="background-color"] {
  background-color: #007bff !important; /* 强制使用蓝色 */
  color: white;
}

.secondary-btn {
  background-color: #f8f9fa !important; /* 使用浅灰色背景 */
  color: #6c757d !important; /* 使用深灰色文字 */
  border: 1px solid #dee2e6 !important; /* 使用边框 */
}

.secondary-btn:hover {
  background-color: #e9ecef !important;
  border-color: #adb5bd;
}
</style>
