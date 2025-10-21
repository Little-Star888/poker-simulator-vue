<template>
  <div
    v-if="visible"
    class="screenshot-selection-overlay"
    @mousedown="startSelection"
    @mousemove="dragSelection"
    @mouseup="endSelection"
  >
    <div
      v-show="isSelecting || selectionBox.width > 0"
      class="selection-box"
      :style="selectionBoxStyle"
    ></div>
    <div class="instruction-text">
      🖱️ 请在页面上拖拽以选择截图区域
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  visible: boolean
}

interface SelectionBox {
  x: number
  y: number
  width: number
  height: number
}

interface Emits {
  (e: 'complete', cropOptions: SelectionBox): void
  (e: 'cancel'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 状态
const isSelecting = ref(false)
const selectionStartX = ref(0)
const selectionStartY = ref(0)
const selectionBox = ref<SelectionBox>({
  x: 0,
  y: 0,
  width: 0,
  height: 0
})

// 计算选择框样式
const selectionBoxStyle = computed(() => ({
  left: `${selectionBox.value.x}px`,
  top: `${selectionBox.value.y}px`,
  width: `${selectionBox.value.width}px`,
  height: `${selectionBox.value.height}px`
}))

// 开始选择
const startSelection = (e: MouseEvent) => {
  if (e.button !== 0) return // 只响应左键

  isSelecting.value = true
  selectionStartX.value = e.clientX
  selectionStartY.value = e.clientY

  selectionBox.value = {
    x: selectionStartX.value,
    y: selectionStartY.value,
    width: 0,
    height: 0
  }
}

// 拖拽选择
const dragSelection = (e: MouseEvent) => {
  if (!isSelecting.value) return

  const currentX = e.clientX
  const currentY = e.clientY

  const width = Math.abs(currentX - selectionStartX.value)
  const height = Math.abs(currentY - selectionStartY.value)
  const x = Math.min(currentX, selectionStartX.value)
  const y = Math.min(currentY, selectionStartY.value)

  selectionBox.value = { x, y, width, height }
}

// 结束选择
const endSelection = () => {
  if (!props.visible) return

  isSelecting.value = false

  const finalWidth = selectionBox.value.width
  const finalHeight = selectionBox.value.height

  // 检查选择区域大小
  if (finalWidth < 20 || finalHeight < 20) {
    console.log('截图区域太小，操作已取消')
    emit('cancel')
    resetSelection()
    return
  }

  // 发送裁剪参数
  emit('complete', {
    x: selectionBox.value.x,
    y: selectionBox.value.y,
    width: finalWidth,
    height: finalHeight
  })

  resetSelection()
}

// 重置选择状态
const resetSelection = () => {
  selectionBox.value = {
    x: 0,
    y: 0,
    width: 0,
    height: 0
  }
}

// 监听 visible 变化，重置状态
watch(() => props.visible, (newVal) => {
  if (!newVal) {
    isSelecting.value = false
    resetSelection()
  }
})

// 阻止默认的拖拽行为
watch(() => props.visible, (newVal) => {
  if (newVal) {
    document.body.style.userSelect = 'none'
  } else {
    document.body.style.userSelect = 'auto'
  }
})
</script>

<style scoped>
.screenshot-selection-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  z-index: 10000;
  cursor: crosshair;
  user-select: none;
}

.selection-box {
  position: fixed;
  border: 2px dashed #007bff;
  background: rgba(0, 123, 255, 0.1);
  pointer-events: none;
  z-index: 10001;
  box-shadow: 0 0 10px rgba(0, 123, 255, 0.5);
}

.instruction-text {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  z-index: 10002;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  pointer-events: none;
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* 响应式调整 */
@media (max-width: 768px) {
  .instruction-text {
    font-size: 12px;
    padding: 10px 20px;
    top: 10px;
  }
}
</style>
