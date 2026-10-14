<template>
  <div class="page">
    <section>
      <div class="section-header">
        <h2 class="section-title">Devices</h2>
        <span class="muted ml-3 hint">Updates run from this browser, so it has to be on the home network</span>
      </div>
      <ScriptCard />
    </section>

    <FirmwareList class="mt-8" />

    <ActivityLog class="mt-8" />
  </div>
</template>

<script setup lang="ts">
import ActivityLog from '~/components/ActivityLog.vue'
import FirmwareList from '~/components/FirmwareList.vue'
import ScriptCard from '~/components/ScriptCard.vue'

// keeps the installed version and the consumer list (for the firmware check) up to date
useControllerPolling(() => true)
</script>

<style scoped>
.page {
  max-width: 1200px;
  margin: 0 auto;
}

.hint {
  font-size: 13px;
}

@media (max-width: 600px) {
  .hint {
    display: none;
  }
}
</style>
