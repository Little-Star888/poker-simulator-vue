<template>
  <div class="snapshot-list-wrapper">
    <h3>💾 牌局快照管理</h3>

    <!-- 快照列表容器 -->
    <div class="snapshot-list-container">
      <ul class="snapshot-list">
        <!-- 加载状态 -->
        <li v-if="loading" class="snapshot-loading">
          <div class="snapshot-loading-spinner"></div>
          <div class="snapshot-loading-text">加载中</div>
        </li>

        <!-- 空状态 -->
        <li v-else-if="!loading && snapshots.length === 0 && !error" class="snapshot-status empty">
          <div class="snapshot-status-icon">📷</div>
          <div class="snapshot-status-text">
            暂无快照<br>
            <small>使用保存快照功能创建第一个快照</small>
          </div>
        </li>

        <!-- 错误状态 -->
        <li v-else-if="error" class="snapshot-status error">
          <div class="snapshot-status-icon">⚠️</div>
          <div class="snapshot-status-text">
            列表加载失败<br>
            <small>{{ error }}</small>
          </div>
        </li>

        <!-- 快照列表项 -->
        <li
          v-for="snapshot in snapshots"
          :key="snapshot.id"
          class="snapshot-item"
          :data-snapshot-id="snapshot.id"
        >
          <div class="snapshot-info">
            <strong
              v-if="editingSnapshotId !== snapshot.id"
              class="snapshot-name-display"
              :title="snapshot.name"
              @click="handleNameClick(snapshot.id, snapshot.name)"
            >
              {{ snapshot.name }}
            </strong>
            <input
              v-else
              ref="nameInputRef"
              v-model="editingName"
              type="text"
              class="snapshot-name-edit"
              @blur="handleNameSave(snapshot.id)"
              @keydown.enter="handleNameSave(snapshot.id)"
              @keydown.esc="handleNameCancel"
            />
            <br>
            <small>{{ formatTimestamp(snapshot) }}</small>
          </div>

          <div class="snapshot-actions">
            <button
              class="view-btn"
              @click="handleViewSnapshot(snapshot.id)"
              title="查看快照详情"
            >
              查看快照
            </button>
            <button
              class="replay-btn"
              @click="handleReplay(snapshot.id)"
              title="回放此快照"
            >
              回放
            </button>
            <button
              class="delete-btn"
              @click="handleDeleteClick(snapshot.id, $event)"
              title="删除此快照"
            >
              删除快照
            </button>
          </div>
        </li>
      </ul>
    </div>

    <!-- 分页控件 -->
    <div v-if="totalPages > 1" class="snapshot-pagination-controls">
      <button
        id="snapshot-prev-btn"
        class="game-control-btn secondary-btn"
        :disabled="currentPage === 0"
        @click="goToPreviousPage"
      >
        上一页
      </button>
      <span class="pagination-info">第 {{ currentPage + 1 }} / {{ totalPages }} 页</span>
      <button
        id="snapshot-next-btn"
        class="game-control-btn secondary-btn"
        :disabled="currentPage >= totalPages - 1"
        @click="goToNextPage"
      >
        下一页
      </button>
    </div>

    <!-- 删除确认弹窗 -->
    <Teleport to="body">
    <div
      v-if="deleteConfirmVisible"
      ref="deletePopoverRef"
      class="delete-confirm-popover"
      :style="deletePopoverStyle"
    >
      <p>确定删除此快照？</p>
      <div class="popover-actions">
        <button
          class="game-control-btn delete-confirm-yes"
          @click="confirmDelete"
        >
          确认
        </button>
        <button
          class="game-control-btn secondary-btn"
          @click="cancelDelete"
        >
          取消
        </button>
      </div>
    </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getSnapshots, deleteSnapshotById, updateSnapshot } from '@/api/snapshotService'
import { useGameStore } from '@/stores/gameStore'
import type { SnapshotSummary } from '@/types'

