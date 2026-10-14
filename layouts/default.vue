<template>
  <v-app>
    <v-app-bar flat density="comfortable" class="app-bar">
      <nuxt-link to="/" class="brand">
        <v-icon :icon="mdiSolarPowerVariantOutline" color="primary" />
        <span>Autoswitch</span>
      </nuxt-link>

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
import { mdiCogOutline, mdiSolarPowerVariantOutline, mdiWeatherNight, mdiWhiteBalanceSunny } from '@mdi/js'
import { useTheme } from 'vuetify'
import ConnectionStatus from '~/components/ConnectionStatus.vue'
import SettingsDialog from '~/components/SettingsDialog.vue'
import { useMainStore } from '~/stores/main'

const theme = useTheme()
const mainStore = useMainStore()
const settingsDialog = ref(false)

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
</style>
