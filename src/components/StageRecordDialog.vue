<template>
  <n-modal
    v-model:show="showDialog"
    preset="dialog"
    :title="dialogTitle"
    :positive-text="'保存'"
    :negative-text="'取消'"
    @positive-click="handleSave"
    @negative-click="handleCancel"
    :mask-closable="false"
    class="stage-record-dialog"
  >
    <div class="dialog-content">
      <n-form :model="formData" label-placement="top">
        <div class="form-section">
          <div class="section-title">基本信息</div>

          <n-form-item label="检查阶段">
            <n-select
              v-model:value="formData.stage"
              :options="stageOptions"
              :disabled="mode === 'edit'"
            />
          </n-form-item>

          <n-form-item label="检查人">
            <n-input v-model:value="formData.inspectorName" placeholder="请输入检查人姓名" />
          </n-form-item>

          <n-form-item label="检查时间">
            <n-date-picker
              v-model:value="formData.inspectTime"
              type="datetime"
              style="width: 100%"
            />
          </n-form-item>
        </div>

        <div class="form-section">
          <div class="section-title">检查数据</div>

          <n-form-item label="检查面积 (像素)">
            <n-input-number
              v-model:value="formData.area"
              :min="0"
              placeholder="请输入面积"
              style="width: 100%"
            />
          </n-form-item>

          <n-form-item label="严重程度">
            <n-select
              v-model:value="formData.severity"
              :options="severityOptions"
              placeholder="请选择严重程度"
            />
          </n-form-item>
        </div>

        <div class="form-section">
          <div class="section-title">检查结论与意见</div>

          <n-form-item label="检查结论">
            <n-input
              v-model:value="formData.conclusion"
              type="textarea"
              :rows="3"
              placeholder="请输入检查结论"
            />
          </n-form-item>

          <n-form-item label="处理意见">
            <n-input
              v-model:value="formData.treatmentOpinion"
              type="textarea"
              :rows="3"
              placeholder="请输入处理意见"
            />
          </n-form-item>

          <n-form-item label="备注">
            <n-input
              v-model:value="formData.notes"
              type="textarea"
              :rows="2"
              placeholder="请输入备注信息（选填）"
            />
          </n-form-item>
        </div>

        <div class="form-section">
          <div class="section-title">照片附件</div>
          <div class="photo-upload-area">
            <n-upload
              :show-file-list="false"
              :before-upload="handleBeforeUpload"
              accept="image/*"
              multiple
            >
              <n-button size="small">
                <template #icon>
                  <n-icon><add-outline /></n-icon>
                </template>
                添加照片
              </n-button>
            </n-upload>
            <div v-if="formData.photos.length > 0" class="photo-list">
              <div
                v-for="photo in formData.photos"
                :key="photo.id"
                class="photo-item"
              >
                <img :src="photo.url" :alt="photo.name" />
                <span class="photo-name">{{ photo.name }}</span>
                <n-button
                  size="tiny"
                  text
                  type="error"
                  class="remove-btn"
                  @click="handleRemovePhoto(photo.id)"
                >
                  <template #icon>
                    <n-icon><close-outline /></n-icon>
                  </template>
                </n-button>
              </div>
            </div>
          </div>
        </div>
      </n-form>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  NModal,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
  NDatePicker,
  NUpload,
  NButton,
  NIcon,
  useMessage
} from 'naive-ui'
import { AddOutline, CloseOutline } from '@vicons/ionicons5'
import type {
  DiseaseAnnotation,
  DiseaseStage,
  DiseaseStageRecord,
  DiseaseSeverity,
  DiseasePhotoAttachment
} from '../types'
import {
  DISEASE_STAGE_LABELS,
  DISEASE_SEVERITY_LABELS
} from '../types'

interface Props {
  show: boolean
  disease: DiseaseAnnotation | null | undefined
  record: DiseaseStageRecord | null
  stage: DiseaseStage
  mode: 'add' | 'edit'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'save', data: any): void
}>()

const message = useMessage()

const showDialog = computed({
  get: () => props.show,
  set: (value: boolean) => emit('update:show', value)
})

