import { useState, type ReactNode } from "react";
import { caseApi, visitApi } from "../../api/endpoints";
import { useApiMutation, useCatalog, useOrganizations, useVets } from "../../api/queries";
import type { CaseDetail, CaseOutcome, CaseStatus, LabPriority, RiskLevel, TimelineEvent } from "../../api/types";
import { useSession } from "../../auth/AuthContext";
import { CASE_STATUS_LABEL, formatDateTime, isoDay, LAB_STATUS_LABEL, LAB_STATUS_STYLE, RISK_LABEL } from "../../lib/format";
import { Field, inputClass } from "../ui/Modal";
import { FormError } from "../ui/States";

/**
 * The veterinary actions of architecture §9, shared by the owner portal's
 * vet case screen and the hospital portal's doctor case screen. Each card
 * saves through the API and refreshes every view of the case.
 */

/** Mirrors the API's allowed status moves (server/src/services/case-workflow.ts). */
const NEXT_STATUS: Record<CaseStatus, CaseStatus[]> = {
  active: ["under_review", "lab_pending", "treated", "resolved"],
  under_review: ["lab_pending", "treated", "resolved"],
  lab_pending: ["under_review", "treated", "resolved"],
  treated: ["under_review", "lab_pending", "resolved"],
  resolved: ["under_review"],
};

const INVALIDATE = [["cases"], ["lab"], ["visits"], ["animals"], ["notifications"]];

