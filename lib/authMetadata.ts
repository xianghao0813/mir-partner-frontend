import type { UserMetadata } from "@supabase/supabase-js";

export function compactAuthMetadata(metadata: UserMetadata | undefined): UserMetadata {
  const compacted: UserMetadata = { ...(metadata ?? {}) };

  compacted.wallet_transactions = null;
  compacted.mir_point_transactions = null;
  compacted.boss_last_hit_runs = null;
  compacted.attendance_dates = null;
  compacted.attendance_makeup_dates = null;
  compacted.attendance_bonus_keys = null;
  compacted.attendance_month_checked_count = null;
  compacted.boss_last_hit_best_score = null;
  compacted.boss_last_hit_daily_best_score = null;
  compacted.boss_last_hit_daily_runs = null;
  compacted.boss_last_hit_day_key = null;
  compacted.boss_last_hit_reward_date = null;
  compacted.boss_last_hit_reward_receipt = null;

  return compacted;
}
