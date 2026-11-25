// Store navigation links for categories:
//   category     "/?cat=Clothing"
//   subcategory  "/?cat=Clothing&sub=T-Shirts"
// Names are stored as typed (not URL-encoded), so older category links keep working.
// That is why we split on "&sub=" instead of parsing the query string: names may contain "&" or "=".
const PREFIX = '/?cat=';
const SUB = '&sub=';

export const isCategoryLink = (link) => typeof link === 'string' && link.startsWith(PREFIX);

export function parseCategoryLink(link) {
    if (!isCategoryLink(link)) return { category: '', sub: '' };
    const rest = link.slice(PREFIX.length);
    const i = rest.lastIndexOf(SUB);
    return i === -1
        ? { category: rest, sub: '' }
        : { category: rest.slice(0, i), sub: rest.slice(i + SUB.length) };
}

export const buildCategoryLink = (category, sub = '') => `${PREFIX}${category}${sub ? `${SUB}${sub}` : ''}`;

// Storefront path for a category link, to pass to getStoreRoute()
export function categoryLinkPath(link) {
    const { category, sub } = parseCategoryLink(link);
    return `/category/${encodeURIComponent(category)}${sub ? `?sub=${encodeURIComponent(sub)}` : ''}`;
}
