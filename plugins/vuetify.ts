import { defineNuxtPlugin } from '#app'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'

// Components import their icons from @mdi/js directly; aliases are only Vuetify's built-in ones.
// Chart and status colours are CSS custom properties in assets/main.css.

const dark = {
  dark: true,
  colors: {
    background: '#0d0d0d',
    surface: '#1a1a19',
    'on-background': '#f0efec',
    'on-surface': '#f0efec',
    'surface-variant': '#c3c2b7',
    'on-surface-variant': '#1a1a19',
    primary: '#e2741a',
    secondary: '#3987e5',
    error: '#d03b3b',
    info: '#3987e5',
    success: '#0ca30c',
    warning: '#fab219'
  },
  variables: {
    'border-color': '#ffffff',
    'border-opacity': 0.1,
    'high-emphasis-opacity': 1,
    'medium-emphasis-opacity': 0.72
  }
}

const light = {
  dark: false,
  colors: {
    background: '#f9f9f7',
    surface: '#fcfcfb',
    'on-background': '#0b0b0b',
    'on-surface': '#0b0b0b',
    'surface-variant': '#52514e',
    'on-surface-variant': '#fcfcfb',
    primary: '#c45f0c',
    secondary: '#2a78d6',
    error: '#d03b3b',
    info: '#2a78d6',
    success: '#0a7f0a',
    warning: '#b07800'
  },
  variables: {
    'border-color': '#0b0b0b',
    'border-opacity': 0.1,
    'high-emphasis-opacity': 1,
    'medium-emphasis-opacity': 0.7
  }
}

export default defineNuxtPlugin(app => {
  const vuetify = createVuetify({
    icons: {
      defaultSet: 'mdi',
      aliases,
      sets: { mdi }
    },
    theme: {
      defaultTheme: 'dark',
      themes: { dark, light }
    },
    defaults: {
      VBtn: { rounded: 'lg' },
      VBtnToggle: { rounded: 'lg' },
      VCard: { rounded: 'xl', elevation: 0 },
      VTextField: { variant: 'outlined', density: 'comfortable' },
      VSelect: { variant: 'outlined', density: 'comfortable' },
      VAlert: { rounded: 'lg' }
    }
  })
  app.vueApp.use(vuetify)
})
