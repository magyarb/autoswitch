<template>
  <div class="line-chart" :style="{ height: `${height}px` }">
    <canvas ref="canvas" role="img" :aria-label="description"></canvas>
    <div ref="tooltipEl" class="chart-tooltip" aria-hidden="true"></div>
  </div>
</template>

<script setup lang="ts">
import {
  Chart,
  ChartConfiguration,
  ChartDataset,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  Plugin,
  Point,
  PointElement,
  Tooltip,
  TooltipModel
} from 'chart.js'
import { useTheme } from 'vuetify'
import { formatDateTime, formatPower, formatPowerTick, formatTime } from '~/utils/format'

Chart.register(LineController, LineElement, PointElement, LinearScale, Filler, Tooltip)

// end labels need room on the right; narrower charts rely on the legend and tooltip
const END_LABEL_MIN_WIDTH = 560
const END_LABEL_PADDING = 132

export type ChartSeries = {
  key: 'production' | 'consumption'
  label: string
  // CSS custom property holding the series colour, e.g. --series-production
  colorVar: string
  isFilled: boolean
  // x in ms, null = gap
  points: { x: number; y: number | null }[]
}

const props = withDefaults(
  defineProps<{
    series: ChartSeries[]
    from: number
    to: number
    tickHours: number
    height: number
    // read by screen readers
    description: string
    // shared scale for small multiples
    suggestedMin?: number
    suggestedMax?: number
    hasEndLabels?: boolean
  }>(),
  { suggestedMin: undefined, suggestedMax: undefined, hasEndLabels: false }
)

const canvas = ref<HTMLCanvasElement | null>(null)
const tooltipEl = ref<HTMLDivElement | null>(null)
const theme = useTheme()
let chart: Chart<'line'> | null = null

type Palette = Record<'surface' | 'textPrimary' | 'textSecondary' | 'muted' | 'grid' | 'axis' | 'hairline', string>

// colours live in CSS (see assets/main.css), so light and dark mode are defined in one place
function readPalette(): { palette: Palette; css: CSSStyleDeclaration } {
  const css = getComputedStyle(canvas.value!)
  const get = (name: string) => css.getPropertyValue(name).trim()
  return {
    css,
    palette: {
      surface: get('--viz-surface'),
      textPrimary: get('--viz-text-primary'),
      textSecondary: get('--viz-text-secondary'),
      muted: get('--viz-muted'),
      grid: get('--viz-grid'),
      axis: get('--viz-axis'),
      hairline: get('--viz-hairline')
    }
  }
}

function withAlpha(hex: string, alpha: number) {
  const value = parseInt(hex.replace('#', ''), 16)
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
}

// ticks on whole local hours (or midnights), not wherever the linear scale lands
function timeTicks(from: number, to: number, stepHours: number) {
  const date = new Date(from)
  date.setMinutes(0, 0, 0)
  if (stepHours >= 24) date.setHours(0)
  const ticks: { value: number }[] = []
  while (date.getTime() <= to) {
    const isAligned = stepHours >= 24 || date.getHours() % stepHours === 0
    if (date.getTime() >= from && isAligned) ticks.push({ value: date.getTime() })
    date.setHours(date.getHours() + (stepHours >= 24 ? 24 : 1))
  }
  return ticks
}

function buildConfig(): ChartConfiguration<'line'> {
  const { palette, css } = readPalette()
  const font = { family: getComputedStyle(document.body).fontFamily, size: 12 }
  const rightPadding = (width: number) => (props.hasEndLabels && width >= END_LABEL_MIN_WIDTH ? END_LABEL_PADDING : 8)

  const crosshair: Plugin<'line'> = {
    id: 'crosshair',
    afterDatasetsDraw(c) {
      const active = c.tooltip?.getActiveElements()
      if (!active?.length) return
      const x = active[0].element.x
      const { top, bottom } = c.chartArea
      c.ctx.save()
      c.ctx.strokeStyle = palette.axis
      c.ctx.lineWidth = 1
      c.ctx.beginPath()
      c.ctx.moveTo(x, top)
      c.ctx.lineTo(x, bottom)
      c.ctx.stroke()
      c.ctx.restore()
    }
  }

  // label the latest value at the end of each line, but only when the labels don't collide
  const endLabels: Plugin<'line'> = {
    id: 'endLabels',
    afterDatasetsDraw(c) {
      if (!props.hasEndLabels || c.width < END_LABEL_MIN_WIDTH) return
      const labels: { x: number; y: number; text: string }[] = []
      c.data.datasets.forEach((dataset, i) => {
        const points = dataset.data as { x: number; y: number | null }[]
        let last = points.length - 1
        while (last >= 0 && points[last].y === null) last--
        if (last < 0) return
        const element = c.getDatasetMeta(i).data[last]
        labels.push({ x: element.x, y: element.y, text: `${dataset.label} ${formatPower(points[last].y)}` })
      })
      const isColliding = labels.some((a, i) => labels.some((b, j) => i < j && Math.abs(a.y - b.y) < 16))
      if (isColliding) return
      c.ctx.save()
      c.ctx.font = `${font.size}px ${font.family}`
      c.ctx.fillStyle = palette.textSecondary
      c.ctx.textBaseline = 'middle'
      for (const label of labels) c.ctx.fillText(label.text, label.x + 8, label.y)
      c.ctx.restore()
    }
  }

  return {
    type: 'line',
    data: {
      datasets: props.series.map((s): ChartDataset<'line'> => {
        const color = css.getPropertyValue(s.colorVar).trim()
        return {
          label: s.label,
          // Chart.js keeps a reference and observes the array, so give it its own copy.
          // null y values are gaps; Chart.js handles them but its Point type doesn't allow them.
          data: s.points.slice() as Point[],
          borderColor: color,
          backgroundColor: s.isFilled ? withAlpha(color, 0.1) : color,
          fill: s.isFilled ? 'origin' : false,
          borderWidth: 2,
          borderJoinStyle: 'round',
          borderCapStyle: 'round',
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: color,
          pointHoverBorderColor: palette.surface,
          pointHoverBorderWidth: 2,
          spanGaps: false,
          tension: 0
        }
      })
    },
    options: {
      animation: false,
      parsing: false,
      normalized: true,
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      layout: { padding: { top: 8, right: rightPadding(canvas.value!.parentElement!.clientWidth) } },
      onResize: (c, size) => {
        const padding = c.options.layout?.padding as { right: number } | undefined
        if (padding && padding.right !== rightPadding(size.width)) {
          padding.right = rightPadding(size.width)
          c.update('none')
        }
      },
      scales: {
        x: {
          type: 'linear',
          min: props.from,
          max: props.to,
          grid: { display: false },
          border: { color: palette.axis },
          afterBuildTicks: scale => {
            scale.ticks = timeTicks(props.from, props.to, props.tickHours)
          },
          ticks: {
            color: palette.muted,
            font,
            maxRotation: 0,
            autoSkip: true,
            callback: value =>
              props.tickHours >= 24
                ? new Date(Number(value)).toLocaleDateString([], { weekday: 'short' })
                : formatTime(Number(value))
          }
        },
        y: {
          beginAtZero: true,
          suggestedMin: props.suggestedMin,
          suggestedMax: props.suggestedMax,
          grid: { color: palette.grid, drawTicks: false },
          border: { display: false },
          ticks: { color: palette.muted, font, padding: 8, maxTicksLimit: 5, callback: v => formatPowerTick(Number(v)) }
        }
      },
      plugins: {
        // HTML tooltip: real 2px line keys and text in text colours (see renderTooltip)
        tooltip: {
          enabled: false,
          filter: item => item.parsed.y !== null,
          external: ({ chart: c, tooltip }) => renderTooltip(c, tooltip)
        }
      }
    },
    plugins: [crosshair, endLabels]
  }
}

