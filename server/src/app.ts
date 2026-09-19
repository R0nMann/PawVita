import express, { Router, type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { rateLimits } from "./lib/rateLimits.js";
import { authenticate, requireActiveUser, requireRole } from "./auth/middleware.js";
import type { Deps } from "./deps.js";
import { errorHandler, notFoundHandler } from "./lib/errors.js";
import { adminRouter } from "./routes/admin.js";
import { admissionsRouter } from "./routes/admissions.js";
import { advisoriesRouter } from "./routes/advisories.js";
import { analyticsRouter } from "./routes/analytics.js";
import { attachmentsRouter, filesRouter } from "./routes/attachments.js";
import { authRouter, meRouter } from "./routes/auth.js";
import { casesRouter } from "./routes/cases.js";
import { directoryRouter } from "./routes/directory.js";
import { herdsRouter } from "./routes/herds.js";
import { labRouter } from "./routes/lab.js";
import { notificationsRouter } from "./routes/notifications.js";
import { publicRouter } from "./routes/public.js";
import { referenceRouter } from "./routes/reference.js";
import { vaccinationsRouter } from "./routes/vaccinations.js";
import { visitsRouter } from "./routes/visits.js";
import { API_PREFIX } from "./lib/constants.js";

export function createApp(deps: Deps): Express {
  const { config, db, auth, logger } = deps;
  const app = express();
  app.set("trust proxy", config.trustProxy);
  app.disable("x-powered-by");

  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url?.startsWith("/health") ?? false },
      customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info"),
      // Never log bearer tokens.
      redact: ["req.headers.authorization", "req.headers.cookie"],
    }),
  );
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigins,
      exposedHeaders: ["RateLimit", "RateLimit-Policy", "Retry-After"],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.get("/health/ready", async (_req, res) => {
    try {
      await deps.database.ping();
      res.json({ status: "ready" });
    } catch {
      res.status(503).json({ status: "unavailable" });
    }
  });

  const api = Router();
  // Sign-in has its own per-phone / per-identifier limits (routes/auth.ts).
  api.use("/auth", authRouter(deps));
  api.use(rateLimits(config).api);

  // Open to anyone: reference data and landing-page aggregates.
  api.use("/me", meRouter(deps));
  api.use("/public", publicRouter(deps));
  api.use(referenceRouter(deps));
  api.use("/files", filesRouter(deps));

  // Everything else needs an approved, active account.
  const secured = Router();
  secured.use(authenticate(db, auth), requireActiveUser);
  secured.use(herdsRouter(deps));
  secured.use(vaccinationsRouter(deps));
  secured.use("/cases", casesRouter(deps));
  secured.use("/lab-requests", labRouter(deps));
  secured.use("/visits", visitsRouter(deps));
  secured.use("/admissions", admissionsRouter(deps));
  secured.use("/attachments", attachmentsRouter(deps));
  secured.use("/advisories", advisoriesRouter(deps));
  secured.use("/notifications", notificationsRouter(deps));
  secured.use("/analytics", analyticsRouter(deps));
  secured.use("/directory", directoryRouter(deps));
  secured.use("/admin", requireRole("admin"), adminRouter(deps));
  api.use(secured);

  app.use(API_PREFIX, api);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
