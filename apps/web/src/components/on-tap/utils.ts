import type { AppSession } from "./types";
import type { OnTapActor } from "../../lib/on-tap-types";

export function actorToSession(actor: OnTapActor): AppSession {
  return {
    type: actor.type === "manager" ? "manager" : "staff",
    actorId: actor.actorId,
    barAccountId: actor.barAccountId,
    name: actor.name,
    role: actor.role ?? undefined,
    staffShiftId: actor.staffShiftId,
  };
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Something went wrong";
}
