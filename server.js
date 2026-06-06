import 'dotenv/config';
import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = process.env.PORT || 3000;
const sessionSecret = process.env.SESSION_SECRET || 'mapphex-local-secret';
const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
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
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
if (!isSupabaseConfigured) {
  console.warn('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to .env before using the API.');
}
const db = createClient(supabaseUrl || 'http://localhost', supabaseKey || 'missing-key', {
  auth: { persistSession: false }
});

app.use(express.json({ limit: '8mb' }));

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
  if (!requested) {
    if (!isProduction) console.warn(`Static file not found: ${filePath}`);
    return res.status(404).send('Not found');
  }
  return res.sendFile(requested);
}

app.get('/', async (req, res) => {
  if (!req.query.token) return sendStaticFile(res, 'index.html');
  const result = await verifyCardToken(req.query.token);
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
    teacher: role('Teacher', ['name', 'nationalId', 'staffId', 'department', 'phone', 'email', 'photo'], ['subject']),
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

function signToken(payload) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 1000 * 60 * 60 * 12 })).toString('base64url');
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

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
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

function studentUniqueField(orgType) {
  return orgType === 'university' ? 'matricNumber' : 'admissionNumber';
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
    return parsed.searchParams.get('token') || text;
  } catch {
    return text.replace(/^.*[?&]token=/, '').split('&')[0];
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
  let duplicateField = '';
  let duplicateValue = '';
  if (isStudentRole(roleType) && ['school', 'university'].includes(org.type)) {
    duplicateField = studentUniqueField(org.type);
    duplicateValue = normalizedStudentId;
  } else {
    duplicateField = 'nationalId';
    duplicateValue = normalizedNationalId;
  }
  if (!duplicateValue) return { error: `${duplicateField.replace(/([A-Z])/g, ' $1')} is required.` };
  const { data, error } = await db
    .from('cards')
    .select('id, fields, national_id, role_type')
    .eq('organization_id', org.id)
    .eq('role_type', roleType);
  if (error) return { error: error.message };
  const duplicate = (data || []).find((card) => {
    if (currentId && card.id === currentId) return false;
    if (duplicateField === 'nationalId') return normalizeIdentifier(card.national_id || card.fields?.nationalId) === duplicateValue;
    return normalizeIdentifier(card.fields?.[duplicateField]) === duplicateValue;
  });
  if (duplicate) {
    return { error: `Duplicate ${duplicateField.replace(/([A-Z])/g, ' $1')} found for this organization and role.` };
  }
  return {};
}

