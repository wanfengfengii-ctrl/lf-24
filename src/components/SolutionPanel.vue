<template>
  <div class="solution-panel">
    <div class="panel-header">
      <span class="panel-title">方案管理</span>
      <n-button size="small" type="primary" @click="handleNewSolution">
        <template #icon>
          <n-icon><add-outline /></n-icon>
        </template>
        新建方案
      </n-button>
    </div>

    <div class="current-solution" v-if="currentSolution">
      <div class="solution-info">
        <span class="solution-label">当前方案</span>
        <n-input
          v-if="editingCurrentName"
          v-model:value="currentNameInput"
          size="small"
          @blur="saveCurrentName"
          @keyup.enter="saveCurrentName"
          ref="nameInputRef"
        />
        <span v-else class="solution-name" @dblclick="startEditCurrentName">
          {{ currentSolution.name }}
        </span>
      </div>
      <div class="solution-actions">
        <n-button size="tiny" @click="handleRename">
          <template #icon>
            <n-icon><create-outline /></n-icon>
          </template>
          重命名
        </n-button>
        <n-button size="tiny" @click="handleDuplicate">
          <template #icon>
            <n-icon><copy-outline /></n-icon>
          </template>
          复制
        </n-button>
        <n-button size="tiny" @click="handleExport">
          <template #icon>
            <n-icon><download-outline /></n-icon>
          </template>
          导出
        </n-button>
      </div>
    </div>

    <div class="solution-list-section">
      <span class="list-label">所有方案</span>
      <n-scrollbar class="solution-list">
        <div
          v-for="solution in solutions"
          :key="solution.id"
          class="solution-item"
          :class="{ active: solution.id === currentSolutionId }"
          @click="switchToSolution(solution.id)"
        >
          <div class="solution-item-info">
            <span class="solution-item-name">{{ solution.name }}</span>
            <span class="solution-item-meta">
              {{ formatDate(solution.updatedAt) }} · {{ solution.layers.length }}个图层
            </span>
          </div>
          <div class="solution-item-actions" @click.stop>
            <n-button
              size="tiny"
              text
              @click="toggleCompare(solution.id)"
              :type="compareSolutionIds.includes(solution.id) ? 'primary' : 'default'"
            >
              <template #icon>
                <n-icon>
                  <git-compare-outline v-if="compareSolutionIds.includes(solution.id)" />
                  <git-compare-outline v-else />
                </n-icon>
              </template>
              对比
            </n-button>
            <n-button size="tiny" text @click="confirmDeleteSolution(solution)">
              <template #icon>
                <n-icon><trash-outline /></n-icon>
              </template>
            </n-button>
          </div>
        </div>

        <div v-if="solutions.length === 0" class="empty-solutions">
          <n-empty description="暂无方案" />
        </div>
      </n-scrollbar>
    </div>

    <div class="import-section">
      <n-button block @click="triggerImport">
        <template #icon>
          <n-icon><cloud-upload-outline /></n-icon>
        </template>
        导入方案
      </n-button>
      <input
        ref="fileInputRef"
        type="file"
        accept=".json"
        style="display: none"
        @change="handleFileImport"
      />
    </div>

    <div class="compare-section" v-if="compareSolutionIds.length > 0">
      <div class="compare-header">
        <span class="compare-label">对比模式 ({{ compareSolutionIds.length }}/4)</span>
        <n-button size="tiny" text @click="clearCompare">
          清除全部
        </n-button>
      </div>
      <n-tag
        v-for="id in compareSolutionIds"
        :key="id"
        closable
        size="small"
        @close="toggleCompare(id)"
        style="margin: 2px"
      >
        {{ getSolutionName(id) }}
      </n-tag>
      <n-button
        v-if="compareSolutionIds.length >= 2"
        type="primary"
        size="small"
        block
        style="margin-top: 8px"
        @click="emit('openCompare')"
      >
        开始对比
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import {
  NButton,
  NIcon,
  NInput,
  NScrollbar,
  NEmpty,
  NTag,
  useDialog,
  useMessage
} from 'naive-ui'
import {
  AddOutline,
  CreateOutline,
  CopyOutline,
  DownloadOutline,
  TrashOutline,
  GitCompareOutline,
  CloudUploadOutline
} from '@vicons/ionicons5'
import { useSolutionStore } from '../stores/solution'
import { storeToRefs } from 'pinia'
import type { Solution } from '../types'

