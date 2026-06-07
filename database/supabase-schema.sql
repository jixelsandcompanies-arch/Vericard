create table if not exists cards (
  id text primary key,
  organization_id text,
  organization_name text,
  card_type text not null default 'user',
  role_type text,
  fields jsonb not null default '{}'::jsonb,
  name text not null,
  location text not null,
  branch text not null,
  national_id text not null,
  phone text not null,
  email text not null default '',
  position text not null,
  photo text not null,
  verification_token text not null unique,
  status text not null default 'Pending',
  inactive_reason text,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists organizations (
  id text primary key,
  name text not null,
  type text not null default 'custom',
  business_number text not null,
  email text not null,
  phone text not null,
  logo text not null default '',
  brand_color text not null default '#357fbd',
  template_id text not null default 'sample',
  owner_name text not null default '',
  auth_user_id uuid,
  salt text not null,
  password_hash text not null,
  status text not null default 'Pending',
  subscription_status text not null default 'Pending',
  back_settings jsonb not null default '{}'::jsonb,
  master_card jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists audit_log (
  id bigint generated always as identity primary key,
  action text not null,
  card_id text,
  actor text not null,
  created_at timestamptz not null default now()
);

create table if not exists admin_settings (
  id text primary key default 'default',
  username text not null default 'admin',
  email text not null default '',
  salt text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists password_resets (
  id bigint generated always as identity primary key,
  email text not null,
  code text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists attendance_records (
  id bigint generated always as identity primary key,
  organization_id text not null,
  organization_name text not null,
  card_id text not null,
  student_name text not null,
  student_number text not null default '',
  class_grade text not null default '',
  parent_phone text not null default '',
  attendance_date date not null default current_date,
  entry_at timestamptz,
  exit_at timestamptz,
  entry_by text,
  exit_by text,
  gate_name text not null default 'Main Gate',
  status text not null default 'Inside',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists fee_records (
  id bigint generated always as identity primary key,
  organization_id text not null,
  organization_name text not null,
  admission_number text not null,
  student_name text not null,
  class_grade text not null default '',
  balance numeric not null default 0,
  due_date date,
  fee_status text not null default 'Cleared',
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists parent_notifications (
  id bigint generated always as identity primary key,
  organization_id text not null,
  organization_name text not null,
  card_id text,
  admission_number text,
  student_name text not null default '',
  parent_phone text not null default '',
  parent_email text not null default '',
  channel text not null default 'push',
  notification_type text not null,
  message text not null,
  status text not null default 'Queued',
  delivery_status text not null default 'Queued',
  created_at timestamptz not null default now()
);

create table if not exists gate_staff (
  id text primary key,
  organization_id text not null,
  organization_name text not null,
  full_name text not null,
  phone text not null default '',
  staff_code text not null,
  staff_role text not null default 'Gate Staff',
  gate_name text not null default 'Main Gate',
  pin_hash text not null,
  salt text not null,
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists gate_sessions (
  id text primary key,
  organization_id text not null,
  gate_staff_id text not null,
  staff_name text not null,
  gate_name text not null,
  session_token text not null unique,
  status text not null default 'On Duty',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists gate_devices (
  id text primary key,
  organization_id text not null,
  gate_staff_id text not null,
  gate_name text not null default 'Main Gate',
  device_id text not null,
  device_secret text not null default '',
  user_agent text not null default '',
  status text not null default 'Pending',
  last_seen_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists scan_security_logs (
  id bigint generated always as identity primary key,
  organization_id text,
  organization_name text not null default '',
  card_id text,
  card_name text not null default '',
  action text not null default '',
  result text not null default 'denied',
  reason text not null default '',
  confidence_score integer not null default 100,
  alert_level text not null default 'none',
  gate_staff_id text,
  gate_staff_name text not null default '',
  gate_name text not null default '',
  device_id text not null default '',
  latitude numeric,
  longitude numeric,
  location_accuracy numeric,
  ip_address text not null default '',
  user_agent text not null default '',
  source text not null default 'gate-app',
  created_at timestamptz not null default now()
);

create table if not exists print_requests (
  id bigint generated always as identity primary key,
  organization_id text not null,
  organization_name text not null,
  requested_by text not null default '',
  card_count integer not null default 0,
  price_per_card numeric not null default 100,
  total_amount numeric not null default 0,
  status text not null default 'Requested',
  cards_file jsonb not null default '{}'::jsonb,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists cards_branch_idx on cards (branch);
create index if not exists cards_status_idx on cards (status);
create index if not exists cards_position_idx on cards (position);
create index if not exists cards_organization_idx on cards (organization_id);
create index if not exists attendance_org_idx on attendance_records (organization_id);
create index if not exists attendance_card_idx on attendance_records (card_id);
create index if not exists attendance_date_idx on attendance_records (attendance_date);
create unique index if not exists attendance_one_open_record_idx on attendance_records (organization_id, card_id, attendance_date) where exit_at is null;
create index if not exists fee_records_org_idx on fee_records (organization_id);
create index if not exists fee_records_status_idx on fee_records (fee_status);
drop index if exists fee_records_org_admission_unique_idx;
create unique index if not exists fee_records_org_admission_unique_idx on fee_records (organization_id, admission_number);
create index if not exists parent_notifications_org_idx on parent_notifications (organization_id);
create index if not exists parent_notifications_admission_idx on parent_notifications (admission_number);
create index if not exists gate_staff_org_idx on gate_staff (organization_id);
create unique index if not exists gate_staff_org_code_unique_idx on gate_staff (organization_id, staff_code);
create index if not exists gate_sessions_org_idx on gate_sessions (organization_id);
create index if not exists gate_sessions_staff_idx on gate_sessions (gate_staff_id);
create index if not exists gate_devices_org_idx on gate_devices (organization_id);
create index if not exists gate_devices_staff_idx on gate_devices (gate_staff_id);
create unique index if not exists gate_devices_org_device_unique_idx on gate_devices (organization_id, device_id);
create index if not exists scan_security_logs_org_idx on scan_security_logs (organization_id);
create index if not exists scan_security_logs_card_idx on scan_security_logs (card_id);
create index if not exists scan_security_logs_result_idx on scan_security_logs (result);
create index if not exists print_requests_org_idx on print_requests (organization_id);
create index if not exists print_requests_status_idx on print_requests (status);
alter table cards add column if not exists email text not null default '';
alter table cards add column if not exists organization_id text;
alter table cards add column if not exists organization_name text;
alter table cards add column if not exists card_type text not null default 'user';
alter table cards add column if not exists role_type text;
alter table cards add column if not exists fields jsonb not null default '{}'::jsonb;
alter table organizations add column if not exists brand_color text not null default '#357fbd';
alter table organizations add column if not exists master_card jsonb not null default '{}'::jsonb;
alter table organizations add column if not exists auth_user_id uuid;
alter table parent_notifications add column if not exists parent_email text not null default '';
alter table parent_notifications add column if not exists channel text not null default 'push';
alter table parent_notifications alter column channel set default 'push';
alter table parent_notifications add column if not exists delivery_status text not null default 'Queued';
alter table parent_notifications alter column status set default 'Queued';
alter table password_resets add column if not exists used_at timestamptz;
alter table gate_staff add column if not exists staff_role text not null default 'Gate Staff';
alter table gate_staff add column if not exists setup_token_hash text not null default '';
alter table gate_staff add column if not exists setup_expires_at timestamptz;
alter table gate_staff add column if not exists setup_used_at timestamptz;
alter table gate_devices add column if not exists device_secret text not null default '';
alter table gate_sessions add column if not exists device_id text not null default '';
alter table gate_sessions add column if not exists user_agent text not null default '';
alter table attendance_records add column if not exists device_id text not null default '';
alter table attendance_records add column if not exists scan_source text not null default '';
alter table attendance_records add column if not exists latitude numeric;
alter table attendance_records add column if not exists longitude numeric;
alter table attendance_records add column if not exists location_accuracy numeric;
alter table attendance_records add column if not exists security_status text not null default '';
alter table attendance_records add column if not exists security_reason text not null default '';
alter table scan_security_logs add column if not exists confidence_score integer not null default 100;
alter table scan_security_logs add column if not exists alert_level text not null default 'none';

create unique index if not exists organizations_email_unique_idx on organizations (lower(email));
create unique index if not exists organizations_business_number_unique_idx on organizations (lower(business_number));
create unique index if not exists organizations_master_card_token_unique_idx on organizations ((master_card->>'token')) where coalesce(master_card->>'token', '') <> '';

alter table cards drop constraint if exists cards_national_id_key;
alter table cards drop constraint if exists cards_phone_key;
drop index if exists cards_email_unique_idx;

drop index if exists cards_scoped_national_id_unique_idx;
drop index if exists cards_scoped_phone_unique_idx;
drop index if exists cards_scoped_email_unique_idx;

create unique index if not exists cards_org_role_national_id_unique_idx
  on cards (coalesce(organization_id, 'legacy'), coalesce(role_type, ''), national_id)
  where national_id <> '' and coalesce(role_type, '') <> 'student';

create unique index if not exists cards_school_student_admission_unique_idx
  on cards (coalesce(organization_id, 'legacy'), coalesce(role_type, ''), lower(fields->>'admissionNumber'))
  where coalesce(role_type, '') = 'student' and coalesce(fields->>'admissionNumber', '') <> '';

create unique index if not exists cards_university_student_matric_unique_idx
  on cards (coalesce(organization_id, 'legacy'), coalesce(role_type, ''), lower(fields->>'matricNumber'))
  where coalesce(role_type, '') = 'student' and coalesce(fields->>'matricNumber', '') <> '';

create unique index if not exists cards_org_role_staff_id_unique_idx
  on cards (coalesce(organization_id, 'legacy'), coalesce(role_type, ''), lower(fields->>'staffId'))
  where coalesce(fields->>'staffId', '') <> '';

create unique index if not exists cards_org_role_employee_id_unique_idx
  on cards (coalesce(organization_id, 'legacy'), coalesce(role_type, ''), lower(fields->>'employeeId'))
  where coalesce(fields->>'employeeId', '') <> '';

create unique index if not exists cards_org_role_guard_id_unique_idx
  on cards (coalesce(organization_id, 'legacy'), coalesce(role_type, ''), lower(fields->>'guardId'))
  where coalesce(fields->>'guardId', '') <> '';

create unique index if not exists cards_org_role_membership_id_unique_idx
  on cards (coalesce(organization_id, 'legacy'), coalesce(role_type, ''), lower(fields->>'membershipId'))
  where coalesce(fields->>'membershipId', '') <> '';

create unique index if not exists cards_org_role_contractor_id_unique_idx
  on cards (coalesce(organization_id, 'legacy'), coalesce(role_type, ''), lower(fields->>'contractorId'))
  where coalesce(fields->>'contractorId', '') <> '';

create unique index if not exists cards_org_role_intern_id_unique_idx
  on cards (coalesce(organization_id, 'legacy'), coalesce(role_type, ''), lower(fields->>'internId'))
  where coalesce(fields->>'internId', '') <> '';

create unique index if not exists cards_org_role_worker_id_unique_idx
  on cards (coalesce(organization_id, 'legacy'), coalesce(role_type, ''), lower(fields->>'workerId'))
  where coalesce(fields->>'workerId', '') <> '';

create unique index if not exists cards_org_role_leader_id_unique_idx
  on cards (coalesce(organization_id, 'legacy'), coalesce(role_type, ''), lower(fields->>'leaderId'))
  where coalesce(fields->>'leaderId', '') <> '';

create unique index if not exists cards_org_role_supervisor_id_unique_idx
  on cards (coalesce(organization_id, 'legacy'), coalesce(role_type, ''), lower(fields->>'supervisorId'))
  where coalesce(fields->>'supervisorId', '') <> '';

create unique index if not exists cards_org_role_officer_id_unique_idx
  on cards (coalesce(organization_id, 'legacy'), coalesce(role_type, ''), lower(fields->>'officerId'))
  where coalesce(fields->>'officerId', '') <> '';

create unique index if not exists cards_org_role_contract_id_unique_idx
  on cards (coalesce(organization_id, 'legacy'), coalesce(role_type, ''), lower(fields->>'contractId'))
  where coalesce(fields->>'contractId', '') <> '';

create unique index if not exists cards_org_role_member_id_unique_idx
  on cards (coalesce(organization_id, 'legacy'), coalesce(role_type, ''), lower(fields->>'memberId'))
  where coalesce(fields->>'memberId', '') <> '';

alter table cards enable row level security;
alter table audit_log enable row level security;
alter table organizations enable row level security;
alter table admin_settings enable row level security;
alter table password_resets enable row level security;
alter table attendance_records enable row level security;
alter table fee_records enable row level security;
alter table parent_notifications enable row level security;
alter table gate_staff enable row level security;
alter table gate_sessions enable row level security;
alter table gate_devices enable row level security;
alter table scan_security_logs enable row level security;
alter table print_requests enable row level security;

-- Use Supabase service-role key on the server for admin operations.
-- Public verification should be exposed through a server endpoint, not direct anon table reads.
