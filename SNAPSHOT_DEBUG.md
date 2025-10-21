# 快照功能调试指南

## 修复日期
2024年（最新）

---

## 问题清单

### 1. ✅ P1 玩家位置错误

**问题描述**：P1 玩家显示在最下方，而不是原版的位置

**原因分析**：
- Vue 版本使用平均分配角度：`(360 / count) * (index - 1) - 90`
- 原版使用固定角度数组：`[90, 135, 180, 225, 270, 315, 0, 45]`

**修复方案**：
```typescript
// 修复前
const angle = (360 / count) * (index - 1) - 90

// 修复后
const seatAngles = [90, 135, 180, 225, 270, 315, 0, 45]
const angle = seatAngles[index - 1]
```

**座位角度对照表**：
| 玩家 | 角度 | 位置 |
|------|------|------|
| P1 | 90° | 正下方 |
| P2 | 135° | 左下 |
| P3 | 180° | 正左方 |
| P4 | 225° | 左上 |
| P5 | 270° | 正上方 |
| P6 | 315° | 右上 |
| P7 | 0° | 正右方 |
| P8 | 45° | 右下 |

**文件**：`src/components/PokerTable.vue`

**状态**：✅ 已修复

---

### 2. ⚠️ 快照详情页空白

**问题描述**：保存快照后，自动打开的查看快照页面显示空白

**可能原因**：

#### 原因 A：后端返回的数据格式不匹配
```javascript
// 预期格式
{
  id: 1,
  name: "快照名称",
  createdAt: "2024-01-01T12:00:00",
  imageData: "data:image/png;base64,...",
  gtoSuggestions: "[...]" // 字符串或对象
}

// 检查方法
console.log('快照数据:', snapshot)
console.log('imageData 类型:', typeof snapshot.imageData)
console.log('gtoSuggestions 类型:', typeof snapshot.gtoSuggestions)
```

#### 原因 B：图片数据为空或格式错误
```javascript
// 检查图片数据
if (snapshot.imageData) {
  console.log('图片数据长度:', snapshot.imageData.length)
  console.log('图片前缀:', snapshot.imageData.substring(0, 50))
} else {
  console.error('❌ imageData 为空')
}
```

#### 原因 C：GTO 建议解析失败
```javascript
// 已添加的调试逻辑
try {
  const suggestions = JSON.parse(data.gtoSuggestions)
  console.log('解析后的建议:', suggestions)
} catch (e) {
  console.error('解析失败:', e)
}
```

**调试步骤**：

1. **打开浏览器控制台**（F12）

2. **保存一个快照**，查看控制台输出：
   ```
   📦 快照原始数据: {...}
     - imageData 类型: string 长度: 12345
     - gtoSuggestions 类型: string
     - createdAt: 2024-01-01T12:00:00
   ```

3. **检查 API 响应**：
   - 打开 Network 标签
   - 找到 `/poker/snapshots/[id]` 请求
   - 查看 Response 内容
   - 确认各字段是否存在

4. **检查错误日志**：
   ```
   ❌ 加载快照详情失败: [error message]
   ```

**临时解决方案**：
```typescript
// 在 ViewSnapshotModal.vue 中添加的容错逻辑
let allGtoSuggestions = []
if (data.gtoSuggestions) {
  if (typeof data.gtoSuggestions === 'string') {
    allGtoSuggestions = JSON.parse(data.gtoSuggestions)
  } else if (Array.isArray(data.gtoSuggestions)) {
    allGtoSuggestions = data.gtoSuggestions
  } else if (typeof data.gtoSuggestions === 'object') {
    // 对象转数组
    allGtoSuggestions = Object.entries(data.gtoSuggestions).map(...)
  }
}
```

**检查清单**：
- [ ] 后端 API 返回状态码 200
- [ ] imageData 字段存在且非空
- [ ] imageData 以 `data:image/` 开头
- [ ] createdAt 字段存在且格式正确
- [ ] gtoSuggestions 可以正常解析
- [ ] 控制台没有错误日志

**文件**：`src/components/ViewSnapshotModal.vue`

**状态**：⚠️ 已添加调试日志，待验证

---

### 3. ⚠️ 快照时间显示 "Invalid Date"

**问题描述**：快照列表中，快照名称下方的时间显示为 "Invalid Date"

