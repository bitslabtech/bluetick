// Simple SQL script to create Free plan
// Run this in your PostgreSQL client or pgAdmin

INSERT INTO "Plans" (
    id,
    name,
    description,
    price,
    currency,
    interval,
    "messageLimit",
    "contactLimit",
    "templateLimit",
    features,
    color,
    "isPopular",
    "isActive",
    "isDefault",
    "isPublic",
    "createdAt",
    "updatedAt"
) VALUES (
    gen_random_uuid(),
    'Free',
    'Perfect for getting started',
    0,
    'USD',
    'month',
    30,
    10,
    2,
    '["30 messages per month", "10 contacts", "2 message templates", "Basic analytics", "Email support"]'::jsonb,
    'blue',
    false,
    true,
    true,  -- Set as default
    false, -- Hidden from public
    NOW(),
    NOW()
);
