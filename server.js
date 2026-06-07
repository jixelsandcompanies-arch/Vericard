import 'dotenv/config';
import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';

const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
const sessionSecret = process.env.SESSION_SECRET || (isProduction ? '' : 'mapphex-local-secret');
const exposeResetCodes = process.env.EXPOSE_RESET_CODES === 'true';
const appRoot = dirname(fileURLToPath(import.meta.url));
const staticRoots = [...new Set([
  appRoot,
  process.cwd(),
  join(appRoot, '..'),
  join(process.cwd(), '..')
].map((root) => resolve(root)))];

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || supabaseKey;
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
if (!isSupabaseConfigured && process.env.NODE_ENV !== 'test') {
  console.warn('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to .env before using the API.');
}
const db = createClient(supabaseUrl || 'http://localhost', supabaseKey || 'missing-key', {
  auth: { persistSession: false }
});
const authClient = createClient(supabaseUrl || 'http://localhost', supabaseAnonKey || 'missing-key', {
  auth: { persistSession: false }
});

app.disable('x-powered-by');
app.use(express.json({ limit: '8mb' }));

function securityHeaders(req, res, next) {
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' https://cdn.onesignal.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob: https://cdn.onesignal.com",
    "manifest-src 'self'"
  ].join('; ');
  res.setHeader('Content-Security-Policy', csp);
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), geolocation=(self), microphone=(), payment=(), usb=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
}

app.use(securityHeaders);

function validateRuntimeConfig(env = process.env) {
  const errors = [];
  const production = env.NODE_ENV === 'production' || Boolean(env.VERCEL);
  if (!production) return errors;
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32 || env.SESSION_SECRET === 'mapphex-local-secret') {
    errors.push('SESSION_SECRET must be set to a strong value of at least 32 characters.');
  }
  if (!env.ADMIN_USER) errors.push('ADMIN_USER must be configured.');
  if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 12 || env.ADMIN_PASSWORD === 'admin12345') {
    errors.push('ADMIN_PASSWORD must be set to a strong value of at least 12 characters.');
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    errors.push('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.');
  }
  if (env.EXPOSE_RESET_CODES === 'true') {
    errors.push('EXPOSE_RESET_CODES must be false in production.');
  }
  return errors;
}

const runtimeConfigErrors = validateRuntimeConfig();
if (runtimeConfigErrors.length) {
  throw new Error(`Invalid production configuration:\n- ${runtimeConfigErrors.join('\n- ')}`);
}

function createRateLimit({ windowMs, max, key = (req) => req.ip, message = 'Too many requests. Please try again shortly.' }) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const bucketKey = key(req);
    const bucket = hits.get(bucketKey) || { count: 0, resetAt: now + windowMs };
    if (bucket.resetAt <= now) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }
    bucket.count += 1;
    hits.set(bucketKey, bucket);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > max) return res.status(429).json({ error: message });
    next();
  };
}

const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  key: (req) => `${req.ip}:${normalizeEmail(req.body?.email || req.body?.username || '')}`,
  message: 'Too many login or password attempts. Please wait 15 minutes and try again.'
});
const resetRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  key: (req) => `${req.ip}:${normalizeEmail(req.body?.email || '')}`,
  message: 'Too many password reset attempts. Please wait before requesting another code.'
});
const gateRateLimit = createRateLimit({
  windowMs: 60 * 1000,
  max: 60,
  key: (req) => `${req.ip}:${normalizeText(req.body?.sessionToken || req.body?.staffCode || '')}`,
  message: 'Too many gate scan requests. Please slow down and try again.'
});
const qrRateLimit = createRateLimit({
  windowMs: 60 * 1000,
  max: 120,
  key: (req) => req.ip,
  message: 'Too many QR requests. Please slow down and try again.'
});

function staticFilePath(filePath) {
  const cleanPath = normalize(String(filePath || '').replace(/^[/\\]+/, ''));
  if (!cleanPath || cleanPath.startsWith('..')) return '';
  for (const root of staticRoots) {
    const candidate = resolve(root, cleanPath);
    if (candidate.startsWith(root) && existsSync(candidate)) return candidate;
  }
  return '';
}

function sendStaticFile(res, filePath, fallback = '') {
  const requested = staticFilePath(filePath) || (fallback ? staticFilePath(fallback) : '');
  if (!requested) return res.status(404).send('Not found');
  return res.sendFile(requested);
}

app.get('/', async (req, res) => {
  if (!req.query.token && !req.query.q) return sendStaticFile(res, 'portal.html');
  const result = await verifyCardToken(req.query.q || req.query.token);
  res.send(buildVerificationHtml(result));
});
app.get(['/index.html', '/portal.html', '/gate.html', '/super-admin.html'], (req, res) => sendStaticFile(res, req.path));
app.get(['/portal', '/app'], (req, res) => sendStaticFile(res, 'portal.html'));
app.get('/gate', (req, res) => sendStaticFile(res, 'gate.html'));
app.get(['/super-admin', '/admin'], (req, res) => sendStaticFile(res, 'super-admin.html'));
app.get(['/manifest.webmanifest', '/sw.js'], (req, res) => sendStaticFile(res, req.path));
app.get(['/favicon.ico', '/favicon.png'], (req, res) => sendStaticFile(res, req.path, 'assets/vericard-logo.jpeg'));
app.use('/css', express.static(staticFilePath('css') || join(appRoot, 'css')));
app.use('/js', express.static(staticFilePath('js') || join(appRoot, 'js')));
app.use('/assets', express.static(staticFilePath('assets') || join(appRoot, 'assets')));
app.use('/features', express.static(staticFilePath('features') || join(appRoot, 'features')));
app.use(express.static(staticFilePath('.') || appRoot));

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    app: 'VeriCard',
    supabaseConfigured: Boolean(supabaseUrl && supabaseKey),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/qr', qrRateLimit, async (req, res) => {
  const data = normalizeText(req.query.data);
  if (!data || data.length > 2048) return res.status(400).send('Invalid QR data');
  try {
    const png = await QRCode.toBuffer(data, { type: 'png', margin: 0, width: 240, errorCorrectionLevel: 'M' });
    res.setHeader('Cache-Control', 'no-store');
    res.type('png').send(png);
  } catch {
    res.status(500).send('Unable to generate QR');
  }
});

const templates = [
  { id: 'sample', name: 'Classic Blue', description: 'Clean corporate card with QR verification.' },
  { id: 'school', name: 'School', description: 'Student and staff registration fields.' },
  { id: 'company', name: 'Company', description: 'Employee and contractor workflows.' },
  { id: 'hospital', name: 'Hospital', description: 'Staff, nurse, doctor, and visitor badges.' },
  { id: 'security', name: 'Security', description: 'Guard and supervisor ID records.' }
];

const orgRegistrationFields = {
  school: {
    label: 'School',
    nameLabel: 'School name',
    authorityLabel: 'Principal / Head Teacher name',
    signatureLabel: 'Principal / Head Teacher digital signature',
    registrationLabel: 'School registration number',
    requiresMissionVision: true
  },
  university: {
    label: 'University',
    nameLabel: 'University name',
    authorityLabel: 'VC / Rector / President name',
    signatureLabel: 'VC / Rector / President digital signature',
    registrationLabel: 'University registration number',
    requiresMissionVision: true
  },
  company: {
    label: 'Company',
    nameLabel: 'Company name',
    authorityLabel: 'Director / Manager / HR name',
    signatureLabel: 'Director / Manager / HR digital signature',
    registrationLabel: 'Business/registration number'
  },
  hospital: {
    label: 'Hospital',
    nameLabel: 'Hospital name',
    authorityLabel: 'Medical Director / Admin Head name',
    signatureLabel: 'Medical Director / Admin Head digital signature',
    registrationLabel: 'License/registration number'
  },
  ngo: {
    label: 'NGO/Church',
    nameLabel: 'Organization name',
    authorityLabel: 'Leader / Pastor / Coordinator name',
    signatureLabel: 'Leader / Pastor / Coordinator digital signature',
    registrationLabel: 'Registration number'
  },
  security: {
    label: 'Security Agency',
    nameLabel: 'Agency name',
    authorityLabel: 'Commander / Operations Manager name',
    signatureLabel: 'Commander / Operations Manager digital signature',
    registrationLabel: 'License/registration number'
  },
  government: {
    label: 'Government Office',
    nameLabel: 'Office / Department name',
    authorityLabel: 'Authorized Officer name',
    signatureLabel: 'Authorized Officer digital signature',
    registrationLabel: 'Office code / registration number'
  },
  custom: {
    label: 'Custom Organization',
    nameLabel: 'Organization name',
    authorityLabel: 'Authorized person name',
    signatureLabel: 'Authorized person digital signature',
    registrationLabel: 'Registration number'
  }
};

const organizationTypes = {
  school: { label: 'School', roles: {
    student: role('Student', ['name', 'admissionNumber', 'classGrade', 'parentGuardianName', 'parentGuardianPhone', 'photo'], ['studentCategory', 'stream', 'phone', 'email', 'parentGuardianEmail', 'parentGuardianNationalId']),
    teacher: role('Teacher', ['name', 'nationalId', 'staffId', 'department', 'phone', 'email', 'photo'], ['subject', 'classTeacherStatus', 'assignedClass']),
    staff: role('Staff', ['name', 'nationalId', 'staffId', 'position', 'department', 'phone', 'email', 'photo']),
    guardian: role('Parent/Guardian', ['name', 'nationalId', 'phone', 'relationshipToStudent', 'studentName', 'studentAdmissionNumber', 'photo'], ['email'])
  } },
  university: { label: 'University', roles: {
    student: role('Student', ['name', 'matricNumber', 'faculty', 'department', 'program', 'level', 'phone', 'email', 'photo'], ['parentGuardianName', 'parentGuardianPhone', 'parentGuardianEmail']),
    lecturer: role('Lecturer', ['name', 'nationalId', 'staffId', 'faculty', 'department', 'position', 'phone', 'email', 'photo']),
    staff: role('Staff', ['name', 'nationalId', 'staffId', 'department', 'position', 'phone', 'email', 'photo']),
    guardian: role('Parent/Guardian', ['name', 'nationalId', 'phone', 'relationshipToStudent', 'studentName', 'studentMatricNumber', 'photo'], ['email'])
  } },
  company: { label: 'Company', roles: {
    employee: role('Employee', ['name', 'nationalId', 'employeeId', 'department', 'position', 'phone', 'email', 'photo']),
    contractor: role('Contractor', ['name', 'nationalId', 'contractorId', 'vendorName', 'site', 'phone', 'email', 'expiryDate', 'photo']),
    intern: role('Intern', ['name', 'nationalId', 'internId', 'department', 'supervisorName', 'phone', 'email', 'photo']),
    visitor: role('Visitor', ['name', 'nationalId', 'phone', 'visitingFrom', 'visitTo', 'visitDate'], ['photo'])
  } },
  hospital: { label: 'Hospital', roles: {
    doctor: role('Doctor', ['name', 'nationalId', 'staffId', 'department', 'specialty', 'licenseNumber', 'phone', 'email', 'photo']),
    nurse: role('Nurse', ['name', 'nationalId', 'staffId', 'department', 'licenseNumber', 'phone', 'email', 'photo'], ['ward']),
    staff: role('Staff', ['name', 'nationalId', 'staffId', 'department', 'position', 'phone', 'email', 'photo']),
    visitor: role('Visitor', ['name', 'nationalId', 'phone', 'visitTo', 'visitDate'], ['photo'])
  } },
  ngo: { label: 'NGO/Church', roles: {
    member: role('Member', ['name', 'nationalId', 'membershipId', 'department', 'phone', 'photo'], ['email']),
    volunteer: role('Worker/Volunteer', ['name', 'nationalId', 'workerId', 'role', 'department', 'phone', 'email', 'photo']),
    leader: role('Leader', ['name', 'nationalId', 'leaderId', 'position', 'department', 'phone', 'email', 'photo'])
  } },
  security: { label: 'Security Agency', roles: {
    guard: role('Guard', ['name', 'nationalId', 'guardId', 'rank', 'assignedSite', 'phone', 'photo'], ['email']),
    supervisor: role('Supervisor', ['name', 'nationalId', 'supervisorId', 'rank', 'site', 'phone', 'email', 'photo']),
    operations: role('Operations Staff', ['name', 'nationalId', 'staffId', 'department', 'position', 'phone', 'email', 'photo'])
  } },
  government: { label: 'Government Office', roles: {
    officer: role('Officer', ['name', 'nationalId', 'officerId', 'department', 'position', 'officeBranch', 'phone', 'email', 'photo']),
    contract: role('Contract Staff', ['name', 'nationalId', 'contractId', 'department', 'role', 'phone', 'email', 'expiryDate', 'photo']),
    visitor: role('Visitor', ['name', 'nationalId', 'phone', 'visitTo', 'visitDate'], ['photo'])
  } },
  custom: { label: 'Custom Organization', roles: {
    member: role('Member', ['name', 'nationalId', 'memberId', 'role', 'department', 'phone', 'email', 'photo']),
    staff: role('Staff', ['name', 'nationalId', 'staffId', 'position', 'department', 'phone', 'email', 'photo']),
    visitor: role('Visitor', ['name', 'nationalId', 'phone', 'purposeOfVisit', 'visitDate'], ['photo'])
  } }
};

