<template>
  <div class="disease-panel">
    <template v-if="!showDetail">
      <div class="panel-header">
        <span class="panel-title">病害标注</span>
        <n-space :size="8">
          <n-tag size="small" type="info">
            显示 {{ visibleDiseases.length }} / {{ diseases.length }}
          </n-tag>
          <n-switch
            v-model:value="diseaseVisible"
            size="small"
            @update:value="handleToggleAllVisible"
          />
        </n-space>
      </div>

      <div class="panel-toolbar">
        <n-space :size="8" wrap>
          <n-button
            size="small"
            type="primary"
            :disabled="isDrawingDisease"
            @click="handleStartRectDrawing"
          >
            <template #icon>
              <n-icon><square-outline /></n-icon>
            </template>
            矩形标注
          </n-button>
          <n-button
            size="small"
            type="primary"
            :disabled="isDrawingDisease"
            @click="handleStartPolygonDrawing"
          >
            <template #icon>
              <n-icon><shapes-outline /></n-icon>
            </template>
            多边形标注
          </n-button>
          <n-button
            v-if="isDrawingDisease"
            size="small"
            type="warning"
            @click="handleCancelDrawing"
          >
            取消绘制
          </n-button>
        </n-space>
      </div>

      <div class="filter-section">
        <n-space vertical :size="8">
          <div class="filter-row">
            <span class="filter-label">类型筛选:</span>
            <n-select
              v-model:value="filterType"
              size="small"
              :options="typeFilterOptions"
              style="flex: 1"
              @update:value="handleFilterTypeChange"
            />
          </div>
          <div class="filter-row">
            <span class="filter-label">程度筛选:</span>
            <n-select
              v-model:value="filterSeverity"
              size="small"
              :options="severityFilterOptions"
              style="flex: 1"
              @update:value="handleFilterSeverityChange"
            />
          </div>
          <div class="filter-row">
            <span class="filter-label">阶段筛选:</span>
            <n-select
              v-model:value="filterStage"
              size="small"
              :options="stageFilterOptions"
              style="flex: 1"
              @update:value="handleFilterStageChange"
            />
          </div>
          <div class="filter-row">
            <span class="filter-label">处置状态:</span>
            <n-select
              v-model:value="filterTreatmentStatus"
              size="small"
              :options="treatmentStatusFilterOptions"
              style="flex: 1"
              @update:value="handleFilterTreatmentStatusChange"
            />
          </div>
        </n-space>
      </div>

      <div class="stats-summary">
        <n-space :size="16">
          <div class="stat-item">
            <span class="stat-value">{{ filteredDiseases.length }}</span>
            <span class="stat-label">处病害</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ totalDiseaseArea }}</span>
            <span class="stat-label">像素总面积</span>
          </div>
        </n-space>
      </div>

      <div class="stage-stats-bar">
        <div
          v-for="stat in diseaseStageStats"
          :key="stat.stage"
          class="stage-stat-item"
          :style="{ width: stat.percentage + '%', backgroundColor: stat.color }"
          :title="`${stat.stageName}: ${stat.count}处`"
        >
          <span v-if="stat.percentage > 10">{{ stat.stageName }}</span>
        </div>
      </div>

      <div class="disease-list">
        <div class="list-header">
          <span>病害列表</span>
          <n-space>
            <n-dropdown
              :options="exportOptions"
              @select="handleExport"
              trigger="click"
            >
              <n-button size="small" quaternary>
                <template #icon>
                  <n-icon><download-outline /></n-icon>
                </template>
                导出
              </n-button>
            </n-dropdown>
            <n-button
              size="small"
              quaternary
              @click="handleClearAll"
              :disabled="diseases.length === 0"
            >
              <template #icon>
                <n-icon><trash-outline /></n-icon>
              </template>
              清空
            </n-button>
          </n-space>
        </div>

        <n-scrollbar class="list-scroll">
          <div v-if="filteredDiseases.length === 0" class="empty-state">
            <n-empty description="暂无病害标注" :size="'small'" />
          </div>
          <div v-else class="disease-items">
            <div
              v-for="disease in filteredDiseases"
              :key="disease.id"
              class="disease-item"
              :class="{ active: selectedDiseaseId === disease.id, hidden: !disease.visible }"
              @click="handleSelectDisease(disease.id)"
            >
              <div class="item-header">
                <div class="item-title">
                  <span
                    class="type-dot"
                    :style="{ backgroundColor: disease.color }"
                  ></span>
                  <span class="item-name">{{ disease.name }}</span>
                </div>
                <div class="item-header-actions">
                  <n-button
                    size="tiny"
                    text
                    @click.stop="handleToggleDiseaseVisible(disease.id)"
                  >
                    <template #icon>
                      <n-icon>{{ disease.visible ? eyeOutline : eyeOffOutline }}</n-icon>
                    </template>
                  </n-button>
                  <span
                    class="severity-badge"
                    :style="{ backgroundColor: getSeverityColor(disease.severity) }"
                  >
                    {{ disease.severity }}级
                  </span>
                </div>
              </div>
              <div class="type-tags">
                <n-tag
                  v-for="type in disease.types"
                  :key="type"
                  size="small"
                  :style="{
                    backgroundColor: getTypeColor(type) + '15',
                    borderColor: getTypeColor(type),
                    color: getTypeColor(type)
                  }"
                  :bordered="true"
                >
                  <span v-if="type === disease.primaryType" class="primary-badge">主</span>
                  {{ DISEASE_TYPE_LABELS[type] }}
                </n-tag>
              </div>
              <div class="item-info">
                <span class="info-item">面积: {{ disease.area }} px</span>
                <span class="info-item">
                  {{ formatDate(disease.discoveredAt) }}
                </span>
              </div>
              <div class="item-stage-info">
                <n-tag size="tiny" :style="{ backgroundColor: getStageColor(disease.currentStage), color: '#fff' }" :bordered="false">
                  {{ getStageLabel(disease.currentStage) }}
                </n-tag>
                <n-tag size="tiny" :style="{ backgroundColor: getTreatmentStatusColor(disease.treatmentStatus), color: '#fff' }" :bordered="false">
                  {{ getTreatmentStatusLabel(disease.treatmentStatus) }}
                </n-tag>
                <span class="record-count">{{ disease.stageRecords.length }}次记录</span>
              </div>
              <div class="item-actions">
                <n-button
                  size="tiny"
                  text
                  @click.stop="handleViewDetail(disease)"
                >
                  详情
                </n-button>
                <n-button
                  size="tiny"
                  text
                  @click.stop="handleEditDisease(disease)"
                >
                  编辑
                </n-button>
                <n-button
                  size="tiny"
                  text
                  type="error"
                  @click.stop="handleDeleteDisease(disease.id)"
                >
                  删除
                </n-button>
              </div>
            </div>
          </div>
        </n-scrollbar>
      </div>
    </template>

    <DiseaseDetailPanel
      v-else
      @back="handleBackToList"
      @edit="handleEditFromDetail"
    />

    <DiseaseEditDialog
      v-model:show="showEditDialog"
      :disease="editingDisease"
      @save="handleSaveDisease"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  NSpace,
  NButton,
  NIcon,
  NSwitch,
  NSelect,
  NScrollbar,
  NTag,
  NEmpty,
  NDropdown,
  useDialog,
  useMessage
} from 'naive-ui'
import {
  SquareOutline,
  ShapesOutline,
  TrashOutline,
  DownloadOutline,
  EyeOutline,
  EyeOffOutline
} from '@vicons/ionicons5'
import { storeToRefs } from 'pinia'
import { useDiseaseStore } from '../stores/disease'
import type { DiseaseType, DiseaseSeverity, DiseaseAnnotation, DiseaseStage, TreatmentStatus } from '../types'
import {
  DISEASE_TYPE_LABELS,
  DISEASE_TYPE_COLORS,
  DISEASE_SEVERITY_COLORS,
  DISEASE_STAGE_LABELS,
  DISEASE_STAGE_COLORS,
  TREATMENT_STATUS_LABELS,
  TREATMENT_STATUS_COLORS
} from '../types'
import DiseaseEditDialog from './DiseaseEditDialog.vue'
import DiseaseDetailPanel from './DiseaseDetailPanel.vue'

