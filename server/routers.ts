import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { workspaceRouter } from "./routers/workspace";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import crypto from "node:crypto";
import { z } from "zod";

function hasMatchingLocalPassword(password: string) {
  const expected = Buffer.from(ENV.localAdminPassword);
  const received = Buffer.from(password);
  if (!expected.length || expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    localLogin: publicProcedure.input(z.object({ password: z.string().min(1).max(512) })).mutation(async ({ ctx, input }) => {
      if (ENV.authMode !== "local" || !hasMatchingLocalPassword(input.password)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid local login" });
      }
      const sessionToken = await sdk.createSessionToken(ENV.localAdminOpenId, {
        name: ENV.localAdminName,
        expiresInMs: ONE_YEAR_MS,
      });
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(ctx.req), maxAge: ONE_YEAR_MS });
      return { success: true } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  workspace: workspaceRouter,
});

export type AppRouter = typeof appRouter;