function role(label, required, optional = ['location']) {
  return { label, required, optional };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const passwordHash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, 'sha256').toString('hex');
  return { salt, passwordHash };
}

function secureEqualText(left, right) {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyPassword(password, salt, passwordHash) {
  return secureEqualText(hashPassword(password, salt).passwordHash, passwordHash);
}

function signToken(payload, ttlMs = 1000 * 60 * 60 * 12) {
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + ttlMs })).toString('base64url');
  const sig = crypto.createHmac('sha256', sessionSecret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function readToken(token) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', sessionSecret).update(body).digest('base64url');
  if (!secureEqualText(sig, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

function signCardQr(card) {
  return signToken({ scope: 'card-qr', cardId: card.id, token: card.verification_token }, 1000 * 60 * 60 * 24 * 365 * 5);
}

function readCardQr(value) {
  const payload = readToken(value);
  return payload?.scope === 'card-qr' && payload.cardId && payload.token ? payload : null;
}

function signGateChallenge({ session, card, action, token }) {
  return signToken({ scope: 'gate-scan', sessionId: session.id, cardId: card.id, action, token }, 45 * 1000);
}

function readGateChallenge(value) {
  const payload = readToken(value);
  return payload?.scope === 'gate-scan' ? payload : null;
}

function signDeviceRequest(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function bearer(req) {
  return String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
}

function requireAdmin(req, res, next) {
  const token = readToken(bearer(req));
  if (!token || token.scope !== 'admin') return res.status(401).json({ error: 'Admin login required.' });
  req.admin = token;
  next();
}

function requireOrg(req, res, next) {
  const token = readToken(bearer(req));
  if (!token || token.scope !== 'org') return res.status(401).json({ error: 'Organization login required.' });
  req.orgId = token.orgId;
  next();
}

async function requireFreshAdminPassword(req, res) {
  const adminPassword = normalizeText(req.body.adminPassword);
  if (!adminPassword) {
    res.status(403).json({ error: 'Current admin password is required for this action.' });
    return null;
  }
  let settings;
  try {
    settings = await adminSettings();
  } catch (error) {
    res.status(500).json({ error: error.message });
    return null;
  }
  if (!verifyPassword(adminPassword, settings.salt, settings.password_hash)) {
    res.status(403).json({ error: 'Current admin password is invalid.' });
    return null;
  }
  return settings;
}

async function requireFreshOrgPassword(req, res, org) {
  const adminPassword = normalizeText(req.body.adminPassword);
  if (!adminPassword) {
    res.status(403).json({ error: 'Organization admin password is required for this action.' });
    return false;
  }
  if (!await verifyOrgPassword(org, adminPassword)) {
    res.status(403).json({ error: 'Organization admin password is invalid.' });
    return false;
  }
  return true;
}

function orgDefaults(name) {
  return {
    returnTitle: 'If found please return to:',
    returnName: name,
    poBox: '',
    addressLine1: '',
    addressLine2: '',
    phone: '',
    returnDesk: 'Admin Office',
    responsibilityTitle: 'Cardholder Responsibilities:',
    cardholderResponsibilities: 'Use only by the approved cardholder. Display this card while on duty or premises.',
    lostInstruction: 'Report lost cards immediately.',
    mission: '',
    vision: '',
    authorityName: '',
    authoritySignature: ''
  };
}

function normalizeIdentifier(value) {
  return String(value || '').trim().replace(/[\s-]+/g, '').toUpperCase();
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('0')) return `254${digits.slice(1)}`;
  return digits;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeText(value) {
  return String(value || '').trim();
}

function oneMonthFromNow() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString();
}

function isMissingColumnError(error, column) {
  const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`;
  return text.toLowerCase().includes(`'${column.toLowerCase()}' column`) || text.toLowerCase().includes(`${column.toLowerCase()} column`);
}

function validatePassword(value) {
  if (String(value || '').length < 8) return 'Password must be at least 8 characters.';
  return '';
}

function resetCodeMessage(code) {
  return exposeResetCodes
    ? `Verification code created: ${code}`
    : 'Verification code created. Check the configured reset delivery channel or admin database.';
}

function requiredFieldError(fields, field) {
  if (normalizeText(fields[field])) return '';
  return `${field.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())} is required.`;
}

function isStudentRole(roleType) {
  return roleType === 'student';
}

function schoolStudentCategory(org, fields = {}) {
  const schoolType = org?.back_settings?.schoolType || 'day';
  if (schoolType === 'day') return 'day';
  if (schoolType === 'boarding') return 'boarding';
  return normalizeText(fields.studentCategory);
}

function studentUniqueField(orgType) {
  return orgType === 'university' ? 'matricNumber' : 'admissionNumber';
}

function roleSpecificUniqueFields(roleType) {
  return {
    student: [],
    teacher: ['staffId'],
    lecturer: ['staffId'],
    staff: ['staffId', 'employeeId'],
    employee: ['employeeId'],
    contractor: ['contractorId'],
    intern: ['internId'],
    guardian: [],
    doctor: ['staffId', 'licenseNumber'],
    nurse: ['staffId', 'licenseNumber'],
    member: ['membershipId', 'memberId'],
    volunteer: ['workerId'],
    leader: ['leaderId'],
    guard: ['guardId'],
    supervisor: ['supervisorId'],
    operations: ['staffId'],
    officer: ['officerId'],
    contract: ['contractId'],
    visitor: []
  }[roleType] || [];
}

function displayNumberFor(fields, roleType, orgType) {
  const ordered = isStudentRole(roleType)
    ? [studentUniqueField(orgType), 'admissionNumber', 'matricNumber']
    : ['employeeId', 'staffId', 'contractorId', 'internId', 'membershipId', 'workerId', 'leaderId', 'guardId', 'supervisorId', 'officerId', 'contractId', 'memberId', 'nationalId'];
  for (const field of ordered) {
    if (fields[field]) return fields[field];
  }
  return '';
}

function extractVerificationToken(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  try {
    const parsed = new URL(text);
    const signed = parsed.searchParams.get('q');
    if (signed) return readCardQr(signed)?.token || '';
    return parsed.searchParams.get('token') || text;
  } catch {
    const signed = text.replace(/^.*[?&]q=/, '').split('&')[0];
    if (signed && signed !== text) return readCardQr(signed)?.token || '';
    return readCardQr(text)?.token || text.replace(/^.*[?&]token=/, '').split('&')[0];
  }
}

function validateRoleFields(org, roleType, fields) {
  const rules = organizationTypes[org.type] || organizationTypes.custom;
  const roleRule = rules.roles[roleType];
  if (!roleRule) return { error: 'Invalid registration type for this organization.' };
  if (org.type === 'school' && roleType === 'student') {
    const schoolType = org.back_settings?.schoolType || 'day';
    if (schoolType === 'mixed' && !['day', 'boarding'].includes(normalizeText(fields.studentCategory))) {
      return { error: 'Choose student category: day student or boarding student.' };
    }
    if (schoolType === 'day') fields.studentCategory = 'day';
    if (schoolType === 'boarding') fields.studentCategory = 'boarding';
    if (schoolStudentCategory(org, fields) === 'boarding') {
      fields.registrationSource = 'class-teacher';
      if (!normalizeText(fields.classTeacherName)) return { error: 'Class teacher name is required for boarding student registration.' };
      if (!normalizeText(fields.classTeacherStaffId)) return { error: 'Class teacher staff ID is required for boarding student registration.' };
    } else {
      fields.registrationSource = 'home-master-qr';
    }
  }
  if (org.type === 'school' && roleType === 'teacher') {
    fields.classTeacherStatus = normalizeText(fields.classTeacherStatus) || 'no';
    if (!['yes', 'no'].includes(fields.classTeacherStatus)) return { error: 'Choose whether this teacher is a class teacher.' };
    if (fields.classTeacherStatus === 'yes' && !normalizeText(fields.assignedClass)) return { error: 'Assigned class is required for a class teacher.' };
    if (fields.classTeacherStatus === 'no') fields.assignedClass = '';
  }
  for (const field of roleRule.required) {
    const error = requiredFieldError(fields, field);
    if (error) return { error };
  }
  return { roleRule };
}

async function ensureNoDuplicateIdentity(org, roleType, fields, currentId = '') {
  const normalizedNationalId = normalizeIdentifier(fields.nationalId);
  const normalizedStudentId = normalizeIdentifier(fields[studentUniqueField(org.type)]);
  const checks = [];
  if (isStudentRole(roleType) && ['school', 'university'].includes(org.type)) checks.push([studentUniqueField(org.type), normalizedStudentId]);
  if (!isStudentRole(roleType) && normalizedNationalId) checks.push(['nationalId', normalizedNationalId]);
  for (const field of roleSpecificUniqueFields(roleType)) {
    const value = normalizeIdentifier(fields[field]);
    if (value) checks.push([field, value]);
  }
  if (!checks.length) {
    const fallbackField = isStudentRole(roleType) && ['school', 'university'].includes(org.type) ? studentUniqueField(org.type) : 'nationalId';
    return { error: `${fallbackField.replace(/([A-Z])/g, ' $1')} is required.` };
  }
  const { data, error } = await db
    .from('cards')
    .select('id, fields, national_id, role_type')
    .eq('organization_id', org.id)
    .eq('role_type', roleType);
  if (error) return { error: error.message };
  for (const [duplicateField, duplicateValue] of checks) {
    const duplicate = (data || []).find((card) => {
      if (currentId && card.id === currentId) return false;
      if (duplicateField === 'nationalId') return normalizeIdentifier(card.national_id || card.fields?.nationalId) === duplicateValue;
      return normalizeIdentifier(card.fields?.[duplicateField]) === duplicateValue;
    });
    if (duplicate) {
      return { error: `Duplicate ${duplicateField.replace(/([A-Z])/g, ' $1')} found for this organization and role.` };
    }
  }
  return {};
}

function buildVerificationHtml(result) {
  const valid = result.valid;
  const title = valid ? 'VALID ID CARD' : 'INVALID ID CARD';
  const color = valid ? '#166534' : '#991b1b';
  const details = Object.entries(result.details || {})
    .filter(([, value]) => value)
    .map(([key, value]) => `<div><span>${key}</span><strong>${value}</strong></div>`)
    .join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#eef2f6;font-family:Arial,Helvetica,sans-serif;color:#202938}
    main{width:min(520px,calc(100% - 28px));background:#fff;border:1px solid #d9e0ea;border-radius:8px;padding:22px;display:grid;gap:14px}
    h1{margin:0;color:${color};font-size:28px}p{margin:0;font-weight:700;line-height:1.45}.details{display:grid;gap:8px}
    .details div{display:grid;grid-template-columns:150px 1fr;gap:10px;border-top:1px solid #e5eaf0;padding-top:8px}.details span{color:#657489;font-weight:800}.details strong{overflow-wrap:anywhere}
  </style></head><body><main><h1>${title}</h1><p>${result.reason || ''}</p><section class="details">${details}</section></main></body></html>`;
}

function toAttendance(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    cardId: row.card_id,
    studentName: row.student_name,
    studentNumber: row.student_number,
    classGrade: row.class_grade,
    parentPhone: row.parent_phone,
    attendanceDate: row.attendance_date,
    entryAt: row.entry_at,
    exitAt: row.exit_at,
    entryBy: row.entry_by,
    exitBy: row.exit_by,
    gateName: row.gate_name,
    deviceId: row.device_id || '',
    scanSource: row.scan_source || '',
    latitude: row.latitude,
    longitude: row.longitude,
    locationAccuracy: row.location_accuracy,
    securityStatus: row.security_status || '',
    securityReason: row.security_reason || '',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function feeStatus(balance) {
  const amount = Number(balance || 0);
  if (amount <= 0) return 'Cleared';
  return amount > 0 ? 'Fee Defaulter' : 'Cleared';
}

function normalizeFeeStatus(value, balance) {
  const text = normalizeText(value).toLowerCase();
  if (text.includes('partial')) return 'Partial Balance';
  if (text.includes('defaulter')) return 'Fee Defaulter';
  if (text.includes('clear')) return 'Cleared';
  return feeStatus(balance);
}

function toFee(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    admissionNumber: row.admission_number,
    studentName: row.student_name,
    classGrade: row.class_grade,
    balance: Number(row.balance || 0),
    dueDate: row.due_date,
    feeStatus: row.fee_status,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toNotification(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    cardId: row.card_id,
    admissionNumber: row.admission_number,
    studentName: row.student_name,
    parentPhone: row.parent_phone,
    parentEmail: row.parent_email || '',
    channel: row.channel || 'sms',
    notificationType: row.notification_type,
    message: row.message,
    status: row.status,
    deliveryStatus: row.delivery_status || row.status,
    createdAt: row.created_at
  };
}

function toGateStaff(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    fullName: row.full_name,
    phone: row.phone,
    staffCode: row.staff_code,
    gateName: row.gate_name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toGateSession(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    gateStaffId: row.gate_staff_id,
    staffName: row.staff_name,
    gateName: row.gate_name,
    sessionToken: row.session_token,
    deviceId: row.device_id || '',
    userAgent: row.user_agent || '',
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    expiresAt: row.expires_at
  };
}

function toGateDevice(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    gateStaffId: row.gate_staff_id,
    gateName: row.gate_name,
    deviceId: row.device_id,
    userAgent: row.user_agent || '',
    status: row.status,
    lastSeenAt: row.last_seen_at,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toSecurityLog(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    cardId: row.card_id,
    cardName: row.card_name,
    action: row.action,
    result: row.result,
    reason: row.reason,
    confidenceScore: row.confidence_score ?? 100,
    alertLevel: row.alert_level || 'none',
    gateStaffId: row.gate_staff_id,
    gateStaffName: row.gate_staff_name,
    gateName: row.gate_name,
    deviceId: row.device_id,
    latitude: row.latitude,
    longitude: row.longitude,
    locationAccuracy: row.location_accuracy,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    source: row.source,
    createdAt: row.created_at
  };
}

function securityConfidence(meta = {}, result = 'denied') {
  let score = result === 'allowed' ? 100 : 35;
  if (meta.locationAccuracy !== null && meta.locationAccuracy !== undefined) score -= Math.min(35, Math.max(0, Number(meta.locationAccuracy) - 25) / 3);
  if (!meta.locationCapturedAt) score -= 15;
  if (!meta.signature) score -= 20;
  score = Math.max(0, Math.min(100, Math.round(score)));
  const alertLevel = result === 'denied' ? 'high' : score < 60 ? 'medium' : score < 85 ? 'low' : 'none';
  return { confidenceScore: score, alertLevel };
}

function movementClosedFor(card, org, action) {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (org.type === 'university' && card.role_type === 'student' && minutes >= 0 && minutes < 240) {
    return 'University student scanning is closed between 12:00 AM and 4:00 AM.';
  }
  if (org.type === 'school' && card.role_type === 'student' && action === 'leave') {
    const settings = org.back_settings || {};
    const schoolType = settings.schoolType || 'day';
    const category = card.fields?.studentCategory || (schoolType === 'boarding' ? 'boarding' : 'day');
    if (category === 'boarding') {
      const day = now.getDay();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const holidays = String(settings.holidayDates || '').split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
      const releases = String(settings.releasePeriods || '').split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
      const weekendAllowed = settings.weekendReleaseAllowed === 'yes';
      const isWeekend = day === 0 || day === 6;
      const isHoliday = holidays.includes(today);
      const isReleased = releases.some((period) => {
        const match = normalizeText(period).match(/^(\d{4}-\d{2}-\d{2})(?:\s*(?:to|\.\.)\s*(\d{4}-\d{2}-\d{2}))?$/i);
        if (!match) return false;
        const start = match[1];
        const end = match[2] || match[1];
        return start && end && today >= start && today <= end;
      });
      if (!isHoliday && !isReleased && !(weekendAllowed && isWeekend)) return 'Boarding student exit is allowed only during approved weekends, holidays, or official release periods.';
      return '';
    }
    const start = String(settings.schoolStartTime || '08:00').split(':').map(Number);
    const end = String(settings.schoolEndTime || '16:00').split(':').map(Number);
    const startMinutes = (start[0] || 8) * 60 + (start[1] || 0);
    const endMinutes = (end[0] || 16) * 60 + (end[1] || 0);
    if (minutes >= startMinutes && minutes < endMinutes) return 'School student exit is closed during school hours.';
  }
  return '';
}

async function currentOpenMovement(orgId, cardId) {
  const { data } = await db
    .from('attendance_records')
    .select('*')
    .eq('organization_id', orgId)
    .eq('card_id', cardId)
    .is('exit_at', null)
    .order('entry_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
}

async function feeForCard(org, card) {
  const admission = normalizeIdentifier(card?.fields?.admissionNumber || card?.fields?.matricNumber || '');
  if (!admission || !['school', 'university'].includes(org.type)) return null;
  const { data } = await db.from('fee_records').select('*').eq('organization_id', org.id).eq('admission_number', admission).maybeSingle();
  return data ? toFee(data) : null;
}

async function readGateSession(token) {
  const { data: session } = await db.from('gate_sessions').select('*').eq('session_token', token || '').eq('status', 'On Duty').gt('expires_at', new Date().toISOString()).maybeSingle();
  if (!session) return {};
  const org = await getOrg(session.organization_id);
  if (!org || !hasActiveSubscription(org)) return {};
  return { session, org };
}

function scanMeta(req, source = 'gate-app') {
  const latitude = Number(req.body.latitude);
  const longitude = Number(req.body.longitude);
  const locationAccuracy = Number(req.body.locationAccuracy);
  const capturedAtMs = Date.parse(req.body.locationCapturedAt || '');
  return {
    deviceId: normalizeText(req.body.deviceId),
    signature: normalizeText(req.body.deviceSignature),
    signaturePayload: normalizeText(req.body.deviceSignaturePayload),
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    locationAccuracy: Number.isFinite(locationAccuracy) ? locationAccuracy : null,
    locationCapturedAt: Number.isFinite(capturedAtMs) ? new Date(capturedAtMs).toISOString() : '',
    ipAddress: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '',
    userAgent: normalizeText(req.body.userAgent) || req.get('user-agent') || '',
    source
  };
}

function validDeviceSignature(device, meta) {
  if (!device?.device_secret) return true;
  if (!meta.signature || !meta.signaturePayload) return false;
  if (!meta.signaturePayload.startsWith(`${meta.deviceId}:`)) return false;
  const parts = meta.signaturePayload.split(':');
  const timestamp = Number(parts[1]);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 2 * 60 * 1000) return false;
  return secureEqualText(meta.signature, signDeviceRequest(device.device_secret, meta.signaturePayload));
}

function gateConfigFor(org, gateName = '') {
  const settings = org?.back_settings || {};
  const gates = Array.isArray(settings.gates) ? settings.gates : [];
  const byName = gates.find((gate) => normalizeText(gate.name).toLowerCase() === normalizeText(gateName).toLowerCase());
  const gate = byName || {};
  const lat = Number(gate.latitude ?? settings.gateLatitude);
  const lng = Number(gate.longitude ?? settings.gateLongitude);
  const radius = Number(gate.radiusMeters ?? settings.gateRadiusMeters);
  return {
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lng) ? lng : null,
    radiusMeters: Number.isFinite(radius) && radius > 0 ? radius : null
  };
}

function distanceMeters(aLat, aLng, bLat, bLng) {
  const toRad = (value) => value * Math.PI / 180;
  const earthRadius = 6371000;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

const gpsSecurity = {
  maxAccuracyMeters: 100,
  maxLocationAgeMs: 2 * 60 * 1000,
  maxJumpSpeedMetersPerSecond: 80,
  lookbackMinutes: 20
};

function validCoordinate(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

async function gateDeviceDecision(org, staff, meta, gateName) {
  if (!meta.deviceId) return { allowed: false, reason: 'Scanner device ID is missing.' };
  const payload = {
    organization_id: org.id,
    gate_staff_id: staff.id,
    gate_name: gateName || staff.gate_name || 'Main Gate',
    device_id: meta.deviceId,
    device_secret: crypto.randomBytes(32).toString('hex'),
    user_agent: meta.userAgent || '',
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const { data: existing } = await db
    .from('gate_devices')
    .select('*')
    .eq('organization_id', org.id)
    .eq('device_id', meta.deviceId)
    .maybeSingle();
  if (!existing) {
    await db.from('gate_devices').insert({ id: `DEVICE-${Date.now()}`, ...payload, status: 'Pending' });
    return { allowed: false, reason: 'New scanner device is pending admin approval.' };
  }
  const deviceSecret = existing.device_secret || crypto.randomBytes(32).toString('hex');
  await db.from('gate_devices').update({
    device_secret: deviceSecret,
    user_agent: meta.userAgent || '',
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq('id', existing.id);
  if (existing.status === 'Blocked') return { allowed: false, reason: 'Scanner device is blocked.' };
  if (existing.status !== 'Approved') return { allowed: false, reason: 'Scanner device is pending admin approval.' };
  if (existing.gate_staff_id && existing.gate_staff_id !== staff.id) return { allowed: false, reason: 'Scanner device is approved for a different gate staff member.' };
  const approvedGate = normalizeText(existing.gate_name);
  if (approvedGate && normalizeText(gateName) && approvedGate.toLowerCase() !== normalizeText(gateName).toLowerCase()) {
    return { allowed: false, reason: 'Scanner device is approved for a different gate.' };
  }
  return { allowed: true, device: { ...existing, device_secret: deviceSecret } };
}

async function gpsDecision(org, gateName, meta) {
  const config = gateConfigFor(org, gateName);
  if (config.latitude === null || config.longitude === null || !config.radiusMeters) return { allowed: true };
  if (meta.latitude === null || meta.longitude === null) return { allowed: false, reason: 'Scanner GPS location is required for this gate.' };
  if (!validCoordinate(meta.latitude, meta.longitude)) return { allowed: false, reason: 'Scanner GPS coordinates are invalid.' };
  if (meta.locationAccuracy === null) return { allowed: false, reason: 'Scanner GPS accuracy is required.' };
  if (meta.locationAccuracy > gpsSecurity.maxAccuracyMeters) {
    return { allowed: false, reason: `Scanner GPS accuracy is too low (${Math.round(meta.locationAccuracy)}m). Move outside or enable high-accuracy location.` };
  }
  if (!meta.locationCapturedAt) return { allowed: false, reason: 'Scanner GPS timestamp is missing.' };
  const locationAge = Date.now() - Date.parse(meta.locationCapturedAt);
  if (!Number.isFinite(locationAge) || locationAge < -30000 || locationAge > gpsSecurity.maxLocationAgeMs) {
    return { allowed: false, reason: 'Scanner GPS location is stale. Refresh location and scan again.' };
  }
  const distance = distanceMeters(config.latitude, config.longitude, meta.latitude, meta.longitude);
  const effectiveRadius = config.radiusMeters + Math.min(meta.locationAccuracy, 25);
  if (distance > effectiveRadius) {
    return { allowed: false, reason: `Scanner is outside the approved gate radius (${Math.round(distance)}m away, accuracy ${Math.round(meta.locationAccuracy)}m).` };
  }
  const jump = await gpsJumpDecision(org, meta);
  if (!jump.allowed) return jump;
  return { allowed: true, distanceMeters: distance };
}

async function gpsJumpDecision(org, meta) {
  if (!org?.id || !meta.deviceId || !validCoordinate(meta.latitude, meta.longitude)) return { allowed: true };
  const since = new Date(Date.now() - gpsSecurity.lookbackMinutes * 60 * 1000).toISOString();
  const { data } = await db
    .from('scan_security_logs')
    .select('latitude, longitude, created_at')
    .eq('organization_id', org.id)
    .eq('device_id', meta.deviceId)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data || !validCoordinate(Number(data.latitude), Number(data.longitude))) return { allowed: true };
  const seconds = Math.max(1, (Date.now() - Date.parse(data.created_at)) / 1000);
  const distance = distanceMeters(Number(data.latitude), Number(data.longitude), meta.latitude, meta.longitude);
  const speed = distance / seconds;
  if (seconds > 5 && speed > gpsSecurity.maxJumpSpeedMetersPerSecond) {
    return {
      allowed: false,
      reason: `Suspicious GPS jump detected (${Math.round(distance)}m in ${Math.round(seconds)}s). Refresh GPS or ask admin to review the scanner device.`
    };
  }
  return { allowed: true };
}

async function sessionDeviceDecision(org, session, meta) {
  if (!meta.deviceId) return { allowed: false, reason: 'Scanner device ID is missing.' };
  if (session.device_id && session.device_id !== meta.deviceId) return { allowed: false, reason: 'Scanner device does not match this duty session.' };
  const { data: device } = await db
    .from('gate_devices')
    .select('*')
    .eq('organization_id', org.id)
    .eq('device_id', meta.deviceId)
    .maybeSingle();
  if (!device) return { allowed: false, reason: 'Scanner device is not registered.' };
  if (device.status === 'Blocked') return { allowed: false, reason: 'Scanner device is blocked.' };
  if (device.status !== 'Approved') return { allowed: false, reason: 'Scanner device is pending admin approval.' };
  if (device.gate_staff_id && device.gate_staff_id !== session.gate_staff_id) return { allowed: false, reason: 'Scanner device is approved for a different gate staff member.' };
  if (!validDeviceSignature(device, meta)) return { allowed: false, reason: 'Scanner device signature is missing or invalid.' };
  return { allowed: true, device };
}

async function logScanSecurity({ org, card = null, action = '', result = 'denied', reason = '', session = null, staff = null, gateName = '', meta = {}, source = '' }) {
  const confidence = securityConfidence(meta, result);
  const row = {
    organization_id: org?.id || null,
    organization_name: org?.name || '',
    card_id: card?.id || null,
    card_name: card?.name || '',
    action,
    result,
    reason,
    confidence_score: confidence.confidenceScore,
    alert_level: confidence.alertLevel,
    gate_staff_id: staff?.id || session?.gate_staff_id || null,
    gate_staff_name: staff?.full_name || session?.staff_name || '',
    gate_name: gateName || session?.gate_name || '',
    device_id: meta.deviceId || session?.device_id || '',
    latitude: meta.latitude,
    longitude: meta.longitude,
    location_accuracy: meta.locationAccuracy,
    ip_address: meta.ipAddress || '',
    user_agent: meta.userAgent || '',
    source: source || meta.source || 'gate-app'
  };
  const { data } = await db.from('scan_security_logs').insert(row).select('*').single();
  return data ? toSecurityLog(data) : null;
}

async function denyScan(res, status, message, context) {
  await logScanSecurity({ ...context, result: 'denied', reason: message });
  return res.status(status).json({ error: message });
}

function notificationMessage(type, studentName, balance) {
  const name = studentName || 'your child';
  const amount = Number(balance || 0).toLocaleString();
  if (type === 'fees_cleared') return `Dear Parent, fees for ${name} have been cleared. Thank you.`;
  if (type === 'student_entered') return `Dear Parent, ${name} has entered school/campus.`;
  if (type === 'student_returns') return `Dear Parent, ${name} has returned to school.`;
  if (type === 'student_left') return `Dear Parent, ${name} has left the campus.`;
  if (type === 'sent_home_fees') return `Dear Parent, ${name} has been sent home because of outstanding fees. Kindly contact the school.`;
  return `Dear Parent, your child ${name} has an outstanding balance of KES ${amount}. Kindly clear the fees balance.`;
}

async function logParentNotification(org, card, type, balance = 0) {
  const fields = card?.fields || {};
  const message = notificationMessage(type, card?.name || fields.name, balance);
  const parentEmail = normalizeEmail(fields.parentGuardianEmail || fields.email || '');
  const parentPhone = normalizePhone(fields.parentGuardianPhone);
  const channel = parentEmail ? 'email' : 'sms';
  const initialStatus = parentEmail || parentPhone ? 'Queued' : 'Missing Contact';
  const row = {
    organization_id: org.id,
    organization_name: org.name,
    card_id: card?.id || null,
    admission_number: fields.admissionNumber || fields.matricNumber || '',
    student_name: card?.name || fields.name || '',
    parent_phone: parentPhone,
    parent_email: parentEmail,
    channel,
    notification_type: type,
    message,
    status: initialStatus,
    delivery_status: initialStatus
  };
  const { data } = await db.from('parent_notifications').insert(row).select('*').single();
  if (!data) return null;
  return toNotification(await deliverParentNotification(data));
}

async function deliverParentNotification(row) {
  if ((row.delivery_status || row.status) !== 'Queued') return row;
  const endpoint = row.channel === 'email' ? process.env.EMAIL_WEBHOOK_URL : process.env.SMS_WEBHOOK_URL;
  if (!endpoint) return row;
  const recipient = row.channel === 'email' ? row.parent_email : row.parent_phone;
  if (!recipient) return row;
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.NOTIFICATION_WEBHOOK_SECRET ? { 'X-Webhook-Secret': process.env.NOTIFICATION_WEBHOOK_SECRET } : {})
      },
      body: JSON.stringify({
        channel: row.channel,
        to: recipient,
        message: row.message,
        organizationId: row.organization_id,
        organizationName: row.organization_name,
        studentName: row.student_name,
        admissionNumber: row.admission_number,
        notificationType: row.notification_type
      })
    });
    const status = response.ok ? 'Sent' : 'Failed';
    const { data } = await db.from('parent_notifications').update({ status, delivery_status: status }).eq('id', row.id).select('*').single();
    return data || { ...row, status, delivery_status: status };
  } catch {
    const { data } = await db.from('parent_notifications').update({ status: 'Failed', delivery_status: 'Failed' }).eq('id', row.id).select('*').single();
    return data || { ...row, status: 'Failed', delivery_status: 'Failed' };
  }
}

function toCard(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    cardType: row.card_type,
    roleType: row.role_type,
    fields: row.fields || {},
    name: row.name,
    location: row.location,
    branch: row.branch,
    nationalId: row.national_id,
    phone: row.phone,
    email: row.email,
    position: row.position,
    photo: row.photo,
    verificationToken: row.verification_token,
    qrPayload: signCardQr(row),
    status: row.status,
    inactiveReason: row.inactive_reason,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toOrg(row) {
  const trialEndsAt = row.back_settings?.subscriptionTrialEndsAt || '';
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    typeLabel: organizationTypes[row.type]?.label || row.type,
    businessNumber: row.business_number,
    email: row.email,
    phone: row.phone,
    logo: row.logo,
    brandColor: row.brand_color,
    templateId: row.template_id,
    ownerName: row.owner_name,
    authUserId: row.auth_user_id || '',
    authorityName: row.back_settings?.authorityName || row.owner_name || '',
    authoritySignature: row.back_settings?.authoritySignature || '',
    status: row.status,
    subscriptionStatus: row.subscription_status,
    subscriptionTrialEndsAt: trialEndsAt,
    subscriptionActive: hasActiveSubscription(row),
    backSettings: row.back_settings || {},
    masterCard: row.master_card || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function hasActiveSubscription(org) {
  if (!org || org.subscription_status !== 'Active') return false;
  const trialEndsAt = org.back_settings?.subscriptionTrialEndsAt;
  if (!trialEndsAt) return true;
  const end = Date.parse(trialEndsAt);
  return Number.isNaN(end) || end >= Date.now();
}

async function ensureFreeTrial(org) {
  if (!org || org.back_settings?.subscriptionTrialEndsAt || org.subscription_status === 'Active') return org;
  const currentMaster = normalizeMasterCard(org);
  const backSettings = {
    ...(org.back_settings || {}),
    subscriptionPlan: 'One month free trial',
    subscriptionTrialEndsAt: oneMonthFromNow()
  };
  const masterCard = {
    ...currentMaster,
    status: 'Active',
    issuedAt: currentMaster.issuedAt || new Date().toISOString()
  };
  const { data } = await db
    .from('organizations')
    .update({ status: 'Active', subscription_status: 'Active', back_settings: backSettings, master_card: masterCard, updated_at: new Date().toISOString() })
    .eq('id', org.id)
    .select('*')
    .single();
  return data || org;
}

function cardValidity(card, org) {
  if (!org) return { valid: false, reason: 'Organization not found.' };
  if (!hasActiveSubscription(org)) return { valid: false, reason: 'Organization subscription is not active.' };
  if ((card.status || 'Pending') !== 'Approved') return { valid: false, reason: 'Card has not been approved.' };
  return { valid: true, reason: 'Organization subscription active and card approved.' };
}

async function verifyCardToken(token) {
  const signed = readCardQr(token);
  const normalizedToken = signed?.token || extractVerificationToken(token);
  let query = db.from('cards').select('*').eq('verification_token', normalizedToken || '');
  if (signed?.cardId) query = query.eq('id', signed.cardId);
  const { data: card, error } = await query.maybeSingle();
  if (error || !card) return { valid: false, reason: 'Card token was not found.' };
  const org = card.organization_id ? await getOrg(card.organization_id) : null;
  const validity = cardValidity(card, org);
  const fields = card.fields || {};
  const details = {
    Organization: org?.name || card.organization_name || '',
    Type: org ? (organizationTypes[org.type]?.label || org.type) : '',
    Name: card.name,
    Role: organizationTypes[org?.type]?.roles?.[card.role_type]?.label || card.role_type || card.position,
    Number: fields.displayNumber || fields.admissionNumber || fields.matricNumber || fields.staffId || fields.employeeId || '',
    ParentPhone: card.role_type === 'student' ? fields.parentGuardianPhone || '' : '',
    Status: card.status,
    Subscription: org?.subscription_status || '',
    Reason: validity.reason
  };
  return { ...validity, details };
}

function sanitizeBackSettings(settings, org = {}) {
  const orgType = org?.type || settings.type || 'custom';
  const typeLabel = organizationTypes[orgType]?.label || 'Organization';
  const sanitized = {
    returnTitle: normalizeText(settings.returnTitle) || 'If found please return to:',
    returnName: normalizeText(settings.returnName) || org?.name || '',
    poBox: normalizeText(settings.poBox),
    addressLine1: normalizeText(settings.addressLine1),
    addressLine2: normalizeText(settings.addressLine2),
    phone: normalizeText(settings.phone) || org?.phone || '',
    returnDesk: normalizeText(settings.returnDesk) || 'Admin Office',
    responsibilityTitle: normalizeText(settings.responsibilityTitle) || `${typeLabel} Cardholder Responsibilities:`,
    cardholderResponsibilities: normalizeText(settings.cardholderResponsibilities) || 'Use only by the approved cardholder. Display this card while on duty or premises.',
    lostInstruction: normalizeText(settings.lostInstruction) || 'Report lost cards immediately.',
    authorityName: normalizeText(settings.authorityName) || org?.owner_name || '',
    authoritySignature: normalizeText(settings.authoritySignature),
    cardExpiryDate: normalizeText(settings.cardExpiryDate),
    schoolType: orgType === 'school' ? normalizeText(settings.schoolType) || 'day' : '',
    weekendReleaseAllowed: orgType === 'school' ? normalizeText(settings.weekendReleaseAllowed) || 'no' : '',
    holidayDates: orgType === 'school' ? normalizeText(settings.holidayDates) : '',
    holidayNotes: orgType === 'school' ? normalizeText(settings.holidayNotes) : '',
    releasePeriods: orgType === 'school' ? normalizeText(settings.releasePeriods) : '',
    schoolStartTime: orgType === 'school' ? normalizeText(settings.schoolStartTime) || '08:00' : '',
    schoolEndTime: orgType === 'school' ? normalizeText(settings.schoolEndTime) || '16:00' : '',
    gateLatitude: normalizeText(settings.gateLatitude),
    gateLongitude: normalizeText(settings.gateLongitude),
    gateRadiusMeters: normalizeText(settings.gateRadiusMeters),
    mission: '',
    vision: ''
  };
  if (['school', 'university'].includes(orgType)) {
    sanitized.mission = normalizeText(settings.mission);
    sanitized.vision = normalizeText(settings.vision);
  }
  return sanitized;
}

function normalizeMasterCard(org) {
  const card = org?.master_card || {};
  return {
    number: card.number || `${org.id}/MASTER`,
    token: card.token || '',
    status: card.status || 'Inactive',
    issuedAt: card.issuedAt || card.issued_at || '',
    replacedAt: card.replacedAt || card.replaced_at || '',
    downloadedAt: card.downloadedAt || card.downloaded_at || '',
    downloadCount: Number(card.downloadCount || card.download_count || 0)
  };
}

function isCurrentActiveMasterCard(org, token = '') {
  const card = normalizeMasterCard(org);
  return Boolean(
    org &&
    hasActiveSubscription(org) &&
    org.template_id &&
    org.template_id !== 'sample' &&
    card.status === 'Active' &&
    card.token &&
    card.token === token &&
    !card.replacedAt
  );
}

async function findOrgByCurrentMasterToken(token) {
  if (!token) return null;
  const { data: organizations, error } = await db.from('organizations').select('*').contains('master_card', { token });
  if (error || !organizations?.length) return null;
  return organizations.find((org) => isCurrentActiveMasterCard(org, token)) || null;
}

async function loadOrganizationsById() {
  const { data } = await db.from('organizations').select('*');
  return new Map((data || []).map((org) => [org.id, org]));
}

async function audit(action, cardId = '', actor = 'system') {
  await db.from('audit_log').insert({ action, card_id: cardId || null, actor });
}

async function cleanupSecurityData(retentionDays = Number(process.env.SECURITY_LOG_RETENTION_DAYS || 180)) {
  const now = new Date();
  const resetCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const sessionCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const logCutoff = new Date(now.getTime() - Math.max(30, retentionDays) * 24 * 60 * 60 * 1000).toISOString();
  const [resetExpired, resetUsed, sessions, logs] = await Promise.all([
    db.from('password_resets').delete({ count: 'exact' }).lt('expires_at', resetCutoff),
    db.from('password_resets').delete({ count: 'exact' }).not('used_at', 'is', null).lt('used_at', resetCutoff),
    db.from('gate_sessions').delete({ count: 'exact' }).lt('expires_at', sessionCutoff).neq('status', 'On Duty'),
    db.from('scan_security_logs').delete({ count: 'exact' }).lt('created_at', logCutoff)
  ]);
  return {
    expiredResetCodes: resetExpired.count || 0,
    usedResetCodes: resetUsed.count || 0,
    gateSessions: sessions.count || 0,
    securityLogs: logs.count || 0
  };
}

async function adminSettings() {
  const { data } = await db.from('admin_settings').select('*').eq('id', 'default').maybeSingle();
  if (data) return data;
  const { salt, passwordHash } = hashPassword(process.env.ADMIN_PASSWORD || 'admin12345');
  const row = { id: 'default', username: process.env.ADMIN_USER || 'admin', email: process.env.ADMIN_EMAIL || '', salt, password_hash: passwordHash };
  await db.from('admin_settings').upsert(row);
  return row;
}

async function createSupabaseAuthUser(email, password, metadata = {}) {
  if (!supabaseUrl || !supabaseKey) return '';
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata
  });
  if (error) {
    const users = await db.auth.admin.listUsers();
    const existing = users.data?.users?.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (existing) return existing.id;
    throw error;
  }
  return data.user?.id || '';
}

async function verifyOrgPassword(org, password) {
  if (org.auth_user_id && supabaseUrl && supabaseAnonKey) {
    const { error } = await authClient.auth.signInWithPassword({ email: org.email, password: password || '' });
    if (!error) return true;
  }
  return verifyPassword(password || '', org.salt, org.password_hash);
}

async function updateOrgAuthPassword(org, password) {
  if (org.auth_user_id && supabaseUrl && supabaseKey) {
    const { error } = await db.auth.admin.updateUserById(org.auth_user_id, { password });
    if (error) return { error: error.message };
  }
  const { salt, passwordHash } = hashPassword(password || '');
  await db.from('organizations').update({ salt, password_hash: passwordHash, updated_at: new Date().toISOString() }).eq('id', org.id);
  return {};
}

async function createSupabaseRecoveryLink(email) {
  if (!supabaseUrl || !supabaseKey) return {};
  const redirectTo = process.env.PUBLIC_BASE_URL ? `${process.env.PUBLIC_BASE_URL.replace(/\/$/, '')}/portal.html` : undefined;
  const { data, error } = await db.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: redirectTo ? { redirectTo } : undefined
  });
  if (error) return { error: error.message };
  return { actionLink: data?.properties?.action_link || '' };
}

