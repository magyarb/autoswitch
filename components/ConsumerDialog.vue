<template>
  <v-dialog :model-value="modelValue" :fullscreen="$vuetify.display.smAndDown" :persistent="true" :max-width="500">
    <v-card>
      <v-toolbar>
        <v-toolbar-title v-if="props.consumerName">Edit {{ props.consumerName }}</v-toolbar-title>
        <v-toolbar-title v-else>New consumer</v-toolbar-title>
        <v-spacer />
        <v-btn icon @click="$emit('cancelClicked')">
          <v-icon>$mdi-close</v-icon>
        </v-btn>
      </v-toolbar>
      <v-form ref="form" @submit.prevent="save">
        <v-card-text>
          <v-alert v-if="saveError" type="error" variant="tonal" class="mb-4">{{ saveError }}</v-alert>
          <v-text-field
            v-model.trim="editedItem.name"
            label="Name"
            :rules="[required, maxLength(32)]"
            :variant="'underlined'"
          ></v-text-field>
          <v-text-field
            v-model.trim="editedItem.ip"
            label="IP"
            :rules="[required, maxLength(40)]"
            :variant="'underlined'"
          ></v-text-field>
          <v-select
            v-model="editedItem.phase"
            label="Phase"
            :items="['A', 'B', 'C']"
            :rules="[required]"
            :variant="'underlined'"
          ></v-select>
          <v-text-field
            v-model.number="editedItem.max_consumption"
            label="Max consumption"
            type="number"
            suffix="W"
            :rules="[positive]"
            :variant="'underlined'"
          ></v-text-field>
          <v-select
            v-model="editedItem.mode"
            label="Mode"
            :items="['auto', 'on', 'off']"
            :rules="[required]"
            :variant="'underlined'"
          ></v-select>
        </v-card-text>

        <v-card-actions>
          <v-btn
            v-if="props.consumerName"
            color="error"
            :variant="computedButtonVariant"
            :loading="isDeleting"
            @click="remove"
          >
            delete
          </v-btn>
          <v-btn type="submit" :color="'success'" :variant="computedButtonVariant" :loading="isSaving" class="flex-1">
            save
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { PropType } from 'vue'
import { useTheme } from 'vuetify'
import { ConsumerInput, useMainStore } from '~/stores/main'
const theme = useTheme()
const mainStore = useMainStore()
const shelly = useShelly()

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  buttonVariant: {
    type: String as PropType<'flat' | 'tonal' | 'text' | 'elevated' | 'outlined' | 'plain' | undefined>,
    required: false,
    default: undefined
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
    await shelly.setConsumer(editedItem.value as ConsumerInput, props.consumerName)
    emits('confirmClicked')
  } catch (e) {
    saveError.value = errorMessage(e)
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
    emits('confirmClicked')
  } catch (e) {
    saveError.value = errorMessage(e)
  } finally {
    isDeleting.value = false
  }
}

const computedButtonVariant = computed(() => {
  if (props.buttonVariant) return props.buttonVariant
  else if (theme.global.current.value.dark) return 'tonal'
  return 'flat'
})
</script>
<style scoped>
.flex-1 {
  flex: 1;
}
</style>
