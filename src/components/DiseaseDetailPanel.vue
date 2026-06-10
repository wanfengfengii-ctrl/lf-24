<template>
  <div class="disease-detail-panel">
    <div class="panel-header">
      <div class="header-left">
        <n-button size="small" text @click="handleBack">
          <template #icon>
            <n-icon><arrow-back-outline /></n-icon>
          </template>
          返回
        </n-button>
        <span class="panel-title">病害详情</span>
      </div>
      <n-tag :color="getStageColor(disease?.currentStage)" type="success" size="small">
        {{ getStageLabel(disease?.currentStage) }}
      </n-tag>
    </div>

    <n-scrollbar class="panel-content">
      <div v-if="disease" class="detail-content">
        <div class="section basic-info">
          <div class="section-header">
            <span class="section-title">基本信息</span>
            <n-button size="small" text @click="handleEditBasic">
              <template #icon>
                <n-icon><create-outline /></n-icon>
              </template>
              编辑
            </n-button>
          </div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">病害名称</span>
              <span class="info-value">{{ disease.name }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">病害类型</span>
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
                  {{ getTypeLabel(type) }}
                </n-tag>
              </div>
            </div>
            <div class="info-item">
              <span class="info-label">严重程度</span>
              <span
                class="severity-badge"
                :style="{ backgroundColor: getSeverityColor(disease.severity) }"
              >
                {{ getSeverityLabel(disease.severity) }}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">面积</span>
              <span class="info-value">{{ disease.area }} 像素</span>
            </div>
            <div class="info-item">
              <span class="info-label">发现时间</span>
              <span class="info-value">{{ formatDate(disease.discoveredAt) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">处置状态</span>
              <n-tag :color="getTreatmentStatusColor(disease.treatmentStatus)" size="small">
                {{ getTreatmentStatusLabel(disease.treatmentStatus) }}
              </n-tag>
            </div>
          </div>
          <div class="info-item full-width">
            <span class="info-label">说明</span>
            <p class="info-desc">{{ disease.description || '暂无说明' }}</p>
          </div>
          <div class="info-item full-width">
            <span class="info-label">修复建议</span>
            <p class="info-desc">{{ disease.treatmentSuggestion || '暂无建议' }}</p>
          </div>
        </div>

        <div class="section area-comparison">
          <div class="section-header">
            <span class="section-title">面积变化对比</span>
          </div>
          <div class="comparison-stats">
            <div class="comparison-item">
              <span class="comparison-label">初检面积</span>
              <span class="comparison-value">{{ areaComparison?.initialArea || 0 }} px</span>
            </div>
            <div class="comparison-item">
              <span class="comparison-label">当前面积</span>
              <span class="comparison-value">{{ areaComparison?.currentArea || 0 }} px</span>
            </div>
            <div class="comparison-item">
              <span class="comparison-label">面积变化</span>
              <span
                class="comparison-value change-value"
                :class="{ positive: (areaComparison?.change || 0) <= 0, negative: (areaComparison?.change || 0) > 0 }"
              >
                {{ (areaComparison?.change || 0) >= 0 ? '+' : '' }}{{ areaComparison?.change || 0 }} px
                ({{ (areaComparison?.changeRate || 0) >= 0 ? '+' : '' }}{{ areaComparison?.changeRate || 0 }}%)
              </span>
            </div>
          </div>
        </div>

        <div class="section stage-timeline">
          <div class="section-header">
            <span class="section-title">检查记录</span>
            <n-dropdown
              :options="addStageOptions"
              @select="handleAddStage"
              trigger="click"
            >
              <n-button size="small" type="primary">
                <template #icon>
                  <n-icon><add-outline /></n-icon>
                </template>
                添加记录
              </n-button>
            </n-dropdown>
          </div>

          <div class="stage-progress">
            <div
              v-for="(stage, index) in stages"
              :key="stage"
              class="stage-node"
              :class="{ active: isStageActive(stage), completed: isStageCompleted(stage) }"
            >
              <div class="node-dot" :style="{ backgroundColor: getStageColor(stage) }">
                <n-icon v-if="isStageCompleted(stage)"><checkmark-outline /></n-icon>
                <span v-else>{{ index + 1 }}</span>
              </div>
              <span class="node-label">{{ getStageLabel(stage) }}</span>
              <div v-if="index < stages.length - 1" class="node-line"></div>
            </div>
          </div>

          <div v-if="sortedRecords.length === 0" class="empty-records">
            <n-empty description="暂无检查记录" :size="'small'" />
          </div>

          <div v-else class="records-list">
            <div
              v-for="record in sortedRecords"
              :key="record.id"
              class="record-card"
              :class="{ expanded: expandedRecordId === record.id }"
            >
              <div class="record-header" @click="toggleRecordExpand(record.id)">
                <div class="record-left">
                  <div class="record-stage-badge" :style="{ backgroundColor: getStageColor(record.stage) }">
                    {{ getStageLabel(record.stage) }}
                  </div>
                  <div class="record-meta">
                    <span class="record-inspector">{{ record.inspectorName || '未填写检查人' }}</span>
                    <span class="record-time">{{ formatDate(record.inspectTime) }}</span>
                  </div>
                </div>
                <div class="record-actions" @click.stop>
                  <n-button size="tiny" text @click="handleEditRecord(record)">
                    <template #icon>
                      <n-icon><create-outline /></n-icon>
                    </template>
                    编辑
                  </n-button>
                  <n-button size="tiny" text type="error" @click="handleDeleteRecord(record.id)">
                    <template #icon>
                      <n-icon><trash-outline /></n-icon>
                    </template>
                    删除
                  </n-button>
                  <n-icon class="expand-icon" :class="{ expanded: expandedRecordId === record.id }">
                    <chevron-down-outline />
                  </n-icon>
                </div>
              </div>

              <div v-if="expandedRecordId === record.id" class="record-detail">
                <div class="detail-grid">
                  <div v-if="record.area !== undefined" class="detail-item">
                    <span class="detail-label">检查面积</span>
                    <span class="detail-value">{{ record.area }} 像素</span>
                  </div>
                  <div v-if="record.severity !== undefined" class="detail-item">
                    <span class="detail-label">严重程度</span>
                    <span
                      class="severity-badge small"
                      :style="{ backgroundColor: getSeverityColor(record.severity) }"
                    >
                      {{ getSeverityLabel(record.severity) }}
                    </span>
                  </div>
                </div>

                <div class="detail-item full-width">
                  <span class="detail-label">检查结论</span>
                  <p class="detail-text">{{ record.conclusion || '无' }}</p>
                </div>

                <div class="detail-item full-width">
                  <span class="detail-label">处理意见</span>
                  <p class="detail-text">{{ record.treatmentOpinion || '无' }}</p>
                </div>

                <div v-if="record.notes" class="detail-item full-width">
                  <span class="detail-label">备注</span>
                  <p class="detail-text">{{ record.notes }}</p>
                </div>

                <div v-if="record.photos && record.photos.length > 0" class="detail-item full-width">
                  <span class="detail-label">照片附件</span>
                  <div class="photo-list">
                    <div
                      v-for="photo in record.photos"
                      :key="photo.id"
                      class="photo-item"
                    >
                      <img :src="photo.url" :alt="photo.name" />
                      <span class="photo-name">{{ photo.name }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="section treatment-status">
          <div class="section-header">
            <span class="section-title">处置状态管理</span>
          </div>
          <div class="status-actions">
            <n-space :size="8" wrap>
              <n-button
                v-for="status in treatmentStatuses"
                :key="status"
                size="small"
                :type="disease.treatmentStatus === status ? 'primary' : 'default'"
                @click="handleChangeStatus(status)"
              >
                {{ getTreatmentStatusLabel(status) }}
              </n-button>
            </n-space>
          </div>
        </div>
      </div>
    </n-scrollbar>

    <StageRecordDialog
      v-model:show="showRecordDialog"
      :disease="disease"
      :record="editingRecord"
      :stage="currentAddStage"
      :mode="recordDialogMode"
      @save="handleSaveRecord"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  NButton,
  NIcon,
  NTag,
  NSpace,
  NScrollbar,
  NEmpty,
  NDropdown,
  useDialog,
  useMessage
} from 'naive-ui'
import {
  ArrowBackOutline,
  CreateOutline,
  AddOutline,
  TrashOutline,
  ChevronDownOutline,
  CheckmarkOutline
} from '@vicons/ionicons5'
import { storeToRefs } from 'pinia'
import { useDiseaseStore } from '../stores/disease'
import type {
  DiseaseAnnotation,
  DiseaseStage,
  DiseaseStageRecord,
  TreatmentStatus,
  DiseaseType,
  DiseaseSeverity
} from '../types'
import {
  DISEASE_STAGE_LABELS,
  DISEASE_STAGE_COLORS,
  DISEASE_STAGE_ORDER,
  DISEASE_TYPE_LABELS,
  DISEASE_TYPE_COLORS,
  DISEASE_SEVERITY_LABELS,
  DISEASE_SEVERITY_COLORS,
  TREATMENT_STATUS_LABELS,
  TREATMENT_STATUS_COLORS
} from '../types'
import StageRecordDialog from './StageRecordDialog.vue'

const diseaseStore = useDiseaseStore()
const { selectedDisease } = storeToRefs(diseaseStore)

const dialog = useDialog()
const message = useMessage()

const emit = defineEmits<{
  (e: 'back'): void
}>()

const disease = computed(() => selectedDisease.value)

const expandedRecordId = ref<string | null>(null)
const showRecordDialog = ref(false)
const editingRecord = ref<DiseaseStageRecord | null>(null)
const currentAddStage = ref<DiseaseStage>('recheck')
const recordDialogMode = ref<'add' | 'edit'>('add')

const stages = DISEASE_STAGE_ORDER
const treatmentStatuses: TreatmentStatus[] = ['pending', 'processing', 'completed', 'closed']

const addStageOptions = [
  { label: '添加复查记录', key: 'recheck' },
  { label: '添加处置记录', key: 'treatment' },
  { label: '添加复验记录', key: 'reinspection' }
]

const sortedRecords = computed(() => {
  if (!disease.value) return []
  return [...disease.value.stageRecords].sort((a, b) => b.inspectTime - a.inspectTime)
})

const areaComparison = computed(() => {
  if (!disease.value) return null
  return diseaseStore.getAreaComparison(disease.value.id)
})

function getStageLabel(stage?: DiseaseStage): string {
  if (!stage) return ''
  return DISEASE_STAGE_LABELS[stage]
}

function getStageColor(stage?: DiseaseStage): string {
  if (!stage) return '#999'
  return DISEASE_STAGE_COLORS[stage]
}

function getTypeLabel(type: DiseaseType): string {
  return DISEASE_TYPE_LABELS[type]
}

function getTypeColor(type: DiseaseType): string {
  return DISEASE_TYPE_COLORS[type]
}

function getSeverityLabel(severity: DiseaseSeverity): string {
  return DISEASE_SEVERITY_LABELS[severity]
}

function getSeverityColor(severity: DiseaseSeverity): string {
  return DISEASE_SEVERITY_COLORS[severity]
}

function getTreatmentStatusLabel(status: TreatmentStatus): string {
  return TREATMENT_STATUS_LABELS[status]
}

function getTreatmentStatusColor(status: TreatmentStatus): string {
  return TREATMENT_STATUS_COLORS[status]
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function isStageActive(stage: DiseaseStage): boolean {
  if (!disease.value) return false
  return disease.value.currentStage === stage
}

function isStageCompleted(stage: DiseaseStage): boolean {
  if (!disease.value) return false
  const stageIndex = DISEASE_STAGE_ORDER.indexOf(stage)
  const currentIndex = DISEASE_STAGE_ORDER.indexOf(disease.value.currentStage)
  return stageIndex < currentIndex || disease.value.stageRecords.some(r => r.stage === stage)
}

function toggleRecordExpand(recordId: string) {
  expandedRecordId.value = expandedRecordId.value === recordId ? null : recordId
}

function handleBack() {
  emit('back')
}

function handleEditBasic() {
  emit('edit')
}

function handleAddStage(key: string) {
  currentAddStage.value = key as DiseaseStage
  recordDialogMode.value = 'add'
  editingRecord.value = null
  showRecordDialog.value = true
}

function handleEditRecord(record: DiseaseStageRecord) {
  editingRecord.value = record
  recordDialogMode.value = 'edit'
  currentAddStage.value = record.stage
  showRecordDialog.value = true
}

function handleDeleteRecord(recordId: string) {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这条检查记录吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      if (disease.value) {
        diseaseStore.deleteStageRecord(disease.value.id, recordId)
        message.success('删除成功')
      }
    }
  })
}

function handleSaveRecord(data: any) {
  if (!disease.value) return

  if (recordDialogMode.value === 'add') {
    diseaseStore.addStageRecord(disease.value.id, data)
    message.success('添加成功')
  } else if (editingRecord.value) {
    diseaseStore.updateStageRecord(disease.value.id, editingRecord.value.id, data)
    message.success('保存成功')
  }

  showRecordDialog.value = false
}

function handleChangeStatus(status: TreatmentStatus) {
  if (!disease.value) return
  diseaseStore.setTreatmentStatus(disease.value.id, status)
  message.success('状态已更新')
}
</script>

<style scoped>
.disease-detail-panel {
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

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.panel-content {
  flex: 1;
  min-height: 0;
}

.detail-content {
  padding: 16px;
}

.section {
  margin-bottom: 20px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.section:last-child {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item.full-width {
  grid-column: 1 / -1;
}

.info-label {
  font-size: 12px;
  color: #999;
}

.info-value {
  font-size: 13px;
  color: #333;
  font-weight: 500;
}

.info-desc {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  margin: 0;
}

.type-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
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

.severity-badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  border-radius: 4px;
  line-height: 1.4;
}

.severity-badge.small {
  padding: 1px 6px;
  font-size: 10px;
}

.comparison-stats {
  display: flex;
  gap: 20px;
}

.comparison-item {
  flex: 1;
  text-align: center;
  padding: 12px;
  background: #fff;
  border-radius: 6px;
}

.comparison-label {
  display: block;
  font-size: 12px;
  color: #999;
  margin-bottom: 6px;
}

.comparison-value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.comparison-value.change-value.positive {
  color: #52c41a;
}

.comparison-value.change-value.negative {
  color: #ef4444;
}

.stage-progress {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding: 16px;
  background: #fff;
  border-radius: 6px;
  position: relative;
}

.stage-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  flex: 1;
}

.node-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  opacity: 0.5;
}

.stage-node.completed .node-dot,
.stage-node.active .node-dot {
  opacity: 1;
}

.node-label {
  font-size: 12px;
  color: #999;
  text-align: center;
}

.stage-node.completed .node-label,
.stage-node.active .node-label {
  color: #333;
  font-weight: 500;
}

.node-line {
  position: absolute;
  top: 16px;
  left: 60%;
  right: -40%;
  height: 2px;
  background: #e8e8e8;
}

.stage-node.completed .node-line {
  background: #52c41a;
}

.empty-records {
  padding: 24px 0;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-card {
  background: #fff;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e8e8e8;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.record-header:hover {
  background: #f9f9f9;
}

.record-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.record-stage-badge {
  padding: 4px 10px;
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
  font-weight: 500;
}

.record-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.record-inspector {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.record-time {
  font-size: 11px;
  color: #999;
}

.record-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.expand-icon {
  color: #999;
  transition: transform 0.2s;
  font-size: 16px;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.record-detail {
  padding: 0 16px 16px;
  border-top: 1px solid #f0f0f0;
  padding-top: 12px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-label {
  font-size: 12px;
  color: #999;
}

.detail-value {
  font-size: 13px;
  color: #333;
  font-weight: 500;
}

.detail-text {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  margin: 0;
}

.photo-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.photo-item {
  width: 80px;
  height: 80px;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  border: 1px solid #e8e8e8;
}

.photo-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 10px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.status-actions {
  padding: 8px 0;
}
</style>
