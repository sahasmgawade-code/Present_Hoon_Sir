const BASE_URL = process.env.SMSGATE_BASE_URL || 'https://api.sms-gate.app/3rdparty/v1';
const DEFAULT_COUNTRY_CODE = process.env.SMS_DEFAULT_COUNTRY_CODE || '91';
function authHeader() {
  const creds = Buffer.from(
    `${process.env.SMSGATE_USERNAME}:${process.env.SMSGATE_PASSWORD}`
  ).toString('base64');
  return `Basic ${creds}`;
}
function normalizePhoneNumber(raw, defaultCountryCode = DEFAULT_COUNTRY_CODE) {
  if (!raw) return null;
  let digits = String(raw).trim();
  const hadPlus = digits.startsWith('+');
  digits = digits.replace(/\D/g, '');
  if (!digits) return null;
  if (hadPlus) {
    return `+${digits}`;
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (digits.startsWith(defaultCountryCode) && digits.length > 10) {
    return `+${digits}`;
  }
  return `+${defaultCountryCode}${digits}`;
}
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