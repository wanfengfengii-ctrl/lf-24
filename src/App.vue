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
              <n-space>
                <n-tag
                  :type="isDiseaseMode ? 'warning' : 'default'"
                  @click="toggleDiseaseMode"
                  style="cursor: pointer"
                >
                  <template #icon>
                    <n-icon><bug-outline /></n-icon>
                  </template>
                  {{ isDiseaseMode ? '病害标注模式' : '病害标注' }}
                </n-tag>
                <n-tag
                  :type="isHistoryMode ? 'primary' : 'default'"
                  @click="workspaceStore.toggleHistoryMode()"
                  style="cursor: pointer"
                >
                  <template #icon>
                    <n-icon><time-outline /></n-icon>
                  </template>
                  {{ isHistoryMode ? '历史推演模式' : '普通模式' }}
                </n-tag>
                <span class="current-solution-name" v-if="currentSolution">
                  当前: {{ currentSolution.name }}
                </span>
              </n-space>
            </div>
          </header>

          <main class="app-main">
            <aside class="sidebar left-sidebar" :class="{ 'history-mode': isHistoryMode, 'disease-mode': isDiseaseMode }">
              <template v-if="isDiseaseMode">
                <DiseasePanel
                  @start-drawing="handleStartDiseaseDrawing"
                  @cancel-drawing="handleCancelDiseaseDrawing"
                  @select-disease="handleSelectDisease"
                />
              </template>
              <template v-else-if="!isHistoryMode">
                <SolutionPanel @open-compare="showCompare = true" />
              </template>
              <template v-else>
                <HistoryDeductionPanel />
              </template>
            </aside>

            <section class="canvas-section">
              <TimelinePanel v-if="isHistoryMode" />
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
                  :enable-period-filter="isHistoryMode"
                  :enable-disease-mode="isDiseaseMode"
                  @objects-updated="handleObjectsUpdated"
                  @disease-created="handleDiseaseCreated"
                  @disease-selected="handleDiseaseSelected"
                />
              </div>
            </section>

            <aside class="sidebar right-sidebar">
              <template v-if="isDiseaseMode">
                <div class="disease-stats-wrapper">
                  <DiseaseStatsPanel />
                </div>
              </template>
              <template v-else>
                <LayerPanel />
                <div class="stats-container">
                  <ColorStatsPanel :enable-period-filter="isHistoryMode" />
                </div>
              </template>
            </aside>
          </main>

          <CompareView v-model:show="showCompare" />
        </div>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NSpace,
  NTag,
  NIcon
} from 'naive-ui'
import { TimeOutline, BugOutline } from '@vicons/ionicons5'
import { useSolutionStore } from './stores/solution'
import { useWorkspaceStore } from './stores/workspace'
import { storeToRefs } from 'pinia'
import CanvasEditor from './components/CanvasEditor.vue'
import LayerPanel from './components/LayerPanel.vue'
import Toolbar from './components/Toolbar.vue'
import SolutionPanel from './components/SolutionPanel.vue'
import ColorStatsPanel from './components/ColorStatsPanel.vue'
import CompareView from './components/CompareView.vue'
import TimelinePanel from './components/TimelinePanel.vue'
import HistoryDeductionPanel from './components/HistoryDeductionPanel.vue'
import DiseasePanel from './components/DiseasePanel.vue'
import DiseaseStatsPanel from './components/DiseaseStatsPanel.vue'
import { useDiseaseStore } from './stores/disease'

const solutionStore = useSolutionStore()
const workspaceStore = useWorkspaceStore()
const diseaseStore = useDiseaseStore()
const { currentSolution } = storeToRefs(solutionStore)

const isDiseaseMode = computed(() => workspaceStore.isDiseaseMode)
const isHistoryMode = computed(() => workspaceStore.isHistoryMode)
const currentTool = computed(() => workspaceStore.currentTool)
const currentColor = computed(() => workspaceStore.currentColor)
const brushWidth = computed(() => workspaceStore.brushWidth)

const canvasEditorRef = ref<InstanceType<typeof CanvasEditor> | null>(null)
const showCompare = ref(false)

function handleSetTool(tool: string) {
  workspaceStore.setTool(tool as any)
  canvasEditorRef.value?.setTool(tool)
}

function handleSetColor(color: string) {
  workspaceStore.setColor(color)
  canvasEditorRef.value?.setColor(color)
}

function handleSetBrushWidth(width: number) {
  workspaceStore.setBrushWidth(width)
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
}

function toggleDiseaseMode() {
  const wasDiseaseMode = workspaceStore.isDiseaseMode
  workspaceStore.toggleDiseaseMode()
  if (!wasDiseaseMode) {
    diseaseStore.setDiseaseVisible(true)
  } else {
    diseaseStore.cancelDrawing()
    diseaseStore.selectDisease(null)
  }
}

function handleStartDiseaseDrawing(_shapeType: 'rect' | 'polygon' | 'freehand') {
}

function handleCancelDiseaseDrawing() {
}

function handleSelectDisease(_diseaseId: string | null) {
}

function handleDiseaseCreated(_diseaseId: string) {
}

function handleDiseaseSelected(_diseaseId: string | null) {
}

onMounted(() => {
  if (solutionStore.solutions.length === 0) {
    solutionStore.createNewSolution('默认方案')
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

.sidebar.history-mode {
  width: 340px;
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

.sidebar.disease-mode {
  width: 320px;
}

.disease-stats-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>
