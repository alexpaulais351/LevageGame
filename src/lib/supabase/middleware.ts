import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabaseConfigure } from "./env";

/** Accessibles sans être connecté. */
const ROUTES_PUBLIQUES = ["/login", "/auth/callback"];
/** Accessible connecté, quel que soit le statut du compte. */
const PAGE_ATTENTE = "/compte-en-attente";

const correspond = (pathname: string, prefixe: string) => pathname === prefixe || pathname.startsWith(prefixe + "/");

/**
 * Rafraîchit la session Supabase (cookies) à chaque requête et applique les règles d'accès :
 *  - non connecté → /login?suivant=<page demandée> (seules /login et /auth/callback sont publiques) ;
 *  - connecté mais compte non approuvé par l'administrateur → /compte-en-attente ;
 *  - compte approuvé sur /compte-en-attente → / (accueil).
 * La RLS et les Server Actions revérifient le statut (défense en profondeur).
 * Les cookies rafraîchis sont recopiés sur la réponse, y compris sur une redirection.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const { pathname, search } = request.nextUrl;
  const publique = ROUTES_PUBLIQUES.some((p) => correspond(pathname, p));

  const rediriger = (chemin: string, suivant?: string) => {
    const url = request.nextUrl.clone();
    url.pathname = chemin;
    url.search = suivant ? `?suivant=${encodeURIComponent(suivant)}` : "";
    const redirection = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirection.cookies.set(c));
    return redirection;
  };

  // Sans Supabase, aucune page n'est utilisable : seule /login (qui l'indique) reste accessible.
  if (!supabaseConfigure()) return publique ? response : rediriger("/login");

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

  if (!user) {
    if (publique) return response;
    const cible = pathname === "/" || correspond(pathname, PAGE_ATTENTE) ? undefined : pathname + search;
    return rediriger("/login", cible);
  }
  if (correspond(pathname, "/auth/callback")) return response;

  // Le propriétaire lit toujours son profil (RLS), même en attente.
  const { data: profil } = await supabase.from("profiles").select("statut").eq("id", user.id).maybeSingle();
  const approuve = profil?.statut === "approuve";
  const surAttente = correspond(pathname, PAGE_ATTENTE);

  if (!approuve) return surAttente ? response : rediriger(PAGE_ATTENTE);
  if (surAttente) return rediriger("/");
  return response;
}
