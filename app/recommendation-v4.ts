import { supabase } from "../lib/supabase";

export async function getRecommendationPage(limit = 8, before: string | null = null) {
  if (!supabase) return { data: [], error: new Error("Supabase 未初始化") };
  return supabase.rpc("get_recommended_video_feed", {
    p_limit: limit,
    p_before: before,
  });
}
