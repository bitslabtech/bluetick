# Message Statistics Audit — Dashboard, Reports, Superadmin

Date: 2026-11-16. Read-only audit; no code was changed. Everything below comes from reading the code. Nothing was run against a live database, so each item says what it is based on.

Files covered: `server/routes/dashboard.js`, `admin.js`, `messages.js`, `team.js`, `webhook.js` (status handling), `utils/planLimits.js`, `campaignProcessor.js`, `retryProcessor.js`, and the client pages `Dashboard.jsx`, `Reports.jsx`, `CampaignList.jsx`, `CampaignDetails.jsx`, `SuperAdminDashboard.jsx`.

## How the numbers are built

There are two data sources, and most problems come from mixing them.

| Source | What it holds | Created when |
|---|---|---|
| `MessageLog` | Campaign messages only. Status in capitals: SENT, DELIVERED, READ, CLICKED, FAILED, RETRY_PENDING. | At send time (`createdAt` is the send time). |
| `ChatMessage` | Inbox, flowbot, AI, API and campaign messages. Status in lowercase. | Immediately for inbox/flow/AI/API. For campaigns it is created only when Meta reports `delivered`, or on a successful retry. |

Consequence: a campaign message that is sent but never reported as delivered exists only in `MessageLog`. A campaign message that fails at send time exists only in `MessageLog`.

## Findings, highest impact first

### HIGH

**H1. Webhook can move a status backwards (undercounts Read and Delivered).**
`webhook.js:407` sets `log.status = upperStatus` and `:427` sets `chatMsg.status = rawStatus` with no ordering check. Meta does not guarantee order. If `delivered` arrives after `read`, or `sent` after `delivered`, the message drops back and loses its Read credit permanently. The same issue hits CLICKED: a late `read` event overwrites `CLICKED` (set at `:756`). Evidence: code reading. Frequency in production is unknown, but it is documented Meta behaviour.

**H2. Dashboard failure numbers disagree with each other and drop most failure types.**
In the no-campaign view (`dashboard.js:225-259`):
- `totalMessages` excludes failed ChatMessages.
- `failedCount` counts only failed `MessageLog` rows (campaigns).
- Failed inbox, flowbot, AI, auto-reply and API messages are in neither number, so the failed rate and the delivery rate (`delivered / (total + failed)`) ignore them.
- The chart (`/chart`, `:441-517`) does the opposite. Its failed series counts failed ChatMessages and ignores campaign failures. The KPI card and the chart for the same period therefore show different failure totals.

**H3. Superadmin failed rate and the new failed-reasons modal miss campaign failures.**
`admin.js:147-166` and `:335-348` count only `ChatMessage` rows. Campaign messages that fail at send time (invalid number, 131026, 130472 A/B test, and so on) have no ChatMessage, only a `MessageLog` row. So:
- Superadmin "Failed Rate" is understated.
- The breakdown modal added in this session does not show "number not on WhatsApp" or "Meta A/B test" for campaign sends, which were the two reasons you asked to see. Those reasons live in `MessageLog.error`.
- The modal total will not match the card.
Also, the superadmin "Messages Sent" card counts every outbound row, including failed ones, so the label is wrong.

**H4. Deleting a campaign changes stats and gives back plan quota.**
`messages.js:236` destroys the campaign's `MessageLog` rows. `getMonthlyMessageCount` (`planLimits.js:85`) counts campaign usage from `MessageLog`. A user can delete a finished campaign and regain that month's message allowance. The dashboard failed counts for that campaign also vanish. Superadmin deletion of a user (`admin.js:412`) removes ChatMessages, so those messages also disappear from superadmin totals, despite the comment saying reports are preserved.

**H5. Campaign Details page computes stats from at most 1,000 logs.**
`CampaignDetails.jsx:186-202` calls `/api/messages/:id` with no `limit`. The server defaults to 1,000 logs (`messages.js:135`). The client then counts sent, delivered, read and failed from that page only. Any campaign with more than 1,000 recipients shows wrong totals and wrong charts. The server returns correct counts (`sentCount`, `deliveredCount` and so on, `messages.js:127-131`), but the client ignores them.

### MEDIUM

**M1. "Delivered" means three different things.**
- Campaign Details: `DELIVERED` only, which excludes Read (`CampaignDetails.jsx:199`).
- Campaign list, dashboard and reports: Delivered plus Read (`messages.js:203`, `dashboard.js:581`).
- Campaign list leaves out CLICKED, but the detail endpoint includes it. A clicked message disappears from the list's Delivered and Read counts (`messages.js:202-204`, and `dashboard.js:181-190` and `:581` have the same gap).
The same campaign can show different Delivered numbers on different pages.

