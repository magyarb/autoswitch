import { createVuetify } from 'vuetify'

import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import {
  mdiBrightness6,
  mdiChartLine,
  mdiClose,
  mdiCog,
  mdiHomeLightningBoltOutline,
  mdiMenu,
  mdiPlus,
  mdiPlusMinusVariant,
  mdiRefresh,
  mdiSolarPowerVariantOutline
} from '@mdi/js'
import { defineNuxtPlugin } from '#app'

const dark = {
  dark: true,
  colors: {
    background: '#121212',
    surface: '#212121',
    'surface-variant': '#BDBDBD',
    'on-surface-variant': '#424242',
    primary: '#e2741a',
    'primary-darken-1': '#3700B3',
    secondary: '#03DAC5',
    'secondary-darken-1': '#03DAC5',
    error: '#CF6679',
    info: '#2196F3',
    success: '#4CAF50',
    warning: '#FB8C00'
  },
  variables: {
    'border-color': '#FFFFFF',
    'border-opacity': 0.12,
    'high-emphasis-opacity': 0.87,
    'medium-emphasis-opacity': 0.6,
    'disabled-opacity': 0.38,
    'idle-opacity': 0.1,
    'hover-opacity': 0.04,
    'focus-opacity': 0.12,
    'selected-opacity': 0.08,
    'activated-opacity': 0.12,
    'pressed-opacity': 0.16,
    'dragged-opacity': 0.08,
    'theme-kbd': '#212529',
    'theme-on-kbd': '#FFFFFF',
    'theme-code': '#343434',
    'theme-on-code': '#CCCCCC'
  }
}

const light = {
  dark: false,
  colors: {
    background: '#FEFEFE',
    surface: '#FAFAFA',
    'surface-variant': '#BDBDBD',
    'on-surface-variant': '#BDBDBD',
    primary: '#e2741a',
    'primary-darken-1': '#3700B3',
    secondary: '#00897B',
    'secondary-darken-1': '#03DAC5',
    error: '#CF6679',
    info: '#2196F3',
    success: '#4CAF50',
    warning: '#FB8C00'
  },
  variables: {
    'border-color': '#111111',
    'border-opacity': 0.12,
    'high-emphasis-opacity': 0.87,
    'medium-emphasis-opacity': 0.6,
    'disabled-opacity': 0.38,
    'idle-opacity': 0.1,
    'hover-opacity': 0.04,
    'focus-opacity': 0.12,
    'selected-opacity': 0.08,
    'activated-opacity': 0.12,
    'pressed-opacity': 0.16,
    'dragged-opacity': 0.08,
    'theme-kbd': '#212529',
    'theme-on-kbd': '#FFFFFF',
    'theme-code': '#343434',
    'theme-on-code': '#CCCCCC'
  }
}

export default defineNuxtPlugin(app => {
  const vuetify = createVuetify({
    icons: {
      defaultSet: 'mdi',
      aliases: {
        ...aliases,
        'mdi-brightness-6': mdiBrightness6,
        'mdi-chart-line': mdiChartLine,
        'mdi-close': mdiClose,
        'mdi-cog': mdiCog,
        'mdi-home-lightning-bolt-outline': mdiHomeLightningBoltOutline,
        'mdi-menu': mdiMenu,
        'mdi-plus': mdiPlus,
        'mdi-plus-minus-variant': mdiPlusMinusVariant,
        'mdi-refresh': mdiRefresh,
        'mdi-solar-power-variant-outline': mdiSolarPowerVariantOutline
      },
      sets: {
        mdi
      }
    },
    theme: {
      defaultTheme: 'dark',
      themes: {
        dark,
        light
      }
    }
  })
  app.vueApp.use(vuetify)
})
