# Déploiement — e-mail à l'administrateur à chaque inscription

Chaîne : inscription → ligne `public.profiles` (statut `en_attente`) → trigger `profiles_notifier_inscription`
(migration `20261011000600_comptes_validation_admin.sql`, via `pg_net`) → Edge Function `notifier-inscription`
→ API Resend → e-mail à `ADMIN_EMAIL` avec un bouton « Valider la demande » vers `APP_URL/admin/comptes/<id>`.

L'ouverture du lien ne décide rien : l'administrateur doit être connecté (sinon `/login?suivant=…` puis retour),
puis cliquer sur Accepter ou Refuser (Server Action).

Tant que les étapes 3 et 4 ne sont pas faites, **rien n'est envoyé** et les inscriptions fonctionnent normalement
(le trigger ne fait aucun appel sans secrets Vault ; la fonction répond 200 sans envoyer si `RESEND_API_KEY` est absente).

## 1. Prérequis
- Migration `20261011000600_comptes_validation_admin.sql` appliquée (crée l'extension `pg_net` et le trigger).
- Un compte Resend avec un domaine d'envoi vérifié (DNS SPF/DKIM) ; une clé d'API Resend.
- Un secret partagé aléatoire, par exemple : `openssl rand -hex 32`.

## 2. Secrets de la fonction
```
supabase secrets set --project-ref <ref> \
  WEBHOOK_SECRET=<secret partagé> \
  ADMIN_EMAIL=<adresse de l'administrateur> \
  APP_URL=https://<domaine de l'application> \
  EMAIL_FROM="Adéquation levage <no-reply@<domaine vérifié>>" \
  RESEND_API_KEY=<clé Resend>
```
`RESEND_API_KEY` peut être ajoutée plus tard : sans elle, la fonction journalise la demande et ne fait rien.

## 3. Déploiement de la fonction
```
supabase functions deploy notifier-inscription --project-ref <ref> --no-verify-jwt
```
`--no-verify-jwt` : la fonction n'est pas appelée par un utilisateur mais par la base ; elle refuse (401) tout appel
sans l'en-tête `x-webhook-secret` égal à `WEBHOOK_SECRET` (comparaison à temps constant).
(`supabase/config.toml` déclare déjà `verify_jwt = false` pour cette fonction.)

## 4. Branchement du trigger (Vault)
Dans l'éditeur SQL du projet (rôle postgres) :
```sql
select vault.create_secret('https://<ref>.supabase.co/functions/v1/notifier-inscription', 'notifier_inscription_url');
select vault.create_secret('<secret partagé, identique à WEBHOOK_SECRET>', 'notifier_inscription_secret');
```
Rotation : `select vault.update_secret((select id from vault.secrets where name = 'notifier_inscription_secret'), '<nouveau>');`
puis `supabase secrets set WEBHOOK_SECRET=<nouveau>`.

## 5. Vérification
1. Créer un compte de test depuis `/login` (onglet « Créer un compte »).
2. Côté base : `select status_code, content from net._http_response order by created desc limit 5;` (200 attendu).
3. Côté fonction : journaux de `notifier-inscription` dans le tableau de bord Supabase.
4. Supprimer le compte de test.

## Désactivation
Supprimer les secrets Vault (`delete from vault.secrets where name in ('notifier_inscription_url', 'notifier_inscription_secret');`) :
le trigger cesse tout appel, sans autre modification.

## Notes
- Un échec d'appel (réseau, fonction absente) ne bloque jamais l'inscription (avertissement journalisé).
- Les nouveaux inscrits par lien magique déclenchent aussi la notification (profil créé `en_attente`).
- Désignation de l'administrateur (une fois, rôle postgres) : `select private.designer_admin('<adresse>');`