**M2. Campaign messages that never get a delivery event are not counted anywhere (non-campaign view).**
They have no ChatMessage and are not FAILED, so they are missing from sent, attempted and failed. Delivery rate is inflated. If the first event Meta sends is `read`, no ChatMessage is created (`webhook.js:443` only creates on `delivered`), and the message is lost from the totals.

**M3. Mixed time bases shift messages between periods.**
Campaign failures are dated by `MessageLog.createdAt` (send time). Campaign deliveries are dated by `ChatMessage.createdAt` (delivery time, or retry time up to 24 hours later). Near a range boundary, such as "Today", the numerator and denominator come from different windows. The chart and the heatmap also date by delivery time.

**M4. "Total Sent" in campaign view includes unsent messages.**
`dashboard.js:176` counts every non-FAILED log, which includes `RETRY_PENDING` and any other queued state. The plan-limit counter excludes `RETRY_PENDING` (`planLimits.js:107`), so the two disagree.

**M5. Plan usage counter ignores flowbot, AI and auto-reply messages.**
`getMonthlyMessageCount` filters `source IS NULL`. Messages from flowbot, AI bot and auto-reply carry a source and are not counted. The code comment in `dashboard.js:272` says it counts "ALL outbound (AI, FlowBuilder, Campaigns, Manual)". Either the comment or the filter is wrong. This is a product decision, so confirm which is intended.

**M6. Reports day-of-week chart is wrong.**
`Reports.jsx:735-739` does `new Date(d.name)` on labels like "Nov 16". JavaScript parses that as year 2001 (verified in Node: `Fri Nov 16 2001`), so the weekday is for 2001, not this year. Hourly labels such as "3 PM" parse as Invalid Date and are dropped. Messages land on the wrong weekday.

**M7. Date range edge cases.**
- Range `1m` / `3m` uses `setMonth(-1)`. On Mar 31 it becomes Mar 3 (verified in Node), not Feb 28.
- Custom range from Reports sends `YYYY-MM-DD`. Start parses as UTC midnight and end is set to 23:59 in server local time. For a server in a different zone than the user, the first or last hours of the range are cut (`dashboard.js:46-61`).
- Dashboard custom range sends ISO timestamps, and the server then calls `setHours(23,59,59,999)` in server time. If the server runs in UTC, an IST user's end date can finish one day early.
- Hourly heatmap uses `date_part('hour', createdAt)`. Sequelize's default is a UTC session, so hours are likely UTC, not the user's local time. Not verified against the deployed database.

### LOW

**L1.** Superadmin graphs bucket by `toISOString()` (UTC) but build buckets from local midnight. On a non-UTC server the first or last bucket can be off by one day (`admin.js:193-222`).
**L2.** Superadmin loads every outbound ChatMessage row in the range into memory for the volume graph (`admin.js:167`). It will get slow and heavy as data grows. A grouped `COUNT` per day would do.
**L3.** Campaign `recipientCount` is an estimate made at creation (`messages.js:62-80`). Campaign report percentages (`delivered / audience`, `Reports.jsx:790`, `:1095`) use it, so contacts excluded at send time lower the rate.
**L4.** Possible double count: a retried campaign message that later fails by webhook can exist as a FAILED `MessageLog` and a failed ChatMessage, so the dashboard counts it in one place and the chart in another.
**L5.** Team analytics "Campaigns Sent" (`team.js:210`) counts campaigns, not messages. The number is correct for its label. Noted only so it is not mistaken for message counts.

## What I checked and found correct
- Read rate is `read / delivered`, and Delivered includes Read, so it cannot exceed 100%.
- Case handling for `status` uses `lower()` in the dashboard queries, so mixed case from the webhook is handled.
- Failed campaign sends are counted from `MessageLog`, so they are not lost in the non-campaign failed count.
- Deleted conversations are kept in dashboard stats (`paranoid: false`).
- Sub-user (team member) requests resolve to the owner id in `auth`, so dashboard queries use the right account.

## Suggested fix order (not applied)
1. H1: only allow forward status transitions (sent < delivered < read; clicked above read; failed only from sent).
2. H2, H3, M2: pick one definition of sent / delivered / read / failed that reads from both tables, and use it in dashboard stats, chart, reports and superadmin. Include `MessageLog.error` in the failed-reasons modal.
3. H5: have the client use the server's counts, or request all logs.
4. H4: stop counting quota from rows that can be deleted, or soft-delete campaigns.
5. M1, M6, M7: align Delivered definition, fix the weekday parsing, and normalise range handling to the user's timezone.

## Not covered
Flow stats, CTWA analytics, store analytics, and the new Usage & Spend page (checked earlier with mocked data only). The dashboard queries were not run against real data, so the real size of each issue is unmeasured. A one-off query comparing `MessageLog` and `ChatMessage` counts for a busy account would show how large H1, H2 and M2 are.

