import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(user: TrpcContext["user"]): TrpcContext {
  return { user, req: { ip: "127.0.0.1", protocol: "http", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined, cookie: () => undefined } as TrpcContext["res"] };
}

const baseUser = { id: 42, openId: "test-user", name: "Test User", email: "test@example.com", passwordHash: null, authProvider: "password" as const, googleId: null, departmentId: null, isActive: true, loginMethod: "password", role: "candidate" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), lastLogin: null };

describe("standalone auth boundaries", () => {
  it("keeps private ATS APIs closed to unauthenticated callers", async () => {
    const caller = appRouter.createCaller(context(null));
    await expect(caller.dashboard.overview()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.candidates.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(await caller.auth.me()).toBeNull();
  });

  it("prevents candidate accounts from accessing internal dashboards", async () => {
    const caller = appRouter.createCaller(context(baseUser));
    await expect(caller.dashboard.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.jobs.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("prevents interviewers from managing jobs or moving applications", async () => {
    const caller = appRouter.createCaller(context({ ...baseUser, role: "interviewer", email: "interviewer@example.com" }));
    await expect(caller.jobs.create({ title: "Restricted role", status: "OPEN", employmentType: "Full-time", experienceMin: 0, experienceMax: 2, openings: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.applications.updateStage({ id: 1, stage: "Screening" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows candidate-owned portal procedures only for candidates", async () => {
    const caller = appRouter.createCaller(context(baseUser));
    await expect(caller.candidatePortal.applications()).resolves.toBeInstanceOf(Array);
    await expect(caller.candidatePortal.interviews()).resolves.toBeInstanceOf(Array);
  });
});