app.get('/api/templates', (req, res) => res.json({ templates, organizationTypes, orgRegistrationFields }));

app.get('/api/verify-card', async (req, res) => {
  res.json(await verifyCardToken(req.query.token));
});

app.post('/api/login', authRateLimit, async (req, res) => {
  let settings;
  try {
    settings = await adminSettings();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  if (!secureEqualText(req.body.username, settings.username) || !verifyPassword(req.body.password || '', settings.salt, settings.password_hash)) {
    return res.status(401).json({ error: 'Invalid admin login.' });
  }
  res.json({ token: signToken({ scope: 'admin', user: settings.username }) });
});

app.get('/api/cards', requireAdmin, async (req, res) => {
  const { data, error } = await db.from('cards').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  const organizations = await loadOrganizationsById();
  res.json({ cards: data.map((card) => {
    const mapped = toCard(card);
    mapped.validity = cardValidity(card, organizations.get(card.organization_id));
    return mapped;
  }) });
});

app.get('/api/attendance', requireAdmin, async (req, res) => {
  const { data, error } = await db.from('attendance_records').select('*').order('created_at', { ascending: false }).limit(1000);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ attendance: (data || []).map(toAttendance) });
});

app.get('/api/fees', requireAdmin, async (req, res) => {
  const { data, error } = await db.from('fee_records').select('*').order('updated_at', { ascending: false, nullsFirst: false }).limit(1000);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ fees: (data || []).map(toFee) });
});

