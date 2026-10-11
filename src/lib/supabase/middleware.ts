import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabaseConfigure } from "./env";

/** Chemins réservés aux utilisateurs connectés. */
const PREFIXES_PROTEGES = ["/projets", "/profil", "/machines/nouvelle"];

/**
 * Rafraîchit la session Supabase (cookies) à chaque requête et protège les pages privées.
 * Les cookies rafraîchis sont recopiés sur la réponse, y compris sur une redirection.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  if (!supabaseConfigure()) return response;

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() valide le jeton auprès du serveur Auth (ne pas se fier à getSession()).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const protege = PREFIXES_PROTEGES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!user && protege) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    const redirection = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirection.cookies.set(c));
    return redirection;
  }
  return response;
}
