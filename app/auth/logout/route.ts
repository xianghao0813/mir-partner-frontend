import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BOSS_LAST_HIT_COOKIE } from "@/lib/bossLastHit";

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const response = NextResponse.json({ ok: true });

  response.cookies.set(BOSS_LAST_HIT_COOKIE, "", {
    path: "/",
    maxAge: 0,
  });

  getSupabaseAuthCookieNames().forEach((name) => {
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
    });
  });

  return response;
}

function getSupabaseAuthCookieNames() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const projectRef = url.match(/^https?:\/\/([^.]+)\.supabase\.co/i)?.[1] ?? "";
  const baseName = projectRef ? `sb-${projectRef}-auth-token` : "sb-auth-token";

  return [
    baseName,
    `${baseName}.0`,
    `${baseName}.1`,
    `${baseName}.2`,
    `${baseName}.3`,
    `${baseName}.4`,
    `${baseName}.5`,
  ];
}
