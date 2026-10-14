<template>
  <v-dialog :model-value="modelValue" :fullscreen="$vuetify.display.smAndDown" :persistent="true" :max-width="480">
    <v-card class="pa-2">
      <v-card-title class="d-flex align-center">
        <span>{{ props.consumerName ? `Edit ${props.consumerName}` : 'New consumer' }}</span>
        <v-spacer />
        <v-btn
          :icon="mdiClose"
          variant="text"
          density="comfortable"
          aria-label="Close"
          @click="$emit('cancelClicked')"
        />
      </v-card-title>
      <v-form ref="form" @submit.prevent="save">
        <v-card-text class="d-flex flex-column ga-2">
          <v-alert v-if="saveError" type="error" variant="tonal" density="compact">{{ saveError }}</v-alert>
          <v-text-field v-model.trim="editedItem.name" label="Name" :rules="[required, maxLength(32)]"></v-text-field>
          <v-text-field
            v-model.trim="editedItem.ip"
            label="IP address"
            hint="Gen1 relay, e.g. Shelly Plug S or 1PM"
            :rules="[required, maxLength(40)]"
          ></v-text-field>
          <div class="d-flex ga-3">
            <v-select
              v-model="editedItem.phase"
              label="Phase"
              :items="['A', 'B', 'C']"
              :rules="[required]"
              class="flex-1"
            ></v-select>
            <v-text-field
              v-model.number="editedItem.max_consumption"
              label="Max consumption"
              type="number"
              suffix="W"
              :rules="[positive]"
              class="flex-1"
            ></v-text-field>
          </div>
          <v-select v-model="editedItem.mode" label="Mode" :items="MODES" :rules="[required]"></v-select>
        </v-card-text>

        <v-card-actions class="px-6 pb-4">
          <v-btn
            v-if="props.consumerName"
            color="error"
            variant="text"
            :prepend-icon="mdiDeleteOutline"
            :loading="isDeleting"
            @click="remove"
          >
            Delete
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="$emit('cancelClicked')">Cancel</v-btn>
          <v-btn type="submit" color="primary" variant="flat" :loading="isSaving">Save</v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { mdiClose, mdiDeleteOutline } from '@mdi/js'
import { ConsumerInput, useMainStore } from '~/stores/main'

const MODES = [
  { title: 'Auto: switched by the surplus', value: 'auto' },
  { title: 'Always on', value: 'on' },
  { title: 'Always off', value: 'off' }
]

const mainStore = useMainStore()
const shelly = useShelly()

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  consumerName: {
    type: String,
    required: false,
    default: undefined
  }
})
const emits = defineEmits(['cancelClicked', 'confirmClicked'])

const required = (value: unknown) => (value !== undefined && value !== null && value !== '') || 'Required'
const maxLength = (max: number) => (value: string | undefined) => (value ?? '').length <= max || `Max ${max} characters`
const positive = (value: unknown) => Number(value) > 0 || 'Must be a positive number'

const form = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const editedItem = ref<Partial<ConsumerInput>>({})
const isSaving = ref(false)
const isDeleting = ref(false)
const saveError = ref<string | null>(null)

watch(
  () => props.modelValue,
  isOpen => {
    if (!isOpen) return
    saveError.value = null
    const found = props.consumerName ? mainStore.consumers.find(c => c.name === props.consumerName) : undefined
    editedItem.value = found
      ? {
          name: found.name,
          ip: found.ip,
          phase: found.phase,
          max_consumption: found.max_consumption,
          mode: found.mode
        }
      : { mode: 'auto' }
  },
  { immediate: true }
)

async function save() {
  if (!form.value || !(await form.value.validate()).valid) return
  isSaving.value = true
  saveError.value = null
  try {
    const consumer = editedItem.value as ConsumerInput
    await shelly.setConsumer(consumer, props.consumerName)
    logEvent(
      props.consumerName ? 'consumer.updated' : 'consumer.added',
      props.consumerName ? `${props.consumerName} updated` : `${consumer.name} added`,
      {
        attributes: { 'consumer.name': consumer.name, 'consumer.phase': consumer.phase, 'consumer.mode': consumer.mode }
      }
    )
    emits('confirmClicked')
  } catch (e) {
    saveError.value = errorMessage(e)
    logEvent('consumer.save_failed', `Saving ${editedItem.value.name} failed: ${saveError.value}`, {
      severity: 'ERROR'
    })
  } finally {
    isSaving.value = false
  }
}

async function remove() {
  if (!props.consumerName || !window.confirm(`Delete ${props.consumerName}?`)) return
  isDeleting.value = true
  saveError.value = null
  try {
    await shelly.deleteConsumer(props.consumerName)
    logEvent('consumer.deleted', `${props.consumerName} deleted`)
    emits('confirmClicked')
  } catch (e) {
    saveError.value = errorMessage(e)
    logEvent('consumer.delete_failed', `Deleting ${props.consumerName} failed: ${saveError.value}`, {
      severity: 'ERROR'
    })
  } finally {
    isDeleting.value = false
  }
}
</script>
<style scoped>
.flex-1 {
  flex: 1;
}
</style>
