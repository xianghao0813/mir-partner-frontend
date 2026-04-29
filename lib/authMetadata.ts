import type { UserMetadata } from "@supabase/supabase-js";

export function compactAuthMetadata(metadata: UserMetadata | undefined): UserMetadata {
  const compacted: UserMetadata = { ...(metadata ?? {}) };

  delete compacted.wallet_transactions;
  delete compacted.mir_point_transactions;
  delete compacted.boss_last_hit_runs;

  return compacted;
}
