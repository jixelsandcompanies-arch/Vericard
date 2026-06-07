# VeriCard Backend Handoff

This document explains the backend rules the VeriCard system must follow. It is written for the developer building or extending the backend.

## Core Idea

VeriCard is an organization-based ID card system.

An organization registers first, chooses an organization type, selects/saves an ID template, then pays/subscribes. Only after subscription becomes active should the master card, individual registrations, card approvals, and scan verification become valid.

## Organization Registration Flow

The first field must be `organization type`. Do not show the full registration form until the user selects an organization type.

Supported organization types:

- School
- University
- Company
- Hospital
- NGO/Church
- Security Agency
- Government Office
- Custom Organization

Each organization type has different registration fields and different cardholder roles. For schools and universities, mission and vision are required. Other organization types do not need mission and vision.

For schools, registration must also capture school type:

- Day school
- Boarding school
- Mixed day/boarding school

For mixed schools, student registration must capture student category:

- Day student
- Boarding student

## Subscription Rules

Subscription controls validity.

If the organization subscription is not active:

- Master card is invalid.
- Individual ID cards are invalid.
- Master card QR must not open registration forms.
- Individual card QR must show invalid.
- Gate scanning must be blocked.
- Card approval/printing/download should be locked.

If subscription is active:

- Master card can open registration forms.
- Individual card QR can show validity.
- Gate scanning can work.
- Admin dashboard can manage records.

## Master Card Rules

Each organization gets a master card.

The master card QR is used for individual registration under that organization. People scan the master card and register as the correct role for that organization.

The master card is only valid when:

- Organization subscription is active.
- A real template has been selected and saved.
- Master card status is active.
- The QR token matches the current master card token.
- The master card has not been replaced.

If the master card is not valid, scanning it must not open the registration form.

## Individual Card Registration Rules

Individual registration fields depend on:

- Organization type
- Role selected

Examples:

For school students:

- Name
- Admission number
- Class
- Parent/guardian name
- Parent/guardian phone
- Passport/photo
- Student category only if school type is mixed
- Optional parent/guardian email
- Optional parent/guardian national ID

For school staff/teachers:

- National ID is required
- Staff ID is required
- Department/position/phone/email/photo as needed

For university students:

- Matric number
- Faculty/department/program/level
- Phone/email/photo
- Optional parent/guardian contact fields

Other organization roles should keep their own role-specific fields.

## Duplicate Prevention Rules

No duplicate national ID should exist within the same organization and same role/type, except for student parent/guardian national IDs.

Important exception:

Students may share the same parent/guardian national ID or parent phone because one parent may have several children.

Also prevent duplicates for role-specific IDs:

- Student admission number in a school
- Matric number in a university
- Staff ID
- Employee ID
- Guard ID
- Membership ID
- Other role-specific unique IDs

## ID Card Front Rules

The front of the card should show only the key visual identity fields:

- Organization logo
- Cardholder photo
- Cardholder name
- Main ID number
- Role
- Authorized person name/signature

For schools:

- Principal/head teacher name and signature appear on the front.

For universities:

- VC/rector/president name and signature appear on the front.

Other organization types should use the relevant authorized person name/signature.

## ID Card Back Rules

The back of the ID card must stay simple. Do not add extra fields.

For schools and universities only:

- Mission
- Vision

For all organization types:

- QR code
- National ID number for non-students
- Admission number or matric number for students
- `If found please return to:`
- Organization name
- P.O. Box
- Phone
- Responsibility title, usually based on organization type
- Lost/report instruction
- Organization logo in the proper back-logo position

Do not show these on the card back:

- Address line 1
- Return department/person
- Extra cardholder responsibilities paragraph

## QR Verification Rules

When an individual card QR is scanned:

- Check card token exists.
- Check organization exists.
- Check organization subscription is active.
- Check card status is approved.
- If all pass, show valid.
- Otherwise show invalid and the reason.

Public QR verification should show only safe card details. It should not expose private admin data.

For student QR scans by normal people, parent phone may show because this was requested, but backend should treat it carefully and avoid exposing unnecessary private information.

## Gate Scanner App

Gate scanner is separate from the admin dashboard.

Gate/security staff should not need to enter the admin dashboard to scan. They use the scanner app/page.

Gate staff must:

- Be registered by organization admin.
- Have staff code and PIN.
- Start duty before scanning.
- End duty when finished.
- Have an active scanner session.

Gate scanner sessions should expire automatically.

## Approved Scanner Device Rule

Each gate scanner phone gets a device ID from the scanner app.

Flow:

1. Gate staff opens scanner app.
2. Scanner app generates or displays device ID.
3. Gate staff attempts login.
4. If backend sees a new device, store it as pending.
5. Organization admin approves the device.
6. Only approved devices can scan.

Block scanning when:

