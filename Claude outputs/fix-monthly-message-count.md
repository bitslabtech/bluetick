# Fix: Monthly Message Usage Count (`getMonthlyMessageCount`)

## Background

The user dashboard shows a **"This Month Usage"** bar driven by `getMonthlyMessageCount()` in
`server/utils/planLimits.js`. This count is also used by `campaignProcessor.js` to gate plan
limits before sending a campaign. It is currently broken in two ways:

1. **Failed messages are counted** — permanently-failed `MessageLog` rows inflate the count.
2. **Successful retried campaign messages are double-counted** — both the `MessageLog` row
   (always counted) AND a `ChatMessage` row created by `retryProcessor.js` on retry success
   are counted, so each retried-and-delivered contact is counted twice.

---

## How Messages Currently Flow (read this before touching anything)

There are **4 distinct paths** that produce outbound message records. All 4 paths must be
understood to fix the count correctly without breaking anything else.

### Path 1 — Campaign first send (success)
`campaignProcessor.js`:
- Meta accepts the message → `MessageLog.create({ status: 'SENT' })`
- **No `ChatMessage` is created yet** (Option A design — inbox waits for delivery confirmation)
- Later: `webhook.js` receives `status=delivered` → finds no existing `ChatMessage` for that
  `messageId` → creates `ChatMessage({ direction: 'OUTBOUND' })` from cached `inboxPayload`

### Path 2 — Campaign first send (failure)
`campaignProcessor.js`:
- Meta rejects immediately → `MessageLog.create({ status: 'FAILED' })`
- If error is `131049` or `130472`, `webhook.js` sets the log to `RETRY_PENDING`
- **No `ChatMessage` is ever created for permanently failed messages**

