# Choosing a notification provider for in-app notifications

Research for [#3 Choose a notification provider](https://github.com/rubenmiq/cohort-005-project/issues/3) (map [#1](https://github.com/rubenmiq/cohort-005-project/issues/1)). Sources were checked on 2026-11-16. Pricing pages change, so check them again before signing up.

## Recommendation

**Knock.** It is the only candidate that clears every constraint on its free plan with nothing left to manage:

- **Free plan:** 10,000 messages a month, with unlimited workflows, environments and team members.
- **Preferences:** a preference center is included on the free plan.
- **React:** an explicit React 19 peer range, plus a headless hooks package for building the inbox with our own Tailwind/Radix components.
- **Identity:** signed per-user JWTs that we can mint in the root loader.
- **Delivery:** real-time feed delivery.
- **Email later:** a first-party Postmark integration, which is the provider we already use.

**Runner-up: Novu.** It has the best fit with Tailwind, because its `<Inbox>` takes Tailwind classes directly per element, and its HMAC identification is the simplest of the five. But the free plan is capped at **5 workflows**. Ticket #2 lists more than five candidate events (Refund Requests opened and decided, Seat claimed, comments, enrollments, course publishing and others), so we would probably hit the cap or have to squeeze several events into one workflow.

## Comparison

| | Knock | Novu | MagicBell | Courier | SuprSend |
|---|---|---|---|---|---|
| Free tier | 10k messages/mo, unlimited workflows, preferences included, branding can't be removed [K1] | 10k workflow runs/mo, **5 workflows**, 3 team members, 24h activity-log retention [N1] | **1,000 deliveries/mo** (in-app + email to one user counts as 2) [M1] | 10k sends/mo, and sends from test environments count against it [C1] | 10k notifications/mo, inbox shows SuprSend branding, **no user preferences or digests on Free** [S1] |
| React package (npm, checked 2026-11-16) | `@knocklabs/react` 0.15.1, peer `react ^17 \|\| ^18 \|\| ^19`; headless `@knocklabs/react-core` 0.17.1, same peer range | `@novu/react` 3.20.0, peer `react ^18 \|\| ^19` | `@magicbell/react` 1.14.0 declares no React peer; legacy `@magicbell/magicbell-react` 11.5.1 has peer `react >=18.3.1` | `@trycourier/courier-react` 9.3.5, peer `react >=18` | `@suprsend/react` 1.5.0 and `@suprsend/react-core` 2.4.0, peer `react >=16.8` |
| Styling with Tailwind/Radix | Prebuilt feed is styled by `--rnf-*` CSS variables and `rnf-` classes, with `renderItem` to swap cells [K4]. Headless hooks (`useNotifications`, `useNotificationStore`) let us build the inbox with Radix Popover and Tailwind [K5] | `appearance.elements` accepts Tailwind classes per element, plus `variables`, a dark theme and callbacks [N3]; headless `useNotifications` hook [N4] | CSS variables, overridable `.magicbell--*` classes and component props such as `ItemComponent`. Hooks for this package are not documented [M3] | Built on web components with **shadow DOM** [C3], so Tailwind classes can't reach the internals. Styled through theme objects, with `renderListItem` taking JSX and `useCourier()` for headless use [C2][C4] | Prebuilt inbox uses Emotion (an npm dependency). Headless `SuprSendFeedProvider`, `useFeedData` and `useFeedClient` [S3] |
| How users are identified | RS256 JWT (`sub` = user id) from `signUserToken` in `@knocklabs/node`, default lifetime 1h. Enforced once "enhanced security mode" is on. `onUserTokenExpiring` handles refresh [K2] | `subscriberHash = HMAC-SHA256(secretKey, subscriberId)` as hex. It is static and never expires [N2] | HS256 user JWT with `user_external_id` and/or `user_email` plus `api_key`. Docs examples use a 1-year expiry [M2] | JWT from `POST /auth/issue-token` with scope `user_id:<id> inbox:read:messages inbox:write:events`. With no `expires_in` the token never expires, and **the SDK doesn't refresh tokens** [C5] | ES256 JWT (`entity_type: subscriber`, `entity_id`, `exp`, `scope.tenant_id`). `identify(id, token, { refreshUserToken })` [S2] |
| Sending from Node | `knock.workflows.trigger(key, { recipients, actor, data })`. Recipients can be identified inline when triggering [K3] | `novu.trigger({ workflowId, to, payload })`. Subscribers are created or updated on trigger [N5] | `client.broadcasts.createBroadcast({ recipients:[{ externalId }] … })` (`magicbell-js`), at most 1,000 recipients per broadcast [M4][M5] | `client.send.message({ message: { to: { user_id }, template, data } })` [C6] | `supr_client.workflows.trigger(new WorkflowTriggerRequest({ workflow, recipients, data }))`. Recipients are created automatically, and there is an idempotency key [S4] |
| Real-time | Yes, over a real-time socket, with automatic socket management per tab [K4] | Yes, over WebSocket; `realtime` defaults to true [N4] | Not stated in the docs pages read. The package depends on `reconnecting-websocket`, which suggests it | Yes, after `inbox.listenForUpdates()` (WebSocket) [C2] | Yes, through a feed socket with a reachability status [S3] |
| Email added later | Yes, with a first-party Postmark integration [E1] | Yes, Postmark [E2] | Yes: SES, Mailgun, SendGrid, SMTP, Ping. No Postmark integration was listed, though SMTP may work [M5] | Yes, Postmark [E3] | Yes, Postmark [E4] |

### Notes on each provider

- **Knock.**
  - The free plan has no hard cap. Knock contacts you to add billing the month after you go over [K1].
  - The prebuilt `@knocklabs/react` pulls in its own design system (`@telegraph/*`) and Radix packages. Depending only on `@knocklabs/react-core` keeps our bundle on our own Radix.
  - Knock tracks "seen" and "read" separately. The headless example only shows `markAsSeen` and `markAllAsSeen` [K5]. This matters for the "read/unread semantics" fog.
- **Novu.**
  - The 5-workflow cap is the deciding problem. Everything else fits well.
  - HMAC is turned on per environment through the In-App integration toggle. With HMAC on and no hash, the Inbox does not load [N2].
- **MagicBell.**
  - The free tier is the smallest: 1k deliveries, counted per channel.
  - The docs mix two React packages and two auth schemes (the older HMAC `userKey` and the newer user JWT), and they don't say which is current.
  - Its email providers don't include Postmark.
- **Courier.**
  - Shadow DOM fights a Tailwind/Radix design system. A good match would mean building on `useCourier()` instead of the prebuilt component.
  - Tokens that never expire by default, and the lack of SDK refresh, both need deliberate handling.
- **SuprSend.**
  - User preferences and digests are not on the free plan, and the "Muting / per-type preferences" fog depends on preferences.
  - The prebuilt inbox carries branding and Emotion. Its Node sample code in the docs doesn't run as written: it declares `secret` twice [S2].

## Identity and DevUI user switching

How Cadence identifies the user:

- The current user is `userId` (an integer) in the `cadence_session` cookie (`app/lib/session.ts`).
- The DevUI panel (`app/components/dev-ui.tsx`) posts a React Router `<Form>` to `/api/switch-user`. That route sets the cookie and redirects (`app/routes/api.switch-user.ts`).
- So a switch is a client-side navigation with loader revalidation, **not a full page reload**.

That leads to a pattern that works with all five providers:

1. The root loader computes the provider credential for the current user on the server: a Knock JWT, a Novu hash, or another provider's token. It returns the credential together with `currentUser`.
2. The provider's React context is mounted with `key={currentUser.id}`. When DevUI switches users, the old client is torn down, including its socket, and a new one authenticates as the new user.

We did not check whether each SDK re-authenticates correctly when only its props change, so remounting with `key` is the safe choice. Knock documents that calling `authenticate` again with a new token restarts the real-time connection [K2]. Courier documents `signOut()` and `signIn()` [C2].

Provider-specific fit:

- **Knock** tokens expire after 1h by default. This doesn't matter in practice, because the loader mints a fresh token on every revalidation. A long-lived tab can use `onUserTokenExpiring` to fetch a new one.
- **Novu**'s hash never expires, so it is the easiest fit with DevUI.
- **Courier** needs an explicit `expires_in`, because the default token never expires.

A dev-environment caveat that applies to every provider:

- Cadence user IDs are auto-increment integers. Reseeding the database reuses them, so the provider will keep the old notifications for user `1` and show them to whoever is user `1` after the reseed.
- Use a separate provider environment for dev. Knock and Novu both give at least Dev and Prod.
- Decide whether to namespace the external ID, for example a per-environment prefix, or to accept stale notifications in dev.

## Sources

Knock
- [K1] Pricing: https://knock.app/pricing
- [K2] Security and authentication (enhanced security mode, `signUserToken`, RS256, `onUserTokenExpiring`): https://docs.knock.app/in-app-ui/security-and-authentication
- [K3] Triggering workflows by API (inline identification): https://docs.knock.app/send-notifications/triggering-workflows/api
- [K4] React feed components (styling, real-time): https://docs.knock.app/in-app-ui/react/feed
- [K5] Headless feed: https://docs.knock.app/in-app-ui/react/headless/feed
- npm: https://www.npmjs.com/package/@knocklabs/react, https://www.npmjs.com/package/@knocklabs/react-core, https://www.npmjs.com/package/@knocklabs/node

Novu
- [N1] Pricing: https://novu.co/pricing
- [N2] Inbox HMAC (prepare for production): https://docs.novu.co/platform/inbox/prepare-for-production
- [N3] Inbox styling: https://docs.novu.co/platform/inbox/configuration/styling
- [N4] `useNotifications` hook: https://docs.novu.co/platform/sdks/react/hooks/use-notifications
- [N5] Trigger event API: https://docs.novu.co/api-reference/events/trigger-event and https://docs.novu.co/platform/concepts/trigger
- npm: https://www.npmjs.com/package/@novu/react, https://www.npmjs.com/package/@novu/api

MagicBell
- [M1] Pricing: https://www.magicbell.com/pricing
- [M2] User JWT: https://www.magicbell.com/docs/api/authentication/user
- [M3] React components: https://magicbell.com/docs/libraries/react
- [M4] JS/Node client: https://www.magicbell.com/docs/libraries/magicbell-js
- [M5] Broadcast primitive (channels, email providers): https://www.magicbell.com/docs/primitive/broadcast
- npm: https://www.npmjs.com/package/@magicbell/react

Courier
- [C1] Pricing: https://www.courier.com/pricing
- [C2] React SDK: https://www.courier.com/docs/sdk-libraries/courier-react-web
- [C3] Web Components SDK (shadow DOM): https://www.courier.com/docs/sdk-libraries/courier-ui-inbox-web
- [C4] v8 migration guide (`renderListItem`, React 18+ package): https://www.courier.com/docs/sdk-libraries/courier-react-v8-migration-guide
- [C5] Inbox authentication: https://www.courier.com/docs/platform/inbox/authentication
- [C6] Send a message: https://www.courier.com/docs/platform/sending/send-message
- npm: https://www.npmjs.com/package/@trycourier/courier-react

SuprSend
- [S1] Pricing: https://www.suprsend.com/pricing
- [S2] Client authentication: https://docs.suprsend.com/docs/client-authentication
- [S3] React headless: https://docs.suprsend.com/docs/react-headless (React inbox: https://docs.suprsend.com/docs/inbox-react)
- [S4] Node trigger workflow: https://docs.suprsend.com/docs/node-trigger-workflow-from-api
- npm: https://www.npmjs.com/package/@suprsend/react, https://www.npmjs.com/package/@suprsend/react-core

Email (Postmark) integrations
- [E1] Knock: https://docs.knock.app/integrations/email/postmark
- [E2] Novu: https://docs.novu.co/platform/integrations/email/postmark
- [E3] Courier: https://www.courier.com/docs/external-integrations/email/postmark
- [E4] SuprSend: https://docs.suprsend.com/docs/postmark
