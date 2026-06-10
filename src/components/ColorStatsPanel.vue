<template>
  <div class="stats-panel">
    <div class="panel-header">
      <span class="panel-title">颜色面积统计</span>
      <n-button size="small" text @click="refreshStats">
        <template #icon>
          <n-icon><refresh-outline /></n-icon>
        </template>
        刷新
      </n-button>
    </div>

    <div class="stats-info">
      <span class="info-text">
        共 {{ stats.length }} 种颜色
      </span>
      <span class="info-note">
        （仅统计可见图层）
      </span>
    </div>

    <n-scrollbar class="stats-list">
      <div
        v-for="(stat, index) in stats"
        :key="stat.color"
        class="stat-item"
      >
        <div class="stat-rank">{{ index + 1 }}</div>
        <div
          class="stat-color"
          :style="{ backgroundColor: stat.color }"
        ></div>
        <div class="stat-info">
          <div class="stat-color-value">{{ stat.color }}</div>
          <div class="stat-meta">
            <span>面积: {{ formatArea(stat.area) }}px²</span>
            <span>占比: {{ stat.percentage }}%</span>
          </div>
        </div>
        <div class="stat-bar">
          <div
            class="stat-bar-fill"
            :style="{ width: stat.percentage + '%', backgroundColor: stat.color }"
          ></div>
        </div>
      </div>

      <div v-if="stats.length === 0" class="empty-stats">
        <n-empty description="暂无颜色数据" />
      </div>
    </n-scrollbar>

    <div class="stats-summary">
      <div class="summary-item">
        <span class="summary-label">总着色面积</span>
        <span class="summary-value">{{ formatArea(totalArea) }}px²</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">可见图层数</span>
        <span class="summary-value">{{ visibleLayerCount }}个</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NIcon, NScrollbar, NEmpty } from 'naive-ui'
import { RefreshOutline } from '@vicons/ionicons5'
import { useSolutionStore } from '../stores/solution'
import { storeToRefs } from 'pinia'

const props = defineProps<{
  enablePeriodFilter?: boolean
}>()

const solutionStore = useSolutionStore()
const { visibleLayers, visibleFilteredLayers, selectedPeriodIds } = storeToRefs(solutionStore)

const effectiveLayers = computed(() => {
  if (props.enablePeriodFilter && selectedPeriodIds.value.length > 0) {
    return visibleFilteredLayers.value
  }
  return visibleLayers.value
})

const stats = computed(() => {
  if (props.enablePeriodFilter && selectedPeriodIds.value.length > 0) {
    return solutionStore.calculateColorStatsForLayers(effectiveLayers.value)
  }
  return solutionStore.calculateColorAreaStats()
})

const totalArea = computed(() => {
  return stats.value.reduce((sum, s) => sum + s.area, 0)
})

const visibleLayerCount = computed(() => effectiveLayers.value.length)

function formatArea(area: number): string {
  if (area >= 1000000) {
    return (area / 1000000).toFixed(2) + 'M'
  } else if (area >= 1000) {
    return (area / 1000).toFixed(1) + 'K'
  }
  return area.toString()
}

function refreshStats() {
  solutionStore.calculateColorAreaStats()
}
</script>

<style scoped>
.stats-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border-top: 1px solid #e0e0e0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid #e0e0e0;
}

.panel-title {
  font-weight: 600;
  font-size: 14px;
}

.stats-info {
  padding: 8px 16px;
  font-size: 12px;
}

.info-text {
  color: #666;
}

.info-note {
  color: #999;
  margin-left: 4px;
}

.stats-list {
  flex: 1;
  overflow: hidden;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  border-bottom: 1px solid #f5f5f5;
}

.stat-rank {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: #888;
  flex-shrink: 0;
}

.stat-color {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-color-value {
  font-size: 12px;
  font-family: monospace;
  font-weight: 500;
}

.stat-meta {
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

.stat-bar {
  width: 60px;
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
  flex-shrink: 0;
}

.stat-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.stats-summary {
  display: flex;
  justify-content: space-around;
  padding: 10px 16px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
}

.summary-item {
  text-align: center;
}

.summary-label {
  display: block;
  font-size: 11px;
  color: #999;
  margin-bottom: 2px;
}

.summary-value {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.empty-stats {
  padding: 30px 0;
}
</style>