### Path 3 — Campaign retry success
`retryProcessor.js`:
- Fires the message again to Meta → Meta accepts
- Updates the **existing** `MessageLog` row: `log.update({ status: 'SENT' })`
- **Creates a new `ChatMessage({ direction: 'OUTBOUND' })`** because webhook.js won't fire
  again for a retry (the messageId changed, so the `inboxPayload` cache path doesn't apply)

### Path 4 — Live Inbox / FlowBot / AI Bot messages
`webhook.js` / flow execution:
- Each outbound message is a `ChatMessage.create({ direction: 'OUTBOUND' })`
- No `MessageLog` row is involved

---

## The Two Bugs — Exact Proof

### Bug 1: Failed `MessageLog` rows are counted

In `getMonthlyMessageCount()`:
```js
const campaignMessageCount = await MessageLog.count({
    where: {
        createdAt: { [Op.gte]: startOfMonth }
        // ← NO status filter — FAILED rows are included
    },
    include: [{ model: Message, where: { userId }, attributes: [] }]
});
```

Scenario: 100 contacts, 20 fail on all 3 retries → 20 `FAILED` `MessageLog` rows counted.
Expected: 0. These should not consume quota.

### Bug 2: Successful retries are double-counted

For the 30 contacts that succeed on retry:
- Their `MessageLog` row is updated to `SENT` → counted by `campaignMessageCount`
- `retryProcessor.js` also creates a `ChatMessage({ direction: 'OUTBOUND' })` →
  counted by `chatMessageCount`

Result: 30 retried successes counted **twice** (once in each query).

### Net overcount for the scenario (100 contacts, 50 retried, 30 of those succeed)
| Source | Actual count | Should be |
|---|---|---|
| `campaignMessageCount` | 100 (all logs, including 20 FAILED) | 80 |
| `chatMessageCount` (from retries) | +30 | +0 (already in MessageLog) |
| **Total reported** | **130** | **80** |

---

## Fix

### File 1: `server/utils/planLimits.js`

**Change `getMonthlyMessageCount` to:**

1. Count only `MessageLog` rows whose `status` is NOT failed/pending (excludes permanently
   failed and in-progress retries that may still fail).
2. Exclude `ChatMessage` rows that were created by campaign delivery paths (webhook and
   retryProcessor), since those contacts are already counted in `campaignMessageCount`.

The cleanest way to exclude campaign-originated `ChatMessage` rows without a schema change
is to check whether a `MessageLog` row exists with the same `messageId`. However, that is
an expensive correlated subquery. The recommended approach below uses a `source` column
(see File 2 and File 3).

Replace the entire `getMonthlyMessageCount` function:

```js
/**
 * Count outbound messages sent by userId in the current calendar month.
 *
 * Rules:
 *  - Campaign messages  → counted via MessageLog, excluding FAILED and RETRY_PENDING rows.
 *                         This means a message only counts once it has been accepted by Meta
 *                         (status = SENT, DELIVERED, READ, or any non-failure status).
 *  - Inbox / Bot msgs   → counted via ChatMessage (direction=OUTBOUND), but ONLY rows whose
 *                         source is NOT 'campaign'. Campaign delivery creates ChatMessage rows
 *                         for inbox rendering, but those contacts are already in MessageLog.
 */
const getMonthlyMessageCount = async (userId) => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const MessageLog = require('../models/MessageLog');
    const Message    = require('../models/Message');

    // 1. Campaign messages: count MessageLog rows that were accepted by Meta
    //    (exclude FAILED and RETRY_PENDING — those never reached the recipient)
    const campaignMessageCount = await MessageLog.count({
        where: {
            createdAt: { [Op.gte]: startOfMonth },
            status: { [Op.notIn]: ['FAILED', 'RETRY_PENDING'] }
        },
        include: [{
            model: Message,
            where: { userId },
            attributes: []
        }]
    });

    // 2. Live Inbox / FlowBot / AI Bot messages: count OUTBOUND ChatMessages that did NOT
    //    originate from a campaign delivery (those are already counted above in MessageLog)
    const chatMessageCount = await ChatMessage.count({
        where: {
            direction: 'OUTBOUND',
            source:    { [Op.ne]: 'campaign' },   // exclude campaign-originated inbox rows
            createdAt: { [Op.gte]: startOfMonth },
            '$Conversation.userId$': userId
        },
        include: [{ model: Conversation, attributes: [] }]
    });

    return chatMessageCount + campaignMessageCount;
};
```

---

### File 2: `server/models/ChatMessage.js`

Add a `source` column to track which path created each `ChatMessage`. This is used by
`getMonthlyMessageCount` to exclude campaign-delivery rows from the inbox count.

Add the following field inside the `sequelize.define('ChatMessage', { ... })` block,
after the `referral` field:

```js
source: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
    comment: 'Origin of this message: null = live inbox/bot, "campaign" = created by webhook or retryProcessor on campaign delivery confirmation'
}
```

> **Important:** After adding this column, create a migration or let Sequelize auto-sync.
> Existing rows will have `source = null`, which is correct — they are live inbox messages.

---

### File 3: `server/utils/retryProcessor.js`

When a retry succeeds, `retryProcessor.js` creates a `ChatMessage` for inbox rendering.
Mark it as `source: 'campaign'` so the count function knows to skip it.

Find the `ChatMessage.create(...)` call (around line 321) and add `source: 'campaign'`:

```js
// BEFORE:
const chatMsg = await ChatMessage.create({
    conversationId: conversation.id,
    messageId: sentMessageId,
    direction: 'OUTBOUND',
    type: 'template',
    body: fullBody,
    templateData: { name: template.name, language: template.language, components: richComponents },
    status: 'sent',
    timestamp: nowTs
});

// AFTER:
const chatMsg = await ChatMessage.create({
    conversationId: conversation.id,
    messageId: sentMessageId,
    direction: 'OUTBOUND',
    type: 'template',
    body: fullBody,
    templateData: { name: template.name, language: template.language, components: richComponents },
    status: 'sent',
    timestamp: nowTs,
    source: 'campaign'   // ← marks this as a campaign delivery row; excluded from inbox count
});
```

---

### File 4: `server/routes/webhook.js`

When `webhook.js` creates a `ChatMessage` on first delivery confirmation (Option A path,
around line 459), mark it the same way:

```js
// BEFORE:
const newChatMsg = await ChatMessage.create({
    conversationId: conv.id,
    messageId: metaMessageId,
    direction: 'OUTBOUND',
    type: 'template',
    body: fullBody,
    templateData: { name: templateName, language: templateLanguage, components: richComponents },
    status: 'delivered',
    timestamp: new Date()
});

// AFTER:
const newChatMsg = await ChatMessage.create({
    conversationId: conv.id,
    messageId: metaMessageId,
    direction: 'OUTBOUND',
    type: 'template',
    body: fullBody,
    templateData: { name: templateName, language: templateLanguage, components: richComponents },
    status: 'delivered',
    timestamp: new Date(),
    source: 'campaign'   // ← marks this as a campaign delivery row; excluded from inbox count
});
```

---

## What Does NOT Change

- The dashboard stats panel (`/api/dashboard/stats`) already has its own query logic and is
  unaffected by this fix. It queries `ChatMessage` (direction=OUTBOUND, status != failed)
  and `MessageLog` separately depending on the `campaignId` filter. Leave those queries alone.
- The `source` column is `null` by default, so all existing live inbox / FlowBot / AI Bot
  `ChatMessage` rows will correctly continue to be counted.
- Campaign retry logic (3-attempt cap, `RETRY_PENDING` status, `retryAfter` scheduling)
  does not change.
- The `MessageLog` model does not need any changes.

---

## Verification

After applying all 4 changes, trace through the original scenario:

**100 contacts sent. 50 fail initially → retry. 30 of 50 succeed on retry. 20 permanently fail.**

| Contact group | MessageLog status | ChatMessage created? | source | Counted in MessageLog? | Counted in ChatMessage? |
|---|---|---|---|---|---|
| 50 direct success | SENT → DELIVERED | Yes (webhook, source=campaign) | campaign | ✅ Yes | ❌ Excluded |
| 30 retry success | SENT (updated row) | Yes (retryProcessor, source=campaign) | campaign | ✅ Yes | ❌ Excluded |
| 20 permanent fail | FAILED | None | — | ❌ Excluded | ❌ N/A |

**Total counted: 50 + 30 = 80 ✅**

---

## Migration Note

If you use explicit DB migrations (not `sync: { alter: true }`), add a migration:

```js
// migrations/YYYYMMDDHHMMSS-add-source-to-chat-messages.js
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('ChatMessages', 'source', {
            type: Sequelize.STRING,
            allowNull: true,
            defaultValue: null
        });
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('ChatMessages', 'source');
    }
};
```