**可能原因**：

#### 原因 A：createdAt 字段不存在
```javascript
// 后端返回的可能是 timestamp 而不是 createdAt
{
  id: 1,
  name: "快照",
  timestamp: "2024-01-01T12:00:00",  // ❌ 字段名错误
  createdAt: undefined                // ❌ 实际使用的字段
}
```

#### 原因 B：日期格式不兼容
```javascript
// 可能的格式问题
"2024-01-01T12:00:00"      // ✅ ISO 8601
"2024-01-01 12:00:00"      // ⚠️ 某些浏览器可能不支持
"1704096000000"            // ✅ Unix 时间戳（毫秒）
"01/01/2024"               // ⚠️ 地区差异
```

#### 原因 C：字段为 null 或 undefined
```javascript
createdAt: null            // ❌
createdAt: undefined       // ❌
createdAt: ""              // ❌
```

**调试步骤**：

1. **检查 API 响应**：
   ```javascript
   // 在控制台运行
   fetch('/poker/snapshots?page=0&size=5')
     .then(r => r.json())
     .then(data => {
       console.log('快照列表:', data.content)
       if (data.content[0]) {
         console.log('第一个快照的所有字段:', Object.keys(data.content[0]))
         console.log('createdAt 值:', data.content[0].createdAt)
         console.log('timestamp 值:', data.content[0].timestamp)
       }
     })
   ```

2. **查看控制台日志**：
   ```
   📦 快照列表数据: [...]
     - 第一个快照: {...}
     - createdAt 字段: undefined  ❌ 或其他值
   ```

3. **测试日期解析**：
   ```javascript
   const dateStr = "你的日期字符串"
   const date = new Date(dateStr)
   console.log('解析结果:', date)
   console.log('是否有效:', !isNaN(date.getTime()))
   console.log('格式化:', date.toLocaleString('zh-CN'))
   ```

**修复方案**：

已添加的改进：
```typescript
const formatTimestamp = (createdAt: string): string => {
  if (!createdAt) {
    console.warn('createdAt is empty')
    return '未知时间'
  }

  try {
    const date = new Date(createdAt)
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', createdAt)
      return createdAt
    }
    
    return date.toLocaleString('zh-CN', {...})
  } catch (error) {
    console.error('Date formatting error:', error, createdAt)
    return createdAt || '未知时间'
  }
}
```

**临时解决方案**：

如果后端返回的是 `timestamp` 而不是 `createdAt`：
```typescript
// 在 SnapshotList.vue 的模板中
<small>{{ formatTimestamp(snapshot.createdAt || snapshot.timestamp) }}</small>
```

或者，如果是 Unix 时间戳（毫秒）：
```typescript
const formatTimestamp = (createdAt: string | number): string => {
  const date = typeof createdAt === 'number' 
    ? new Date(createdAt) 
    : new Date(createdAt)
  // ...
}
```

**文件**：`src/components/SnapshotList.vue`

**状态**：⚠️ 已添加调试日志，待验证

---

## 完整调试流程

### 步骤 1：启动开发服务器
```bash
cd vue-simulator
npm run dev
```

### 步骤 2：打开浏览器控制台
按 F12，切换到 Console 标签

### 步骤 3：保存一个快照
1. 开始游戏
2. 点击"保存快照"
3. 拖拽选择区域
4. 输入快照名称
5. 点击"确认保存"

### 步骤 4：查看控制台输出

#### 保存阶段
```
📸 正在根据选定区域生成快照...
✅ 截图已生成。正在整理当前GTO建议...
✅ 所有当前GTO建议已整理。请在弹窗中确认保存。
💾 正在保存快照到数据库...
✅ 快照 "快照名称" (ID: 1) 已成功保存。
```

#### 列表加载阶段
```
📦 快照列表数据: [...]
  - 第一个快照: {id: 1, name: "...", createdAt: "..."}
  - createdAt 字段: "2024-01-01T12:00:00"
```

#### 详情加载阶段
```
正在从数据库加载快照 (ID: 1)...
📦 快照原始数据: {id: 1, name: "...", ...}
  - imageData 类型: string 长度: 12345
  - gtoSuggestions 类型: string
  - createdAt: 2024-01-01T12:00:00
📋 解析后的建议数量: 5
✅ 快照加载成功 (5 条建议)
```

