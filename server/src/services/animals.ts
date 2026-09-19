import { desc, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { vaccinations, vaccines } from "../db/schema.js";

/** Latest record per vaccine for an animal, with overdue/upcoming status. */
export async function vaccinationStatus(db: Db, animalId: string) {
  const rows = await db
    .selectDistinctOn([vaccinations.vaccineCode], {
      vaccineCode: vaccinations.vaccineCode,
      vaccineName: vaccines.name,
      administeredOn: vaccinations.administeredOn,
      nextDueOn: vaccinations.nextDueOn,
    })
    .from(vaccinations)
    .innerJoin(vaccines, eq(vaccines.code, vaccinations.vaccineCode))
    .where(eq(vaccinations.animalId, animalId))
    .orderBy(vaccinations.vaccineCode, desc(vaccinations.administeredOn), desc(vaccinations.createdAt));
  const today = new Date().toISOString().slice(0, 10);
  return rows.map((r) => ({
    ...r,
    status: !r.nextDueOn ? "complete" : r.nextDueOn < today ? "overdue" : "up_to_date",
  }));
}
