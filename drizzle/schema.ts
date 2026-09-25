import {
  boolean,
  date,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  // Legacy external identity key retained for existing rows; standalone auth uses email/googleId.
  openId: varchar("openId", { length: 128 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  authProvider: mysqlEnum("authProvider", ["password", "google", "legacy"]).default("password").notNull(),
  googleId: varchar("googleId", { length: 255 }).unique(),
  departmentId: int("departmentId"),
  isActive: boolean("isActive").default(true).notNull(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "recruiter", "hiring_manager", "interviewer", "candidate"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  lastLogin: timestamp("lastLogin"),
});

export const authSessions = mysqlTable("auth_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  revokedAt: timestamp("revokedAt"),
}, (table) => ({
  userIdx: index("auth_sessions_user_idx").on(table.userId),
  expiryIdx: index("auth_sessions_expiry_idx").on(table.expiresAt),
}));

export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("password_reset_user_idx").on(table.userId),
  expiryIdx: index("password_reset_expiry_idx").on(table.expiresAt),
}));

export const departments = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  description: text("description"),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const candidates = mysqlTable("candidates", {
  id: int("id").autoincrement().primaryKey(),
  firstName: varchar("firstName", { length: 80 }).notNull(),
  lastName: varchar("lastName", { length: 80 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  phone: varchar("phone", { length: 40 }),
  location: varchar("location", { length: 160 }),
  currentCompany: varchar("currentCompany", { length: 160 }),
  currentPosition: varchar("currentPosition", { length: 160 }),
  experienceYears: int("experienceYears").default(0).notNull(),
  education: varchar("education", { length: 200 }),
  skills: text("skills"),
  resumeUrl: text("resumeUrl"),
  linkedinUrl: text("linkedinUrl"),
  githubUrl: text("githubUrl"),
  portfolioUrl: text("portfolioUrl"),
  source: varchar("source", { length: 80 }).default("Direct").notNull(),
  status: mysqlEnum("status", ["ACTIVE", "ARCHIVED"]).default("ACTIVE").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  locationIdx: index("candidates_location_idx").on(table.location),
  statusIdx: index("candidates_status_idx").on(table.status),
}));

export const jobs = mysqlTable("jobs", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description"),
  responsibilities: text("responsibilities"),
  requirements: text("requirements"),
  skills: text("skills"),
  departmentId: int("departmentId"),
  location: varchar("location", { length: 160 }),
  employmentType: mysqlEnum("employmentType", ["Full-time", "Part-time", "Contract", "Internship"]).default("Full-time").notNull(),
  experienceMin: int("experienceMin").default(0).notNull(),
  experienceMax: int("experienceMax").default(5).notNull(),
  salaryMin: decimal("salaryMin", { precision: 12, scale: 2 }),
  salaryMax: decimal("salaryMax", { precision: 12, scale: 2 }),
  openings: int("openings").default(1).notNull(),
  hiringManagerId: int("hiringManagerId"),
  hiringManagerName: varchar("hiringManagerName", { length: 160 }),
  status: mysqlEnum("status", ["DRAFT", "OPEN", "PAUSED", "CLOSED"]).default("DRAFT").notNull(),
  applicationDeadline: date("applicationDeadline"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  statusIdx: index("jobs_status_idx").on(table.status),
  departmentIdx: index("jobs_department_idx").on(table.departmentId),
}));

export const applications = mysqlTable("applications", {
  id: int("id").autoincrement().primaryKey(),
  candidateId: int("candidateId").notNull(),
  jobId: int("jobId").notNull(),
  recruiterId: int("recruiterId"),
  recruiterName: varchar("recruiterName", { length: 160 }),
  status: mysqlEnum("status", ["ACTIVE", "REJECTED", "WITHDRAWN"]).default("ACTIVE").notNull(),
  currentStage: mysqlEnum("currentStage", ["Applied", "Screening", "Shortlisted", "Interview", "Offer", "Hired", "Rejected", "Withdrawn"]).default("Applied").notNull(),
  appliedAt: timestamp("appliedAt").defaultNow().notNull(),
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
  source: varchar("source", { length: 80 }).default("Careers page").notNull(),
  notes: text("notes"),
}, (table) => ({
  candidateIdx: index("applications_candidate_idx").on(table.candidateId),
  jobIdx: index("applications_job_idx").on(table.jobId),
  stageIdx: index("applications_stage_idx").on(table.currentStage),
}));

export const interviews = mysqlTable("interviews", {
  id: int("id").autoincrement().primaryKey(),
  applicationId: int("applicationId").notNull(),
  candidateId: int("candidateId").notNull(),
  jobId: int("jobId").notNull(),
  interviewerId: int("interviewerId"),
  interviewerName: varchar("interviewerName", { length: 160 }).notNull(),
  scheduledAt: timestamp("scheduledAt").notNull(),
  duration: int("duration").default(45).notNull(),
  interviewType: mysqlEnum("interviewType", ["Video", "Onsite", "Phone"]).default("Video").notNull(),
  meetingLink: text("meetingLink"),
  location: varchar("location", { length: 240 }),
  status: mysqlEnum("status", ["Scheduled", "Completed", "Cancelled"]).default("Scheduled").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  scheduleIdx: index("interviews_scheduled_idx").on(table.scheduledAt),
}));

export const interviewFeedback = mysqlTable("interview_feedback", {
  id: int("id").autoincrement().primaryKey(),
  interviewId: int("interviewId").notNull().unique(),
  interviewerId: int("interviewerId"),
  interviewerName: varchar("interviewerName", { length: 160 }),
  technicalScore: int("technicalScore"),
  communicationScore: int("communicationScore"),
  problemSolvingScore: int("problemSolvingScore"),
  overallScore: int("overallScore"),
  recommendation: mysqlEnum("recommendation", ["Strong Hire", "Hire", "Hold", "Reject"]),
  comments: text("comments"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const candidateNotes = mysqlTable("candidate_notes", {
  id: int("id").autoincrement().primaryKey(),
  candidateId: int("candidateId").notNull(),
  userId: int("userId"),
  note: text("note").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const candidateDocuments = mysqlTable("candidate_documents", {
  id: int("id").autoincrement().primaryKey(),
  candidateId: int("candidateId").notNull(),
  type: mysqlEnum("type", ["Resume", "Cover letter", "Certificate", "Other"]).default("Resume").notNull(),
  fileName: varchar("fileName", { length: 240 }).notNull(),
  fileKey: text("fileKey").notNull(),
  mimeType: varchar("mimeType", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  type: varchar("type", { length: 80 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  entityType: varchar("entityType", { length: 80 }),
  entityId: int("entityId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  readIdx: index("notifications_read_idx").on(table.isRead),
}));

export const activityLogs = mysqlTable("activity_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  action: varchar("action", { length: 120 }).notNull(),
  entityType: varchar("entityType", { length: 80 }).notNull(),
  entityId: int("entityId"),
  description: text("description").notNull(),
  ipAddress: varchar("ipAddress", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Candidate = typeof candidates.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type Interview = typeof interviews.$inferSelect;
