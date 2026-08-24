import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    throw new Error("Sentry Server-Side Test Error from Neurion AI Studio API");
  } catch (error) {
    const eventId = Sentry.captureException(error);
    return NextResponse.json({
      success: true,
      message: "Server exception sent to Sentry",
      eventId,
    });
  }
}