interface Emits {
  (e: 'view-snapshot', id: number): void
  (e: 'start-replay', id: number): void
}

const emit = defineEmits<Emits>()
const gameStore = useGameStore()

// 状态
const snapshots = ref<SnapshotSummary[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const currentPage = ref(0)
const totalPages = ref(0)

// 名称编辑
const editingSnapshotId = ref<number | null>(null)
const editingName = ref('')
const originalName = ref('')
const nameInputRef = ref<HTMLInputElement | null>(null)

// 删除确认
const deleteConfirmVisible = ref(false)
const deleteTargetId = ref<number | null>(null)
const deletePopoverStyle = ref<Record<string, string>>({})

// 方法
const loadSnapshots = async (page: number = 0) => {
  loading.value = true
  error.value = null

  try {
    const pageData = await getSnapshots(page, 5)

    console.log('📦 快照列表数据:', pageData.content)
    if (pageData.content.length > 0) {
      console.log('  - 第一个快照:', pageData.content[0])
      console.log('  - createdAt 字段:', pageData.content[0].createdAt)
    }

    snapshots.value = pageData.content
    currentPage.value = pageData.number
    totalPages.value = pageData.totalPages

    gameStore.snapshotCurrentPage = pageData.number
    gameStore.snapshotTotalPages = pageData.totalPages

  } catch (err: any) {
    error.value = err.message || '加载快照列表失败'
    gameStore.log(`❌ 加载快照列表失败: ${error.value}`)
    console.error('加载快照列表失败:', err)
  } finally {
    loading.value = false
  }
}

const formatTimestamp = (snapshot: any): string => {
  // 兼容timestamp和createdAt两种字段名
  const timeValue = snapshot.createdAt || snapshot.timestamp

  if (!timeValue) {
    console.warn('时间字段为空，快照对象:', snapshot)
    return '未知时间'
  }

  try {
    const date = new Date(timeValue)

    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      console.warn('无效的日期:', timeValue)
      return String(timeValue)
    }

    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch (error) {
    console.error('日期格式化错误:', error, timeValue)
    return String(timeValue) || '未知时间'
  }
}

const handleNameClick = (id: number, name: string) => {
  // 如果已经有其他正在编辑的，先完成保存
  if (editingSnapshotId.value && editingSnapshotId.value !== id) {
    handleNameSave(editingSnapshotId.value)
  }

  editingSnapshotId.value = id
  editingName.value = name
  originalName.value = name

  // 下一帧聚焦输入框
  setTimeout(() => {
    const input = document.querySelector('.snapshot-name-edit') as HTMLInputElement
    if (input) {
      input.focus()
      input.select()
    }
  }, 0)
}

const handleNameSave = async (id: number) => {
  const newName = editingName.value.trim()
  const finalName = newName || originalName.value

  // 恢复显示
  editingSnapshotId.value = null

  // 如果名称有变化，则调用API更新
  if (newName && newName !== originalName.value) {
    try {
      gameStore.log(`💾 正在更新快照名称 (ID: ${id})...`)

      await updateSnapshot(id, { name: finalName })

      gameStore.log(`✅ 快照名称已更新为 "${finalName}"`)

      // 刷新列表
      await loadSnapshots(currentPage.value)
    } catch (err: any) {
      gameStore.log(`❌ 更新名称失败: ${err.message}`)
      console.error('更新名称失败:', err)
    }
  }
}

const handleNameCancel = () => {
  editingSnapshotId.value = null
  editingName.value = ''
  originalName.value = ''
}

const handleViewSnapshot = (id: number) => {
  emit('view-snapshot', id)
}

const handleReplay = (id: number) => {
  emit('start-replay', id)
}

const handleDeleteClick = (id: number, event: MouseEvent) => {
  deleteTargetId.value = id
  deleteConfirmVisible.value = true

  // 计算弹窗位置
  const target = event.target as HTMLElement
  const btnRect = target.getBoundingClientRect()

  // 使用 nextTick 等待 DOM 更新
  setTimeout(() => {
    const popoverHeight = 100 // 估算高度
    const popoverWidth = 220

    let top = btnRect.top - popoverHeight - 10
    let left = btnRect.left + (btnRect.width / 2) - (popoverWidth / 2)

    // 边界检查
    if (top < 0) {
      top = btnRect.bottom + 10
    }
    if (left < 5) {
      left = 5
    }
    if (left + popoverWidth > window.innerWidth) {
      left = window.innerWidth - popoverWidth - 5
    }

    deletePopoverStyle.value = {
      top: `${top}px`,
      left: `${left}px`
    }
  }, 10)
}

const confirmDelete = async () => {
  if (!deleteTargetId.value) return

  const id = deleteTargetId.value

  try {
    gameStore.log(`🗑️ 正在从数据库删除快照 (ID: ${id})...`)

    await deleteSnapshotById(id)

    gameStore.log(`✅ 快照 (ID: ${id}) 已成功删除。`)

    // 重新加载当前页
    await loadSnapshots(currentPage.value)

    // 如果当前页没有数据且不是第一页，加载上一页
    if (snapshots.value.length === 0 && currentPage.value > 0) {
      await loadSnapshots(currentPage.value - 1)
    }

  } catch (err: any) {
    gameStore.log(`❌ 删除快照失败: ${err.message}`)
    console.error('删除快照失败:', err)
  } finally {
    cancelDelete()
  }
}

const cancelDelete = () => {
  deleteConfirmVisible.value = false
  deleteTargetId.value = null
  deletePopoverStyle.value = {}
}

const goToPreviousPage = () => {
  if (currentPage.value > 0) {
    loadSnapshots(currentPage.value - 1)
  }
}

const goToNextPage = () => {
  if (currentPage.value < totalPages.value - 1) {
    loadSnapshots(currentPage.value + 1)
  }
}

// 全局点击事件关闭删除确认框
const handleGlobalClick = (event: MouseEvent) => {
  if (deleteConfirmVisible.value) {
    const target = event.target as HTMLElement
    if (!target.closest('.delete-confirm-popover') && !target.classList.contains('delete-btn')) {
      cancelDelete()
    }
  }
}

// 生命周期
onMounted(() => {
  loadSnapshots(0)
  document.addEventListener('click', handleGlobalClick)
})

// 清理
import { onUnmounted } from 'vue'
onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick)
})

