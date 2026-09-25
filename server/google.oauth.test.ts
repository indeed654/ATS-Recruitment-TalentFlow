import { describe, expect, it } from "vitest";

describe("Google OAuth configuration", () => {
  it("accepts the configured client credentials at Google's token endpoint", async () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return;
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: "talentflow-validation-code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback",
        grant_type: "authorization_code",
      }),
    });
    const payload = await response.json() as { error?: string; error_description?: string };
    expect(response.status).toBe(400);
    expect(payload.error).toBe("invalid_grant");
  }, 15000);
});
