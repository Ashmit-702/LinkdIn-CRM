import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthRequiredError } from "./auth";
import { ProviderError } from "@/providers/linkedin/types";

/**
 * Central error handler for API routes. Ensures we NEVER leak stack
 * traces, secrets, or raw provider payloads to the client — only a
 * clean, user-facing message and an HTTP status.
 */
export function handleApiError(err: unknown): NextResponse {
  if (err instanceof AuthRequiredError) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid input.", details: err.flatten() },
      { status: 400 }
    );
  }

  if (err instanceof ProviderError) {
    const statusByCode: Record<string, number> = {
      INVALID_URL: 400,
      TIMEOUT: 504,
      RATE_LIMITED: 429,
      AUTH_ERROR: 502,
      ACTOR_FAILED: 502,
      EMPTY_RESULT: 200,
      MALFORMED_DATA: 502,
      UNKNOWN: 500,
    };
    // Log full detail server-side only.
    console.error("[ProviderError]", err.code, err.message, err.cause);
    return NextResponse.json(
      { error: friendlyProviderMessage(err.code) },
      { status: statusByCode[err.code] ?? 500 }
    );
  }

  console.error("[UnhandledApiError]", err);
  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 }
  );
}

function friendlyProviderMessage(code: ProviderError["code"]): string {
  switch (code) {
    case "INVALID_URL":
      return "That LinkedIn URL doesn't look valid.";
    case "TIMEOUT":
      return "The LinkedIn data provider took too long to respond. Try again shortly.";
    case "RATE_LIMITED":
      return "We're being rate-limited by the data provider. Please wait a bit before syncing again.";
    case "AUTH_ERROR":
      return "The LinkedIn data provider isn't configured correctly. Contact your administrator.";
    case "ACTOR_FAILED":
      return "The LinkedIn data provider couldn't complete this request.";
    case "EMPTY_RESULT":
      return "No data was found for this target.";
    case "MALFORMED_DATA":
      return "The data provider returned an unexpected response.";
    default:
      return "The LinkedIn integration ran into an unexpected error.";
  }
}
