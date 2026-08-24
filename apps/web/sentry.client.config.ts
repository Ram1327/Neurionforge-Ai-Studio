import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    "https://ade80ae8ae8d9dce5f163c43a5f89316@o4511965134716928.ingest.de.sentry.io/4511965146054736",

  integrations: [
    Sentry.replayIntegration(),
  ],

  // Define traces sample rate (100% in dev, adjust for prod)
  tracesSampleRate: 1.0,

  // Replay session sample rates
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  debug: false,
});