app.get('/api/notifications', requireAdmin, async (req, res) => {
  const { data, error } = await db.from('parent_notifications').select('*').order('created_at', { ascending: false }).limit(1000);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ notifications: (data || []).map(toNotification) });
});

app.get('/api/security-logs', requireAdmin, async (req, res) => {
  const result = normalizeText(req.query.result).toLowerCase();
  const alertLevel = normalizeText(req.query.alertLevel).toLowerCase();
  let query = db.from('scan_security_logs').select('*').order('created_at', { ascending: false }).limit(1000);
  if (['allowed', 'denied'].includes(result)) query = query.eq('result', result);
  if (['none', 'low', 'medium', 'high', 'critical'].includes(alertLevel)) query = query.eq('alert_level', alertLevel);
  if (normalizeText(req.query.gateName)) query = query.ilike('gate_name', `%${normalizeText(req.query.gateName)}%`);
  if (normalizeText(req.query.deviceId)) query = query.ilike('device_id', `%${normalizeText(req.query.deviceId)}%`);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ logs: (data || []).map(toSecurityLog) });
});

app.post('/api/cards', requireAdmin, async (req, res) => {
  const id = `MAN-${Date.now()}`;
  const row = cardRow({ ...req.body, id, status: 'Pending' });
  const { data, error } = await db.from('cards').insert(row).select('*').single();
  if (error) return res.status(400).json({ error: error.message });
  await audit('Created card manually', data.id, req.admin.user);
  res.json({ card: toCard(data) });
});

