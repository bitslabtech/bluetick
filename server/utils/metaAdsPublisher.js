const axios = require('axios');
const { getIo } = require('../socket');

/**
 * Publishes a complete Campaign, AdSet, and Ad to Meta Ads API.
 * This extracts the 600+ lines of duplicated code across the standard publish and draft-publish routes.
 * 
 * @param {Object} user - The user object from the DB (must include metaAdsToken, metaAdAccountId, etc.)
 * @param {Object} payload - The campaign configuration
 * @returns {Object} result - { status, campaignId, adSetId, warning, errorMsg }
 */
async function publishCampaignToMeta(user, payload) {
    let fbStatus = 'Draft';
    let campRes = null;
    let adSetRes = null;
    let adId = null;
    let reqWarning = null;

    try {
        const fbAdAccountId = user.metaAdAccountId;
        const token = user.metaAdsToken;

        const emitProgress = (step, message) => {
            try {
                const io = getIo();
                if (io) io.to(user.id).emit('campaign_publish_progress', { step, message });
            } catch (err) { }
        };

        emitProgress(1, 'Creating Meta Campaign...');

        const {
            campaignName, objective, dailyBudget, targeting,
            creatives, imageUrl, automation, scheduling,
            budgetType, lifetimeBudget, fbPageId
        } = payload;

        // 1. Create Campaign
        const campaignObjective = objective || 'OUTCOME_ENGAGEMENT';
        campRes = await axios.post(`https://graph.facebook.com/v22.0/${fbAdAccountId}/campaigns`, null, {
            params: {
                name: campaignName,
                objective: campaignObjective,
                status: 'ACTIVE',
                special_ad_categories: JSON.stringify([]),
                is_adset_budget_sharing_enabled: false,
                access_token: token
            }
        });
        const campaignId = campRes.data.id;

        // ── Build geo_locations ────────────────────────────────
        emitProgress(2, 'Resolving targeting and audience...');
        const userLocations = targeting?.locations || [];
        const locationKeys  = targeting?.locationKeys || [];
        let geoLocations;

        if (locationKeys.length > 0) {
            const locObjects = targeting?.locationObjects || [];
            const countries  = locObjects.filter(l => l.type === 'country').map(l => l.countryCode || l.key);
            const regions    = locObjects.filter(l => l.type === 'region').map(l => ({ key: l.key, name: l.name, country: l.countryCode }));
            const cities     = locObjects.filter(l => l.type === 'city').map(l => ({ key: l.key, name: l.name, country: l.countryCode, region: l.region }));
            const zips       = locObjects.filter(l => l.type === 'zip').map(l => ({ key: l.key }));

            geoLocations = {};
            if (countries.length > 0)  geoLocations.countries = countries;
            if (regions.length > 0)    geoLocations.regions   = regions;
            if (cities.length > 0)     geoLocations.cities    = cities;
            if (zips.length > 0)       geoLocations.zips      = zips;
            if (Object.keys(geoLocations).length === 0) geoLocations = { countries: ['IN'] };
        } else if (userLocations.length > 0) {
            geoLocations = { cities: userLocations.map(loc => ({ name: typeof loc === 'string' ? loc : loc.name })) };
        } else {
            geoLocations = { countries: ['IN'] };
        }

        // ── Build interests (flexible_spec) ───────────────────
        // P1 FIX: Parallelize interest resolution via Promise.allSettled
        const userInterests = targeting?.interests || [];
        let flexibleSpec = undefined;
        if (userInterests.length > 0) {
            const interestPromises = userInterests.map(interestName => {
                const qName = typeof interestName === 'string' ? interestName : interestName.name;
                return axios.get('https://graph.facebook.com/v22.0/search', {
                    params: { type: 'adinterest', q: qName, access_token: token, limit: 1 },
                    timeout: 5000
                }).then(res => {
                    const match = res.data?.data?.[0];
                    if (match && match.id) return { id: match.id, name: match.name };
                    console.warn(`[META-ADS] Interest not found on Meta: "${qName}"`);
                    return null;
                }).catch(e => {
                    console.warn(`[META-ADS] Interest lookup failed for "${qName}": ${e.message}`);
                    return null;
                });
            });

            const results = await Promise.allSettled(interestPromises);
            const resolvedInterests = results
                .filter(r => r.status === 'fulfilled' && r.value !== null)
                .map(r => r.value);

            if (resolvedInterests.length > 0) {
                flexibleSpec = [{ interests: resolvedInterests }];
                console.log(`[META-ADS] Resolved ${resolvedInterests.length}/${userInterests.length} interests:`, resolvedInterests.map(i => `${i.name}(${i.id})`).join(', '));
            } else {
                console.warn('[META-ADS] No interests could be resolved — omitting flexible_spec entirely');
            }
        }

        // ── Build genders array ──────────────────────────────────
        let gendersArr = undefined;
        if (targeting?.gender === 'male')   gendersArr = [1];
        if (targeting?.gender === 'female') gendersArr = [2];

        // ── Build locales (language targeting) ───────────────────
        const LOCALE_MAP = { en: 6, hi: 23, mr: 45, gu: 20, ta: 57, te: 59, kn: 33, ml: 42, bn: 12, ar: 28, pa: 51, ur: 67 };
        let localesArr = undefined;
        if (targeting?.targetingLanguage && LOCALE_MAP[targeting.targetingLanguage]) {
            localesArr = [LOCALE_MAP[targeting.targetingLanguage]];
        }

        // ── Build placement (publisher_platforms) ──────────────
        const placements = targeting?.placements || ['facebook', 'instagram'];
        let publisherPlatforms = placements.filter(p => ['facebook', 'instagram', 'audience_network', 'messenger'].includes(p));

        if ((objective || 'OUTCOME_ENGAGEMENT') === 'OUTCOME_ENGAGEMENT') {
            publisherPlatforms = publisherPlatforms.filter(p => p !== 'messenger' && p !== 'audience_network');
        }

        if (publisherPlatforms.includes('audience_network') &&
            !publisherPlatforms.includes('facebook') &&
            !publisherPlatforms.includes('instagram')) {
            publisherPlatforms.push('facebook');
            console.log('[META-ADS] Audience Network requires a paired platform — auto-added facebook');
        }

        const facebookPositions  = placements.includes('facebook')   ? (targeting?.fbPositions   || ['feed', 'facebook_reels']) : undefined;
        const instagramPositions = placements.includes('instagram')  ? (targeting?.igPositions   || ['stream', 'reels'])        : undefined;
        const rawMessengerPos    = (targeting?.messengerPositions || ['messenger_story']).filter(pos => pos !== 'messenger_home');
        const messengerPositions = placements.includes('messenger') && publisherPlatforms.includes('messenger')
            ? (rawMessengerPos.length > 0 ? rawMessengerPos : ['messenger_story'])
            : undefined;

        // ── Build full targeting spec ─────────────────────────
        const targetingSpec = {
            age_max: targeting?.age_max || 65,
            age_min: targeting?.age_min || 18,
            geo_locations: geoLocations,
            ...(gendersArr          && { genders: gendersArr }),
            ...(localesArr          && { locales: localesArr }),
            ...(flexibleSpec        && { flexible_spec: flexibleSpec }),
            ...(publisherPlatforms.length > 0 && { publisher_platforms: publisherPlatforms }),
            ...(facebookPositions   && { facebook_positions: facebookPositions }),
            ...(instagramPositions  && { instagram_positions: instagramPositions }),
            ...(messengerPositions  && { messenger_positions: messengerPositions }),
            targeting_automation: { advantage_audience: 0 },
        };

        // ── Build AdSet params — resolve Page ID ──────────────
        let pageId = user.metaPageId || fbPageId || null;

        if (!pageId) {
            console.log(`[META-ADS] Attempting to auto-resolve Facebook Page ID for user ${user.id}...`);
            let resolvedPageId = null;

            if (!resolvedPageId) {
                try {
                    const pagesRes = await axios.get('https://graph.facebook.com/v22.0/me/accounts', {
                        params: { access_token: token, fields: 'id,name', limit: 10 }
                    });
                    if (pagesRes.data?.data?.length > 0) resolvedPageId = pagesRes.data.data[0].id;
                } catch (e) { console.warn(`[META-ADS] Strategy 1 failed:`, e.message); }
            }

            if (!resolvedPageId) {
                try {
                    const bizRes = await axios.get('https://graph.facebook.com/v22.0/me/businesses', {
                        params: { access_token: token, fields: 'id,name', limit: 5 }
                    });
                    for (const biz of (bizRes.data?.data || [])) {
                        if (resolvedPageId) break;
                        try {
                            const pagesRes = await axios.get(`https://graph.facebook.com/v22.0/${biz.id}/owned_pages`, {
                                params: { access_token: token, fields: 'id,name', limit: 5 }
                            });
                            if (pagesRes.data?.data?.length > 0) resolvedPageId = pagesRes.data.data[0].id;
                        } catch (e2) {}
                    }
                } catch (e) { console.warn(`[META-ADS] Strategy 2 failed:`, e.message); }
            }

            if (!resolvedPageId && user.metaAdAccountId) {
                try {
                    const actRes = await axios.get(`https://graph.facebook.com/v22.0/${user.metaAdAccountId}`, {
                        params: { access_token: token, fields: 'id,name,business' }
                    });
                    const businessId = actRes.data?.business?.id;
                    if (businessId) {
                        const pagesRes = await axios.get(`https://graph.facebook.com/v22.0/${businessId}/owned_pages`, {
                            params: { access_token: token, fields: 'id,name', limit: 5 }
                        });
                        if (pagesRes.data?.data?.length > 0) resolvedPageId = pagesRes.data.data[0].id;
                    }
                } catch (e) { console.warn(`[META-ADS] Strategy 3 failed:`, e.message); }
            }

            if (resolvedPageId) {
                pageId = resolvedPageId;
                user.metaPageId = pageId;
                await user.save();
            } else {
                throw new Error(
                    'No Facebook Page found on your account. Please ensure: ' +
                    '(1) Your Meta token has pages_show_list permission, ' +
                    '(2) You have admin access to a Facebook Page in your Business Manager, ' +
                    'or (3) Provide your Page ID manually in Settings → Meta Ads.'
                );
            }
        }
        
        const isLifetime = budgetType === 'lifetime';
        const isCTWA = (objective || 'OUTCOME_ENGAGEMENT') === 'OUTCOME_ENGAGEMENT';

        const OBJECTIVE_CONFIG = {
            OUTCOME_ENGAGEMENT: { optimization_goal: 'CONVERSATIONS',   destination_type: 'WHATSAPP', bid_strategy: 'LOWEST_COST_WITHOUT_CAP' },
            OUTCOME_TRAFFIC:    { optimization_goal: 'LINK_CLICKS',      bid_strategy: 'LOWEST_COST_WITHOUT_CAP' },
            OUTCOME_LEADS:      { optimization_goal: 'LEAD_GENERATION',  bid_strategy: 'LOWEST_COST_WITHOUT_CAP' },
            OUTCOME_AWARENESS:  { optimization_goal: 'REACH',            bid_strategy: 'LOWEST_COST_WITHOUT_CAP' },
        };
        const objConfig = OBJECTIVE_CONFIG[objective] || OBJECTIVE_CONFIG.OUTCOME_ENGAGEMENT;

        const adSetParams = {
            name: `${campaignName} - AdSet`,
            campaign_id: campaignId,
            billing_event: 'IMPRESSIONS',
            optimization_goal: objConfig.optimization_goal,
            bid_strategy: objConfig.bid_strategy || 'LOWEST_COST_WITHOUT_CAP',
            promoted_object: JSON.stringify({ page_id: pageId }),
            targeting: JSON.stringify(targetingSpec),
            status: 'ACTIVE',
            access_token: token
        };
        if (objConfig.destination_type) adSetParams.destination_type = objConfig.destination_type;

        if (isLifetime) {
            adSetParams.lifetime_budget = Math.round((Number(lifetimeBudget) || 3000) * 100);
        } else {
            adSetParams.daily_budget = Math.round((Number(dailyBudget) || 500) * 100);
        }

        // ── Ad Scheduling ──────────────────────────────────────
        const schedStart = scheduling?.startDate ? Math.floor(new Date(scheduling.startDate).getTime() / 1000) : null;
        const schedEnd   = scheduling?.endDate   ? Math.floor(new Date(scheduling.endDate).getTime()   / 1000) : null;

        if (schedStart && !isNaN(schedStart)) {
            adSetParams.start_time = schedStart;
        }

        if (isLifetime) {
            if (schedEnd && !isNaN(schedEnd)) {
                adSetParams.end_time = schedEnd;
            } else {
                adSetParams.end_time = Math.floor(Date.now() / 1000) + (30 * 24 * 3600);
            }
        } else {
            if (schedEnd && !isNaN(schedEnd)) {
                const effectiveStart = schedStart || Math.floor(Date.now() / 1000);
                const gapSeconds = schedEnd - effectiveStart;
                if (gapSeconds < 24 * 3600) {
                    throw new Error(`Ad schedule is too short (${Math.round(gapSeconds / 3600)} hour(s)). Daily budget campaigns must run for at least 24 hours. Please extend the end date or leave it blank to run the campaign indefinitely.`);
                }
                adSetParams.end_time = schedEnd;
            }
        }

        // 2. Create AdSet
        emitProgress(3, 'Creating Ad Set...');
        adSetRes = await axios.post(`https://graph.facebook.com/v22.0/${fbAdAccountId}/adsets`, null, {
            params: adSetParams
        }).catch(async (e) => {
            const errData = e.response?.data?.error || {};
            const errSubcode = errData.error_subcode;
            console.error('[META-ADS] AdSet creation failed:', JSON.stringify(errData, null, 2));

            if (isCTWA && (errSubcode === 2446886 || errSubcode === 1885264 || (errData.message && errData.message.includes('WhatsApp')))) {
                console.log('[META-ADS] Page not linked to WABA — retrying as standard engagement ad...');
                delete adSetParams.destination_type;
                adSetParams.optimization_goal = 'LINK_CLICKS';
                adSetParams.bid_strategy = 'LOWEST_COST_WITHOUT_CAP';

                return axios.post(`https://graph.facebook.com/v22.0/${fbAdAccountId}/adsets`, null, {
                    params: adSetParams
                }).catch(e2 => {
                    console.error('[META-ADS] Standard fallback also failed:', JSON.stringify(e2.response?.data?.error || e2.message, null, 2));
                    return { data: { id: null } };
                });
            }

            return { data: { id: null } };
        });

        const adSetId = adSetRes.data.id;
        fbStatus = adSetId ? 'Active' : 'Draft';

        // 3. Upload image and create AdCreative
        if (adSetId) {
            emitProgress(4, 'Uploading Ad Creative Image...');
            try {
                let imageHash = null;

                if (imageUrl && imageUrl.startsWith('data:image')) {
                    const base64Data = imageUrl.split(',')[1];
                    if (base64Data) {
                        const qs = require('querystring');
                        const imgUploadRes = await axios.post(
                            `https://graph.facebook.com/v22.0/${fbAdAccountId}/adimages`,
                            qs.stringify({ bytes: base64Data, access_token: token }),
                            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, maxBodyLength: Infinity, maxContentLength: Infinity }
                        ).catch(e => { console.warn('[META-ADS] Image upload warning:', e.message); return null; });
                        
                        if (imgUploadRes?.data?.images) {
                            const firstKey = Object.keys(imgUploadRes.data.images)[0];
                            imageHash = imgUploadRes.data.images[firstKey]?.hash;
                        }
                    }
                } else if (imageUrl && imageUrl.startsWith('http')) {
                    const qs = require('querystring');
                    const imgUploadRes = await axios.post(
                        `https://graph.facebook.com/v22.0/${fbAdAccountId}/adimages`,
                        qs.stringify({ url: imageUrl, access_token: token }),
                        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
                    ).catch(e => { console.warn('[META-ADS] External image upload warning:', e.message); return null; });
                    
                    if (imgUploadRes?.data?.images) {
                        const firstKey = Object.keys(imgUploadRes.data.images)[0];
                        imageHash = imgUploadRes.data.images[firstKey]?.hash;
                    }
                }

                const primaryText  = creatives?.primary_text || '';
                const headline     = creatives?.headline     || '';

                let waPhoneNumber = user.metaDisplayPhoneNumber || null;
                if (!waPhoneNumber) {
                    try {
                        const Settings = require('../models/Settings');
                        const settings = await Settings.findOne({ where: { userId: user.id } });
                        if (settings?.metaPhoneNumberId) {
                            const phoneRes = await axios.get(`https://graph.facebook.com/v22.0/${settings.metaPhoneNumberId}`, {
                                params: { fields: 'display_phone_number', access_token: settings.metaAccessToken },
                                timeout: 5000
                            }).catch(() => null);
                            waPhoneNumber = phoneRes?.data?.display_phone_number || null;
                        }
                    } catch (e) {}
                }
                const waPhoneClean = waPhoneNumber ? waPhoneNumber.replace(/[\s\-().]/g, '') : null;
                
                const icebreakerText = automation?.icebreaker || null;
                const hasPageWabaLink = !!(user.metaPageId && (user.wabaId || user.metaPhoneNumberId));

                const ctaValue = {};
                if (waPhoneClean) ctaValue.whatsapp_number = waPhoneClean;

                if (hasPageWabaLink && icebreakerText) {
                    ctaValue.app_destination = 'WHATSAPP';
                    ctaValue.page_welcome_message = JSON.stringify({
                        type: 'VISUAL_TEMPLATE_FORMATTER',
                        message: { text: icebreakerText }
                    });
                }

                const linkData = {
                    message: primaryText,
                    name:    headline,
                    link:    `https://www.facebook.com/${pageId}`,
                    call_to_action: { type: 'WHATSAPP_MESSAGE', value: ctaValue }
                };

                if (imageHash) {
                    linkData.image_hash = imageHash;
                } else if (imageUrl && imageUrl.startsWith('http')) {
                    linkData.picture = imageUrl;
                } else {
                    const PLACEHOLDER_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';
                    const qs = require('querystring');
                    const phRes = await axios.post(
                        `https://graph.facebook.com/v22.0/${fbAdAccountId}/adimages`,
                        qs.stringify({ bytes: PLACEHOLDER_B64, access_token: token }),
                        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
                    ).catch(e => null);
                    if (phRes?.data?.images) {
                        const firstKey = Object.keys(phRes.data.images)[0];
                        imageHash = phRes.data.images[firstKey]?.hash;
                        if (imageHash) linkData.image_hash = imageHash;
                    }
                }

                const objectStorySpec = JSON.stringify({
                    page_id:   pageId,
                    link_data: linkData
                });

                const qsCreative = require('querystring');
                const creativeBody = qsCreative.stringify({
                    name:              `${campaignName} - Creative`,
                    object_story_spec: objectStorySpec,
                    access_token:      token
                });

                let creativeErrMsg = null;
                const creativeRes = await axios.post(
                    `https://graph.facebook.com/v22.0/${fbAdAccountId}/adcreatives`,
                    creativeBody,
                    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
                ).catch(e => {
                    creativeErrMsg = e.response?.data?.error?.message || e.message;
                    return null;
                });

                const creativeId = creativeRes?.data?.id;

                // 4. Create Ad
                let adErrMsg = null;
                if (creativeId) {
                    const adRes = await axios.post(
                        `https://graph.facebook.com/v22.0/${fbAdAccountId}/ads`,
                        null,
                        {
                            params: {
                                name:      `${campaignName} - Ad`,
                                adset_id:  adSetId,
                                creative:  JSON.stringify({ creative_id: creativeId }),
                                status:    'ACTIVE',
                                access_token: token
                            }
                        }
                    ).catch(e => {
                        adErrMsg = e.response?.data?.error?.message || e.message;
                        return null;
                    });
                    
                    if (adRes?.data?.id) {
                        adId = adRes.data.id;
                    }
                }

                if (creativeErrMsg || adErrMsg) {
                    fbStatus = 'Error';
                    reqWarning = creativeErrMsg || adErrMsg;
                }
            } catch (creativeErr) {
                reqWarning = creativeErr.response?.data?.error?.message || creativeErr.message;
                fbStatus = 'Error';
            }
        }

        return {
            status: fbStatus,
            campaignId: campRes?.data?.id || null,
            adSetId: adSetRes?.data?.id || null,
            adId: adId,
            warning: reqWarning,
            errorMsg: null
        };

    } catch (graphAPIError) {
        let errorMsg = graphAPIError.message;
        
        // P1 FIX: Token expiry handling
        const errObj = graphAPIError.response?.data?.error;
        if (errObj) {
            errorMsg = errObj.message;
            if (errObj.code === 190) {
                errorMsg = 'Your Meta Ads connection has expired. Please go to Settings → Meta Ads and reconnect your account.';
            }
        }
        
        return {
            status: 'Error',
            campaignId: null,
            adSetId: null,
            adId: null,
            warning: null,
            errorMsg
        };
    }
}

module.exports = {
    publishCampaignToMeta
};
