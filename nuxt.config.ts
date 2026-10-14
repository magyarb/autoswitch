import vuetify from 'vite-plugin-vuetify'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // everything talks to the Shelly devices from the browser, there is nothing to render on a server
  ssr: false,
  app: {
    head: {
      title: 'Autoswitch',
      viewport:
        'width=device-width, initial-scale=1, maximum-scale=1, height=device-height, user-scalable=no, minimal-ui'
    }
  },
  css: ['vuetify/styles'],
  vite: {
    ssr: {
      noExternal: ['vuetify']
    },
    build: {
      sourcemap: process.env.SOURCEMAP === 'true' ? 'inline' : false
    }
  },
  pwa: {
    icon: {
      source: 'assets/icon.png',
      maskableSource: 'assets/icon.maskable.png',
      maskablePadding: 0,
      targetDir: 'icons'
    },
    workbox: {
      enabled: process.env.SOURCEMAP !== 'true'
    },
    manifest: {
      name: 'Autoswitch',
      short_name: 'Autoswitch',
      description: 'Switches Shelly consumers on and off to use solar surplus',
      id: 'com.autoswitch.webapp',
      display: 'standalone',
      background_color: '#212121',
      theme_color: '#212121'
    },
    meta: {}
  },
  modules: [
    (_options, nuxt) => {
      nuxt.hooks.hook('vite:extendConfig', config => {
        if (!config || !config.plugins) return
        config.plugins.push(vuetify())
      })
    },
    '@pinia/nuxt',
    '@pinia-plugin-persistedstate/nuxt',
    '@kevinmarrec/nuxt-pwa'
  ]
})