const emit = defineEmits<{
  (e: 'openCompare'): void
}>()

const solutionStore = useSolutionStore()
const { solutions, currentSolutionId, currentSolution, compareSolutionIds } = storeToRefs(solutionStore)
const dialog = useDialog()
const message = useMessage()

const fileInputRef = ref<HTMLInputElement | null>(null)
const editingCurrentName = ref(false)
const currentNameInput = ref('')
const nameInputRef = ref<typeof NInput | null>(null)

function handleNewSolution() {
  const solution = solutionStore.createNewSolution()
  message.success(`已创建方案「${solution.name}」`)
}

function switchToSolution(id: string) {
  solutionStore.switchSolution(id)
}

function handleRename() {
  startEditCurrentName()
}

function startEditCurrentName() {
  if (!currentSolution.value) return
  editingCurrentName.value = true
  currentNameInput.value = currentSolution.value.name
  nextTick(() => {
    nameInputRef.value?.focus()
  })
}

function saveCurrentName() {
  if (!currentSolution.value || !currentNameInput.value.trim()) {
    editingCurrentName.value = false
    return
  }
  solutionStore.renameSolution(currentSolution.value.id, currentNameInput.value.trim())
  editingCurrentName.value = false
}

function handleDuplicate() {
  if (!currentSolution.value) return
  const newSolution = solutionStore.duplicateSolution(currentSolution.value.id)
  if (newSolution) {
    message.success(`已复制方案「${newSolution.name}」`)
  }
}

function handleExport() {
  if (!currentSolution.value) return
  const json = solutionStore.exportSolution(currentSolution.value.id)
  if (!json) return

  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${currentSolution.value.name}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  message.success('方案已导出')
}

function confirmDeleteSolution(solution: Solution) {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除方案「${solution.name}」吗？此操作不可撤销。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      solutionStore.deleteSolution(solution.id)
      message.success('方案已删除')
    }
  })
}

function triggerImport() {
  fileInputRef.value?.click()
}

function handleFileImport(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    const content = event.target?.result as string
    if (!content) return

    const imported = solutionStore.importSolution(content)
    if (imported) {
      message.success(`已导入方案「${imported.name}」`)
    } else {
      message.error('导入失败：无效的方案文件')
    }
  }
  reader.readAsText(file)
  target.value = ''
}

function toggleCompare(solutionId: string) {
  solutionStore.toggleCompare(solutionId)
}

function clearCompare() {
  solutionStore.clearCompare()
}

function getSolutionName(id: string): string {
  const solution = solutions.value.find(s => s.id === id)
  return solution?.name || '未知'
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.solution-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border-right: 1px solid #e0e0e0;
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

.current-solution {
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.solution-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.solution-label {
  font-size: 12px;
  color: #888;
}

.solution-name {
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
}

.solution-actions {
  display: flex;
  gap: 6px;
}

.solution-list-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.list-label {
  font-size: 12px;
  color: #888;
  padding: 10px 16px 6px;
}

.solution-list {
  flex: 1;
  overflow: hidden;
}

.solution-item {
  padding: 10px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.solution-item:hover {
  background-color: #f5f5f5;
}

.solution-item.active {
  background-color: #e8f4fd;
  border-left: 3px solid #3b82f6;
  padding-left: 13px;
}

.solution-item-info {
  margin-bottom: 4px;
}

.solution-item-name {
  display: block;
  font-size: 13px;
  font-weight: 500;
}

.solution-item-meta {
  font-size: 11px;
  color: #999;
}

.solution-item-actions {
  display: flex;
  gap: 4px;
}

.import-section {
  padding: 12px 16px;
  border-top: 1px solid #e0e0e0;
}

.compare-section {
  padding: 12px 16px;
  background: #f0f7ff;
  border-top: 1px solid #d0e0ff;
}

.compare-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.compare-label {
  font-size: 12px;
  font-weight: 500;
  color: #3b82f6;
}

.empty-solutions {
  padding: 20px 0;
}
</style>
