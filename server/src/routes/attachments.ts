import { Router } from "express";
import multer from "multer";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { currentUser, type CurrentUser } from "../auth/middleware.js";
import type { Db } from "../db/client.js";
import { ATTACHMENT_KINDS, attachments } from "../db/schema.js";
import type { Deps } from "../deps.js";
import { loadVisibleAnimal, loadVisibleCase, loadWritableHerd } from "../lib/access.js";
import { badRequest, conflict, forbidden, HttpError, notFound } from "../lib/errors.js";
import { EXTENSIONS, sniffContentType } from "../lib/sniff.js";
import * as v from "../lib/validation.js";
import { LocalStorage } from "../storage/index.js";
import { scheduleAiAssessment } from "../services/ai-runner.js";
import { presentAttachments } from "../services/case-queries.js";
import { recordCaseEvent } from "../services/case-workflow.js";
import { loadVisibleLabRequest } from "./lab.js";

type Kind = (typeof ATTACHMENT_KINDS)[number];

const IMAGES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const AUDIO = ["audio/webm", "audio/ogg", "audio/mpeg", "audio/mp4", "audio/aac", "audio/wav", "audio/3gpp", "audio/amr"];

const ALLOWED: Record<Kind, string[]> = {
  photo: IMAGES,
  voice: AUDIO,
  document: [...IMAGES, "application/pdf"],
  lab_report: [...IMAGES, "application/pdf"],
};

const uploadFields = z
  .object({
    id: v.uuid.optional(),
    kind: z.enum(ATTACHMENT_KINDS),
    caseId: v.uuid.optional(),
    labRequestId: v.uuid.optional(),
    animalId: v.uuid.optional(),
  })
  .refine((b) => [b.caseId, b.labRequestId, b.animalId].filter(Boolean).length === 1, {
    message: "Attach to exactly one of caseId, labRequestId or animalId.",
    path: ["caseId"],
  });

/** Check the uploader may attach to this record, and return a storage folder for it. */
async function authorizeTarget(db: Db, me: CurrentUser, f: z.infer<typeof uploadFields>): Promise<string> {
  if (f.caseId) {
    if (me.role === "official" || me.role === "lab_tech") throw forbidden("You cannot add files to cases.");
    if (f.kind === "lab_report") throw badRequest("Attach lab reports to the lab request.");
    await loadVisibleCase(db, me, f.caseId);
    return `cases/${f.caseId}`;
  }
  if (f.labRequestId) {
    const r = await loadVisibleLabRequest(db, me, f.labRequestId);
    const isLab = me.role === "lab_tech" && me.organizationId === r.labOrgId;
    if (!isLab && me.role !== "admin" && r.requestedById !== me.id) {
      throw forbidden("Only the laboratory or the requesting vet can add files to a sample.");
    }
    return `lab-requests/${f.labRequestId}`;
  }
  if (f.kind !== "photo") throw badRequest("Only photos can be attached to an animal profile.");
  const { herd } = await loadVisibleAnimal(db, me, f.animalId!);
  await loadWritableHerd(db, me, herd.id);
  return `animals/${f.animalId}`;
}

/** Access to an existing attachment follows access to whatever it is attached to. */
async function loadVisibleAttachment(db: Db, me: CurrentUser, id: string) {
  const [a] = await db.select().from(attachments).where(eq(attachments.id, id));
  if (!a) throw notFound("Attachment");
  try {
    if (a.caseId) await loadVisibleCase(db, me, a.caseId);
    else if (a.labRequestId) await loadVisibleLabRequest(db, me, a.labRequestId);
    else if (a.animalId) await loadVisibleAnimal(db, me, a.animalId);
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) throw notFound("Attachment");
    throw err;
  }
  return a;
}

