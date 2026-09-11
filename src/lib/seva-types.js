'use strict';

/**
 * The seva (sponsorship) list a mandal starts with — the daily prasad, thal
 * and nasto slots plus the one-off sponsorships. Seeded on first run; the
 * mandal can rename, reorder, deactivate or add to this list afterwards.
 *
 * is_daily: 1 = a sponsor is needed on every day of the Mahotsav
 *           0 = sponsored once for the whole Mahotsav
 */
const DEFAULT_SEVA_TYPES = [
  {
    icon: '☕', is_daily: 1,
    gu: 'સવારે ચા અને નાસ્તો દાતા',
    en: 'Morning Tea & Breakfast Donor',
    hi: 'सुबह चाय एवं नाश्ता दाता',
    mr: 'सकाळी चहा व नाश्ता दाता',
  },
  {
    icon: '🍬', is_daily: 1,
    gu: 'સવારે પ્રસાદ દાતા',
    en: 'Morning Prasad Donor',
    hi: 'सुबह प्रसाद दाता',
    mr: 'सकाळी प्रसाद दाता',
  },
  {
    icon: '🍛', is_daily: 1,
    gu: 'બપોરે થાળ દાતા',
    en: 'Afternoon Thal Donor',
    hi: 'दोपहर थाल दाता',
    mr: 'दुपारी थाळ दाता',
  },
  {
    icon: '🍎', is_daily: 1,
    gu: 'સાંજ ૪ વાગ્યે ફુટ દાતા',
    en: 'Evening 4 PM Fruit Donor',
    hi: 'शाम 4 बजे फल दाता',
    mr: 'संध्याकाळी ४ वाजता फळ दाता',
  },
  {
    icon: '🍬', is_daily: 1,
    gu: 'સાંજે પ્રસાદ દાતા',
    en: 'Evening Prasad Donor',
    hi: 'शाम प्रसाद दाता',
    mr: 'संध्याकाळी प्रसाद दाता',
  },
  {
    icon: '🍛', is_daily: 1,
    gu: 'સાંજે થાળ દાતા',
    en: 'Evening Thal Donor',
    hi: 'शाम थाल दाता',
    mr: 'संध्याकाळी थाळ दाता',
  },
  {
    icon: '🍿', is_daily: 1,
    gu: 'રાત્રે નાસ્તાના દાતા',
    en: 'Night Snacks Donor',
    hi: 'रात्रि नाश्ता दाता',
    mr: 'रात्री नाश्ता दाता',
  },
  {
    icon: '☕', is_daily: 1,
    gu: 'ચા ના દાતા',
    en: 'Tea Donor',
    hi: 'चाय दाता',
    mr: 'चहा दाता',
  },
  {
    icon: '🎉', is_daily: 0,
    gu: 'પ્રથમ દિવસે જમણવારના દાતા',
    en: 'First Day Jamanvar (Feast) Donor',
    hi: 'प्रथम दिन भोजन (जमणवार) दाता',
    mr: 'पहिल्या दिवशी भोजन दाता',
  },
  {
    icon: '🎊', is_daily: 0,
    gu: 'છેલ્લા દિવસે જમણવારના દાતા',
    en: 'Last Day Jamanvar (Feast) Donor',
    hi: 'अंतिम दिन भोजन (जमणवार) दाता',
    mr: 'शेवटच्या दिवशी भोजन दाता',
  },
  {
    icon: '🕉', is_daily: 0,
    gu: 'મૂર્તિના દાતા',
    en: 'Murti (Idol) Donor',
    hi: 'मूर्ति दाता',
    mr: 'मूर्ती दाता',
  },
  {
    icon: '💧', is_daily: 0,
    gu: 'પાણીના દાતા',
    en: 'Water Donor',
    hi: 'जल (पानी) दाता',
    mr: 'पाणी दाता',
  },
  {
    icon: '🔴', is_daily: 0,
    gu: 'ગુલાલ ના દાતા',
    en: 'Gulal Donor',
    hi: 'गुलाल दाता',
    mr: 'गुलाल दाता',
  },
  {
    icon: '🚩', is_daily: 0,
    gu: 'પ્રથમ દિવસે શોભાયાત્રા પ્રસાદના દાતા',
    en: 'First Day Shobhayatra Prasad Donor',
    hi: 'प्रथम दिन शोभायात्रा प्रसाद दाता',
    mr: 'पहिल्या दिवशी शोभायात्रा प्रसाद दाता',
  },
  {
    icon: '🚩', is_daily: 0,
    gu: 'છેલ્લા દિવસે શોભાયાત્રા પ્રસાદના દાતા',
    en: 'Last Day Shobhayatra Prasad Donor',
    hi: 'अंतिम दिन शोभायात्रा प्रसाद दाता',
    mr: 'शेवटच्या दिवशी शोभायात्रा प्रसाद दाता',
  },
];

/** Label for a seva type in the given language, falling back to `name`. */
function sevaTypeName(type, lang) {
  if (!type) return '';
  return type[`name_${lang}`] || type.name || '';
}

module.exports = { DEFAULT_SEVA_TYPES, sevaTypeName };
