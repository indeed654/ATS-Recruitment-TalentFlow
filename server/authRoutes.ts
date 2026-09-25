import { randomBytes } from "node:crypto";
import { parse as parseCookie } from "cookie";
import type { Express, Request, Response } from "express";
import { createCandidate, createUser, getCandidateByEmail, getUserByEmail, getUserByGoogleId, recordAuditLog } from "./db";
import { startSession } from "./auth";
import { getSessionCookieOptions } from "./_core/cookies";

const GOOGLE_STATE_COOKIE = "talentflow_google_state";

function queryString(req: Request, key: string) {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function googleConfig(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get("host")}/api/auth/google/callback`;
  return { clientId, clientSecret, redirectUri };
}

export function registerAuthRoutes(app: Express) {
  app.get("/api/auth/google", (req: Request, res: Response) => {
    const { clientId, redirectUri } = googleConfig(req);
    if (!clientId) {
      res.status(503).json({ error: "Google candidate login is not configured" });
      return;
    }
    const state = randomBytes(24).toString("base64url");
    res.cookie(GOOGLE_STATE_COOKIE, state, { ...getSessionCookieOptions(req), maxAge: 10 * 60 * 1000 });
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("prompt", "select_account");
    res.redirect(url.toString());
  });

  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code = queryString(req, "code");
    const state = queryString(req, "state");
    const expectedState = parseCookie(req.headers.cookie ?? "")[GOOGLE_STATE_COOKIE];
    res.clearCookie(GOOGLE_STATE_COOKIE, { ...getSessionCookieOptions(req), maxAge: 0 });
    if (!code || !state || !expectedState || state !== expectedState) {
      res.status(403).json({ error: "Invalid Google login state" });
      return;
    }

    const { clientId, clientSecret, redirectUri } = googleConfig(req);
    if (!clientId || !clientSecret) {
      res.status(503).json({ error: "Google candidate login is not configured" });
      return;
    }

    try {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
      });
      if (!tokenResponse.ok) throw new Error("Google token exchange failed");
      const tokens = await tokenResponse.json() as { access_token?: string };
      if (!tokens.access_token) throw new Error("Google access token missing");

      const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` } });
      if (!profileResponse.ok) throw new Error("Google profile lookup failed");
      const profile = await profileResponse.json() as { sub?: string; email?: string; email_verified?: boolean; name?: string };
      if (!profile.sub || !profile.email || !profile.email_verified) throw new Error("Google account email is not verified");

      let user = await getUserByGoogleId(profile.sub);
      if (!user) {
        const byEmail = await getUserByEmail(profile.email);
        if (byEmail && byEmail.role !== "candidate") {
          res.status(403).json({ error: "Internal staff accounts must use work-email login" });
          return;
        }
        user = byEmail ?? await createUser({
          openId: `google:${profile.sub}`,
          name: profile.name || profile.email.split("@")[0],
          email: profile.email.toLowerCase(),
          authProvider: "google",
          googleId: profile.sub,
          role: "candidate",
          loginMethod: "google",
          isActive: true,
        });
      }
      if (!user || user.role !== "candidate" || !user.isActive) {
        res.status(403).json({ error: "Google login is restricted to candidate accounts" });
        return;
      }
      if (!(await getCandidateByEmail(user.email || profile.email))) {
        await createCandidate({ firstName: profile.name?.split(" ")[0] || "Candidate", lastName: profile.name?.split(" ").slice(1).join(" ") || "Profile", email: (user.email || profile.email).toLowerCase(), source: "Google", status: "ACTIVE" });
      }
      await startSession(user.id, req, res);
      await recordAuditLog({ userId: user.id, action: "Login", entityType: "user", entityId: user.id, description: "Candidate Google login", ipAddress: req.ip });
      res.redirect(302, "/?portal=candidate");
    } catch (error) {
      console.error("[Auth] Google candidate login failed", error);
      res.status(502).json({ error: "Unable to complete Google login" });
    }
  });
}
