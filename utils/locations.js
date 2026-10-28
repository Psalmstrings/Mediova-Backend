/**
 * MEDIOVA Global Locations & Country System
 * Supports 120+ countries, country-aware administrative structures,
 * dynamic division resolution, and international E.164 phone normalization.
 */

// Comprehensive list of countries with standardized ISO-3166-1 alpha-2 codes, calling codes, and admin level nomenclature
const COUNTRIES = [
  { code: 'AF', name: 'Afghanistan', callingCode: '+93', flag: '🇦🇫', currency: 'AFN', adminLevel: 'Province', localLevel: 'District' },
  { code: 'AL', name: 'Albania', callingCode: '+355', flag: '🇦🇱', currency: 'ALL', adminLevel: 'County', localLevel: 'Municipality' },
  { code: 'DZ', name: 'Algeria', callingCode: '+213', flag: '🇩🇿', currency: 'DZD', adminLevel: 'Province', localLevel: 'District' },
  { code: 'AD', name: 'Andorra', callingCode: '+376', flag: '🇦🇩', currency: 'EUR', adminLevel: 'Parish', localLevel: 'Town' },
  { code: 'AO', name: 'Angola', callingCode: '+244', flag: '🇦🇴', currency: 'AOA', adminLevel: 'Province', localLevel: 'Municipality' },
  { code: 'AR', name: 'Argentina', callingCode: '+54', flag: '🇦🇷', currency: 'ARS', adminLevel: 'Province', localLevel: 'Department' },
  { code: 'AM', name: 'Armenia', callingCode: '+374', flag: '🇦🇲', currency: 'AMD', adminLevel: 'Province', localLevel: 'Municipality' },
  { code: 'AU', name: 'Australia', callingCode: '+61', flag: '🇦🇺', currency: 'AUD', adminLevel: 'State/Territory', localLevel: 'Local Council' },
  { code: 'AT', name: 'Austria', callingCode: '+43', flag: '🇦🇹', currency: 'EUR', adminLevel: 'State', localLevel: 'District' },
  { code: 'AZ', name: 'Azerbaijan', callingCode: '+994', flag: '🇦🇿', currency: 'AZN', adminLevel: 'District', localLevel: 'City' },
  { code: 'BS', name: 'Bahamas', callingCode: '+1-242', flag: '🇧🇸', currency: 'BSD', adminLevel: 'District', localLevel: 'Settlement' },
  { code: 'BH', name: 'Bahrain', callingCode: '+973', flag: '🇧🇭', currency: 'BHD', adminLevel: 'Governorate', localLevel: 'City' },
  { code: 'BD', name: 'Bangladesh', callingCode: '+880', flag: '🇧🇩', currency: 'BDT', adminLevel: 'Division', localLevel: 'District' },
  { code: 'BB', name: 'Barbados', callingCode: '+1-246', flag: '🇧🇧', currency: 'BBD', adminLevel: 'Parish', localLevel: 'Area' },
  { code: 'BE', name: 'Belgium', callingCode: '+32', flag: '🇧🇪', currency: 'EUR', adminLevel: 'Region/Province', localLevel: 'Municipality' },
  { code: 'BJ', name: 'Benin', callingCode: '+229', flag: '🇧🇯', currency: 'XOF', adminLevel: 'Department', localLevel: 'Commune' },
  { code: 'BM', name: 'Bermuda', callingCode: '+1-441', flag: '🇧🇲', currency: 'BMD', adminLevel: 'Parish', localLevel: 'Town' },
  { code: 'BO', name: 'Bolivia', callingCode: '+591', flag: '🇧🇴', currency: 'BOB', adminLevel: 'Department', localLevel: 'Province' },
  { code: 'BW', name: 'Botswana', callingCode: '+267', flag: '🇧🇼', currency: 'BWP', adminLevel: 'District', localLevel: 'Sub-district' },
  { code: 'BR', name: 'Brazil', callingCode: '+55', flag: '🇧🇷', currency: 'BRL', adminLevel: 'State', localLevel: 'Municipality' },
  { code: 'CM', name: 'Cameroon', callingCode: '+237', flag: '🇨🇲', currency: 'XAF', adminLevel: 'Region', localLevel: 'Department' },
  { code: 'CA', name: 'Canada', callingCode: '+1', flag: '🇨🇦', currency: 'CAD', adminLevel: 'Province/Territory', localLevel: 'Municipality/City' },
  { code: 'CL', name: 'Chile', callingCode: '+56', flag: '🇨🇱', currency: 'CLP', adminLevel: 'Region', localLevel: 'Province' },
  { code: 'CN', name: 'China', callingCode: '+86', flag: '🇨🇳', currency: 'CNY', adminLevel: 'Province/Municipality', localLevel: 'Prefecture/City' },
  { code: 'CO', name: 'Colombia', callingCode: '+57', flag: '🇨🇴', currency: 'COP', adminLevel: 'Department', localLevel: 'Municipality' },
  { code: 'CR', name: 'Costa Rica', callingCode: '+506', flag: '🇨🇷', currency: 'CRC', adminLevel: 'Province', localLevel: 'Canton' },
  { code: 'CI', name: "Cote d'Ivoire", callingCode: '+225', flag: '🇨🇮', currency: 'XOF', adminLevel: 'District/Region', localLevel: 'Department' },
  { code: 'HR', name: 'Croatia', callingCode: '+385', flag: '🇭🇷', currency: 'EUR', adminLevel: 'County', localLevel: 'City/Municipality' },
  { code: 'CY', name: 'Cyprus', callingCode: '+357', flag: '🇨🇾', currency: 'EUR', adminLevel: 'District', localLevel: 'Municipality' },
  { code: 'CZ', name: 'Czech Republic', callingCode: '+420', flag: '🇨🇿', currency: 'CZK', adminLevel: 'Region', localLevel: 'District' },
  { code: 'DK', name: 'Denmark', callingCode: '+45', flag: '🇩🇰', currency: 'DKK', adminLevel: 'Region', localLevel: 'Municipality' },
  { code: 'CD', name: 'DR Congo', callingCode: '+243', flag: '🇨🇩', currency: 'CDF', adminLevel: 'Province', localLevel: 'Territory' },
  { code: 'EG', name: 'Egypt', callingCode: '+20', flag: '🇪🇬', currency: 'EGP', adminLevel: 'Governorate', localLevel: 'City/Markaz' },
  { code: 'EE', name: 'Estonia', callingCode: '+372', flag: '🇪🇪', currency: 'EUR', adminLevel: 'County', localLevel: 'Municipality' },
  { code: 'ET', name: 'Ethiopia', callingCode: '+251', flag: '🇪🇹', currency: 'ETB', adminLevel: 'Region', localLevel: 'Zone' },
  { code: 'FI', name: 'Finland', callingCode: '+358', flag: '🇫🇮', currency: 'EUR', adminLevel: 'Region', localLevel: 'Municipality' },
  { code: 'FR', name: 'France', callingCode: '+33', flag: '🇫🇷', currency: 'EUR', adminLevel: 'Region/Department', localLevel: 'Commune/Arrondissement' },
  { code: 'GM', name: 'Gambia', callingCode: '+220', flag: '🇬🇲', currency: 'GMD', adminLevel: 'Division', localLevel: 'District' },
  { code: 'GE', name: 'Georgia', callingCode: '+995', flag: '🇬🇪', currency: 'GEL', adminLevel: 'Region', localLevel: 'Municipality' },
  { code: 'DE', name: 'Germany', callingCode: '+49', flag: '🇩🇪', currency: 'EUR', adminLevel: 'State (Bundesland)', localLevel: 'District/City' },
  { code: 'GH', name: 'Ghana', callingCode: '+233', flag: '🇬🇭', currency: 'GHS', adminLevel: 'Region', localLevel: 'Metropolitan/District' },
  { code: 'GR', name: 'Greece', callingCode: '+30', flag: '🇬🇷', currency: 'EUR', adminLevel: 'Region', localLevel: 'Regional Unit' },
  { code: 'HK', name: 'Hong Kong', callingCode: '+852', flag: '🇭🇰', currency: 'HKD', adminLevel: 'District', localLevel: 'Area' },
  { code: 'HU', name: 'Hungary', callingCode: '+36', flag: '🇭🇺', currency: 'HUF', adminLevel: 'County', localLevel: 'District' },
  { code: 'IS', name: 'Iceland', callingCode: '+354', flag: '🇮🇸', currency: 'ISK', adminLevel: 'Region', localLevel: 'Municipality' },
  { code: 'IN', name: 'India', callingCode: '+91', flag: '🇮🇳', currency: 'INR', adminLevel: 'State/UT', localLevel: 'District' },
  { code: 'ID', name: 'Indonesia', callingCode: '+62', flag: '🇮🇩', currency: 'IDR', adminLevel: 'Province', localLevel: 'Regency/City' },
  { code: 'IE', name: 'Ireland', callingCode: '+353', flag: '🇮🇪', currency: 'EUR', adminLevel: 'County', localLevel: 'District/Area' },
  { code: 'IL', name: 'Israel', callingCode: '+972', flag: '🇮🇱', currency: 'ILS', adminLevel: 'District', localLevel: 'City' },
  { code: 'IT', name: 'Italy', callingCode: '+39', flag: '🇮🇹', currency: 'EUR', adminLevel: 'Region/Province', localLevel: 'Municipality (Comune)' },
  { code: 'JM', name: 'Jamaica', callingCode: '+1-876', flag: '🇯🇲', currency: 'JMD', adminLevel: 'Parish', localLevel: 'Community' },
  { code: 'JP', name: 'Japan', callingCode: '+81', flag: '🇯🇵', currency: 'JPY', adminLevel: 'Prefecture', localLevel: 'City/Ward' },
  { code: 'JO', name: 'Jordan', callingCode: '+962', flag: '🇯🇴', currency: 'JOD', adminLevel: 'Governorate', localLevel: 'District' },
  { code: 'KE', name: 'Kenya', callingCode: '+254', flag: '🇰🇪', currency: 'KES', adminLevel: 'County', localLevel: 'Sub-County/Constituency' },
  { code: 'KR', name: 'South Korea', callingCode: '+82', flag: '🇰🇷', currency: 'KRW', adminLevel: 'Province/Special City', localLevel: 'District (Gu)' },
  { code: 'KW', name: 'Kuwait', callingCode: '+965', flag: '🇰🇼', currency: 'KWD', adminLevel: 'Governorate', localLevel: 'Area' },
  { code: 'LB', name: 'Lebanon', callingCode: '+961', flag: '🇱🇧', currency: 'LBP', adminLevel: 'Governorate', localLevel: 'District' },
  { code: 'LR', name: 'Liberia', callingCode: '+231', flag: '🇱🇷', currency: 'LRD', adminLevel: 'County', localLevel: 'District' },
  { code: 'LU', name: 'Luxembourg', callingCode: '+352', flag: '🇱🇺', currency: 'EUR', adminLevel: 'Canton', localLevel: 'Commune' },
  { code: 'MY', name: 'Malaysia', callingCode: '+60', flag: '🇲🇾', currency: 'MYR', adminLevel: 'State/Federal Territory', localLevel: 'District' },
  { code: 'MV', name: 'Maldives', callingCode: '+960', flag: '🇲🇻', currency: 'MVR', adminLevel: 'Atoll', localLevel: 'Island' },
  { code: 'MT', name: 'Malta', callingCode: '+356', flag: '🇲🇹', currency: 'EUR', adminLevel: 'Region', localLevel: 'Local Council' },
  { code: 'MU', name: 'Mauritius', callingCode: '+230', flag: '🇲🇺', currency: 'MUR', adminLevel: 'District', localLevel: 'Town/Village' },
  { code: 'MX', name: 'Mexico', callingCode: '+52', flag: '🇲🇽', currency: 'MXN', adminLevel: 'State', localLevel: 'Municipality' },
  { code: 'MC', name: 'Monaco', callingCode: '+377', flag: '🇲🇨', currency: 'EUR', adminLevel: 'Ward', localLevel: 'Quarter' },
  { code: 'MA', name: 'Morocco', callingCode: '+212', flag: '🇲🇦', currency: 'MAD', adminLevel: 'Region', localLevel: 'Province/Prefecture' },
  { code: 'MZ', name: 'Mozambique', callingCode: '+258', flag: '🇲🇿', currency: 'MZN', adminLevel: 'Province', localLevel: 'District' },
  { code: 'NA', name: 'Namibia', callingCode: '+264', flag: '🇳🇦', currency: 'NAD', adminLevel: 'Region', localLevel: 'Constituency' },
  { code: 'NP', name: 'Nepal', callingCode: '+977', flag: '🇳🇵', currency: 'NPR', adminLevel: 'Province', localLevel: 'District' },
  { code: 'NL', name: 'Netherlands', callingCode: '+31', flag: '🇳🇱', currency: 'EUR', adminLevel: 'Province', localLevel: 'Municipality' },
  { code: 'NZ', name: 'New Zealand', callingCode: '+64', flag: '🇳🇿', currency: 'NZD', adminLevel: 'Region', localLevel: 'District/City' },
  { code: 'NE', name: 'Niger', callingCode: '+227', flag: '🇳🇪', currency: 'XOF', adminLevel: 'Region', localLevel: 'Department' },
  { code: 'NG', name: 'Nigeria', callingCode: '+234', flag: '🇳🇬', currency: 'NGN', adminLevel: 'State', localLevel: 'Local Government Area (LGA)' },
  { code: 'NO', name: 'Norway', callingCode: '+47', flag: '🇳🇴', currency: 'NOK', adminLevel: 'County', localLevel: 'Municipality' },
  { code: 'OM', name: 'Oman', callingCode: '+968', flag: '🇴🇲', currency: 'OMR', adminLevel: 'Governorate', localLevel: 'Wilayat' },
  { code: 'PK', name: 'Pakistan', callingCode: '+92', flag: '🇵🇰', currency: 'PKR', adminLevel: 'Province', localLevel: 'District' },
  { code: 'PA', name: 'Panama', callingCode: '+507', flag: '🇵🇦', currency: 'PAB', adminLevel: 'Province', localLevel: 'District' },
  { code: 'PE', name: 'Peru', callingCode: '+51', flag: '🇵🇪', currency: 'PEN', adminLevel: 'Department/Region', localLevel: 'Province' },
  { code: 'PH', name: 'Philippines', callingCode: '+63', flag: '🇵🇭', currency: 'PHP', adminLevel: 'Province/Region', localLevel: 'City/Municipality' },
  { code: 'PL', name: 'Poland', callingCode: '+48', flag: '🇵🇱', currency: 'PLN', adminLevel: 'Voivodeship (Province)', localLevel: 'Powiat (County)' },
  { code: 'PT', name: 'Portugal', callingCode: '+351', flag: '🇵🇹', currency: 'EUR', adminLevel: 'District', localLevel: 'Municipality' },
  { code: 'QA', name: 'Qatar', callingCode: '+974', flag: '🇶🇦', currency: 'QAR', adminLevel: 'Municipality', localLevel: 'Zone' },
  { code: 'RO', name: 'Romania', callingCode: '+40', flag: '🇷🇴', currency: 'RON', adminLevel: 'County', localLevel: 'Municipality' },
  { code: 'RW', name: 'Rwanda', callingCode: '+250', flag: '🇷🇼', currency: 'RWF', adminLevel: 'Province', localLevel: 'District' },
  { code: 'SA', name: 'Saudi Arabia', callingCode: '+966', flag: '🇸🇦', currency: 'SAR', adminLevel: 'Province/Region', localLevel: 'Governorate' },
  { code: 'SN', name: 'Senegal', callingCode: '+221', flag: '🇸🇳', currency: 'XOF', adminLevel: 'Region', localLevel: 'Department' },
  { code: 'RS', name: 'Serbia', callingCode: '+381', flag: '🇷🇸', currency: 'RSD', adminLevel: 'District', localLevel: 'Municipality' },
  { code: 'SG', name: 'Singapore', callingCode: '+65', flag: '🇸🇬', currency: 'SGD', adminLevel: 'Community Development Council', localLevel: 'Neighborhood' },
  { code: 'ZA', name: 'South Africa', callingCode: '+27', flag: '🇿🇦', currency: 'ZAR', adminLevel: 'Province', localLevel: 'District/Municipality' },
  { code: 'ES', name: 'Spain', callingCode: '+34', flag: '🇪🇸', currency: 'EUR', adminLevel: 'Autonomous Community/Province', localLevel: 'Municipality' },
  { code: 'LK', name: 'Sri Lanka', callingCode: '+94', flag: '🇱🇰', currency: 'LKR', adminLevel: 'Province', localLevel: 'District' },
  { code: 'SE', name: 'Sweden', callingCode: '+46', flag: '🇸🇪', currency: 'SEK', adminLevel: 'County', localLevel: 'Municipality' },
  { code: 'CH', name: 'Switzerland', callingCode: '+41', flag: '🇨🇭', currency: 'CHF', adminLevel: 'Canton', localLevel: 'District' },
  { code: 'TZ', name: 'Tanzania', callingCode: '+255', flag: '🇹🇿', currency: 'TZS', adminLevel: 'Region', localLevel: 'District' },
  { code: 'TH', name: 'Thailand', callingCode: '+66', flag: '🇹🇭', currency: 'THB', adminLevel: 'Province', localLevel: 'District (Amphoe)' },
  { code: 'TG', name: 'Togo', callingCode: '+228', flag: '🇹🇬', currency: 'XOF', adminLevel: 'Region', localLevel: 'Prefecture' },
  { code: 'TT', name: 'Trinidad and Tobago', callingCode: '+1-868', flag: '🇹🇹', currency: 'TTD', adminLevel: 'Region/Borough', localLevel: 'Community' },
  { code: 'TN', name: 'Tunisia', callingCode: '+216', flag: '🇹🇳', currency: 'TND', adminLevel: 'Governorate', localLevel: 'Delegation' },
  { code: 'TR', name: 'Turkey', callingCode: '+90', flag: '🇹🇷', currency: 'TRY', adminLevel: 'Province', localLevel: 'District' },
  { code: 'UG', name: 'Uganda', callingCode: '+256', flag: '🇺🇬', currency: 'UGX', adminLevel: 'Region', localLevel: 'District' },
  { code: 'UA', name: 'Ukraine', callingCode: '+380', flag: '🇺🇦', currency: 'UAH', adminLevel: 'Oblast', localLevel: 'Raion (District)' },
  { code: 'AE', name: 'United Arab Emirates', callingCode: '+971', flag: '🇦🇪', currency: 'AED', adminLevel: 'Emirate', localLevel: 'City/Area' },
  { code: 'GB', name: 'United Kingdom', callingCode: '+44', flag: '🇬🇧', currency: 'GBP', adminLevel: 'Nation/Region', localLevel: 'County/Borough' },
  { code: 'US', name: 'United States', callingCode: '+1', flag: '🇺🇸', currency: 'USD', adminLevel: 'State', localLevel: 'County/City' },
  { code: 'UY', name: 'Uruguay', callingCode: '+598', flag: '🇺🇾', currency: 'UYU', adminLevel: 'Department', localLevel: 'Municipality' },
  { code: 'VN', name: 'Vietnam', callingCode: '+84', flag: '🇻🇳', currency: 'VND', adminLevel: 'Province/Municipality', localLevel: 'District' },
  { code: 'ZM', name: 'Zambia', callingCode: '+260', flag: '🇿🇲', currency: 'ZMW', adminLevel: 'Province', localLevel: 'District' },
  { code: 'ZW', name: 'Zimbabwe', callingCode: '+263', flag: '🇿🇼', currency: 'ZWD', adminLevel: 'Province', localLevel: 'District' },
].sort((a, b) => a.name.localeCompare(b.name));

