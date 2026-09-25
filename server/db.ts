import { and, asc, count, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  applications,
  activityLogs,
  authSessions,
  candidates,
  departments,
  interviews,
  jobs,
  notifications,
  passwordResetTokens,
  users,
  type InsertUser,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  }
  values.lastSignedIn ??= new Date();
  updateSet.lastSignedIn ??= new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

async function scalar(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, query: Promise<Array<{ value: number }>>) {
  const result = await query;
  return Number(result[0]?.value ?? 0);
}

export async function getDashboardOverview() {
  const db = await getDb();
  if (!db) return { candidates: 0, openJobs: 0, applications: 0, shortlisted: 0, interviews: 0, offers: 0, hires: 0, rejected: 0, unreadNotifications: 0 };
  const [candidateCount, openJobs, applicationCount, shortlisted, interviewCount, offers, hires, rejected, unreadNotifications] = await Promise.all([
    scalar(db, db.select({ value: count() }).from(candidates).where(eq(candidates.status, "ACTIVE"))),
    scalar(db, db.select({ value: count() }).from(jobs).where(eq(jobs.status, "OPEN"))),
    scalar(db, db.select({ value: count() }).from(applications)),
    scalar(db, db.select({ value: count() }).from(applications).where(eq(applications.currentStage, "Shortlisted"))),
    scalar(db, db.select({ value: count() }).from(interviews).where(eq(interviews.status, "Scheduled"))),
    scalar(db, db.select({ value: count() }).from(applications).where(eq(applications.currentStage, "Offer"))),
    scalar(db, db.select({ value: count() }).from(applications).where(eq(applications.currentStage, "Hired"))),
    scalar(db, db.select({ value: count() }).from(applications).where(eq(applications.currentStage, "Rejected"))),
    scalar(db, db.select({ value: count() }).from(notifications).where(eq(notifications.isRead, false))),
  ]);
  return { candidates: candidateCount, openJobs, applications: applicationCount, shortlisted, interviews: interviewCount, offers, hires, rejected, unreadNotifications };
}

export async function getFunnel() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ stage: applications.currentStage, value: count() }).from(applications).groupBy(applications.currentStage).orderBy(asc(applications.currentStage));
}

export async function getTrend() {
  const db = await getDb();
  if (!db) return [];
  const day = sql<string>`DATE(applications.appliedAt)`;
  return db.select({ label: day, value: count() }).from(applications).groupBy(day).orderBy(day).limit(14);
}

export async function getDepartmentBreakdown() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ department: sql<string>`COALESCE(${departments.name}, 'Unassigned')`, value: count() }).from(jobs).leftJoin(departments, eq(jobs.departmentId, departments.id)).groupBy(departments.name).orderBy(desc(count()));
}

export async function listCandidates(search = "") {
  const db = await getDb();
  if (!db) return [];
  const term = `%${search.trim()}%`;
  return db.select().from(candidates).where(search.trim() ? or(like(candidates.firstName, term), like(candidates.lastName, term), like(candidates.email, term), like(candidates.currentPosition, term), like(candidates.skills, term)) : undefined).orderBy(desc(candidates.updatedAt)).limit(100);
}

export async function listJobs(search = "") {
  const db = await getDb();
  if (!db) return [];
  const term = `%${search.trim()}%`;
  return db.select({ job: jobs, department: departments.name }).from(jobs).leftJoin(departments, eq(jobs.departmentId, departments.id)).where(search.trim() ? or(like(jobs.title, term), like(jobs.location, term), like(jobs.skills, term)) : undefined).orderBy(desc(jobs.updatedAt)).limit(100);
}

export async function listApplications(stage?: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ application: applications, candidate: candidates, job: jobs }).from(applications).leftJoin(candidates, eq(applications.candidateId, candidates.id)).leftJoin(jobs, eq(applications.jobId, jobs.id)).where(stage && stage !== "all" ? eq(applications.currentStage, stage as typeof applications.currentStage.enumValues[number]) : undefined).orderBy(desc(applications.lastUpdated)).limit(200);
}

