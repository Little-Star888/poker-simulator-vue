<template>
  <div
    v-if="visible"
    class="modal-overlay end-of-hand-modal"
    :class="{ 'is-visible': visible }"
    @click="handleOverlayClick"
  >
    <div class="modal-content" @click.stop>
      <h3>🏁 牌局结束</h3>

      <div class="modal-body">
        <div class="end-message">
          <p>本局游戏已结束！</p>
          <p class="question">是否需要为本局游戏保存快照？</p>
          <div class="hint">
            <i class="material-icons">info</i>
            <span>保存快照可以记录本局的牌面、行动和 GTO 建议</span>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button
          id="eoh-confirm-save"
          class="game-control-btn confirm-btn"
          @click="handleConfirm"
        >
          <i class="material-icons">save</i>
          <span>确认保存</span>
        </button>

        <button
          id="eoh-cancel-save"
          class="game-control-btn secondary-btn"
          @click="handleCancel"
        >
          <i class="material-icons">close</i>
          <span>取消</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  visible?: boolean
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}

withDefaults(defineProps<Props>(), {
  visible: false
})

const emit = defineEmits<Emits>()

const handleConfirm = () => {
  emit('confirm')
  emit('update:visible', false)
}

const handleCancel = () => {
  emit('cancel')
  emit('update:visible', false)
}

const handleOverlayClick = () => {
  // 点击背景也触发取消
  handleCancel()
}
</script>

<style scoped>
.end-of-hand-modal .modal-content {
  max-width: 480px;
  width: 90%;
}

.modal-body {
  padding: 10px 0;
}

.end-message {
  text-align: center;
}

.end-message p {
  margin: 10px 0;
  font-size: 15px;
  color: #555;
  line-height: 1.6;
}

.end-message p:first-child {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.question {
  font-size: 16px !important;
  font-weight: 500 !important;
  color: #007bff !important;
  margin: 20px 0 !important;
}

.hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: #e3f2fd;
  border-left: 4px solid #2196f3;
  border-radius: 4px;
  margin-top: 20px;
  font-size: 13px;
  color: #1565c0;
  text-align: left;
}

.hint i {
  font-size: 20px;
  flex-shrink: 0;
}

.hint span {
  flex: 1;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 20px;
}

.modal-footer .game-control-btn {
  flex: 1;
  max-width: 180px;
}

.confirm-btn {
  background-color: #28a745 !important;
}

.confirm-btn:hover:not(:disabled) {
  background-color: #218838 !important;
}

/* 响应式调整 */
@media (max-width: 480px) {
  .end-of-hand-modal .modal-content {
    width: 95%;
  }

  .modal-footer {
    flex-direction: column;
  }

  .modal-footer .game-control-btn {
    max-width: none;
    width: 100%;
  }

  .hint {
    font-size: 12px;
    padding: 10px 12px;
  }

  .hint i {
    font-size: 18px;
  }
}
</style>