function buildVerificationHtml(result) {
  const valid = result.valid;
  const title = valid ? 'VALID ID CARD' : 'INVALID ID CARD';
  const color = valid ? '#166534' : '#991b1b';
  const details = Object.entries(result.details || {})
    .filter(([, value]) => value)
    .map(([key, value]) => `<div><span>${escapeHtml(key)}</span><strong>${escapeHtml(value)}</strong></div>`)
    .join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#eef2f6;font-family:Arial,Helvetica,sans-serif;color:#202938}
    main{width:min(520px,calc(100% - 28px));background:#fff;border:1px solid #d9e0ea;border-radius:8px;padding:22px;display:grid;gap:14px}
    h1{margin:0;color:${color};font-size:28px}p{margin:0;font-weight:700;line-height:1.45}.details{display:grid;gap:8px}
    .details div{display:grid;grid-template-columns:150px 1fr;gap:10px;border-top:1px solid #e5eaf0;padding-top:8px}.details span{color:#657489;font-weight:800}.details strong{overflow-wrap:anywhere}
  </style></head><body><main><h1>${title}</h1><p>${escapeHtml(result.reason || '')}</p><section class="details">${details}</section></main></body></html>`;
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
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    expiresAt: row.expires_at
  };
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
      const weekendAllowed = settings.weekendReleaseAllowed === 'yes';
      const isWeekend = day === 0 || day === 6;
      const isHoliday = holidays.includes(today);
      if (!isHoliday && !(weekendAllowed && isWeekend)) return 'Boarding student exit is allowed only during approved weekends or holidays.';
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
  if (!org || org.subscription_status !== 'Active') return {};
  return { session, org };
}

function notificationMessage(type, studentName, balance) {
  const name = studentName || 'your child';
  const amount = Number(balance || 0).toLocaleString();
  if (type === 'fees_cleared') return `Dear Parent, fees for ${name} have been cleared. Thank you.`;
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
    status: row.status,
    inactiveReason: row.inactive_reason,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toOrg(row, options = {}) {
  const masterCard = row.master_card || {};
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
    authorityName: row.back_settings?.authorityName || row.owner_name || '',
    authoritySignature: row.back_settings?.authoritySignature || '',
    status: row.status,
    subscriptionStatus: row.subscription_status,
    backSettings: row.back_settings || {},
    masterCard: options.includeMasterCard ? masterCard : {
      number: masterCard.number || '',
      status: masterCard.status || 'Inactive',
      issuedAt: masterCard.issuedAt || masterCard.issued_at || '',
      replacedAt: masterCard.replacedAt || masterCard.replaced_at || '',
      downloadedAt: masterCard.downloadedAt || masterCard.downloaded_at || '',
      downloadCount: Number(masterCard.downloadCount || masterCard.download_count || 0)
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function cardValidity(card, org) {
  if (!org) return { valid: false, reason: 'Organization not found.' };
  if (org.subscription_status !== 'Active') return { valid: false, reason: 'Organization subscription is not active.' };
  if ((card.status || 'Pending') !== 'Approved') return { valid: false, reason: 'Card has not been approved.' };
  return { valid: true, reason: 'Organization subscription active and card approved.' };
}

async function verifyCardToken(token) {
  const { data: card, error } = await db.from('cards').select('*').eq('verification_token', token || '').maybeSingle();
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
    schoolType: orgType === 'school' ? normalizeText(settings.schoolType) || 'day' : '',
    weekendReleaseAllowed: orgType === 'school' ? normalizeText(settings.weekendReleaseAllowed) || 'no' : '',
    holidayDates: orgType === 'school' ? normalizeText(settings.holidayDates) : '',
    holidayNotes: orgType === 'school' ? normalizeText(settings.holidayNotes) : '',
    schoolStartTime: orgType === 'school' ? normalizeText(settings.schoolStartTime) || '08:00' : '',
    schoolEndTime: orgType === 'school' ? normalizeText(settings.schoolEndTime) || '16:00' : '',
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
    org.subscription_status === 'Active' &&
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

async function adminSettings() {
  const { data } = await db.from('admin_settings').select('*').eq('id', 'default').maybeSingle();
  if (data) return data;
  if (isProduction && (!process.env.ADMIN_USER || !process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === 'admin12345')) {
    throw new Error('ADMIN_USER and a strong ADMIN_PASSWORD must be configured before first admin login.');
  }
  const { salt, passwordHash } = hashPassword(process.env.ADMIN_PASSWORD || 'admin12345');
  const row = { id: 'default', username: process.env.ADMIN_USER || 'admin', email: process.env.ADMIN_EMAIL || '', salt, password_hash: passwordHash };
  await db.from('admin_settings').upsert(row);
  return row;
}

app.get('/api/templates', (req, res) => res.json({ templates, organizationTypes, orgRegistrationFields }));

app.use('/api', (req, res, next) => {
  if (req.path === '/templates') return next();
  if (!isSupabaseConfigured) {
    return res.status(503).json({ error: 'Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' });
  }
  next();
});

app.get('/api/verify-card', async (req, res) => {
  res.json(await verifyCardToken(req.query.token));
});

app.post('/api/login', async (req, res) => {
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

app.get('/api/backup', requireAdmin, async (req, res) => {
  const [cards, organizations, log] = await Promise.all([
    db.from('cards').select('*'),
    db.from('organizations').select('*'),
    db.from('audit_log').select('*')
  ]);
  res.json({ cards: cards.data || [], organizations: organizations.data || [], auditLog: log.data || [] });
});

app.post('/api/restore', requireAdmin, async (req, res) => {
  if (Array.isArray(req.body.cards)) await db.from('cards').upsert(req.body.cards);
  if (Array.isArray(req.body.organizations)) await db.from('organizations').upsert(req.body.organizations);
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
  const { count: cardCount } = await db.from('cards').delete({ count: 'exact' }).not('organization_id', 'is', null);
  const { count: orgCount } = await db.from('organizations').delete({ count: 'exact' }).neq('id', '');
  res.json({ deletedOrganizations: orgCount || 0, deletedOrganizationCards: cardCount || 0 });
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
  const { salt, passwordHash } = hashPassword(req.body.password);
  await db.from('admin_settings').upsert({ id: 'default', username, email: normalizeEmail(req.body.email), salt, password_hash: passwordHash, updated_at: new Date().toISOString() });
  res.json({ ok: true });
});

app.post('/api/forgot-password', async (req, res) => {
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

app.post('/api/org-forgot-password', async (req, res) => {
  const email = normalizeText(req.body.email).toLowerCase();
  const { data: org } = await db.from('organizations').select('*').ilike('email', email).maybeSingle();
  if (!org) return res.status(404).json({ error: 'Registered organization admin email not found.' });
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await db.from('password_resets').insert({ email: org.email, code, expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() });
  res.json({ message: resetCodeMessage(code) });
});

app.post('/api/org-reset-password', async (req, res) => {
  const email = normalizeText(req.body.email).toLowerCase();
  const { data } = await db.from('password_resets').select('*').ilike('email', email).eq('code', req.body.code).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!data) return res.status(400).json({ error: 'Invalid or expired code.' });
  const { data: org } = await db.from('organizations').select('*').ilike('email', email).maybeSingle();
  if (!org) return res.status(404).json({ error: 'Registered organization admin email not found.' });
  const passwordError = validatePassword(req.body.password);
  if (passwordError) return res.status(400).json({ error: passwordError });
  const { salt, passwordHash } = hashPassword(req.body.password);
  await db.from('organizations').update({ salt, password_hash: passwordHash, updated_at: new Date().toISOString() }).eq('id', org.id);
  res.json({ ok: true });
});

app.post('/api/reset-password', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { data } = await db.from('password_resets').select('*').ilike('email', email).eq('code', req.body.code).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!data) return res.status(400).json({ error: 'Invalid or expired code.' });
  let settings;
  try {
    settings = await adminSettings();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  if (email !== normalizeEmail(settings.email)) return res.status(400).json({ error: 'Invalid or expired code.' });
  const passwordError = validatePassword(req.body.password);
  if (passwordError) return res.status(400).json({ error: passwordError });
  const { salt, passwordHash } = hashPassword(req.body.password);
  await db.from('admin_settings').update({ salt, password_hash: passwordHash, updated_at: new Date().toISOString() }).eq('id', settings.id);
  res.json({ ok: true });
});

app.post('/api/organizations/register', async (req, res) => {
  const result = await createOrganization(req.body, 'Pending', 'Pending');
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ organization: toOrg(result.data) });
});

app.post('/api/org-login', async (req, res) => {
  const { data: org, error } = await db.from('organizations').select('*').ilike('email', req.body.email).maybeSingle();
  if (error || !org || !verifyPassword(req.body.password || '', org.salt, org.password_hash)) return res.status(401).json({ error: 'Invalid organization login.' });
  res.json({ token: signToken({ scope: 'org', orgId: org.id }), organization: toOrg(org), templates, locked: org.subscription_status !== 'Active' });
});

app.get('/api/org/master-card', requireOrg, async (req, res) => {
  const org = await getOrg(req.orgId);
  if (!org) return res.status(404).json({ error: 'Organization not found.' });
  if (org.subscription_status !== 'Active') return res.status(403).json({ error: 'Subscription must be active before downloading the master card.' });
  if (!org.template_id || org.template_id === 'sample') return res.status(400).json({ error: 'Choose and save an ID template before downloading the master card.' });
  const masterCard = normalizeMasterCard(org);
  if (!isCurrentActiveMasterCard(org, masterCard.token)) return res.status(409).json({ error: 'No active master card is available for this organization.' });
  const updatedMasterCard = { ...masterCard, downloadedAt: new Date().toISOString(), downloadCount: masterCard.downloadCount + 1 };
  await db.from('organizations').update({ master_card: updatedMasterCard, updated_at: new Date().toISOString() }).eq('id', org.id);
  res.json({ masterCard: { ...masterCard, organization: toOrg(org), qrUrl: `${req.protocol}://${req.get('host')}/?master=${encodeURIComponent(masterCard.token || '')}` } });
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
  if (!org || org.subscription_status !== 'Active') return res.status(403).json({ error: 'Subscription must be active before managing registrations.' });
  const { data, error } = await db.from('cards').select('*').eq('organization_id', req.orgId).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ cards: data.map(toCard) });
});