### 步骤 5：检查问题

#### 如果快照详情空白：
1. 查看是否有错误日志
2. 检查 imageData 是否为空
3. 检查 Network 标签中的 API 响应
4. 确认 modal 的 `visible` 状态为 `true`

#### 如果时间显示 Invalid Date：
1. 查看 `createdAt 字段:` 的输出
2. 确认字段名是否正确（可能是 `timestamp`）
3. 测试日期解析是否成功
4. 检查日期格式是否符合标准

---

## 后端 API 要求

### GET /poker/snapshots
**响应格式**：
```json
{
  "content": [
    {
      "id": 1,
      "name": "快照名称",
      "createdAt": "2024-01-01T12:00:00Z",
      "thumbnailUrl": null
    }
  ],
  "totalPages": 1,
  "totalElements": 1,
  "number": 0,
  "size": 5
}
```

**关键字段**：
- `createdAt`: ISO 8601 格式的日期字符串（必须）
- 或 `timestamp`: 如果使用此字段，前端需要调整

### GET /poker/snapshots/:id
**响应格式**：
```json
{
  "id": 1,
  "name": "快照名称",
  "createdAt": "2024-01-01T12:00:00Z",
  "imageData": "data:image/png;base64,iVBORw0KGgo...",
  "gtoSuggestions": "[{\"playerId\":\"P1\",\"suggestion\":{...}}]",
  "gameState": "{\"players\":[...]}",
  "actionHistory": "[...]",
  "settings": "{...}"
}
```

**关键字段**：
- `imageData`: Base64 编码的图片数据（必须）
- `gtoSuggestions`: JSON 字符串或对象（必须）
- `createdAt`: 日期字符串（必须）

---

## 常见错误和解决方案

### 错误 1：Cannot read property 'imageData' of undefined
**原因**：snapshot.value 为空
**解决**：检查 API 是否正常返回数据

### 错误 2：JSON.parse: unexpected character
**原因**：gtoSuggestions 不是有效的 JSON
**解决**：已添加 try-catch 容错

### 错误 3：Invalid Date
**原因**：createdAt 字段不存在或格式错误
**解决**：检查后端返回的字段名和格式

### 错误 4：图片不显示
**原因**：imageData 格式错误或为空
**解决**：确保 imageData 以 `data:image/` 开头

---

## 快速诊断脚本

在浏览器控制台运行：

```javascript
// === 快照功能诊断 ===
console.log('=== 快照功能诊断 ===\n')

// 1. 检查 API 可用性
fetch('/poker/snapshots?page=0&size=1')
  .then(r => r.json())
  .then(data => {
    console.log('✅ API 可访问')
    console.log('快照数量:', data.totalElements)
    
    if (data.content && data.content[0]) {
      const snap = data.content[0]
      console.log('\n快照摘要字段:')
      console.log('  - id:', snap.id)
      console.log('  - name:', snap.name)
      console.log('  - createdAt:', snap.createdAt)
      console.log('  - timestamp:', snap.timestamp)
      
      // 测试日期解析
      const dateField = snap.createdAt || snap.timestamp
      if (dateField) {
        const date = new Date(dateField)
        console.log('\n日期解析:')
        console.log('  - 原始值:', dateField)
        console.log('  - Date 对象:', date)
        console.log('  - 是否有效:', !isNaN(date.getTime()))
        console.log('  - 格式化:', date.toLocaleString('zh-CN'))
      }
      
      // 加载详情
      return fetch(`/poker/snapshots/${snap.id}`)
    }
  })
  .then(r => r?.json())
  .then(detail => {
    if (detail) {
      console.log('\n快照详情字段:')
      console.log('  - imageData:', detail.imageData ? '存在 (' + detail.imageData.length + ' 字符)' : '❌ 不存在')
      console.log('  - gtoSuggestions:', typeof detail.gtoSuggestions)
      console.log('  - gameState:', typeof detail.gameState)
      
      if (detail.imageData) {
        console.log('  - 图片前缀:', detail.imageData.substring(0, 30))
      }
    }
  })
  .catch(err => {
    console.error('❌ API 错误:', err)
  })

console.log('\n等待 API 响应...')
```

---

**最后更新**：2024年  
**状态**：调试中，已添加详细日志