export function Card({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-[#E8E5DF] p-5 ${className}`}>
      <h3 className="font-display font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}

const buttonClass =
  "w-full bg-[#1B4332] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2D6A4F] transition-colors disabled:opacity-50";

function Saved({ show }: { show: boolean }) {
  return show ? <p className="text-xs text-green-700 font-semibold mt-2">✓ Saved</p> : null;
}

/** Risk level and working / confirmed diagnosis. */
export function AssessmentCard({ c }: { c: CaseDetail }) {
  const catalog = useCatalog();
  const [risk, setRisk] = useState<RiskLevel | "">(c.riskLevel ?? "");
  const [suspected, setSuspected] = useState(c.suspectedDisease?.code ?? "");
  const [confirmed, setConfirmed] = useState(c.confirmedDisease?.code ?? "");
  // Send only what changed, so the timeline (and the farmer) hear about real changes.
  const changes = {
    ...((risk || null) !== c.riskLevel && { riskLevel: (risk || null) as RiskLevel | null }),
    ...((suspected || null) !== (c.suspectedDisease?.code ?? null) && { suspectedDiseaseCode: suspected || null }),
    ...((confirmed || null) !== (c.confirmedDisease?.code ?? null) && { confirmedDiseaseCode: confirmed || null }),
  };
  const dirty = Object.keys(changes).length > 0;
  const save = useApiMutation(() => caseApi.assess(c.id, changes), INVALIDATE);
  const diseases = catalog.data?.diseases ?? [];

  return (
    <Card title="Assessment">
      <div className="space-y-3">
        <Field label="Risk level">
          <select value={risk} onChange={(e) => setRisk(e.target.value as RiskLevel | "")} className={inputClass}>
            <option value="">Not assessed</option>
            {(["high", "moderate", "low"] as const).map((r) => (
              <option key={r} value={r}>
                {RISK_LABEL[r]} — {r === "high" ? "urgent attention" : r === "moderate" ? "veterinary review" : "monitor"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Suspected disease">
          <select value={suspected} onChange={(e) => setSuspected(e.target.value)} className={inputClass}>
            <option value="">—</option>
            {diseases.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
                {d.notifiable ? " (notifiable)" : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Confirmed diagnosis">
          <select value={confirmed} onChange={(e) => setConfirmed(e.target.value)} className={inputClass}>
            <option value="">Not confirmed</option>
            {diseases.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        <FormError error={save.error} />
        <button type="button" disabled={save.isPending || !dirty} onClick={() => save.mutate(undefined)} className={buttonClass}>
          {save.isPending ? "Saving…" : "Save assessment"}
        </button>
        <Saved show={save.isSuccess && !dirty} />
      </div>
    </Card>
  );
}

/** Move the case along its workflow; resolving asks for the outcome. */
export function StatusCard({ c }: { c: CaseDetail }) {
  const options = NEXT_STATUS[c.status];
  const [picked, setStatus] = useState<CaseStatus>(options[0]!);
  // After the case moves on, the previous choice may no longer be a valid next step.
  const status = options.includes(picked) ? picked : options[0]!;
  const [outcome, setOutcome] = useState<CaseOutcome>("recovered");
  const [note, setNote] = useState("");
  const save = useApiMutation(
    () =>
      caseApi.setStatus(c.id, {
        status,
        note: note.trim() || undefined,
        outcome: status === "resolved" ? outcome : undefined,
      }),
    INVALIDATE,
  );

  return (
    <Card title="Case status">
      <p className="text-sm text-gray-500 mb-3">
        Now: <span className="font-semibold text-gray-800">{CASE_STATUS_LABEL[c.status]}</span>
      </p>
      <div className="space-y-3">
        <Field label="Move to">
          <select value={status} onChange={(e) => setStatus(e.target.value as CaseStatus)} className={inputClass}>
            {options.map((s) => (
              <option key={s} value={s}>
                {c.status === "resolved" ? "Reopen — " : ""}
                {CASE_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
        {status === "resolved" && (
          <Field label="Outcome">
            <select value={outcome} onChange={(e) => setOutcome(e.target.value as CaseOutcome)} className={inputClass}>
              <option value="recovered">Recovered</option>
              <option value="died">Died</option>
              <option value="culled">Culled</option>
              <option value="false_alarm">False alarm</option>
              <option value="other">Other</option>
            </select>
          </Field>
        )}
        <Field label="Note to the farmer (optional)">
          <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
        </Field>
        <FormError error={save.error} />
        <button
          type="button"
          disabled={save.isPending}
          onClick={() => save.mutate(undefined, { onSuccess: () => setNote("") })}
          className={buttonClass}
        >
          {save.isPending ? "Updating…" : "Update status"}
        </button>
      </div>
    </Card>
  );
}

/** Take the case, hand it to a colleague, or refer it to a hospital. */
export function AssignCard({ c }: { c: CaseDetail }) {
  const session = useSession();
  const vets = useVets();
  const hospitals = useOrganizations("hospital");
  const [vetId, setVetId] = useState(c.assignedVet?.id ?? "");
  const [orgId, setOrgId] = useState(c.assignedOrganization?.id ?? "");
  const assign = useApiMutation(
    (body: { vetId?: string | null; organizationId?: string | null }) => caseApi.assign(c.id, body),
    INVALIDATE,
  );
  const isVet = session.account.role === "vet";

  return (
    <Card title="Assignment">
      <p className="text-sm text-gray-500 mb-3">
        {c.assignedVet ? (
          <>
            Handled by <span className="font-semibold text-gray-800">{c.assignedVet.fullName}</span>
          </>
        ) : (
          "No vet assigned yet."
        )}
        {c.assignedOrganization && <> · {c.assignedOrganization.name}</>}
      </p>
      {isVet && c.assignedVet?.id !== session.account.id && (
        <button
          type="button"
          disabled={assign.isPending}
          onClick={() => assign.mutate({ vetId: session.account.id })}
          className={buttonClass + " mb-3"}
        >
          Take this case
        </button>
      )}
      <div className="space-y-3">
        <Field label="Assign to vet">
          <select value={vetId} onChange={(e) => setVetId(e.target.value)} className={inputClass}>
            <option value="">—</option>
            {(vets.data ?? []).map((v) => (
              <option key={v.id} value={v.id}>
                {v.fullName} · {v.openCases} open
              </option>
            ))}
          </select>
        </Field>
        <Field label="Refer to hospital">
          <select value={orgId} onChange={(e) => setOrgId(e.target.value)} className={inputClass}>
            <option value="">—</option>
            {(hospitals.data ?? []).map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </Field>
        <FormError error={assign.error} />
        <button
          type="button"
          disabled={assign.isPending || (!vetId && !orgId)}
          onClick={() => assign.mutate({ vetId: vetId || undefined, organizationId: orgId || undefined })}
          className="w-full border-2 border-[#1B4332] text-[#1B4332] py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1B4332]/5 disabled:opacity-50"
        >
          Save assignment
        </button>
      </div>
    </Card>
  );
}

/** Send samples to a laboratory; the case moves to "Lab pending". */
export function LabRequestForm({ c, onDone }: { c: CaseDetail; onDone?: () => void }) {
  const labs = useOrganizations("lab");
  const [labOrgId, setLabOrgId] = useState("");
  const [sampleType, setSampleType] = useState("");
  const [tests, setTests] = useState("");
  const [priority, setPriority] = useState<LabPriority>(c.riskLevel === "high" ? "urgent" : "normal");
  const request = useApiMutation(
    () =>
      caseApi.requestLab(c.id, {
        labOrgId: labOrgId || labs.data?.[0]?.id || "",
        sampleType,
        tests: tests.split(",").map((t) => t.trim()).filter(Boolean),
        priority,
      }),
    INVALIDATE,
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        request.mutate(undefined, { onSuccess: () => { setSampleType(""); setTests(""); onDone?.(); } });
      }}
      className="space-y-3"
    >
      <Field label="Laboratory">
        <select value={labOrgId} onChange={(e) => setLabOrgId(e.target.value)} className={inputClass}>
          {(labs.data ?? []).map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sample type">
          <input required value={sampleType} onChange={(e) => setSampleType(e.target.value)} placeholder="Serum, skin biopsy…" className={inputClass} />
        </Field>
        <Field label="Priority">
          <select value={priority} onChange={(e) => setPriority(e.target.value as LabPriority)} className={inputClass}>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="routine">Routine</option>
          </select>
        </Field>
      </div>
      <Field label="Tests" hint="Separate with commas.">
        <input required value={tests} onChange={(e) => setTests(e.target.value)} placeholder="ELISA, PCR" className={inputClass} />
      </Field>
      {labs.isSuccess && labs.data.length === 0 && <p className="text-xs text-red-600">No laboratories are registered yet.</p>}
      <FormError error={request.error} />
      <button disabled={request.isPending || !labs.data?.length} className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold font-display hover:bg-purple-700 transition-colors disabled:opacity-50">
        {request.isPending ? "Sending…" : "🧪 Escalate to Lab"}
      </button>
      {request.isSuccess && (
        <p className="text-sm text-purple-700 font-semibold text-center">
          ✓ Sample request {request.data.requestNumber} sent to the lab.
        </p>
      )}
    </form>
  );
}

/** Existing samples for the case with their status. */
export function LabRequestList({ c }: { c: CaseDetail }) {
  if (!c.labRequests.length) return <p className="text-sm text-gray-500">No lab tests ordered yet.</p>;
  return (
    <ul className="space-y-2">
      {c.labRequests.map((l) => (
        <li key={l.id} className="flex items-start gap-2 text-sm">
          <span className="w-5 h-5 bg-amber-100 rounded flex items-center justify-center text-xs shrink-0">🔬</span>
          <div className="flex-1 min-w-0">
            <p className="text-gray-700">
              {l.tests.join(", ")} <span className="text-gray-400">· {l.sampleType}</span>
            </p>
            {l.resultSummary && <p className="text-xs text-gray-500 mt-0.5">{l.resultSummary}</p>}
          </div>
          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${LAB_STATUS_STYLE[l.status]}`}>
            {l.result ? l.result : LAB_STATUS_LABEL[l.status]}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Book a farm visit for this case. */
export function ScheduleVisitCard({ c }: { c: CaseDetail }) {
  const [date, setDate] = useState(isoDay());
  const [time, setTime] = useState("10:00");
  const [purpose, setPurpose] = useState("Follow-up visit");
  const schedule = useApiMutation(
    () =>
      visitApi.create({
        caseId: c.id,
        type: "follow_up",
        scheduledAt: new Date(`${date}T${time}`).toISOString(),
        purpose,
      }),
    INVALIDATE,
  );

  return (
    <Card title="Field visit">
      {c.visits.filter((v) => v.status === "scheduled").map((v) => (
        <p key={v.id} className="text-sm text-gray-700 mb-2">
          🗓️ {formatDateTime(v.scheduledAt)} — {v.purpose}
        </p>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          schedule.mutate(undefined);
        }}
        className="space-y-3"
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <input type="date" required min={isoDay()} value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Time">
            <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field label="Purpose">
          <input value={purpose} onChange={(e) => setPurpose(e.target.value)} className={inputClass} />
        </Field>
        <FormError error={schedule.error} />
        <button disabled={schedule.isPending} className="w-full border-2 border-[#1B4332] text-[#1B4332] py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1B4332]/5 disabled:opacity-50">
          {schedule.isPending ? "Scheduling…" : "Schedule visit"}
        </button>
        {schedule.isSuccess && <p className="text-xs text-green-700 font-semibold">✓ Visit scheduled — the farmer has been told.</p>}
      </form>
    </Card>
  );
}

const EVENT_LABEL: Record<string, string> = {
  created: "Reported",
  status_changed: "Status changed",
  assigned: "Assigned",
  note: "Internal note",
  advice: "Advice to farmer",
  assessment_updated: "Assessment",
  treatment_added: "Treatment",
  lab_requested: "Lab request",
  lab_status_changed: "Lab update",
  lab_result: "Lab result",
  vaccination_recorded: "Vaccination",
  visit_scheduled: "Visit scheduled",
  attachment_added: "Attachment",
  ai_assessment: "AI assessment",
  ai_reviewed: "AI reviewed",
};

/** The case timeline, newest last. */
export function TimelineList({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="space-y-4">
      {events.map((e, i) => (
        <div key={e.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className={`w-2 h-2 rounded-full mt-2 ${e.visibleToReporter ? "bg-[#1B4332]" : "bg-gray-400"}`}></div>
            {i < events.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-1"></div>}
          </div>
          <div className="flex-1 pb-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-bold text-[#1B4332]">{EVENT_LABEL[e.type] ?? e.type}</span>
              <span className="text-xs text-gray-400">
                {formatDateTime(e.createdAt)}
                {e.actor?.fullName ? ` — ${e.actor.fullName}` : ""}
              </span>
            </div>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
              {e.type === "status_changed" && e.toStatus
                ? `${e.fromStatus ? CASE_STATUS_LABEL[e.fromStatus] + " → " : ""}${CASE_STATUS_LABEL[e.toStatus]}${e.body ? `. ${e.body}` : ""}`
                : e.body ?? EVENT_LABEL[e.type]}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Prescribe a treatment; the farmer receives the instructions and withdrawal period. */
export function TreatmentForm({ c }: { c: CaseDetail }) {
  const [form, setForm] = useState({ medicine: "", dosage: "", frequency: "", durationDays: "", withdrawal: "", instructions: "" });
  const add = useApiMutation(
    () =>
      caseApi.addTreatment(c.id, {
        medicine: form.medicine.trim(),
        dosage: form.dosage.trim() || undefined,
        frequency: form.frequency.trim() || undefined,
        durationDays: form.durationDays ? Number(form.durationDays) : undefined,
        withdrawalPeriodDays: form.withdrawal ? Number(form.withdrawal) : undefined,
        instructions: form.instructions.trim() || undefined,
      }),
    INVALIDATE,
  );
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        add.mutate(undefined, {
          onSuccess: () => setForm({ medicine: "", dosage: "", frequency: "", durationDays: "", withdrawal: "", instructions: "" }),
        });
      }}
      className="space-y-3"
    >
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Medicine">
          <input required value={form.medicine} onChange={set("medicine")} placeholder="Oxytetracycline" className={inputClass} />
        </Field>
        <Field label="Dose">
          <input value={form.dosage} onChange={set("dosage")} placeholder="10 mg/kg IM" className={inputClass} />
        </Field>
        <Field label="Frequency">
          <input value={form.frequency} onChange={set("frequency")} placeholder="Once daily" className={inputClass} />
        </Field>
        <Field label="Days">
          <input type="number" min={1} value={form.durationDays} onChange={set("durationDays")} className={inputClass} />
        </Field>
        <Field label="Milk/meat withdrawal (days)">
          <input type="number" min={0} value={form.withdrawal} onChange={set("withdrawal")} className={inputClass} />
        </Field>
      </div>
      <Field label="Instructions for the owner">
        <input value={form.instructions} onChange={set("instructions")} placeholder="Keep isolated; clean lesions twice daily…" className={inputClass} />
      </Field>
      <FormError error={add.error} />
      <button disabled={add.isPending} className="gradient-primary text-white text-sm font-semibold px-5 py-2 rounded-xl hover:opacity-90 transition-all disabled:opacity-50">
        {add.isPending ? "Saving…" : "+ Add Treatment"}
      </button>
    </form>
  );
}

/**
 * Add a note — internal, or shared with the farmer as advice. Pass
 * `allowShare={false}` where advising the farmer is not the author's job,
 * as on the laboratory's view of a case.
 */
export function NoteForm({ c, placeholder, allowShare = true }: { c: CaseDetail; placeholder?: string; allowShare?: boolean }) {
  const [body, setBody] = useState("");
  const [share, setShare] = useState(false);
  const add = useApiMutation(
    () => caseApi.addNote(c.id, { body: body.trim(), visibleToReporter: allowShare && share }),
    INVALIDATE,
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (body.trim()) add.mutate(undefined, { onSuccess: () => setBody("") });
      }}
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder={placeholder ?? "Record observations, advice or follow-up instructions…"}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1B4332] resize-none"
      />
      <div className="flex items-center justify-between gap-3 mt-2">
        {allowShare ? (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} />
            Send to the farmer as advice
          </label>
        ) : (
          <span />
        )}
        <button disabled={add.isPending || !body.trim()} className="gradient-primary text-white text-sm font-semibold px-5 py-2 rounded-xl hover:opacity-90 transition-all disabled:opacity-50">
          {add.isPending ? "Adding…" : "+ Add Note"}
        </button>
      </div>
      <FormError error={add.error} />
    </form>
  );
}
