<template>
  <div class="timeline-panel">
    <div class="panel-header">
      <span class="panel-title">历史时期时间轴</span>
      <n-button size="small" text @click="showPeriodDialog = true">
        <template #icon>
          <n-icon><settings-outline /></n-icon>
        </template>
        管理时期
      </n-button>
    </div>

    <div class="timeline-container">
      <div class="timeline-track">
        <div
          v-for="period in sortedPeriods"
          :key="period.id"
          class="timeline-period"
          :class="{
            active: isPeriodSelected(period.id),
            'single-active': singleActivePeriod === period.id
          }"
          :style="{
            left: getPeriodPosition(period.startYear) + '%',
            width: getPeriodWidth(period) + '%',
            backgroundColor: period.color + '30',
            borderColor: period.color
          }"
          @click="handlePeriodClick(period.id)"
        >
          <div class="period-label" :style="{ color: period.color }">
            {{ period.name }}
          </div>
          <div class="period-years">
            {{ period.startYear }} - {{ period.endYear }}
          </div>
        </div>
      </div>

      <div class="timeline-scale">
        <span v-for="year in scaleYears" :key="year" class="scale-year">
          {{ year }}
        </span>
      </div>
    </div>

    <div class="period-filter-tags">
      <n-tag
        v-for="period in sortedPeriods"
        :key="period.id"
        :type="isPeriodSelected(period.id) ? 'primary' : 'default'"
        :bordered="true"
        size="small"
        closable
        @click="togglePeriod(period.id)"
        @close="togglePeriod(period.id)"
        class="filter-tag"
        :style="isPeriodSelected(period.id) ? {
          '--n-color': period.color + '20',
          '--n-border-color': period.color,
          '--n-text-color': period.color
        } : {}"
      >
        <span class="tag-color-dot" :style="{ backgroundColor: period.color }"></span>
        {{ period.name }}
      </n-tag>
      <n-button size="tiny" text @click="selectAllPeriods" v-if="!allSelected">
        全选
      </n-button>
      <n-button size="tiny" text @click="clearPeriodSelection" v-else>
        清空
      </n-button>
    </div>

    <n-modal v-model:show="showPeriodDialog" preset="card" title="历史时期管理" :style="{ width: '500px' }">
      <div class="period-management">
        <div class="period-list">
          <div
            v-for="period in sortedPeriods"
            :key="period.id"
            class="period-item"
          >
            <div class="period-color" :style="{ backgroundColor: period.color }"></div>
            <div class="period-info">
              <div class="period-name">{{ period.name }}</div>
              <div class="period-desc">{{ period.startYear }} - {{ period.endYear }}</div>
            </div>
            <div class="period-actions">
              <n-button size="tiny" text @click="editPeriod(period)">
                <template #icon>
                  <n-icon><create-outline /></n-icon>
                </template>
              </n-button>
              <n-button size="tiny" text @click="confirmDeletePeriod(period)">
                <template #icon>
                  <n-icon><trash-outline /></n-icon>
                </template>
              </n-button>
            </div>
          </div>
          <div v-if="sortedPeriods.length === 0" class="empty-periods">
            <n-empty description="暂无历史时期" />
          </div>
        </div>

        <n-button type="primary" block @click="openAddPeriod">
          <template #icon>
            <n-icon><add-outline /></n-icon>
          </template>
          添加历史时期
        </n-button>
      </div>
    </n-modal>

    <n-modal v-model:show="showEditDialog" preset="card" :title="editingPeriod ? '编辑时期' : '添加时期'" :style="{ width: '400px' }">
      <div class="period-form">
        <n-form-item label="时期名称">
          <n-input v-model:value="formData.name" placeholder="请输入时期名称" />
        </n-form-item>
        <n-form-item label="起始年份">
          <n-input-number v-model:value="formData.startYear" :min="-5000" :max="5000" style="width: 100%" />
        </n-form-item>
        <n-form-item label="结束年份">
          <n-input-number v-model:value="formData.endYear" :min="-5000" :max="5000" style="width: 100%" />
        </n-form-item>
        <n-form-item label="时期描述">
          <n-input v-model:value="formData.description" type="textarea" :rows="3" placeholder="请输入时期描述" />
        </n-form-item>
        <n-form-item label="标识颜色">
          <n-input v-model:value="formData.color" placeholder="#RRGGBB" />
        </n-form-item>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showEditDialog = false">取消</n-button>
          <n-button type="primary" @click="savePeriod">保存</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDialog, useMessage, NButton, NIcon, NTag, NModal, NFormItem, NInput, NInputNumber, NSpace, NEmpty } from 'naive-ui'
import {
  SettingsOutline,
  CreateOutline,
  TrashOutline,
  AddOutline
} from '@vicons/ionicons5'
import { useSolutionStore } from '../stores/solution'
import { storeToRefs } from 'pinia'
import type { HistoricalPeriod } from '../types'

const solutionStore = useSolutionStore()
const { sortedHistoricalPeriods, selectedPeriodIds, activePeriodId } = storeToRefs(solutionStore)
const dialog = useDialog()
const message = useMessage()

const showPeriodDialog = ref(false)
const showEditDialog = ref(false)
const editingPeriod = ref<HistoricalPeriod | null>(null)
const formData = ref({
  name: '',
  startYear: 0,
  endYear: 0,
  description: '',
  color: '#3b82f6'
})

const sortedPeriods = computed(() => sortedHistoricalPeriods.value)

