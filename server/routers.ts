import { z } from "zod";
import { consumePasswordReset, endSession, hashPassword, issuePasswordReset, startSession, verifyPassword } from "./auth";
import { systemRouter } from "./_core/systemRouter";
import { candidateProcedure, publicProcedure, recruiterProcedure, router, staffProcedure } from "./_core/trpc";
import {
  createCandidate,
  createJob,
  getDashboardOverview,
  getDepartmentBreakdown,
  getFunnel,
  getUserByEmail,
  getTrend,
  listApplications,
  listCandidateApplicationsByEmail,
  listCandidateInterviewsByEmail,
  getCandidateByEmail,
  listCandidates,
  listDepartments,
  listInterviews,
  listJobs,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  recordAuditLog,
  updateApplicationStage,
  updateCandidateProfileByEmail,
  updateUserPassword,
} from "./db";

const stageValues = ["Applied", "Screening", "Shortlisted", "Interview", "Offer", "Hired", "Rejected", "Withdrawn"] as const;

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => {
      if (!ctx.user) return null;
      const { passwordHash: _passwordHash, googleId: _googleId, openId: _openId, ...user } = ctx.user;
      return user;
    }),
    staffLogin: publicProcedure.input(z.object({ email: z.string().email(), password: z.string().min(8) })).mutation(async ({ input, ctx }) => {
      const user = await verifyPassword(input.email, input.password);
      if (!user || !["admin", "recruiter", "hiring_manager", "interviewer"].includes(user.role)) {
        throw new Error("Invalid work email or password");
      }
      await startSession(user.id, ctx.req, ctx.res);
      return { success: true } as const;
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      await endSession(ctx.req, ctx.res);
      return { success: true } as const;
    }),
    requestPasswordReset: publicProcedure.input(z.object({ email: z.string().email() })).mutation(async ({ input }) => {
      const user = await getUserByEmail(input.email);
      if (user && user.role !== "candidate") {
        const token = await issuePasswordReset(user.id);
        if (process.env.NODE_ENV !== "production") console.info(`[Auth] Development reset URL: ${process.env.PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`);
      }
      return { success: true } as const;
    }),
    resetPassword: publicProcedure.input(z.object({ token: z.string().min(20), password: z.string().min(8) })).mutation(async ({ input }) => {
      const userId = await consumePasswordReset(input.token);
      if (!userId) throw new Error("Reset link is invalid or expired");
      await updateUserPassword(userId, await hashPassword(input.password));
      return { success: true } as const;
    }),
  }),
  dashboard: router({
    overview: staffProcedure.query(() => getDashboardOverview()),
    funnel: staffProcedure.query(() => getFunnel()),
    trend: staffProcedure.query(() => getTrend()),
    departments: staffProcedure.query(() => getDepartmentBreakdown()),
  }),
  departments: router({
    list: staffProcedure.query(() => listDepartments()),
  }),
  candidates: router({
    list: staffProcedure.input(z.object({ search: z.string().optional() }).optional()).query(({ input }) => listCandidates(input?.search ?? "")),
    create: recruiterProcedure.input(z.object({
      firstName: z.string().min(2),
      lastName: z.string().min(2),
      email: z.string().email(),
      currentPosition: z.string().optional(),
      currentCompany: z.string().optional(),
      location: z.string().optional(),
      experienceYears: z.number().int().min(0).max(60).default(0),
      skills: z.string().optional(),
      source: z.string().default("Direct"),
    })).mutation(async ({ input, ctx }) => {
      const result = await createCandidate(input);
      await recordAuditLog({ userId: ctx.user.id, action: "Candidate created", entityType: "candidate", entityId: result.id, description: `Created candidate ${input.firstName} ${input.lastName}`, ipAddress: ctx.req.ip });
      return result;
    }),
  }),
  jobs: router({
    list: staffProcedure.input(z.object({ search: z.string().optional() }).optional()).query(({ input }) => listJobs(input?.search ?? "")),
    create: recruiterProcedure.input(z.object({
      title: z.string().min(3),
      description: z.string().optional(),
      departmentId: z.number().int().optional(),
      location: z.string().optional(),
      employmentType: z.enum(["Full-time", "Part-time", "Contract", "Internship"]).default("Full-time"),
      experienceMin: z.number().int().min(0).default(0),
      experienceMax: z.number().int().min(0).default(5),
      openings: z.number().int().min(1).default(1),
      hiringManagerName: z.string().optional(),
      status: z.enum(["DRAFT", "OPEN", "PAUSED", "CLOSED"]).default("OPEN"),
    })).mutation(async ({ input, ctx }) => {
      const result = await createJob({ ...input, createdBy: ctx.user.id });
      await recordAuditLog({ userId: ctx.user.id, action: "Job created", entityType: "job", entityId: result.id, description: `Created job ${input.title}`, ipAddress: ctx.req.ip });
      return result;
    }),
  }),
  applications: router({
    list: staffProcedure.input(z.object({ stage: z.string().optional() }).optional()).query(({ input }) => listApplications(input?.stage)),
    updateStage: recruiterProcedure.input(z.object({ id: z.number().int(), stage: z.enum(stageValues) })).mutation(async ({ input, ctx }) => {
      const result = await updateApplicationStage(input.id, input.stage);
      await recordAuditLog({ userId: ctx.user.id, action: "Application stage changed", entityType: "application", entityId: input.id, description: `Moved application to ${input.stage}`, ipAddress: ctx.req.ip });
      return result;
    }),
  }),
  interviews: router({
    list: staffProcedure.query(() => listInterviews()),
  }),
  notifications: router({
    list: staffProcedure.query(() => listNotifications()),
    markRead: staffProcedure.input(z.object({ id: z.number().int() })).mutation(({ input }) => markNotificationRead(input.id)),
    markAllRead: staffProcedure.mutation(() => markAllNotificationsRead()),
  }),
  candidatePortal: router({
    profile: candidateProcedure.query(({ ctx }) => getCandidateByEmail(ctx.user.email || "")),
    updateProfile: candidateProcedure.input(z.object({
      phone: z.string().max(40).optional(),
      location: z.string().max(160).optional(),
      currentCompany: z.string().max(160).optional(),
      currentPosition: z.string().max(160).optional(),
      experienceYears: z.number().int().min(0).max(60).optional(),
      education: z.string().max(200).optional(),
      skills: z.string().max(2000).optional(),
      resumeUrl: z.string().url().or(z.literal("")).optional(),
      linkedinUrl: z.string().url().or(z.literal("")).optional(),
      githubUrl: z.string().url().or(z.literal("")).optional(),
      portfolioUrl: z.string().url().or(z.literal("")).optional(),
    })).mutation(({ ctx, input }) => updateCandidateProfileByEmail(ctx.user.email || "", input)),
    applications: candidateProcedure.query(({ ctx }) => listCandidateApplicationsByEmail(ctx.user.email || "")),
    interviews: candidateProcedure.query(({ ctx }) => listCandidateInterviewsByEmail(ctx.user.email || "")),
  }),
});

export type AppRouter = typeof appRouter;
