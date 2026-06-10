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

        <n-form-item label="类型">
          <n-select
            v-model:value="formData.type"
            :options="diseaseTypeOptions"
          />
        </n-form-item>

        <n-form-item label="严重程度">
          <n-radio-group v-model:value="formData.severity">
            <n-space>
              <n-radio value="mild">
                <span style="color: #22c55e">●</span> 轻微
              </n-radio>
              <n-radio value="moderate">
                <span style="color: #f59e0b">●</span> 中等
              </n-radio>
              <n-radio value="severe">
                <span style="color: #ef4444">●</span> 严重
              </n-radio>
            </n-space>
          </n-radio-group>
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
  NRadioGroup,
  NRadio,
  NSpace,
  NDatePicker,
  NInputNumber,
  NModal
} from 'naive-ui'
import type { DiseaseType, DiseaseSeverity, DiseaseAnnotation } from '../types'
import { DISEASE_TYPE_LABELS, DISEASE_TYPE_COLORS } from '../types'

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
  { label: '褪色', value: 'fading', color: DISEASE_TYPE_COLORS.fading },
  { label: '剥落', value: 'peeling', color: DISEASE_TYPE_COLORS.peeling },
  { label: '裂缝', value: 'crack', color: DISEASE_TYPE_COLORS.crack },
  { label: '污损', value: 'stain', color: DISEASE_TYPE_COLORS.stain },
  { label: '其他', value: 'other', color: DISEASE_TYPE_COLORS.other }
]

const defaultFormData = {
  name: '',
  type: 'fading' as DiseaseType,
  severity: 'mild' as DiseaseSeverity,
  description: '',
  discoveredAt: Date.now(),
  treatmentSuggestion: '',
  area: 0
}

const formData = ref({ ...defaultFormData })

watch(() => props.show, (newVal) => {
  if (newVal) {
    if (props.disease) {
      formData.value = {
        name: props.disease.name,
        type: props.disease.type,
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

function handleSave() {
  if (!formData.value.name.trim()) {
    formData.value.name = `${DISEASE_TYPE_LABELS[formData.value.type]}病害`
  }

  emit('save', {
    name: formData.value.name.trim(),
    type: formData.value.type,
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

.unit {
  margin-left: 8px;
  font-size: 12px;
  color: #999;
}
</style>
