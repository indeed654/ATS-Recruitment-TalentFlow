import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { parse as parseCookie } from "cookie";
import type { Request, Response } from "express";
import * as db from "./db";
import { COOKIE_NAME, SESSION_MAX_AGE_MS } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";

const SESSION_COOKIE_MAX_AGE = SESSION_MAX_AGE_MS;

function readSessionToken(req: Request) {
  return parseCookie(req.headers.cookie ?? "")[COOKIE_NAME];
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function verifyPassword(email: string, password: string) {
  const user = await db.getUserByEmail(normalizeEmail(email));
  if (!user || !user.isActive || !user.passwordHash) return undefined;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return undefined;
  await db.updateUserLastLogin(user.id);
  await db.recordAuditLog({ userId: user.id, action: "Login", entityType: "user", entityId: user.id, description: "Internal staff login" });
  return user;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function startSession(userId: number, req: Request, res: Response) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_COOKIE_MAX_AGE);
  await db.createAuthSession(userId, hashToken(token), expiresAt);
  res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(req), maxAge: SESSION_COOKIE_MAX_AGE });
}

export async function endSession(req: Request, res: Response) {
  const token = readSessionToken(req);
  if (token) await db.revokeAuthSession(hashToken(token));
  res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(req), maxAge: 0 });
}

export async function authenticateRequest(req: Request) {
  const token = readSessionToken(req);
  if (!token) return null;
  return (await db.getUserBySessionHash(hashToken(token))) ?? null;
}

export async function issuePasswordReset(userId: number) {
  const token = randomBytes(32).toString("base64url");
  await db.createPasswordResetToken(userId, hashToken(token), new Date(Date.now() + 30 * 60 * 1000));
  return token;
}

export async function consumePasswordReset(token: string) {
  return db.consumePasswordResetToken(hashToken(token));
}

export function buildResetUrl(token: string) {
  const base = process.env.PUBLIC_APP_URL || "http://localhost:3000";
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}