// 暴露刷新方法供父组件调用
defineExpose({
  refresh: loadSnapshots,
  currentPage: currentPage.value
})
</script>

<style scoped>
.snapshot-list-wrapper {
  text-align: left;
}

.snapshot-list-wrapper h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
}

/* 列表容器 */
.snapshot-list-container {
  max-height: 400px;
  overflow-y: auto;
  padding: 10px;
  border-radius: 4px;
  background: #fdfdfd;
  border: 1px solid #e0e0e0;
  position: relative;
}

/* 滚动条样式 */
.snapshot-list-container::-webkit-scrollbar {
  width: 10px;
}

.snapshot-list-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.snapshot-list-container::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 10px;
}

.snapshot-list-container::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.snapshot-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

/* 加载状态 */
.snapshot-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #888;
  font-size: 14px;
}

.snapshot-loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #007bff;
  border-radius: 50%;
  animation: snapshot-loading-spin 1s linear infinite;
  margin-bottom: 12px;
}

.snapshot-loading-text {
  font-size: 14px;
  color: #666;
  margin-top: 8px;
}

@keyframes snapshot-loading-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 状态提示 */
.snapshot-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #888;
  font-size: 14px;
  text-align: center;
}

.snapshot-status-icon {
  font-size: 32px;
  margin-bottom: 12px;
  opacity: 0.6;
}

.snapshot-status-text {
  font-size: 14px;
  color: #666;
  line-height: 1.4;
}

.snapshot-status.error .snapshot-status-icon {
  color: #dc3545;
}

