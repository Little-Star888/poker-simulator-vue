# GTO 建议显示调试指南

## 概述

本文档用于调试 GTO 建议在 InfoPanel 和 ViewSnapshotModal 中不显示的问题。

---

## 已修复的问题

### 1. ✅ 开始按钮颜色
- 添加了全局 CSS 样式，确保开始按钮显示为绿色

### 2. ✅ P1 玩家位置
- P1 固定在圆桌最下方（90°）
- 其他玩家平均分布

### 3. ✅ 行动表格式
- 修改为每个阶段 4 列
- 表头使用 `colspan="4"`
- 每个动作独立显示在一个单元格中

### 4. ✅ 默认 GTO 筛选
- P1 默认被选中
- gameStore 初始化时添加 P1 到筛选器

### 5. ✅ 快照时间显示
- 兼容 `createdAt` 和 `timestamp` 字段
- 添加错误处理和日志

### 6. 🔧 GTO 建议显示（调试中）
- 添加了详细的调试日志
- 统一使用 `formatSuggestionToHTML` 函数

---

## 调试步骤

### 第一步：打开浏览器开发者工具

1. 启动应用：
   ```bash
   cd vue-simulator
   npm run dev
   ```

2. 在浏览器中打开 http://localhost:5173

3. 按 `F12` 打开开发者工具，切换到 **Console** 标签

### 第二步：开始游戏并触发 GTO 建议

1. 配置游戏参数（默认即可）
2. 点击绿色的 **开始** 按钮
3. 等待 AI 玩家行动

### 第三步：查看 InfoPanel 的调试日志

在 Console 中查找以下日志：

```
[InfoPanel] currentSuggestionsCache: {...}
[InfoPanel] gtoSuggestionFilter: ["P1"]
[InfoPanel] 处理玩家 P1 的建议
[InfoPanel] 最终建议列表: [...]
[InfoPanel] 建议数量: 1
[InfoPanel.formatSuggestion] 输入: {...}
[formatSuggestionToHTML] 输入数据: {...}
[formatSuggestionToHTML] 解析后的 suggestion: {...}
[formatSuggestionToHTML] response 对象: {...}
[formatSuggestionToHTML] response.advices: [...]
```

### 第四步：分析数据结构

#### 预期的数据结构

**InfoPanel 中的 currentSuggestionsCache:**
```javascript
{
  "P1": {
    request: {
      myCards: ["As", "Kh"],
      boardCards: [],
      myRole: 1,  // SB
      myStack: 2000,
      potChips: 30,
      toCall: 10,
      opponents: 7,
      preFlopRaisers: 0,
      potType: 4,
      hasPosition: false,
      flopActionSituation: 0,
      phase: 1,  // PREFLOP
      bigBlind: 20
    },
    response: {
      advices: [
        {
          action: "Fold",
          frequency: 0.45,
          sizingRange: null
        },
        {
          action: "Call",
          frequency: 0.30,
          sizingRange: null
        },
        {
          action: "Raise",
          frequency: 0.25,
          sizingRange: { min: 2.5, max: 3.5 }
        }
      ],
      explanation: "根据位置和牌力，建议..."
    }
  }
}
```

**ViewSnapshotModal 中的 gtoSuggestions:**

数据库返回的可能格式：

1. **对象格式（推荐）:**
```javascript
{
  "P1": {
    request: {...},
    response: {...}
  },
  "P2": {
    request: {...},
    response: {...}
  }
}
```

2. **数组格式:**
```javascript
[
  {
    playerId: "P1",
    suggestion: {
      request: {...},
      response: {...}
    },
    notes: ""
  }
]
```

3. **字符串格式（需要解析）:**
```javascript
"{\"P1\":{\"request\":{...},\"response\":{...}}}"
```

---

## 常见问题排查

### 问题 1: Console 显示 "建议数据为空"

**症状:**
```
[formatSuggestionToHTML] 建议数据为空
```

**原因:**
- `suggestion` 或 `data` 字段不存在
- 传入的对象结构不正确

**解决方案:**
检查 Console 中的输入数据：
```javascript
[InfoPanel.formatSuggestion] 输入: { playerId: "P1", data: undefined }
```
如果 `data` 是 `undefined`，说明 `currentSuggestionsCache` 的结构有问题。

**检查点:**
1. 查看 Network 标签中 `/poker/suggestion` 的响应
2. 确认 gameStore 正确保存了建议数据
3. 检查 `getSuggestion` 函数的返回值

---

### 问题 2: Console 显示 "建议响应数据为空"

**症状:**
```
[formatSuggestionToHTML] 建议响应数据为空，完整 suggestion: {...}
```

**原因:**
- `suggestion.response` 不存在
- API 返回的数据结构不符合预期

**解决方案:**

1. **检查 API 响应格式:**
   - 打开 Network 标签
   - 找到 `/poker/suggestion?...` 请求
   - 查看响应体结构

2. **确认后端返回的格式:**
   - 应该包含 `response` 字段
   - `response` 应该包含 `advices` 数组

3. **如果后端返回格式不同:**
   - 需要修改 `suggestionFormatter.ts` 适配实际格式
   - 或者修改后端使其返回正确格式

---

### 问题 3: Console 显示 "advices 不存在或为空"

**症状:**
```
[formatSuggestionToHTML] advices 不存在或为空
[formatSuggestionToHTML] response.advices 类型: undefined
```

