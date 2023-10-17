<template>
  <v-app>
    <v-app-bar :clipped-left="clipped" :style="{ width: '100vw' }">
      <!--v-app-bar-nav-icon @click.stop="drawer = !drawer" /-->
      <nuxt-link :to="localePath('/')" class="mainlogo">
        <v-toolbar-title>Autoswitch</v-toolbar-title>
      </nuxt-link>

      <v-spacer />
      <v-toolbar-items class="pr-4">
        <v-btn @click="switchTheme">
          <v-icon small>$mdi-brightness-6</v-icon>
        </v-btn>
        <v-btn @click="settingsDialog = true">
          <v-icon small>$mdi-cog</v-icon>
        </v-btn>
      </v-toolbar-items>
    </v-app-bar>

    <v-navigation-drawer v-model="drawer" disable-resize-watcher app :clipped="clipped" :temporary="!clipped">
      <v-list nav> </v-list>
    </v-navigation-drawer>

    <SettingsDialog
      v-model="settingsDialog"
      @cancel-clicked="settingsDialog = false"
      @confirm-clicked="settingsDialog = false"
    />

    <v-main :style="{ '--v-layout-top': '64px' }">
      <v-container>
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { useTheme } from 'vuetify'
import { useMainStore } from '~/stores/main'
import SettingsDialog from '~/components/SettingsDialog.vue'
const theme = useTheme()

const localePath = useLocalePath()
const mainStore = useMainStore()
const drawer = ref(false)
const clipped = ref(false)

const setTheme = function (val: string) {
  theme.global.name.value = val
}

const settingsDialog = ref(false)

onMounted(() => {
  if (mainStore.controllerIp === null) settingsDialog.value = true
})

const switchTheme = function () {
  setTheme(theme.global.name.value === 'dark' ? 'light' : 'dark')
}
</script>
<style scoped>
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 64px);
}

@media screen and (max-width: 960px) {
  .container {
    min-height: calc(100vh - 56px);
  }
}

.mainlogo {
  font-family: Roboto, sans-serif !important;
  margin-left: 20px;
  font-size: 24px;
  text-decoration: none;
  color: inherit !important;
}

.flag-icon {
  background-size: contain;
  background-position: 50%;
  background-repeat: no-repeat;
  position: relative;
  display: inline-block;
  width: 1.3333em;
  line-height: 1em;
  height: 1em;
}

.flag-icon-hu {
  background-image: url('@/assets/hu.svg');
}

.flag-icon-gb {
  background-image: url('@/assets/gb.svg');
}

.flag-icon-de {
  background-image: url('@/assets/de.svg');
}
</style>

<style>
.v-avatar .v-icon,
.v-avatar .v-image,
.v-avatar .v-responsive__content,
.v-avatar img,
.v-avatar svg {
  border-radius: inherit;
  display: inline-flex;
  height: inherit;
  width: inherit;
}

div#credential_picker_container {
  top: 70px !important;
}

.v-btn {
  letter-spacing: 0.05em !important;
}

.router-link-active {
  text-decoration: none;
  color: inherit !important;
}

html {
  overflow-y: auto;
}

::-webkit-scrollbar {
  width: 3px;
}

::-webkit-scrollbar-track {
  background: #efefef00;
}

::-webkit-scrollbar-thumb {
  background: #888;
}

html,
body {
  min-height: 100%;
  min-height: 100vh;
  min-height: stretch;
}

body {
  height: 100%;
}

div#__nuxt {
  height: 100%;
}

div#__layout {
  height: 100%;
}

div.v-application {
  height: 100%;
}

div.v-application--wrap {
  height: 100%;
  min-height: 100% !important;
}

main.v-main {
  height: 100%;
}
div {
  color-scheme: auto;
}
</style>
