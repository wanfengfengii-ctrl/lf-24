<template>
  <div class="layer-panel">
    <div class="panel-header">
      <span class="panel-title">图层</span>
      <n-space>
        <n-button size="small" @click="showAddMenu = true">
          <template #icon>
            <n-icon><add-outline /></n-icon>
          </template>
          新建
        </n-button>
        <n-dropdown
          v-model:show="showAddMenu"
          :options="addLayerOptions"
          @select="handleAddLayer"
          trigger="click"
        >
          <n-button size="small">
            <template #icon>
              <n-icon><chevron-down-outline /></n-icon>
            </template>
          </n-button>
        </n-dropdown>
      </n-space>
    </div>

    <n-scrollbar class="layer-list">
      <div
        v-for="layer in reversedLayers"
        :key="layer.id"
        class="layer-item"
        :class="{ active: layer.id === activeLayerId, hidden: !layer.visible }"
        @click="setActiveLayer(layer.id)"
      >
        <div class="layer-main">
          <div class="layer-color-dot" :style="{ backgroundColor: getLayerColor(layer.type) }"></div>
          <div class="layer-info">
            <n-input
              v-if="editingLayerId === layer.id"
              v-model:value="editingName"
              size="small"
              @blur="saveLayerName(layer.id)"
              @keyup.enter="saveLayerName(layer.id)"
              @click.stop
              ref="nameInputRef"
            />
            <span v-else class="layer-name" @dblclick="startEditName(layer)">
              {{ layer.name }}
            </span>
            <span class="layer-type">{{ getLayerTypeLabel(layer.type) }}</span>
          </div>
        </div>

        <div class="layer-actions">
          <n-button
            size="tiny"
            text
            @click.stop="toggleVisibility(layer.id)"
          >
            <template #icon>
              <n-icon>
                <eye-outline v-if="layer.visible" />
                <eye-off-outline v-else />
              </n-icon>
            </template>
          </n-button>
          <n-button
            size="tiny"
            text
            :disabled="isTopLayer(layer.id)"
            @click.stop="moveUp(layer.id)"
          >
            <template #icon>
              <n-icon><chevron-up-outline /></n-icon>
            </template>
          </n-button>
          <n-button
            size="tiny"
            text
            :disabled="isBottomLayer(layer.id)"
            @click.stop="moveDown(layer.id)"
          >
            <template #icon>
              <n-icon><chevron-down-outline /></n-icon>
            </template>
          </n-button>
          <n-button
            size="tiny"
            text
            @click.stop="confirmDelete(layer)"
          >
            <template #icon>
              <n-icon><trash-outline /></n-icon>
            </template>
          </n-button>
        </div>

        <div v-if="layer.id === activeLayerId" class="layer-settings">
          <div class="setting-item">
            <span class="setting-label">透明度</span>
            <n-slider
              :value="layer.opacity"
              :min="0"
              :max="100"
              @update:value="(value: number) => solutionStore.setLayerOpacity(layer.id, value)"
            />
            <span class="setting-value">{{ layer.opacity }}%</span>
          </div>

          <div class="settings-section">
            <div class="section-title">
              <n-icon><time-outline /></n-icon>
              <span>历史属性</span>
            </div>

            <div class="setting-item">
              <span class="setting-label">所属时期</span>
              <n-select
                :value="layer.historicalInfo.periodId"
                :options="periodOptions"
                placeholder="选择历史时期"
                size="small"
                @update:value="(value: string | null) => handlePeriodChange(layer.id, value)"
              />
            </div>

            <div class="setting-item">
              <span class="setting-label">置信度</span>
              <n-slider
                :value="layer.historicalInfo.confidence"
                :min="0"
                :max="100"
                @update:value="(value: number) => handleConfidenceChange(layer.id, value)"
              />
              <span class="setting-value">{{ layer.historicalInfo.confidence }}%</span>
            </div>

            <div class="setting-item column">
              <span class="setting-label">材料说明</span>
              <n-input
                :value="layer.historicalInfo.materialDescription"
                type="textarea"
                :rows="2"
                placeholder="描述使用的颜料、材料等"
                size="small"
                @update:value="(value: string) => handleMaterialChange(layer.id, value)"
              />
            </div>

            <div class="setting-item column">
              <span class="setting-label">推演依据</span>
              <n-input
                :value="layer.historicalInfo.deductionBasis"
                type="textarea"
                :rows="2"
                placeholder="说明色彩推演的依据"
                size="small"
                @update:value="(value: string) => handleDeductionBasisChange(layer.id, value)"
              />
            </div>
          </div>
        </div>
      </div>

      <div v-if="sortedLayers.length === 0" class="empty-layers">
        <n-empty description="暂无图层" />
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useDialog, NButton, NIcon, NInput, NSpace, NDropdown, NScrollbar, NEmpty, NSelect } from 'naive-ui'
import {
  AddOutline,
  ChevronDownOutline,
  ChevronUpOutline,
  EyeOutline,
  EyeOffOutline,
  TrashOutline,
  TimeOutline
} from '@vicons/ionicons5'
import { useSolutionStore } from '../stores/solution'
import { storeToRefs } from 'pinia'
import type { LayerType, Layer } from '../types'
import { LAYER_TYPE_LABELS, LAYER_TYPE_COLORS } from '../types'