app.get('/api/org/attendance', requireOrg, async (req, res) => {
  const org = await getOrg(req.orgId);
  if (!org || org.subscription_status !== 'Active') return res.status(403).json({ error: 'Subscription must be active before viewing attendance.' });
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
  if (!org || org.subscription_status !== 'Active') return res.status(403).json({ error: 'Subscription must be active before managing fees.' });
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

app.get('/api/org/gate-staff', requireOrg, async (req, res) => {
  const { data, error } = await db.from('gate_staff').select('*').eq('organization_id', req.orgId).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ staff: (data || []).map(toGateStaff) });
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

app.post('/api/gate/login', async (req, res) => {
  const organizationId = normalizeText(req.body.organizationId);
  const staffCode = normalizeIdentifier(req.body.staffCode);
  const pin = normalizeText(req.body.pin);
  const { data: staff } = await db.from('gate_staff').select('*').eq('organization_id', organizationId).eq('staff_code', staffCode).maybeSingle();
  if (!staff || staff.status !== 'Active' || !verifyPassword(pin, staff.salt, staff.pin_hash)) return res.status(401).json({ error: 'Invalid or inactive gate staff login.' });
  const org = await getOrg(staff.organization_id);
  if (!org || org.subscription_status !== 'Active') return res.status(403).json({ error: 'Organization subscription must be active before scanning.' });
  const session = {
    id: `SHIFT-${Date.now()}`,
    organization_id: org.id,
    gate_staff_id: staff.id,
    staff_name: staff.full_name,
    gate_name: normalizeText(req.body.gateName) || staff.gate_name || 'Main Gate',
    session_token: crypto.randomBytes(24).toString('hex'),
    status: 'On Duty',
    expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
  };
  const { data, error } = await db.from('gate_sessions').insert(session).select('*').single();
  if (error) return res.status(400).json({ error: error.message });
  await audit('Gate staff started duty', staff.id, staff.full_name);
  res.json({ session: toGateSession(data), organization: toOrg(org), staff: toGateStaff(staff) });
});

app.post('/api/gate/logout', async (req, res) => {
  const { session } = await readGateSession(req.body.sessionToken);
  if (!session) return res.status(401).json({ error: 'Gate session not active.' });
  await db.from('gate_sessions').update({ status: 'Out of Duty', ended_at: new Date().toISOString() }).eq('id', session.id);
  res.json({ ok: true });
});

app.post('/api/gate/preview', async (req, res) => {
  const { session, org } = await readGateSession(req.body.sessionToken);
  if (!session) return res.status(401).json({ error: 'Gate scanner is not on duty.' });
  const action = req.body.action === 'leave' ? 'leave' : 'enter';
  const token = extractVerificationToken(req.body.token);
  const { data: card } = await db.from('cards').select('*').eq('verification_token', token).maybeSingle();
  if (!card) return res.status(404).json({ error: 'Card token was not found.' });
  if (card.organization_id !== org.id) return res.status(403).json({ error: 'This card does not belong to this organization.' });
  const validity = cardValidity(card, org);
  if (!validity.valid) return res.status(403).json({ error: validity.reason });
  const closed = movementClosedFor(card, org, action);
  if (closed) return res.status(403).json({ error: closed });
  const openRecord = await currentOpenMovement(org.id, card.id);
  if (action === 'enter' && openRecord) return res.status(409).json({ error: `${card.name} is already marked inside.` });
  if (action === 'leave' && !openRecord) return res.status(409).json({ error: `${card.name} is already marked outside. No open entry record exists.` });
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
    state: openRecord ? 'Inside' : 'Outside'
  });
});