app.put('/api/cards/:id', requireAdmin, async (req, res) => {
  const existing = await getCard(req.params.id);
  const org = existing?.organization_id ? await getOrg(existing.organization_id) : null;
  const roleType = req.body.roleType || existing?.role_type || '';
  const fields = { ...(existing?.fields || {}), ...req.body };
  if (org) {
    const duplicate = await ensureNoDuplicateIdentity(org, roleType, fields, req.params.id);
    if (duplicate.error) return res.status(409).json({ error: duplicate.error });
  }
  const row = cardRow({ ...req.body, roleType, fields }, false);
  row.updated_at = new Date().toISOString();
  const { data, error } = await db.from('cards').update(row).eq('id', req.params.id).select('*').single();
  if (error) return res.status(400).json({ error: error.message });
  await audit('Updated card', req.params.id, req.admin.user);
  res.json({ card: toCard(data) });
});

app.patch('/api/cards/:id/status', requireAdmin, async (req, res) => {
  const patch = { status: req.body.status, inactive_reason: req.body.inactiveReason || '', updated_at: new Date().toISOString() };
  if (req.body.status === 'Approved') {
    patch.approved_by = req.admin.user;
    patch.approved_at = new Date().toISOString();
  }
  const { data, error } = await db.from('cards').update(patch).eq('id', req.params.id).select('*').single();
  if (error) return res.status(400).json({ error: error.message });
  await audit(`Status changed to ${req.body.status}`, req.params.id, req.admin.user);
  res.json({ card: toCard(data) });
});

app.post('/api/cards/:id/rotate-token', requireAdmin, async (req, res) => {
  const patch = { verification_token: crypto.randomBytes(24).toString('hex'), updated_at: new Date().toISOString() };
  const { data, error } = await db.from('cards').update(patch).eq('id', req.params.id).select('*').single();
  if (error) return res.status(400).json({ error: error.message });
  await audit('Rotated card QR token', req.params.id, req.admin.user);
  res.json({ card: toCard(data) });
});

async function buildAdminBackup() {
  const [cards, organizations, log, attendance, fees, notifications, securityLogs, gateStaff, gateSessions, gateDevices] = await Promise.all([
    db.from('cards').select('*'),
    db.from('organizations').select('*'),
    db.from('audit_log').select('*'),
    db.from('attendance_records').select('*'),
    db.from('fee_records').select('*'),
    db.from('parent_notifications').select('*'),
    db.from('scan_security_logs').select('*'),
    db.from('gate_staff').select('*'),
    db.from('gate_sessions').select('*'),
    db.from('gate_devices').select('*')
  ]);
  return {
    exportedAt: new Date().toISOString(),
    cards: cards.data || [],
    organizations: organizations.data || [],
    auditLog: log.data || [],
    attendanceRecords: attendance.data || [],
    feeRecords: fees.data || [],
    parentNotifications: notifications.data || [],
    scanSecurityLogs: securityLogs.data || [],
    gateStaff: gateStaff.data || [],
    gateSessions: gateSessions.data || [],
    gateDevices: gateDevices.data || []
  };
}

app.get('/api/backup', requireAdmin, async (req, res) => {
  res.status(405).json({ error: 'Use POST /api/backup with the current admin password to export backups.' });
});

app.post('/api/backup', requireAdmin, async (req, res) => {
  const settings = await requireFreshAdminPassword(req, res);
  if (!settings) return;
  const backup = await buildAdminBackup();
  await audit('Exported admin backup JSON', '', req.admin.user);
  res.json(backup);
});

app.post('/api/restore', requireAdmin, async (req, res) => {
  const settings = await requireFreshAdminPassword(req, res);
  if (!settings) return;
  if (Array.isArray(req.body.cards)) await db.from('cards').upsert(req.body.cards);
  if (Array.isArray(req.body.organizations)) await db.from('organizations').upsert(req.body.organizations);
  await audit('Restored backup JSON', '', req.admin.user);
  res.json({ ok: true });
});

app.get('/api/audit', requireAdmin, async (req, res) => {
  const { data, error } = await db.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ log: data || [] });
});

app.get('/api/organizations', requireAdmin, async (req, res) => {
  const { data, error } = await db.from('organizations').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ organizations: data.map(toOrg) });
});

app.delete('/api/organizations', requireAdmin, async (req, res) => {
  if (req.body.confirm !== 'DELETE ORGANIZATIONS') return res.status(400).json({ error: 'Confirmation text is required.' });
  const settings = await requireFreshAdminPassword(req, res);
  if (!settings) return;
  const { count: cardCount } = await db.from('cards').delete({ count: 'exact' }).not('organization_id', 'is', null);
  const { count: orgCount } = await db.from('organizations').delete({ count: 'exact' }).neq('id', '');
  await audit('Deleted all organization accounts', '', req.admin.user);
  res.json({ deletedOrganizations: orgCount || 0, deletedOrganizationCards: cardCount || 0 });
});

app.post('/api/maintenance/cleanup', requireAdmin, async (req, res) => {
  const settings = await requireFreshAdminPassword(req, res);
  if (!settings) return;
  const deleted = await cleanupSecurityData(Number(req.body.retentionDays || process.env.SECURITY_LOG_RETENTION_DAYS || 180));
  await audit('Cleaned up expired security data', '', req.admin.user);
  res.json({ deleted });
});

app.patch('/api/organizations/:id/subscription', requireAdmin, async (req, res) => {
  const current = await getOrg(req.params.id);
  const currentMaster = normalizeMasterCard(current);
  const nextSubscription = req.body.subscriptionStatus || current?.subscription_status || 'Pending';
  const nextMaster = {
    ...currentMaster,
    status: nextSubscription === 'Active' ? 'Active' : 'Inactive',
    issuedAt: currentMaster.issuedAt || new Date().toISOString()
  };
  const { data, error } = await db.from('organizations').update({
    status: req.body.status,
    subscription_status: nextSubscription,
    master_card: nextMaster,
    updated_at: new Date().toISOString()
  }).eq('id', req.params.id).select('*').single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ organization: toOrg(data) });
});

app.post('/api/organizations/sample-client', requireAdmin, async (req, res) => {
  req.body.type = req.body.type || 'company';
  req.body.ownerName = req.body.ownerName || 'Sample Owner';
  const result = await createOrganization(req.body, 'Active', 'Active');
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ organization: toOrg(result.data), message: 'Sample client is ready.' });
});

app.post('/api/change-password', requireAdmin, async (req, res) => {
  const passwordError = validatePassword(req.body.password);
  if (passwordError) return res.status(400).json({ error: passwordError });
  const username = normalizeText(req.body.username);
  if (!username) return res.status(400).json({ error: 'Admin username is required.' });
  const { salt, passwordHash } = hashPassword(req.body.password || '');
  await db.from('admin_settings').upsert({ id: 'default', username, email: normalizeEmail(req.body.email), salt, password_hash: passwordHash, updated_at: new Date().toISOString() });
  res.json({ ok: true });
});