---

# Part 2 — Every outbound send path, and a single gateway

Added 2026-11-16. Also read-only: no code was changed.

## 2.1 Where messages leave the app today

I searched for every call to Meta's `/{phone-number-id}/messages` endpoint. There are **24 separate send sites in 17 files**. Each one builds its own request, picks its own credentials and Graph version, and decides for itself whether to log, count or record failures.

Legend: **Inbox** means a ChatMessage row is written, so the message appears in dashboard, reports and superadmin. **Fail** means a failed send is recorded somewhere. **Limit** means the plan message limit is checked before sending. **Tag** means `tagOutbound` is called, so the Usage page can attribute the message.

| # | Feature | File | Inbox | Fail | Limit | Tag | Credentials |
|---|---|---|---|---|---|---|---|
| 1 | Broadcast campaign | `utils/campaignProcessor.js:349` | on delivery only | MessageLog | yes | yes | Settings |
| 2 | Campaign retry | `utils/retryProcessor.js:274` | yes | MessageLog | **no** | yes | Settings |
| 3 | Live inbox send (3 types) | `routes/chat.js:40` | yes | **no** (error shown in UI only) | yes | yes | Settings |
| 4 | Developer API (3 sites) | `routes/apiV1.js:79` | yes | partly (bulk only) | yes | yes | Settings |
| 5 | Flowbot | `services/FlowRunner.js:1054` | yes | **no** for Meta rejections | **no** | yes | Settings |
| 6 | Opt-out ack | `routes/webhook.js:944` | yes | no | n/a | yes | Settings |
| 7 | Auto-reply | `routes/webhook.js:1093` (via sender) | yes | no | yes | yes | Settings |
| 8 | Keyword/greeting auto-reply | `routes/webhook.js:1387` | yes | API-to-API only | yes | yes | Settings |
| 9 | AI bot reply | `routes/webhook.js:1463` | yes | no | **no** | yes | Settings |
| 10 | Store order notifications (template) | `routes/wastore.js:991` (via sender) | yes | **no** | **no** | yes (`store_order`) | **User.fbAccessToken only** |
| 11 | Store invoice PDF | `routes/wastore.js:844` (via sender) | yes | **no** | **no** | yes | **User.fbAccessToken only** |
| 12 | Store owner order alert | `routes/wastore.js:1054` (via sender) | yes | **no** | **no** | yes | **User.fbAccessToken only** |
| 13 | Store shipping/tracking | `routes/wastore.js:3119` (via sender) | yes | **no** | **no** | yes | **User.fbAccessToken only** |
| 14 | Abandoned cart | `utils/scheduler.js:490` (via sender) | yes | **no** | **no** | yes, but labelled `store_order` | **User.fbAccessToken only** |
| 15 | Store customer OTP (2 sites) | `routes/storeCustomerAuth.js:109,129` | **no** | **no** | **no** | yes | Settings |
| 16 | Form automation | `routes/forms.js:458` | **no** | **no** | **no** | yes | Settings |
| 17 | Checkout (paid form) automation | `routes/checkout.js:328` | **no** | **no** | **no** | yes | Settings |
| 18 | CTWA retarget | `routes/ctwa.js:548` | **no** | count only, not saved | **no** | yes | **User.whatsappToken / whatsappPhoneNumberId** |
| 19 | Landing page auto template | `routes/landing.js:586` | yes | **no** | **no** | yes | Settings |
| 20 | Settings "send test message" | `routes/settings.js:800` | **no** | no | no | yes | form body |
| 21 | Call follow-up message | `services/CallService.js:163` (via sender) | yes | **no** | **no** | yes | via sender |
| 22 | Billing / plan / invoice notices | `billing.js`, `scheduler.js`, `InvoiceService.js` via `systemMessenger` | platform number | no | n/a | yes (`system`) | platform env |
| 23 | Admin alerts | `services/systemMessenger.js` | platform number | no | n/a | yes | platform env |
| 24 | Store owner alert fallback | `wastore.js` via `sendSystemMessage` | platform number | no | n/a | yes | platform env |

Not message sends (they also use `messaging_product`, so they matter for any automatic check): phone `/register` (`whatsappAuth.js:333,772`), business profile (`settings.js:345,590`), media upload (`templates.js:400,444`, `wastore.js:833`), call actions (`metaCalling.js:44`).

## 2.2 New findings from this pass

**N1 (High). Store, OTP, form, checkout, CTWA and test messages are invisible to the dashboard, reports and superadmin.** Rows 15–18 and 20 write no ChatMessage, so their sent, delivered, read and failed counts are missing everywhere except the Usage & Spend page. Rows 10–14 do write a ChatMessage, but a rejected send throws before anything is saved, so store failures are never counted.