app.post('/api/gate/confirm', async (req, res) => {
  const { session, org } = await readGateSession(req.body.sessionToken);
  if (!session) return res.status(401).json({ error: 'Gate scanner is not on duty.' });
  const action = req.body.action === 'leave' ? 'leave' : 'enter';
  const token = extractVerificationToken(req.body.token);
  const { data: card } = await db.from('cards').select('*').eq('verification_token', token).maybeSingle();
  if (!card) return res.status(404).json({ error: 'Card token was not found.' });
  if (card.organization_id !== org.id) return res.status(403).json({ error: 'This card does not belong to this organization.' });
  const validity = cardValidity(card, org);
  if (!validity.valid) return res.status(403).json({ error: validity.reason });
  const closed = movementClosedFor(card, org, action);
  if (closed) return res.status(403).json({ error: closed });
  const fields = card.fields || {};
  const openRecord = await currentOpenMovement(org.id, card.id);
  const number = fields.matricNumber || fields.admissionNumber || fields.displayNumber || fields.staffId || fields.employeeId || fields.nationalId || '';
  if (action === 'enter') {
    if (openRecord) return res.status(409).json({ error: `${card.name} is already marked inside.` });
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
      status: 'Inside'
    };
    const { data, error } = await db.from('attendance_records').insert(row).select('*').single();
    if (error) return res.status(400).json({ error: error.message });
    await audit('Gate entry confirmed', card.id, session.staff_name);
    if (card.role_type === 'student') await logParentNotification(org, card, 'student_returns', 0);
    return res.json({ attendance: toAttendance(data), message: `${card.name} entry saved.` });
  }
  if (!openRecord) return res.status(409).json({ error: `${card.name} is already marked outside.` });
  const { data, error } = await db.from('attendance_records').update({
    exit_at: new Date().toISOString(),
    exit_by: session.gate_staff_id,
    gate_name: session.gate_name,
    status: 'Left',
    updated_at: new Date().toISOString()
  }).eq('id', openRecord.id).select('*').single();
  if (error) return res.status(400).json({ error: error.message });
  await audit('Gate exit confirmed', card.id, session.staff_name);
  if (card.role_type === 'student') await logParentNotification(org, card, 'student_left', 0);
  res.json({ attendance: toAttendance(data), message: `${card.name} exit saved.` });
});

