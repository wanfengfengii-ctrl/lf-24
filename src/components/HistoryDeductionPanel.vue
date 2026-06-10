<template>
  <div class="history-deduction-panel">
    <TimelinePanel />

    <div class="panel-content">
      <div class="compare-section">
        <div class="section-header">
          <span class="section-title">各时期色彩分布对比</span>
          <n-button size="small" text @click="refreshStats">
            <template #icon>
              <n-icon><refresh-outline /></n-icon>
            </template>
            刷新
          </n-button>
        </div>

        <n-scrollbar class="compare-list">
          <div
            v-for="periodStat in periodStats"
            :key="periodStat.periodId"
            class="period-compare-item"
          >
            <div class="period-header">
              <div class="period-color-tag" :style="{ backgroundColor: getPeriodColor(periodStat.periodId) }"></div>
              <span class="period-name">{{ periodStat.periodName }}</span>
              <span class="period-area">
                总着色面积: {{ formatArea(periodStat.totalArea) }}px²
              </span>
            </div>

            <div v-if="periodStat.stats.length > 0" class="color-bars">
              <div
                v-for="stat in periodStat.stats.slice(0, 5)"
                :key="stat.color"
                class="color-bar-item"
              >
                <div class="color-bar-color" :style="{ backgroundColor: stat.color }"></div>
                <div class="color-bar-info">
                  <div class="color-bar-value">{{ stat.color }}</div>
                  <div class="color-bar-percentage">{{ stat.percentage }}%</div>
                </div>
                <div class="color-bar-track">
                  <div
                    class="color-bar-fill"
                    :style="{
                      width: stat.percentage + '%',
                      backgroundColor: stat.color
                    }"
                  ></div>
                </div>
              </div>
            </div>
            <div v-else class="empty-period-stats">
              <n-empty description="暂无颜色数据" size="small" />
            </div>
          </div>

          <div v-if="periodStats.length === 0" class="empty-compare">
            <n-empty description="暂无历史时期数据" />
          </div>
        </n-scrollbar>
      </div>

      <div class="report-section">
        <div class="section-header">
          <span class="section-title">复原报告</span>
        </div>
        <div class="report-info">
          <p class="report-desc">
            生成包含图层顺序、颜色面积、时期说明的完整复原报告。
          </p>
        </div>
        <n-button type="primary" block @click="handleExportReport">
          <template #icon>
            <n-icon><document-text-outline /></n-icon>
          </template>
          导出复原报告
        </n-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMessage, NButton, NIcon, NScrollbar, NEmpty } from 'naive-ui'
import {
  RefreshOutline,
  DocumentTextOutline
} from '@vicons/ionicons5'
import { useSolutionStore } from '../stores/solution'
import { storeToRefs } from 'pinia'
import TimelinePanel from './TimelinePanel.vue'

const solutionStore = useSolutionStore()
const { sortedHistoricalPeriods } = storeToRefs(solutionStore)
const message = useMessage()

const periodStats = computed(() => {
  return solutionStore.calculateColorStatsByPeriod()
})

function getPeriodColor(periodId: string): string {
  const period = sortedHistoricalPeriods.value.find(p => p.id === periodId)
  return period?.color || '#888888'
}

function formatArea(area: number): string {
  if (area >= 1000000) {
    return (area / 1000000).toFixed(2) + 'M'
  } else if (area >= 1000) {
    return (area / 1000).toFixed(1) + 'K'
  }
  return area.toString()
}

function refreshStats() {
  solutionStore.calculateColorStatsByPeriod()
}

function handleExportReport() {
  const json = solutionStore.exportRestorationReport()
  if (!json) {
    message.error('导出失败')
    return
  }

  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `复原报告_${new Date().toLocaleDateString()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  message.success('复原报告已导出')
}
</script>

<style scoped>
.history-deduction-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  overflow: hidden;
}

.panel-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 12px 16px;
  gap: 16px;
}

.compare-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.section-title {
  font-weight: 600;
  font-size: 14px;
}

.compare-list {
  flex: 1;
  overflow: hidden;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  background: #fafafa;
}

.period-compare-item {
  padding: 12px;
  border-bottom: 1px solid #eee;
  background: #fff;
}

.period-compare-item:last-child {
  border-bottom: none;
}

.period-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.period-color-tag {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.period-name {
  font-weight: 500;
  font-size: 13px;
}

.period-area {
  margin-left: auto;
  font-size: 11px;
  color: #888;
}

.color-bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.color-bar-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-bar-color {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.color-bar-info {
  width: 100px;
  flex-shrink: 0;
}

.color-bar-value {
  font-size: 10px;
  font-family: monospace;
  font-weight: 500;
}

.color-bar-percentage {
  font-size: 10px;
  color: #888;
}

.color-bar-track {
  flex: 1;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.color-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.empty-period-stats {
  padding: 20px 0;
}

.empty-compare {
  padding: 40px 0;
}

.report-section {
  flex-shrink: 0;
  padding: 12px;
  background: #f0f7ff;
  border: 1px solid #d0e0ff;
  border-radius: 8px;
}

.report-info {
  margin-bottom: 10px;
}

.report-desc {
  font-size: 12px;
  color: #666;
  line-height: 1.5;
}
</style>