**N2 (High). Most automated senders bypass the plan message limit.** Only campaigns, live inbox, developer API and the webhook auto-replies call `getMonthlyMessageCount`. Retries, flowbot, AI bot, every store message, OTP, forms, checkout, CTWA retarget, landing and calls send without a check. Even where the limit is checked, `getMonthlyMessageCount` counts only rows with `source IS NULL` plus campaign logs (finding M5), so these messages also do not use up the allowance.

**N3 (High). Store messages only work for embedded-signup accounts.** `wastore.js` and `scheduler.js` read `user.fbAccessToken` and `user.metaPhoneNumberId`. Accounts connected manually with keys (credentials in Settings) skip sending from their own number entirely. This is the same cause as the Usage page "not connected" bug fixed earlier.

**N4 (Medium). Four different credential sources.** Settings (`metaAccessToken`), User (`fbAccessToken`), User (`whatsappToken` / `whatsappPhoneNumberId`, used by CTWA) and the platform env vars for system messages. A user can be "connected" for one feature and "not connected" for another.

**N5 (Medium). Graph API version differs by sender.** v21.0 in most senders, v22.0 in `whatsappSender`, `ctwa` and opt-out, v25.0 in the Usage sync. Meta retires versions on a schedule, so older senders will stop working one by one, without warning.

**N6 (Medium). Wrong source labels.** Abandoned cart uses the sender's default `store_order`. Every store message type (order, invoice, owner alert, shipping, cart) shares one label, so per-feature reporting cannot separate them.

