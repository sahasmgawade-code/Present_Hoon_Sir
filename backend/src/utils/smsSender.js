const BASE_URL = process.env.SMSGATE_BASE_URL || 'https://api.sms-gate.app/3rdparty/v1';

// Default country code used when a stored number has no country code at all.
// Change to your country's code if not India, e.g. '1' for US/Canada, '44' for UK.
const DEFAULT_COUNTRY_CODE = process.env.SMS_DEFAULT_COUNTRY_CODE || '91';

function authHeader() {
  const creds = Buffer.from(
    `${process.env.SMSGATE_USERNAME}:${process.env.SMSGATE_PASSWORD}`
  ).toString('base64');
  return `Basic ${creds}`;
}

// Normalizes numbers like:
//   "9876543210"       -> "+919876543210"
//   "09876543210"       -> "+919876543210"   (strips leading trunk 0)
//   "+91 98765 43210"   -> "+919876543210"
//   "91-9876543210"     -> "+919876543210"
//   "+1 (415) 555-0123" -> "+14155550123"
// Returns null if the input doesn't look like a usable phone number.
function normalizePhoneNumber(raw, defaultCountryCode = DEFAULT_COUNTRY_CODE) {
  if (!raw) return null;

  let digits = String(raw).trim();
  const hadPlus = digits.startsWith('+');

  // strip everything except digits
  digits = digits.replace(/\D/g, '');
  if (!digits) return null;

  if (hadPlus) {
    // already had a country code, e.g. +91XXXXXXXXXX
    return `+${digits}`;
  }

  // strip a single leading trunk '0' (common in local formats, e.g. India/UK style)
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // if it already starts with the default country code and is long enough, don't double it
  // (e.g. stored as "919876543210" without a plus)
  if (digits.startsWith(defaultCountryCode) && digits.length > 10) {
    return `+${digits}`;
  }

  return `+${defaultCountryCode}${digits}`;
}

// phoneNumber can be raw/local format — it's normalized automatically before sending.
// simNumber (optional): 1 or 2 to force a specific SIM slot on a dual-SIM phone.
// Falls back to SMSGATE_SIM_NUMBER env var, or omits the field entirely (app decides)
// if neither is set.
async function sendSMS({ phoneNumber, message, simNumber }) {
  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized) throw new Error(`Invalid phoneNumber: ${phoneNumber}`);

  const resolvedSim = simNumber ?? (process.env.SMSGATE_SIM_NUMBER
    ? Number(process.env.SMSGATE_SIM_NUMBER)
    : undefined);

  const body = {
    message,
    phoneNumbers: [normalized],
  };
  if (resolvedSim !== undefined) body.simNumber = resolvedSim;

  const res = await fetch(`${BASE_URL}/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`SMSGate error ${res.status}: ${text}`);
  }

  return res.json();
}

module.exports = { sendSMS, normalizePhoneNumber };