import type { UserMetadata } from "@supabase/supabase-js";

const MAX_WALLET_TRANSACTIONS_IN_AUTH = 20;
const MAX_POINT_TRANSACTIONS_IN_AUTH = 20;

export function compactAuthMetadata(metadata: UserMetadata | undefined): UserMetadata {
  const compacted: UserMetadata = { ...(metadata ?? {}) };

  if (Array.isArray(compacted.wallet_transactions)) {
    compacted.wallet_transactions = compacted.wallet_transactions.slice(0, MAX_WALLET_TRANSACTIONS_IN_AUTH);
  }

  if (Array.isArray(compacted.mir_point_transactions)) {
    compacted.mir_point_transactions = compacted.mir_point_transactions.slice(0, MAX_POINT_TRANSACTIONS_IN_AUTH);
  }

  return compacted;
}
