# 立即测试指南

## 本次修复内容

### ✅ 已修复的问题

1. **开始按钮颜色** - 现在显示为绿色
2. **P1 玩家位置** - 固定在圆桌正下方
3. **行动表格式** - 每个阶段4列，动作独立显示
4. **GTO 筛选默认值** - P1 默认被选中
5. **快照时间显示** - 兼容 timestamp 和 createdAt 字段

### 🔧 待验证的问题

6. **GTO 建议显示** - 已添加详细调试日志，需要验证数据流

---

## 快速测试步骤

### 1. 启动应用

```bash
cd vue-simulator
npm run dev
```

浏览器打开: http://localhost:5173

### 2. 检查界面初始状态

- [ ] 开始按钮是绿色的
- [ ] GTO 建议筛选中，P1 默认已勾选

### 3. 开始游戏

1. 点击绿色的"开始"按钮
2. 按 **F12** 打开开发者工具
3. 切换到 **Console** 标签

### 4. 检查 P1 位置和行动表

- [ ] P1 在圆桌最下方（6点钟位置）
- [ ] 其他玩家平均分布在圆周上
- [ ] 行动表的表头：`玩家 | Preflop(4列) | Flop(4列) | Turn(4列) | River(4列)`
- [ ] 玩家按盲注顺序排列：SB, BB, UTG...

### 5. 查看 GTO 建议调试日志

在 Console 中搜索以下关键字：

#### A. InfoPanel 建议缓存
```
[InfoPanel] currentSuggestionsCache:
[InfoPanel] gtoSuggestionFilter: ["P1"]
[InfoPanel] 处理玩家 P1 的建议
[InfoPanel] 建议数量: 1
```

#### B. 格式化过程
```
[formatSuggestionToHTML] 输入数据:
[formatSuggestionToHTML] 解析后的 suggestion:
[formatSuggestionToHTML] response 对象:
[formatSuggestionToHTML] response.advices:
```

#### C. 错误信息（如果有）
- "建议数据为空" → 数据结构问题
- "建议响应数据为空" → response 字段缺失
- "advices 不存在或为空" → advices 字段问题

### 6. 检查 Network 请求

1. 切换到 **Network** 标签
2. 筛选 XHR 或 Fetch 请求
3. 找到 `/poker/suggestion` 请求
4. 点击查看 **Response** 标签
5. 确认响应格式

**预期的响应格式：**
```json
{
  "advices": [
    {
      "action": "Fold",
      "frequency": 0.45,
      "sizingRange": null
    },
    {
      "action": "Call",
      "frequency": 0.30,
      "sizingRange": null
    }
  ],
  "explanation": "根据位置和牌力..."
}
```

### 7. 测试快照功能

1. 点击"保存快照"按钮
2. 选择截图区域
3. 输入快照名称（或使用默认）
4. 点击"确认保存"
5. 应该自动跳转到快照详情页

**在详情页检查：**
- [ ] 快照图片正确显示
- [ ] 时间不是"未知时间"
- [ ] GTO 建议是否显示
- [ ] 如果不显示，查看 Console 中的 `[ViewSnapshotModal]` 日志

---

## 如果 GTO 建议不显示

### 收集以下信息：

#### 1. Console 日志
在 Console 中找到并复制：

```
[formatSuggestionToHTML] 输入数据: { ... }
[formatSuggestionToHTML] response 对象: { ... }
```

#### 2. API 响应
在 Network 标签中：
- 找到 `/poker/suggestion?...` 请求
- 复制完整的响应 JSON

#### 3. 快照数据（如果快照也不显示）
```
[ViewSnapshotModal] 快照原始数据: { ... }
[ViewSnapshotModal] gtoSuggestions 内容: { ... }
```

### 提供以下信息：

1. **完整的 Console 日志**（从游戏开始到建议显示）
2. **API 响应数据**（/poker/suggestion 的响应）
3. **截图**（显示 InfoPanel 的 GTO 区域）
4. **错误信息**（如果有红色错误）

---

## 预期结果

### InfoPanel 的 GTO 建议应该显示：

```
给 P1 的建议:

建议动作
───────────────
1. Fold - 频率: 45.0%
2. Call - 频率: 30.0%
3. Raise - 频率: 25.0% (2.5-3.5)

说明
───────────────
根据当前底池赔率和位置...
```

**而不是：**
```json
{
  "request": {...},
  "response": {...}
}
```

---

## 常见问题

### Q1: 建议显示"建议数据为空"
**A:** 检查 `currentSuggestionsCache` 的内容，确认数据已保存

### Q2: 建议显示"建议响应数据为空"
**A:** 检查 API 响应中是否有 `response` 字段

### Q3: 建议显示"advices 不存在或为空"
**A:** 检查 `response.advices` 是否是数组且包含元素

### Q4: 快照详情页建议不显示
**A:** 
1. 检查保存快照时的请求体（POST /poker/snapshots）
2. 检查加载快照时的响应（GET /poker/snapshots/{id}）
3. 对比两者的 gtoSuggestions 字段是否一致

---

## 检查清单

在报告问题前，请确认：

- [ ] 已启动后端服务
- [ ] 已运行 `npm run dev`
- [ ] 已打开浏览器开发者工具
- [ ] 已查看 Console 标签的调试日志
- [ ] 已查看 Network 标签的 API 响应
- [ ] 已尝试刷新页面重新开始
- [ ] 已检查后端控制台是否有错误

---

## 相关文档

- `CURRENT_FIXES.md` - 详细的修复说明
- `DEBUG_GTO_DISPLAY.md` - 完整的调试指南
- `vue-simulator/src/utils/suggestionFormatter.ts` - 格式化函数源码