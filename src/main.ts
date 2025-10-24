import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { useGameStore } from "./stores/gameStore";

// 创建 Vue 应用实例
const app = createApp(App);

// 创建 Pinia 实例
const pinia = createPinia();

// 使用 Pinia
app.use(pinia);

// 初始化GTO建议过滤器（在应用启动时默认勾选所有玩家）
const gameStore = useGameStore();
gameStore.initGTOFilter();

// 挂载应用
app.mount("#app");
