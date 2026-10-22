/**
 * MEDIOVA Supported Locations & Country Calling Codes
 */

const COUNTRY_CALLING_CODES = [
  { code: '+234', country: 'Nigeria', flag: '🇳🇬', default: true },
  { code: '+233', country: 'Ghana', flag: '🇬🇭' },
  { code: '+254', country: 'Kenya', flag: '🇰🇪' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '+1', country: 'United States / Canada', flag: '🇺🇸' },
  { code: '+971', country: 'United Arab Emirates', flag: '🇦🇪' },
];

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT Abuja', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara'
];

const STATE_LGAS = {
  'Lagos': [
    'Agege', 'Ajeromi-Ifelodun', 'Alimosho', 'Amuwo-Odofin', 'Apapa', 'Badagry',
    'Epe', 'Eti-Osa (Ikoyi/Victoria Island/Lekki)', 'Ibeju-Lekki', 'Ifako-Ijaiye',
    'Ikeja (Alausa/GRA)', 'Ikorodu', 'Kosofe', 'Lagos Island', 'Lagos Mainland (Yaba/Ebute-Metta)',
    'Mushin', 'Ojo', 'Oshodi-Isolo', 'Shomolu', 'Surulere'
  ],
  'FCT Abuja': [
    'Abuja Municipal (AMAC - Central/Maitama/Wuse/Garki/Asokoro)',
    'Bwari', 'Gwagwalada', 'Kuje', 'Kwali', 'Abaji'
  ],
  'Rivers': [
    'Port Harcourt City', 'Obio-Akpor', 'Eleme', 'Ikwerre', 'Oyigbo',
    'Okrika', 'Degema', 'Bonny', 'Ahoada East', 'Khana', 'Gokana'
  ],
  'Oyo': [
    'Ibadan North', 'Ibadan North-East', 'Ibadan North-West', 'Ibadan South-East',
    'Ibadan South-West', 'Akinyele', 'Egbeda', 'Oluyole', 'Ogbomosho North', 'Oyo East'
  ],
  'Kano': [
    'Kano Municipal', 'Fagge', 'Dala', 'Gwale', 'Tarauni', 'Nassarawa', 'Kumbotso', 'Ungogo'
  ],
  'Anambra': [
    'Awka South', 'Awka North', 'Onitsha North', 'Onitsha South', 'Nnewi North', 'Idemili North', 'Aguata'
  ],
  'Delta': [
    'Warri South', 'Warri North', 'Oshimili South (Asaba)', 'Uvwie (Effurun)', 'Sapele', 'Ughelli North'
  ],
  'Edo': [
    'Oredo (Benin City)', 'Ikpoba-Okha', 'Egor', 'Uhunmwonde', 'Ovia North-East', 'Esan West (Ekpoma)'
  ],
  'Enugu': [
    'Enugu North', 'Enugu South', 'Enugu East', 'Nsukka', 'Udi', 'Nkanu West'
  ],
  'Kaduna': [
    'Kaduna North', 'Kaduna South', 'Chikun', 'Igabi', 'Zaria', 'Sabon Gari'
  ],
  'Ogun': [
    'Abeokuta South', 'Abeokuta North', 'Ado-Odo/Ota', 'Sagamu', 'Ijebu Ode', 'Obafemi Owode', 'Ifo'
  ],
};

/**
 * Normalizes phone numbers to standard international E.164 format
 * @param {string} phone 
 * @param {string} defaultCallingCode 
 * @returns {string} E.164 formatted phone number
 */
const normalizePhoneNumber = (phone, defaultCallingCode = '+234') => {
  if (!phone) return '';
  const cleaned = phone.replace(/[^0-9+]/g, '').trim();
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  const cleanCode = defaultCallingCode.startsWith('+') ? defaultCallingCode : `+${defaultCallingCode}`;
  if (cleaned.startsWith('0')) {
    return `${cleanCode}${cleaned.slice(1)}`;
  }
  return `${cleanCode}${cleaned}`;
};

/**
 * Validates international phone format
 * @param {string} phone 
 * @returns {boolean}
 */
const isValidPhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  const digitsOnly = phone.replace(/[^0-9]/g, '');
  if (digitsOnly.length < 8 || digitsOnly.length > 15) return false;
  const normalized = normalizePhoneNumber(phone);
  // E.164 format: + followed by 8 to 15 digits
  return /^\+[1-9]\d{7,14}$/.test(normalized);
};

/**
 * Checks if a state is a valid Nigerian state
 * @param {string} state
 * @returns {boolean}
 */
const isValidState = (state) => {
  if (!state) return false;
  const normalized = state.toLowerCase().trim();
  return NIGERIAN_STATES.some(
    (s) => s.toLowerCase() === normalized || (normalized.includes('abuja') && s.includes('Abuja'))
  );
};

/**
 * Gets LGAs for a state
 * @param {string} state
 * @returns {string[]}
 */
const getLgasForState = (state) => {
  if (!state) return [];
  const foundKey = Object.keys(STATE_LGAS).find(
    (k) => k.toLowerCase() === state.toLowerCase() || (state.toLowerCase().includes('abuja') && k.includes('Abuja'))
  );
  return foundKey ? STATE_LGAS[foundKey] : [];
};

module.exports = {
  COUNTRY_CALLING_CODES,
  NIGERIAN_STATES,
  STATE_LGAS,
  normalizePhoneNumber,
  isValidPhoneNumber,
  isValidState,
  getLgasForState,
};
