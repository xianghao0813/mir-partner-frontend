import { NextResponse } from "next/server";
import { BOSS_LAST_HIT_COOKIE } from "@/lib/bossLastHit";

export async function GET() {
  const response = NextResponse.redirect(new URL("/login", getPublicOrigin()));

  clearKnownCookies(response);

  return response;
}

export async function POST() {
  const response = NextResponse.json({ ok: true });

  clearKnownCookies(response);

  return response;
}

function clearKnownCookies(response: NextResponse) {
  const names = new Set<string>([
    BOSS_LAST_HIT_COOKIE,
    ...getSupabaseAuthCookieNames(),
  ]);

  names.forEach((name) => {
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
    });
  });
}

function getSupabaseAuthCookieNames() {
  const projectRef = getSupabaseProjectRef();
  const baseNames = projectRef
    ? [`sb-${projectRef}-auth-token`]
    : ["sb-auth-token"];

  return baseNames.flatMap((name) => [
    name,
    `${name}.0`,
    `${name}.1`,
    `${name}.2`,
    `${name}.3`,
    `${name}.4`,
    `${name}.5`,
  ]);
}

function getSupabaseProjectRef() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const match = url.match(/^https?:\/\/([^.]+)\.supabase\.co/i);
  return match?.[1] ?? "";
}

function getPublicOrigin() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.PUBLIC_BASE_URL || "http://localhost:3000";
  try {
    return new URL(baseUrl).origin;
  } catch {
    return "http://localhost:3000";
  }
}
