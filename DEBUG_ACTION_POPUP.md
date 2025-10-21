# 动作弹窗调试指南

## 问题描述
手动模式下，玩家动作弹窗不显示。

---

## 快速检查清单

### 1. 游戏模式检查
```javascript
// 在浏览器控制台运行
console.log('游戏模式:', gameStore.mode)
// 应该输出: "manual"
```

### 2. 游戏是否已开始
```javascript
console.log('游戏运行中:', gameStore.isGameRunning)
// 应该输出: true
```

### 3. 等待手动输入状态
```javascript
console.log('等待手动输入:', gameStore.isWaitingForManualInput)
// 应该输出: true（轮到玩家时）
```

### 4. 当前玩家ID
```javascript
console.log('当前玩家:', gameStore.currentPlayerId)
// 应该输出: "P1", "P2" 等
```

### 5. 弹窗组件是否存在
```javascript
const popup = document.querySelector('.player-action-popup')
console.log('弹窗元素:', popup)
console.log('弹窗可见:', popup ? getComputedStyle(popup).display : 'not found')
// 应该输出: 元素对象和 "flex"
```

---

## 完整调试步骤

### 步骤 1：确认手动模式
1. 打开应用
2. 点击左侧配置面板（移动端需要点击"配置"按钮）
3. 在"运行配置"区域，确认"游戏模式"选择为"手动"
4. 查看控制台，确认输出：`🔄 切换到自动模式` 或类似日志

### 步骤 2：开始游戏
1. 点击"▶️ 开始牌局"按钮
2. 控制台应该输出：
   ```
   🎮 开始新游戏...
   ✅ 游戏已开始
   👤 轮到 P[X] ([role]) 行动 [Stack: XXX]
   ⏳ 等待玩家 P[X] 操作...
   ```

### 步骤 3：检查弹窗渲染
打开浏览器开发工具（F12）：

1. **Elements 标签**：
   - 找到 `.player[data-player="P1"]` 元素
   - 展开，查找 `.player-action-popup` 子元素
   - 检查该元素是否存在
   - 检查是否有 `v-if` 条件导致未渲染

2. **Console 标签**：
   - 查找调试日志：
     ```
     🎮 PlayerActionPopup mounted: P1 visible: true
       - isWaitingForManualInput: true
       - currentPlayerId: P1
       - player: { id: "P1", stack: 10000, ... }
     ```

### 步骤 4：检查 CSS 样式
在 Elements 标签中选中 `.player-action-popup`，查看 Computed 面板：

```css
display: flex         /* 必须是 flex，不能是 none */
position: absolute    /* 必须 */
top: 50%             /* 必须 */
left: 50%            /* 必须 */
transform: translate(-50%, -50%)  /* 必须 */
z-index: 200         /* 必须 > 10 */
width: 240px         /* 固定宽度 */
```

### 步骤 5：检查条件渲染
```javascript
// 在控制台运行
const gameStore = window.$gameStore || useGameStore()
console.log('弹窗显示条件:', {
  isWaitingForManualInput: gameStore.isWaitingForManualInput,
  currentPlayerId: gameStore.currentPlayerId,
  // 假设当前玩家是 P1
  shouldShowPopup: gameStore.isWaitingForManualInput && gameStore.currentPlayerId === 'P1'
})
```

---

## 常见问题和解决方案

### 问题 A：弹窗组件完全不存在于 DOM 中
**症状**：`document.querySelector('.player-action-popup')` 返回 `null`

**可能原因**：
1. `v-if` 条件不满足
2. `isWaitingForManualInput` 为 `false`
3. `currentPlayerId` 与玩家 ID 不匹配

**检查**：
```vue
<!-- PokerTable.vue 中的条件 -->
<PlayerActionPopup
  v-if="gameStore.isWaitingForManualInput && gameStore.currentPlayerId === `P${i}`"
  :player-id="`P${i}`"
  :visible="true"
/>
```

**解决**：
1. 确认游戏模式为"手动"
2. 确认游戏已开始
3. 确认轮到某个玩家行动
4. 查看控制台是否有"⏳ 等待玩家操作..."日志

