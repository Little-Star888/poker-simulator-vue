<template>
  <div
    v-if="visible"
    class="modal-overlay view-snapshot-modal"
    :class="{ 'is-visible': visible }"
    @click="handleOverlayClick"
  >
    <div class="modal-content" @click.stop>
      <h3 id="view-snapshot-title">{{ snapshot?.name || '查看快照建议' }}</h3>

      <div class="modal-body">
        <!-- 图片预览区 -->
        <div id="view-snapshot-image-container" class="image-container">
          <img
            v-if="snapshot?.imageData"
            id="view-snapshot-image"
            :src="snapshot.imageData"
            alt="牌局快照"
            class="snapshot-image"
            @click="openLightbox"
            @error="(e) => console.error('图片加载失败:', e)"
          />
          <div v-else class="image-placeholder">
            <span>📷</span>
            <p>暂无图片</p>
          </div>
          <div class="image-hover-overlay">
            <span class="zoom-hint">
              <i class="material-icons">zoom_in</i> 查看大图
            </span>
          </div>
        </div>

        <!-- 玩家筛选器 -->
        <div v-if="playerIds.length > 0" class="filter-container">
          <strong>筛选:</strong>
          <label v-for="playerId in playerIds" :key="playerId" class="filter-label">
            <input
              type="checkbox"
              :value="playerId"
              :checked="filterState.has(playerId)"
              @change="toggleFilter(playerId)"
            />
            {{ playerId }}
          </label>
        </div>

        <!-- GTO 建议列表 -->
        <div class="suggestions-list">
          <div
            v-for="(suggestionData, index) in suggestions"
            :key="index"
            class="suggestion-item"
            :data-player-id="suggestionData.playerId"
            :style="{ display: filterState.has(suggestionData.playerId) ? 'flex' : 'none' }"
          >
            <!-- 建议内容 -->
            <div class="suggestion-content">
              <div v-html="renderSuggestion(suggestionData)"></div>
            </div>

            <!-- 批注编辑区 -->
            <div class="suggestion-notes">
              <textarea
                v-model="suggestionData.notes"
                :placeholder="`关于 ${suggestionData.playerId} 建议的批注...`"
                :disabled="isSaving"
                :class="{ 'saving-state': isSaving }"
              ></textarea>
            </div>
          </div>

          <p v-if="suggestions.length === 0" class="empty-message">
            此快照没有保存GTO建议。
          </p>
        </div>
      </div>

      <div class="modal-footer">
        <button
          id="save-snapshot-remarks-btn"
          class="game-control-btn"
          :class="{ saving: isSaving }"
          :disabled="isSaving"
          @click="handleSaveRemarks"
        >
          <span v-if="!isSaving">💾 保存批注</span>
          <span v-else-if="saveState === 'saving'">
            保存中<span class="saving-dots"></span>
          </span>
          <span v-else-if="saveState === 'success'">✅ 保存成功</span>
          <span v-else-if="saveState === 'no-change'">ℹ️ 无变化</span>
          <span v-else-if="saveState === 'error'">❌ 保存失败</span>
        </button>

        <button
          id="close-view-snapshot-modal-btn"
          class="game-control-btn secondary-btn"
          :disabled="isSaving"
          @click="handleClose"
        >
          关闭
        </button>
      </div>
    </div>

    <!-- 图片灯箱 -->
    <div
      v-if="lightboxVisible"
      class="image-lightbox-overlay"
      @click="closeLightbox"
    >
      <img :src="snapshot?.imageData" alt="快照大图" class="lightbox-image" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { getSnapshotById, updateSnapshot } from '@/api/snapshotService'
import { useGameStore } from '@/stores/gameStore'
import { formatSuggestionToHTML } from '@/utils/suggestionFormatter'