.snapshot-status.error .snapshot-status-text {
  color: #dc3545;
}

.snapshot-status.empty .snapshot-status-icon {
  color: #ffc107;
}

.snapshot-status.empty .snapshot-status-text {
  color: #856404;
}

/* 快照列表项 */
.snapshot-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #e0e0e0;
  transition: background-color 0.2s;
}

.snapshot-item:last-child {
  border-bottom: none;
}

.snapshot-item:hover {
  background-color: #f9f9f9;
}

.snapshot-info {
  flex-grow: 1;
  margin-right: 10px;
  min-width: 0;
  color: #333;
}

.snapshot-name-display {
  color: #007bff;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.snapshot-name-display:hover {
  text-decoration: underline;
  cursor: text;
}

.snapshot-name-edit {
  font-size: 1em;
  font-weight: bold;
  padding: 2px 5px;
  border: 1px solid #007bff;
  border-radius: 3px;
  outline: none;
  width: 100%;
  max-width: 250px;
}

.snapshot-info small {
  color: #666;
  font-size: 12px;
}

.snapshot-actions {
  display: flex;
  flex-shrink: 0;
  gap: 5px;
}

.snapshot-actions button {
  padding: 4px 8px;
  font-size: 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.snapshot-actions button:hover {
  background-color: #e0e0e0;
}

.view-btn {
  background-color: #007bff;
  color: white;
  border-color: #007bff !important;
}

.view-btn:hover {
  background-color: #0069d9 !important;
}

.replay-btn {
  background-color: #28a745;
  color: white;
  border-color: #28a745 !important;
}

.replay-btn:hover {
  background-color: #218838 !important;
}

.delete-btn {
  background-color: #dc3545;
  color: white;
  border-color: #dc3545 !important;
}

.delete-btn:hover {
  background-color: #c82333 !important;
}

/* 分页控件 */
.snapshot-pagination-controls {
  padding-top: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
}

.pagination-info {
  font-size: 14px;
  color: #555;
}

#snapshot-prev-btn,
#snapshot-next-btn {
  background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%) !important;
  border: none;
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(74, 144, 226, 0.4);
}

#snapshot-prev-btn:hover:not(:disabled),
#snapshot-next-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #357abd 0%, #2968a3 100%) !important;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(74, 144, 226, 0.5);
}

#snapshot-prev-btn:active:not(:disabled),
#snapshot-next-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 10px rgba(74, 144, 226, 0.3);
}

#snapshot-prev-btn:disabled,
#snapshot-next-btn:disabled {
  background: linear-gradient(135deg, #adb5bd 0%, #6c757d 100%) !important;
  color: #e9ecef !important;
  cursor: not-allowed;
  opacity: 0.6;
  box-shadow: none;
  transform: none !important;
}

/* 删除确认弹窗 */
.delete-confirm-popover {
  position: fixed;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 15px;
  z-index: 4000;
  width: 220px;
  text-align: center;
}

.delete-confirm-popover p {
  margin: 0 0 15px 0;
  font-size: 14px;
  color: #333;
}

.popover-actions {
  display: flex;
  justify-content: space-around;
  gap: 10px;
}

.popover-actions button {
  padding: 6px 12px;
  font-size: 13px;
  flex: 1;
}

.delete-confirm-yes {
  background-color: #dc3545 !important;
  color: white;
}

.delete-confirm-yes:hover {
  background-color: #c82333 !important;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .snapshot-item {
    /* flex-direction: column; REMOVED */
    align-items: center; /* Changed from flex-start to center to match desktop */
    gap: 10px;
  }

  .snapshot-actions {
    width: auto; /* Changed from 100% */
    /* flex-direction: column; REMOVED */
  }

  .snapshot-actions button {
    width: auto; /* Changed from 100% */
  }

  .snapshot-pagination-controls {
    flex-direction: column;
    gap: 10px;
  }

  #snapshot-prev-btn,
  #snapshot-next-btn {
    width: 100%;
  }
}
</style>