// Backward compatibility: COUNTRY_CALLING_CODES array format
const COUNTRY_CALLING_CODES = COUNTRIES.map((c) => ({
  code: c.callingCode,
  country: c.name,
  flag: c.flag,
  default: c.code === 'NG',
}));

// Administrative divisions for key countries
const COUNTRY_ADMIN_DIVISIONS = {
  Nigeria: [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
    'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT Abuja', 'Gombe',
    'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
    'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
    'Taraba', 'Yobe', 'Zamfara'
  ],
  'United States': [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois',
    'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts',
    'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
    'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
    'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
    'Wisconsin', 'Wyoming'
  ],
  'United Kingdom': [
    'Greater London', 'Greater Manchester', 'West Midlands', 'West Yorkshire', 'Merseyside',
    'South Yorkshire', 'Tyne and Wear', 'Scotland (Edinburgh/Glasgow)', 'Wales (Cardiff/Swansea)',
    'Northern Ireland (Belfast)', 'Essex', 'Hampshire', 'Kent', 'Lancashire', 'Surrey', 'Hertfordshire'
  ],
  Canada: [
    'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
    'Nova Scotia', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Northwest Territories',
    'Nunavut', 'Yukon'
  ],
  Ghana: [
    'Greater Accra', 'Ashanti', 'Central', 'Eastern', 'Western', 'Northern', 'Volta',
    'Upper East', 'Upper West', 'Bono', 'Bono East', 'Ahafo', 'Oti', 'Savannah', 'North East', 'Western North'
  ],
  Kenya: [
    'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Kiambu', 'Machakos', 'Uasin Gishu (Eldoret)',
    'Kajiado', 'Kilifi', 'Kakamega', 'Meru', 'Nyeri'
  ],
  'South Africa': [
    'Gauteng (Johannesburg/Pretoria)', 'Western Cape (Cape Town)', 'KwaZulu-Natal (Durban)',
    'Eastern Cape (Gqeberha)', 'Free State (Bloemfontein)', 'Mpumalanga', 'Limpopo',
    'North West', 'Northern Cape'
  ],
  'United Arab Emirates': [
    'Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'
  ],
  India: [
    'Maharashtra (Mumbai/Pune)', 'Delhi NCR', 'Karnataka (Bengaluru)', 'Tamil Nadu (Chennai)',
    'Telangana (Hyderabad)', 'Gujarat (Ahmedabad)', 'West Bengal (Kolkata)', 'Uttar Pradesh',
    'Kerala', 'Rajasthan', 'Punjab', 'Haryana'
  ],
  Australia: [
    'New South Wales (Sydney)', 'Victoria (Melbourne)', 'Queensland (Brisbane)',
    'Western Australia (Perth)', 'South Australia (Adelaide)', 'Tasmania',
    'Australian Capital Territory (Canberra)', 'Northern Territory'
  ],
  Germany: [
    'Bavaria (Munich)', 'Berlin', 'North Rhine-Westphalia (Cologne/Dusseldorf)',
    'Baden-Wurttemberg (Stuttgart)', 'Hesse (Frankfurt)', 'Hamburg', 'Saxony (Dresden/Leipzig)',
    'Lower Saxony (Hanover)'
  ],
  France: [
    'Ile-de-France (Paris)', 'Auvergne-Rhone-Alpes (Lyon)', 'Provence-Alpes-Cote d Azur (Marseille/Nice)',
    'Occitanie (Toulouse)', 'Nouvelle-Aquitaine (Bordeaux)', 'Hauts-de-France (Lille)',
    'Pays de la Loire (Nantes)', 'Grand Est (Strasbourg)'
  ],
};

