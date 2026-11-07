import { createPool, type Pool } from "mariadb";
import { readFileSync } from "node:fs";
import "server-only";
import { dayRange } from "./date-range";
import { operationsForDaySql } from "./operation-query";
import { personnelGroupForPosition } from "./positions";
import { env } from "@/lib/env";

type HosxpRow = Record<string, unknown>;
const globalHosxp = globalThis as typeof globalThis & { hosxpPool?: Pool };

function required(name: "HOSXP_HOST" | "HOSXP_USER" | "HOSXP_PASSWORD" | "HOSXP_DATABASE"): string {
  const value = env[name];
  if (!value) throw new Error(`${name} is required for HOSxP`);
  return value;
}

function pool(): Pool {
  if (globalHosxp.hosxpPool) return globalHosxp.hosxpPool;
  const caPath = env.HOSXP_TLS_CA_PATH;
  if (
    !caPath &&
    (env.NODE_ENV === "production" ||
      env.HOSXP_ALLOW_INSECURE !== "true")
  ) {
    throw new Error(
      "Configure HOSXP_TLS_CA_PATH; insecure connections are only permitted in development",
    );
  }
  const port = env.HOSXP_PORT;
  const result = createPool({
    host: required("HOSXP_HOST"),
    port,
    user: required("HOSXP_USER"),
    password: required("HOSXP_PASSWORD"),
    database: required("HOSXP_DATABASE"),
    connectionLimit: 3,
    dateStrings: true,
    ...(caPath
      ? { ssl: { ca: readFileSync(caPath), rejectUnauthorized: true } }
      : { allowPublicKeyRetrieval: true }),
  });
  globalHosxp.hosxpPool = result;
  return result;
}

async function readOnlyQuery(
  sql: string,
  values: (string | number)[] = [],
): Promise<HosxpRow[]> {
  const connection = await pool().getConnection();
  let started = false;
  let safeToRelease = true;
  try {
    await connection.query("START TRANSACTION READ ONLY");
    started = true;
    return (await connection.query(sql, values)) as HosxpRow[];
  } finally {
    try {
      if (started) await connection.rollback();
    } catch {
      safeToRelease = false;
      connection.destroy();
      throw new Error("Could not close the read-only HOSxP transaction");
    } finally {
      if (safeToRelease) await connection.release();
    }
  }
}

/** Server-only. Callers must authorize access and protect the returned patient data. */
export async function getHosxpOperationsForDay(
  day: string,
): Promise<HosxpRow[]> {
  return readOnlyQuery(operationsForDaySql, dayRange(day));
}

export type HosxpPosition = {
  positionId: number;
  positionName: string;
  group: number | null;
};

/** Read the position names from HOSxP and attach the hospital's group mapping. */
export async function getHosxpPositions(): Promise<HosxpPosition[]> {
  const rows = await readOnlyQuery(
    "SELECT position_id, position_name FROM operation_position ORDER BY position_id",
  );
  return rows.map((row) => {
    if (
      typeof row.position_id !== "number" ||
      typeof row.position_name !== "string"
    ) {
      throw new Error("Unexpected operation_position row from HOSxP");
    }
    return {
      positionId: row.position_id,
      positionName: row.position_name,
      group: personnelGroupForPosition(row.position_id),
    };
  });
}

/** Server-only. Callers must authorize access and protect returned patient data. */
export async function getHosxpOperationTeam(
  operationId: number,
): Promise<HosxpRow[]> {
  if (!Number.isSafeInteger(operationId) || operationId < 1)
    throw new Error("Invalid operation ID");
  const rows = await readOnlyQuery(
    `
    SELECT t.*, dt.NAME AS doctor_name, op.position_name, oi.NAME AS operation_item_name
    FROM operation_team t
      LEFT JOIN operation_detail d ON d.operation_detail_id = t.operation_detail_id
      LEFT JOIN doctor dt ON dt.CODE = t.doctor
      LEFT JOIN operation_position op ON op.position_id = t.position_id
      LEFT JOIN operation_item oi ON oi.operation_item_id = d.operation_item_id
    WHERE t.operation_id = ?
    ORDER BY t.operation_detail_id, t.position_id`,
    [operationId],
  );
  return rows.map((row) => ({
    ...row,
    personnelGroup:
      typeof row.position_id === "number"
        ? personnelGroupForPosition(row.position_id)
        : null,
  }));
}
