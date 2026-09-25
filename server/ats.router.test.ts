import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createCaller() {
  const ctx: TrpcContext = {
    user: {
      id: 1,
      openId: "test-admin",
      name: "Test Admin",
      email: "admin@example.com",
      passwordHash: null,
      authProvider: "password",
      googleId: null,
      departmentId: null,
      isActive: true,
      loginMethod: "password",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      lastLogin: null,
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

describe("ATS router contracts", () => {
  it("returns the dashboard metric shape", async () => {
    const overview = await createCaller().dashboard.overview();
    expect(overview).toMatchObject({
      candidates: expect.any(Number),
      openJobs: expect.any(Number),
      applications: expect.any(Number),
      shortlisted: expect.any(Number),
      interviews: expect.any(Number),
      offers: expect.any(Number),
      hires: expect.any(Number),
      rejected: expect.any(Number),
      unreadNotifications: expect.any(Number),
    });
  });

  it("rejects malformed candidate payloads before touching the database", async () => {
    await expect(createCaller().candidates.create({
      firstName: "A",
      lastName: "Candidate",
      email: "not-an-email",
      experienceYears: 2,
      source: "Direct",
    })).rejects.toThrow();
  });

  it("rejects unsupported pipeline stages", async () => {
    await expect(createCaller().applications.updateStage({
      id: 1,
      stage: "Needs review" as never,
    })).rejects.toThrow();
  });
});
