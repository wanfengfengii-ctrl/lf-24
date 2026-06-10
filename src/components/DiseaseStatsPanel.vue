<template>
  <div class="disease-stats-panel">
    <div class="panel-header">
      <span class="panel-title">病害统计</span>
    </div>

    <div class="stats-content">
      <div class="stats-section">
        <div class="section-title">按类型分布</div>
        <div v-if="totalDiseaseArea === 0" class="empty-hint">
          暂无数据
        </div>
        <div v-else class="chart-container">
          <div
            v-for="stat in diseaseTypeStats"
            :key="stat.type"
            class="stat-bar-item"
          >
            <div class="bar-label">
              <span
                class="color-dot"
                :style="{ backgroundColor: stat.color }"
              ></span>
              <span class="label-text">{{ stat.typeName }}</span>
              <span class="count-badge">{{ stat.count }}处</span>
            </div>
            <div class="bar-wrapper">
              <div
                class="bar-fill"
                :style="{
                  width: `${stat.percentage}%`,
                  backgroundColor: stat.color
                }"
              ></div>
            </div>
            <div class="bar-value">
              <span>{{ stat.totalArea }} px</span>
              <span class="percentage">{{ stat.percentage }}%</span>
            </div>
          </div>
        </div>
      </div>

      <div class="stats-section">
        <div class="section-title">按严重程度分布</div>
        <div v-if="totalDiseaseArea === 0" class="empty-hint">
          暂无数据
        </div>
        <div v-else class="chart-container">
          <div
            v-for="stat in diseaseSeverityStats"
            :key="stat.severity"
            class="stat-bar-item"
          >
            <div class="bar-label">
              <span
                class="color-dot"
                :style="{ backgroundColor: getSeverityColor(stat.severity) }"
              ></span>
              <span class="label-text">{{ stat.severityName }}</span>
              <span class="count-badge">{{ stat.count }}处</span>
            </div>
            <div class="bar-wrapper">
              <div
                class="bar-fill"
                :style="{
                  width: `${stat.percentage}%`,
                  backgroundColor: getSeverityColor(stat.severity)
                }"
              ></div>
            </div>
            <div class="bar-value">
              <span>{{ stat.totalArea }} px</span>
              <span class="percentage">{{ stat.percentage }}%</span>
            </div>
          </div>
        </div>
      </div>

      <div class="summary-section">
        <n-space :size="16" justify="center">
          <div class="summary-card">
            <div class="summary-value">{{ diseases.length }}</div>
            <div class="summary-label">病害总数</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">{{ totalDiseaseArea }}</div>
            <div class="summary-label">总面积(px)</div>
          </div>
        </n-space>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { NSpace } from 'naive-ui'
import { useDiseaseStore } from '../stores/disease'
import { DISEASE_SEVERITY_COLORS } from '../types'
import type { DiseaseSeverity } from '../types'

const diseaseStore = useDiseaseStore()
const {
  diseases,
  diseaseTypeStats,
  diseaseSeverityStats,
  totalDiseaseArea
} = storeToRefs(diseaseStore)

function getSeverityColor(severity: DiseaseSeverity): string {
  return DISEASE_SEVERITY_COLORS[severity]
}
</script>

<style scoped>
.disease-stats-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.stats-content {
  flex: 1;
  padding: 12px 16px;
  overflow-y: auto;
}

.stats-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 13px;
  font-weight: 500;
  color: #555;
  margin-bottom: 12px;
}

.empty-hint {
  font-size: 12px;
  color: #999;
  text-align: center;
  padding: 20px 0;
}

.chart-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stat-bar-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bar-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.label-text {
  color: #333;
  flex: 1;
}

.count-badge {
  font-size: 11px;
  color: #999;
  background: #f5f5f5;
  padding: 1px 6px;
  border-radius: 10px;
}

.bar-wrapper {
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
  min-width: 2px;
}

.bar-value {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #666;
}

.percentage {
  color: #999;
}

.summary-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.summary-card {
  text-align: center;
  padding: 12px 20px;
  background: #f9f9f9;
  border-radius: 8px;
}

.summary-value {
  font-size: 22px;
  font-weight: 600;
  color: #1677ff;
  margin-bottom: 4px;
}

.summary-label {
  font-size: 12px;
  color: #999;
}
</style>
