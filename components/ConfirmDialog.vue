<template>
  <v-dialog :model-value="modelValue" :max-width="440" @update:model-value="!$event && $emit('cancel')">
    <v-card class="pa-2">
      <v-card-title>{{ title }}</v-card-title>
      <v-card-text class="text">{{ text }}</v-card-text>
      <v-card-actions class="px-6 pb-4">
        <v-spacer />
        <v-btn variant="text" @click="$emit('cancel')">Cancel</v-btn>
        <v-btn color="primary" variant="flat" @click="$emit('confirm')">{{ confirmLabel }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean; title: string; text: string; confirmLabel: string }>()
defineEmits<{ (e: 'confirm'): void; (e: 'cancel'): void }>()
</script>

<style scoped>
.text {
  color: var(--viz-text-secondary);
  line-height: 1.5;
}
</style>
