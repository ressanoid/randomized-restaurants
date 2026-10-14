import { createQlooClient, type QlooClient } from "./client";

const DEFAULT_BASE_URL = "https://hackathon.api.qloo.com";

/**
 * Server-only factory reading credentials from the environment.
 * Never import this from a client component — the API key must stay on the server.
 */
export const getQlooClient = (): QlooClient => {
  const apiKey = process.env.QLOO_API_KEY;
  if (!apiKey) throw new Error("QLOO_API_KEY is not configured");

  const baseUrl = process.env.QLOO_API_URL ?? DEFAULT_BASE_URL;
  return createQlooClient(baseUrl, apiKey);
};
