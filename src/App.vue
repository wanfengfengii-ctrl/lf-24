<template>
  <n-config-provider>
    <n-message-provider>
      <n-dialog-provider>
        <div class="app">
          <header class="app-header">
            <div class="header-title">
              <h1>古建筑彩画复原系统</h1>
              <span class="subtitle">Ancient Architectural Painting Restoration</span>
            </div>
            <div class="header-info">
              <span class="current-solution-name" v-if="currentSolution">
                当前: {{ currentSolution.name }}
              </span>
            </div>
          </header>

          <main class="app-main">
            <aside class="sidebar left-sidebar">
              <SolutionPanel @open-compare="showCompare = true" />
            </aside>

            <section class="canvas-section">
              <Toolbar
                :current-tool="currentTool"
                :current-color="currentColor"
                :brush-width="brushWidth"
                @set-tool="handleSetTool"
                @set-color="handleSetColor"
                @set-brush-width="handleSetBrushWidth"
                @delete-selected="handleDeleteSelected"
                @clear-layer="handleClearLayer"
                @import-line-art="handleImportLineArt"
              />
              <div class="canvas-wrapper">
                <CanvasEditor
                  ref="canvasEditorRef"
                  canvas-id="main-canvas"
                  @objects-updated="handleObjectsUpdated"
                />
              </div>
            </section>

            <aside class="sidebar right-sidebar">
              <LayerPanel />
              <div class="stats-container">
                <ColorStatsPanel />
              </div>
            </aside>
          </main>

          <CompareView v-model:show="showCompare" />
        </div>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider
} from 'naive-ui'
import { useSolutionStore } from './stores/solution'
import { storeToRefs } from 'pinia'
import CanvasEditor from './components/CanvasEditor.vue'
import LayerPanel from './components/LayerPanel.vue'
import Toolbar from './components/Toolbar.vue'
import SolutionPanel from './components/SolutionPanel.vue'
import ColorStatsPanel from './components/ColorStatsPanel.vue'
import CompareView from './components/CompareView.vue'

const solutionStore = useSolutionStore()
const { currentSolution } = storeToRefs(solutionStore)

const canvasEditorRef = ref<InstanceType<typeof CanvasEditor> | null>(null)
const showCompare = ref(false)
const currentTool = ref<string>('select')
const currentColor = ref('#3b82f6')
const brushWidth = ref(10)

function handleSetTool(tool: string) {
  currentTool.value = tool
  if (canvasEditorRef.value) {
    (canvasEditorRef.value as any).setTool(tool)
  }
}

function handleSetColor(color: string) {
  currentColor.value = color
  canvasEditorRef.value?.setColor(color)
}

function handleSetBrushWidth(width: number) {
  brushWidth.value = width
  canvasEditorRef.value?.setBrushWidth(width)
}

function handleDeleteSelected() {
  canvasEditorRef.value?.deleteSelected()
}

function handleClearLayer() {
  canvasEditorRef.value?.clearActiveLayer()
}

function handleImportLineArt() {
  canvasEditorRef.value?.triggerImport()
}

function handleObjectsUpdated() {
  // 对象更新时的回调
}

onMounted(() => {
  if (solutionStore.solutions.length === 0) {
    solutionStore.createNewSolution('默认方案')
    solutionStore.addLayer('background', '底色层 1')
    solutionStore.addLayer('pattern', '纹样层 1')
    solutionStore.addLayer('outline', '描边层 1')
  }
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
</style>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: #f0f2f5;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 56px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: white;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.header-title h1 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.subtitle {
  font-size: 11px;
  opacity: 0.7;
  margin-left: 12px;
}

.header-info {
  font-size: 13px;
}

.current-solution-name {
  background: rgba(255, 255, 255, 0.15);
  padding: 4px 12px;
  border-radius: 4px;
}

.app-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 280px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  background: #fff;
}

.left-sidebar {
  border-right: 1px solid #e0e0e0;
}

.right-sidebar {
  border-left: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}

.canvas-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.canvas-wrapper {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.stats-container {
  height: 300px;
  flex-shrink: 0;
  border-top: 1px solid #e0e0e0;
}
</style>