### 问题 B：弹窗存在但不可见
**症状**：元素存在，但 `display: none` 或 `opacity: 0`

**检查**：
```javascript
const popup = document.querySelector('.player-action-popup')
const style = getComputedStyle(popup)
console.log({
  display: style.display,        // 应该是 "flex"
  opacity: style.opacity,        // 应该是 "1"
  visibility: style.visibility,  // 应该是 "visible"
  zIndex: style.zIndex          // 应该是 "200"
})
```

**解决**：
- 确认 CSS 中有 `display: flex`
- 确认没有其他 CSS 规则覆盖
- 确认 `visible` prop 为 `true`

### 问题 C：弹窗在屏幕外
**症状**：元素存在且可见，但在视口外

**检查**：
```javascript
const popup = document.querySelector('.player-action-popup')
const rect = popup.getBoundingClientRect()
console.log('弹窗位置:', {
  top: rect.top,
  left: rect.left,
  bottom: rect.bottom,
  right: rect.right,
  inViewport: rect.top >= 0 && rect.left >= 0 && 
              rect.bottom <= window.innerHeight && 
              rect.right <= window.innerWidth
})
```

**解决**：
- 检查父容器 `.player` 的位置
- 确认 `position: absolute` 相对于正确的容器
- 调整 `top: 50%; left: 50%` 和 `transform`

### 问题 D：弹窗被其他元素遮挡
**症状**：元素存在、可见、位置正确，但看不见

**检查**：
```javascript
const popup = document.querySelector('.player-action-popup')
console.log('Z-index:', getComputedStyle(popup).zIndex)
// 应该是 200

// 检查是否有更高 z-index 的元素
const allElements = document.querySelectorAll('*')
const highZIndex = Array.from(allElements)
  .filter(el => parseInt(getComputedStyle(el).zIndex) > 200)
  .map(el => ({
    element: el,
    zIndex: getComputedStyle(el).zIndex
  }))
console.log('更高 z-index 的元素:', highZIndex)
```

**解决**：
- 提高 `.player-action-popup` 的 `z-index`
- 或者降低遮挡元素的 `z-index`

### 问题 E：手动模式未生效
**症状**：游戏自动运行，不等待玩家操作

**检查**：
```javascript
// 在 gameStore 的 processNextAction 方法中
console.log('Settings.mode:', settingStore.mode)
console.log('是否进入手动模式分支:', settingStore.mode === 'manual')
```

**解决**：
1. 确认 `ConfigPanel.vue` 中模式选择绑定正确：
   ```vue
   <select v-model="settingStore.mode">
     <option value="auto">自动</option>
     <option value="manual">手动</option>
   </select>
   ```
2. 确认 `gameStore.ts` 中判断逻辑正确：
   ```typescript
   if (settingStore.mode === "manual") {
     this.isWaitingForManualInput = true;
     this.log(`⏳ 等待玩家 ${currentPlayerId} 操作...`);
     return;
   }
   ```

---

## 调试日志说明

### 正常流程日志
当一切正常时，控制台应该输出：

```
🎮 开始新游戏...
✅ 游戏已开始
👤 轮到 P1 (BTN) 行动 [Stack: 10000]
💡 已获取 P1 的 GTO 建议
⏳ 等待玩家 P1 操作...
🎮 PlayerActionPopup mounted: P1 visible: true
  - isWaitingForManualInput: true
  - currentPlayerId: P1
  - player: { id: "P1", stack: 10000, bet: 0, ... }
```

### 异常流程日志
如果弹窗不显示，可能看到：

```
👤 轮到 P1 (BTN) 行动 [Stack: 10000]
💡 已获取 P1 的 GTO 建议
🤖 P1 决定: FOLD     <- 错误：不应该自动决策
```

这表示没有进入手动模式分支。

---

## 强制调试模式

在 `main.ts` 或控制台中执行：