const allSelected = computed(() => {
  return sortedPeriods.value.length > 0 &&
    sortedPeriods.value.every(p => selectedPeriodIds.value.includes(p.id))
})

const singleActivePeriod = computed(() => {
  return activePeriodId.value
})

const minYear = computed(() => {
  if (sortedPeriods.value.length === 0) return 600
  return Math.min(...sortedPeriods.value.map(p => p.startYear))
})

const maxYear = computed(() => {
  if (sortedPeriods.value.length === 0) return 1950
  return Math.max(...sortedPeriods.value.map(p => p.endYear))
})

const scaleYears = computed(() => {
  const years: number[] = []
  const range = maxYear.value - minYear.value
  const step = Math.ceil(range / 5 / 100) * 100
  for (let year = minYear.value; year <= maxYear.value; year += step) {
    years.push(year)
  }
  if (years[years.length - 1] < maxYear.value) {
    years.push(maxYear.value)
  }
  return years
})

function getPeriodPosition(year: number): number {
  const range = maxYear.value - minYear.value
  if (range === 0) return 0
  return ((year - minYear.value) / range) * 100
}

function getPeriodWidth(period: HistoricalPeriod): number {
  const range = maxYear.value - minYear.value
  if (range === 0) return 10
  return ((period.endYear - period.startYear) / range) * 100
}

function isPeriodSelected(periodId: string): boolean {
  return selectedPeriodIds.value.includes(periodId)
}

function handlePeriodClick(periodId: string) {
  solutionStore.setActivePeriod(periodId)
  if (!selectedPeriodIds.value.includes(periodId)) {
    solutionStore.setSelectedPeriods([periodId])
  }
}

function togglePeriod(periodId: string) {
  solutionStore.togglePeriodSelection(periodId)
}

function selectAllPeriods() {
  const allIds = sortedPeriods.value.map(p => p.id)
  solutionStore.setSelectedPeriods(allIds)
}

function clearPeriodSelection() {
  solutionStore.setSelectedPeriods([])
}

function openAddPeriod() {
  editingPeriod.value = null
  formData.value = {
    name: '',
    startYear: minYear.value || 600,
    endYear: maxYear.value || 1900,
    description: '',
    color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
  }
  showEditDialog.value = true
}

function editPeriod(period: HistoricalPeriod) {
  editingPeriod.value = period
  formData.value = {
    name: period.name,
    startYear: period.startYear,
    endYear: period.endYear,
    description: period.description,
    color: period.color
  }
  showEditDialog.value = true
}

function savePeriod() {
  if (!formData.value.name.trim()) {
    message.error('请输入时期名称')
    return
  }
  if (formData.value.startYear >= formData.value.endYear) {
    message.error('结束年份必须大于起始年份')
    return
  }

  if (editingPeriod.value) {
    const success = solutionStore.updateHistoricalPeriod(editingPeriod.value.id, {
      name: formData.value.name,
      startYear: formData.value.startYear,
      endYear: formData.value.endYear,
      description: formData.value.description,
      color: formData.value.color
    })
    if (success) {
      message.success('已更新时期')
      showEditDialog.value = false
    }
  } else {
    const newPeriod = solutionStore.addHistoricalPeriod({
      name: formData.value.name,
      startYear: formData.value.startYear,
      endYear: formData.value.endYear,
      description: formData.value.description,
      color: formData.value.color
    })
    if (newPeriod) {
      message.success('已添加时期')
      showEditDialog.value = false
    }
  }
}

function confirmDeletePeriod(period: HistoricalPeriod) {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除历史时期「${period.name}」吗？相关图层的时期关联将被清除。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      const success = solutionStore.deleteHistoricalPeriod(period.id)
      if (success) {
        message.success('已删除时期')
      }
    }
  })
}
</script>

<style scoped>
.timeline-panel {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  padding: 12px 16px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.panel-title {
  font-weight: 600;
  font-size: 14px;
}

.timeline-container {
  padding: 10px 0;
}

.timeline-track {
  position: relative;
  height: 60px;
  background: #f5f5f5;
  border-radius: 6px;
  margin-bottom: 8px;
  overflow: hidden;
}

.timeline-period {
  position: absolute;
  top: 8px;
  bottom: 8px;
  border: 2px solid;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  overflow: hidden;
}

.timeline-period:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.timeline-period.active {
  opacity: 1;
}

.timeline-period:not(.active) {
  opacity: 0.4;
}

.timeline-period.single-active {
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px currentColor;
}

.period-label {
  font-size: 12px;
  font-weight: 600;
}

.period-years {
  font-size: 10px;
  color: #666;
  margin-top: 2px;
}

.timeline-scale {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #999;
  padding: 0 2px;
}

.scale-year {
  transform: translateX(-50%);
}

.period-filter-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}

.filter-tag {
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 4px;
}

.tag-color-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.period-management {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.period-list {
  max-height: 300px;
  overflow-y: auto;
}

.period-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-bottom: 1px solid #f0f0f0;
}

.period-color {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  flex-shrink: 0;
  border: 1px solid #e0e0e0;
}

.period-info {
  flex: 1;
  min-width: 0;
}

.period-name {
  font-size: 13px;
  font-weight: 500;
}

.period-desc {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

.period-actions {
  display: flex;
  gap: 4px;
}

.empty-periods {
  padding: 30px 0;
}

.period-form {
  padding: 8px 0;
}
</style>
