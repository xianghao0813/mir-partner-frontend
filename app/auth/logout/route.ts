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
    expires: new Date(0),
  });

  [...getSupabaseAuthCookieNames(), ...getAdminAuthCookieNames()].forEach((name) => {
    ["/", "/admin"].forEach((path) => {
      response.cookies.set(name, "", {
        path,
        maxAge: 0,
        expires: new Date(0),
      });
    });
  });

  return response;
}

function getSupabaseAuthCookieNames() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const projectRef = url.match(/^https?:\/\/([^.]+)\.supabase\.co/i)?.[1] ?? "";
  const baseNames = [
    "sb-auth-token",
    "mir-partner-auth-token",
    "mir-partner-frontend-auth-token",
  ];

  if (projectRef) {
    baseNames.push(`sb-${projectRef}-auth-token`);
  }

  return baseNames.flatMap(getCookieChunkNames);
}

function getAdminAuthCookieNames() {
  return getCookieChunkNames("mir-partner-admin-auth-token");
}

function getCookieChunkNames(baseName: string) {
  const names = [baseName];
  for (let index = 0; index <= 100; index += 1) {
    names.push(`${baseName}.${index}`);
  }
  return names;
}
