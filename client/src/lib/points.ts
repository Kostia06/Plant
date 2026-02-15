import { supabase } from "./supabase";

export async function awardPoints(
  userId: string,
  action: string,
  points: number,
  description: string,
  referenceId?: string,
): Promise<void> {
  await supabase.from("points_ledger").insert({
    user_id: userId,
    action,
    points,
    description,
    reference_id: referenceId ?? null,
  });

  await supabase.rpc("recalc_user_score", { uid: userId });
}
