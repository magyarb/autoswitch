<template>
  <v-app>
    <v-app-bar flat density="comfortable" class="app-bar">
      <nuxt-link to="/" class="brand">
        <v-icon :icon="mdiSolarPowerVariantOutline" color="primary" />
        <span class="brand-name">Autoswitch</span>
      </nuxt-link>
      <nav class="nav">
        <v-btn to="/" variant="text" size="small" :prepend-icon="mdiViewDashboardOutline" exact>Dashboard</v-btn>
        <v-btn to="/devices" variant="text" size="small" :prepend-icon="mdiChip">Devices</v-btn>
      </nav>

      <v-spacer />
      <ConnectionStatus />
      <v-btn
        :icon="mainStore.theme === 'dark' ? mdiWhiteBalanceSunny : mdiWeatherNight"
        variant="text"
        aria-label="Switch theme"
        @click="mainStore.theme = mainStore.theme === 'dark' ? 'light' : 'dark'"
      />
      <v-btn :icon="mdiCogOutline" variant="text" class="mr-2" aria-label="Settings" @click="settingsDialog = true" />
    </v-app-bar>

    <SettingsDialog
      v-model="settingsDialog"
      @cancel-clicked="settingsDialog = false"
      @confirm-clicked="settingsDialog = false"
    />

    <v-main>
      <v-container fluid class="py-6 px-4 px-md-8">
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import {
  mdiChip,
  mdiCogOutline,
  mdiSolarPowerVariantOutline,
  mdiViewDashboardOutline,
  mdiWeatherNight,
  mdiWhiteBalanceSunny
} from '@mdi/js'
import { useTheme } from 'vuetify'
import ConnectionStatus from '~/components/ConnectionStatus.vue'
import SettingsDialog from '~/components/SettingsDialog.vue'
import { useMainStore } from '~/stores/main'

const theme = useTheme()
const mainStore = useMainStore()
const settingsDialog = ref(false)

// on every page, so device activity reaches Dash0 whenever the app is open
useDeviceActivityPolling()

watch(
  () => mainStore.theme,
  name => (theme.global.name.value = name),
  { immediate: true }
)
</script>

<style scoped>
.app-bar {
  border-bottom: 1px solid var(--viz-hairline);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: 20px;
  font-size: 18px;
  font-weight: 600;
  text-decoration: none;
  color: inherit;
}

.nav {
  display: flex;
  gap: 4px;
  margin-left: 24px;
}

.nav .v-btn:not(.v-btn--active) {
  color: var(--viz-text-secondary);
}

@media (max-width: 600px) {
  .brand-name {
    display: none;
  }

  .nav {
    margin-left: 8px;
  }

  .nav :deep(.v-btn__prepend) {
    margin-inline-end: 0;
  }

  .nav :deep(.v-btn__content) {
    display: none;
  }
}
</style>
