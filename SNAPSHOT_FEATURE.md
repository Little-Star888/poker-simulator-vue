# 牌局快照管理功能文档

## 📋 功能概览

牌局快照管理系统提供完整的快照生命周期管理，包括创建、查看、编辑批注、分页浏览和删除快照。该功能与原版实现保持 1:1 对齐，完整复刻所有交互细节。

## 🎯 核心功能

### 1. 保存快照

#### 触发方式
- **手动触发**：点击"📸 保存快照"按钮
- **牌局结束**：游戏结束时弹出确认框，选择"确认保存"

#### 保存流程
1. **截图选择**
   - 用户在页面上拖拽选择截图区域
   - 支持鼠标拖拽绘制选框
   - 最小区域限制：20x20 像素
   - 取消操作会清理所有临时状态

2. **数据采集**
   - 使用 `html2canvas` 生成高质量截图（2x scale）
   - 采集当前游戏状态（GameState）
   - 采集所有已生成的 GTO 建议
   - 采集完整的行动历史记录
   - 采集当前游戏设置

3. **确认保存**
   - 显示截图预览
   - 可选输入快照名称（默认使用时间戳）
   - 显示游戏状态摘要信息
   - 显示 GTO 建议数量和行动记录数量
   - 支持重新截取或取消

4. **后端保存**
   - 通过 `snapshotService.createSnapshot()` 提交
   - 自动刷新快照列表
   - 保存成功后自动打开快照详情页

### 2. 查看快照

#### 功能特性

**图片预览**
- 高质量快照图片展示
- 悬停提示"查看大图"
- 点击图片进入灯箱模式
- 灯箱支持全屏查看，点击关闭

**玩家筛选器**
- 自动提取所有玩家 ID
- 复选框筛选显示/隐藏特定玩家的建议
- 默认显示所有玩家
- 实时更新显示状态

**GTO 建议展示**
- 分玩家展示所有建议
- 自动识别阶段（Preflop/Flop/Turn/River）
- 结构化展示：
  - 牌局信息（手牌、公共牌、牌面、牌型）
  - 局势分析（位置、行动场景）
  - 数据参考（本地计算、Treys 对比）
  - 最终建议（行动、理由）

**批注编辑**
- 每个建议都有独立的批注文本框
- 实时编辑，无需单独保存按钮
- 最小高度 120px，支持垂直调整大小

**批注保存**
- "💾 保存批注"按钮
- 智能检测变化：
  - 无变化时显示"ℹ️ 无变化"
  - 有变化时执行保存
- 保存状态反馈：
  - `保存中...`（带动画点点）
  - `✅ 保存成功`（绿色，2秒后恢复）
  - `❌ 保存失败`（红色，3秒后恢复）
- 保存中禁用所有文本框和按钮
- 视觉反馈：文本框变蓝色边框

### 3. 快照列表

#### 列表展示

**加载状态**
- 居中显示加载动画（旋转圆圈）
- 加载文本提示

**空状态**
- 显示相机图标 📷
- 提示"暂无快照"
- 引导"使用保存快照功能创建第一个快照"

**错误状态**
- 显示警告图标 ⚠️
- 显示错误信息
- 红色主题

**快照列表项**
- 快照名称（蓝色，可点击查看详情）
- 创建时间（格式化为本地时间）
- 操作按钮：
  - **查看快照**（蓝色）- 打开详情页
  - **回放**（绿色）- 启动回放功能
  - **删除快照**（红色）- 删除确认

**悬停效果**
- 列表项悬停变浅灰色背景
- 快照名称悬停显示下划线

#### 分页功能

**分页控件**
- 仅在总页数 > 1 时显示
- "上一页" / "下一页" 按钮
- 显示"第 X / Y 页"
- 按钮禁用状态管理
- 蓝色渐变样式
- 悬停动画效果

**分页逻辑**
- 每页显示 5 条记录
- 0-based 页码
- 后端分页支持
- 删除后智能跳转（当前页无数据时返回上一页）

### 4. 删除快照

