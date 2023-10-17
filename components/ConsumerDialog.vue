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
      <v-card-text>
        <v-text-field v-model="editedItem.name" label="Name" :variant="'underlined'"></v-text-field>
        <v-text-field v-model="editedItem.ip" label="IP" :variant="'underlined'"></v-text-field>
        <v-text-field
          v-model="editedItem.max_consumption"
          label="Max consumption"
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
import _ from 'lodash'
import { PropType } from 'vue'
import { useTheme } from 'vuetify'
import { Consumer, useMainStore } from '~/stores/main'
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
  },
  consumerName: {
    type: String,
    required: false,
    default: undefined
  }
})

const editedItem = ref<Partial<Consumer>>({
  name: undefined,
  ip: undefined,
  max_consumption: undefined
})

watch(
  () => props.modelValue,
  _val => {
    if (props.consumerName) {
      const foundItem = mainStore.consumers.find(c => c.name === props.consumerName)
      if (foundItem) editedItem.value = _.cloneDeep(foundItem)
      else editedItem.value = { name: undefined, ip: undefined, max_consumption: undefined }
    } else editedItem.value = { name: undefined, ip: undefined, max_consumption: undefined }
  },
  { immediate: true }
)
const emits = defineEmits(['cancelClicked', 'confirmClicked'])

function save() {
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
