# 德州扑克 AI 测试模拟器 (Vue3 版本)

一个功能完整的德州扑克模拟器，用于测试和分析 GTO（Game Theory Optimal）策略。本项目从原生 JavaScript 完全重构为 Vue3 + TypeScript + Pinia 架构，保持了所有原有功能。

## ✨ 功能特性

### 核心功能
- 🎮 **完整的德州扑克游戏引擎** - 支持 2-8 人游戏
- 🤖 **自动/手动双模式** - 可切换自动 AI 对战或手动操作
- 💡 **GTO 策略建议** - 实时获取最优策略建议
- 📸 **牌局快照系统** - 保存和回放关键牌局
- 🎯 **预设手牌功能** - 自定义起始手牌和公共牌
- 📊 **详细行动历史** - 记录所有玩家的行动轨迹
- 🔄 **回放系统** - 回顾历史牌局

### 配置选项
- 可调节盲注（SB/BB）
- 可配置初始筹码范围
- 多种底池类型（无限制、单一加注、3-Bet、4-Bet）
- 自定义玩家数量和起始位置
- GTO 建议阶段筛选（Preflop/Flop/Turn/River）
- 玩家级别的 GTO 筛选

## 🛠️ 技术栈

- **框架**: Vue 3.4+ (Composition API)
- **语言**: TypeScript 5.4+
- **构建工具**: Vite 5.1+
- **状态管理**: Pinia 2.1+
- **样式**: CSS3 + Scoped Styles
- **图标**: Material Icons

## 📋 前置要求

- Node.js >= 16.0.0
- npm >= 8.0.0 或 yarn >= 1.22.0 或 pnpm >= 7.0.0

## 🚀 快速开始

### 安装依赖

```bash
# 使用 npm
npm install

# 或使用 yarn
yarn

# 或使用 pnpm
pnpm install
```

### 开发模式

```bash
npm run dev
```

启动后访问 `http://localhost:3000`

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist` 目录。

### 预览生产版本

```bash
npm run preview
```

## 📁 项目结构

```
poker-simulator/
├── public/                 # 静态资源
│   └── cards/             # 扑克牌图片资源
├── src/
│   ├── api/               # API 服务层
│   │   ├── gtoService.ts      # GTO 建议 API
│   │   └── snapshotService.ts # 快照管理 API
│   ├── components/        # Vue 组件
│   │   ├── ActionBar.vue          # 游戏控制栏
│   │   ├── ConfigPanel.vue        # 配置面板
│   │   ├── InfoPanel.vue          # 信息面板
│   │   ├── PlayerActionPopup.vue  # 玩家操作弹窗
│   │   ├── PokerTable.vue         # 扑克桌面
│   │   └── ...                    # 其他组件
│   ├── core/              # 核心业务逻辑
│   │   ├── AI.ts              # AI 决策引擎
│   │   ├── GTOLogic.ts        # GTO 逻辑计算
│   │   └── PokerGame.ts       # 扑克游戏引擎
│   ├── stores/            # Pinia 状态管理
│   │   ├── gameStore.ts       # 游戏状态
│   │   └── settingStore.ts    # 配置状态
│   ├── types/             # TypeScript 类型定义
│   │   └── index.ts
│   ├── utils/             # 工具函数
│   │   └── helpers.ts
│   ├── App.vue            # 根组件
│   └── main.ts            # 入口文件
├── index.html             # HTML 入口
├── package.json           # 项目配置
├── tsconfig.json          # TypeScript 配置
├── vite.config.ts         # Vite 配置
└── README.md              # 项目文档
```

## 🎯 核心模块说明

### 游戏引擎 (PokerGame.ts)
- 完整的德州扑克规则实现
- 支持盲注、下注、加注、全下等所有动作
- 自动处理玩家轮转和阶段推进
- 状态快照和恢复功能

### AI 决策 (AI.ts)
- 基于权重的智能决策系统
- 支持不同底池类型的策略调整
- 可配置的行动偏好

### 状态管理 (Pinia Stores)
- `gameStore`: 管理游戏运行状态、玩家行动、回放数据
- `settingStore`: 管理所有配置项和预设数据

## 🔌 后端 API 对接

项目需要对接以下后端 API：

### GTO 建议 API
```
GET /poker/suggestion?myCards=...&boardCards=...&...
```

### 快照管理 API
```
GET    /poker/snapshots          # 获取快照列表（分页）
GET    /poker/snapshots/:id      # 获取单个快照
POST   /poker/snapshots          # 创建快照
PUT    /poker/snapshots/:id      # 更新快照
DELETE /poker/snapshots/:id      # 删除快照
```

API 请求会自动代理到 `http://localhost:8080`（可在 `vite.config.ts` 中修改）。

## 🎨 样式说明

- 采用 CSS 变量实现主题配置
- 响应式设计，支持移动端和桌面端
- 组件样式使用 `scoped` 避免污染
- 全局样式定义在 `App.vue` 中

## 🔧 开发指南

### 添加新组件
1. 在 `src/components/` 创建 `.vue` 文件
2. 使用 `<script setup lang="ts">` 语法
3. 导入必要的 stores 和 utils
4. 在父组件中引入使用

### 添加新状态
1. 在对应的 store 中添加 state
2. 编写 getters 用于派生状态
3. 编写 actions 用于修改状态
4. 在组件中通过 `useXxxStore()` 使用

### 调试技巧
- 使用 Vue DevTools 查看组件状态
- 使用 Pinia DevTools 追踪状态变化
- 查看浏览器控制台的游戏日志
- 使用 `gameStore.log()` 添加自定义日志

## 📝 迁移说明

本项目从原生 JavaScript 版本完全重构：

### 重构内容
✅ 原生 JS → Vue3 Composition API  
✅ 全局变量 → Pinia 状态管理  
✅ JavaScript → TypeScript  
✅ DOM 操作 → 响应式数据绑定  
✅ 单文件 HTML → 组件化架构  

### 保持不变
✅ 所有游戏功能 100% 保留  
✅ UI/UX 完全一致  
✅ API 接口兼容  
✅ 业务逻辑等价实现  

## 🐛 已知问题

- [ ] 快照详细管理功能开发中
- [ ] 牌局预设 UI 待完善
- [ ] 回放系统待优化

## 📄 License

MIT License

## 👥 贡献

欢迎提交 Issue 和 Pull Request！

---

**注意**: 本项目需要配合后端 API 服务使用。确保后端服务运行在 `http://localhost:8080` 或修改 `vite.config.ts` 中的代理配置。