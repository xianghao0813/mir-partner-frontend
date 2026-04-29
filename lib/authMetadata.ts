import type { UserMetadata } from "@supabase/supabase-js";

export function compactAuthMetadata(metadata: UserMetadata | undefined): UserMetadata {
  const compacted: UserMetadata = { ...(metadata ?? {}) };

  compacted.wallet_transactions = null;
  compacted.mir_point_transactions = null;
  compacted.boss_last_hit_runs = null;

  return compacted;
}
