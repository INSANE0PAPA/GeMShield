import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  role: z.enum(["vendor", "officer"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    const role = search.role ?? "vendor";
    const mode = search.mode ?? "signin";
    throw redirect({
      to: role === "officer"
        ? (mode === "signup" ? "/government/sign-up" : "/government/sign-in")
        : (mode === "signup" ? "/vendor/sign-up" : "/vendor/sign-in"),
    });
  },
});