const diseaseStore = useDiseaseStore()
const {
  diseases,
  visibleDiseases,
  filteredDiseases,
  selectedDiseaseId,
  filterType,
  filterSeverity,
  filterStage,
  filterTreatmentStatus,
  isDrawingDisease,
  diseaseVisible,
  totalDiseaseArea,
  diseaseStageStats
} = storeToRefs(diseaseStore)

const dialog = useDialog()
const message = useMessage()

const eyeOutline = EyeOutline
const eyeOffOutline = EyeOffOutline

const showEditDialog = ref(false)
const editingDisease = ref<DiseaseAnnotation | null>(null)
const showDetail = ref(false)

const emit = defineEmits<{
  (e: 'start-drawing', shapeType: 'rect' | 'polygon' | 'freehand'): void
  (e: 'cancel-drawing'): void
  (e: 'select-disease', diseaseId: string | null): void
}>()

const typeFilterOptions = [
  { label: '全部类型', value: 'all' },
  { label: '褪色', value: 'fading' },
  { label: '剥落', value: 'peeling' },
  { label: '裂缝', value: 'crack' },
  { label: '污损', value: 'stain' },
  { label: '其他', value: 'other' }
]

const severityFilterOptions = [
  { label: '全部程度', value: 'all' },
  { label: '1级 - 极轻微', value: 1 },
  { label: '2级 - 轻微', value: 2 },
  { label: '3级 - 中等', value: 3 },
  { label: '4级 - 严重', value: 4 },
  { label: '5级 - 极严重', value: 5 }
]

