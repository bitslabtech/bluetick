/**
 * One-time copy of past messages into the OutboundMessage ledger, from the tables used before the
 * gateway existed: MessageLog (campaigns), ChatMessage (inbox, flowbot, auto-replies, AI, store ...)
 * and MessageBilling (usage-page tags, the only record of OTP / form / ad messages).
 *
 * Safe to run again: rows whose Meta id is already in the ledger are skipped, and campaign rows are
 * matched by MessageLog id. Statuses lost by the old code cannot be recovered, so numbers before the
 * switch-over keep the old gaps; everything from the switch-over on is exact.
 *
 * Run automatically on startup when the ledger is empty (see utils/scheduler.js), or by hand:
 *   node -e "require('./services/outbound/backfill').run().then(r => { console.log(r); process.exit(0); })"
 */
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const UUID = `md5(random()::text || clock_timestamp()::text)::uuid`;
// Owner's month in the owner's time zone
const PERIOD = (tsCol, userAlias) => `to_char(${tsCol} AT TIME ZONE COALESCE(${userAlias}."timezone", 'Asia/Kolkata'), 'YYYY-MM')`;

// Old source tags -> current source keys
const SOURCE_SQL = (col) => `CASE
    WHEN ${col} IS NULL THEN 'inbox'
    WHEN ${col} IN ('system') THEN 'platform_message'
    WHEN ${col} IN ('test') THEN 'gateway_test'
    WHEN ${col} IN ('ads') THEN 'ctwa_retarget'
    WHEN ${col} IN ('campaign','inbox','flowbot','auto_reply','ai_bot','store_order','store_otp','forms','api','landing') THEN ${col}
    ELSE 'inbox' END`;