app.post('/api/forgot-password', resetRateLimit, async (req, res) => {
  let settings;
  try {
    settings = await adminSettings();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  if (!settings.email || normalizeEmail(req.body.email) !== normalizeEmail(settings.email)) return res.status(404).json({ error: 'Admin email not found.' });
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await db.from('password_resets').insert({ email: settings.email, code, expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() });
  res.json({ message: resetCodeMessage(code) });
});

app.post('/api/org-forgot-password', resetRateLimit, async (req, res) => {
  const email = normalizeText(req.body.email).toLowerCase();
  const { data: org } = await db.from('organizations').select('*').ilike('email', email).maybeSingle();
  if (!org) return res.status(404).json({ error: 'Registered organization admin email not found.' });
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await db.from('password_resets').insert({ email: org.email, code, expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() });
  const recovery = await createSupabaseRecoveryLink(org.email);
  res.json({
    message: process.env.EXPOSE_RESET_CODES === 'true'
      ? `Verification code created: ${code}${recovery.actionLink ? ` | Supabase recovery: ${recovery.actionLink}` : ''}`
      : 'Password reset request created through Supabase Auth.'
  });
});

app.post('/api/org-reset-password', authRateLimit, async (req, res) => {
  const email = normalizeText(req.body.email).toLowerCase();
  const { data } = await db.from('password_resets').select('*').ilike('email', email).eq('code', req.body.code).is('used_at', null).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!data) return res.status(400).json({ error: 'Invalid or expired code.' });
  const { data: org } = await db.from('organizations').select('*').ilike('email', email).maybeSingle();
  if (!org) return res.status(404).json({ error: 'Registered organization admin email not found.' });
  const passwordError = validatePassword(req.body.password);
  if (passwordError) return res.status(400).json({ error: passwordError });
  const update = await updateOrgAuthPassword(org, req.body.password || '');
  if (update.error) return res.status(400).json({ error: update.error });
  await db.from('password_resets').update({ used_at: new Date().toISOString() }).eq('id', data.id);
  res.json({ ok: true });
});

app.post('/api/reset-password', authRateLimit, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { data } = await db.from('password_resets').select('*').ilike('email', email).eq('code', req.body.code).is('used_at', null).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!data) return res.status(400).json({ error: 'Invalid or expired code.' });
  const settings = await adminSettings();
  if (email !== normalizeEmail(settings.email)) return res.status(400).json({ error: 'Invalid or expired code.' });
  const passwordError = validatePassword(req.body.password);
  if (passwordError) return res.status(400).json({ error: passwordError });
  const { salt, passwordHash } = hashPassword(req.body.password || '');
  await db.from('admin_settings').update({ salt, password_hash: passwordHash, updated_at: new Date().toISOString() }).eq('id', settings.id);
  await db.from('password_resets').update({ used_at: new Date().toISOString() }).eq('id', data.id);
  res.json({ ok: true });
});

app.post('/api/organizations/register', async (req, res) => {
  const result = await createOrganization(req.body, 'Active', 'Active', { freeTrial: true });
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ organization: toOrg(result.data) });
});

app.post('/api/org-login', authRateLimit, async (req, res) => {
  let { data: org, error } = await db.from('organizations').select('*').ilike('email', req.body.email).maybeSingle();
  if (error || !org || !(await verifyOrgPassword(org, req.body.password || ''))) return res.status(401).json({ error: 'Invalid organization login.' });
  org = await ensureFreeTrial(org);
  res.json({ token: signToken({ scope: 'org', orgId: org.id }), organization: toOrg(org), templates, locked: !hasActiveSubscription(org) });
});

app.get('/api/org/master-card', requireOrg, async (req, res) => {
  let org = await getOrg(req.orgId);
  org = await ensureFreeTrial(org);
  if (!org) return res.status(404).json({ error: 'Organization not found.' });
  if (!hasActiveSubscription(org)) return res.status(403).json({ error: 'Subscription must be active before downloading the master card.' });
  if (!org.template_id || org.template_id === 'sample') return res.status(400).json({ error: 'Choose and save an ID template before downloading the master card.' });
  const masterCard = normalizeMasterCard(org);
  if (!isCurrentActiveMasterCard(org, masterCard.token)) return res.status(409).json({ error: 'No active master card is available for this organization.' });
  const updatedMasterCard = { ...masterCard, downloadedAt: new Date().toISOString(), downloadCount: masterCard.downloadCount + 1 };
  await db.from('organizations').update({ master_card: updatedMasterCard, updated_at: new Date().toISOString() }).eq('id', org.id);
  res.json({
    masterCard: {
      ...masterCard,
      organization: toOrg(org),
      backSettings: org.back_settings || {},
      qrUrl: `${req.protocol}://${req.get('host')}/?master=${encodeURIComponent(masterCard.token || '')}#apply`
    }
  });
});

app.get('/api/org/register-info', async (req, res) => {
  const org = await findOrgByCurrentMasterToken(req.query.token);
  if (!org) return res.status(404).json({ error: 'This master card is not active. Registration forms are closed until the organization subscription is active.' });
  res.json({ organization: toOrg(org), rules: organizationTypes[org.type] || organizationTypes.custom });
});

app.post('/api/org/apply', async (req, res) => {
  const org = await findOrgByCurrentMasterToken(req.body.masterToken);
  if (!org) return res.status(404).json({ error: 'This master card is not active. Registration forms are closed until the organization subscription is active.' });
  const fields = req.body.fields || {};
  const validation = validateRoleFields(org, req.body.roleType, fields);
  if (validation.error) return res.status(400).json({ error: validation.error });
  const duplicate = await ensureNoDuplicateIdentity(org, req.body.roleType, fields);
  if (duplicate.error) return res.status(409).json({ error: duplicate.error });
  const id = `${org.id}-${Date.now()}`;
  const row = cardRow({ ...fields, id, organizationId: org.id, organizationName: org.name, organizationType: org.type, cardType: 'organization', roleType: req.body.roleType, status: 'Pending', fields });
  const { data, error } = await db.from('cards').insert(row).select('*').single();
  if (error) return res.status(400).json({ error: error.message });
  await audit('Organization registration submitted', data.id, org.name);
  res.json({ card: toCard(data) });
});

app.get('/api/org/cards', requireOrg, async (req, res) => {
  const org = await getOrg(req.orgId);
  if (!org || !hasActiveSubscription(org)) return res.status(403).json({ error: 'Subscription must be active before managing registrations.' });
  const { data, error } = await db.from('cards').select('*').eq('organization_id', req.orgId).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ cards: data.map(toCard) });
});

app.get('/api/org/attendance', requireOrg, async (req, res) => {
  const org = await getOrg(req.orgId);
  if (!org || !hasActiveSubscription(org)) return res.status(403).json({ error: 'Subscription must be active before viewing attendance.' });
  const { data, error } = await db.from('attendance_records').select('*').eq('organization_id', req.orgId).order('created_at', { ascending: false }).limit(500);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ attendance: (data || []).map(toAttendance) });
});

app.get('/api/org/dashboard-summary', requireOrg, async (req, res) => {
  const org = await getOrg(req.orgId);
  if (!org) return res.status(404).json({ error: 'Organization not found.' });
  const [cards, attendance, fees] = await Promise.all([
    db.from('cards').select('*').eq('organization_id', req.orgId),
    db.from('attendance_records').select('*').eq('organization_id', req.orgId).order('created_at', { ascending: false }).limit(10),
    db.from('fee_records').select('*').eq('organization_id', req.orgId)
  ]);
  if (cards.error) return res.status(500).json({ error: cards.error.message });
  const cardRows = cards.data || [];
  const feeRows = fees.data || [];
  res.json({
    summary: {
      totalStudents: cardRows.filter((card) => card.role_type === 'student').length,
      activeCards: cardRows.filter((card) => card.status === 'Approved').length,
      suspendedStudents: cardRows.filter((card) => card.role_type === 'student' && ['Suspended', 'Inactive'].includes(card.status)).length,
      feeDefaulters: feeRows.filter((fee) => fee.fee_status === 'Fee Defaulter').length,
      clearedStudents: feeRows.filter((fee) => fee.fee_status === 'Cleared').length,
      partialBalance: feeRows.filter((fee) => fee.fee_status === 'Partial Balance').length,
      feeBalanceTotal: feeRows.reduce((sum, fee) => sum + Number(fee.balance || 0), 0)
    },
    recentScans: (attendance.data || []).map(toAttendance)
  });
});

app.get('/api/org/fees', requireOrg, async (req, res) => {
  const { data, error } = await db.from('fee_records').select('*').eq('organization_id', req.orgId).order('updated_at', { ascending: false, nullsFirst: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ fees: (data || []).map(toFee) });
});

app.post('/api/org/fees/upload', requireOrg, async (req, res) => {
  const org = await getOrg(req.orgId);
  if (!org || !hasActiveSubscription(org)) return res.status(403).json({ error: 'Subscription must be active before managing fees.' });
  if (!['school', 'university'].includes(org.type)) return res.status(400).json({ error: 'Fee management is available for schools and universities.' });
  const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
  if (!rows.length) return res.status(400).json({ error: 'Upload at least one fee row.' });
  const cards = await db.from('cards').select('*').eq('organization_id', req.orgId).eq('role_type', 'student');
  const cardByAdmission = new Map((cards.data || []).map((card) => [normalizeIdentifier(card.fields?.admissionNumber || card.fields?.matricNumber), card]));
  const payload = rows.map((row) => {
    const admissionNumber = normalizeIdentifier(row.admissionNumber || row['Admission Number'] || row.admission_number);
    const balance = Number(row.balance || row.Balance || 0);
    const explicitStatus = normalizeText(row.feeStatus || row['Fee Status'] || row.fee_status);
    return {
      organization_id: org.id,
      organization_name: org.name,
      admission_number: admissionNumber,
      student_name: normalizeText(row.studentName || row['Student Name'] || row.name || row.Name),
      class_grade: normalizeText(row.classGrade || row.Class || row.class || ''),
      balance,
      due_date: normalizeText(row.dueDate || row['Due Date'] || row.due_date) || null,
      fee_status: normalizeFeeStatus(explicitStatus, balance),
      updated_by: req.orgId,
      updated_at: new Date().toISOString()
    };
  }).filter((row) => row.admission_number && row.student_name);
  if (!payload.length) return res.status(400).json({ error: 'No valid rows found. Include Admission Number, Student Name, Class, Balance, Due Date.' });
  const { data, error } = await db.from('fee_records').upsert(payload, { onConflict: 'organization_id,admission_number' }).select('*');
  if (error) return res.status(400).json({ error: error.message });
  const notifications = [];
  for (const fee of data || []) {
    const card = cardByAdmission.get(normalizeIdentifier(fee.admission_number));
    if (!card) continue;
    const type = Number(fee.balance || 0) <= 0 ? 'fees_cleared' : 'fee_balance_updated';
    const notification = await logParentNotification(org, card, type, fee.balance);
    if (notification) notifications.push(notification);
  }
  await audit('Fee balances uploaded', org.id, org.name);
  res.json({ fees: (data || []).map(toFee), notifications });
});

app.post('/api/org/fees/:admissionNumber/notify', requireOrg, async (req, res) => {
  const org = await getOrg(req.orgId);
  if (!org) return res.status(404).json({ error: 'Organization not found.' });
  const admission = normalizeIdentifier(req.params.admissionNumber);
  const { data: cards } = await db.from('cards').select('*').eq('organization_id', req.orgId).eq('role_type', 'student');
  const card = (cards || []).find((item) => normalizeIdentifier(item.fields?.admissionNumber || item.fields?.matricNumber) === admission);
  if (!card) return res.status(404).json({ error: 'Student card not found for this admission number.' });
  const { data: fee } = await db.from('fee_records').select('*').eq('organization_id', req.orgId).ilike('admission_number', req.params.admissionNumber).maybeSingle();
  const notification = await logParentNotification(org, card, req.body.type || 'fee_balance_updated', fee?.balance || 0);
  res.json({ notification });
});

app.get('/api/org/notifications', requireOrg, async (req, res) => {
  const { data, error } = await db.from('parent_notifications').select('*').eq('organization_id', req.orgId).order('created_at', { ascending: false }).limit(500);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ notifications: (data || []).map(toNotification) });
});

app.get('/api/org/security-logs', requireOrg, async (req, res) => {
  const result = normalizeText(req.query.result).toLowerCase();
  const alertLevel = normalizeText(req.query.alertLevel).toLowerCase();
  let query = db.from('scan_security_logs').select('*').eq('organization_id', req.orgId).order('created_at', { ascending: false }).limit(500);
  if (['allowed', 'denied'].includes(result)) query = query.eq('result', result);
  if (['none', 'low', 'medium', 'high', 'critical'].includes(alertLevel)) query = query.eq('alert_level', alertLevel);
  if (normalizeText(req.query.gateName)) query = query.ilike('gate_name', `%${normalizeText(req.query.gateName)}%`);
  if (normalizeText(req.query.deviceId)) query = query.ilike('device_id', `%${normalizeText(req.query.deviceId)}%`);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ logs: (data || []).map(toSecurityLog) });
});