interface Props {
  visible: boolean
  snapshotId: number | null
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const gameStore = useGameStore()

// 状态
const snapshot = ref<any>(null)
const suggestions = ref<any[]>([])
const playerIds = ref<string[]>([])
const filterState = ref<Set<string>>(new Set())
const isSaving = ref(false)
const saveState = ref<'idle' | 'saving' | 'success' | 'no-change' | 'error'>('idle')
const lightboxVisible = ref(false)
const originalSuggestions = ref<string>('')

// 方法
const loadSnapshot = async (id: number) => {
  try {
    gameStore.log(`正在从数据库加载快照 (ID: ${id})...`)

    const data = await getSnapshotById(id)
    console.log('📦 快照原始数据:', data)
    console.log('  - imageData 类型:', typeof data.imageData, '长度:', data.imageData?.length)
    console.log('  - gtoSuggestions 类型:', typeof data.gtoSuggestions)
    console.log('  - createdAt:', data.createdAt)

    snapshot.value = data

    // 解析 GTO 建议
    let allGtoSuggestions = []
    if (data.gtoSuggestions) {
      if (typeof data.gtoSuggestions === 'string') {
        try {
          allGtoSuggestions = JSON.parse(data.gtoSuggestions)
        } catch (e) {
          console.error('解析 gtoSuggestions 失败:', e)
          allGtoSuggestions = []
        }
      } else if (Array.isArray(data.gtoSuggestions)) {
        allGtoSuggestions = data.gtoSuggestions
      } else if (typeof data.gtoSuggestions === 'object') {
        // 如果是对象，转换为数组
        allGtoSuggestions = Object.entries(data.gtoSuggestions).map(([playerId, suggestion]) => ({
          playerId,
          suggestion,
          notes: ''
        }))
      }
    }

    console.log('📋 解析后的建议数量:', allGtoSuggestions.length)
    suggestions.value = allGtoSuggestions
    originalSuggestions.value = JSON.stringify(allGtoSuggestions)

    // 提取玩家 ID 列表
    const ids = [...new Set(allGtoSuggestions.map((s: any) => s.playerId))].sort() as string[]
    playerIds.value = ids
    filterState.value = new Set(ids)

    gameStore.log(`✅ 快照加载成功 (${allGtoSuggestions.length} 条建议)`)
  } catch (error: any) {
    gameStore.log(`❌ 加载快照详情失败: ${error.message}`)
    console.error('加载快照失败:', error)
  }
}

const toggleFilter = (playerId: string) => {
  if (filterState.value.has(playerId)) {
    filterState.value.delete(playerId)
  } else {
    filterState.value.add(playerId)
  }
  // 触发响应式更新
  filterState.value = new Set(filterState.value)
}

const renderSuggestion = (suggestionData: any): string => {
  return formatSuggestionToHTML(suggestionData)
}

const handleSaveRemarks = async () => {
  if (!props.snapshotId || isSaving.value) return

  // 检查是否有变化
  const currentSuggestions = JSON.stringify(suggestions.value)
  if (currentSuggestions === originalSuggestions.value) {
    gameStore.log('ℹ️ 批注没有变化。')
    saveState.value = 'no-change'

    setTimeout(() => {
      saveState.value = 'idle'
    }, 1500)
    return
  }

  isSaving.value = true
  saveState.value = 'saving'

  try {
    gameStore.log(`💾 正在更新批注 (ID: ${props.snapshotId})...`)

    const updateData: any = {
      gtoSuggestions: JSON.stringify(suggestions.value)
    }

    await updateSnapshot(props.snapshotId, updateData)

    // 更新原始数据
    originalSuggestions.value = JSON.stringify(suggestions.value)

    gameStore.log(`✅ 快照 (ID: ${props.snapshotId}) 的批注已保存。`)
    saveState.value = 'success'

    setTimeout(() => {
      saveState.value = 'idle'
    }, 2000)

  } catch (error: any) {
    gameStore.log(`❌ 保存批注失败: ${error.message}`)
    console.error('保存批注失败:', error)
    saveState.value = 'error'

    setTimeout(() => {
      saveState.value = 'idle'
    }, 3000)
  } finally {
    setTimeout(() => {
      isSaving.value = false
    }, 300)
  }
}

const openLightbox = () => {
  if (snapshot.value?.imageData) {
    lightboxVisible.value = true
  }
}

const closeLightbox = () => {
  lightboxVisible.value = false
}

const handleClose = () => {
  emit('close')
  emit('update:visible', false)
}

const handleOverlayClick = () => {
  if (!isSaving.value) {
    handleClose()
  }
}

// 监听 visible 和 snapshotId 变化
watch(
  () => [props.visible, props.snapshotId] as const,
  ([newVisible, newId]) => {
    if (newVisible && newId) {
      loadSnapshot(newId)
    } else {
      // 重置状态
      snapshot.value = null
      suggestions.value = []
      playerIds.value = []
      filterState.value = new Set()
      lightboxVisible.value = false
      saveState.value = 'idle'
      isSaving.value = false
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.view-snapshot-modal .modal-content {
  width: 95vw;
  max-width: 1200px;
  height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-body {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  overflow: hidden;
  gap: 10px;
}

/* 图片容器 */
.image-container {
  position: relative;
  flex-basis: 40%;
  flex-shrink: 0;
  overflow: auto;
  text-align: center;
  border-bottom: 1px solid #ccc;
  padding-bottom: 10px;
  background: #f8f9fa;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.snapshot-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  cursor: pointer;
  display: block;
  margin: 0 auto;
}

.image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #999;
}

.image-placeholder span {
  font-size: 48px;
  margin-bottom: 10px;
}

.image-placeholder p {
  margin: 0;
  font-size: 14px;
}

.image-hover-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.65);
  color: white;
  padding: 10px 20px;
  border-radius: 6px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 16px;
  font-weight: bold;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease-in-out, visibility 0.2s ease-in-out;
}

.image-container:hover .image-hover-overlay {
  opacity: 1;
  visibility: visible;
}

.zoom-hint {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 筛选器 */
.filter-container {
  flex-shrink: 0;
  padding: 10px;
  border-bottom: 1px solid #ccc;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 15px;
  background: #fff;
}

.filter-container strong {
  margin-right: 10px;
  color: #333;
}

.filter-label {
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #555;
}

.filter-label input[type="checkbox"] {
  cursor: pointer;
}

/* 建议列表 */
.suggestions-list {
  flex-grow: 1;
  overflow-y: auto;
  background: #f9f9f9;
  padding: 10px;
  border-radius: 4px;
}

.suggestion-item {
  display: flex;
  gap: 15px;
  padding: 10px;
  border-bottom: 1px solid #e0e0e0;
  background: #fff;
  margin-bottom: 10px;
  border-radius: 4px;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-content {
  flex: 2;
  font-size: 14px;
  line-height: 1.6;
}

.suggestion-notes {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.suggestion-notes textarea {
  width: 100%;
  height: 100%;
  min-height: 120px;
  resize: vertical;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 13px;
  font-family: inherit;
  transition: all 0.2s;
}

.suggestion-notes textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.suggestion-notes textarea.saving-state {
  background-color: #f0f8ff;
  border-color: #007bff;
  cursor: not-allowed;
}

.empty-message {
  text-align: center;
  padding: 40px 20px;
  color: #888;
  font-size: 14px;
}

/* 保存按钮状态 */
#save-snapshot-remarks-btn {
  background-color: #007bff;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

#save-snapshot-remarks-btn:hover:not(:disabled) {
  background-color: #0069d9;
}

#save-snapshot-remarks-btn.saving {
  background-color: #6c757d !important;
  cursor: not-allowed;
}

#save-snapshot-remarks-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.saving-dots {
  display: inline-block;
  margin-left: 4px;
  animation: dots 1.5s steps(4, end) infinite;
}

@keyframes dots {
  0%, 20% { content: '.'; }
  40% { content: '..'; }
  60%, 100% { content: '...'; }
}

.saving-dots::after {
  content: '...';
  animation: dots-animation 1.5s infinite;
}

@keyframes dots-animation {
  0%, 20% { content: '.'; }
  40% { content: '..'; }
  60%, 100% { content: '...'; }
}

/* 图片灯箱 */
.image-lightbox-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  cursor: pointer;
}

.lightbox-image {
  max-width: 95%;
  max-height: 95%;
  object-fit: contain;
  box-shadow: 0 0 30px rgba(255, 255, 255, 0.3);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .view-snapshot-modal .modal-content {
    width: 98vw;
    height: 95vh;
  }

  .suggestion-item {
    flex-direction: column;
  }

  .suggestion-content,
  .suggestion-notes {
    flex: 1;
  }

  .filter-container {
    font-size: 12px;
    gap: 10px;
  }
}
</style>