// Built with textContent only: series labels are data, never HTML.
function renderTooltip(c: Chart, tooltip: TooltipModel<'line'>) {
  const el = tooltipEl.value
  if (!el) return
  if (tooltip.opacity === 0 || !tooltip.dataPoints?.length) {
    el.style.opacity = '0'
    return
  }
  const div = (className: string, text = '') => {
    const node = document.createElement('div')
    node.className = className
    node.textContent = text
    return node
  }
  el.replaceChildren(div('tooltip-title', formatDateTime(tooltip.dataPoints[0].parsed.x)))
  for (const item of tooltip.dataPoints) {
    const row = div('tooltip-row')
    const key = div('tooltip-key')
    key.style.background = item.dataset.borderColor as string
    // values lead, labels follow
    row.append(key, div('tooltip-value', formatPower(item.parsed.y)), div('tooltip-label', item.dataset.label))
    el.append(row)
  }
  const value = (key: ChartSeries['key']) =>
    tooltip.dataPoints.find(item => props.series[item.datasetIndex]?.key === key)?.parsed.y
  const production = value('production')
  const consumption = value('consumption')
  if (production !== undefined && consumption !== undefined) {
    el.append(div('tooltip-footer', `Balance ${formatPower(production - consumption, true)}`))
  }
  // beside the crosshair, flipped to the left near the right edge
  const isFlipped = tooltip.caretX + 16 + el.offsetWidth > c.width
  el.style.left = `${isFlipped ? tooltip.caretX - 16 - el.offsetWidth : tooltip.caretX + 16}px`
  el.style.top = `${c.chartArea.top}px`
  el.style.opacity = '1'
}

function render() {
  if (!canvas.value) return
  chart?.destroy()
  chart = new Chart(canvas.value, buildConfig())
}

function update() {
  if (!chart) return render()
  const config = buildConfig()
  chart.data = config.data
  chart.options = config.options!
  chart.update('none')
}

onMounted(render)
onBeforeUnmount(() => chart?.destroy())
watch(() => [props.series, props.from, props.to, props.suggestedMin, props.suggestedMax], update)
// plugins capture the palette, so a theme switch rebuilds the chart; wait for the new CSS to apply
watch(
  () => theme.global.name.value,
  () => nextTick(render)
)
</script>

<style scoped>
.line-chart {
  position: relative;
  width: 100%;
}

.chart-tooltip {
  position: absolute;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.1s;
  min-width: 150px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--viz-hairline);
  background: var(--viz-surface);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  font-size: 12px;
  white-space: nowrap;
  z-index: 1;
}

.chart-tooltip :deep(.tooltip-title),
.chart-tooltip :deep(.tooltip-footer) {
  color: var(--viz-text-secondary);
}

.chart-tooltip :deep(.tooltip-title) {
  margin-bottom: 4px;
}

.chart-tooltip :deep(.tooltip-footer) {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid var(--viz-hairline);
}

.chart-tooltip :deep(.tooltip-row) {
  display: flex;
  align-items: center;
  gap: 6px;
  line-height: 20px;
}

.chart-tooltip :deep(.tooltip-key) {
  width: 14px;
  height: 2px;
  border-radius: 1px;
}

.chart-tooltip :deep(.tooltip-value) {
  font-weight: 600;
  color: var(--viz-text-primary);
  font-variant-numeric: tabular-nums;
}

.chart-tooltip :deep(.tooltip-label) {
  color: var(--viz-text-secondary);
}
</style>
