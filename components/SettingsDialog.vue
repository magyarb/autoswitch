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
        <v-text-field
          v-model.trim="controllerIp"
          label="Controller IP"
          hint="The device running the autoswitch script"
          :variant="'underlined'"
        ></v-text-field>
        <v-text-field
          v-model.number="scriptId"
          label="Script id"
          type="number"
          hint="Id of the autoswitch script on the controller"
          :variant="'underlined'"
        ></v-text-field>
        <v-text-field
          v-model.trim="productionIp"
          label="Production meter IP"
          hint="Used for the chart. The script's own meter IPs are set at the top of fw.js."
          :variant="'underlined'"
        ></v-text-field>
        <v-text-field
          v-model.trim="consumptionIp"
          label="Consumption meter IP"
          hint="Used for the chart. The script's own meter IPs are set at the top of fw.js."
          :variant="'underlined'"
        ></v-text-field>
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

const controllerIp = ref('')
const productionIp = ref('')
const consumptionIp = ref('')
const scriptId = ref(1)

watch(
  () => props.modelValue,
  isOpen => {
    if (!isOpen) return
    controllerIp.value = mainStore.controllerIp
    productionIp.value = mainStore.productionIp
    consumptionIp.value = mainStore.consumptionIp
    scriptId.value = mainStore.scriptId
  },
  { immediate: true }
)

function save() {
  mainStore.controllerIp = controllerIp.value
  mainStore.productionIp = productionIp.value
  mainStore.consumptionIp = consumptionIp.value
  mainStore.scriptId = scriptId.value
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
