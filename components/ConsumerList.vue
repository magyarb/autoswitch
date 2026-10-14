<template>
  <div class="panel">
    <div v-if="!modelValue.length" class="empty">
      <span class="muted">{{ emptyText }}</span>
    </div>
    <draggable
      v-else
      :model-value="modelValue"
      item-key="name"
      handle=".drag-handle"
      :animation="150"
      ghost-class="ghost"
      @update:model-value="emit('update:modelValue', $event)"
      @start="emit('dragStart')"
      @end="emit('dragEnd')"
    >
      <template #item="{ element: consumer, index }">
        <div class="consumer">
          <div class="drag-handle" aria-label="Drag to change priority">
            <v-icon :icon="mdiDragVertical" size="20" />
            <span class="priority">{{ index + 1 }}</span>
          </div>

          <div class="identity">
            <div class="name">{{ consumer.name }}</div>
            <div class="details">Phase {{ consumer.phase }} · {{ consumer.ip }}</div>
          </div>

          <div class="status">
            <template v-if="consumer.pending && consumer.online">
              <v-progress-circular indeterminate size="12" width="2" />
              <span>Applying</span>
            </template>
            <template v-else-if="!consumer.online">
              <v-icon :icon="mdiWifiOff" size="16" color="error" />
              <span>Offline</span>
            </template>
            <template v-else>
              <span class="dot" :class="consumer.status"></span>
              <span>{{ statusLabel(consumer.status) }}</span>
            </template>
          </div>

          <div class="power">
            <div class="power-value">
              {{ formatPower(consumer.current_consumption) }}
              <span class="muted">/ {{ formatPower(consumer.max_consumption) }}</span>
            </div>
            <div
              class="meter"
              role="meter"
              :aria-valuenow="consumer.current_consumption ?? 0"
              :aria-valuemax="consumer.max_consumption"
            >
              <div class="meter-fill" :style="{ width: meterWidth(consumer) }"></div>
            </div>
          </div>

          <v-btn-toggle
            :model-value="consumer.mode"
            mandatory
            density="compact"
            variant="text"
            class="segmented mode"
            @update:model-value="emit('modeChanged', consumer, $event)"
          >
            <v-btn value="off">Off</v-btn>
            <v-btn value="auto" color="primary">Auto</v-btn>
            <v-btn value="on" color="success">On</v-btn>
          </v-btn-toggle>

          <v-btn
            class="edit"
            :icon="mdiPencilOutline"
            variant="text"
            density="comfortable"
            :aria-label="`Edit ${consumer.name}`"
            @click="emit('edit', consumer.name)"
          />
        </div>
      </template>
    </draggable>
  </div>
</template>

<script setup lang="ts">
import draggable from 'vuedraggable'
import { mdiDragVertical, mdiPencilOutline, mdiWifiOff } from '@mdi/js'
import { Consumer, ConsumerMode } from '~/stores/main'
import { formatPower } from '~/utils/format'

defineProps<{
  modelValue: Consumer[]
  emptyText: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Consumer[]): void
  (e: 'dragStart'): void
  (e: 'dragEnd'): void
  (e: 'modeChanged', consumer: Consumer, mode: ConsumerMode): void
  (e: 'edit', name: string): void
}>()

function statusLabel(status: Consumer['status']) {
  if (status === 'on') return 'On'
  if (status === 'off') return 'Off'
  return 'Unknown'
}

function meterWidth(consumer: Consumer) {
  if (!consumer.current_consumption || !consumer.max_consumption) return '0%'
  return `${Math.min(100, (consumer.current_consumption / consumer.max_consumption) * 100)}%`
}
</script>

<style scoped>
.empty {
  padding: 32px;
  text-align: center;
}

.consumer {
  display: grid;
  grid-template-columns: 52px minmax(140px, 1fr) 110px 170px auto 40px;
  grid-template-areas: 'handle identity status power mode edit';
  align-items: center;
  gap: 12px;
  padding: 10px 16px 10px 8px;
}

.consumer + .consumer {
  border-top: 1px solid var(--viz-hairline);
}

.ghost {
  opacity: 0.4;
}

.drag-handle {
  grid-area: handle;
  display: flex;
  align-items: center;
  gap: 2px;
  cursor: grab;
  color: var(--viz-muted);
}

.priority {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.identity {
  grid-area: identity;
  min-width: 0;
}

.name {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.details {
  font-size: 12px;
  color: var(--viz-muted);
}

.status {
  grid-area: status;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--viz-text-secondary);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--viz-muted);
}

.dot.on {
  background: var(--status-good);
}

.power {
  grid-area: power;
}

.power-value {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* meter: the track is a lighter step of the fill's ramp */
.meter {
  height: 4px;
  border-radius: 2px;
  margin-top: 4px;
  background: var(--track-consumption);
  overflow: hidden;
}

.meter-fill {
  height: 100%;
  border-radius: 2px;
  background: var(--series-consumption);
  transition: width 0.4s ease;
}

.mode {
  grid-area: mode;
  justify-self: start;
}

.edit {
  grid-area: edit;
}

@media (max-width: 960px) {
  .consumer {
    grid-template-columns: 52px 1fr auto;
    grid-template-areas:
      'handle identity edit'
      '. status power'
      '. mode mode';
    row-gap: 8px;
  }
}
</style>