```javascript
// 访问 gameStore（如果已挂载到 window）
const gameStore = window.$gameStore

// 强制设置状态
gameStore.isWaitingForManualInput = true
gameStore.isGameRunning = true

// 手动触发弹窗显示条件
console.log('强制显示弹窗测试:', {
  waiting: gameStore.isWaitingForManualInput,
  running: gameStore.isGameRunning,
  currentPlayer: gameStore.currentPlayerId
})
```

---

## 快速测试脚本

在浏览器控制台粘贴并运行：

```javascript
// === 动作弹窗完整诊断脚本 ===
console.log('=== 动作弹窗诊断 ===\n')

// 1. Store 状态
try {
  const gameStore = window.$gameStore || useGameStore()
  const settingStore = window.$settingStore || useSettingStore()
  
  console.log('1. Store 状态:')
  console.log('  - 游戏模式:', settingStore.mode)
  console.log('  - 游戏运行中:', gameStore.isGameRunning)
  console.log('  - 等待手动输入:', gameStore.isWaitingForManualInput)
  console.log('  - 当前玩家:', gameStore.currentPlayerId)
  console.log('  - 游戏暂停:', gameStore.isGamePaused)
} catch (e) {
  console.error('  ❌ 无法访问 Store:', e.message)
}

// 2. DOM 元素检查
console.log('\n2. DOM 元素:')
const players = document.querySelectorAll('.player')
console.log('  - 玩家元素数量:', players.length)

players.forEach((player, i) => {
  const playerId = player.dataset.player
  const popup = player.querySelector('.player-action-popup')
  console.log(`  - ${playerId}:`, popup ? '有弹窗' : '无弹窗')
  
  if (popup) {
    const style = getComputedStyle(popup)
    const rect = popup.getBoundingClientRect()
    console.log(`    * display: ${style.display}`)
    console.log(`    * position: ${style.position}`)
    console.log(`    * z-index: ${style.zIndex}`)
    console.log(`    * 位置: (${rect.left.toFixed(0)}, ${rect.top.toFixed(0)})`)
    console.log(`    * 尺寸: ${rect.width.toFixed(0)} x ${rect.height.toFixed(0)}`)
    console.log(`    * 在视口内: ${rect.top >= 0 && rect.left >= 0}`)
  }
})

// 3. 当前状态建议
console.log('\n3. 诊断建议:')
try {
  const gameStore = window.$gameStore
  const settingStore = window.$settingStore
  
  if (settingStore.mode !== 'manual') {
    console.log('  ⚠️ 当前是自动模式，请切换到手动模式')
  }
  
  if (!gameStore.isGameRunning) {
    console.log('  ⚠️ 游戏未开始，请点击"开始牌局"')
  }
  
  if (!gameStore.isWaitingForManualInput && gameStore.isGameRunning) {
    console.log('  ⚠️ 游戏正在自动运行，未进入手动等待状态')
  }
  
  const popup = document.querySelector('.player-action-popup')
  if (!popup) {
    console.log('  ❌ 弹窗元素不存在，检查 v-if 条件')
  } else if (getComputedStyle(popup).display === 'none') {
    console.log('  ❌ 弹窗存在但不可见 (display: none)')
  } else {
    console.log('  ✅ 弹窗应该可见')
  }
} catch (e) {
  console.error('  ❌ 诊断失败:', e.message)
}

console.log('\n=== 诊断完成 ===')
```

---

## 解决方案汇总

### 最常见的3个问题

1. **未切换到手动模式**
   - 解决：在配置面板选择"手动"模式

2. **条件渲染失败**
   - 解决：确认 `v-if` 条件满足
   - 代码位置：`PokerTable.vue` L27-32

3. **CSS display 未设置**
   - 解决：确认 `.player-action-popup` 有 `display: flex`
   - 代码位置：`PlayerActionPopup.vue` L290

---

## 相关文件

- **组件实现**：`src/components/PlayerActionPopup.vue`
- **牌桌容器**：`src/components/PokerTable.vue`
- **游戏逻辑**：`src/stores/gameStore.ts`
- **样式文档**：`PLAYER_ACTION_POPUP_RESTORE.md`

---

**最后更新**：2024
**状态**：待验证