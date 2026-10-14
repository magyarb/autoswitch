<template>
  <v-dialog :model-value="modelValue" :fullscreen="$vuetify.display.smAndDown" :persistent="true" :max-width="480">
    <v-card class="pa-2">
      <v-card-title class="d-flex align-center">
        <span>Settings</span>
        <v-spacer />
        <v-btn
          :icon="mdiClose"
          variant="text"
          density="comfortable"
          aria-label="Close"
          @click="$emit('cancelClicked')"
        />
      </v-card-title>
      <v-card-text class="d-flex flex-column ga-2">
        <div class="d-flex ga-3">
          <v-text-field
            v-model.trim="controllerIp"
            label="Controller IP"
            hint="The device running the autoswitch script"
            class="flex-2"
          ></v-text-field>
          <v-text-field v-model.number="scriptId" label="Script id" type="number" class="flex-1"></v-text-field>
        </div>
        <v-text-field
          v-model.trim="productionIp"
          label="Production meter IP"
          hint="Used for the history. The script's own meter IPs are set at the top of fw.js."
        ></v-text-field>
        <v-text-field
          v-model.trim="consumptionIp"
          label="Consumption meter IP"
          hint="Used for the history. The script's own meter IPs are set at the top of fw.js."
        ></v-text-field>
      </v-card-text>

      <v-card-actions class="px-6 pb-4">
        <v-spacer />
        <v-btn variant="text" @click="$emit('cancelClicked')">Cancel</v-btn>
        <v-btn color="primary" variant="flat" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { mdiClose } from '@mdi/js'
import { useMainStore } from '~/stores/main'

const mainStore = useMainStore()

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
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
</script>
<style scoped>
.flex-1 {
  flex: 1;
}

.flex-2 {
  flex: 2;
}
</style>
