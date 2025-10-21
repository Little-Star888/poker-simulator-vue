# Vue3 Poker Simulator 测试文档

## 最新更新（当前版本）

### 1. GTO建议格式化修复
- ✅ 创建了共享的格式化工具函数 `suggestionFormatter.ts`
- ✅ InfoPanel 和 ViewSnapshotModal 现在使用相同的格式化逻辑
- ✅ 适配真实的API响应格式（`{ request, response }`）
- ✅ 不再显示原始JSON，而是格式化的建议内容

### 2. 行动表排序优化
- ✅ 行动表现在按盲注顺序排列：SB → BB → UTG → ... → CO → BTN
- ✅ 不再按玩家编号（P1-P8）排序
- ✅ 更符合扑克实际玩法习惯

### 3. 玩家位置布局
- ✅ P1 固定在桌子最下方（90°）
- ✅ 其他玩家按平均角度分布在圆桌周围
- ✅ 根据玩家数量自动计算角度间隔

---

## 功能测试清单

### 一、GTO建议显示测试

#### 测试环境准备
```bash
cd vue-simulator
npm run dev
```

#### 测试步骤

**1. 测试 InfoPanel 的 GTO 建议显示**

1. 启动应用并配置游戏参数
2. 开始新牌局
3. 等待AI玩家行动或手动触发GTO建议
4. 查看右侧 InfoPanel 的"💡 GTO 建议"区域

**验证点：**
- ✅ 显示玩家ID标题（如"给 P1 的建议:"）
- ✅ 显示"建议动作"分节
- ✅ 每个动作显示为：`动作名称 - 频率: XX.X%`
- ✅ 如果有下注范围，显示范围值
- ✅ 显示"说明"分节（如果API返回了explanation）
- ✅ 使用深色背景和彩色文字
- ✅ 不显示原始JSON

**正确的显示格式示例：**

```
给 P1 的建议:

建议动作
───────────────
1. Bet - 频率: 65.0% (100-200)
2. Call - 频率: 25.0%
3. Fold - 频率: 10.0%

说明
───────────────
根据你的位置和手牌强度，建议主要采取激进策略...
```

**2. 测试快照中的 GTO 建议显示**

1. 在牌局中保存快照（确保包含GTO建议）
2. 点击"查看快照"打开快照列表
3. 选择一个快照查看详情

**验证点：**
- ✅ 快照详情中的GTO格式与InfoPanel完全一致
- ✅ 所有字段正确显示
- ✅ 玩家筛选功能正常工作
- ✅ 批注可以正常编辑和保存

**3. 对比一致性测试**

1. 在InfoPanel中记录某个玩家的GTO建议格式
2. 保存快照
3. 在快照详情中查看同一建议
4. 对比两处的显示格式

**验证点：**
- ✅ 格式完全一致
- ✅ 颜色、字体、间距相同
- ✅ 数据组织方式一致

---

### 二、行动表排序测试

#### 测试步骤

1. 开始新牌局
2. 等待游戏分配角色
3. 观察右侧 InfoPanel 的"📊 玩家行动"表格

**验证点：**
- ✅ 第一行是 SB（小盲）
- ✅ 第二行是 BB（大盲）
- ✅ 后续按位置顺序：UTG → UTG+1 → UTG+2 → MP1 → MP2 → HJ → CO → BTN
- ✅ 不是按 P1, P2, P3... 的顺序

**示例（6人桌）：**
```
玩家   | Preflop | Flop | Turn | River
-------|---------|------|------|-------
P2(SB) | Call    | -    | -    | -
P3(BB) | Check   | -    | -    | -
P4(UTG)| Fold    | -    | -    | -
P5(CO) | Raise   | -    | -    | -
P6(BTN)| Call    | -    | -    | -
P1(HJ) | Fold    | -    | -    | -
```

---

### 三、玩家位置布局测试

#### 测试步骤

1. 启动应用
2. 分别测试不同的玩家数量（2-8人）
3. 观察玩家在牌桌上的位置

**验证点：**
- ✅ P1 始终在桌子最下方（正中间底部）
- ✅ 其他玩家均匀分布在圆桌周围
- ✅ 2人桌：P1在下，P2在上
- ✅ 3人桌：P1在下，P2和P3分别在左上、右上
- ✅ 4人桌：P1在下，P2在左，P3在上，P4在右
- ✅ 6人桌：玩家间隔60°
- ✅ 8人桌：玩家间隔45°

**位置计算公式：**
- P1: 固定在 90°（最下方）
- 其他玩家：90° + (360° / 玩家总数) × (玩家索引 - 1)

---

## API响应格式说明

### GTO建议API响应结构

```typescript
interface GTOSuggestion {
  request: {
    myCards: string[]
    boardCards: string[]
    myRole: number
    myStack: number
    potChips: number
    toCall: number
    opponents: number
    preFlopRaisers: number
    potType: number
    hasPosition: boolean
    flopActionSituation: number
    phase: number
    bigBlind: number
  }
  response: {
    advices: Array<{
      action: string          // 动作名称：Fold, Call, Bet, Raise, Check, AllIn
      frequency: number       // 频率：0-1之间的小数
      sizingRange?: {         // 可选的下注范围
        min: number
        max: number
      }
    }>
    explanation?: string      // 可选的说明文字
  }
}
```

### 示例响应

```json
{
  "request": { ... },
  "response": {
    "advices": [
      {
        "action": "Bet",
        "frequency": 0.65,
        "sizingRange": {
          "min": 100,
          "max": 200
        }
      },
      {
        "action": "Call",
        "frequency": 0.25
      },
      {
        "action": "Fold",
        "frequency": 0.10
      }
    ],
    "explanation": "根据你的位置和手牌强度，建议主要采取激进策略以建立底池。"
  }
}
```

---

## 常见问题排查

### 问题1: GTO建议仍然显示JSON格式

**可能原因：**
- API返回的数据结构不正确
- response.advices 不是数组
- suggestion对象没有response字段

**排查步骤：**
1. 打开浏览器开发者工具
2. 查看Console中的API响应日志
3. 检查 `currentSuggest