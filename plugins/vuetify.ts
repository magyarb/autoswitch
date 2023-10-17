import { defineNuxtPlugin } from '#app'
import { createVuetify } from 'vuetify'
import { VDataTable } from 'vuetify/labs/VDataTable'
// Translations provided by Vuetify
import { en, hu, de } from 'vuetify/locale'

import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import {
  mdiGlassMugVariant,
  mdiCartCheck,
  mdiCancel,
  mdiCheckAll,
  mdiDelete,
  mdiPercent,
  mdiCallSplit,
  mdiCartArrowRight,
  mdiCashRegister,
  mdiClose,
  mdiPound,
  mdiClockOutline,
  mdiMagnify,
  mdiMinusCircleOutline,
  mdiMinusCircleMultipleOutline,
  mdiPlus,
  mdiComment,
  mdiPlusCircleOutline,
  mdiPlusCircleMultipleOutline,
  mdiCartRemove,
  mdiPlaylistPlus,
  mdiCashRefund,
  mdiCommentAlert,
  mdiContentCopy,
  mdiMinus,
  mdiCommentPlusOutline,
  mdiCommentEdit,
  mdiCartArrowDown,
  mdiMenu,
  mdiCreditCard,
  mdiCash,
  mdiTranslate,
  mdiFilterMenu,
  mdiSort,
  mdiSortAlphabeticalAscending,
  mdiSortAlphabeticalDescending,
  mdiDotsHorizontal,
  mdiBroadcastOff,
  mdiPencil,
  mdiChevronDown,
  mdiBrightness6,
  mdiAccountDetails,
  mdiFormatListBulletedSquare,
  mdiCalendar,
  mdiCart,
  mdiOpenInNew,
  mdiEye,
  mdiEyeOff,
  mdiFilter,
  mdiCheck,
  mdiPencilOutline,
  mdiCartPlus,
  mdiAccount,
  mdiCellphoneLink,
  mdiAccountCog,
  mdiAccountPlus,
  mdiChevronTripleUp,
  mdiSelectGroup,
  mdiBellRing,
  mdiChevronUp,
  mdiInformation,
  mdiCashFast,
  mdiChartBar,
  mdiReceiptText,
  mdiScale,
  mdiChartLine,
  mdiPackageVariantClosed,
  mdiStore,
  mdiFileDocumentOutline,
  mdiCog,
  mdiLogin,
  mdiStoreEdit,
  mdiSolarPowerVariantOutline,
  mdiHomeLightningBoltOutline,
  mdiPlusMinusVariant
} from '@mdi/js'

const untappd =
  'M11 13.299l-5.824 8.133c-.298.416-.8.635-1.308.572-.578-.072-1.374-.289-2.195-.879S.392 19.849.139 19.323a1.402 1.402 0 0 1 .122-1.425l5.824-8.133a3.066 3.066 0 0 1 1.062-.927l1.146-.604c.23-.121.436-.283.608-.478.556-.631 2.049-2.284 4.696-4.957l.046-.212a.134.134 0 0 1 .096-.1l.146-.037a.135.135 0 0 0 .101-.141l-.015-.18a.13.13 0 0 1 .125-.142c.176-.005.518.046 1.001.393s.64.656.692.824a.13.13 0 0 1-.095.164l-.175.044a.133.133 0 0 0-.101.141l.012.15a.131.131 0 0 1-.063.123l-.186.112c-1.679 3.369-2.764 5.316-3.183 6.046a2.157 2.157 0 0 0-.257.73l-.205 1.281A3.074 3.074 0 0 1 11 13.3zm12.739 4.598l-5.824-8.133a3.066 3.066 0 0 0-1.062-.927l-1.146-.605a2.138 2.138 0 0 1-.608-.478 50.504 50.504 0 0 0-.587-.654.089.089 0 0 0-.142.018 97.261 97.261 0 0 1-1.745 3.223 1.42 1.42 0 0 0-.171.485 3.518 3.518 0 0 0 0 1.103l.01.064c.075.471.259.918.536 1.305l5.824 8.133c.296.413.79.635 1.294.574a4.759 4.759 0 0 0 2.209-.881 4.762 4.762 0 0 0 1.533-1.802 1.4 1.4 0 0 0-.122-1.425zM8.306 3.366l.175.044a.134.134 0 0 1 .101.141l-.012.15a.13.13 0 0 0 .063.123l.186.112c.311.623.599 1.194.869 1.721.026.051.091.06.129.019.437-.469.964-1.025 1.585-1.668a.137.137 0 0 0 .003-.19c-.315-.322-.645-.659-1.002-1.02l-.046-.212a.13.13 0 0 0-.096-.099l-.146-.037a.135.135 0 0 1-.101-.141l.015-.18a.13.13 0 0 0-.123-.142c-.175-.005-.518.045-1.002.393-.483.347-.64.656-.692.824a.13.13 0 0 0 .095.164z'