const solutionStore = useSolutionStore()
const { sortedLayers, activeLayerId, sortedHistoricalPeriods } = storeToRefs(solutionStore)
const dialog = useDialog()

const showAddMenu = ref(false)
const editingLayerId = ref<string | null>(null)
const editingName = ref('')
const nameInputRef = ref<typeof NInput | null>(null)

const reversedLayers = computed(() => {
  return [...sortedLayers.value].reverse()
})

const addLayerOptions = computed(() => {
  return [
    { label: '底色层', value: 'background' },
    { label: '纹样层', value: 'pattern' },
    { label: '描边层', value: 'outline' },
    { label: '修补层', value: 'repair' }
  ]
})

function getLayerTypeLabel(type: LayerType): string {
  return LAYER_TYPE_LABELS[type]
}

function getLayerColor(type: LayerType): string {
  return LAYER_TYPE_COLORS[type]
}

function handleAddLayer(type: string) {
  solutionStore.addLayer(type as LayerType)
  showAddMenu.value = false
}

function setActiveLayer(id: string) {
  solutionStore.setActiveLayer(id)
}

function toggleVisibility(id: string) {
  const layer = sortedLayers.value.find(l => l.id === id)
  if (layer) {
    solutionStore.setLayerVisibility(id, !layer.visible)
  }
}

function moveUp(id: string) {
  solutionStore.moveLayerUp(id)
}

function moveDown(id: string) {
  solutionStore.moveLayerDown(id)
}

function isTopLayer(id: string): boolean {
  const maxZ = Math.max(...sortedLayers.value.map(l => l.zIndex))
  const layer = sortedLayers.value.find(l => l.id === id)
  return layer ? layer.zIndex === maxZ : true
}

function isBottomLayer(id: string): boolean {
  const minZ = Math.min(...sortedLayers.value.map(l => l.zIndex))
  const layer = sortedLayers.value.find(l => l.id === id)
  return layer ? layer.zIndex === minZ : true
}

function startEditName(layer: Layer) {
  editingLayerId.value = layer.id
  editingName.value = layer.name
  nextTick(() => {
    nameInputRef.value?.focus()
  })
}

function saveLayerName(layerId: string) {
  if (!editingName.value.trim()) {
    editingLayerId.value = null
    return
  }

  const success = solutionStore.renameLayer(layerId, editingName.value.trim())
  if (!success) {
    dialog.error({
      title: '重命名失败',
      content: '图层名称不能重复',
      positiveText: '确定'
    })
  }
  editingLayerId.value = null
}

function confirmDelete(layer: Layer) {
  const hasContent = solutionStore.hasLayerContent(layer.id)

  if (hasContent) {
    dialog.warning({
      title: '确认删除',
      content: `图层「${layer.name}」包含绘制内容，确定要删除吗？`,
      positiveText: '删除',
      negativeText: '取消',
      onPositiveClick: () => {
        solutionStore.deleteLayer(layer.id)
      }
    })
  } else {
    dialog.warning({
      title: '确认删除',
      content: `确定要删除图层「${layer.name}」吗？`,
      positiveText: '删除',
      negativeText: '取消',
      onPositiveClick: () => {
        solutionStore.deleteLayer(layer.id)
      }
    })
  }
}

const periodOptions = computed(() => {
  return sortedHistoricalPeriods.value.map(p => ({
    label: p.name,
    value: p.id
  }))
})

function handlePeriodChange(layerId: string, periodId: string | null) {
  solutionStore.setLayerHistoricalInfo(layerId, { periodId })
}

function handleConfidenceChange(layerId: string, confidence: number) {
  solutionStore.setLayerHistoricalInfo(layerId, { confidence })
}

function handleMaterialChange(layerId: string, description: string) {
  solutionStore.setLayerHistoricalInfo(layerId, { materialDescription: description })
}

function handleDeductionBasisChange(layerId: string, basis: string) {
  solutionStore.setLayerHistoricalInfo(layerId, { deductionBasis: basis })
}
</script>

<style scoped>
.layer-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border-left: 1px solid #e0e0e0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
}

.panel-title {
  font-weight: 600;
  font-size: 14px;
}

.layer-list {
  flex: 1;
  overflow: hidden;
}

.layer-item {
  padding: 10px 12px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.layer-item:hover {
  background-color: #f5f5f5;
}

.layer-item.active {
  background-color: #e8f4fd;
  border-left: 3px solid #3b82f6;
  padding-left: 9px;
}

.layer-item.hidden {
  opacity: 0.5;
}

.layer-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.layer-color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.layer-info {
  flex: 1;
  min-width: 0;
}

.layer-name {
  display: block;
  font-size: 13px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-type {
  font-size: 11px;
  color: #999;
}

.layer-actions {
  display: flex;
  gap: 2px;
  margin-top: 6px;
}

.layer-settings {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #e8e8e8;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setting-label {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
}

.setting-value {
  font-size: 12px;
  color: #666;
  min-width: 40px;
  text-align: right;
}

.setting-item.column {
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
}

.setting-item.column .setting-label {
  white-space: normal;
}

.settings-section {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed #e0e0e0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #3b82f6;
  margin-bottom: 8px;
}

.section-title n-icon {
  font-size: 14px;
}

.empty-layers {
  padding: 40px 0;
}
</style>