export async function listInterviews() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ interview: interviews, candidate: candidates, job: jobs }).from(interviews).leftJoin(candidates, eq(interviews.candidateId, candidates.id)).leftJoin(jobs, eq(interviews.jobId, jobs.id)).orderBy(asc(interviews.scheduledAt)).limit(100);
}

export async function listNotifications() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(50);
}

export async function createCandidate(input: typeof candidates.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(candidates).values(input);
  return { id: Number(result[0].insertId) };
}

export async function createJob(input: typeof jobs.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(jobs).values(input);
  return { id: Number(result[0].insertId) };
}

export async function updateApplicationStage(id: number, stage: typeof applications.$inferInsert.currentStage) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(applications).set({ currentStage: stage, lastUpdated: new Date() }).where(eq(applications.id, id));
  return { success: true };
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  return { success: true };
}

export async function markAllNotificationsRead() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.isRead, false));
  return { success: true };
}

export async function listDepartments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(departments).where(eq(departments.status, "active")).orderBy(asc(departments.name));
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return result[0];
}

export async function getUserByGoogleId(googleId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
  return result[0];
}

export async function createUser(input: typeof users.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(users).values(input);
  return getUserById(Number(result[0].insertId));
}

export async function updateUserLastLogin(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastLogin: new Date(), lastSignedIn: new Date() }).where(eq(users.id, userId));
}

export async function createAuthSession(userId: number, tokenHash: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(authSessions).values({ userId, tokenHash, expiresAt });
}

export async function getUserBySessionHash(tokenHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({ user: users, session: authSessions })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(and(eq(authSessions.tokenHash, tokenHash), eq(users.isActive, true)))
    .limit(1);
  const row = result[0];
  if (!row || row.session.revokedAt || row.session.expiresAt.getTime() <= Date.now()) return undefined;
  return row.user;
}

export async function revokeAuthSession(tokenHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(authSessions).set({ revokedAt: new Date() }).where(eq(authSessions.tokenHash, tokenHash));
}

export async function createPasswordResetToken(userId: number, tokenHash: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));
  await db.insert(passwordResetTokens).values({ userId, tokenHash, expiresAt });
}

export async function consumePasswordResetToken(tokenHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash)).limit(1);
  const token = result[0];
  if (!token || token.usedAt || token.expiresAt.getTime() <= Date.now()) return undefined;
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, token.id));
  return token.userId;
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(users).set({ passwordHash, authProvider: "password" }).where(eq(users.id, userId));
}

export async function recordAuditLog(input: typeof activityLogs.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(activityLogs).values(input);
}

export async function getCandidateByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(candidates).where(eq(candidates.email, email.toLowerCase())).limit(1);
  return result[0];
}

export async function listCandidateApplicationsByEmail(email: string) {
  const db = await getDb();
  if (!db) return [];
  const candidate = await getCandidateByEmail(email);
  if (!candidate) return [];
  return db.select({ application: applications, job: jobs }).from(applications).leftJoin(jobs, eq(applications.jobId, jobs.id)).where(eq(applications.candidateId, candidate.id)).orderBy(desc(applications.lastUpdated));
}

export async function listCandidateInterviewsByEmail(email: string) {
  const db = await getDb();
  if (!db) return [];
  const candidate = await getCandidateByEmail(email);
  if (!candidate) return [];
  return db.select({ interview: interviews, job: jobs }).from(interviews).leftJoin(jobs, eq(interviews.jobId, jobs.id)).where(eq(interviews.candidateId, candidate.id)).orderBy(asc(interviews.scheduledAt));
}

export async function updateCandidateProfileByEmail(email: string, input: Partial<typeof candidates.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const candidate = await getCandidateByEmail(email);
  if (!candidate) throw new Error("Candidate profile not found");
  await db.update(candidates).set({ ...input, updatedAt: new Date() }).where(eq(candidates.id, candidate.id));
  return getCandidateByEmail(email);
}