const stageFilterOptions = [
  { label: '全部阶段', value: 'all' },
  { label: '初检', value: 'initial' },
  { label: '复查', value: 'recheck' },
  { label: '处置', value: 'treatment' },
  { label: '复验', value: 'reinspection' }
]

const treatmentStatusFilterOptions = [
  { label: '全部状态', value: 'all' },
  { label: '待处置', value: 'pending' },
  { label: '处置中', value: 'processing' },
  { label: '已完成', value: 'completed' },
  { label: '已闭环', value: 'closed' }
]

const exportOptions = [
  { label: '导出 JSON 报告', key: 'json' },
  { label: '导出文本清单', key: 'text' },
  { label: '导出病害处置台账', key: 'ledger' },
  { label: '导出复查报告', key: 'recheck' }
]

function getSeverityColor(severity: DiseaseSeverity): string {
  return DISEASE_SEVERITY_COLORS[severity]
}

function getTypeColor(type: DiseaseType): string {
  return DISEASE_TYPE_COLORS[type]
}

function getStageLabel(stage: DiseaseStage): string {
  return DISEASE_STAGE_LABELS[stage]
}

function getStageColor(stage: DiseaseStage): string {
  return DISEASE_STAGE_COLORS[stage]
}

function getTreatmentStatusLabel(status: TreatmentStatus): string {
  return TREATMENT_STATUS_LABELS[status]
}

function getTreatmentStatusColor(status: TreatmentStatus): string {
  return TREATMENT_STATUS_COLORS[status]
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

function handleToggleAllVisible(value: boolean) {
  diseaseStore.setDiseaseVisible(value)
}

function handleToggleDiseaseVisible(diseaseId: string) {
  diseaseStore.toggleDiseaseVisible(diseaseId)
}

function handleStartRectDrawing() {
  diseaseStore.startDrawing('rect')
  emit('start-drawing', 'rect')
}

function handleStartPolygonDrawing() {
  diseaseStore.startDrawing('polygon')
  emit('start-drawing', 'polygon')
}

function handleCancelDrawing() {
  diseaseStore.cancelDrawing()
  emit('cancel-drawing')
}

function handleFilterTypeChange(value: DiseaseType | 'all') {
  diseaseStore.setFilterType(value)
}

function handleFilterSeverityChange(value: DiseaseSeverity | 'all') {
  diseaseStore.setFilterSeverity(value)
}

function handleFilterStageChange(value: DiseaseStage | 'all') {
  diseaseStore.setFilterStage(value)
}

function handleFilterTreatmentStatusChange(value: TreatmentStatus | 'all') {
  diseaseStore.setFilterTreatmentStatus(value)
}

function handleSelectDisease(diseaseId: string) {
  diseaseStore.selectDisease(diseaseId)
  emit('select-disease', diseaseId)
}

function handleViewDetail(disease: DiseaseAnnotation) {
  diseaseStore.selectDisease(disease.id)
  showDetail.value = true
}

function handleBackToList() {
  showDetail.value = false
}

function handleEditFromDetail() {
  if (diseaseStore.selectedDisease) {
    editingDisease.value = diseaseStore.selectedDisease
    showEditDialog.value = true
  }
}

function handleEditDisease(disease: DiseaseAnnotation) {
  editingDisease.value = disease
  showEditDialog.value = true
}

function handleDeleteDisease(diseaseId: string) {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这个病害标注吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      diseaseStore.deleteDisease(diseaseId)
      message.success('删除成功')
    }
  })
}