const rapidbar =
  'M0 22.9645c3.8922-1.4114 7.8754-2.5581 11.8693-3.6396 3.9998-1.0586 8.0227-2.0569 12.0989-2.7826-3.8929 1.4096-7.8759 2.5565-11.8693 3.6396-3.9994 1.0602-8.0223 2.0589-12.0989 2.7826H0ZM0 14.6933c3.8922-1.4114 7.8754-2.5581 11.8693-3.6396 3.9998-1.0586 8.0227-2.0569 12.0989-2.7826-3.8929 1.4096-7.8759 2.5565-11.8693 3.6396C8.0993 12.9709 4.0764 13.9697 0 14.6933H0ZM0 6.4221c3.8922-1.4114 7.8754-2.5581 11.8693-3.6396C15.8691 1.7239 19.892.7256 23.9679 0c-3.8929 1.4096-7.8759 2.5565-11.8693 3.6396C8.0993 4.6997 4.0764 5.6985 0 6.4221H0Z'

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
    ssr: true,
    components: {
      VDataTable
    },
    locale: {
      messages: { en, hu, de }
    },
    icons: {
      defaultSet: 'mdi',
      aliases: {
        ...aliases,
        'mdi-glass-mug-variant': mdiGlassMugVariant,
        'mdi-cart-check': mdiCartCheck,
        'mdi-cancel': mdiCancel,
        'mdi-check-all': mdiCheckAll,
        'mdi-delete': mdiDelete,
        'mdi-percent': mdiPercent,
        'mdi-call-split': mdiCallSplit,
        'mdi-cart-arrow-right': mdiCartArrowRight,
        'mdi-cash-register': mdiCashRegister,
        'mdi-close': mdiClose,
        'mdi-pound': mdiPound,
        'mdi-clock-outline': mdiClockOutline,
        'mdi-magnify': mdiMagnify,
        'mdi-minus-circle-outline': mdiMinusCircleOutline,
        'mdi-minus-circle-multiple-outline': mdiMinusCircleMultipleOutline,
        'mdi-plus': mdiPlus,
        'mdi-comment': mdiComment,
        'mdi-plus-circle-outline': mdiPlusCircleOutline,
        'mdi-plus-circle-multiple-outline': mdiPlusCircleMultipleOutline,
        'mdi-cart-remove': mdiCartRemove,
        'mdi-playlist-plus': mdiPlaylistPlus,
        'mdi-cash-refund': mdiCashRefund,
        'mdi-comment-alert': mdiCommentAlert,
        'mdi-content-copy': mdiContentCopy,
        'mdi-minus': mdiMinus,
        'mdi-comment-plus-outline': mdiCommentPlusOutline,
        'mdi-comment-edit': mdiCommentEdit,
        'mdi-cart-arrow-down': mdiCartArrowDown,
        'mdi-menu': mdiMenu,
        'mdi-credit-card': mdiCreditCard,
        'mdi-cash': mdiCash,
        'mdi-translate': mdiTranslate,
        'mdi-filter-menu': mdiFilterMenu,
        'mdi-sort': mdiSort,
        'mdi-sort-alphabetical-ascending': mdiSortAlphabeticalAscending,
        'mdi-sort-alphabetical-descending': mdiSortAlphabeticalDescending,
        'mdi-dots-horizontal': mdiDotsHorizontal,
        'mdi-broadcast-off': mdiBroadcastOff,
        'mdi-pencil': mdiPencil,
        'mdi-chevron-down': mdiChevronDown,
        'mdi-brightness-6': mdiBrightness6,
        'mdi-account-details': mdiAccountDetails,
        'mdi-format-list-bulleted-square': mdiFormatListBulletedSquare,
        'mdi-calendar': mdiCalendar,
        'mdi-cart': mdiCart,
        'mdi-open-in-new': mdiOpenInNew,
        'mdi-eye': mdiEye,
        'mdi-eye-off': mdiEyeOff,
        'mdi-filter': mdiFilter,
        'mdi-check': mdiCheck,
        'mdi-pencil-outline': mdiPencilOutline,
        'mdi-cart-plus': mdiCartPlus,
        'mdi-account': mdiAccount,
        'mdi-cellphone-link': mdiCellphoneLink,
        'mdi-account-cog': mdiAccountCog,
        'mdi-account-plus': mdiAccountPlus,
        'mdi-chevron-triple-up': mdiChevronTripleUp,
        'mdi-select-group': mdiSelectGroup,
        'mdi-bell-ring': mdiBellRing,
        'mdi-chevron-up': mdiChevronUp,
        'mdi-information': mdiInformation,
        'mdi-cash-fast': mdiCashFast,
        'mdi-chart-bar': mdiChartBar,
        'mdi-chart-line': mdiChartLine,
        'mdi-receipt-text': mdiReceiptText,
        'mdi-package-variant-closed': mdiPackageVariantClosed,
        'mdi-store': mdiStore,
        'mdi-file-document-outline': mdiFileDocumentOutline,
        'mdi-scale': mdiScale,
        'mdi-cog': mdiCog,
        'mdi-login': mdiLogin,
        'mdi-store-edit': mdiStoreEdit,
        'mdi-solar-power-variant-outline': mdiSolarPowerVariantOutline,
        'mdi-home-lightning-bolt-outline': mdiHomeLightningBoltOutline,
        'mdi-plus-minus-variant': mdiPlusMinusVariant,

        untappd,
        rapidbar
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