#### 确认机制

**删除确认弹窗**
- 自定义 Popover 样式
- 智能定位（避免超出屏幕）
- 点击外部自动关闭
- 按钮：
  - **确认**（红色）- 执行删除
  - **取消**（灰色）- 关闭弹窗

**删除流程**
1. 点击"删除快照"按钮
2. 显示确认弹窗（定位在按钮附近）
3. 用户确认后调用 `deleteSnapshotById()`
4. 删除成功后刷新列表
5. 智能跳转页码

### 5. 牌局结束提示

**EndOfHandModal 组件**
- 游戏结束时自动弹出
- 询问是否保存快照
- 操作选项：
  - **确认保存** - 启动快照流程，完成后停止游戏
  - **取消** - 直接停止游戏，不保存

**流程整合**
- 使用 `postSnapshotAction` 回调机制
- 保存完成后自动执行 `stopGame()`
- 保证游戏状态正确过渡

## 🏗️ 技术架构

### 组件结构

```
快照功能组件树
├── App.vue (主容器)
│   ├── ConfigPanel.vue
│   │   └── SnapshotList.vue (快照列表)
│   ├── ActionBar.vue (快照按钮)
│   ├── ScreenshotSelector.vue (截图选择)
│   ├── SnapshotModal.vue (保存确认)
│   ├── ViewSnapshotModal.vue (查看详情)
│   └── EndOfHandModal.vue (结束提示)
```

### 数据流

```
用户操作
  ↓
ScreenshotSelector (截图) → html2canvas
  ↓
SnapshotModal (确认) → 收集数据
  ↓
snapshotService.createSnapshot() → 后端 API
  ↓
SnapshotList.refresh() → 更新列表
  ↓
ViewSnapshotModal (自动打开) → 显示详情
```

### 状态管理

**gameStore 快照相关状态**
```typescript
{
  // 快照分页
  snapshotCurrentPage: number
  snapshotTotalPages: number
  
  // 模态框控制
  showSnapshotModal: boolean
  showViewSnapshotModal: boolean
  currentViewSnapshotId: number | null
  
  // 快照数据
  pendingSnapshotData: any | null
  postSnapshotAction: (() => void) | null
  
  // GTO 建议缓存
  currentSuggestionsCache: Record<string, GTOSuggestion>
  
  // 行动历史
  handActionHistory: HandAction[]
}
```

## 📡 API 集成

### API 服务层 (`snapshotService.ts`)

**接口清单**

1. **getSnapshots(page, size)** - 获取快照列表（分页）
   - 返回：`SnapshotPage` 对象

2. **getSnapshotById(id)** - 获取快照详情
   - 返回：`SnapshotDetail` 对象

3. **createSnapshot(data)** - 创建新快照
   - 参数：name, gameState, imageData, gtoSuggestions, actionHistory, settings
   - 返回：创建的 `SnapshotDetail`

4. **updateSnapshot(id, data)** - 更新快照（批注）
   - 参数：gtoSuggestions（更新后的 JSON）
   - 返回：更新后的 `SnapshotDetail`

5. **deleteSnapshotById(id)** - 删除快照
   - 返回：void（204 No Content）

### 后端 API 端点

```
BASE_URL: /poker/snapshots

GET    /poker/snapshots?page=0&size=5
GET    /poker/snapshots/:id
POST   /poker/snapshots
PUT    /poker/snapshots/:id
DELETE /poker/snapshots/:id
```

## 🎨 UI/UX 特性

### 视觉设计