export function attachmentsRouter(deps: Deps): Router {
  const { db, storage, config } = deps;
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.maxUploadBytes, files: 1, fields: 10 },
  });

  /**
   * multipart/form-data with a `file` part plus `kind` and one of `caseId`,
   * `labRequestId` or `animalId`. Send a client-generated `id` so a retried
   * offline upload is stored once.
   */
  router.post("/", upload.single("file"), async (req, res) => {
    const me = currentUser(req);
    const fields = uploadFields.parse(req.body);
    if (!req.file) throw badRequest("Attach a file in the `file` field.");

    if (fields.id) {
      const [existing] = await db.select().from(attachments).where(eq(attachments.id, fields.id));
      if (existing) {
        if (existing.uploadedById !== me.id) throw conflict("An attachment with this id already exists.");
        const [presented] = await presentAttachments(storage, [existing]);
        res.status(200).json(presented);
        return;
      }
    }

    const folder = await authorizeTarget(db, me, fields);
    const contentType = sniffContentType(req.file.buffer);
    if (!contentType || !ALLOWED[fields.kind].includes(contentType)) {
      throw new HttpError(415, "unsupported_media_type", `That file type is not accepted for a ${fields.kind}.`, {
        accepted: ALLOWED[fields.kind],
      });
    }

    const id = fields.id ?? crypto.randomUUID();
    const storageKey = `${folder}/${id}.${EXTENSIONS[contentType]}`;
    await storage.put(storageKey, req.file.buffer, contentType);
    let row: typeof attachments.$inferSelect;
    try {
      row = await db.transaction(async (tx) => {
        const [a] = await tx
          .insert(attachments)
          .values({
            id,
            kind: fields.kind,
            storageKey,
            contentType,
            sizeBytes: req.file!.size,
            originalName: req.file!.originalname?.slice(0, 200) || null,
            caseId: fields.caseId,
            labRequestId: fields.labRequestId,
            animalId: fields.animalId,
            uploadedById: me.id,
          })
          .returning();
        if (fields.caseId) {
          await recordCaseEvent(tx, {
            caseId: fields.caseId,
            type: "attachment_added",
            actorId: me.id,
            body: fields.kind === "photo" ? "Photo added." : fields.kind === "voice" ? "Voice note added." : "Document added.",
            data: { attachmentId: id, kind: fields.kind },
            visibleToReporter: true,
          });
        }
        return a!;
      });
    } catch (err) {
      await storage.remove(storageKey).catch(() => {});
      throw err;
    }

    // New evidence is worth another look by the AI services (§6).
    if (fields.caseId && (fields.kind === "photo" || fields.kind === "voice")) {
      scheduleAiAssessment(deps, fields.caseId, "attachment_added");
    }
    const [presented] = await presentAttachments(storage, [row]);
    res.status(201).json(presented);
  });

  router.get("/:id", async (req, res) => {
    const a = await loadVisibleAttachment(db, currentUser(req), v.uuid.parse(req.params.id));
    const [presented] = await presentAttachments(storage, [a]);
    res.json(presented);
  });

  /** Check access, then redirect to a short-lived signed URL for the file. */
  router.get("/:id/content", async (req, res) => {
    const a = await loadVisibleAttachment(db, currentUser(req), v.uuid.parse(req.params.id));
    res.redirect(302, await storage.signedUrl(a.storageKey, 60));
  });

  return router;
}

/**
 * Serves locally stored files behind signed links (the local stand-in for
 * Supabase Storage signed URLs). The signature is the authorisation, so this
 * is mounted outside the authenticated routes.
 */
export function filesRouter(deps: Deps): Router {
  const router = Router();
  router.get("/:key", async (req, res) => {
    const storage = deps.storage;
    if (!(storage instanceof LocalStorage)) throw notFound("File");
    const q = z.object({ expires: z.coerce.number().int(), signature: z.string().max(100) }).parse(req.query);
    const key = req.params.key;
    if (!storage.verify(key, q.expires, q.signature)) {
      throw new HttpError(403, "invalid_signature", "This link is invalid or has expired.");
    }
    const [a] = await deps.db.select().from(attachments).where(eq(attachments.storageKey, key));
    if (!a) throw notFound("File");
    const body = await storage.read(key);
    res.set({
      "Content-Type": a.contentType,
      "Content-Length": String(body.length),
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": `inline; filename="${a.id}.${EXTENSIONS[a.contentType] ?? "bin"}"`,
      // Let the frontend's origin embed it in <img> / <audio>.
      "Cross-Origin-Resource-Policy": "cross-origin",
    });
    res.send(body);
  });
  return router;
}
