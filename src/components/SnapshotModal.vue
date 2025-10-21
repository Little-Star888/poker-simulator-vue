<template>
  <div v-if="visible" class="modal-overlay snapshot-modal" :class="{ 'is-visible': visible }">
    <div class="modal-content" @click.stop>
      <h3>💾 保存快照</h3>

      <div class="modal-body">
        <div class="snapshot-preview-container">
          <img
            v-if="previewImage"
            :src="previewImage"
            alt="快照预览"
            class="snapshot-preview-image"
          />
          <div v-else class="snapshot-preview-placeholder">
            <span>📷</span>
            <p>截图预览</p>
          </div>
        </div>

        <div class="snapshot-name-input-group">
          <label for="snapshot-name-input">快照名称:</label>
          <input
            id="snapshot-name-input"
            ref="nameInputRef"
            v-model="snapshotName"
            type="text"
            placeholder="输入快照名称（可选）"
            @keydown.enter="handleConfirm"
            @keydown.esc="handleCancel"
          />
          <small>留空则使用当前时间作为名称</small>
        </div>

        <div class="snapshot-info">
          <p><strong>游戏状态:</strong> {{ gameStateInfo }}</p>
          <p><strong>GTO 建议:</strong> {{ gtoSuggestionsInfo }}</p>
          <p><strong>行动历史:</strong> {{ actionHistoryInfo }}</p>
        </div>
      </div>

      <div class="modal-footer">
        <button
          id="save-snapshot-confirm-btn"
          class="game-control-btn"
          @click="handleConfirm"
          :disabled="isSaving"
        >
          <span v-if="!isSaving">✅ 确认保存</span>
          <span v-else>💾 保存中...</span>
        </button>

        <button
          id="recapture-snapshot-btn"
          class="game-control-btn secondary-btn"
          @click="handleRecapture"
          :disabled="isSaving"
        >
          🔄 重新截取
        </button>

        <button
          id="cancel-snapshot-btn"
          class="game-control-btn secondary-btn"
          @click="handleCancel"
          :disabled="isSaving"
        >
          ❌ 取消
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useSettingStore } from '@/stores/settingStore'
import { createSnapshot } from '@/api/snapshotService'

interface Props {
  visible: boolean
  previewImage: string | null
  gameState: any
  gtoSuggestions: Record<string, any>
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
  (e: 'recapture'): void
  (e: 'saved', snapshotId: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const gameStore = useGameStore()
const settingStore = useSettingStore()

// 状态
const snapshotName = ref('')
const nameInputRef = ref<HTMLInputElement>()
const isSaving = ref(false)

// 计算属性
const gameStateInfo = computed(() => {
  if (!props.gameState) return '无'
  return `${props.gameState.currentRound?.toUpperCase() || '未知'} 阶段`
})

const gtoSuggestionsInfo = computed(() => {
  if (!props.gtoSuggestions) return '0 条'
  const count = Object.keys(props.gtoSuggestions).length
  return `${count} 条建议`
})

const actionHistoryInfo = computed(() => {
  const count = gameStore.handActionHistory.length
  return `${count} 条记录`
})

// 方法
const handleConfirm = async () => {
  if (isSaving.value) return

  try {
    isSaving.value = true

    let finalName = snapshotName.value.trim()
    if (!finalName) {
      finalName = `快照 ${new Date().toLocaleString()}`
    }

    gameStore.log(`💾 正在保存快照到数据库...`)

    // 准备快照数据
    const snapshotData = {
      name: finalName,
      gameState: JSON.stringify(props.gameState),
      imageData: props.previewImage || '',
      gtoSuggestions: JSON.stringify(props.gtoSuggestions),
      actionHistory: JSON.stringify(gameStore.handActionHistory),
      settings: JSON.stringify(settingStore.getAllSettings)
    }

    const savedSnapshot = await createSnapshot(snapshotData)

    gameStore.log(`✅ 快照 "${savedSnapshot.name}" (ID: ${savedSnapshot.id}) 已成功保存。`)

    // 清空输入
    snapshotName.value = ''

    // 发送事件
    emit('saved', savedSnapshot.id)
    emit('confirm')
    emit('update:visible', false)

  } catch (error: any) {
    gameStore.log(`❌ 保存快照失败: ${error.message}`)
    console.error('保存快照失败:', error)
  } finally {
    isSaving.value = false
  }
}

const handleCancel = () => {
  if (isSaving.value) return

  snapshotName.value = ''
  emit('cancel')
  emit('update:visible', false)
}

const handleRecapture = () => {
  if (isSaving.value) return

  emit('recapture')
  emit('update:visible', false)
}

// 监听 visible 变化，自动聚焦输入框
watch(() => props.visible, async (newVal) => {
  if (newVal) {
    await nextTick()
    nameInputRef.value?.focus()
  } else {
    // 关闭时清空输入
    snapshotName.value = ''
    isSaving.value = false
  }
})
</script>

<style scoped>
.snapshot-modal {
  /* 继承全局模态框样式 */
}

.modal-content {
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.snapshot-preview-container {
  width: 100%;
  max-height: 300px;
  margin-bottom: 20px;
  border: 2px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.snapshot-preview-image {
  width: 100%;
  height: auto;
  display: block;
  object-fit: contain;
}

.snapshot-preview-placeholder {
  padding: 60px 20px;
  text-align: center;
  color: #999;
}

.snapshot-preview-placeholder span {
  font-size: 48px;
  display: block;
  margin-bottom: 10px;
}

.snapshot-preview-placeholder p {
  margin: 0;
  font-size: 14px;
}

.snapshot-name-input-group {
  margin-bottom: 20px;
}

.snapshot-name-input-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.snapshot-name-input-group input {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid #ddd;
  border-radius: 6px;
  transition: border-color 0.2s;
}

.snapshot-name-input-group input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.snapshot-name-input-group small {
  display: block;
  margin-top: 6px;
  color: #666;
  font-size: 12px;
}

.snapshot-info {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  border-left: 4px solid #007bff;
  margin-bottom: 20px;
}

.snapshot-info p {
  margin: 6px 0;
  font-size: 13px;
  color: #555;
}

.snapshot-info strong {
  color: #333;
  margin-right: 8px;
}

.modal-footer {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.modal-footer .game-control-btn {
  flex: 1;
  min-width: 120px;
}

#save-snapshot-confirm-btn {
  background-color: #28a745;
}

#save-snapshot-confirm-btn:hover:not(:disabled) {
  background-color: #218838;
}

#save-snapshot-confirm-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    max-width: none;
  }

  .snapshot-preview-container {
    max-height: 200px;
  }

  .modal-footer {
    flex-direction: column;
  }

  .modal-footer .game-control-btn {
    width: 100%;
  }
}
</style>
