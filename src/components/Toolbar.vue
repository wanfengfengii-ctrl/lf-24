<template>
  <div class="toolbar">
    <div class="toolbar-section">
      <span class="section-label">工具</span>
      <div class="tool-buttons">
        <n-button
          size="small"
          :type="currentTool === 'select' ? 'primary' : 'default'"
          @click="emit('setTool', 'select')"
        >
          <template #icon>
            <n-icon><move-outline /></n-icon>
          </template>
          选择
        </n-button>
        <n-button
          size="small"
          :type="currentTool === 'brush' ? 'primary' : 'default'"
          @click="emit('setTool', 'brush')"
        >
          <template #icon>
            <n-icon><brush-outline /></n-icon>
          </template>
          画笔
        </n-button>
        <n-button
          size="small"
          :type="currentTool === 'rect' ? 'primary' : 'default'"
          @click="emit('setTool', 'rect')"
        >
          <template #icon>
            <n-icon><square-outline /></n-icon>
          </template>
          矩形
        </n-button>
        <n-button
          size="small"
          :type="currentTool === 'circle' ? 'primary' : 'default'"
          @click="emit('setTool', 'circle')"
        >
          <template #icon>
            <n-icon><ellipse-outline /></n-icon>
          </template>
          圆形
        </n-button>
        <n-button
          size="small"
          :type="currentTool === 'eraser' ? 'primary' : 'default'"
          @click="emit('setTool', 'eraser')"
        >
          <template #icon>
            <n-icon><trash-outline /></n-icon>
          </template>
          橡皮擦
        </n-button>
      </div>
    </div>

    <div class="toolbar-section">
      <span class="section-label">颜色</span>
      <div class="color-section">
        <div
          class="color-picker-wrapper"
          @click="showColorPicker = !showColorPicker"
        >
          <div class="color-preview" :style="{ backgroundColor: currentColor }"></div>
          <span class="color-value">{{ currentColor }}</span>
        </div>
        <div v-if="showColorPicker" class="color-picker-popup">
          <div class="color-preset">
            <span class="preset-label">预设</span>
            <div class="preset-colors">
              <div
                v-for="color in presetColors"
                :key="color"
                class="preset-color"
                :style="{ backgroundColor: color }"
                @click="selectColor(color)"
              ></div>
            </div>
          </div>
          <n-color-picker
            :value="currentColor"
            @update:value="handleColorChange"
            show-hsv
            show-rgb
            show-alpha
          />
        </div>
      </div>
    </div>

    <div class="toolbar-section">
      <span class="section-label">笔刷</span>
      <div class="brush-section">
        <n-slider
          :value="brushWidth"
          :min="1"
          :max="50"
          style="width: 120px"
          @update:value="emit('setBrushWidth', $event)"
        />
        <span class="brush-size">{{ brushWidth }}px</span>
      </div>
    </div>

    <div class="toolbar-section">
      <span class="section-label">操作</span>
      <div class="action-buttons">
        <n-button size="small" @click="emit('deleteSelected')">
          <template #icon>
            <n-icon><remove-outline /></n-icon>
          </template>
          删除选中
        </n-button>
        <n-button size="small" @click="emit('clearLayer')">
          <template #icon>
            <n-icon><refresh-outline /></n-icon>
          </template>
          清空图层
        </n-button>
        <n-button size="small" @click="emit('importLineArt')">
          <template #icon>
            <n-icon><image-outline /></n-icon>
          </template>
          导入线稿
        </n-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NIcon, NSlider, NColorPicker } from 'naive-ui'
import {
  MoveOutline,
  BrushOutline,
  SquareOutline,
  EllipseOutline,
  TrashOutline,
  RemoveOutline,
  RefreshOutline,
  ImageOutline
} from '@vicons/ionicons5'

defineProps<{
  currentTool: string
  currentColor: string
  brushWidth: number
}>()

const emit = defineEmits<{
  (e: 'setTool', tool: string): void
  (e: 'setColor', color: string): void
  (e: 'setBrushWidth', width: number): void
  (e: 'deleteSelected'): void
  (e: 'clearLayer'): void
  (e: 'importLineArt'): void
}>()

const showColorPicker = ref(false)

const presetColors = [
  '#2c3e50', '#34495e', '#7f8c8d', '#95a5a6',
  '#e74c3c', '#e67e22', '#f1c40f', '#f39c12',
  '#2ecc71', '#27ae60', '#1abc9c', '#16a085',
  '#3498db', '#2980b9', '#9b59b6', '#8e44ad',
  '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
  '#00bcd4', '#009688', '#4caf50', '#8bc34a',
  '#cddc39', '#ffeb3b', '#ffc107', '#ff9800',
  '#ff5722', '#795548', '#9e9e9e', '#607d8b'
]

function handleColorChange(color: string) {
  emit('setColor', color)
}

function selectColor(color: string) {
  emit('setColor', color)
  showColorPicker.value = false
}
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 10px 16px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  flex-wrap: wrap;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-label {
  font-size: 12px;
  color: #888;
  font-weight: 500;
}

.tool-buttons,
.action-buttons {
  display: flex;
  gap: 6px;
}

.color-section {
  position: relative;
}

.color-picker-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  background: #fff;
}

.color-picker-wrapper:hover {
  border-color: #3b82f6;
}

.color-preview {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.color-value {
  font-size: 12px;
  color: #555;
  font-family: monospace;
}

.color-picker-popup {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 8px;
  z-index: 1000;
  background: #fff;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.color-preset {
  margin-bottom: 12px;
}

.preset-label {
  display: block;
  font-size: 12px;
  color: #888;
  margin-bottom: 8px;
}

.preset-colors {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
}

.preset-color {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  cursor: pointer;
  border: 1px solid #eee;
}

.preset-color:hover {
  transform: scale(1.1);
}

.brush-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brush-size {
  font-size: 12px;
  color: #666;
  min-width: 40px;
}
</style>
