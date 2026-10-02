import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getLinkedInProvider, __resetProviderCache } from "@/providers/linkedin";
import { MockLinkedInProvider } from "@/providers/linkedin/mock-provider";
import { ApifyLinkedInProvider } from "@/providers/linkedin/apify-provider";

describe("getLinkedInProvider factory", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    __resetProviderCache();
  });
  afterEach(() => {
    process.env = { ...originalEnv };
    __resetProviderCache();
  });

  it("defaults to MockLinkedInProvider when LINKEDIN_PROVIDER is unset", () => {
    delete process.env.LINKEDIN_PROVIDER;
    expect(getLinkedInProvider()).toBeInstanceOf(MockLinkedInProvider);
  });

  it("returns MockLinkedInProvider when explicitly set to mock", () => {
    process.env.LINKEDIN_PROVIDER = "mock";
    expect(getLinkedInProvider()).toBeInstanceOf(MockLinkedInProvider);
  });

  it("returns ApifyLinkedInProvider when set to apify and a token is present", () => {
    process.env.LINKEDIN_PROVIDER = "apify";
    process.env.APIFY_API_TOKEN = "fake-token-for-test";
    expect(getLinkedInProvider()).toBeInstanceOf(ApifyLinkedInProvider);
  });

  it("throws a clear error when apify is selected but no token is configured", () => {
    process.env.LINKEDIN_PROVIDER = "apify";
    delete process.env.APIFY_API_TOKEN;
    expect(() => getLinkedInProvider()).toThrow(/APIFY_API_TOKEN/);
  });
});