async function run() {
    const t0 = Date.now();
    const result = {};

    // 1. Campaign messages (one row per recipient attempt kept in MessageLog)
    const [, c1] = await sequelize.query(`
        INSERT INTO "OutboundMessages" ("id","ownerId","platform","source","wamid","toPhone","messageType","templateName",
            "campaignId","contactId","status","errorCode","errorReason","countsTowardPlan","counted","periodKey",
            "sentAt","deliveredAt","readAt","clickedAt","failedAt","pricingModel","pricingType","pricingCategory","billable",
            "backfilled","readInferred","createdAt","updatedAt")
        SELECT ${UUID}, m."userId", false, 'campaign', ml."messageId", regexp_replace(COALESCE(ml."phone",''), '[^0-9]', '', 'g'), 'template', NULL,
            ml."campaignId", ml."contactId",
            CASE upper(ml."status") WHEN 'SENT' THEN 'sent' WHEN 'DELIVERED' THEN 'delivered' WHEN 'READ' THEN 'read'
                 WHEN 'CLICKED' THEN 'clicked' WHEN 'RETRY_PENDING' THEN 'retry_pending' WHEN 'FAILED' THEN 'failed' ELSE 'sent' END,
            ml."errorCode"::text, ml."error", true,
            upper(ml."status") NOT IN ('FAILED','RETRY_PENDING'),
            ${PERIOD('ml."createdAt"', 'u')},
            CASE WHEN upper(ml."status") NOT IN ('FAILED') THEN ml."createdAt" END,
            CASE WHEN upper(ml."status") IN ('DELIVERED','READ','CLICKED') THEN ml."updatedAt" END,
            CASE WHEN upper(ml."status") IN ('READ','CLICKED') THEN ml."updatedAt" END,
            CASE WHEN upper(ml."status") = 'CLICKED' THEN ml."updatedAt" END,
            CASE WHEN upper(ml."status") = 'FAILED' THEN ml."updatedAt" END,
            mb."pricingModel", mb."pricingType", mb."pricingCategory", mb."billable",
            true, false, ml."createdAt", NOW()
          FROM "MessageLogs" ml
          JOIN "Messages" m ON m."id" = ml."campaignId"
          LEFT JOIN "Users" u ON u."id" = m."userId"
          LEFT JOIN "MessageBillings" mb ON mb."messageId" = ml."messageId"
         WHERE (ml."messageId" IS NULL OR NOT EXISTS (SELECT 1 FROM "OutboundMessages" o WHERE o."wamid" = ml."messageId"))
           AND NOT EXISTS (SELECT 1 FROM "OutboundMessages" o2 WHERE o2."backfilled" = true AND o2."campaignId" = ml."campaignId"
                            AND o2."toPhone" = regexp_replace(COALESCE(ml."phone",''), '[^0-9]', '', 'g') AND o2."createdAt" = ml."createdAt")
        ON CONFLICT ("wamid") DO NOTHING`, { type: QueryTypes.INSERT });
    result.campaign = c1;

    // 2. Every other outbound inbox message (campaign copies in ChatMessage are already covered above)
    const [, c2] = await sequelize.query(`
        INSERT INTO "OutboundMessages" ("id","ownerId","platform","source","wamid","toPhone","messageType","templateName",
            "conversationId","status","errorCode","errorReason","countsTowardPlan","counted","periodKey",
            "sentAt","deliveredAt","readAt","failedAt","pricingModel","pricingType","pricingCategory","billable",
            "backfilled","readInferred","createdAt","updatedAt")
        SELECT ${UUID}, c."userId", (src.s LIKE 'platform_%'), src.s,
            CASE WHEN cm."messageId" LIKE 'wamid.%' THEN cm."messageId" END,
            regexp_replace(COALESCE(c."phoneNumber",''), '[^0-9]', '', 'g'), cm."type", NULL,
            cm."conversationId",
            CASE lower(COALESCE(cm."status",'sent')) WHEN 'delivered' THEN 'delivered' WHEN 'read' THEN 'read' WHEN 'failed' THEN 'failed' ELSE 'sent' END,
            NULL, cm."errorMessage", (src.s NOT LIKE 'platform_%'),
            (src.s NOT LIKE 'platform_%') AND lower(COALESCE(cm."status",'sent')) <> 'failed',
            ${PERIOD('cm."createdAt"', 'u')},
            CASE WHEN lower(COALESCE(cm."status",'sent')) <> 'failed' THEN cm."createdAt" END,
            CASE WHEN lower(cm."status") IN ('delivered','read') THEN cm."updatedAt" END,
            CASE WHEN lower(cm."status") = 'read' THEN cm."updatedAt" END,
            CASE WHEN lower(cm."status") = 'failed' THEN cm."updatedAt" END,
            mb."pricingModel", mb."pricingType", mb."pricingCategory", mb."billable",
            true, false, cm."createdAt", NOW()
          FROM "ChatMessages" cm
          JOIN "Conversations" c ON c."id" = cm."conversationId"
          LEFT JOIN "Users" u ON u."id" = c."userId"
          LEFT JOIN "MessageBillings" mb ON mb."messageId" = cm."messageId"
          CROSS JOIN LATERAL (SELECT ${SOURCE_SQL('COALESCE(mb."source", cm."source")')} AS s) src
         WHERE cm."direction" = 'OUTBOUND'
           AND COALESCE(cm."source",'') <> 'campaign'
           AND (cm."messageId" IS NULL OR cm."messageId" NOT LIKE 'wamid.%'
                OR NOT EXISTS (SELECT 1 FROM "OutboundMessages" o WHERE o."wamid" = cm."messageId"))
           AND NOT EXISTS (SELECT 1 FROM "OutboundMessages" o2 WHERE o2."backfilled" = true AND o2."conversationId" = cm."conversationId"
                            AND o2."createdAt" = cm."createdAt")
        ON CONFLICT ("wamid") DO NOTHING`, { type: QueryTypes.INSERT });
    result.inbox = c2;

    // 3. Messages known only from usage-page tags (store OTP, forms, checkout, ad retargeting, tests ...)
    const [, c3] = await sequelize.query(`
        INSERT INTO "OutboundMessages" ("id","ownerId","platform","source","wamid","status","countsTowardPlan","counted","periodKey",
            "sentAt","deliveredAt","readAt","failedAt","pricingModel","pricingType","pricingCategory","billable",
            "backfilled","readInferred","createdAt","updatedAt")
        SELECT ${UUID}, mb."userId", (src.s LIKE 'platform_%'), src.s, mb."messageId",
            CASE lower(COALESCE(mb."status",'sent')) WHEN 'delivered' THEN 'delivered' WHEN 'read' THEN 'read' WHEN 'failed' THEN 'failed' ELSE 'sent' END,
            (src.s NOT LIKE 'platform_%'),
            (src.s NOT LIKE 'platform_%') AND lower(COALESCE(mb."status",'sent')) <> 'failed',
            ${PERIOD('mb."createdAt"', 'u')},
            CASE WHEN lower(COALESCE(mb."status",'sent')) <> 'failed' THEN mb."createdAt" END,
            CASE WHEN lower(mb."status") IN ('delivered','read') THEN mb."updatedAt" END,
            CASE WHEN lower(mb."status") = 'read' THEN mb."updatedAt" END,
            CASE WHEN lower(mb."status") = 'failed' THEN mb."updatedAt" END,
            mb."pricingModel", mb."pricingType", mb."pricingCategory", mb."billable",
            true, false, mb."createdAt", NOW()
          FROM "MessageBillings" mb
          LEFT JOIN "Users" u ON u."id" = mb."userId"
          CROSS JOIN LATERAL (SELECT CASE WHEN mb."source" IS NULL THEN 'external' ELSE ${SOURCE_SQL('mb."source"')} END AS s) src
         WHERE NOT EXISTS (SELECT 1 FROM "OutboundMessages" o WHERE o."wamid" = mb."messageId")
        ON CONFLICT ("wamid") DO NOTHING`, { type: QueryTypes.INSERT });
    result.tagsOnly = c3;

    // External (untagged) rows never count toward a plan
    await sequelize.query(`UPDATE "OutboundMessages" SET "countsTowardPlan" = false, "counted" = false WHERE "source" = 'external' AND "counted" = true`);

    // 4. Rebuild every plan counter from the ledger
    await require('./allowance').recountAll();
    result.ms = Date.now() - t0;
    return result;
}

// Run once on startup when the ledger has never been filled
async function runIfEmpty() {
    const [row] = await sequelize.query(`SELECT EXISTS (SELECT 1 FROM "OutboundMessages" WHERE "backfilled" = true) AS done`, { type: QueryTypes.SELECT });
    if (row?.done) return null;
    console.log('[OUTBOUND] Ledger empty — copying past messages (one-time backfill)...');
    const r = await run();
    console.log('[OUTBOUND] Backfill complete:', r);
    return r;
}

module.exports = { run, runIfEmpty };
