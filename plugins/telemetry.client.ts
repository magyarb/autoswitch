// Sends errors, page views and the app's own events (logEvent) to Dash0.
// Off unless NUXT_PUBLIC_DASH0_ENDPOINT and NUXT_PUBLIC_DASH0_AUTH_TOKEN are set.
export default defineNuxtPlugin(() => {
  const { dash0, version, environment } = useRuntimeConfig().public
  if (!dash0.endpoint || !dash0.authToken) return

  // loaded lazily so the app doesn't wait for it, and isn't downloaded at all without Dash0
  import('@dash0/sdk-web').then(sdk => {
    sdk.init({
      serviceName: 'autoswitch',
      serviceVersion: version,
      environment,
      endpoint: { url: dash0.endpoint, authToken: dash0.authToken, dataset: dash0.dataset || undefined },
      // the app polls the controller every few seconds; those requests would only be noise
      ignoreUrls: [/\/script\/\d+\/(getCData|getLog)$/]
    })
    setTelemetrySdk(sdk)
  })
})