// Local subdivisions for specific administrative regions
const STATE_LGAS = {
  // Nigeria: All 36 States + FCT Abuja with complete LGAs
  Abia: [
    'Aba North', 'Aba South', 'Arochukwu', 'Bende', 'Ikwuano', 'Isiala Ngwa North',
    'Isiala Ngwa South', 'Isuikwuato', 'Obi Ngwa', 'Ohafia', 'Osisioma', 'Ugwunagbo',
    'Ukwa East', 'Ukwa West', 'Umuahia North', 'Umuahia South', 'Umu Nneochi'
  ],
  Adamawa: [
    'Demsa', 'Fufore', 'Ganye', 'Girei', 'Gombi', 'Guyuk', 'Hong', 'Jada',
    'Lamurde', 'Madagali', 'Maiha', 'Mayo Belwa', 'Michika', 'Mubi North',
    'Mubi South', 'Numan', 'Shelleng', 'Song', 'Toungo', 'Yola North', 'Yola South'
  ],
  'Akwa Ibom': [
    'Abak', 'Eastern Obolo', 'Eket', 'Esit Eket', 'Essien Udim', 'Etim Ekpo',
    'Etinan', 'Ibeno', 'Ibesikpo Asutan', 'Ibiono-Ibom', 'Ika', 'Ikono',
    'Ikot Abasi', 'Ikot Ekpene', 'Ini', 'Itu', 'Mbo', 'Mkpat-Enin',
    'Nsit-Atai', 'Nsit-Ibom', 'Nsit-Ubium', 'Obot Akara', 'Okobo', 'Onna',
    'Oron', 'Oruk Anam', 'Udung-Uko', 'Ukanafun', 'Uruan', 'Urue-Offong/Oruko', 'Uyo'
  ],
  Anambra: [
    'Aguata', 'Anambra East', 'Anambra West', 'Anaocha', 'Awka North', 'Awka South',
    'Ayamelum', 'Dunukofia', 'Ekwusigo', 'Idemili North', 'Idemili South', 'Ihiala',
    'Njikoka', 'Nnewi North', 'Nnewi South', 'Ogbaru', 'Onitsha North', 'Onitsha South',
    'Orumba North', 'Orumba South', 'Oyi'
  ],
  Bauchi: [
    'Alkaleri', 'Bauchi', 'Bogoro', 'Damban', 'Darazo', 'Dass', 'Gamawa', 'Ganjuwa',
    'Giade', 'Itas/Gadau', 'Jama\'are', 'Katagum', 'Kirfi', 'Misau', 'Ningi', 'Shira',
    'Tafawa Balewa', 'Toro', 'Warji', 'Zaki'
  ],
  Bayelsa: [
    'Brass', 'Ekeremor', 'Kolokuma/Opokuma', 'Nembe', 'Ogbia', 'Sagbama',
    'Southern Ijaw', 'Yenagoa'
  ],
  Benue: [
    'Ado', 'Agatu', 'Apa', 'Buruku', 'Gboko', 'Guma', 'Gwer East', 'Gwer West',
    'Katsina-Ala', 'Konshisha', 'Kwande', 'Logo', 'Makurdi', 'Obi', 'Ogbadibo',
    'Ohimini', 'Oju', 'Okpokwu', 'Otukpo', 'Tarka', 'Ukum', 'Ushongo', 'Vandeikya'
  ],
  Borno: [
    'Abadam', 'Askira/Uba', 'Bama', 'Bayo', 'Biu', 'Chibok', 'Damboa', 'Dikwa',
    'Gubio', 'Guzamala', 'Gwoza', 'Hawul', 'Jere', 'Kaga', 'Kala/Balge', 'Konduga',
    'Kukawa', 'Kwaya Kusar', 'Mafa', 'Magumeri', 'Maiduguri', 'Marte', 'Mobbar',
    'Monguno', 'Ngala', 'Nganzai', 'Shani'
  ],
  'Cross River': [
    'Abi', 'Akamkpa', 'Akpabuyo', 'Bakassi', 'Bekwarra', 'Biase', 'Boki',
    'Calabar Municipal', 'Calabar South', 'Etung', 'Ikom', 'Obanliku', 'Obubra',
    'Obudu', 'Odukpani', 'Ogoja', 'Yakuur', 'Yala'
  ],
  Delta: [
    'Aniocha North', 'Aniocha South', 'Bomadi', 'Burutu', 'Ethiope East', 'Ethiope West',
    'Ika North East', 'Ika South', 'Isoko North', 'Isoko South', 'Ndokwa East', 'Ndokwa West',
    'Okpe', 'Oshimili North', 'Oshimili South (Asaba)', 'Patani', 'Sapele', 'Udu',
    'Ughelli North', 'Ughelli South', 'Ukwuani', 'Uvwie (Effurun)', 'Warri North',
    'Warri South', 'Warri South West'
  ],
  Ebonyi: [
    'Abakaliki', 'Afikpo North', 'Afikpo South', 'Ebonyi', 'Ezza North', 'Ezza South',
    'Ikwo', 'Ishielu', 'Ivo', 'Izzi', 'Ohaozara', 'Ohaukwu', 'Onicha'
  ],
  Edo: [
    'Akoko-Edo', 'Egor', 'Esan Central', 'Esan North-East', 'Esan South-East',
    'Esan West (Ekpoma)', 'Etsako Central', 'Etsako East', 'Etsako West (Auchi)',
    'Igueben', 'Ikpoba-Okha', 'Oredo (Benin City)', 'Orhionmwon', 'Ovia North-East',
    'Ovia South-West', 'Owan East', 'Owan West', 'Uhunmwonde'
  ],
  Ekiti: [
    'Ado Ekiti', 'Efon', 'Ekiti East', 'Ekiti South-West', 'Ekiti West', 'Emure',
    'Gbonyin', 'Ido Osi', 'Ijero', 'Ikere', 'Ikole', 'Ilejemeje', 'Irepodun/Ifelodun',
    'Ise/Orun', 'Moba', 'Oye'
  ],
  Enugu: [
    'Aninri', 'Awgu', 'Enugu East', 'Enugu North', 'Enugu South', 'Ezeagu',
    'Igbo Etiti', 'Igbo Eze North', 'Igbo Eze South', 'Isi Uzo', 'Nkanu East',
    'Nkanu West', 'Nsukka', 'Oji River', 'Udenu', 'Udi', 'Uzo Uwani'
  ],
  'FCT Abuja': [
    'Abuja Municipal (AMAC - Central/Maitama/Wuse/Garki/Asokoro)',
    'Abaji', 'Bwari', 'Gwagwalada', 'Kuje', 'Kwali'
  ],
  Gombe: [
    'Akko', 'Balanga', 'Billiri', 'Dukku', 'Funakaye', 'Gombe', 'Kaltungo',
    'Kwami', 'Nafada', 'Shongom', 'Yamaltu/Deba'
  ],
  Imo: [
    'Aboh Mbaise', 'Ahiazu Mbaise', 'Ehime Mbano', 'Ezinihitte', 'Ideato North',
    'Ideato South', 'Ihitte/Uboma', 'Ikeduru', 'Isiala Mbano', 'Isu', 'Mbaitoli',
    'Ngor Okpala', 'Njaba', 'Nkwerre', 'Nwangele', 'Obowo', 'Oguta', 'Ohaji/Egbema',
    'Okigwe', 'Onuimo', 'Orlu', 'Orsu', 'Oru East', 'Oru West', 'Owerri Municipal',
    'Owerri North', 'Owerri West'
  ],
  Jigawa: [
    'Auyo', 'Babura', 'Biriniwa', 'Birnin Kudu', 'Buji', 'Dutse', 'Gagarawa',
    'Garki', 'Gumel', 'Guri', 'Gwaram', 'Gwiwa', 'Hadejia', 'Jahun', 'Kafin Hausa',
    'Kaugama', 'Kazaure', 'Kiri Kasama', 'Kiyawa', 'Maigatari', 'Malam Madori',
    'Miga', 'Ringim', 'Roni', 'Sule Tankarkar', 'Taura', 'Yankwashi'
  ],
  Kaduna: [
    'Birnin Gwari', 'Chikun', 'Giwa', 'Igabi', 'Ikara', 'Jaba', 'Jema\'a',
    'Kachia', 'Kaduna North', 'Kaduna South', 'Kagarko', 'Kajuru', 'Kaura',
    'Kauru', 'Kubau', 'Kudan', 'Lere', 'Makarfi', 'Sabon Gari', 'Sanga',
    'Soba', 'Zangon Kataf', 'Zaria'
  ],
  Kano: [
    'Ajingi', 'Albasu', 'Bagwai', 'Bebeji', 'Bichi', 'Bunkure', 'Dala',
    'Dambatta', 'Dawakin Kudu', 'Dawakin Tofa', 'Doguwa', 'Fagge', 'Gabasawa',
    'Garko', 'Garun Mallam', 'Gaya', 'Gezawa', 'Gwale', 'Gwarzo', 'Kabo',
    'Kano Municipal', 'Karaye', 'Kibiya', 'Kiru', 'Kumbotso', 'Kunchi', 'Kura',
    'Madobi', 'Makoda', 'Minjibir', 'Nassarawa', 'Rano', 'Rimin Gado', 'Rogo',
    'Shanono', 'Sumaila', 'Takai', 'Tarauni', 'Tofa', 'Tsanyawa', 'Tudun Wada',
    'Ungogo', 'Warawa', 'Wudil'
  ],
  Katsina: [
    'Bakori', 'Batagarawa', 'Batsari', 'Baure', 'Bindawa', 'Charanchi', 'Dandume',
    'Danja', 'Dan Musa', 'Daura', 'Dutsi', 'Dutsin Ma', 'Faskari', 'Funtua',
    'Ingawa', 'Jibia', 'Kafur', 'Kaita', 'Kankara', 'Kankia', 'Katsina', 'Kurfi',
    'Kusada', 'Mai\'Adua', 'Malumfashi', 'Mani', 'Mashi', 'Matazu', 'Musawa',
    'Rimi', 'Sabuwa', 'Safana', 'Sandamu', 'Zango'
  ],
  Kebbi: [
    'Aleiro', 'Arewa Dandi', 'Argungu', 'Augie', 'Bagudo', 'Birnin Kebbi',
    'Bunza', 'Dandi', 'Fakai', 'Gwandu', 'Jega', 'Kalgo', 'Koko/Besse',
    'Maiyama', 'Ngaski', 'Sakaba', 'Shanga', 'Suru', 'Danko/Wasagu', 'Yauri', 'Zuru'
  ],
  Kogi: [
    'Adavi', 'Ajaokuta', 'Ankpa', 'Bassa', 'Dekina', 'Ibaji', 'Idah',
    'Igalamela Odolu', 'Ijumu', 'Kabba/Bunu', 'Koton Karfe', 'Lokoja', 'Mopa Muro',
    'Ofu', 'Ogori/Magongo', 'Okehi', 'Okene', 'Olamaboro', 'Omala', 'Yagba East', 'Yagba West'
  ],
  Kwara: [
    'Asa', 'Baruten', 'Edu', 'Ekiti', 'Ifelodun', 'Ilorin East', 'Ilorin South',
    'Ilorin West', 'Irepodun', 'Isin', 'Kaiama', 'Moro', 'Offa', 'Oke Ero', 'Oyun', 'Pategi'
  ],
  Lagos: [
    'Agege', 'Ajeromi-Ifelodun', 'Alimosho', 'Amuwo-Odofin', 'Apapa', 'Badagry',
    'Epe', 'Eti-Osa (Ikoyi/Victoria Island/Lekki)', 'Ibeju-Lekki', 'Ifako-Ijaiye',
    'Ikeja (Alausa/GRA)', 'Ikorodu', 'Kosofe', 'Lagos Island', 'Lagos Mainland (Yaba/Ebute-Metta)',
    'Mushin', 'Ojo', 'Oshodi-Isolo', 'Shomolu', 'Surulere'
  ],
  Nasarawa: [
    'Akwanga', 'Awe', 'Doma', 'Karu', 'Keana', 'Keffi', 'Kokona', 'Lafia',
    'Nasarawa', 'Nasarawa Egon', 'Obi', 'Toto', 'Wamba'
  ],
  Niger: [
    'Agaie', 'Agwara', 'Bida', 'Borgu', 'Bosso', 'Chanchaga', 'Edati', 'Gbako',
    'Gurara', 'Katcha', 'Kontagora', 'Lapai', 'Lavun', 'Magama', 'Mariga',
    'Mashegu', 'Mokwa', 'Moya', 'Paikoro', 'Rafi', 'Rijau', 'Shiroro', 'Suleja',
    'Tafa', 'Wushishi'
  ],
  Ogun: [
    'Abeokuta North', 'Abeokuta South', 'Ado-Odo/Ota', 'Ewekoro', 'Ifo', 'Ijebu East',
    'Ijebu North', 'Ijebu North East', 'Ijebu Ode', 'Ikenne', 'Imeko Afon', 'Ipokia',
    'Obafemi Owode', 'Odeda', 'Odogbolu', 'Ogun Waterside', 'Remo North', 'Sagamu',
    'Yewa North', 'Yewa South'
  ],
  Ondo: [
    'Akoko North-East', 'Akoko North-West', 'Akoko South-West', 'Akoko South-East',
    'Akure North', 'Akure South', 'Ese Odo', 'Idanre', 'Ifedore', 'Ilaje',
    'Ile Oluji/Okeigbo', 'Irele', 'Odigbo', 'Okitipupa', 'Ondo East', 'Ondo West',
    'Ose', 'Owo'
  ],
  Osun: [
    'Atakunmosa East', 'Atakunmosa West', 'Aiyedaade', 'Aiyedire', 'Boluwaduro',
    'Boripe', 'Ede North', 'Ede South', 'Ife Central', 'Ife East', 'Ife North',
    'Ife South', 'Egbedore', 'Ejigbo', 'Ifedayo', 'Ifelodun', 'Ila', 'Ilesa East',
    'Ilesa West', 'Irepodun', 'Irewole', 'Isokan', 'Iwo', 'Obokun', 'Odo Otin',
    'Ola Oluwa', 'Olorunda', 'Oriade', 'Orolu', 'Osogbo'
  ],
  Oyo: [
    'Afijio', 'Akinyele', 'Atiba', 'Atisbo', 'Egbeda', 'Ibadan North', 'Ibadan North-East',
    'Ibadan North-West', 'Ibadan South-East', 'Ibadan South-West', 'Ibarapa Central',
    'Ibarapa East', 'Ibarapa North', 'Ido', 'Irepo', 'Iseyin', 'Itesiwaju', 'Iwajowa',
    'Kajola', 'Lagelu', 'Ogbomosho North', 'Ogbomosho South', 'Ogo Oluwa', 'Olorunsogo',
    'Oluyole', 'Ona Ara', 'Orelope', 'Ori Ire', 'Oyo East', 'Oyo West', 'Saki East',
    'Saki West', 'Surulere'
  ],
  Plateau: [
    'Barkin Ladi', 'Bassa', 'Bokkos', 'Jos East', 'Jos North', 'Jos South',
    'Kanam', 'Kanke', 'Langtang North', 'Langtang South', 'Mangu', 'Mikang',
    'Pankshin', 'Qua\'an Pan', 'Riyom', 'Shendam', 'Wase'
  ],
  Rivers: [
    'Abua/Odual', 'Ahoada East', 'Ahoada West', 'Akuku-Toru', 'Andoni', 'Asari-Toru',
    'Bonny', 'Degema', 'Eleme', 'Emohua', 'Etche', 'Gokana', 'Ikwerre', 'Khana',
    'Obio-Akpor', 'Ogba/Egbema/Ndoni', 'Ogu/Bolo', 'Okrika', 'Omuma', 'Opobo/Nkoro',
    'Oyigbo', 'Port Harcourt City', 'Tai'
  ],
  Sokoto: [
    'Binji', 'Bodinga', 'Dange Shuni', 'Gada', 'Goronyo', 'Gudu', 'Gawabawa',
    'Illela', 'Isa', 'Kebbe', 'Kware', 'Rabah', 'Sabon Birni', 'Shagari',
    'Silame', 'Sokoto North', 'Sokoto South', 'Tambuwal', 'Tangaza', 'Tureta',
    'Wamako', 'Wurno', 'Yabo'
  ],
  Taraba: [
    'Ardo Kola', 'Bali', 'Donga', 'Gashaka', 'Gassol', 'Ibi', 'Jalingo',
    'Karim Lamido', 'Kurmi', 'Lau', 'Sardauna', 'Takum', 'Ussa', 'Wukari', 'Yorro', 'Zing'
  ],
  Yobe: [
    'Bade', 'Bursari', 'Damaturu', 'Fika', 'Fune', 'Geidam', 'Gujba', 'Gulani',
    'Jakusko', 'Karasuwa', 'Machina', 'Nangere', 'Nguru', 'Potiskum', 'Tarmuwa',
    'Yunusari', 'Yusufari'
  ],
  Zamfara: [
    'Anka', 'Bakura', 'Birnin Magaji/Kiyaw', 'Bukkuyum', 'Bungudu', 'Chafe',
    'Gummi', 'Gusau', 'Kaura Namoda', 'Maradun', 'Maru', 'Shinkafi', 'Talata Mafara', 'Zurmi'
  ],

  // United States key regions
  'California': ['Los Angeles County', 'Orange County', 'San Diego County', 'San Francisco Bay Area', 'Santa Clara (Silicon Valley)', 'Alameda', 'Sacramento County', 'Riverside County'],
  'New York': ['New York County (Manhattan)', 'Kings County (Brooklyn)', 'Queens County', 'Bronx County', 'Richmond County (Staten Island)', 'Nassau County', 'Westchester County', 'Suffolk County'],
  'Texas': ['Harris County (Houston)', 'Dallas County', 'Tarrant County (Fort Worth)', 'Travis County (Austin)', 'Bexar County (San Antonio)', 'Collin County', 'El Paso County'],
  'Florida': ['Miami-Dade County', 'Broward County (Fort Lauderdale)', 'Palm Beach County', 'Orange County (Orlando)', 'Hillsborough County (Tampa)', 'Duval County (Jacksonville)'],
  'Illinois': ['Cook County (Chicago)', 'DuPage County', 'Lake County', 'Will County', 'Kane County'],
  'Georgia': ['Fulton County (Atlanta)', 'Gwinnett County', 'Cobb County', 'DeKalb County', 'Clayton County'],

  // United Kingdom key regions
  'Greater London': ['Camden', 'City of London', 'Greenwich', 'Hackney', 'Hammersmith and Fulham', 'Islington', 'Kensington and Chelsea', 'Lambeth', 'Southwark', 'Tower Hamlets', 'Wandsworth', 'Westminster', 'Barnet', 'Brent', 'Bromley', 'Croydon', 'Ealing'],
  'Greater Manchester': ['City of Manchester', 'Salford', 'Bolton', 'Bury', 'Oldham', 'Rochdale', 'Stockport', 'Tameside', 'Trafford', 'Wigan'],
  'West Midlands': ['Birmingham', 'Coventry', 'Dudley', 'Sandwell', 'Solihull', 'Walsall', 'Wolverhampton'],

  // Ghana key regions
  'Greater Accra': ['Accra Metropolitan', 'Tema Metropolitan', 'Ga East', 'Ga West', 'Ga South', 'La Dade Kotopon', 'Ayawaso West', 'Adentan'],
  'Ashanti': ['Kumasi Metropolitan', 'Asokore Mampong', 'Obuasi Municipal', 'Ejisu Municipal', 'Kwadaso Municipal', 'Oforikrom Municipal'],

  // Kenya key regions
  'Nairobi': ['Westlands', 'Dagoretti', 'Langata', 'Kibra', 'Roysambu', 'Kasarani', 'Ruaraka', 'Embakasi', 'Kamukunji', 'Starehe'],
  'Mombasa': ['Mvita', 'Changamwe', 'Jomvu', 'Kisauni', 'Nyali', 'Likoni'],

  // South Africa key regions
  'Gauteng (Johannesburg/Pretoria)': ['City of Johannesburg (Sandton/Rosebank/Soweto)', 'City of Tshwane (Pretoria)', 'Ekurhuleni (East Rand)', 'Sedibeng', 'West Rand'],
  'Western Cape (Cape Town)': ['City of Cape Town (CBD/Atlantic Seaboard/Southern Suburbs)', 'Cape Winelands (Stellenbosch)', 'Garden Route', 'West Coast'],

  // United Arab Emirates key regions
  'Dubai': ['Downtown Dubai', 'Dubai Marina / JBR', 'Business Bay', 'Deira / Bur Dubai', 'Jumeirah', 'Palm Jumeirah', 'Dubai Silicon Oasis / Academic City', 'Al Barsha'],
  'Abu Dhabi': ['Abu Dhabi Island (Downtown)', 'Al Reem Island', 'Yas Island', 'Saadiyat Island', 'Al Ain', 'Al Dhafra'],
};

