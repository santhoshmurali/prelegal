import type { NdaFields } from "@/lib/nda";

export type ChatMessage = { role: "user" | "assistant"; content: string };

// The backend sends null for every field the turn did not change.
export type Changes<T> = {
  [K in keyof T]?: T[K] extends object ? Changes<T[K]> | null : T[K] | null;
};

export type NdaChanges = Changes<NdaFields>;

export type ChatTurn = { reply: string; fieldUpdates: NdaChanges };

function merge<T extends object>(base: T, changes: Changes<T>): T {
  const next = { ...base };
  for (const key of Object.keys(changes) as (keyof T)[]) {
    const change = changes[key];
    if (change === null || change === undefined) continue;
    next[key] =
      typeof change === "object"
        ? merge(base[key] as object, change as Changes<object>) as T[keyof T]
        : (change as T[keyof T]);
  }
  return next;
}

// Returns the fields with the turn's changes applied; untouched fields keep their value.
export function applyChanges(fields: NdaFields, changes: NdaChanges): NdaFields {
  return merge(fields, changes);
}
