# 环境配置说明

## 概述
本项目支持开发环境和生产环境的API配置自动切换。

## 环境配置文件

### 开发环境 (.env)
```
VITE_API_BASE_URL=http://localhost:8080
VITE_APP_TITLE=扑克模拟器 - 开发环境
```

### 生产环境 (.env.production)
```
VITE_API_BASE_URL=http://bread.yjtsh.site:9080
VITE_APP_TITLE=扑克模拟器
```

## 使用方法

### 开发环境
```bash
npm run dev
```
- API基础URL: `http://localhost:8080`
- 页面标题: "扑克模拟器 - 开发环境"

### 生产环境构建
```bash
npm run build
```
- API基础URL: `http://bread.yjtsh.site:9080`
- 页面标题: "扑克模拟器"

## 配置说明

### API配置文件
位置: `src/config/api.ts`

提供以下功能：
- `getApiUrl(endpoint)` - 获取完整API URL
- `getApiBaseUrl()` - 获取API基础URL
- `isProduction` - 判断是否为生产环境
- `isDevelopment` - 判断是否为开发环境

### 自动切换机制
- Vite会根据运行模式自动加载对应的环境配置文件
- API服务会自动使用对应的URL前缀
- 无需手动修改代码即可切换环境

## 注意事项
- 环境变量必须以 `VITE_` 开头才能在客户端代码中使用
- 更改环境配置后需要重启开发服务器或重新构建才能生效