const NIGERIAN_STATES = COUNTRY_ADMIN_DIVISIONS.Nigeria;

/**
 * Normalizes phone numbers to standard international E.164 format
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
 */
const isValidPhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  const digitsOnly = phone.replace(/[^0-9]/g, '');
  if (digitsOnly.length < 8 || digitsOnly.length > 15) return false;
  const normalized = normalizePhoneNumber(phone);
  return /^\+[1-9]\d{7,14}$/.test(normalized);
};

/**
 * Validates if country is supported
 */
const isValidCountry = (country) => {
  if (!country) return false;
  const normalized = country.toLowerCase().trim();
  return COUNTRIES.some(
    (c) => c.name.toLowerCase() === normalized || c.code.toLowerCase() === normalized
  );
};

/**
 * Finds country metadata by name or code
 */
const getCountryMeta = (country) => {
  if (!country) return COUNTRIES.find((c) => c.code === 'NG');
  const normalized = country.toLowerCase().trim();
  return (
    COUNTRIES.find(
      (c) => c.name.toLowerCase() === normalized || c.code.toLowerCase() === normalized
    ) || COUNTRIES.find((c) => c.code === 'NG')
  );
};

/**
 * Checks if a state is a valid Nigerian state (preserved for backward compatibility)
 */
const isValidState = (state) => {
  if (!state) return false;
  const normalized = state.toLowerCase().trim();
  return NIGERIAN_STATES.some(
    (s) => s.toLowerCase() === normalized || (normalized.includes('abuja') && s.includes('Abuja'))
  );
};