async function buildOrgBackup(org, orgId) {
  const [cards, attendance, fees, notifications, securityLogs, gateStaff, gateSessions, gateDevices] = await Promise.all([
    db.from('cards').select('*').eq('organization_id', orgId),
    db.from('attendance_records').select('*').eq('organization_id', orgId),
    db.from('fee_records').select('*').eq('organization_id', orgId),
    db.from('parent_notifications').select('*').eq('organization_id', orgId),
    db.from('scan_security_logs').select('*').eq('organization_id', orgId),
    db.from('gate_staff').select('*').eq('organization_id', orgId),
    db.from('gate_sessions').select('*').eq('organization_id', orgId),
    db.from('gate_devices').select('*').eq('organization_id', orgId)
  ]);
  return {
    exportedAt: new Date().toISOString(),
    organization: toOrg(org),
    cards: cards.data || [],
    attendanceRecords: attendance.data || [],
    feeRecords: fees.data || [],
    parentNotifications: notifications.data || [],
    scanSecurityLogs: securityLogs.data || [],
    gateStaff: gateStaff.data || [],
    gateSessions: gateSessions.data || [],
    gateDevices: gateDevices.data || []
  };
}

app.get('/api/org/backup', requireOrg, async (req, res) => {
  res.status(405).json({ error: 'Use POST /api/org/backup with the organization admin password to export backups.' });
});

app.post('/api/org/backup', requireOrg, async (req, res) => {
  const org = await getOrg(req.orgId);
  if (!org) return res.status(404).json({ error: 'Organization not found.' });
  if (!await requireFreshOrgPassword(req, res, org)) return;
  const backup = await buildOrgBackup(org, req.orgId);
  await audit('Exported organization backup JSON', req.orgId, org.name);
  res.json(backup);
});

app.get('/api/org/gate-staff', requireOrg, async (req, res) => {
  const { data, error } = await db.from('gate_staff').select('*').eq('organization_id', req.orgId).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  const devices = await db.from('gate_devices').select('*').eq('organization_id', req.orgId).order('created_at', { ascending: false });
  res.json({ staff: (data || []).map(toGateStaff), devices: (devices.data || []).map(toGateDevice) });
});

app.post('/api/org/gate-staff', requireOrg, async (req, res) => {
  const org = await getOrg(req.orgId);
  if (!org) return res.status(404).json({ error: 'Organization not found.' });
  const fullName = normalizeText(req.body.fullName);
  const staffCode = normalizeIdentifier(req.body.staffCode);
  const pin = normalizeText(req.body.pin);
  if (!fullName || !staffCode || !pin) return res.status(400).json({ error: 'Full name, staff code, and PIN are required.' });
  const { salt, passwordHash } = hashPassword(pin);
  const row = {
    id: `GATE-${Date.now()}`,
    organization_id: org.id,
    organization_name: org.name,
    full_name: fullName,
    phone: normalizePhone(req.body.phone),
    staff_code: staffCode,
    gate_name: normalizeText(req.body.gateName) || 'Main Gate',
    pin_hash: passwordHash,
    salt,
    status: req.body.status || 'Active'
  };
  const { data, error } = await db.from('gate_staff').insert(row).select('*').single();
  if (error) return res.status(400).json({ error: error.message });
  await audit('Gate staff registered', data.id, org.name);
  res.json({ staff: toGateStaff(data) });
});

app.patch('/api/org/gate-staff/:id', requireOrg, async (req, res) => {
  const patch = {
    status: req.body.status || 'Active',
    gate_name: normalizeText(req.body.gateName) || 'Main Gate',
    updated_at: new Date().toISOString()
  };
  const { data, error } = await db.from('gate_staff').update(patch).eq('id', req.params.id).eq('organization_id', req.orgId).select('*').single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ staff: toGateStaff(data) });
});

app.patch('/api/org/gate-devices/:id', requireOrg, async (req, res) => {
  const status = ['Approved', 'Blocked', 'Pending'].includes(req.body.status) ? req.body.status : 'Pending';
  const patch = {
    status,
    ...(status === 'Approved' ? { approved_at: new Date().toISOString() } : {}),
    updated_at: new Date().toISOString()
  };
  const { data, error } = await db
    .from('gate_devices')
    .update(patch)
    .eq('id', req.params.id)
    .eq('organization_id', req.orgId)
    .select('*')
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ device: toGateDevice(data) });
});

app.post('/api/gate/login', authRateLimit, async (req, res) => {
  const organizationId = normalizeText(req.body.organizationId);
  const staffCode = normalizeIdentifier(req.body.staffCode);
  const pin = normalizeText(req.body.pin);
  const meta = scanMeta(req, 'gate-app');
  const { data: staff } = await db.from('gate_staff').select('*').eq('organization_id', organizationId).eq('staff_code', staffCode).maybeSingle();
  if (!staff || staff.status !== 'Active' || !verifyPassword(pin, staff.salt, staff.pin_hash)) return res.status(401).json({ error: 'Invalid or inactive gate staff login.' });
  const org = await getOrg(staff.organization_id);
  if (!org || !hasActiveSubscription(org)) return res.status(403).json({ error: 'Organization subscription must be active before scanning.' });
  const gateName = normalizeText(req.body.gateName) || staff.gate_name || 'Main Gate';
  const device = await gateDeviceDecision(org, staff, meta, gateName);
  if (!device.allowed) {
    await logScanSecurity({ org, action: 'login', result: 'denied', reason: device.reason, staff, gateName, meta, source: 'gate-app' });
    return res.status(403).json({ error: device.reason, deviceId: meta.deviceId });
  }
  const gps = await gpsDecision(org, gateName, meta);
  if (!gps.allowed) {
    await logScanSecurity({ org, action: 'login', result: 'denied', reason: gps.reason, staff, gateName, meta, source: 'gate-app' });
    return res.status(403).json({ error: gps.reason, deviceId: meta.deviceId });
  }
  const session = {
    id: `SHIFT-${Date.now()}`,
    organization_id: org.id,
    gate_staff_id: staff.id,
    staff_name: staff.full_name,
    gate_name: gateName,
    device_id: meta.deviceId,
    user_agent: meta.userAgent,
    session_token: crypto.randomBytes(24).toString('hex'),
    status: 'On Duty',
    expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
  };
  const { data, error } = await db.from('gate_sessions').insert(session).select('*').single();
  if (error) return res.status(400).json({ error: error.message });
  await audit('Gate staff started duty', staff.id, staff.full_name);
  res.json({ session: toGateSession(data), organization: toOrg(org), staff: toGateStaff(staff), deviceSecret: device.device?.device_secret || '' });
});

app.post('/api/gate/logout', async (req, res) => {
  const { session } = await readGateSession(req.body.sessionToken);
  if (!session) return res.status(401).json({ error: 'Gate session not active.' });
  await db.from('gate_sessions').update({ status: 'Out of Duty', ended_at: new Date().toISOString() }).eq('id', session.id);
  res.json({ ok: true });
});

app.post('/api/gate/preview', gateRateLimit, async (req, res) => {
  const { session, org } = await readGateSession(req.body.sessionToken);
  if (!session) return res.status(401).json({ error: 'Gate scanner is not on duty.' });
  const action = req.body.action === 'leave' ? 'leave' : 'enter';
  const meta = scanMeta(req, 'gate-app');
  const context = { org, action, session, gateName: session.gate_name, meta, source: 'gate-app' };
  const device = await sessionDeviceDecision(org, session, meta);
  if (!device.allowed) return denyScan(res, 403, device.reason, context);
  const gps = await gpsDecision(org, session.gate_name, meta);
  if (!gps.allowed) return denyScan(res, 403, gps.reason, context);
  const token = extractVerificationToken(req.body.token);
  const { data: card } = await db.from('cards').select('*').eq('verification_token', token).maybeSingle();
  if (!card) return denyScan(res, 404, 'Card token was not found.', context);
  context.card = card;
  if (card.organization_id !== org.id) return denyScan(res, 403, 'This card does not belong to this organization.', context);
  const validity = cardValidity(card, org);
  if (!validity.valid) return denyScan(res, 403, validity.reason, context);
  const closed = movementClosedFor(card, org, action);
  if (closed) return denyScan(res, 403, closed, context);
  const openRecord = await currentOpenMovement(org.id, card.id);
  if (action === 'enter' && openRecord) return denyScan(res, 409, `${card.name} is already marked inside.`, context);
  if (action === 'leave' && !openRecord) return denyScan(res, 409, `${card.name} is already marked outside. No open entry record exists.`, context);
  const fields = card.fields || {};
  const fee = card.role_type === 'student' ? await feeForCard(org, card) : null;
  res.json({
    card: {
      id: card.id,
      name: card.name,
      roleType: card.role_type,
      roleLabel: organizationTypes[org.type]?.roles?.[card.role_type]?.label || card.role_type,
      photo: card.photo,
      number: fields.displayNumber || fields.admissionNumber || fields.matricNumber || fields.staffId || fields.employeeId || fields.nationalId || '',
      classGrade: fields.classGrade || fields.level || fields.department || fields.position || '',
      parentPhone: card.role_type === 'student' ? fields.parentGuardianPhone || '' : ''
    },
    organization: { id: org.id, name: org.name, type: org.type, typeLabel: organizationTypes[org.type]?.label || org.type },
    action,
    fee,
    state: openRecord ? 'Inside' : 'Outside',
    scanChallenge: signGateChallenge({ session, card, action, token })
  });
});

app.post('/api/gate/confirm', gateRateLimit, async (req, res) => {
  const { session, org } = await readGateSession(req.body.sessionToken);
  if (!session) return res.status(401).json({ error: 'Gate scanner is not on duty.' });
  const action = req.body.action === 'leave' ? 'leave' : 'enter';
  const meta = scanMeta(req, 'gate-app');
  const context = { org, action, session, gateName: session.gate_name, meta, source: 'gate-app' };
  const challenge = readGateChallenge(req.body.scanChallenge);
  const token = extractVerificationToken(req.body.token);
  if (!challenge || challenge.sessionId !== session.id || challenge.action !== action || challenge.token !== token) {
    return denyScan(res, 409, 'Gate scan preview expired or does not match this confirmation. Preview the card again.', context);
  }
  const device = await sessionDeviceDecision(org, session, meta);
  if (!device.allowed) return denyScan(res, 403, device.reason, context);
  const gps = await gpsDecision(org, session.gate_name, meta);
  if (!gps.allowed) return denyScan(res, 403, gps.reason, context);
  const { data: card } = await db.from('cards').select('*').eq('verification_token', token).maybeSingle();
  if (!card) return denyScan(res, 404, 'Card token was not found.', context);
  context.card = card;
  if (challenge.cardId !== card.id) return denyScan(res, 409, 'Gate scan challenge belongs to a different card. Preview the card again.', context);
  if (card.organization_id !== org.id) return denyScan(res, 403, 'This card does not belong to this organization.', context);
  const validity = cardValidity(card, org);
  if (!validity.valid) return denyScan(res, 403, validity.reason, context);
  const closed = movementClosedFor(card, org, action);
  if (closed) return denyScan(res, 403, closed, context);
  const fields = card.fields || {};
  const openRecord = await currentOpenMovement(org.id, card.id);
  const number = fields.matricNumber || fields.admissionNumber || fields.displayNumber || fields.staffId || fields.employeeId || fields.nationalId || '';
  if (action === 'enter') {
    if (openRecord) return denyScan(res, 409, `${card.name} is already marked inside.`, context);
    const row = {
      organization_id: org.id,
      organization_name: org.name,
      card_id: card.id,
      student_name: card.name,
      student_number: number,
      class_grade: fields.classGrade || fields.level || fields.department || fields.position || card.role_type || '',
      parent_phone: normalizePhone(fields.parentGuardianPhone),
      attendance_date: new Date().toISOString().slice(0, 10),
      entry_at: new Date().toISOString(),
      entry_by: session.gate_staff_id,
      gate_name: session.gate_name,
      device_id: meta.deviceId,
      scan_source: 'gate-app',
      latitude: meta.latitude,
      longitude: meta.longitude,
      location_accuracy: meta.locationAccuracy,
      security_status: 'allowed',
      security_reason: 'Gate scan allowed.',
      status: 'Inside'
    };
    const { data, error } = await db.from('attendance_records').insert(row).select('*').single();
    if (error) return res.status(400).json({ error: error.message });
    await audit('Gate entry confirmed', card.id, session.staff_name);
    await logScanSecurity({ ...context, result: 'allowed', reason: 'Gate entry confirmed.' });
    if (card.role_type === 'student') await logParentNotification(org, card, 'student_entered', 0);
    return res.json({ attendance: toAttendance(data), message: `${card.name} entry saved.` });
  }
  if (!openRecord) return denyScan(res, 409, `${card.name} is already marked outside.`, context);
  const { data, error } = await db.from('attendance_records').update({
    exit_at: new Date().toISOString(),
    exit_by: session.gate_staff_id,
    gate_name: session.gate_name,
    device_id: meta.deviceId,
    scan_source: 'gate-app',
    latitude: meta.latitude,
    longitude: meta.longitude,
    location_accuracy: meta.locationAccuracy,
    security_status: 'allowed',
    security_reason: 'Gate scan allowed.',
    status: 'Left',
    updated_at: new Date().toISOString()
  }).eq('id', openRecord.id).select('*').single();
  if (error) return res.status(400).json({ error: error.message });
  await audit('Gate exit confirmed', card.id, session.staff_name);
  await logScanSecurity({ ...context, result: 'allowed', reason: 'Gate exit confirmed.' });
  if (card.role_type === 'student') await logParentNotification(org, card, 'student_left', 0);
  res.json({ attendance: toAttendance(data), message: `${card.name} exit saved.` });
});

