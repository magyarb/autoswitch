<template>
  <v-dialog :model-value="modelValue" :fullscreen="$vuetify.display.smAndDown" :persistent="true" :max-width="500">
    <v-card>
      <v-toolbar>
        <v-toolbar-title>Settings</v-toolbar-title>
        <v-spacer />
        <v-btn icon @click="$emit('cancelClicked')">
          <v-icon>$mdi-close</v-icon>
        </v-btn>
      </v-toolbar>
      <v-card-text>
        <v-text-field v-model="controllerIp" label="Controller IP" :variant="'underlined'"></v-text-field>
        <v-text-field v-model="productionIp" label="Production IP" :variant="'underlined'"></v-text-field>
        <v-text-field v-model="consumptionIp" label="Consumption IP" :variant="'underlined'"></v-text-field>
      </v-card-text>

      <v-card-actions>
        <v-btn :color="'success'" :variant="computedButtonVariant" class="flex-1" @click="save"> save </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { PropType } from 'vue'
import { useTheme } from 'vuetify'
import { useMainStore } from '~/stores/main'
const theme = useTheme()
const mainStore = useMainStore()

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  buttonVariant: {
    type: String as PropType<'flat' | 'tonal' | 'text' | 'elevated' | 'outlined' | 'plain' | undefined>,
    required: false,
    default: undefined
  }
})

const emits = defineEmits(['cancelClicked', 'confirmClicked'])

const controllerIp = ref<null | string>(null)
const productionIp = ref<null | string>(null)
const consumptionIp = ref<null | string>(null)

watch(
  () => props.modelValue,
  _val => {
    controllerIp.value = mainStore.controllerIp
  },
  { immediate: true }
)

function save() {
  mainStore.controllerIp = controllerIp.value
  emits('confirmClicked')
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
