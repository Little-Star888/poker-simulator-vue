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
  if (!props.gtoSuggestions || !Array.isArray(props.gtoSuggestions)) return '0 条'
  return `${props.gtoSuggestions.length} 条建议`
})

const actionHistoryInfo = computed(() => {
  const count = gameStore.handActionHistory.length
  return `${count} 条记录`
})

// 压缩图片数据的函数
const compressImageData = (dataUrl: string, maxWidth: number = 1920, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!

      // 计算压缩后的尺寸
      let { width, height } = img
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height

      // 绘制压缩后的图片
      ctx.drawImage(img, 0, 0, width, height)

      // 转换为压缩后的base64
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve(compressedDataUrl)
    }
    img.src = dataUrl
  })
}

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

    // 压缩图片数据以避免413错误
    let compressedImageData = props.previewImage || ''
    if (compressedImageData) {
      gameStore.log(`🗜️ 正在压缩图片数据...`)
      compressedImageData = await compressImageData(compressedImageData, 1920, 0.8)

      // 检查压缩后的大小，如果仍然太大则进一步压缩
      const imageSizeKB = Math.round(compressedImageData.length * 0.75 / 1024)
      gameStore.log(`📊 图片压缩后大小: ${imageSizeKB}KB`)

      if (imageSizeKB > 2048) { // 如果超过2MB，进一步压缩
        compressedImageData = await compressImageData(compressedImageData, 1280, 0.6)
        const newSizeKB = Math.round(compressedImageData.length * 0.75 / 1024)
        gameStore.log(`📊 再次压缩后大小: ${newSizeKB}KB`)
      }
    }

    // 详细调试：检查每个数据源
    gameStore.log('🔍 开始详细调试数据源...')

    // 检查 gameState
    gameStore.log('🔍 检查 gameState:')
    gameStore.log(`   - 类型: ${typeof props.gameState}`)
    gameStore.log(`   - 是否为数组: ${Array.isArray(props.gameState)}`)
    gameStore.log(`   - 是否为null: ${props.gameState === null}`)
    if (props.gameState && typeof props.gameState === 'object') {
      gameStore.log(`   - 键数量: ${Object.keys(props.gameState).length}`)
      gameStore.log(`   - 主要键: ${Object.keys(props.gameState).join(', ')}`)
      if (props.gameState.players) {
        gameStore.log(`   - 玩家数量: ${props.gameState.players.length}`)
        if (props.gameState.players.length > 0) {
          const firstPlayer = props.gameState.players[0]
          gameStore.log(`   - 第一个玩家键: ${Object.keys(firstPlayer).join(', ')}`)
        }
      }
    }

    // 检查 gtoSuggestions
    gameStore.log('🔍 检查 gtoSuggestions:')
    gameStore.log(`   - 类型: ${typeof props.gtoSuggestions}`)
    gameStore.log(`   - 是否为数组: ${Array.isArray(props.gtoSuggestions)}`)
    gameStore.log(`   - 长度: ${props.gtoSuggestions?.length || 0}`)

    // 检查 actionHistory
    const actionHistory = gameStore.replayData?.actions || gameStore.handActionHistory
    gameStore.log('🔍 检查 actionHistory:')
    gameStore.log(`   - 类型: ${typeof actionHistory}`)
    gameStore.log(`   - 是否为数组: ${Array.isArray(actionHistory)}`)
    gameStore.log(`   - 长度: ${actionHistory?.length || 0}`)

    // 检查 settings - 手动提取配置，避免Pinia Store的循环引用
    const settings = {
      mode: settingStore.mode,
      sb: settingStore.sb,
      bb: settingStore.bb,
      autoDelay: settingStore.autoDelay,
      playerCount: settingStore.playerCount,
      minStack: settingStore.minStack,
      maxStack: settingStore.maxStack,
      potType: settingStore.potType,
      p1Role: settingStore.p1Role,
      suggestOnPreflop: settingStore.suggestOnPreflop,
      suggestOnFlop: settingStore.suggestOnFlop,
      suggestOnTurn: settingStore.suggestOnTurn,
      suggestOnRiver: settingStore.suggestOnRiver,
      usePresetHands: settingStore.usePresetHands,
      usePresetCommunity: settingStore.usePresetCommunity,
      presetCards: settingStore.presetCards
    }
    gameStore.log('🔍 检查 settings:')
    gameStore.log(`   - 类型: ${typeof settings}`)
    gameStore.log(`   - 是否为null: ${settings === null}`)
    if (settings && typeof settings === 'object') {
      gameStore.log(`   - 键数量: ${Object.keys(settings).length}`)
      gameStore.log(`   - 主要键: ${Object.keys(settings).join(', ')}`)
    }

    gameStore.log('🔍 逐个测试序列化...')

    // 测试各个数据源的序列化
    let gameStateTest, gtoSuggestionsTest, actionHistoryTest, settingsTest

    try {
      gameStateTest = JSON.stringify(props.gameState)
      gameStore.log(`✅ gameState 序列化成功，大小: ${Math.round(gameStateTest.length * 0.75 / 1024)}KB`)
    } catch (error: any) {
      gameStore.log(`❌ gameState 序列化失败: ${error.message}`)
      gameStore.log(`   - 错误详情: ${error.stack}`)
      throw new Error(`gameState 序列化失败: ${error.message}`)
    }

    try {
      const processedGtoSuggestions = props.gtoSuggestions.map((item: any) => {
        // 将Vue版本的数据结构转换为原版JS期望的格式
        const suggestion = item.suggestion;
        const normalizedSuggestion = {
          // 提升response中的字段到顶层，与原版JS期望的格式一致
          myCards: suggestion.response?.myCards || suggestion.myCards,
          boardCards: suggestion.response?.boardCards || suggestion.boardCards,
          localResult: suggestion.response?.localResult || suggestion.localResult,
          thirdPartyResult: suggestion.response?.thirdPartyResult || suggestion.thirdPartyResult,
          // 保留原始数据以备兼容
          response: suggestion.response,
          request: suggestion.request,
          error: suggestion.error
        };

        return {
          playerId: item.playerId,
          suggestion: normalizedSuggestion, // 使用标准化的建议格式
          phase: item.phase,
          notes: ""
        };
      })
      gtoSuggestionsTest = JSON.stringify(processedGtoSuggestions)
      gameStore.log(`✅ gtoSuggestions 序列化成功，大小: ${Math.round(gtoSuggestionsTest.length * 0.75 / 1024)}KB`)
    } catch (error: any) {
      gameStore.log(`❌ gtoSuggestions 序列化失败: ${error.message}`)
      gameStore.log(`   - 错误详情: ${error.stack}`)
      throw new Error(`gtoSuggestions 序列化失败: ${error.message}`)
    }

    try {
      actionHistoryTest = JSON.stringify(actionHistory)
      gameStore.log(`✅ actionHistory 序列化成功，大小: ${Math.round(actionHistoryTest.length * 0.75 / 1024)}KB`)
    } catch (error: any) {
      gameStore.log(`❌ actionHistory 序列化失败: ${error.message}`)
      gameStore.log(`   - 错误详情: ${error.stack}`)
      throw new Error(`actionHistory 序列化失败: ${error.message}`)
    }

    try {
      settingsTest = JSON.stringify(settings)
      gameStore.log(`✅ settings 序列化成功，大小: ${Math.round(settingsTest.length * 0.75 / 1024)}KB`)
    } catch (error: any) {
      gameStore.log(`❌ settings 序列化失败: ${error.message}`)
      gameStore.log(`   - 错误详情: ${error.stack}`)
      throw new Error(`settings 序列化失败: ${error.message}`)
    }

    gameStore.log('✅ 所有数据源序列化测试通过，准备构建快照对象...')

    // 构建快照数据 - 将所有字段序列化为字符串以匹配后端期望
    const snapshotData = {
      name: finalName,
      gameState: JSON.stringify(props.gameState),
      imageData: compressedImageData, // 使用压缩后的图片数据
      gtoSuggestions: JSON.stringify(props.gtoSuggestions.map((item: any) => {
        // 将Vue版本的数据结构转换为原版JS期望的格式
        const suggestion = item.suggestion;
        const normalizedSuggestion = {
          // 提升response中的字段到顶层，与原版JS期望的格式一致
          myCards: suggestion.response?.myCards || suggestion.myCards,
          boardCards: suggestion.response?.boardCards || suggestion.boardCards,
          localResult: suggestion.response?.localResult || suggestion.localResult,
          thirdPartyResult: suggestion.response?.thirdPartyResult || suggestion.thirdPartyResult,
          // 保留原始数据以备兼容
          response: suggestion.response,
          request: suggestion.request,
          error: suggestion.error
        };

        return {
          playerId: item.playerId,
          suggestion: normalizedSuggestion, // 使用标准化的建议格式
          phase: item.phase,
          notes: ""
        };
      })),
      actionHistory: JSON.stringify(actionHistory),
      settings: JSON.stringify(settings)
    }

    gameStore.log('🔍 测试完整快照对象序列化...')

    try {
      const fullTest = JSON.stringify(snapshotData)
      gameStore.log(`✅ 完整快照对象序列化成功，总大小: ${Math.round(fullTest.length * 0.75 / 1024)}KB`)
    } catch (error: any) {
      gameStore.log(`❌ 完整快照对象序列化失败: ${error.message}`)
      gameStore.log(`   - 错误详情: ${error.stack}`)
      throw new Error(`完整快照对象序列化失败: ${error.message}`)
    }

    gameStore.log('✅ 所有序列化测试通过，开始保存快照...')

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