const dialogTitle = computed(() => {
  if (props.mode === 'add') {
    return `添加${DISEASE_STAGE_LABELS[props.stage]}记录`
  }
  return '编辑检查记录'
})

interface FormData {
  stage: DiseaseStage
  inspectorName: string
  inspectTime: number
  area: number | null
  severity: DiseaseSeverity | null
  conclusion: string
  treatmentOpinion: string
  notes: string
  photos: DiseasePhotoAttachment[]
}

const formData = ref<FormData>({
  stage: 'recheck',
  inspectorName: '',
  inspectTime: Date.now(),
  area: null,
  severity: null,
  conclusion: '',
  treatmentOpinion: '',
  notes: '',
  photos: []
})

const stageOptions = [
  { label: DISEASE_STAGE_LABELS.initial, value: 'initial' },
  { label: DISEASE_STAGE_LABELS.recheck, value: 'recheck' },
  { label: DISEASE_STAGE_LABELS.treatment, value: 'treatment' },
  { label: DISEASE_STAGE_LABELS.reinspection, value: 'reinspection' }
]

const severityOptions = [
  { label: DISEASE_SEVERITY_LABELS[1], value: 1 },
  { label: DISEASE_SEVERITY_LABELS[2], value: 2 },
  { label: DISEASE_SEVERITY_LABELS[3], value: 3 },
  { label: DISEASE_SEVERITY_LABELS[4], value: 4 },
  { label: DISEASE_SEVERITY_LABELS[5], value: 5 }
]

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      if (props.mode === 'edit' && props.record) {
        formData.value = {
          stage: props.record.stage,
          inspectorName: props.record.inspectorName,
          inspectTime: props.record.inspectTime,
          area: props.record.area ?? null,
          severity: props.record.severity ?? null,
          conclusion: props.record.conclusion,
          treatmentOpinion: props.record.treatmentOpinion,
          notes: props.record.notes || '',
          photos: [...props.record.photos]
        }
      } else {
        formData.value = {
          stage: props.stage,
          inspectorName: '',
          inspectTime: Date.now(),
          area: props.disease?.area ?? null,
          severity: props.disease?.severity ?? null,
          conclusion: '',
          treatmentOpinion: '',
          notes: '',
          photos: []
        }
      }
    }
  }
)

function handleBeforeUpload(file: File): boolean {
  if (!file.type.startsWith('image/')) {
    message.error('只能上传图片文件')
    return false
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    const photo: DiseasePhotoAttachment = {
      id: generateId(),
      name: file.name,
      url: e.target?.result as string,
      size: file.size,
      uploadedAt: Date.now()
    }
    formData.value.photos.push(photo)
  }
  reader.readAsDataURL(file)

  return false
}

function handleRemovePhoto(photoId: string) {
  const index = formData.value.photos.findIndex(p => p.id === photoId)
  if (index !== -1) {
    formData.value.photos.splice(index, 1)
  }
}

function handleSave() {
  if (!formData.value.inspectorName.trim()) {
    message.warning('请输入检查人姓名')
    return
  }

  const data: any = {
    stage: formData.value.stage,
    inspectorName: formData.value.inspectorName.trim(),
    inspectTime: formData.value.inspectTime,
    conclusion: formData.value.conclusion.trim(),
    treatmentOpinion: formData.value.treatmentOpinion.trim(),
    notes: formData.value.notes.trim(),
    photos: formData.value.photos
  }

  if (formData.value.area !== null) {
    data.area = formData.value.area
  }
  if (formData.value.severity !== null) {
    data.severity = formData.value.severity
  }

  emit('save', data)
}

function handleCancel() {
  showDialog.value = false
}
</script>

<style scoped>
.dialog-content {
  padding-top: 12px;
}

.form-section {
  margin-bottom: 20px;
}

.form-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid #1677ff;
}

.photo-upload-area {
  padding: 8px 0;
}

.photo-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
}

.photo-item {
  width: 100px;
  height: 100px;
  border-radius: 6px;
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
  padding: 4px 6px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 11px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.remove-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  padding: 2px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
}
</style>
