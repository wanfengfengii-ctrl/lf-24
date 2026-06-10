<template>
  <n-modal
    v-model:show="showModal"
    :mask-closable="false"
    preset="dialog"
    :title="isEdit ? '编辑病害' : '新增病害'"
    :positive-text="isEdit ? '保存' : '添加'"
    negative-text="取消"
    @positive-click="handleSave"
    @negative-click="handleCancel"
  >
    <div class="disease-edit-form">
      <n-form label-placement="left" label-width="100px">
        <n-form-item label="名称">
          <n-input v-model:value="formData.name" placeholder="请输入病害名称" />
        </n-form-item>

        <n-form-item label="病害类型" :show-label="true">
          <div class="type-selector">
            <n-checkbox-group v-model:value="formData.types">
              <n-space wrap>
                <n-checkbox
                  v-for="typeOption in diseaseTypeOptions"
                  :key="typeOption.value"
                  :value="typeOption.value"
                >
                  <span
                    class="type-color-dot"
                    :style="{ backgroundColor: typeOption.color }"
                  ></span>
                  {{ typeOption.label }}
                </n-checkbox>
              </n-space>
            </n-checkbox-group>
          </div>
        </n-form-item>

        <n-form-item label="主类型">
          <n-select
            v-model:value="formData.primaryType"
            :options="primaryTypeOptions"
            :disabled="formData.types.length === 0"
            placeholder="请选择主病害类型"
          />
        </n-form-item>

        <n-form-item label="严重等级">
          <div class="severity-selector">
            <n-space :size="8">
              <div
                v-for="level in 5"
                :key="level"
                class="severity-btn"
                :class="{ active: formData.severity === level }"
                :style="{
                  backgroundColor: formData.severity === level ? getSeverityColor(level) : 'transparent',
                  borderColor: getSeverityColor(level),
                  color: formData.severity === level ? '#fff' : getSeverityColor(level)
                }"
                @click="formData.severity = level as DiseaseSeverity"
              >
                {{ level }}级
              </div>
            </n-space>
            <span class="severity-label">
              {{ DISEASE_SEVERITY_LABELS[formData.severity] }}
            </span>
          </div>
        </n-form-item>

        <n-form-item label="发现时间">
          <n-date-picker
            v-model:value="formData.discoveredAt"
            type="datetime"
            style="width: 100%"
          />
        </n-form-item>

        <n-form-item label="面积">
          <n-input-number
            v-model:value="formData.area"
            disabled
            style="width: 100%"
          />
          <span class="unit">像素</span>
        </n-form-item>

        <n-form-item label="说明">
          <n-input
            v-model:value="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入病害详细描述"
          />
        </n-form-item>

        <n-form-item label="修复建议">
          <n-input
            v-model:value="formData.treatmentSuggestion"
            type="textarea"
            :rows="3"
            placeholder="请输入修复处理建议"
          />
        </n-form-item>
      </n-form>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import {
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NSpace,
  NDatePicker,
  NInputNumber,
  NModal,
  NCheckboxGroup,
  NCheckbox
} from 'naive-ui'
import type { DiseaseType, DiseaseSeverity, DiseaseAnnotation } from '../types'
import {
  DISEASE_TYPE_LABELS,
  DISEASE_TYPE_COLORS,
  DISEASE_SEVERITY_LABELS,
  DISEASE_SEVERITY_COLORS
} from '../types'

const props = defineProps<{
  show: boolean
  disease?: DiseaseAnnotation | null
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'save', data: Partial<DiseaseAnnotation>): void
}>()

const showModal = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
})

const isEdit = computed(() => !!props.disease)

const diseaseTypeOptions = [
  { label: '褪色', value: 'fading' as DiseaseType, color: DISEASE_TYPE_COLORS.fading },
  { label: '剥落', value: 'peeling' as DiseaseType, color: DISEASE_TYPE_COLORS.peeling },
  { label: '裂缝', value: 'crack' as DiseaseType, color: DISEASE_TYPE_COLORS.crack },
  { label: '污损', value: 'stain' as DiseaseType, color: DISEASE_TYPE_COLORS.stain },
  { label: '其他', value: 'other' as DiseaseType, color: DISEASE_TYPE_COLORS.other }
]

const primaryTypeOptions = computed(() => {
  return diseaseTypeOptions
    .filter(opt => formData.value.types.includes(opt.value))
    .map(opt => ({
      label: `${opt.label} (主类型)`,
      value: opt.value
    }))
})

const defaultFormData = {
  name: '',
  types: ['fading'] as DiseaseType[],
  primaryType: 'fading' as DiseaseType,
  severity: 3 as DiseaseSeverity,
  description: '',
  discoveredAt: Date.now(),
  treatmentSuggestion: '',
  area: 0
}

const formData = ref({ ...defaultFormData })

function getSeverityColor(level: number): string {
  return DISEASE_SEVERITY_COLORS[level as DiseaseSeverity]
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    if (props.disease) {
      formData.value = {
        name: props.disease.name,
        types: [...props.disease.types],
        primaryType: props.disease.primaryType,
        severity: props.disease.severity,
        description: props.disease.description,
        discoveredAt: props.disease.discoveredAt,
        treatmentSuggestion: props.disease.treatmentSuggestion,
        area: props.disease.area
      }
    } else {
      formData.value = { ...defaultFormData, discoveredAt: Date.now() }
    }
  }
})

watch(() => formData.value.types, (newTypes) => {
  if (newTypes.length > 0 && !newTypes.includes(formData.value.primaryType)) {
    formData.value.primaryType = newTypes[0]
  }
}, { deep: true })

function handleSave() {
  if (!formData.value.name.trim()) {
    formData.value.name = `${DISEASE_TYPE_LABELS[formData.value.primaryType]}病害`
  }

  if (formData.value.types.length === 0) {
    formData.value.types = [formData.value.primaryType]
  }

  emit('save', {
    name: formData.value.name.trim(),
    types: [...formData.value.types],
    primaryType: formData.value.primaryType,
    severity: formData.value.severity,
    description: formData.value.description.trim(),
    discoveredAt: formData.value.discoveredAt,
    treatmentSuggestion: formData.value.treatmentSuggestion.trim()
  })

  showModal.value = false
}

function handleCancel() {
  showModal.value = false
}
</script>

<style scoped>
.disease-edit-form {
  padding: 8px 0;
}

.type-selector {
  width: 100%;
}

.type-color-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 4px;
  vertical-align: middle;
}

.severity-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.severity-btn {
  width: 40px;
  height: 40px;
  border: 2px solid;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.severity-btn:hover {
  transform: scale(1.05);
}

.severity-btn.active {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.severity-label {
  font-size: 13px;
  color: #666;
  margin-left: 8px;
}

.unit {
  margin-left: 8px;
  font-size: 12px;
  color: #999;
}
</style>
