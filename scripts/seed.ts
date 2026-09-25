import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getDb } from "../server/db";
import { applications, candidates, departments, interviews, jobs, notifications, users } from "../drizzle/schema";

const seed = async () => {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is not configured");
  const demoPasswordHash = await bcrypt.hash(process.env.SEED_STAFF_PASSWORD || "TalentFlow123!", 12);

  await db.insert(users).values([
    { openId: "seed-admin", name: "Alex Morgan", email: "alex@talentflow.demo", role: "admin", loginMethod: "password", authProvider: "password", passwordHash: demoPasswordHash, isActive: true },
    { openId: "seed-recruiter", name: "Maya Patel", email: "maya@talentflow.demo", role: "recruiter", loginMethod: "password", authProvider: "password", passwordHash: demoPasswordHash, isActive: true },
    { openId: "seed-manager", name: "Jordan Lee", email: "jordan@talentflow.demo", role: "hiring_manager", loginMethod: "password", authProvider: "password", passwordHash: demoPasswordHash, isActive: true },
    { openId: "seed-interviewer", name: "Chris Wong", email: "chris@talentflow.demo", role: "interviewer", loginMethod: "password", authProvider: "password", passwordHash: demoPasswordHash, isActive: true },
  ]).onDuplicateKeyUpdate({ set: { updatedAt: new Date(), passwordHash: demoPasswordHash, authProvider: "password", isActive: true } });

  const departmentNames = ["Engineering", "Product & Design", "People", "Sales", "Marketing", "Finance"];
  for (const name of departmentNames) {
    await db.insert(departments).values({ name, description: `${name} talent community`, status: "active" }).onDuplicateKeyUpdate({ set: { status: "active" } });
  }
  const departmentRows = await db.select().from(departments);
  const departmentId = (name: string) => departmentRows.find(row => row.name === name)?.id;

  const candidateSeeds = [
    { firstName: "Aisha", lastName: "Rahman", email: "aisha.rahman@example.com", location: "Bengaluru, IN", currentCompany: "CloudKite", currentPosition: "Senior Frontend Engineer", experienceYears: 6, education: "B.Tech, Computer Science", skills: "React, TypeScript, Design Systems", source: "Referral" },
    { firstName: "Marcus", lastName: "Chen", email: "marcus.chen@example.com", location: "Singapore", currentCompany: "Nimble Labs", currentPosition: "Product Designer", experienceYears: 5, education: "M.Des, Interaction Design", skills: "Figma, Research, Prototyping", source: "LinkedIn" },
    { firstName: "Elena", lastName: "Torres", email: "elena.torres@example.com", location: "Austin, TX", currentCompany: "BrightOps", currentPosition: "Data Analyst", experienceYears: 3, education: "B.S. Statistics", skills: "SQL, Python, Tableau", source: "Careers page" },
    { firstName: "Noah", lastName: "Williams", email: "noah.williams@example.com", location: "London, UK", currentCompany: "Orbit Health", currentPosition: "Backend Engineer", experienceYears: 8, education: "M.Sc, Software Engineering", skills: "Node.js, PostgreSQL, AWS", source: "Agency" },
    { firstName: "Priya", lastName: "Nair", email: "priya.nair@example.com", location: "Pune, IN", currentCompany: "Northstar", currentPosition: "ML Engineer", experienceYears: 4, education: "M.Tech, AI", skills: "Python, PyTorch, MLOps", source: "Referral" },
    { firstName: "Diego", lastName: "Santos", email: "diego.santos@example.com", location: "Lisbon, PT", currentCompany: "Fieldwork", currentPosition: "Sales Manager", experienceYears: 7, education: "MBA", skills: "B2B SaaS, GTM, Enablement", source: "Outbound" },
  ];
  for (const candidate of candidateSeeds) {
    await db.insert(candidates).values(candidate).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
  }
  const candidateRows = await db.select().from(candidates);

  const jobSeeds = [
    { title: "Senior Frontend Engineer", description: "Own the next generation of TalentFlow's hiring workspace.", skills: "React, TypeScript, UX", location: "Remote · India", departmentId: departmentId("Engineering"), experienceMin: 5, experienceMax: 9, openings: 2, hiringManagerName: "Jordan Lee", status: "OPEN" as const, applicationDeadline: "2026-10-30" },
    { title: "Product Designer", description: "Make complex recruiting workflows feel calm, clear, and human.", skills: "Figma, Design Systems, Research", location: "Remote · Europe", departmentId: departmentId("Product & Design"), experienceMin: 4, experienceMax: 8, openings: 1, hiringManagerName: "Jordan Lee", status: "OPEN" as const, applicationDeadline: "2026-11-14" },
    { title: "Data Analyst", description: "Turn funnel data into better hiring decisions.", skills: "SQL, Python, Tableau", location: "New York, NY", departmentId: departmentId("Finance"), experienceMin: 2, experienceMax: 5, openings: 1, hiringManagerName: "Maya Patel", status: "OPEN" as const, applicationDeadline: "2026-11-21" },
    { title: "People Operations Partner", description: "Build thoughtful systems for a high-performing global team.", skills: "People Ops, HRIS, Coaching", location: "London, UK", departmentId: departmentId("People"), experienceMin: 5, experienceMax: 10, openings: 1, hiringManagerName: "Alex Morgan", status: "PAUSED" as const, applicationDeadline: "2026-11-05" },
  ];
  for (const job of jobSeeds) {
    const existing = await db.select().from(jobs).where(eq(jobs.title, job.title)).limit(1);
    if (!existing.length) await db.insert(jobs).values(job);
  }
  const jobRows = await db.select().from(jobs);
  const jobId = (title: string) => jobRows.find(row => row.title === title)?.id;
  const candidateId = (email: string) => candidateRows.find(row => row.email === email)?.id;

  const applicationSeeds = [
    { email: "aisha.rahman@example.com", job: "Senior Frontend Engineer", currentStage: "Interview" as const, recruiterName: "Maya Patel", source: "Referral" },
    { email: "marcus.chen@example.com", job: "Product Designer", currentStage: "Shortlisted" as const, recruiterName: "Maya Patel", source: "LinkedIn" },
    { email: "elena.torres@example.com", job: "Data Analyst", currentStage: "Screening" as const, recruiterName: "Maya Patel", source: "Careers page" },
    { email: "noah.williams@example.com", job: "Senior Frontend Engineer", currentStage: "Offer" as const, recruiterName: "Maya Patel", source: "Agency" },
    { email: "priya.nair@example.com", job: "Data Analyst", currentStage: "Applied" as const, recruiterName: "Maya Patel", source: "Referral" },
    { email: "diego.santos@example.com", job: "People Operations Partner", currentStage: "Rejected" as const, recruiterName: "Maya Patel", status: "REJECTED" as const, source: "Outbound" },
  ];
  const applicationRows = await db.select().from(applications);
  if (!applicationRows.length) {
    await db.insert(applications).values(applicationSeeds.map(item => ({
      candidateId: candidateId(item.email)!,
      jobId: jobId(item.job)!,
      currentStage: item.currentStage,
      recruiterName: item.recruiterName,
      source: item.source,
      status: item.status ?? "ACTIVE",
    })));
  }
  const refreshedApplications = await db.select().from(applications);
  const frontendApp = refreshedApplications.find(app => app.currentStage === "Interview");
  const designerCandidate = candidateId("marcus.chen@example.com");
  const productJob = jobId("Product Designer");
  const existingInterviews = await db.select().from(interviews);
  if (!existingInterviews.length && frontendApp) {
    await db.insert(interviews).values([
      { applicationId: frontendApp.id, candidateId: frontendApp.candidateId, jobId: frontendApp.jobId, interviewerName: "Chris Wong", scheduledAt: new Date("2026-10-02T10:30:00Z"), duration: 45, interviewType: "Video", meetingLink: "https://meet.talentflow.demo/aisha", status: "Scheduled" },
      ...(designerCandidate && productJob ? [{ applicationId: refreshedApplications.find(app => app.candidateId === designerCandidate)?.id ?? frontendApp.id, candidateId: designerCandidate, jobId: productJob, interviewerName: "Jordan Lee", scheduledAt: new Date("2026-10-03T14:00:00Z"), duration: 60, interviewType: "Onsite", location: "London · Studio 4", status: "Scheduled" as const }] : []),
    ]);
  }

  const existingNotifications = await db.select().from(notifications);
  if (!existingNotifications.length) {
    await db.insert(notifications).values([
      { type: "Interview Scheduled", title: "Interview scheduled", message: "Aisha Rahman is meeting Chris Wong on Oct 2 at 10:30 AM.", isRead: false, entityType: "interview", entityId: 1 },
      { type: "Candidate Shortlisted", title: "Candidate moved to shortlist", message: "Marcus Chen is ready for hiring manager review.", isRead: false, entityType: "candidate", entityId: designerCandidate },
      { type: "New Application", title: "New application received", message: "Priya Nair applied for Data Analyst.", isRead: false, entityType: "application", entityId: 5 },
      { type: "Job Deadline", title: "Deadline approaching", message: "Senior Frontend Engineer closes in 5 days.", isRead: true, entityType: "job", entityId: jobId("Senior Frontend Engineer") },
    ]);
  }

  console.log("TalentFlow ATS demo data seeded");
};

seed().catch(error => {
  console.error(error);
  process.exit(1);
});