function handleSaveDisease(data: Partial<DiseaseAnnotation>) {
  if (editingDisease.value) {
    diseaseStore.updateDisease(editingDisease.value.id, data)
    message.success('保存成功')
  }
}

function handleClearAll() {
  dialog.warning({
    title: '确认清空',
    content: '确定要清空所有病害标注吗？此操作不可撤销。',
    positiveText: '清空',
    negativeText: '取消',
    onPositiveClick: () => {
      diseaseStore.clearAllDiseases()
      message.success('已清空所有病害')
    }
  })
}

function handleExport(key: string) {
  if (key === 'json') {
    const json = diseaseStore.exportDiseaseReport()
    if (json) {
      downloadFile(json, '病害报告.json', 'application/json')
      message.success('导出成功')
    }
  } else if (key === 'text') {
    const text = diseaseStore.exportDiseaseListAsText()
    if (text) {
      downloadFile(text, '病害清单.txt', 'text/plain;charset=utf-8')
      message.success('导出成功')
    }
  } else if (key === 'ledger') {
    const text = diseaseStore.exportDiseaseLedgerAsText()
    if (text) {
      downloadFile(text, '病害处置台账.txt', 'text/plain;charset=utf-8')
      message.success('导出成功')
    }
  } else if (key === 'recheck') {
    const json = diseaseStore.exportRecheckReport()
    if (json) {
      downloadFile(json, '病害复查报告.json', 'application/json')
      message.success('导出成功')
    }
  }
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.disease-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.panel-toolbar {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.filter-section {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
  width: 60px;
}

.stats-summary {
  padding: 12px 16px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.stat-item {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #1677ff;
}

.stat-label {
  font-size: 12px;
  color: #999;
}

.stage-stats-bar {
  display: flex;
  height: 24px;
  background: #f0f0f0;
  margin: 0 16px 8px;
  border-radius: 4px;
  overflow: hidden;
}

.stage-stat-item {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  transition: width 0.3s;
  min-width: 0;
}

.stage-stat-item span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 4px;
}

.disease-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  color: #333;
  background: #f9f9f9;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.list-scroll {
  flex: 1;
  min-height: 0;
}

.disease-items {
  padding: 8px;
}

.disease-item {
  padding: 10px 12px;
  margin-bottom: 8px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fff;
}

.disease-item:hover {
  border-color: #1677ff;
  background: #f0f7ff;
}

.disease-item.active {
  border-color: #1677ff;
  background: #e6f4ff;
}

.disease-item.hidden {
  opacity: 0.5;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.item-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #333;
  flex: 1;
  min-width: 0;
}

.type-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.item-name {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.severity-badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  border-radius: 4px;
  line-height: 1.4;
}

.type-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.primary-badge {
  display: inline-block;
  background: currentColor;
  color: #fff;
  font-size: 10px;
  padding: 0 4px;
  border-radius: 2px;
  margin-right: 2px;
  line-height: 14px;
}

.item-info {
  font-size: 11px;
  color: #999;
  margin-bottom: 8px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.info-item {
  flex-shrink: 0;
}

.item-stage-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.record-count {
  font-size: 11px;
  color: #999;
}

.item-actions {
  display: flex;
  gap: 8px;
}

.empty-state {
  padding: 24px 0;
}
</style>
