// VCard Theme Router
// Each theme is a separate component for easy management/update/delete

import CorporateVcard from './CorporateVcard';
import CreativeVcard from './CreativeVcard';
import TechVcard from './TechVcard';
import HealthVcard from './HealthVcard';
import LocalBusinessVcard from './LocalBusinessVcard';
import BeautyVcard from './BeautyVcard';

export const THEME_COMPONENTS = {
    'corporate-executive': CorporateVcard,
    'creative-portfolio': CreativeVcard,
    'tech-startup': TechVcard,
    'health-wellness': HealthVcard,
    'local-business': LocalBusinessVcard,
    'beauty-salon': BeautyVcard,
};

export function getThemeComponent(themeId) {
    return THEME_COMPONENTS[themeId] || CorporateVcard;
}

export {
    CorporateVcard,
    CreativeVcard,
    TechVcard,
    HealthVcard,
    LocalBusinessVcard,
    BeautyVcard,
};
