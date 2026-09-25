export const COOKIE_NAME = "talentflow_session";
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = "Authentication required";
export const NOT_ADMIN_ERR_MSG = "You do not have required permission";

export const STAFF_ROLES = ["admin", "recruiter", "hiring_manager", "interviewer"] as const;
export const ALL_ROLES = [...STAFF_ROLES, "candidate"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export type AppRole = (typeof ALL_ROLES)[number];