**N7 (Low). Platform (Bluetick's own number) messages and customer messages share code.** `systemMessenger` sends from the platform number. They must never appear in a customer's stats, and nothing enforces that.

**Root cause of all of the above:** there is no single place where "a message is sent". Each feature calls Meta directly and copies whichever bookkeeping steps the author remembered. `tagOutbound` fixed attribution for the Usage page, but it is one more step that every new feature has to remember.

## 2.3 Proposed solution: one outbound gateway plus one message ledger

### A. One function that sends every message

Create `server/services/outbound/` and make it the only code allowed to call `/{phone-number-id}/messages`.

```js
await sendMessage({
  ownerId,                   // workspace owner (parentUserId || id)
  to,                        // phone
  payload,                   // Meta message body (template, text, media, interactive)
  source: 'store_shipping',  // REQUIRED, must exist in the source registry
  refs: { campaignId, contactId, conversationId, orderId, flowId }, // optional links
  actorId,                   // team member who triggered it, if any
  idempotencyKey             // optional, stops double sends on retries
});
```

Inside, always in this order:
1. **Credentials**: one resolver (Settings first, then User) replaces the four paths (fixes N3 and N4).
2. **Policy checks**: plan limit, opt-out, "Not on WhatsApp" status, API-to-API guard, 24-hour window for free-form messages. Each source says in the registry whether it uses up the plan allowance (fixes N2 and M5).
3. **Write a ledger row first**, with status `queued`, before calling Meta. Nothing can be sent without a row existing.
4. **Call Meta**, using one Graph version constant (fixes N5).
5. **Update the row** to `accepted` (with the wamid) or `failed` (with Meta code and a friendly reason). Rejected sends are recorded every time (fixes N1 and H3).
6. **Run side effects** through hooks: inbox mirror (ChatMessage), campaign log (MessageLog), socket event. Features ask for these with options. They don't do the work themselves.

### B. One table that every number comes from: `OutboundMessage`

| Column | Purpose |
|---|---|
| `id`, `ownerId`, `actorId` | who |
| `wamid` (unique) | Meta's message id; webhook statuses match on it |
| `source` | feature key from the registry |
| `to`, `templateName`, `templateCategory` | what |
| `campaignId`, `conversationId`, `contactId`, `orderId`, `flowId` | links for drill-down |
| `status` | queued → accepted → delivered → read → clicked, or failed / retry_pending |
| `errorCode`, `errorReason` | failure reason (one place for the failed-reasons modal) |
| `queuedAt`, `acceptedAt`, `deliveredAt`, `readAt`, `failedAt` | one timestamp per stage, so each period can be counted on the right time base (fixes M3) |
| `pricingCategory`, `pricingType`, `billable` | from the status webhook (absorbs `MessageBilling`) |
| `countsTowardPlan` | stored at send time, so later rule changes don't rewrite history |
| `deletedAt` | soft delete only, so deleting a campaign or chat never changes counts or returns quota (fixes H4) |

The webhook updates this row by `wamid` with a **forward-only state machine**: a status may only move up the order, and `failed` is accepted only from queued or accepted. This fixes H1.

ChatMessage and MessageLog stay as they are for the inbox UI and campaign screens. **Every report reads OutboundMessage**, so dashboard, reports, campaign pages and superadmin all use the same rows and the same rules (fixes H2, H5, M1, M2, M4).

### C. One definitions file used by every report

`server/services/outbound/metrics.js` exports the only definitions:

- **Attempted** = all rows, excluding `queued` older than N minutes
- **Sent** = accepted, delivered, read or clicked
- **Delivered** = delivered, read or clicked
- **Read** = read or clicked
- **Failed** = failed (rejected at send plus failed by webhook)
- **Pending** = accepted with no delivery yet
- **Delivery rate** = delivered / attempted; **read rate** = read / delivered; **failed rate** = failed / attempted
- Periods are counted in the **account's time zone** (a new `User.timezone`, default Asia/Kolkata) using the matching stage timestamp (fixes M6 and M7).

Dashboard, Reports, Campaign list/detail, superadmin and the plan-limit counter all call `metrics.summary({ ownerId?, from, to, source?, campaignId? })` instead of writing their own queries.

### D. Source registry: one file that lists every feature

`server/services/outbound/sources.js`:

```js
store_shipping: { group: 'Store orders & OTP', countsTowardPlan: true, inbox: true, label: 'Shipping updates' },
store_otp:      { group: 'Store orders & OTP', countsTowardPlan: false, inbox: false, label: 'Login OTP' },
platform_alert: { group: null, platform: true },  // Bluetick's own number, never in customer stats (fixes N7)
```

`sendMessage` refuses an unknown source. A new feature therefore has to add one line here. That line is the only "tell the app to count it" step left, and the request fails if it is forgotten.

### E. Guards, so a new feature cannot skip the gateway

1. **Test in the existing jest suite**: scan `server/` for `graph.facebook.com` together with `/messages` (and for `messaging_product` alongside `to:`) outside `services/outbound/`. Allow the non-message uses listed in 2.1. The test fails as soon as someone adds a direct send.
2. **ESLint `no-restricted-syntax` rule** with the same pattern, so the editor flags it while the code is being written.
3. **Runtime safety net**: a shared axios instance and `fetch` wrapper that logs and alerts when a `/messages` POST happens outside the gateway. This catches anything the static checks miss, such as URLs assembled at run time.
4. **Daily reconciliation**: compare Meta's delivered volume from `pricing_analytics` with the ledger for each account. Alert the superadmin when the gap is above a threshold. The "WhatsApp Usage Check" tab already does this per user on demand; this makes it a daily job across all accounts.

### F. Migration order (when you decide to build it)

1. Build the gateway, ledger, registry and metrics. Write to the ledger **alongside** today's tables (no behaviour change).
2. Move the 24 senders behind `sendMessage`, highest-risk first: store (10–14), OTP, forms and checkout, CTWA, flowbot, AI, then the rest.
3. Backfill the ledger from MessageLog, ChatMessage and MessageBilling for past months.
4. Switch all stats screens and the plan counter to `metrics.js`. Compare old and new numbers for a week on staging.
5. Turn on the test and lint guards. Retire `tagOutbound` and `MessageBilling` (merged into the ledger).

### Why this is the right shape
- **A single door**: one function sends, one table records, one file defines the numbers.
- **Nothing to remember**: a new feature calls `sendMessage` with a source. Limits, failures, inbox, stats, usage page and billing attribution follow automatically.
- **Mistakes fail loudly**: an unknown source throws an error, a direct Meta call fails the test, and a daily reconciliation catches anything else.
- **Accurate history**: forward-only statuses, stored stage timestamps and soft deletes mean past numbers do not change when data is edited or deleted.

## Updated fix list (Part 1 + Part 2)

1. Build the outbound gateway, `OutboundMessage` ledger, source registry and `metrics.js` (2.3 A–D). This covers H1–H5, M1–M5, N1, N2, N4–N7.
2. Fix credentials for store messages now (N3), before the gateway, because those messages currently fail without any error for manual-key accounts.
3. Make the failed-reasons modal read campaign failures too (H3) as a quick interim fix.
4. Campaign Details: use the server's counts (H5) as a quick interim fix.
5. Reports weekday chart and month-range date math (M6, M7).
6. Add the test, lint and runtime guards and the daily reconciliation job (2.3 E).
7. Product decision needed: which sources use up the plan allowance (OTP? AI replies? store notifications?). This sets `countsTowardPlan` in the registry.

---

# Part 3 — Deep scan: is every send path covered, and will the numbers be exact?

Added 2026-11-17. Read-only, no code changed.

## 3.1 How the scan was done

To make sure nothing is missed, I searched in seven ways, not just for one URL pattern:

1. Every `graph.facebook.com` call in `server/` (about 90). Each was classified as a message send or something else (templates, profile, media upload, register, ads, pixel, analytics).
2. `/messages` URLs built from variables or string concatenation. None send WhatsApp messages; the only hit is the FCM push URL in `callPush.js`.
3. Every `messaging_product` payload (41 occurrences in 21 files).
4. Every caller of each send helper: `sendToMeta` (chat, apiV1), `dispatchToMeta` (FlowRunner), `sendWhatsAppAndLog`, `sendSystemMessage`, `sendAdminAlert`, `sendOrderNotification`, `sendOwnerOrderAlert`, `sendWhatsAppOtp`, `sendInvoiceWhatsApp`, `processCampaign`, `processRetries`, `new FlowRunner`.
5. Other providers or libraries (Twilio, Gupshup, Interakt, 360dialog, Baileys, whatsapp-web and similar): none.
6. Job queues (Bull, BullMQ, Agenda): none. All background sends run from `utils/scheduler.js`.
7. Client code: the browser never calls Meta directly. Every send goes through the server.

**Result: 13 low-level functions actually call Meta's send endpoint.** Every feature reaches Meta through one of them. Moving these 13 behind the gateway covers every send path in the app today.

## 3.2 Complete inventory, grouped by the function that really sends

### A. Customer's own WhatsApp number (must appear in the customer's stats, limits and usage)

| Low-level sender | Features that reach Meta through it |
|---|---|
| `campaignProcessor.js:349` | Broadcast campaigns: send now, scheduled, retargeting, crash recovery resume (`scheduler.js:76`, skips contacts already sent) |
| `retryProcessor.js:274` | Campaign retries after 131049 frequency cap (8h, 16h, 24h) |
| `chat.js` `sendToMeta` (`:40`) | Live inbox: text and media (`:429`), template (`:532`), interactive or other (`:683`) |
| `apiV1.js` `sendToMeta` (`:79`) | Developer API: `/v1/messages/template` (`:344`), `/messages/session` (`:426`), `/messages/bulk` (`:535`) |
| `FlowRunner.dispatchToMeta` (`:1027`) | Flowbot: text, buttons, list, media, location request, template node, AI node replies, handoff message. Started only from the webhook: keyword flows (`webhook.js:1112`) and trigger flows (`:1302`) |
| `webhook.js:944` | Opt-out acknowledgement (STOP) |
| `webhook.js:1387` | Keyword and greeting auto-replies |
| `webhook.js:1463` | AI bot replies |
| `whatsappSender.sendWhatsAppAndLog` (`:40`) | CTWA welcome auto-reply (`webhook.js:1093`); store order notifications through `sendOrderNotification`: order placed (`wastore.js:631, 740`), payment received (`:1265, 1316, 1389`), order status changed (`:3030, 3075`), shipped (`:3141`); store owner alert on own number (`:1055`); invoice PDF (`:845`); shipping and tracking text (`:3120`); abandoned cart (`scheduler.js:490`); call follow-up message (`CallService.js:163`) |
| `storeCustomerAuth.sendWhatsAppOtp` (`:109`, retry `:129`) | Store customer sign-up OTP (`:364`) and login or verify OTP (`:472`) |
| `forms.js:458` | Form submission automation template |
| `checkout.js:328` | Paid-form (checkout) automation template after payment |
| `ctwa.js:548` | CTWA "retarget leads of this ad" bulk send |
| `landing.js:586` | Landing-page lead auto-trigger template |
| `settings.js:800` (`POST /api/settings/test`) | WhatsApp gateway "Send test message" in Settings |

That is 15 rows; `webhook.js` has three separate send sites, and the helpers `sendToMeta` and `sendWhatsAppAndLog` each serve many features.

### B. Bluetick's own platform number (must never appear in a customer's stats; should be tracked as platform cost)

All of these go through `sendSystemMessage`, which has **two separate copies**: `services/systemMessenger.js` (most callers) and `utils/systemMessenger.js` (used by `scheduler.js:141, 622` only).

| Feature | Where |
|---|---|
| Sign-up phone OTP, verify OTP | `auth.js:152, 166, 175` (`/send-otp`) |
| Forgot-password OTP | `auth.js:302, 309, 316` |
| Partner-linked welcome or validation template on sign-up | `auth.js:694` |
| Contact-us and demo request reply | `contact.js:106` |
| Plan purchase, renewal and payment messages | `billing.js:1475, 1988` |
| Plan expiry, trial and reminder messages | `scheduler.js:254, 313, 404, 596` |
| Invoice delivery to buyer, CC and admin test | `InvoiceService.js:540` (from `:765, 785, 816, 882`, and `invoices.js:286` test-send) |
| Store owner order alert fallback, used when the store has no own WhatsApp | `wastore.js:1091` |
| Admin alerts (about 25 events: registrations, purchases, payment failures, support tickets, NFC orders, addon installs, AI tokens depleted, payouts, server errors) | `sendAdminAlert` in `index.js`, `billing.js`, `auth.js`, `support.js`, `referrals.js`, `addons.js`, `nfc.js`, `meta-ads.js`, `templates.js`, `wastore.js`, `contact.js`, `scheduler.js` |

### C. Graph calls that are not message sends (excluded from the gateway, and allow-listed in the guard test)

Phone `/register`, `/whatsapp_business_profile`, `/media` uploads, `/uploads` sessions, `/message_templates`, `/subscribed_apps`, `/phone_numbers`, WABA and phone lookups, `pricing_analytics`, call actions (`metaCalling.js`), Ads API (`meta-ads.js`, `metaAdsPublisher.js`), and Conversions API pixel events (`capi.js`, `ctwa.js`).

## 3.3 Additional findings from the deep scan

**P1 (High). Store owner alerts can be billed to Bluetick.** When a store has no WhatsApp of its own, or the owner connected with manual keys (finding N3), the owner alert falls back to the platform number (`wastore.js:1091`). Bluetick pays Meta for these messages, and they count against nobody's plan.

**P2 (Medium). Two copies of the platform messenger.** `utils/systemMessenger.js` and `services/systemMessenger.js` both send. A fix applied to one, such as tagging or a Graph version bump, will be missed in the other.

**P3 (Medium). The plan-limit check can be beaten by parallel sends.** Every check reads the monthly count and then sends, with no reservation. A campaign plus inbox or API sends started at the same time can all pass and go over the limit. The gateway has to reserve the allowance atomically (a row lock or a counter row per owner per month).

**P4 (Medium). A status webhook can arrive before our own code saves the message id.** Meta sometimes sends the `sent` webhook before our HTTP call returns. Today that status is lost, because no row has the wamid yet. The gateway must write its row first, and the webhook must keep unknown wamids for a short time and apply them once the row exists.

**P5 (Low). Legacy webhook route throws data away.** `/api/webhooks` (plural) accepts payloads and discards them with a warning (`webhooks.js:30`). If any account's Meta app still points there, all its statuses are lost. Check server logs for that warning.

**P6 (Low). Store OTP retry counts twice.** When the OTP template fails with 131008, the retry is a second request. Only the successful send is tagged, which is correct. The gateway must keep this behaviour, so a rejected first attempt counts as a failure and not as a sent message.

## 3.4 Will every number be exact once the plan is built?

**For messages sent by Bluetick: yes.** Every send passes through one function, is recorded before it leaves, and is updated by one forward-only status machine. Every screen and the plan limit read the same table with the same definitions. Specifically:

| Area | After the gateway |
|---|---|
| Dashboard and Reports: sent, delivered, read, failed, rates | Exact, from one table, all features, account time zone |
| Campaign list and details | Exact, server-computed, no 1,000-row cap |
| Superadmin totals and failed reasons | Exact, includes campaign failures, excludes platform messages |
| Plan limit and usage bar | Exact and race-free, using the per-source `countsTowardPlan` rule |
| Usage & Spend page (by feature) | Exact counts per feature; spend still comes from Meta |
| Deleting campaigns or chats | No effect on counts or quota |

**Limits no code can remove. These come from Meta or from outside Bluetick:**

1. **Read counts depend on the recipient.** Meta does not send `read` when the recipient has turned off read receipts, so "Read" is always a minimum. This is true on every WhatsApp platform.
2. **Messages sent outside Bluetick on the same number** (Meta Business Suite, another BSP, the WhatsApp Business app with coexistence) never pass through our gateway. Meta bills them, so the Usage page shows them as "Sent outside Bluetick". They cannot count toward the plan.
3. **Money is Meta's estimate.** `pricing_analytics` cost is approximate, and the final amount is on the Meta invoice in Billing Hub.
4. **Webhooks can be late or missing.** Meta retries for a while, but a long server outage can lose status updates. The daily reconciliation job flags any account where Meta's delivered count differs from ours.
5. **History before the switch keeps today's bugs.** The backfill can copy old rows, but statuses that were overwritten or never recorded cannot be recovered. Numbers are exact from the cut-over date onwards.
6. **Calls are not messages.** WhatsApp Calling is billed separately by Meta and is kept out of message counts.

## 3.5 Additions to the implementation plan

Added to the gateway design in Part 2:

1. Put both platform messenger copies behind the gateway as `ownerId = platform` with `platform_*` sources: `platform_otp`, `platform_billing`, `platform_invoice`, `platform_alert`, `platform_store_fallback`. Then delete the duplicate file (P2).
2. Atomic allowance reservation in the gateway (P3).
3. Ledger row written before the Meta call, plus a short holding buffer for early webhooks (P4).
4. Add the store fallback to a per-store "platform-billed" counter, so superadmin can see what Bluetick pays for (P1).
5. Allow-list for the guard test: exactly the non-send Graph calls in 3.2 C.
6. Source registry, starting with every row in 3.2 A and B: `campaign`, `campaign_retry`, `inbox`, `api`, `flowbot`, `flowbot_ai`, `opt_out_ack`, `auto_reply`, `ctwa_welcome`, `ai_bot`, `store_order_placed`, `store_payment`, `store_status`, `store_shipping`, `store_invoice`, `store_owner_alert`, `store_cart`, `store_otp`, `forms`, `checkout`, `ctwa_retarget`, `landing`, `gateway_test`, `call_followup`, plus the platform sources.

## 3.6 Decisions needed before implementation

1. **Which sources use up the plan allowance?** Suggested default: everything a customer's number sends counts, except store OTP, opt-out acknowledgements and the gateway test message.
2. **What happens when the allowance runs out for automated messages** (store orders, OTP, flowbot)? Option (a): block, the same as campaigns today. Option (b): keep sending transactional messages and only block marketing and broadcasts. Option (b) avoids customers missing order or OTP messages.
3. **Account time zone**: add a per-account setting (default Asia/Kolkata), or use one time zone for everyone.

---

# Part 4 — Implementation status (2026-11-17)

Everything in Parts 1–3 is implemented, except the one item marked below. The code lives in `server/services/outbound/`.

| Item | Status | Where |
|---|---|---|
| H1 status order | Fixed: forward-only for ledger, MessageLog and ChatMessage | `services/outbound/status.js`, `routes/webhook.js` |
| H2 / M2 / M3 / M4 one definition, one table, send-time periods | Fixed | `services/outbound/metrics.js`, `routes/dashboard.js` |
| H3 superadmin failures + failed-reasons modal | Fixed: includes campaign failures | `routes/admin.js` |
| H4 deleting campaigns or users changes counts or quota | Fixed: ledger rows are never deleted | `routes/messages.js` |
| H5 Campaign Details over 1,000 recipients | Fixed: counts from server; charts use `chartEvents` for every recipient | `routes/messages.js`, `CampaignDetails.jsx` |
| M1 meaning of "Delivered" | Fixed (Campaign Details tab is labelled "Delivered, not read") | |
| M5 / N2 plan limit covers every sender, race-free | Fixed (all customer messages count, enforced) | `services/outbound/allowance.js` |
| M6 weekday chart, M7 date ranges, heatmap time zone | Fixed: account time zone `User.timezone` (default Asia/Kolkata) | `services/outbound/time.js`, `Reports.jsx` |
| L1–L4 | Fixed | |
| N1 invisible senders | Fixed: all 13 low-level senders go through the gateway | |
| N3 / N4 credentials | Fixed: one resolver (manual keys, then Facebook sign-in), also used by inbox and developer API | `services/outbound/credentials.js` |
| N5 Graph API versions | Fixed: one constant `v22.0` (`META_GRAPH_API_VERSION`) for every call. The usage-page analytics sync keeps its own `META_GRAPH_VERSION` (default v25.0) | `config/metaGraph.js` |
| N6 source labels | Fixed: 31 registered sources | `services/outbound/sources.js` |
| N7 / P1 Bluetick's own number | Fixed: ledgered as platform, kept out of customer stats, shown in a superadmin panel | `SuperAdminDashboard.jsx` |
| P2 duplicate platform messenger | Fixed: `utils/systemMessenger.js` delegates | |
| P3 parallel sends | Fixed: atomic reserve | |
| P4 early webhooks | Fixed: 90-second hold; unclaimed ids become "Sent outside Bluetick" | |
| P5 legacy `/api/webhooks` | Fixed: forwards to the account's handler by phone number id | `routes/webhooks.js` |
| P6 OTP retry | Fixed: replaced attempt marked "retried" | |
| Guards | Done: jest guard test (`npm run check:outbound`), runtime alarm on direct sends (`services/outbound/guard.js`), daily reconciliation (`services/outbound/reconcile.js`) | |
| Editor lint rule | **Not added.** The server has no ESLint setup, and adding one is a new dependency; `npm run check:outbound` does the same check | |
| Backfill of past data | Automatic on first start | `services/outbound/backfill.js` |

**Verified** against a temporary real Postgres with Meta mocked: plan limit under parallel sends, failure release, forward-only statuses, early webhooks, read from reply and click, platform separation, retries, backfill (idempotent), counter rebuild, every dashboard / Reports / campaign / superadmin endpoint, Facebook-only inbox send, and legacy webhook forwarding. **Not verified yet:** live Meta traffic on staging.