app.post('/api/org/gate-scan', requireOrg, gateRateLimit, async (req, res) => {
  const org = await getOrg(req.orgId);
  if (!org || !hasActiveSubscription(org)) return res.status(403).json({ error: 'Subscription must be active before gate scanning.' });
  const action = req.body.action === 'leave' ? 'leave' : 'enter';
  const token = extractVerificationToken(req.body.token);
  const gateName = normalizeText(req.body.gateName) || 'Main Gate';
  const meta = scanMeta(req, 'admin-dashboard');
  const context = { org, action, gateName, meta, source: 'admin-dashboard' };
  const gps = await gpsDecision(org, gateName, meta);
  if (!gps.allowed) {
    const overrideReason = normalizeText(req.body.securityOverrideReason);
    const overridePassword = normalizeText(req.body.adminPassword);
    if (!overrideReason || !overridePassword) return denyScan(res, 403, `${gps.reason} Admin override requires current password and reason.`, context);
    if (!await verifyOrgPassword(org, overridePassword)) return denyScan(res, 403, 'Admin override password is invalid.', context);
    await logScanSecurity({ ...context, result: 'allowed', reason: `Admin override: ${overrideReason}. Original block: ${gps.reason}` });
  }
  const { data: card, error } = await db.from('cards').select('*').eq('verification_token', token).maybeSingle();
  if (error || !card) return denyScan(res, 404, 'Card token was not found.', context);
  context.card = card;
  if (card.organization_id !== req.orgId) return denyScan(res, 403, 'This card does not belong to your organization.', context);
  const validity = cardValidity(card, org);
  if (!validity.valid) return denyScan(res, 403, validity.reason, context);
  const closed = movementClosedFor(card, org, action);
  if (closed) return denyScan(res, 403, closed, context);
  const fields = card.fields || {};
  const personNumber = fields.matricNumber || fields.admissionNumber || fields.displayNumber || fields.staffId || fields.employeeId || fields.nationalId || '';
  const today = new Date().toISOString().slice(0, 10);
  const openRecord = await currentOpenMovement(req.orgId, card.id);
  if (action === 'enter') {
    if (openRecord) return denyScan(res, 409, `${card.name} is already marked inside.`, context);
    const row = {
      organization_id: org.id,
      organization_name: org.name,
      card_id: card.id,
      student_name: card.name,
      student_number: personNumber,
      class_grade: fields.classGrade || fields.level || fields.department || fields.position || card.role_type || '',
      parent_phone: normalizePhone(fields.parentGuardianPhone),
      attendance_date: today,
      entry_at: new Date().toISOString(),
      entry_by: req.orgId,
      gate_name: gateName,
      device_id: meta.deviceId,
      scan_source: 'admin-dashboard',
      latitude: meta.latitude,
      longitude: meta.longitude,
      location_accuracy: meta.locationAccuracy,
      security_status: 'allowed',
      security_reason: 'Admin dashboard scan allowed.',
      status: 'Inside'
    };
    const { data, error: insertError } = await db.from('attendance_records').insert(row).select('*').single();
    if (insertError) return res.status(400).json({ error: insertError.message });
    await audit('Gate entry scanned by admin', card.id, org.name);
    await logScanSecurity({ ...context, result: 'allowed', reason: 'Admin dashboard entry confirmed.' });
    if (card.role_type === 'student') await logParentNotification(org, card, 'student_entered', 0);
    return res.json({ attendance: toAttendance(data), message: `${card.name} entered at ${new Date(data.entry_at).toLocaleTimeString()}.` });
  }
  if (!openRecord) return denyScan(res, 409, `${card.name} is already marked outside. Scan entering first.`, context);
  const { data, error: updateError } = await db.from('attendance_records').update({
    exit_at: new Date().toISOString(),
    exit_by: req.orgId,
    gate_name: gateName,
    device_id: meta.deviceId,
    scan_source: 'admin-dashboard',
    latitude: meta.latitude,
    longitude: meta.longitude,
    location_accuracy: meta.locationAccuracy,
    security_status: 'allowed',
    security_reason: 'Admin dashboard scan allowed.',
    status: 'Left',
    updated_at: new Date().toISOString()
  }).eq('id', openRecord.id).select('*').single();
  if (updateError) return res.status(400).json({ error: updateError.message });
  await audit('Gate exit scanned by admin', card.id, org.name);
  await logScanSecurity({ ...context, result: 'allowed', reason: 'Admin dashboard exit confirmed.' });
  if (card.role_type === 'student') await logParentNotification(org, card, 'student_left', 0);
  res.json({ attendance: toAttendance(data), message: `${card.name} left at ${new Date(data.exit_at).toLocaleTimeString()}.` });
});

app.patch('/api/org/cards/:id/status', requireOrg, async (req, res) => {
  const org = await getOrg(req.orgId);
  if (!org || !hasActiveSubscription(org)) return res.status(403).json({ error: 'Subscription must be active before approving ID cards.' });
  const patch = { status: req.body.status, updated_at: new Date().toISOString() };
  if (req.body.status === 'Approved') patch.approved_at = new Date().toISOString();
  const { data, error } = await db.from('cards').update(patch).eq('id', req.params.id).eq('organization_id', req.orgId).select('*').single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ card: toCard(data) });
});

app.post('/api/org/cards/:id/rotate-token', requireOrg, async (req, res) => {
  const patch = { verification_token: crypto.randomBytes(24).toString('hex'), updated_at: new Date().toISOString() };
  const { data, error } = await db.from('cards').update(patch).eq('id', req.params.id).eq('organization_id', req.orgId).select('*').single();
  if (error) return res.status(400).json({ error: error.message });
  await audit('Organization rotated card QR token', req.params.id, req.orgId);
  res.json({ card: toCard(data) });
});

app.patch('/api/org/back-settings', requireOrg, async (req, res) => {
  const org = await getOrg(req.orgId);
  const settings = sanitizeBackSettings(req.body.backSettings || {}, org);
  updateOrg(req, res, { back_settings: settings, owner_name: settings.authorityName || org?.owner_name || '' });
});
app.patch('/api/org/branding', requireOrg, async (req, res) => updateOrg(req, res, {
  logo: req.body.logo || '',
  brand_color: req.body.brandColor || '#357fbd',
  template_id: req.body.templateId || 'sample'
}));

function cardRow(input, includeGenerated = true) {
  const fields = input.fields || {};
  const roleType = input.roleType || input.role_type || '';
  const orgType = input.organizationType || input.organization_type || '';
  const number = displayNumberFor(fields, roleType, orgType);
  return {
    ...(includeGenerated ? { id: input.id || `CARD-${Date.now()}`, verification_token: crypto.randomBytes(24).toString('hex') } : {}),
    organization_id: input.organizationId || input.organization_id || null,
    organization_name: input.organizationName || input.organization_name || '',
    card_type: input.cardType || input.card_type || 'user',
    role_type: roleType,
    fields,
    name: input.name || fields.name || '',
    location: input.location || fields.location || '',
    branch: input.branch || fields.branch || fields.department || fields.classGrade || fields.faculty || fields.site || '',
    national_id: normalizeIdentifier(input.nationalId || input.national_id || fields.nationalId || ''),
    phone: input.phone || fields.phone || '',
    email: input.email || fields.email || '',
    position: input.position || fields.position || fields.role || fields.department || roleType || '',
    photo: input.photo || fields.photo || '',
    ...(number && !fields.displayNumber ? { fields: { ...fields, displayNumber: number } } : {}),
    status: input.status || 'Pending',
    inactive_reason: input.inactiveReason || input.inactive_reason || ''
  };
}

async function createOrganization(body, status, subscriptionStatus, options = {}) {
  const type = body.type || 'custom';
  const registrationRule = orgRegistrationFields[type] || orgRegistrationFields.custom;
  if (!body.name || !body.email || !body.password || !body.businessNumber) return { error: `${registrationRule.nameLabel}, admin email, password, and ${registrationRule.registrationLabel} are required.` };
  if (body.confirmPassword !== undefined && body.password !== body.confirmPassword) return { error: 'Password and confirm password must match.' };
  if (String(body.password).length < 8) return { error: 'Password must be at least 8 characters.' };
  if (registrationRule.requiresMissionVision && (!normalizeText(body.mission) || !normalizeText(body.vision))) return { error: 'Mission and vision are required for schools and universities.' };
  if (type === 'school' && !['day', 'boarding', 'mixed'].includes(normalizeText(body.schoolType))) return { error: 'Choose school type: day, boarding, or mixed.' };
  const id = `${String(body.name).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 4).toUpperCase() || 'ORG'}-${Date.now()}`;
  const { salt, passwordHash } = hashPassword(body.password);
  let authUserId = '';
  try {
    authUserId = await createSupabaseAuthUser(body.email.trim(), body.password, { organizationId: id, organizationName: body.name.trim(), role: 'organization-admin' });
  } catch (error) {
    return { error: `Supabase Auth user could not be created: ${error.message}` };
  }
  const trialEndsAt = options.freeTrial ? oneMonthFromNow() : '';
  const masterCard = { number: `${id}/MASTER`, token: crypto.randomBytes(24).toString('hex'), status: subscriptionStatus === 'Active' ? 'Active' : 'Inactive', issuedAt: new Date().toISOString(), replacedAt: '' };
  const backSettings = sanitizeBackSettings({
    returnName: body.name,
    poBox: body.poBox,
    phone: body.returnPhone || body.phone,
    returnDesk: body.returnDesk || body.reportInstruction,
    lostInstruction: body.reportInstruction,
    cardholderResponsibilities: body.cardholderResponsibilities,
    schoolType: body.schoolType,
    mission: body.mission,
    vision: body.vision,
    authorityName: body.ownerName,
    authoritySignature: body.authoritySignature
  }, { name: body.name.trim(), type, phone: body.phone || '', owner_name: body.ownerName || '' });
  const row = {
    id,
    name: body.name.trim(),
    type,
    business_number: body.businessNumber.trim(),
    email: body.email.trim(),
    phone: body.phone || '',
    logo: body.logo || '',
    brand_color: body.brandColor || '#357fbd',
    template_id: body.templateId || 'sample',
    owner_name: body.ownerName || '',
    auth_user_id: authUserId,
    salt,
    password_hash: passwordHash,
    status,
    subscription_status: subscriptionStatus,
    back_settings: {
      ...orgDefaults(body.name.trim()),
      ...backSettings,
      ...(trialEndsAt ? { subscriptionPlan: 'One month free trial', subscriptionTrialEndsAt: trialEndsAt } : {})
    },
    master_card: masterCard
  };
  let { data, error } = await db.from('organizations').insert(row).select('*').single();
  if (error && isMissingColumnError(error, 'auth_user_id')) {
    const legacyRow = { ...row };
    delete legacyRow.auth_user_id;
    ({ data, error } = await db.from('organizations').insert(legacyRow).select('*').single());
  }
  return error ? { error: error.message } : { data };
}

async function getOrg(id) {
  const { data } = await db.from('organizations').select('*').eq('id', id).maybeSingle();
  return data;
}

async function getCard(id) {
  const { data } = await db.from('cards').select('*').eq('id', id).maybeSingle();
  return data;
}

async function updateOrg(req, res, patch) {
  const { data, error } = await db.from('organizations').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', req.orgId).select('*').single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ organization: toOrg(data), templates });
}

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found.' });
  }
  if (req.method === 'GET') {
    return sendStaticFile(res, 'portal.html');
  }
  return res.status(404).send('Not found');
});

export {
  app,
  cardRow,
  createRateLimit,
  distanceMeters,
  extractVerificationToken,
  gateConfigFor,
  gpsSecurity,
  hashPassword,
  normalizeEmail,
  normalizeIdentifier,
  normalizePhone,
  readToken,
  secureEqualText,
  signToken,
  validatePassword,
  validCoordinate,
  validateRuntimeConfig,
  verifyPassword
};

export default app;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  app.listen(port, () => {
    console.log(`VeriCard running at http://localhost:${port}`);
  });
}