app.post('/api/org/gate-scan', requireOrg, async (req, res) => {
  const org = await getOrg(req.orgId);
  if (!org || org.subscription_status !== 'Active') return res.status(403).json({ error: 'Subscription must be active before gate scanning.' });
  const action = req.body.action === 'leave' ? 'leave' : 'enter';
  const token = extractVerificationToken(req.body.token);
  const gateName = normalizeText(req.body.gateName) || 'Main Gate';
  const { data: card, error } = await db.from('cards').select('*').eq('verification_token', token).maybeSingle();
  if (error || !card) return res.status(404).json({ error: 'Card token was not found.' });
  if (card.organization_id !== req.orgId) return res.status(403).json({ error: 'This card does not belong to your organization.' });
  const validity = cardValidity(card, org);
  if (!validity.valid) return res.status(403).json({ error: validity.reason });
  const closed = movementClosedFor(card, org, action);
  if (closed) return res.status(403).json({ error: closed });
  const fields = card.fields || {};
  const personNumber = fields.matricNumber || fields.admissionNumber || fields.displayNumber || fields.staffId || fields.employeeId || fields.nationalId || '';
  const today = new Date().toISOString().slice(0, 10);
  const openRecord = await currentOpenMovement(req.orgId, card.id);
  if (action === 'enter') {
    if (openRecord) return res.status(409).json({ error: `${card.name} is already marked inside.` });
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
      status: 'Inside'
    };
    const { data, error: insertError } = await db.from('attendance_records').insert(row).select('*').single();
    if (insertError) return res.status(400).json({ error: insertError.message });
    await audit('Gate entry scanned by admin', card.id, org.name);
    return res.json({ attendance: toAttendance(data), message: `${card.name} entered at ${new Date(data.entry_at).toLocaleTimeString()}.` });
  }
  if (!openRecord) return res.status(409).json({ error: `${card.name} is already marked outside. Scan entering first.` });
  const { data, error: updateError } = await db.from('attendance_records').update({
    exit_at: new Date().toISOString(),
    exit_by: req.orgId,
    gate_name: gateName,
    status: 'Left',
    updated_at: new Date().toISOString()
  }).eq('id', openRecord.id).select('*').single();
  if (updateError) return res.status(400).json({ error: updateError.message });
  await audit('Gate exit scanned by admin', card.id, org.name);
  res.json({ attendance: toAttendance(data), message: `${card.name} left at ${new Date(data.exit_at).toLocaleTimeString()}.` });
});

