<template>
  <div class="app-container">
    <!-- Slide-out Drawer for Configurations -->
    <aside id="config-drawer" :class="['config-drawer', { 'is-open': isDrawerOpen }]">
      <button class="drawer-close-btn" @click="closeDrawer">&times;</button>
      <div class="config-drawer-content">
        <ConfigPanel />
      </div>
    </aside>
    <div class="drawer-overlay" @click="closeDrawer"></div>

    <!-- Main Content -->
    <main class="main-content">
      <div class="table-area">
        <PokerTable />
        <ActionBar />
      </div>

      <div class="info-panel-area">
        <InfoPanel />
      </div>
    </main>

    <!-- Modals -->
    <SnapshotModal v-if="showSnapshotModal" />
    <ViewSnapshotModal v-if="showViewSnapshotModal" />
    <EndOfHandModal v-if="showEndOfHandModal" />
    <DeleteConfirmPopover v-if="showDeleteConfirm" />

    <!-- Toast Notification -->
    <div v-if="toastMessage" class="toast-notification show" :class="{ error: toastIsError }">
      {{ toastMessage }}
    </div>

    <!-- Loader Overlay -->
    <div v-if="isLoading" class="loader-overlay">
      <div class="loader-spinner"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useGameStore } from '@/stores/gameStore'

import ConfigPanel from '@/components/ConfigPanel.vue'
import PokerTable from '@/components/PokerTable.vue'
import ActionBar from '@/components/ActionBar.vue'
import InfoPanel from '@/components/InfoPanel.vue'
import SnapshotModal from '@/components/SnapshotModal.vue'
import ViewSnapshotModal from '@/components/ViewSnapshotModal.vue'
import EndOfHandModal from '@/components/EndOfHandModal.vue'
import DeleteConfirmPopover from '@/components/DeleteConfirmPopover.vue'

// Stores
const gameStore = useGameStore()

// UI State
const isDrawerOpen = ref(false)
const showSnapshotModal = ref(false)
const showViewSnapshotModal = ref(false)
const showEndOfHandModal = ref(false)
const showDeleteConfirm = ref(false)
const toastMessage = ref('')
const toastIsError = ref(false)
const isLoading = ref(false)

// Methods
const closeDrawer = () => {
  isDrawerOpen.value = false
}

// Initialize on mount
onMounted(() => {
  gameStore.initGame()
  gameStore.log('德州扑克 AI 测试模拟器已加载')
})
</script>

<style scoped>
/* --- Base & Reset --- */
:root {
  --drawer-width: 420px;
  --header-height: 50px;
  --border-color: #ddd;
  --bg-light: #f5f5f5;
  --bg-white: #ffffff;
  --text-dark: #333;
  --text-light: #888;
  --accent-color: #28a745;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* --- Main Layout --- */
.app-container {
  display: flex;
  height: 100vh;
  position: relative;
  background-color: var(--bg-light);
}

/* --- Config Drawer --- */
.config-drawer {
  position: fixed;
  top: 0;
  left: 0;
  height: 100%;
  width: var(--drawer-width);
  max-width: 90vw;
  background: var(--bg-white);
  z-index: 2000;
  transform: translateX(-100%);
  transition: transform 0.3s ease-in-out;
  overflow-y: auto;
  border-right: 1px solid var(--border-color);
}

.config-drawer.is-open {
  transform: translateX(0);
  box-shadow: 3px 0 15px rgba(0,0,0,0.1);
}

.config-drawer-content {
  padding: 20px;
}

.drawer-close-btn {
  position: absolute;
  top: 10px;
  right: 15px;
  background: none;
  border: none;
  font-size: 28px;
  font-weight: bold;
  color: #888;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  z-index: 10;
}

.drawer-close-btn:hover {
  color: #333;
}

/* --- Drawer Overlay --- */
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.4);
  z-index: 1999;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease-in-out, visibility 0.3s ease-in-out;
}

.config-drawer.is-open ~ .drawer-overlay {
  opacity: 1;
  visibility: visible;
}

/* --- Main Content Area --- */
.main-content {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  transition: margin-left 0.3s ease-in-out;
}

/* --- Table Area --- */
.table-area {
  width: 100%;
  height: 70vh;
  min-height: 550px;
  position: relative;
  display: flex;
  flex-direction: column;
  background: #e8f5e9;
}

/* --- Info Panel Area --- */
.info-panel-area {
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex-grow: 1;
  overflow-y: auto;
}

/* --- Desktop Layout --- */
@media (min-width: 1200px) {
  .config-drawer {
    position: relative;
    transform: translateX(0);
    box-shadow: none;
    min-width: var(--drawer-width);
    flex-shrink: 0;
  }

  .drawer-overlay,
  .drawer-close-btn {
    display: none;
  }

  .main-content {
    flex-direction: row;
  }

  .table-area {
    width: 50%;
    height: 100%;
    border-right: 1px solid var(--border-color);
  }

  .info-panel-area {
    width: 50%;
    height: 100%;
    overflow-y: auto;
    padding: 20px;
  }
}

/* --- Toast Notification --- */
.toast-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #28a745;
  color: white;
  padding: 15px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  z-index: 10000;
  opacity: 0;
  transform: translateY(-20px);
  transition: opacity 0.3s, transform 0.3s;
}

.toast-notification.show {
  opacity: 1;
  transform: translateY(0);
}

.toast-notification.error {
  background: #dc3545;
}

/* --- Loader Overlay --- */
.loader-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.loader-spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>

<style>
/* Global styles that need to be unscoped */
html, body {
  height: 100%;
  overflow: hidden;
  background-color: #f5f5f5;
  margin: 0;
  padding: 0;
}

#app {
  height: 100%;
  width: 100%;
}

/* Section heading style */
.section h3 {
  margin-bottom: 12px;
  font-size: 16px;
  color: #333;
  border-bottom: 1px solid #ddd;
  padding-bottom: 8px;
}

/* Form row style */
.form-row {
  display: flex;
  align-items: center;
  margin: 8px 0;
  flex-wrap: wrap;
}

.form-row label {
  width: auto;
  margin-right: 10px;
  font-size: 14px;
  flex-shrink: 0;
}

.form-row input,
.form-row select {
  padding: 6px 10px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

/* Hidden utility class */
.hidden-by-js {
  display: none !important;
}

/* Button common styles */
.game-control-btn {
  padding: 8px 16px;
  font-size: 16px;
  border-radius: 8px;
  border: none;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.2s ease-out, box-shadow 0.2s ease-out;
  display: flex;
  align-items: center;
  gap: 8px;
}

.game-control-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

.game-control-btn:disabled {
  background-color: #cccccc;
  color: #888888;
  cursor: not-allowed;
}

.game-control-btn.secondary-btn {
  background-color: #6c757d;
}

.game-control-btn.secondary-btn:hover {
  background-color: #5a6268;
}
</style>
