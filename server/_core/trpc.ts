import { NOT_ADMIN_ERR_MSG, STAFF_ROLES, UNAUTHED_ERR_MSG, type AppRole, type StaffRole } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const protectedProcedure = t.procedure.use(requireUser);

const requireRoles = (roles: readonly AppRole[]) => t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  if (!roles.includes(ctx.user.role as AppRole)) {
    throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const roleProcedure = (roles: readonly AppRole[]) => t.procedure.use(requireRoles(roles));
export const staffProcedure = roleProcedure(STAFF_ROLES);
export const adminProcedure = roleProcedure(["admin"]);
export const recruiterProcedure = roleProcedure(["admin", "recruiter"]);
export const hiringManagerProcedure = roleProcedure(["admin", "hiring_manager"]);
export const interviewerProcedure = roleProcedure(["admin", "interviewer"]);
export const candidateProcedure = roleProcedure(["candidate"]);

export type { StaffRole };
