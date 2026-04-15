import { z } from "zod";

/** Veb akkaunt: email yoki telefon + parol. */
export const builderWebLoginBodySchema = z
  .object({
    contact: z.string().trim().min(1).max(200),
    password: z.string().min(1).max(128),
  })
  .strip();

export type BuilderWebLoginBody = z.infer<typeof builderWebLoginBodySchema>;

export const builderForgotBodySchema = z
  .object({
    contact: z.string().trim().min(1).max(200),
  })
  .strip();

export const builderResetPasswordBodySchema = z
  .object({
    token: z.string().trim().min(16).max(200),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(1).max(128),
  })
  .strip()
  .superRefine((v, ctx) => {
    if (v.password !== v.confirmPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "password_mismatch", path: ["confirmPassword"] });
    }
  });