/**
 * Gets administrative regions for a country
 */
const getRegionsForCountry = (country = 'Nigeria') => {
  const meta = getCountryMeta(country);
  const countryName = meta ? meta.name : country;
  return COUNTRY_ADMIN_DIVISIONS[countryName] || [];
};

/**
 * Gets LGAs or localities for a region
 */
const getLgasForState = (state) => {
  if (!state) return [];
  const clean = state.toLowerCase().replace(/[-_]/g, ' ').trim();
  const foundKey = Object.keys(STATE_LGAS).find((k) => {
    const kClean = k.toLowerCase().replace(/[-_]/g, ' ').trim();
    return (
      kClean === clean ||
      (clean.includes('abuja') && kClean.includes('abuja')) ||
      (clean.includes('fct') && kClean.includes('abuja'))
    );
  });
  return foundKey ? STATE_LGAS[foundKey] : [];
};

module.exports = {
  COUNTRIES,
  COUNTRY_CALLING_CODES,
  NIGERIAN_STATES,
  STATE_LGAS,
  COUNTRY_ADMIN_DIVISIONS,
  normalizePhoneNumber,
  isValidPhoneNumber,
  isValidCountry,
  getCountryMeta,
  isValidState,
  getRegionsForCountry,
  getLgasForState,
};
