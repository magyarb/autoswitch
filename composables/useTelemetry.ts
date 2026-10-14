import type { AttributeValueType } from '@dash0/sdk-web'

type Sdk = typeof import('@dash0/sdk-web')
type Severity = 'INFO' | 'WARN' | 'ERROR'

// set by plugins/telemetry.client.ts when Dash0 is configured
let sdk: Sdk | null = null

export function setTelemetrySdk(value: Sdk) {
  sdk = value
}

export function isTelemetryEnabled() {
  return sdk !== null
}

// A structured app event: always printed to the console, and sent to Dash0 when it is configured.
// Names are prefixed with "autoswitch." so they never clash with the SDK's own event names.
export function logEvent(
  name: string,
  title: string,
  options: { attributes?: Record<string, AttributeValueType>; severity?: Severity; timestamp?: number } = {}
) {
  const { attributes = {}, severity = 'INFO', timestamp } = options
  // eslint-disable-next-line no-console
  const print = severity === 'ERROR' ? console.error : severity === 'WARN' ? console.warn : console.info
  print(`[autoswitch.${name}] ${title}`, attributes)
  sdk?.sendEvent(`autoswitch.${name}`, { title, attributes, severity, timestamp })
}