**原因:**
- `response.advices` 字段缺失
- 或者 `advices` 不是数组

**解决方案:**

1. 打印完整的 `response` 对象
2. 检查字段名是否正确（可能是 `advice` 而不是 `advices`）
3. 确认后端 API 文档

**临时修复（如果字段名不同）:**
修改 `suggestionFormatter.ts`：
```typescript
// 兼容不同的字段名
const advices = response.advices || response.advice || response.actions || []
```

---

### 问题 4: 快照详情页建议不显示

**症状:**
- InfoPanel 中的建议正常显示
- 但快照详情页中不显示

**调试步骤:**

1. **保存快照时检查数据:**
   - 打开 Network 标签
   - 找到 `POST /poker/snapshots` 请求
   - 查看请求体中的 `gtoSuggestions` 字段

2. **加载快照时检查数据:**
   - 找到 `GET /poker/snapshots/{id}` 请求
   - 查看响应体中的 `gtoSuggestions` 字段
   - 对比保存和加载的数据是否一致

3. **检查 Console 日志:**
```
[ViewSnapshotModal] 快照原始数据: {...}
[ViewSnapshotModal] gtoSuggestions 类型: object
[ViewSnapshotModal] gtoSuggestions 内容: {...}
[ViewSnapshotModal] 解析后的建议数量: 1
```

4. **检查渲染:**
```
[ViewSnapshotModal.renderSuggestion] 输入数据: {...}
[ViewSnapshotModal.renderSuggestion] playerId: P1
[ViewSnapshotModal.renderSuggestion] suggestion: {...}
[ViewSnapshotModal.renderSuggestion] 输出 HTML 长度: 350
```

---

## 数据流追踪

### InfoPanel 数据流

```
1. AI 决策时调用 getSuggestion()
   ↓
2. getSuggestion() 返回 { request, response }
   ↓
3. gameStore.currentSuggestionsCache[playerId] = suggestion
   ↓
4. InfoPanel.currentSuggestions 计算属性被触发
   ↓
5. 创建 { playerId, data: suggestion } 对象
   ↓
6. formatSuggestion() 调用 formatSuggestionToHTML()
   ↓
7. 提取 response.advices 和 response.explanation
   ↓
8. 生成 HTML 并渲染
```

### ViewSnapshotModal 数据流

```
1. 保存快照时：gameStore.currentSuggestionsCache → JSON.stringify
   ↓
2. POST /poker/snapshots { gtoSuggestions: "{...}" }
   ↓
3. 数据库保存
   ↓
4. 加载快照时：GET /poker/snapshots/{id}
   ↓
5. 返回 { gtoSuggestions: "{...}" } 或 { gtoSuggestions: {...} }
   ↓
6. ViewSnapshotModal 解析 gtoSuggestions
   ↓
7. 转换为 [{ playerId, suggestion, notes }] 格式
   ↓
8. renderSuggestion() 调用 formatSuggestionToHTML()
   ↓
9. 生成 HTML 并渲染
```

---

## 手动测试清单

- [ ] 开始按钮是绿色
- [ ] P1 在圆桌最下方
- [ ] 行动表每个阶段有 4 列
- [ ] 行动表按 SB, BB... 顺序排列
- [ ] GTO 筛选默认选中 P1
- [ ] InfoPanel 显示 P1 的 GTO 建议
- [ ] GTO 建议格式化显示（不是 JSON）
- [ ] 保存快照后自动跳转到详情页
- [ ] 快照详情页显示 GTO 建议
- [ ] 快照时间正确显示

---

## 如果问题仍未解决

### 收集完整日志

1. 清空 Console
2. 从头开始游戏
3. 复制所有日志
4. 特别注意以下关键点：
   - `[formatSuggestionToHTML]` 开头的所有日志
   - `[InfoPanel]` 开头的所有日志
   - `[ViewSnapshotModal]` 开头的所有日志
   - Network 标签中的 API 请求和响应

### 检查后端 API

使用 Postman 或 curl 测试后端 API：

```bash
curl "http://localhost:8080/poker/suggestion?myCards=As&myCards=Kh&boardCards=&myRole=1&myStack=2000&potChips=30&toCall=10&opponents=7&preFlopRaisers=0&potType=4&hasPosition=false&flopActionSituation=0&phase=1&bigBlind=20"
```

确认响应格式是否包含：
```json
{
  "advices": [
    {
      "action": "Fold",
      "frequency": 0.45
    }
  ],
  "explanation": "..."
}
```

---

## 移除调试日志

当所有功能正常后，移除以下文件中的 `console.log`：

1. `src/utils/suggestionFormatter.ts`
2. `src/components/InfoPanel.vue`
3. `src/components/ViewSnapshotModal.vue`

搜索关键字：
```
console.log('[formatSuggestionToHTML]
console.log('[InfoPanel]
console.log('[ViewSnapshotModal]
```

---

## 相关文件

- `vue-simulator/src/utils/suggestionFormatter.ts` - 格式化逻辑
- `vue-simulator/src/components/InfoPanel.vue` - GTO 显示面板
- `vue-simulator/src/components/ViewSnapshotModal.vue` - 快照详情
- `vue-simulator/src/stores/gameStore.ts` - 状态管理
- `vue-simulator/src/api/gtoService.ts` - API 调用
- `vue-simulator/CURRENT_FIXES.md` - 修复总结