import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { cheminInterne } from "@/lib/account/result";
import { supabaseConfigure } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Callback Auth Supabase (seule route handler de l'application) :
 * échange le code (PKCE) ou vérifie le jeton OTP du lien de confirmation d'e-mail, puis redirige.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const suivant = cheminInterne(searchParams.get("suivant") ?? searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (supabaseConfigure() && (code || (tokenHash && type))) {
    const supabase = await createClient();
    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ type: type!, token_hash: tokenHash! });
    // Compte non approuvé : le middleware le redirige ensuite vers /compte-en-attente.
    if (!error) return NextResponse.redirect(`${origin}${suivant}`);
    // Supabase n'émet un `code` qu'après avoir vérifié le lien : l'adresse est donc confirmée. L'échange
    // échoue seulement quand le lien est ouvert dans un autre navigateur que celui de l'inscription
    // (vérificateur PKCE absent) : on invite à se connecter au lieu d'afficher une erreur.
    if (code) return NextResponse.redirect(`${origin}/login?info=confirme`);
  }
  return NextResponse.redirect(`${origin}/login?erreur=lien`);
}
