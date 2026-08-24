import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    process.env.SENTRY_DSN ||
    "https://ade80ae8ae8d9dce5f163c43a5f89316@o4511965134716928.ingest.de.sentry.io/4511965146054736",

  tracesSampleRate: 1.0,
  debug: false,
});