app.patch('/api/org/cards/:id/status', requireOrg, async (req, res) => {
  const org = await getOrg(req.orgId);
  if (!org || org.subscription_status !== 'Active') return res.status(403).json({ error: 'Subscription must be active before approving ID cards.' });
  const patch = { status: req.body.status, updated_at: new Date().toISOString() };
  if (req.body.status === 'Approved') patch.approved_at = new Date().toISOString();
  const { data, error } = await db.from('cards').update(patch).eq('id', req.params.id).eq('organization_id', req.orgId).select('*').single();
  if (error) return res.status(400).json({ error: error.message });
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

async function createOrganization(body, status, subscriptionStatus) {
  const type = body.type || 'custom';
  const registrationRule = orgRegistrationFields[type] || orgRegistrationFields.custom;
  if (!body.name || !body.email || !body.password || !body.businessNumber) return { error: `${registrationRule.nameLabel}, admin email, password, and ${registrationRule.registrationLabel} are required.` };
  if (body.confirmPassword !== undefined && body.password !== body.confirmPassword) return { error: 'Password and confirm password must match.' };
  if (String(body.password).length < 8) return { error: 'Password must be at least 8 characters.' };
  if (registrationRule.requiresMissionVision && (!normalizeText(body.mission) || !normalizeText(body.vision))) return { error: 'Mission and vision are required for schools and universities.' };
  if (type === 'school' && !['day', 'boarding', 'mixed'].includes(normalizeText(body.schoolType))) return { error: 'Choose school type: day, boarding, or mixed.' };
  const id = `${String(body.name).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 4).toUpperCase() || 'ORG'}-${Date.now()}`;
  const { salt, passwordHash } = hashPassword(body.password);
  const masterCard = { number: `${id}/MASTER`, token: crypto.randomBytes(24).toString('hex'), status: 'Inactive', issuedAt: new Date().toISOString(), replacedAt: '' };
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
    salt,
    password_hash: passwordHash,
    status,
    subscription_status: subscriptionStatus,
    back_settings: { ...orgDefaults(body.name.trim()), ...backSettings },
    master_card: masterCard
  };
  const { data, error } = await db.from('organizations').insert(row).select('*').single();
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
  if (req.method === 'GET' && req.accepts('html')) {
    return sendStaticFile(res, 'index.html');
  }
  return res.status(404).send('Not found');
});

export default app;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  app.listen(port, () => {
    console.log(`VeriCard running at http://localhost:${port}`);
  });
}