- Device ID is missing.
- Device is pending.
- Device is blocked.
- Device does not match the approved device for that staff/gate.

## GPS Gate Radius Rule

Backend should support gate GPS fencing.

Organization admin can set:

- Gate latitude
- Gate longitude
- Allowed radius in meters

Scanner app sends:

- Latitude
- Longitude
- Location accuracy
- Device ID
- User agent

If gate GPS is configured, backend must reject scanning when the scanner phone is outside the allowed radius.

This prevents gate staff from scanning from home or outside the school/organization gate.

## School Movement Rules

Entry is always captured for school students.

Day students:

- Entry always captured.
- Exit during school hours is denied.
- Exit after school hours is allowed.
- School admin sets school start and end time.

Boarding students:

- Entry always captured.
- Exit is captured without release-period setup.

Mixed schools:

- Day students follow day student rules.
- Boarding students follow boarding student rules.

Only students follow these strict school movement rules. Staff, teachers, principals, parents, and other roles should have movement captured as attendance/working-hours records.

## University Movement Rules

University students can enter or leave at any time, except the restricted night window.

Current rule:

- 12:00 AM to 4:00 AM scanning is blocked for university students.

Staff/lecturers are not under student movement restrictions. Their scans are captured as attendance/working-hours movement.

## Other Organization Movement Rules

For company, hospital, NGO, government, security agency, and custom organizations:

- Scanning records attendance or working hours.
- Movement is captured as entering/leaving.
- The same inside/outside duplicate protection should apply.

## Inside/Outside Duplicate Protection

A person should only have one current state:

- Inside
- Outside

If already inside:

- Another entry scan must be rejected.

If already outside:

- Another exit scan must be rejected.

This prevents repeated fake scans.

## Scan Audit And Security Logs

Every scan attempt should be auditable, including denied attempts.

Store:

- Organization ID/name
- Card ID/name
- Action: enter or leave
- Result: allowed, denied, flagged
- Reason
- Gate staff ID/name
- Gate name
- Device ID
- Latitude/longitude
- Location accuracy
- IP address
- User agent
- Source, for example `gate-app` or `admin-dashboard`
- Timestamp

Attendance records should also store:

- Device ID
- Scan source
- GPS data
- Security status
- Security reason

## Parent Notifications

All parent notifications should be SMS or email based.

Do not expose a public parent attendance monitor page.

Notify parent/guardian when:

- Student enters school/campus
- Student leaves school/campus
- Fee balance is updated
- Student is sent home for fees
- Student returns to school
- Fees are cleared

Notification records should track:

- Parent phone
- Parent email
- Channel: sms or email
- Message
- Type
- Delivery status: Queued, Sent, Failed, Missing Contact

Actual SMS/email delivery depends on configured provider webhooks.

## Fee Management

For schools and universities:

Fee status options:

- Cleared
- Partial Balance
- Fee Defaulter

CSV/Excel upload should support:

- Admission number
- Student name
- Class
- Balance
- Due date

Reports should include:

- Fee balances
- Cleared students
- Attendance reports
- Student card reports
- Parent communication logs

## Super Admin Requirements

Super admin should see:

- All organizations
- Subscription status
- All individuals under each organization admin
- Master card status
- All card records
- Scan records
- Security/flagged scan logs
- Fee records
- Parent notification logs

Super admin can activate or deactivate subscriptions. If subscription is inactive, all cards and scanning become invalid.

## Supabase Tables To Maintain

Main tables:

- `organizations`
- `cards`
- `attendance_records`
- `gate_staff`
- `gate_sessions`
- `scan_security_logs`
- `fee_records`
- `parent_notifications`
- `audit_log`
- `admin_settings`
- `password_resets`

Important schema behavior:

- Add columns with `alter table ... add column if not exists` for migration safety.
- Keep scoped unique indexes for duplicate prevention.
- Enable row level security, but backend should use service role key for server-side operations.

## Deployment Notes

Environment variables needed:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_SECRET`
- `ADMIN_USER`
- `ADMIN_PASSWORD`
- `ADMIN_EMAIL`
- `SMS_WEBHOOK_URL`
- `EMAIL_WEBHOOK_URL`
- `NOTIFICATION_WEBHOOK_SECRET`
- `EXPOSE_RESET_CODES` only for development/testing

Vercel should include all static files and route requests through the API handler.

## Current Priority For Backend Developer

1. Run the current Supabase schema.
2. Confirm organization registration saves correct organization type settings.
3. Confirm subscription lock blocks master card, individual cards, and scanning.
4. Confirm scanner device approval works.
5. Confirm GPS radius blocks off-site scanning.
6. Confirm denied scan attempts enter `scan_security_logs`.
7. Confirm card back only shows the agreed fields.
8. Connect real SMS/email provider webhooks.

