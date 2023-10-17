import vuetify from 'vite-plugin-vuetify'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
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
      maskablePadding: 5,
      targetDir: 'icons'
    },
    workbox: {
      enabled: process.env.SOURCEMAP !== 'true'
    },
    manifest: {
      name: 'Autoswitch',
      short_name: 'Autoswitch',
      description: '',
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
    '@kevinmarrec/nuxt-pwa',
    [
      '@nuxtjs/i18n',
      {
        defaultLocale: 'en',
        strategy: 'prefix_and_default',
        locales: [
          {
            code: 'en',
            iso: 'en',
            file: 'en.json',
            isCatchallLocale: true
          },
          {
            code: 'hu',
            iso: 'hu-HU',
            file: 'hu.json'
          },
          {
            code: 'de',
            iso: 'de-DE',
            file: 'de.json'
          }
        ],
        lazy: false,
        langDir: 'locales/'
      }
    ]
  ]
})