**色彩方案**
- 查看按钮：蓝色 (#007bff)
- 回放按钮：绿色 (#28a745)
- 删除按钮：红色 (#dc3545)
- 分页按钮：蓝色渐变 (linear-gradient)
- 保存状态：灰色→绿色→恢复

**动画效果**
- 模态框：从下往上滑入 (modal-slide-up)
- 按钮：悬停上浮 2px + 阴影
- 加载：旋转动画
- 保存：点点动画 (...)
- Toast：淡入淡出

**响应式设计**
- 桌面：双栏布局，快照详情宽屏
- 平板：单栏，快照详情适配
- 手机：
  - 建议内容纵向排列
  - 按钮全宽显示
  - 分页控件纵向

### 交互细节

**悬停提示**
- 图片：显示"查看大图"提示
- 按钮：title 属性
- 快照名称：显示完整名称（防溢出截断）

**键盘支持**
- Enter：确认保存快照
- Esc：取消/关闭模态框
- Tab：焦点管理

**焦点管理**
- 模态框打开自动聚焦输入框
- 关闭模态框清除焦点

**加载状态**
- 保存中禁用所有交互
- 视觉反馈（文本框变色）
- 按钮文本变化

## ✅ 功能对齐检查表

与原版 (`main.js`) 功能对照：

- [x] 截图选择器（拖拽绘制选框）
- [x] 截图生成（html2canvas）
- [x] 快照数据采集（游戏状态、GTO、历史）
- [x] 快照保存确认模态框
- [x] 快照名称输入（可选）
- [x] 快照列表展示（分页）
- [x] 快照详情查看
- [x] 图片灯箱放大
- [x] 玩家筛选器
- [x] GTO 建议结构化展示
- [x] 批注编辑
- [x] 批注保存（智能检测变化）
- [x] 删除确认弹窗
- [x] 删除功能
- [x] 分页控件
- [x] 加载状态
- [x] 错误处理
- [x] Toast 提示
- [x] 牌局结束保存提示
- [x] 回放功能入口（TODO: 完整实现）

## 🔧 使用示例

### 开发者集成

**刷新快照列表**
```typescript
// 在父组件中
const configPanelRef = ref<InstanceType<typeof ConfigPanel> | null>(null)

// 刷新列表
configPanelRef.value?.refreshSnapshotList()
```

**打开查看快照**
```typescript
gameStore.currentViewSnapshotId = snapshotId
gameStore.showViewSnapshotModal = true
```

**启动快照流程**
```typescript
// 全局方法
(window as any).showScreenshotSelector()
```

**设置快照后回调**
```typescript
gameStore.postSnapshotAction = () => {
  console.log('快照保存完成后执行')
  gameStore.stopGame()
}
```

## 🐛 调试技巧

**控制台日志**
- 所有操作都会输出到游戏日志
- 使用 emoji 前缀标识类型
- 包含详细的错误信息

**常见问题**

1. **截图失败**
   - 检查 html2canvas 是否正确加载
   - 检查跨域图片资源（useCORS: true）
   - 查看浏览器控制台错误

2. **快照列表不刷新**
   - 检查 API 响应
   - 验证 ref 引用是否正确
   - 确认 refresh 方法被调用

3. **批注保存无响应**
   - 检查快照 ID
   - 验证 JSON 序列化
   - 查看网络请求

## 📝 待完善功能

1. **回放功能完整实现**
   - 当前仅有入口，需实现完整回放逻辑
   - 需要恢复游戏状态
   - 需要逐步重放行动

2. **快照导出/导入**
   - 导出为 JSON 文件
   - 从文件导入快照

3. **快照搜索**
   - 按名称搜索
   - 按日期筛选
   - 按玩家筛选

4. **快照比较**
   - 并排对比两个快照
   - 高亮差异

5. **批量操作**
   - 批量删除
   - 批量导出

## 🎓 最佳实践

1. **定期保存快照** - 记录关键决策点
2. **添加描述性名称** - 便于日后查找
3. **批注重要建议** - 记录思考过程
4. **定期清理旧快照** - 避免数据冗余
5. **截图包含完整信息** - 确保牌面、底池、筹码清晰可见

## 📚 相关文档

- [快速开始指南](./QUICKSTART.md)
- [预设功能文档](./PRESET_FEATURE.md)
- [主项目 README](./README.md)

---

**版本**: Vue 3 + TypeScript + Pinia  
**更新时间**: 2024  
**状态**: ✅ 功能完整，与原版 1:1 对齐