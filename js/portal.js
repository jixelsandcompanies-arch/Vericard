const state = { token: '', org: null, rules: null, orgRegistrationFields: {}, cards: [], attendance: [], scanners: [], templates: [], locked: false, assistantMessages: [], palette: { primary: '#061a30', accent: '#149ee8', colors: ['#061a30', '#149ee8'] }, masterToken: new URLSearchParams(location.search).get('master') || '', dashboardDeviceId: localStorage.getItem('vericardDashboardDeviceId') || '' };
    const els = {
      sessionStatus: document.getElementById('sessionStatus'), logoutBtn: document.getElementById('logoutBtn'), drawerToggle: document.getElementById('drawerToggle'), dashboardDrawer: document.getElementById('dashboardDrawer'), drawerScrim: document.getElementById('drawerScrim'),
      portalTitle: document.getElementById('portalTitle'),
      portalIntro: document.getElementById('portalIntro'), entryArea: document.getElementById('entryArea'), startRegisterBtn: document.getElementById('startRegisterBtn'),
      alreadyRegisteredBtn: document.getElementById('alreadyRegisteredBtn'), loginPanel: document.getElementById('loginPanel'),
      orgType: document.getElementById('orgType'), orgDynamicFields: document.getElementById('orgDynamicFields'),
      orgRegisterForm: document.getElementById('orgRegisterForm'), registerBackBtn: document.getElementById('registerBackBtn'), loginForm: document.getElementById('loginForm'), loginNotice: document.getElementById('loginNotice'),
      assistantIntroMessage: document.getElementById('assistantIntroMessage'), assistantNotificationsPrompt: document.getElementById('assistantNotificationsPrompt'),
      loginBackBtn: document.getElementById('loginBackBtn'), orgForgotToggleBtn: document.getElementById('orgForgotToggleBtn'), orgResetForm: document.getElementById('orgResetForm'), orgSendResetBtn: document.getElementById('orgSendResetBtn'),
      registerLogoValue: document.getElementById('registerLogoValue'), registerBrandColor: document.getElementById('registerBrandColor'), registerLogoPreview: document.getElementById('registerLogoPreview'), registerLogoFile: document.getElementById('registerLogoFile'),
      templateSetup: document.getElementById('templateSetup'), initialTemplateForm: document.getElementById('initialTemplateForm'), templateSetupNotice: document.getElementById('templateSetupNotice'),
      setupLogoValue: document.getElementById('setupLogoValue'), setupBrandColor: document.getElementById('setupBrandColor'), setupLogoPreview: document.getElementById('setupLogoPreview'), setupLogoFile: document.getElementById('setupLogoFile'),
      setupTemplateSelect: document.getElementById('setupTemplateSelect'), setupTemplateGallery: document.getElementById('setupTemplateGallery'),
      brandingForm: document.getElementById('brandingForm'), dashboardLogoValue: document.getElementById('dashboardLogoValue'), dashboardBrandColor: document.getElementById('dashboardBrandColor'), dashboardLogoPreview: document.getElementById('dashboardLogoPreview'),
      dashboardLogoFile: document.getElementById('dashboardLogoFile'),
      dashboard: document.getElementById('dashboard'), subscriptionNotice: document.getElementById('subscriptionNotice'), masterCard: document.getElementById('masterCard'),
      orgDashboardSummary: document.getElementById('orgDashboardSummary'), recentScansBody: document.getElementById('recentScansBody'),
      masterLogo: document.getElementById('masterLogo'), masterOrgName: document.getElementById('masterOrgName'), masterOrgType: document.getElementById('masterOrgType'),
      masterNumber: document.getElementById('masterNumber'), masterBusiness: document.getElementById('masterBusiness'), masterAuthority: document.getElementById('masterAuthority'), masterQr: document.getElementById('masterQr'), masterBackLogo: document.getElementById('masterBackLogo'),
      masterBackMission: document.getElementById('masterBackMission'), masterBackVision: document.getElementById('masterBackVision'), masterBackReturnTitle: document.getElementById('masterBackReturnTitle'), masterBackReturnName: document.getElementById('masterBackReturnName'), masterBackPoBox: document.getElementById('masterBackPoBox'), masterBackPhone: document.getElementById('masterBackPhone'), masterBackLostInstruction: document.getElementById('masterBackLostInstruction'),
      cardsBody: document.getElementById('cardsBody'), selectApprovedCards: document.getElementById('selectApprovedCards'), downloadSelectedCardsBtn: document.getElementById('downloadSelectedCardsBtn'), requestPrintCardsBtn: document.getElementById('requestPrintCardsBtn'), scanPanel: document.getElementById('scanPanel'), scanNotice: document.getElementById('scanNotice'),
      applyForm: document.getElementById('applyForm'), roleType: document.getElementById('roleType'), dynamicFields: document.getElementById('dynamicFields'),
      gateScanPanel: document.getElementById('gateScanPanel'), gateScanForm: document.getElementById('gateScanForm'), gateScanNotice: document.getElementById('gateScanNotice'), attendanceBody: document.getElementById('attendanceBody'),
      attendanceSummary: document.getElementById('attendanceSummary'), attendanceFilter: document.getElementById('attendanceFilter'), attendanceFrom: document.getElementById('attendanceFrom'), attendanceTo: document.getElementById('attendanceTo'), attendanceSearch: document.getElementById('attendanceSearch'), exportAttendanceCsvBtn: document.getElementById('exportAttendanceCsvBtn'), activeNowBody: document.getElementById('activeNowBody'),
      gateStaffForm: document.getElementById('gateStaffForm'), gateStaffBody: document.getElementById('gateStaffBody'), gateDevicesBody: document.getElementById('gateDevicesBody'), scannerSetupNotice: document.getElementById('scannerSetupNotice'),
      feePanel: document.getElementById('feePanel'), feeUploadFile: document.getElementById('feeUploadFile'), uploadFeesBtn: document.getElementById('uploadFeesBtn'), refreshFeesBtn: document.getElementById('refreshFeesBtn'), feeNotice: document.getElementById('feeNotice'), feesBody: document.getElementById('feesBody'),
      reportsPanel: document.getElementById('reportsPanel'), reportsSummary: document.getElementById('reportsSummary'), reportPeriod: document.getElementById('reportPeriod'), downloadReportBtn: document.getElementById('downloadReportBtn'), sendTestPushBtn: document.getElementById('sendTestPushBtn'), communicationLogsTitle: document.getElementById('communicationLogsTitle'), communicationLogsHead: document.getElementById('communicationLogsHead'), securityLogResult: document.getElementById('securityLogResult'), securityLogAlert: document.getElementById('securityLogAlert'), notificationsBody: document.getElementById('notificationsBody'), securityLogsBody: document.getElementById('securityLogsBody'),
      assistantGreeting: document.getElementById('assistantGreeting'), assistantMessages: document.getElementById('assistantMessages'), assistantForm: document.getElementById('assistantForm'), assistantQuestion: document.getElementById('assistantQuestion'),
      backSettingsForm: document.getElementById('backSettingsForm'), previewEmpty: document.getElementById('previewEmpty'), idCardStage: document.getElementById('idCardStage'),
      schoolBackFields: document.getElementById('schoolBackFields'), schoolHourFields: document.getElementById('schoolHourFields'),
      idFrontLogo: document.getElementById('idFrontLogo'), idBackLogo: document.getElementById('idBackLogo'), idPhoto: document.getElementById('idPhoto'),
      idPhotoPlaceholder: document.getElementById('idPhotoPlaceholder'), idFrontOrgName: document.getElementById('idFrontOrgName'), idCardName: document.getElementById('idCardName'), idCardNumber: document.getElementById('idCardNumber'), idCardExpiry: document.getElementById('idCardExpiry'),
      idCardRoleLabel: document.getElementById('idCardRoleLabel'), idCardRole: document.getElementById('idCardRole'), idCardQr: document.getElementById('idCardQr'), backReturnTitle: document.getElementById('backReturnTitle'),
      frontAuthorityName: document.getElementById('frontAuthorityName'),
      backMission: document.getElementById('backMission'), backVision: document.getElementById('backVision'), backIdentityNumber: document.getElementById('backIdentityNumber'),
      backReturnName: document.getElementById('backReturnName'), backPoBox: document.getElementById('backPoBox'), backAddress1: document.getElementById('backAddress1'),
      backPhone: document.getElementById('backPhone'), backDesk: document.getElementById('backDesk'),
      backLostInstruction: document.getElementById('backLostInstruction'), backResponsibilities: document.getElementById('backResponsibilities')
    };

    function headers() { return { Authorization: `Bearer ${state.token}`, 'Content-Type': 'application/json' }; }
    function qrUrl(value) { return `/api/qr?data=${encodeURIComponent(value)}`; }
    function promptOrgPassword(action) {
      const password = prompt(`Enter organization admin password to ${action}:`);
      if (!password) throw new Error('Organization admin password is required.');
      return password;
    }
    function niceLabel(key) { return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()); }
    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    }
    function escapeAttr(value) { return escapeHtml(value).replace(/`/g, '&#96;'); }
    function ensureDashboardDeviceId() {
      if (!state.dashboardDeviceId) {
        const randomId = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        state.dashboardDeviceId = `ADMIN-${randomId}`;
        localStorage.setItem('vericardDashboardDeviceId', state.dashboardDeviceId);
      }
      return state.dashboardDeviceId;
    }
    function currentLocation() {
      if (!navigator.geolocation) return Promise.resolve({});
      const capture = (options) => new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords = position.coords || {};
            resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            locationAccuracy: position.coords.accuracy,
            locationSpeed: Number.isFinite(coords.speed) ? coords.speed : null,
            locationHeading: Number.isFinite(coords.heading) ? coords.heading : null,
            locationCapturedAt: new Date(position.timestamp || Date.now()).toISOString()
          });
          },
          () => resolve({}),
          options
        );
      });
      return Promise.all([
        capture({ enableHighAccuracy: false, timeout: 3500, maximumAge: 15000 }),
        capture({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 })
      ]).then((locations) => locations
        .filter((location) => location.latitude !== undefined)
        .sort((a, b) => Number(a.locationAccuracy || Infinity) - Number(b.locationAccuracy || Infinity))[0] || {});
    }
    async function dashboardScanMeta() {
      return {
        deviceId: ensureDashboardDeviceId(),
        userAgent: navigator.userAgent,
        ...(await currentLocation())
      };
    }
    function verificationUrl(token) { return `${window.location.origin}/?token=${encodeURIComponent(token)}`; }
    function cardVerificationUrl(card) {
      return card?.qrPayload ? `${window.location.origin}/?q=${encodeURIComponent(card.qrPayload)}` : verificationUrl(card?.verificationToken || '');
    }
    function hasRegisteredOrganization() { return localStorage.getItem('mapphexOrganizationRegistered') === 'true'; }
    function rememberRegisteredOrganization() { localStorage.setItem('mapphexOrganizationRegistered', 'true'); }
    function isSchoolType(type) { return type === 'school' || type === 'university'; }
    function orgWorkflowProfile(type = state.org?.type) {
      const profiles = {
        company: {
          personLabel: 'People',
          visitorLabel: 'Visitors',
          activeLabel: 'At work now',
          approvalLabel: 'Host approvals',
          zoneLabel: 'Sites / zones',
          expiringLabel: 'Contracts expiring',
          reportPrefix: 'Department / branch',
          scanNoun: 'Work access',
          assistantScan: 'Use Gate to scan employees, contractors, interns, and visitors as entering, reporting at a work area, or leaving. Current location stops when they leave.'
        },
        hospital: {
          personLabel: 'Personnel',
          visitorLabel: 'Visitors',
          activeLabel: 'On site now',
          approvalLabel: 'Host approvals',
          zoneLabel: 'Restricted zones',
          expiringLabel: 'Credentials expiring',
          reportPrefix: 'Ward / department',
          scanNoun: 'Clinical access',
          assistantScan: 'Use Gate to scan doctors, nurses, staff, and visitors into wards, lab, pharmacy, ICU, theatre, or exit. Restricted zones and credential expiry are checked.'
        },
        security: {
          personLabel: 'Personnel',
          visitorLabel: 'Visitors',
          activeLabel: 'On duty now',
          approvalLabel: 'Supervisor approvals',
          zoneLabel: 'Deployment sites',
          expiringLabel: 'Licenses expiring',
          reportPrefix: 'Site / rank',
          scanNoun: 'Duty proof',
          assistantScan: 'Use Gate to confirm guard deployment, shifts, report points, and exits. Deployment site, supervisor approval, license expiry, and GPS movement are checked.'
        },
        government: {
          personLabel: 'Records',
          visitorLabel: 'Visitors',
          activeLabel: 'In office now',
          approvalLabel: 'Host clearances',
          zoneLabel: 'Departments',
          expiringLabel: 'Passes expiring',
          reportPrefix: 'Department / office',
          scanNoun: 'Office access',
          assistantScan: 'Use Gate to scan officers, contract staff, and visitors through reception, departments, records, finance, and exit. Appointment and visit purpose are checked.'
        },
        ngo: {
          personLabel: 'Members',
          visitorLabel: 'Visitors',
          activeLabel: 'Checked in now',
          approvalLabel: 'Screening pending',
          zoneLabel: 'Events / areas',
          expiringLabel: 'Access expiring',
          reportPrefix: 'Event / ministry',
          scanNoun: 'Event access',
          assistantScan: 'Use Gate to scan members, volunteers, leaders, and visitors for events, youth areas, volunteer desks, and exits. Screening and event names are checked.'
        },
        custom: {
          personLabel: 'Records',
          visitorLabel: 'Visitors',
          activeLabel: 'Active inside',
          approvalLabel: 'Approvals pending',
          zoneLabel: 'Access zones',
          expiringLabel: 'Access expiring',
          reportPrefix: 'Group / role',
          scanNoun: 'Custom access',
          assistantScan: 'Use Gate to scan custom members, staff, and visitors into areas, report points, and exits using your custom access zones and rules.'
        }
      };
      return profiles[type] || {
        personLabel: 'Records',
        visitorLabel: 'Visitors',
        activeLabel: 'Inside now',
        approvalLabel: 'Pending approvals',
        zoneLabel: 'Access zones',
        expiringLabel: 'Expiring soon',
        reportPrefix: 'Group',
        scanNoun: 'Gate scan',
        assistantScan: 'Open Gate to scan entry, report/update location, and exit.'
      };
    }
    function applyOrganizationLanguage() {
      const schoolPortal = isSchoolType(state.org?.type);
      const profile = orgWorkflowProfile();
      if (els.assistantIntroMessage) {
        els.assistantIntroMessage.textContent = schoolPortal
          ? 'Ask me about approvals, master cards, QR registration, gate scans, parent notifications, reports, fees, bulk printing, or school attendance.'
          : `Ask me about approvals, master cards, QR registration, ${profile.scanNoun.toLowerCase()}, reports, access zones, bulk printing, or who is inside now.`;
      }
      if (els.assistantNotificationsPrompt) {
        els.assistantNotificationsPrompt.textContent = schoolPortal ? 'Parent notifications' : 'Logs';
        els.assistantNotificationsPrompt.dataset.aiPrompt = schoolPortal ? 'How do parent notifications work?' : 'How do communication logs work?';
      }
      if (els.communicationLogsTitle) {
        els.communicationLogsTitle.textContent = schoolPortal ? 'Parent Communication Logs' : 'Operational Communication Logs';
      }
      if (els.communicationLogsHead) {
        els.communicationLogsHead.innerHTML = schoolPortal
          ? '<tr><th>Student</th><th>Admission No.</th><th>Parent Contact</th><th>Channel</th><th>Type</th><th>Status</th><th>Message</th><th>Date</th></tr>'
          : '<tr><th>Person</th><th>ID No.</th><th>Contact</th><th>Channel</th><th>Type</th><th>Status</th><th>Message</th><th>Date</th></tr>';
      }
      if (els.sendTestPushBtn) {
        els.sendTestPushBtn.classList.toggle('hidden', !schoolPortal);
      }
    }
    function registrationRule(type) { return state.orgRegistrationFields[type] || state.orgRegistrationFields.custom || {}; }
    function toggleOrgDependentFields(show) {
      const children = Array.from(els.orgRegisterForm.children);
      let seenTypeSelect = false;
      for (const child of children) {
        if (child.querySelector?.('#orgType')) {
          seenTypeSelect = true;
          continue;
        }
        if (!seenTypeSelect || child.tagName === 'H2' || child.classList.contains('panel-heading')) continue;
        child.classList.toggle('hidden', !show);
      }
    }
    function renderOrgRegistrationFields() {
      const type = els.orgType.value || '';
      toggleOrgDependentFields(Boolean(type));
      if (!type) {
        els.orgDynamicFields.innerHTML = '';
        document.getElementById('organizationFeatureMount')?.classList.add('hidden');
        return;
      }
      window.loadOrganizationFeature?.(type);
      if (type === 'business-card') {
        toggleOrgDependentFields(false);
        els.orgDynamicFields.innerHTML = '';
        return;
      }
      const rule = registrationRule(type);
      els.orgDynamicFields.innerHTML = `
        <label>${rule.nameLabel || 'Organization name'}<input name="name" required></label>
        <label>Location<input name="location" required></label>
        <label>${rule.registrationLabel || 'Registration number'}<input name="businessNumber" required></label>
        <label>${rule.authorityLabel || 'Authorized person name'} / electronic signature<input name="ownerName" placeholder="Type full name for electronic signature" required></label>
        ${type === 'school' ? '<label>School type<select name="schoolType" required><option value="">Choose school type</option><option value="day">Day school</option><option value="boarding">Boarding school</option><option value="mixed">Mixed day/boarding school</option></select></label>' : ''}
        ${isSchoolType(type) ? '<label>Mission<textarea name="mission" required></textarea></label><label>Vision<textarea name="vision" required></textarea></label>' : ''}
        <label>P.O. Box<input name="poBox"></label>
        <label>Return/report phone<input name="returnPhone"></label>
        <label>Return/report instruction<textarea name="reportInstruction" required></textarea></label>
        <label>Admin email<input name="email" type="email" required></label>
        <label>Admin phone<input name="phone" required></label>
      `;
    }
    function renderSchoolBackFields() {
      if (!els.schoolBackFields) return;
      const type = state.org?.type || els.orgType.value || 'custom';
      els.schoolBackFields.innerHTML = isSchoolType(type)
        ? '<label>Mission<textarea name="mission"></textarea></label><label>Vision<textarea name="vision"></textarea></label>'
        : '';
      els.schoolHourFields.innerHTML = type === 'school'
        ? '<label>School type<select name="schoolType"><option value="day">Day school</option><option value="boarding">Boarding school</option><option value="mixed">Mixed day/boarding school</option></select></label>'
        : '';
    }
    function normalizeHexColor(color) {
      const value = String(color || '').trim();
      if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
      if (/^#[0-9a-f]{3}$/i.test(value)) return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`.toLowerCase();
      return '#061a30';
    }
    function setBrandColor(color, accent = '') {
      document.documentElement.style.setProperty('--blue', normalizeHexColor(color));
      if (accent) document.documentElement.style.setProperty('--gold', normalizeHexColor(accent));
    }
    function rgbToHex(r, g, b) {
      return `#${[r, g, b].map((value) => Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, '0')).join('')}`;
    }
    function rgbToHsl(r, g, b) {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0;
      let s = 0;
      const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h /= 6;
      }
      return { h: h * 360, s, l };
    }
    function hslToRgb(h, s, l) {
      h = ((h % 360) + 360) % 360 / 360;
      let r = l;
      let g = l;
      let b = l;
      if (s !== 0) {
        const hueToRgb = (p, q, t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hueToRgb(p, q, h + 1 / 3);
        g = hueToRgb(p, q, h);
        b = hueToRgb(p, q, h - 1 / 3);
      }
      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }
    function smartenBrandColor(r, g, b) {
      const hsl = rgbToHsl(r, g, b);
      const saturation = Math.max(0.48, Math.min(0.86, hsl.s * 1.08));
      const lightness = Math.max(0.24, Math.min(0.46, hsl.l));
      return ensureReadableBrandColor(rgbToHex(...hslToRgb(hsl.h, saturation, lightness)));
    }
    function hexToRgb(hex) {
      const value = normalizeHexColor(hex).slice(1);
      return {
        r: parseInt(value.slice(0, 2), 16),
        g: parseInt(value.slice(2, 4), 16),
        b: parseInt(value.slice(4, 6), 16)
      };
    }
    function colorDistance(first, second) {
      const a = hexToRgb(first);
      const b = hexToRgb(second);
      return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
    }
    function relativeLuminance(hex) {
      const { r, g, b } = hexToRgb(hex);
      const channel = (value) => {
        const normalized = value / 255;
        return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    }
    function contrastRatio(first, second) {
      const light = Math.max(relativeLuminance(first), relativeLuminance(second));
      const dark = Math.min(relativeLuminance(first), relativeLuminance(second));
      return (light + 0.05) / (dark + 0.05);
    }
    function ensureReadableBrandColor(color) {
      let normalized = normalizeHexColor(color);
      let { r, g, b } = hexToRgb(normalized);
      let hsl = rgbToHsl(r, g, b);
      let attempts = 0;
      while (contrastRatio(normalized, '#ffffff') < 4.5 && attempts < 8) {
        hsl = { ...hsl, l: Math.max(0.18, hsl.l - 0.045), s: Math.min(0.9, hsl.s + 0.03) };
        normalized = rgbToHex(...hslToRgb(hsl.h, hsl.s, hsl.l));
        attempts += 1;
      }
      return normalized;
    }
    function ensureAccentContrast(primary, accent) {
      let normalized = normalizeHexColor(accent);
      let { r, g, b } = hexToRgb(normalized);
      let hsl = rgbToHsl(r, g, b);
      let attempts = 0;
      while (contrastRatio(primary, normalized) < 3.2 && attempts < 8) {
        hsl = { ...hsl, l: hsl.l > 0.5 ? Math.min(0.78, hsl.l + 0.045) : Math.max(0.22, hsl.l - 0.045), s: Math.min(0.9, hsl.s + 0.02) };
        normalized = rgbToHex(...hslToRgb(hsl.h, hsl.s, hsl.l));
        attempts += 1;
      }
      return normalized;
    }
    function smartAccentFromPrimary(primary) {
      const { r, g, b } = hexToRgb(primary);
      const hsl = rgbToHsl(r, g, b);
      return ensureAccentContrast(primary, rgbToHex(...hslToRgb(hsl.h + 42, 0.78, 0.62)));
    }
    function defaultPalette() {
      return { primary: '#061a30', accent: '#149ee8', colors: ['#061a30', '#149ee8'] };
    }
    function extractLogoPalette(src) {
      return new Promise((resolve) => {
        if (!src) {
          resolve(defaultPalette());
          return;
        }
        const image = new Image();
        image.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const size = 140;
            canvas.width = size;
            canvas.height = size;
            const context = canvas.getContext('2d');
            context.clearRect(0, 0, size, size);
            context.drawImage(image, 0, 0, size, size);
            const pixels = context.getImageData(0, 0, size, size).data;
            const buckets = new Map();
            for (let index = 0; index < pixels.length; index += 4) {
              const r = pixels[index];
              const g = pixels[index + 1];
              const b = pixels[index + 2];
              const a = pixels[index + 3];
              if (a < 90) continue;
              const { h, s, l } = rgbToHsl(r, g, b);
              if (l > 0.92 || l < 0.08 || s < 0.18) continue;
              const isNearWhiteGrayOrBlack = Math.max(r, g, b) - Math.min(r, g, b) < 26;
              if (isNearWhiteGrayOrBlack) continue;
              const hueBucket = Math.round(h / 8) * 8;
              const satBucket = Math.round(s * 6) / 6;
              const lightBucket = Math.round(l * 6) / 6;
              const key = `${hueBucket},${satBucket},${lightBucket}`;
              const vividness = Math.pow(s, 1.7);
              const readability = 1 - Math.abs(l - 0.42);
              const alphaWeight = a / 255;
              const score = vividness * readability * alphaWeight;
              const existing = buckets.get(key) || { score: 0, count: 0, r: 0, g: 0, b: 0 };
              existing.score += score;
              existing.count += 1;
              existing.r += r * score;
              existing.g += g * score;
              existing.b += b * score;
              buckets.set(key, existing);
            }
            const ranked = [];
            buckets.forEach((bucket) => {
              const score = bucket.score * Math.log2(bucket.count + 2);
              ranked.push({ ...bucket, finalScore: score });
            });
            ranked.sort((a, b) => b.finalScore - a.finalScore);
            const picked = [];
            for (const bucket of ranked) {
              const color = smartenBrandColor(bucket.r / bucket.score, bucket.g / bucket.score, bucket.b / bucket.score);
              if (picked.every((existing) => colorDistance(existing, color) > 58)) picked.push(color);
              if (picked.length === 4) break;
            }
            const primary = picked[0];
            if (!primary) {
              resolve(defaultPalette());
              return;
            }
            resolve({
              primary,
              accent: picked[1] ? ensureAccentContrast(primary, picked[1]) : smartAccentFromPrimary(primary),
              colors: picked.length > 1 ? picked.map((color) => ensureReadableBrandColor(color)) : [primary, smartAccentFromPrimary(primary)]
            });
          } catch {
            resolve(defaultPalette());
          }
        };
        image.onerror = () => resolve(defaultPalette());
        image.src = src;
      });
    }
    function showIntro() {
      document.title = 'VeriCard Portal';
      els.portalTitle.textContent = 'VeriCard Portal';
      setBrandColor('#061a30');
      els.portalIntro.classList.remove('hidden');
      els.entryArea.classList.add('hidden');
      els.orgRegisterForm.classList.add('hidden');
      document.getElementById('organizationFeatureMount')?.classList.add('hidden');
      els.loginPanel.classList.add('hidden');
      els.templateSetup.classList.add('hidden');
      els.dashboard.classList.add('hidden');
      els.drawerToggle.classList.add('hidden');
      toggleDrawer(false);
    }
    function showRegistration() {
      document.title = 'VeriCard Portal';
      els.portalTitle.textContent = 'VeriCard Portal';
      setBrandColor('#061a30');
      els.portalIntro.classList.add('hidden');
      els.entryArea.classList.remove('hidden');
      els.orgRegisterForm.classList.remove('hidden');
      els.loginPanel.classList.add('hidden');
      els.templateSetup.classList.add('hidden');
      els.dashboard.classList.add('hidden');
      els.drawerToggle.classList.add('hidden');
      toggleDrawer(false);
    }
    function showLogin() {
      document.title = 'VeriCard Portal';
      els.portalTitle.textContent = 'VeriCard Portal';
      setBrandColor('#061a30');
      els.portalIntro.classList.add('hidden');
      els.entryArea.classList.remove('hidden');
      els.orgRegisterForm.classList.add('hidden');
      els.loginPanel.classList.remove('hidden');
      els.templateSetup.classList.add('hidden');
      els.dashboard.classList.add('hidden');
      els.drawerToggle.classList.add('hidden');
      toggleDrawer(false);
    }
    function showDashboardShell() {
      els.portalIntro.classList.add('hidden');
      els.entryArea.classList.add('hidden');
      els.orgRegisterForm.classList.add('hidden');
      els.loginPanel.classList.add('hidden');
      els.templateSetup.classList.add('hidden');
      els.drawerToggle.classList.remove('hidden');
      els.drawerToggle.setAttribute('aria-expanded', 'false');
      updateDashboardNavigation();
      setDashboardView('dashboard');
    }
    function initializeEntryView() {
      if (state.masterToken) {
        els.portalIntro.classList.add('hidden');
        els.entryArea.classList.add('hidden');
        return;
      }
      if (hasRegisteredOrganization()) showLogin();
      else showIntro();
    }
    function friendlyError(error) {
      if (error && /failed to fetch/i.test(error.message || '')) {
        return 'Could not reach VeriCard server. Open this page through the running app URL, not by double-clicking the HTML file, and confirm the server is online.';
      }
      return error.message || 'Request failed.';
    }
    function formatTime(value) {
      return value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    }
    function formatDate(value) {
      return value ? new Date(`${value}T00:00:00`).toLocaleDateString() : '';
    }
    function money(value) {
      return `KES ${Number(value || 0).toLocaleString()}`;
    }
    function availableDashboardViews() {
      const schoolPortal = isSchoolType(state.org?.type);
      const views = ['dashboard', 'front', 'back', 'master', 'records', 'assistant', 'gate'];
      if (schoolPortal) views.push('fees');
      views.push('reports');
      return views;
    }
    function updateDashboardNavigation() {
      const views = availableDashboardViews();
      document.querySelectorAll('[data-drawer-view]').forEach((button) => {
        const allowed = views.includes(button.dataset.drawerView);
        button.classList.toggle('hidden', !allowed);
        button.disabled = !allowed;
      });
    }
    function setDashboardView(view) {
      const views = availableDashboardViews();
      const nextView = views.includes(view) ? view : 'dashboard';
      document.querySelectorAll('[data-dashboard-view]').forEach((panel) => {
        panel.classList.toggle('hidden', panel.dataset.dashboardView !== nextView);
      });
      document.querySelectorAll('[data-drawer-view]').forEach((button) => {
        button.classList.toggle('active', button.dataset.drawerView === nextView);
      });
      toggleDrawer(false);
    }
    function toggleDrawer(open = !els.dashboardDrawer?.classList.contains('open')) {
      els.dashboardDrawer?.classList.toggle('open', open);
      els.drawerScrim?.classList.toggle('hidden', !open);
      els.drawerToggle?.setAttribute('aria-expanded', String(Boolean(open)));
      document.body.classList.toggle('drawer-open', Boolean(open));
    }
    function downloadJson(filename, data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    }
    function downloadCsv(filename, rows) {
      const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    }
    function isoDate(date) {
      return date.toISOString().slice(0, 10);
    }
    function attendanceRange() {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const filter = els.attendanceFilter?.value || 'today';
      if (filter === 'all') return { start: null, end: null };
      if (filter === 'yesterday') {
        const start = new Date(today);
        start.setDate(start.getDate() - 1);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return { start, end };
      }
      if (filter === 'week') {
        const start = new Date(today);
        start.setDate(start.getDate() - start.getDay());
        const end = new Date(today);
        end.setDate(end.getDate() + 1);
        return { start, end };
      }
      if (filter === 'month') return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: new Date(today.getFullYear(), today.getMonth() + 1, 1) };
      if (filter === 'custom') {
        const start = els.attendanceFrom?.value ? new Date(`${els.attendanceFrom.value}T00:00:00`) : null;
        const end = els.attendanceTo?.value ? new Date(`${els.attendanceTo.value}T00:00:00`) : null;
        if (end) end.setDate(end.getDate() + 1);
        return { start, end };
      }
      const end = new Date(today);
      end.setDate(end.getDate() + 1);
      return { start: today, end };
    }
    function attendanceTimestamp(row) {
      return row.entryAt || row.exitAt || row.createdAt || row.attendanceDate;
    }
    function gpsText(row) {
      if (row.latitude === null || row.latitude === undefined || row.longitude === null || row.longitude === undefined) return '';
      const accuracy = row.locationAccuracy ? ` (${Math.round(Number(row.locationAccuracy))}m)` : '';
      return `${Number(row.latitude).toFixed(5)}, ${Number(row.longitude).toFixed(5)}${accuracy}`;
    }
    function scannerLabel(row) {
      return row.scannedByName || row.gateStaffName || row.entryBy || row.exitBy || row.scanSource || '';
    }
    function filteredAttendanceRows() {
      const { start, end } = attendanceRange();
      const q = (els.attendanceSearch?.value || '').trim().toLowerCase();
      return state.attendance.filter((row) => {
        const time = new Date(attendanceTimestamp(row));
        if (start && time < start) return false;
        if (end && time >= end) return false;
        if (!q) return true;
        return [
          row.studentName, row.studentNumber, row.branch || row.gateName, row.position || row.classGrade,
          row.status, row.securityStatus, row.securityReason, scannerLabel(row)
        ].some((value) => String(value || '').toLowerCase().includes(q));
      });
    }
    function selectedApprovedCards() {
      const ids = Array.from(document.querySelectorAll('[data-card-select]:checked')).map((input) => input.value);
      return state.cards.filter((card) => ids.includes(card.id) && (card.status || 'Pending') === 'Approved');
    }
    function teamsAiAnswer(question = '') {
      const q = question.toLowerCase();
      const schoolPortal = isSchoolType(state.org?.type);
      const profile = orgWorkflowProfile();
      if (/notif|parent|arriv|enter|leave|left|time|morning|evening/.test(q)) {
        return schoolPortal
          ? 'Parent notifications are queued as push notifications when a student is scanned in or out. VeriCard uses the scan timestamp in the background, so the message includes morning, afternoon, or evening with the exact time. Set ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY in Vercel for real push delivery. Email and SMS can be added later.'
          : `${profile.scanNoun} logs are saved when people scan in, report at an area, or leave. Use Records for approvals and Reports for movement/security history.`;
      }
      if (/approve|reject|inactive|record/.test(q)) return 'Open Records, review each submitted person, then approve, reject, or mark inactive. Approved cards can be viewed, downloaded in bulk, or sent to super admin for printing.';
      if (/master|qr|register/.test(q)) {
        return schoolPortal
          ? 'Open Master Card, load the master card, then share or print its QR. Scanning that QR opens the school or university registration form.'
          : 'Open Master Card, load the master card, then share or print its QR. Scanning that QR opens the registration form for this organization roles.';
      }
      if (/print|download|bulk|card/.test(q)) return 'Open Records, tick approved cards, then use Download Selected Approved or Request Admin Print. Printing requests are priced at KES 100 per card for super admin handling.';
      if (/fee|balance/.test(q)) return schoolPortal ? 'Open Fees to upload a CSV from Excel. Parent notifications can be queued from fee balances.' : 'This portal uses operational reports, access history, approvals, and security logs instead of fee workflows.';
      if (/gate|scan|attendance|work|job|location|area/.test(q)) return schoolPortal ? 'Open Gate to register scanner staff and scan entry, report/update location, or exit. Entry and exit times are saved by the system timestamp.' : profile.assistantScan;
      if (/report|daily|weekly|monthly|year/.test(q)) return schoolPortal ? 'Open Reports, choose daily, weekly, monthly, or yearly, then download the report file.' : `Open Reports to download ${profile.reportPrefix.toLowerCase()} movement, active-location, and security-log history.`;
      return 'Start from Dashboard for status, Records for approvals, Master Card for QR registration, Set Front/Back for card design, and Teams AI whenever you need the next step.';
    }
    function renderAssistantMessages() {
      els.assistantGreeting.textContent = `${state.org?.name || 'VeriCard'} Teams AI`;
      const profile = orgWorkflowProfile();
      const intro = isSchoolType(state.org?.type)
        ? 'Ask me about approvals, master cards, QR registration, gate scans, parent notifications, reports, fees, bulk printing, or school attendance.'
        : `Ask me about approvals, master cards, QR registration, ${profile.scanNoun.toLowerCase()}, reports, access zones, bulk printing, or who is inside now.`;
      const messages = state.assistantMessages.length ? state.assistantMessages : [{ role: 'assistant', content: intro }];
      els.assistantMessages.innerHTML = messages.map((message) => `<div class="assistant-message ${message.role === 'user' ? 'assistant-message-user' : 'assistant-message-ai'}">${escapeHtml(message.content)}</div>`).join('');
      els.assistantMessages.scrollTop = els.assistantMessages.scrollHeight;
    }
    async function askTeamsAi(question) {
      const text = String(question || '').trim();
      if (!text) return;
      state.assistantMessages.push({ role: 'user', content: text });
      state.assistantMessages.push({ role: 'assistant', content: 'Thinking...' });
      renderAssistantMessages();
      try {
        const data = await api('/api/org/assistant', {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ messages: state.assistantMessages.slice(0, -1), question: text })
        });
        state.assistantMessages[state.assistantMessages.length - 1] = { role: 'assistant', content: data.answer || teamsAiAnswer(text) };
      } catch (error) {
        state.assistantMessages[state.assistantMessages.length - 1] = { role: 'assistant', content: `${teamsAiAnswer(text)}\n\nLive AI is unavailable right now: ${friendlyError(error)}` };
      }
      renderAssistantMessages();
    }
    function reportDateRange(period) {
      const now = new Date();
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      if (period === 'weekly') start.setDate(start.getDate() - 6);
      if (period === 'monthly') start.setDate(1);
      if (period === 'yearly') {
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
      }
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    function inDateRange(value, start, end) {
      if (!value) return false;
      const date = new Date(value);
      return !Number.isNaN(date.getTime()) && date >= start && date <= end;
    }
    function parseCsv(text) {
      const rows = [];
      let current = '';
      let row = [];
      let quoted = false;
      for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        const next = text[index + 1];
        if (char === '"' && quoted && next === '"') {
          current += '"';
          index += 1;
        } else if (char === '"') {
          quoted = !quoted;
        } else if (char === ',' && !quoted) {
          row.push(current.trim());
          current = '';
        } else if ((char === '\n' || char === '\r') && !quoted) {
          if (char === '\r' && next === '\n') index += 1;
          row.push(current.trim());
          if (row.some(Boolean)) rows.push(row);
          row = [];
          current = '';
        } else {
          current += char;
        }
      }
      row.push(current.trim());
      if (row.some(Boolean)) rows.push(row);
      const headers = rows.shift() || [];
      return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
    }
    async function api(path, options = {}) {
      let response;
      try {
        response = await fetch(path, options);
      } catch (error) {
        throw new Error(friendlyError(error));
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Request failed.');
      return data;
    }

    async function loadSetup() {
      const data = await api('/api/templates');
      state.templates = data.templates || [];
      state.orgRegistrationFields = data.orgRegistrationFields || {};
      els.orgType.innerHTML = '<option value="">Choose organization type</option>' + Object.entries(data.organizationTypes).map(([key, rule]) => `<option value="${key}">${rule.label}</option>`).join('');
      renderOrgRegistrationFields();
      if (state.masterToken) await loadScanRegistration();
    }

    function renderTemplateGallery(templates, selectedId, scope = 'dashboard') {
      const smartTemplates = buildSmartTemplates(templates, selectedId, scope);
      const activeId = smartTemplates.some((template) => template.id === selectedId) ? selectedId : smartTemplates[0]?.id;
      const gallery = scope === 'setup' ? els.setupTemplateGallery : null;
      const select = scope === 'setup' ? els.setupTemplateSelect : null;
      if (!gallery || !select) return;
      gallery.innerHTML = smartTemplates.map((template) => `
        <button type="button" class="template ${template.id === activeId ? 'active' : ''}" data-template-id="${template.id}" style="--template-color:${template.color};--template-accent:${template.accent};">
          <span class="template-preview template-${template.layout}">
            <span class="template-logo">${state.org?.logo ? `<img src="${escapeAttr(state.org.logo)}" alt="">` : '<b>ID</b>'}</span>
            <span class="template-org">${escapeHtml(state.org?.name || template.name)}</span>
            <span class="template-photo"></span>
            <span class="template-band">
              <span></span>
              <span></span>
              <span></span>
            </span>
            <span class="template-qr-mark"></span>
          </span>
          <strong>${template.name}</strong>
          <small>${template.description}</small>
          ${template.recommended ? '<span class="template-badge">Recommended</span>' : ''}
        </button>`).join('');
      select.innerHTML = smartTemplates.map((template) => `<option value="${template.id}" ${template.id === activeId ? 'selected' : ''}>${template.name}</option>`).join('');
      if (activeId) select.value = activeId;
    }

    function buildSmartTemplates(templates, selectedId, scope = 'dashboard') {
      const org = state.org || {};
      const type = org.type || 'custom';
      const label = org.typeLabel || niceLabel(type);
      const scopedColor = scope === 'setup' ? els.setupBrandColor?.value : els.dashboardBrandColor?.value;
      const primary = normalizeHexColor(scopedColor || org.brandColor || state.palette.primary);
      const accent = normalizeHexColor(state.palette.accent || smartAccentFromPrimary(primary));
      const alternate = normalizeHexColor(state.palette.colors?.[2] || smartAccentFromPrimary(accent));
      const purpose = {
        school: ['Scholar', 'Prefect', 'Guardian', 'Academic', 'Campus', 'Library'],
        university: ['Campus', 'Faculty', 'Student', 'Research', 'Hostel', 'Alumni'],
        company: ['Staff', 'Executive', 'Contractor', 'Visitor', 'Operations', 'Access'],
        hospital: ['Clinical', 'Doctor', 'Nurse', 'Ward', 'Visitor', 'Emergency'],
        security: ['Guard', 'Supervisor', 'Rapid', 'Patrol', 'Command', 'Access'],
        government: ['Official', 'Department', 'Field', 'Civic', 'Permit', 'Office'],
        ngo: ['Member', 'Volunteer', 'Outreach', 'Leader', 'Event', 'Community'],
        custom: ['Signature', 'Member', 'Access', 'Visitor', 'Team', 'Identity']
      }[type] || ['Signature', 'Member', 'Access', 'Visitor', 'Team', 'Identity'];
      const layouts = ['primary', 'clean', 'bold', 'qr', 'primary', 'clean'];
      const tones = [
        ['Classic', primary, accent, 'Logo-led front card with a strong brand band.'],
        ['Clear', primary, alternate, 'Clean daily-use design with easy field scanning.'],
        ['Bold', alternate, accent, 'High-contrast layout for fast visual checking.'],
        ['QR Focus', primary, accent, 'Verification-first card with a stronger scan area.'],
        ['Formal', primary, '#111827', 'Reserved official layout for administrators and leaders.'],
        ['Bright', accent, primary, 'Livelier layout for events, visitors, and front-desk use.']
      ];
      const generated = Array.from({ length: 50 }, (_, index) => {
        const tone = tones[index % tones.length];
        const purposeName = purpose[index % purpose.length];
        return {
          id: `${type}-smart-${index + 1}`,
          layout: layouts[index % layouts.length],
          name: `${label} ${purposeName} ${tone[0]}`,
          description: tone[3],
          color: tone[1],
          accent: tone[2],
          recommended: index === 0
        };
      });
      const merged = generated;
      if (selectedId && selectedId !== 'sample' && !merged.some((template) => template.id === selectedId)) {
        merged.push({ id: selectedId, layout: 'clean', name: 'Saved Template', description: 'Previously saved client template.', color: primary, accent });
      }
      return merged;
    }

    function savedTemplateLayout() {
      const selectedId = state.org?.templateId || 'sample';
      const templates = buildSmartTemplates(state.templates, selectedId, 'dashboard');
      return templates.find((template) => template.id === selectedId)?.layout || 'primary';
    }

    function applyCardLayout(stage) {
      const layout = savedTemplateLayout();
      const classes = ['card-layout-primary', 'card-layout-clean', 'card-layout-bold', 'card-layout-qr'];
      stage.querySelectorAll('.id-card').forEach((card) => {
        card.classList.remove(...classes);
        card.classList.add(`card-layout-${layout}`);
      });
    }

    function setImage(element, src) {
      if (src) {
        element.src = src;
        element.classList.remove('hidden');
      } else {
        element.removeAttribute('src');
        element.classList.add('hidden');
      }
    }

    function setLogoValue(scope, value) {
      const targets = {
        register: [els.registerLogoValue, els.registerLogoPreview],
        setup: [els.setupLogoValue, els.setupLogoPreview],
        dashboard: [els.dashboardLogoValue, els.dashboardLogoPreview]
      };
      const [input, preview] = targets[scope] || targets.dashboard;
      const removeButton = document.querySelector(`[data-logo-remove="${scope}"]`);
      input.value = value || '';
      setImage(preview, value || '');
      if (removeButton) removeButton.classList.toggle('hidden', !value);
    }

    function setBrandColorValue(scope, value) {
      const color = normalizeHexColor(value);
      const inputs = { register: els.registerBrandColor, setup: els.setupBrandColor, dashboard: els.dashboardBrandColor };
      const input = inputs[scope] || els.dashboardBrandColor;
      if (input) input.value = color;
      state.palette.primary = color;
      state.palette.accent = state.palette.accent || smartAccentFromPrimary(color);
      setBrandColor(color, state.palette.accent);
      setUploadStatus(scope, `Detected ${color.toUpperCase()}`, color);
      if (scope === 'setup' && state.org) renderTemplateGallery(state.templates, els.setupTemplateSelect.value || state.org.templateId || 'sample', 'setup');
    }

    function setUploadStatus(scope, text, color = '') {
      const status = document.querySelector(`[data-logo-status="${scope}"]`);
      if (!status) return;
      const swatch = status.querySelector('i');
      const label = status.querySelector('b');
      if (swatch && color) swatch.style.background = normalizeHexColor(color);
      if (label) label.textContent = text;
    }

    function readLogoFile(file) {
      return new Promise((resolve, reject) => {
        if (!file) {
          reject(new Error('Choose a logo image first.'));
          return;
        }
        const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];
        if (!allowed.includes(file.type)) {
          reject(new Error('Logo must be PNG, JPG, WEBP, GIF, or SVG.'));
          return;
        }
        if (file.size > 1_500_000) {
          reject(new Error('Logo is too large. Use an image under 1.5MB.'));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Unable to read this logo file.'));
        reader.readAsDataURL(file);
      });
    }

    function readPersonPhotoFile(file) {
      return new Promise((resolve, reject) => {
        if (!file || !file.size) {
          resolve('');
          return;
        }
        const allowed = ['image/png', 'image/jpeg', 'image/webp'];
        if (!allowed.includes(file.type)) {
          reject(new Error('Photo must be PNG, JPG, or WEBP.'));
          return;
        }
        if (file.size > 3_000_000) {
          reject(new Error('Photo is too large. Use an image under 3MB.'));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Unable to read this photo file.'));
        reader.readAsDataURL(file);
      });
    }

    async function handleLogoFile(scope, file) {
      const box = document.querySelector(`[data-logo-drop="${scope}"]`);
      box?.classList.add('processing');
      setUploadStatus(scope, 'Reading logo...');
      const logo = await readLogoFile(file);
      setLogoValue(scope, logo);
      setUploadStatus(scope, 'Detecting color...');
      const palette = await extractLogoPalette(logo);
      state.palette = palette;
      setBrandColor(palette.primary, palette.accent);
      setBrandColorValue(scope, palette.primary);
      setUploadStatus(scope, `Detected ${palette.primary.toUpperCase()}`, palette.primary);
      box?.classList.remove('processing');
    }

    function setupLogoUploader(scope) {
      const box = document.querySelector(`[data-logo-drop="${scope}"]`);
      const fileInputs = { register: els.registerLogoFile, setup: els.setupLogoFile, dashboard: els.dashboardLogoFile };
      const fileInput = fileInputs[scope] || els.dashboardLogoFile;
      const pickButton = document.querySelector(`[data-logo-pick="${scope}"]`);
      const removeButton = document.querySelector(`[data-logo-remove="${scope}"]`);
      pickButton.addEventListener('click', () => fileInput.click());
      removeButton.addEventListener('click', () => {
        fileInput.value = '';
        state.palette = defaultPalette();
        setLogoValue(scope, '');
        setBrandColorValue(scope, '#061a30');
        setUploadStatus(scope, 'Auto color ready', '#061a30');
      });
      fileInput.addEventListener('change', () => handleLogoFile(scope, fileInput.files[0]).catch((error) => {
        box.classList.remove('processing');
        setUploadStatus(scope, 'Upload failed');
        alert(friendlyError(error));
      }));
      box.addEventListener('dragover', (event) => {
        event.preventDefault();
        box.classList.add('dragging');
      });
      box.addEventListener('dragleave', () => box.classList.remove('dragging'));
      box.addEventListener('drop', (event) => {
        event.preventDefault();
        box.classList.remove('dragging');
        handleLogoFile(scope, event.dataTransfer.files[0]).catch((error) => {
          box.classList.remove('processing');
          setUploadStatus(scope, 'Upload failed');
          alert(friendlyError(error));
        });
      });
      box.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          fileInput.click();
        }
      });
    }

    async function loadScanRegistration() {
      els.scanPanel.classList.remove('hidden');
      try {
        const data = await api(`/api/org/register-info?token=${encodeURIComponent(state.masterToken)}`);
        state.org = data.organization;
        state.rules = data.rules;
        applyOrganizationLanguage();
        window.loadOrganizationFeature?.(data.organization.type);
        document.title = `${data.organization.name} Registration`;
        els.portalTitle.textContent = `${data.organization.name} Registration`;
        setBrandColor(data.organization.brandColor || '#061a30');
        els.scanNotice.textContent = `${data.organization.name} is active. Choose the correct registration type for this organization and submit for admin approval.`;
        els.applyForm.classList.remove('hidden');
        els.roleType.innerHTML = Object.entries(data.rules.roles).map(([key, role]) => `<option value="${key}">${role.label}</option>`).join('');
        renderDynamicFields();
      } catch (error) {
        els.scanNotice.classList.add('danger');
        els.scanNotice.textContent = error.message;
      }
    }

    function renderDynamicFields() {
      const role = state.rules.roles[els.roleType.value];
      let fields = role.required.concat(role.optional || []);
      let teacherFields = '';
      if (state.org?.type === 'school' && els.roleType.value === 'student') {
        const schoolType = state.org?.backSettings?.schoolType || 'day';
        if (schoolType !== 'mixed') fields = fields.filter((field) => field !== 'studentCategory');
        if (schoolType === 'boarding') {
          teacherFields = '<label>Class teacher name<input name="classTeacherName" required></label><label>Class teacher phone<input name="classTeacherPhone" type="tel" required></label>';
        } else if (schoolType === 'mixed') {
          teacherFields = '<label>Class teacher name<input name="classTeacherName" data-boarding-teacher></label><label>Class teacher phone<input name="classTeacherPhone" type="tel" data-boarding-teacher></label>';
        }
      }
      if (state.org?.type === 'school' && els.roleType.value === 'teacher') {
        fields = fields.filter((field) => !['classTeacherStatus', 'assignedClass'].includes(field));
        teacherFields = '<label>Class teacher<select name="classTeacherStatus" required><option value="no">No</option><option value="yes">Yes</option></select></label><label>Assigned class<input name="assignedClass" data-class-teacher-class></label>';
      }
      els.dynamicFields.innerHTML = fields.map((field) => {
        if (field === 'studentCategory') return '<label>Student category<select name="studentCategory" required><option value="">Choose student category</option><option value="day">Day student</option><option value="boarding">Boarding student</option></select></label>';
        if (field === 'photo') return `<label>${niceLabel(field)}<input name="photo" type="file" accept="image/png,image/jpeg,image/webp" ${role.required.includes(field) ? 'required' : ''}><small>Choose a real photo from the device gallery.</small></label>`;
        const type = field === 'email' ? 'email' : (/At$/i.test(field) ? 'datetime-local' : (/date|until|from|expiry/i.test(field) ? 'date' : 'text'));
        return `<label>${niceLabel(field)}<input name="${field}" type="${type}" ${role.required.includes(field) ? 'required' : ''}></label>`;
      }).join('') + teacherFields;
      const category = els.dynamicFields.querySelector('[name="studentCategory"]');
      const updateTeacherRequirement = () => {
        const required = category?.value === 'boarding';
        els.dynamicFields.querySelectorAll('[data-boarding-teacher]').forEach((input) => { input.required = required; });
      };
      category?.addEventListener('change', updateTeacherRequirement);
      updateTeacherRequirement();
      const classTeacherStatus = els.dynamicFields.querySelector('[name="classTeacherStatus"]');
      const updateAssignedClassRequirement = () => {
        const required = classTeacherStatus?.value === 'yes';
        els.dynamicFields.querySelectorAll('[data-class-teacher-class]').forEach((input) => { input.required = required; });
      };
      classTeacherStatus?.addEventListener('change', updateAssignedClassRequirement);
      updateAssignedClassRequirement();
    }

    function fillBackSettingsForm() {
      const settings = state.org?.backSettings || {};
      renderSchoolBackFields();
      for (const element of els.backSettingsForm.elements) {
        if (element.name && settings[element.name] !== undefined) element.value = settings[element.name] || '';
      }
    }

    function renderBackSettings(card = null) {
      const settings = state.org?.backSettings || {};
      const fields = card?.fields || {};
      const student = card?.roleType === 'student';
      const schoolLike = isSchoolType(state.org?.type);
      els.backMission.textContent = schoolLike && settings.mission ? `MISSION: ${settings.mission}` : '';
      els.backVision.textContent = schoolLike && settings.vision ? `VISION: ${settings.vision}` : '';
      els.backIdentityNumber.textContent = student
        ? `${state.org?.type === 'university' ? 'Matric No' : 'Admission No'}: ${fields.matricNumber || fields.admissionNumber || fields.displayNumber || ''}`
        : (card?.nationalId ? `National ID No: ${card.nationalId}` : '');
      els.backReturnTitle.textContent = settings.returnTitle || '';
      els.backReturnName.textContent = settings.returnName || '';
      els.backPoBox.textContent = settings.poBox ? `P.O. Box: ${settings.poBox}` : '';
      els.backPhone.textContent = settings.phone ? `Phone: ${settings.phone}` : '';
      els.backLostInstruction.textContent = settings.lostInstruction || '';
      els.backAddress1.textContent = settings.addressLine1 || '';
      els.backDesk.textContent = settings.returnDesk || '';
      els.backResponsibilities.textContent = settings.cardholderResponsibilities || '';
    }

    function frontCardNumber(card) {
      const fields = card?.fields || {};
      return fields.displayNumber
        || fields.admissionNumber
        || fields.matricNumber
        || fields.employeeId
        || fields.contractorId
        || fields.internId
        || fields.staffId
        || fields.membershipId
        || fields.workerId
        || fields.leaderId
        || fields.guardId
        || fields.supervisorId
        || fields.officerId
        || fields.contractId
        || fields.memberId
        || fields.licenseNumber
        || fields.queueNumber
        || fields.appointmentReference
        || fields.studentAdmissionNumber
        || fields.studentMatricNumber
        || fields.nationalId
        || card?.id
        || '';
    }

    function frontCardRole(card) {
      const fields = card?.fields || {};
      return card?.position
        || fields.position
        || fields.role
        || fields.rank
        || fields.specialty
        || fields.assignedSite
        || fields.deploymentSite
        || fields.officeBranch
        || fields.visitTo
        || fields.purposeOfVisit
        || fields.department
        || card?.roleType
        || '';
    }

    function frontCardExpiry(card) {
      const fields = card?.fields || {};
      return fields.validUntilAt
        || fields.validUntil
        || fields.expiryDate
        || fields.credentialExpiryDate
        || fields.licenseExpiryDate
        || fields.visitDate
        || state.org?.backSettings?.cardExpiryDate
        || '';
    }

    function showIdCard(card) {
      if (!card || (card.status || 'Pending') !== 'Approved') {
        alert('Approve this record before viewing the ID card.');
        return;
      }
      const logo = state.org?.logo || '';
      setDashboardView('front');
      els.previewEmpty.classList.add('hidden');
      els.idCardStage.classList.remove('hidden');
      applyCardLayout(els.idCardStage);
      setImage(els.idFrontLogo, logo);
      setImage(els.idBackLogo, logo);
      els.idFrontOrgName.textContent = state.org?.name || '';
      els.idCardName.textContent = card.name || '';
      els.idCardNumber.textContent = frontCardNumber(card);
      const isSchoolStudentCard = state.org?.type === 'school' && card.roleType === 'student';
      els.idCardRoleLabel.textContent = isSchoolStudentCard ? 'Class:' : 'Role:';
      els.idCardRole.textContent = isSchoolStudentCard ? [card.fields?.classGrade, card.fields?.stream].filter(Boolean).join(' - ') : frontCardRole(card);
      els.idCardExpiry.textContent = frontCardExpiry(card);
      const authorityName = state.org?.backSettings?.authorityName || state.org?.ownerName || '';
      els.frontAuthorityName.textContent = authorityName ? `E-Signature: ${authorityName}` : '';
      if (card.photo) {
        els.idPhoto.src = card.photo;
        els.idPhoto.classList.remove('hidden');
        els.idPhotoPlaceholder.classList.add('hidden');
      } else {
        els.idPhoto.removeAttribute('src');
        els.idPhoto.classList.add('hidden');
        els.idPhotoPlaceholder.classList.remove('hidden');
      }
      els.idCardQr.src = qrUrl(cardVerificationUrl(card));
      renderBackSettings(card);
    }

    function applySubscriptionLock(locked) {
      document.querySelectorAll('[data-lock-notice]').forEach((notice) => {
        notice.classList.toggle('hidden', !locked);
      });
      if (locked) {
        els.subscriptionNotice.textContent = 'Template saved. Subscription inactive: payment unlocks master card download, registrations, approvals, and printing.';
        els.subscriptionNotice.classList.add('danger');
        els.subscriptionNotice.classList.remove('hidden');
        const schoolPortal = isSchoolType(state.org?.type);
        els.masterCard.classList.add('hidden');
        els.cardsBody.innerHTML = '<tr><td colspan="7">Subscription is inactive. Payment unlocks approvals and ID card records.</td></tr>';
        els.attendanceBody.innerHTML = '<tr><td colspan="12">Subscription is inactive. Payment unlocks gate attendance.</td></tr>';
        els.gateStaffBody.innerHTML = '<tr><td colspan="8">Subscription is inactive. Payment unlocks scanner staff management.</td></tr>';
        els.gateDevicesBody.innerHTML = '<tr><td colspan="5">Subscription is inactive. Payment unlocks scanner device approval.</td></tr>';
        els.feesBody.innerHTML = schoolPortal
          ? '<tr><td colspan="7">Subscription is inactive. Payment unlocks fee management.</td></tr>'
          : '<tr><td colspan="7">This organization uses operational access reports, not fee management.</td></tr>';
        els.reportsSummary.innerHTML = '<div class="dash-card"><strong>Locked</strong>Subscription inactive</div>';
        els.notificationsBody.innerHTML = schoolPortal
          ? '<tr><td colspan="8">Subscription is inactive. Payment unlocks parent communication logs.</td></tr>'
          : '<tr><td colspan="8">Subscription is inactive. Payment unlocks operational logs.</td></tr>';
      } else {
        els.subscriptionNotice.classList.toggle('hidden', document.querySelector('[data-dashboard-view="front"]')?.classList.contains('hidden'));
      }
    }

    function setOrgSession(data) {
      state.token = data.token;
      state.org = data.organization;
      window.loadOrganizationFeature?.(data.organization.type);
      applyOrganizationLanguage();
      state.templates = data.templates || state.templates;
      state.locked = Boolean(data.locked);
      state.palette.primary = normalizeHexColor(data.organization.brandColor || '#061a30');
      state.palette.accent = smartAccentFromPrimary(state.palette.primary);
      state.palette.colors = [state.palette.primary, state.palette.accent];
      document.title = `${data.organization.name} ID Cards Portal`;
      els.portalTitle.textContent = `${data.organization.name} ID Cards Portal`;
      els.sessionStatus.textContent = `${data.organization.name} - ${data.organization.subscriptionStatus}`;
      els.logoutBtn.classList.remove('hidden');
      if (needsInitialTemplateChoice(data.organization)) {
        showInitialTemplateSetup();
        return;
      }
      openDashboard(state.locked);
    }

    function needsInitialTemplateChoice(org) {
      return !org.templateId || org.templateId === 'sample';
    }

    function showInitialTemplateSetup() {
      els.portalIntro.classList.add('hidden');
      els.entryArea.classList.add('hidden');
      els.dashboard.classList.add('hidden');
      els.templateSetup.classList.remove('hidden');
      els.drawerToggle.classList.add('hidden');
      toggleDrawer(false);
      setLogoValue('setup', state.org.logo || '');
      setBrandColorValue('setup', state.org.brandColor || '#061a30');
      renderTemplateGallery(state.templates, state.org.templateId || 'sample', 'setup');
    }

    function openDashboard(locked) {
      els.templateSetup.classList.add('hidden');
      els.dashboard.classList.remove('hidden');
      showDashboardShell();
      applyOrganizationLanguage();
      fillBackSettingsForm();
      setLogoValue('dashboard', state.org.logo || '');
      setBrandColorValue('dashboard', state.org.brandColor || '#061a30');
      applySubscriptionLock(locked);
      if (locked) {
        return;
      } else {
        loadCards().catch((error) => alert(error.message));
        loadOrgSummary().catch((error) => alert(error.message));
        loadAttendance().catch((error) => alert(error.message));
        loadGateStaff().catch((error) => alert(error.message));
        if (isSchoolType(state.org?.type)) {
          loadFees().catch((error) => alert(error.message));
          loadNotifications().catch((error) => alert(error.message));
        }
      }
      loadSecurityLogs().catch((error) => alert(error.message));
    }

    async function saveInitialTemplate() {
      if (!els.setupTemplateSelect.value) throw new Error('Choose a template before continuing.');
      const data = await api('/api/org/branding', {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ logo: els.setupLogoValue.value, brandColor: els.setupBrandColor.value, templateId: els.setupTemplateSelect.value })
      });
      state.org = data.organization;
      state.templates = data.templates || state.templates;
      state.locked = state.org.subscriptionActive === false || state.org.subscriptionStatus !== 'Active';
      setLogoValue('dashboard', state.org.logo || '');
      setBrandColorValue('dashboard', state.org.brandColor || '#061a30');
      openDashboard(state.locked);
    }

    async function loadMasterCard() {
      const data = await api('/api/org/master-card', { headers: headers() });
      const card = data.masterCard;
      const settings = card.backSettings || {};
      els.masterCard.classList.remove('hidden');
      applyCardLayout(els.masterCard);
      setImage(els.masterLogo, card.organization.logo || '');
      setImage(els.masterBackLogo, card.organization.logo || '');
      els.masterOrgName.textContent = card.organization.name;
      els.masterOrgType.textContent = card.organization.typeLabel;
      els.masterNumber.textContent = `Master No: ${card.number}`;
      els.masterBusiness.textContent = `Reg No: ${card.organization.businessNumber}`;
      els.masterAuthority.textContent = card.organization.authorityName ? `E-Signature: ${card.organization.authorityName}` : '';
      els.masterQr.src = qrUrl(card.qrUrl);
      els.masterBackMission.textContent = ['school', 'university'].includes(card.organization.type) && settings.mission ? `MISSION: ${settings.mission}` : '';
      els.masterBackVision.textContent = ['school', 'university'].includes(card.organization.type) && settings.vision ? `VISION: ${settings.vision}` : '';
      els.masterBackReturnTitle.textContent = settings.returnTitle || 'If found please return to:';
      els.masterBackReturnName.textContent = settings.returnName || card.organization.name;
      els.masterBackPoBox.textContent = settings.poBox ? `P.O. Box: ${settings.poBox}` : '';
      els.masterBackPhone.textContent = settings.phone ? `Phone: ${settings.phone}` : '';
      els.masterBackLostInstruction.textContent = settings.lostInstruction || '';
    }

    async function loadCards() {
      const data = await api('/api/org/cards', { headers: headers() });
      state.cards = data.cards || [];
      if (!data.cards.length) {
        els.cardsBody.innerHTML = '<tr><td colspan="8">No registrations yet.</td></tr>';
        els.selectApprovedCards.checked = false;
        return;
      }
      els.cardsBody.innerHTML = data.cards.map((card) => `
        <tr>
          <td>${(card.status || 'Pending') === 'Approved' ? `<input type="checkbox" data-card-select value="${escapeAttr(card.id)}" aria-label="Select ${escapeAttr(card.name)}">` : ''}</td>
          <td>${escapeHtml(card.id)}</td><td>${escapeHtml(card.name)}</td><td>${escapeHtml(card.roleType || card.position)}</td>
          <td>${escapeHtml(card.phone || '')}</td><td>${escapeHtml(card.email || '')}</td><td>${escapeHtml(card.status || 'Pending')}</td>
          <td class="row">
            ${(card.status || 'Pending') === 'Approved' ? `<button data-id="${escapeAttr(card.id)}" data-action="view">View Card</button>` : ''}
            <button data-id="${escapeAttr(card.id)}" data-action="rotate" class="secondary">Rotate QR</button>
            <button data-id="${escapeAttr(card.id)}" data-status="Approved">Approve</button>
            <button data-id="${escapeAttr(card.id)}" data-status="Rejected" class="secondary">Reject</button>
            <button data-id="${escapeAttr(card.id)}" data-status="Inactive" class="secondary">Inactive</button>
          </td>
        </tr>`).join('');
      els.selectApprovedCards.checked = false;
    }

    async function loadAttendance() {
      const data = await api('/api/org/attendance', { headers: headers() });
      state.attendance = data.attendance || [];
      renderAttendance();
    }

    function renderAttendance() {
      const rows = filteredAttendanceRows();
      const signedIn = rows.filter((row) => row.entryAt).length;
      const signedOut = rows.filter((row) => row.exitAt).length;
      const noSignOut = rows.filter((row) => row.entryAt && !row.exitAt).length;
      if (els.attendanceSummary) {
        els.attendanceSummary.innerHTML = [
          ['Records', rows.length],
          ['Signed In', signedIn],
          ['Signed Out', signedOut],
          ['No Sign-Out', noSignOut]
        ].map(([label, value]) => `<div class="dash-card"><strong>${value}</strong>${label}</div>`).join('');
      }
      els.attendanceBody.innerHTML = rows.length ? rows.map((row) => {
        const branch = row.branch || row.gateName || '';
        const position = row.position || row.classGrade || '';
        const alert = row.entryAt && !row.exitAt ? 'No Sign-Out' : (row.securityStatus || '');
        return `
        <tr>
          <td>${escapeHtml(row.studentName)}</td>
          <td>${escapeHtml(row.studentNumber || '')}</td>
          <td>${escapeHtml(branch)}</td>
          <td>${escapeHtml(position)}</td>
          <td>${formatDate(row.attendanceDate)}</td>
          <td>${formatTime(attendanceTimestamp(row))}</td>
          <td>${formatTime(row.entryAt)}</td>
          <td>${formatTime(row.exitAt)}</td>
          <td>${escapeHtml(row.status)}</td>
          <td>${escapeHtml(alert)}</td>
          <td>${escapeHtml(scannerLabel(row))}</td>
          <td>${escapeHtml(gpsText(row))}</td>
        </tr>`;
      }).join('') : '<tr><td colspan="12">No attendance scans for this filter.</td></tr>';
      if (els.activeNowBody) {
        const activeRows = rows.filter((row) => row.entryAt && !row.exitAt);
        els.activeNowBody.innerHTML = activeRows.length ? activeRows.map((row) => `
          <tr>
            <td>${escapeHtml(row.studentName)}</td>
            <td>${escapeHtml(row.studentNumber || '')}</td>
            <td>${escapeHtml(row.branch || row.gateName || '')}</td>
            <td>${formatTime(row.entryAt)}</td>
            <td>${escapeHtml(scannerLabel(row))}</td>
          </tr>`).join('') : '<tr><td colspan="5">No active workers in this filter.</td></tr>';
      }
    }

    async function loadGateStaff() {
      const data = await api('/api/org/gate-staff', { headers: headers() });
      const rows = data.staff || [];
      state.scanners = rows;
      els.gateStaffBody.innerHTML = rows.length ? rows.map((staff) => `
        <tr>
          <td>${escapeHtml(staff.fullName)}</td>
          <td>${escapeHtml(staff.phone || '')}</td>
          <td>${escapeHtml(staff.gateName)}<br>${escapeHtml(staff.staffRole || 'Scanner Staff')}</td>
          <td>${escapeHtml(staff.status)}</td>
          <td>${formatTime(staff.lastScanAt)}</td>
          <td>${Number(staff.todayScanCount || 0).toLocaleString()}</td>
          <td>${staff.setupLink ? `<button type="button" class="secondary" data-copy-link="${escapeAttr(staff.setupLink)}">Copy</button>` : escapeHtml(staff.setupStatus || 'Used')}</td>
          <td class="row">
            ${staff.setupStatus === 'Pending' ? `<button type="button" data-resend-scanner="${escapeAttr(staff.id)}">Resend</button>` : ''}
            <button type="button" data-gate-staff="${escapeAttr(staff.id)}" data-status="${staff.status === 'Active' ? 'Suspended' : 'Active'}">${staff.status === 'Active' ? 'Disable' : 'Activate'}</button>
          </td>
        </tr>`).join('') : '<tr><td colspan="8">No scanner setup links created yet.</td></tr>';
      const devices = data.devices || [];
      els.gateDevicesBody.innerHTML = devices.length ? devices.map((device) => `
        <tr>
          <td>${escapeHtml(device.deviceId)}</td>
          <td>${escapeHtml(device.gateName || '')}</td>
          <td>${escapeHtml(device.status)}</td>
          <td>${formatTime(device.lastSeenAt || device.createdAt)}</td>
          <td>
            <button type="button" data-gate-device="${escapeAttr(device.id)}" data-status="Approved">Approve</button>
            <button type="button" class="secondary" data-gate-device="${escapeAttr(device.id)}" data-status="Blocked">Block</button>
          </td>
        </tr>`).join('') : '<tr><td colspan="5">No scanner devices registered yet.</td></tr>';
    }

    async function registerGateStaff() {
      const payload = Object.fromEntries(new FormData(els.gateStaffForm).entries());
      const data = await api('/api/org/gate-staff', { method: 'POST', headers: headers(), body: JSON.stringify(payload) });
      els.gateStaffForm.reset();
      if (els.scannerSetupNotice) {
        els.scannerSetupNotice.textContent = `Setup link created. Send by WhatsApp: ${data.staff.setupLink || ''}`;
        els.scannerSetupNotice.classList.remove('hidden', 'danger');
      }
      await loadGateStaff();
    }

    function exportAttendanceCsv() {
      const rows = filteredAttendanceRows();
      const header = ['Worker name', 'Worker ID', 'Branch', 'Position', 'Date', 'Time', 'Signed In time', 'Signed Out time', 'Status', 'Alert', 'Scanned By', 'GPS'];
      const body = rows.map((row) => [
        row.studentName, row.studentNumber, row.branch || row.gateName || '', row.position || row.classGrade || '',
        row.attendanceDate, formatTime(attendanceTimestamp(row)), formatTime(row.entryAt), formatTime(row.exitAt),
        row.status, row.entryAt && !row.exitAt ? 'No Sign-Out' : row.securityStatus || '', scannerLabel(row), gpsText(row)
      ]);
      const name = (state.org?.name || 'vericard').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'vericard';
      downloadCsv(`${name}-attendance-${isoDate(new Date())}.csv`, [header, ...body]);
    }

    async function loadOrgSummary() {
      const data = await api('/api/org/dashboard-summary', { headers: headers() });
      const summary = data.summary || {};
      const profile = orgWorkflowProfile();
      const cards = isSchoolType(state.org?.type)
        ? [
            ['Total students', summary.totalStudents || 0],
            ['Active cards', summary.activeCards || 0],
            ['Cleared students', summary.clearedStudents || 0],
            ['Suspended students', summary.suspendedStudents || 0]
          ]
        : [
            [profile.personLabel, summary.totalCards || 0],
            ['Active cards', summary.activeCards || 0],
            [profile.visitorLabel, summary.visitors || 0],
            [profile.expiringLabel, summary.expiringSoon || 0],
            [profile.approvalLabel, summary.pendingApprovals || 0],
            [profile.zoneLabel, summary.accessZones || 0],
            [profile.activeLabel, summary.insideNow || 0],
            ['At work today', summary.atWorkToday || 0]
          ];
      els.orgDashboardSummary.innerHTML = cards.map(([label, value]) => `<div class="dash-card"><strong>${escapeHtml(value)}</strong>${escapeHtml(label)}</div>`).join('');
      const branchCards = Array.isArray(summary.branchReports) ? summary.branchReports.map((item) => [`${profile.reportPrefix}: ${item.label}`, item.count]) : [];
      els.reportsSummary.innerHTML = cards.concat(branchCards).map(([label, value]) => `<div class="dash-card"><strong>${escapeHtml(value)}</strong>${escapeHtml(label)}</div>`).join('');
      const scans = data.recentScans || [];
      els.recentScansBody.innerHTML = scans.length ? scans.map((scan) => `
        <tr><td>${escapeHtml(scan.studentName)}</td><td>${formatDate(scan.attendanceDate)}</td><td>${formatTime(scan.entryAt)}</td><td>${formatTime(scan.exitAt)}</td><td>${escapeHtml(scan.status)}</td></tr>
      `).join('') : '<tr><td colspan="5">No recent scans yet.</td></tr>';
    }

    async function loadFees() {
      if (!isSchoolType(state.org?.type)) {
        els.feesBody.innerHTML = '<tr><td colspan="7">This organization uses operational access reports instead.</td></tr>';
        return;
      }
      const data = await api('/api/org/fees', { headers: headers() });
      const fees = data.fees || [];
      els.feesBody.innerHTML = fees.length ? fees.map((fee) => `
        <tr>
          <td>${escapeHtml(fee.admissionNumber)}</td>
          <td>${escapeHtml(fee.studentName)}</td>
          <td>${escapeHtml(fee.classGrade || '')}</td>
          <td>${money(fee.balance)}</td>
          <td>${escapeHtml(fee.dueDate || '')}</td>
          <td>${escapeHtml(fee.feeStatus)}</td>
          <td><button type="button" data-fee-notify="${escapeAttr(fee.admissionNumber)}">Notify Parent</button></td>
        </tr>`).join('') : '<tr><td colspan="7">No fee records yet.</td></tr>';
    }

    async function loadNotifications() {
      if (!isSchoolType(state.org?.type)) {
        els.notificationsBody.innerHTML = '<tr><td colspan="8">Operational communication logs are not enabled for this organization yet.</td></tr>';
        return;
      }
      const data = await api('/api/org/notifications', { headers: headers() });
      const logs = data.notifications || [];
      els.notificationsBody.innerHTML = logs.length ? logs.map((log) => `
        <tr>
          <td>${escapeHtml(log.studentName)}</td>
          <td>${escapeHtml(log.admissionNumber || '')}</td>
          <td>${escapeHtml(log.parentEmail || log.parentPhone || '')}</td>
          <td>${String(log.channel || 'sms').toUpperCase()}</td>
          <td>${escapeHtml(log.notificationType)}</td>
          <td>${escapeHtml(log.deliveryStatus || log.status || 'Queued')}</td>
          <td>${escapeHtml(log.message)}</td>
          <td>${new Date(log.createdAt).toLocaleString()}</td>
        </tr>`).join('') : '<tr><td colspan="8">No parent communication logs yet.</td></tr>';
    }

    async function loadSecurityLogs() {
      const params = new URLSearchParams();
      if (els.securityLogResult?.value) params.set('result', els.securityLogResult.value);
      if (els.securityLogAlert?.value) params.set('alertLevel', els.securityLogAlert.value);
      const path = `/api/org/security-logs${params.toString() ? `?${params}` : ''}`;
      const data = await api(path, { headers: headers() });
      const logs = data.logs || [];
      els.securityLogsBody.innerHTML = logs.length ? logs.map((log) => `
        <tr>
          <td>${escapeHtml(log.alertLevel || 'none')}</td>
          <td>${escapeHtml(log.confidenceScore ?? '')}</td>
          <td>${escapeHtml(log.result)}</td>
          <td>${escapeHtml(log.action || '')}</td>
          <td>${escapeHtml(log.cardName || log.gateStaffName || '')}</td>
          <td>${escapeHtml(log.reason || '')}</td>
          <td>${escapeHtml(log.gateName || '')}</td>
          <td><code>${escapeHtml(log.deviceId || '')}</code></td>
          <td>${log.latitude && log.longitude ? `${escapeHtml(log.latitude)}, ${escapeHtml(log.longitude)} (${escapeHtml(log.locationAccuracy || '?')}m)` : ''}</td>
          <td>${log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}</td>
        </tr>`).join('') : '<tr><td colspan="10">No security logs yet.</td></tr>';
    }

    async function uploadFees() {
      const file = els.feeUploadFile.files[0];
      if (!file) throw new Error('Choose a CSV file exported from Excel first.');
      const rows = parseCsv(await file.text());
      const data = await api('/api/org/fees/upload', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ rows })
      });
      els.feeNotice.textContent = `${(data.fees || []).length} fee row(s) saved. ${(data.notifications || []).length} push notification(s) queued.`;
      els.feeNotice.classList.remove('hidden', 'danger');
      await Promise.all([loadFees(), loadNotifications(), loadOrgSummary()]);
    }

    async function recordGateScan() {
      const payload = { ...Object.fromEntries(new FormData(els.gateScanForm).entries()), ...(await dashboardScanMeta()) };
      let data;
      try {
        data = await api('/api/org/gate-scan', { method: 'POST', headers: headers(), body: JSON.stringify(payload) });
      } catch (error) {
        if (!/override requires/i.test(error.message || '')) throw error;
        const securityOverrideReason = prompt(`${error.message}\n\nEnter override reason:`);
        if (!securityOverrideReason) throw error;
        const adminPassword = prompt('Enter organization admin password to approve this override:');
        if (!adminPassword) throw error;
        data = await api('/api/org/gate-scan', {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ ...payload, securityOverrideReason, adminPassword })
        });
      }
      els.gateScanNotice.textContent = data.message || 'Gate scan recorded.';
      els.gateScanNotice.classList.remove('hidden', 'danger');
      els.gateScanForm.elements.token.value = '';
      await loadAttendance();
    }

    async function saveBackSettings() {
      const backSettings = Object.fromEntries(new FormData(els.backSettingsForm).entries());
      const data = await api('/api/org/back-settings', { method: 'PATCH', headers: headers(), body: JSON.stringify({ backSettings }) });
      state.org = data.organization;
      fillBackSettingsForm();
      renderBackSettings();
      alert('Back card settings saved.');
    }

    async function sendOrgResetCode() {
      const form = new FormData(els.orgResetForm);
      const data = await api('/api/org-forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email') })
      });
      els.loginNotice.textContent = data.message || 'Verification code created.';
      els.loginNotice.classList.remove('hidden');
    }

    async function resetOrgPassword() {
      const payload = Object.fromEntries(new FormData(els.orgResetForm).entries());
      await api('/api/org-reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      els.loginNotice.textContent = 'Password reset successfully. Login with the new password.';
      els.loginNotice.classList.remove('hidden');
      els.orgResetForm.classList.add('hidden');
    }

    async function saveBranding() {
      const data = await api('/api/org/branding', {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ logo: els.dashboardLogoValue.value, brandColor: els.dashboardBrandColor.value, templateId: state.org?.templateId || 'sample' })
      });
      state.org = data.organization;
      state.templates = data.templates || state.templates;
      setLogoValue('dashboard', state.org.logo || '');
      setBrandColorValue('dashboard', state.org.brandColor || '#061a30');
      alert('Branding saved.');
    }

    async function downloadOrgBackup() {
      const adminPassword = promptOrgPassword('export backup data');
      const data = await api('/api/org/backup', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ adminPassword })
      });
      const name = (state.org?.name || 'vericard').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'vericard';
      downloadJson(`${name}-backup-${new Date().toISOString().slice(0, 10)}.json`, data);
    }

    async function downloadPeriodReport() {
      const period = els.reportPeriod.value || 'daily';
      const { start, end } = reportDateRange(period);
      const profile = orgWorkflowProfile();
      const adminPassword = promptOrgPassword('download this report');
      const data = await api('/api/org/backup', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ adminPassword })
      });
      const cards = data.cards || [];
      const attendance = data.attendanceRecords || [];
      const schoolPortal = isSchoolType(state.org?.type);
      const fees = schoolPortal ? (data.feeRecords || []) : [];
      const notifications = schoolPortal ? (data.parentNotifications || []) : [];
      const securityLogs = data.scanSecurityLogs || [];
      const filteredAttendance = attendance.filter((row) => inDateRange(row.created_at || row.attendance_date || row.entry_at || row.exit_at, start, end));
      const filteredFees = fees.filter((row) => inDateRange(row.updated_at || row.created_at || row.due_date, start, end));
      const filteredNotifications = notifications.filter((row) => inDateRange(row.created_at, start, end));
      const filteredSecurityLogs = securityLogs.filter((row) => inDateRange(row.created_at, start, end));
      const areaBreakdown = filteredAttendance.reduce((acc, row) => {
        const label = row.gate_name || row.class_grade || row.scan_source || 'General';
        acc[label] = (acc[label] || 0) + 1;
        return acc;
      }, {});
      const summary = {
        totalCards: cards.length,
        approvedCards: cards.filter((card) => card.status === 'Approved').length,
        pendingCards: cards.filter((card) => card.status === 'Pending').length,
        attendanceScans: filteredAttendance.length,
        securityEvents: filteredSecurityLogs.length,
        activeInside: filteredAttendance.filter((row) => row.status === 'Inside').length,
        reportBreakdownLabel: profile.reportPrefix,
        areaBreakdown
      };
      if (schoolPortal) {
        summary.feeRows = filteredFees.length;
        summary.feeBalanceTotal = filteredFees.reduce((sum, fee) => sum + Number(fee.balance || 0), 0);
        summary.notifications = filteredNotifications.length;
      }
      const report = {
        organization: data.organization,
        period,
        from: start.toISOString(),
        to: end.toISOString(),
        generatedAt: new Date().toISOString(),
        summary,
        cards,
        attendance: filteredAttendance,
        scanSecurityLogs: filteredSecurityLogs
      };
      if (schoolPortal) {
        report.fees = filteredFees;
        report.parentNotifications = filteredNotifications;
      }
      const name = (state.org?.name || 'vericard').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'vericard';
      downloadJson(`${name}-${period}-report-${new Date().toISOString().slice(0, 10)}.json`, report);
    }

    function approvedCardExportPayload(cards) {
      return {
        exportedAt: new Date().toISOString(),
        organization: state.org,
        pricePerCard: 100,
        count: cards.length,
        totalPrintCost: cards.length * 100,
        cards
      };
    }

    function downloadSelectedApprovedCards() {
      const cards = selectedApprovedCards();
      if (!cards.length) throw new Error('Select at least one approved card.');
      const name = (state.org?.name || 'vericard').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'vericard';
      downloadJson(`${name}-approved-cards-${new Date().toISOString().slice(0, 10)}.json`, approvedCardExportPayload(cards));
    }

    async function requestSelectedCardPrint() {
      const cards = selectedApprovedCards();
      if (!cards.length) throw new Error('Select at least one approved card.');
      const total = cards.length * 100;
      if (!confirm(`Request super admin printing for ${cards.length} card(s)? Estimated charge: KES ${total.toLocaleString()} at KES 100 per card.`)) return;
      const data = await api('/api/org/print-requests', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ cardIds: cards.map((card) => card.id) })
      });
      alert(`Print request sent to super admin. ${data.request.cardCount} card(s), KES ${Number(data.request.totalAmount || 0).toLocaleString()}.`);
    }

    els.orgRegisterForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(els.orgRegisterForm).entries());
      if (!payload.type) {
        alert('Choose organization type first.');
        return;
      }
      try {
        const data = await api('/api/organizations/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        rememberRegisteredOrganization();
        alert(`${data.organization.name} registered with a one-month free trial. Log in to choose and save the ID template, then download the master card.`);
        showLogin();
      } catch (error) { alert(friendlyError(error)); }
    });

    els.registerBackBtn.addEventListener('click', showIntro);
    els.orgForgotToggleBtn.addEventListener('click', () => els.orgResetForm.classList.toggle('hidden'));
    els.loginBackBtn.addEventListener('click', showIntro);
    els.orgSendResetBtn.addEventListener('click', () => sendOrgResetCode().catch((error) => {
      els.loginNotice.textContent = friendlyError(error);
      els.loginNotice.classList.remove('hidden');
    }));
    els.orgResetForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      try { await resetOrgPassword(); }
      catch (error) {
        els.loginNotice.textContent = friendlyError(error);
        els.loginNotice.classList.remove('hidden');
      }
    });

    els.loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(els.loginForm).entries());
      try { setOrgSession(await api('/api/org-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })); }
      catch (error) { els.loginNotice.textContent = friendlyError(error); els.loginNotice.classList.remove('hidden'); }
    });

    els.gateScanForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      try { await recordGateScan(); }
      catch (error) {
        els.gateScanNotice.textContent = friendlyError(error);
        els.gateScanNotice.classList.add('danger');
        els.gateScanNotice.classList.remove('hidden');
      }
    });

    els.gateStaffForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        await registerGateStaff();
        alert('Gate staff registered.');
      } catch (error) {
        alert(friendlyError(error));
      }
    });

    els.gateStaffBody.addEventListener('click', async (event) => {
      const copyButton = event.target.closest('[data-copy-link]');
      if (copyButton) {
        try {
          await navigator.clipboard.writeText(copyButton.dataset.copyLink);
          if (els.scannerSetupNotice) {
            els.scannerSetupNotice.textContent = 'Scanner setup link copied. Send it to the scanner person by WhatsApp.';
            els.scannerSetupNotice.classList.remove('hidden', 'danger');
          }
        } catch {
          prompt('Copy scanner setup link:', copyButton.dataset.copyLink);
        }
        return;
      }
      const resendButton = event.target.closest('[data-resend-scanner]');
      if (resendButton) {
        try {
          const data = await api(`/api/org/gate-staff/${encodeURIComponent(resendButton.dataset.resendScanner)}/setup-link`, {
            method: 'POST',
            headers: headers(),
            body: '{}'
          });
          if (els.scannerSetupNotice) {
            els.scannerSetupNotice.textContent = `New setup link ready. Send by WhatsApp: ${data.staff.setupLink || ''}`;
            els.scannerSetupNotice.classList.remove('hidden', 'danger');
          }
          await loadGateStaff();
        } catch (error) {
          alert(friendlyError(error));
        }
        return;
      }
      const button = event.target.closest('[data-gate-staff]');
      if (!button) return;
      try {
        await api(`/api/org/gate-staff/${encodeURIComponent(button.dataset.gateStaff)}`, {
          method: 'PATCH',
          headers: headers(),
          body: JSON.stringify({ status: button.dataset.status })
        });
        await loadGateStaff();
      } catch (error) {
        alert(friendlyError(error));
      }
    });

    [els.attendanceFilter, els.attendanceFrom, els.attendanceTo, els.attendanceSearch].forEach((input) => {
      input?.addEventListener(input === els.attendanceSearch ? 'input' : 'change', renderAttendance);
    });
    els.exportAttendanceCsvBtn?.addEventListener('click', exportAttendanceCsv);

    els.gateDevicesBody.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-gate-device]');
      if (!button) return;
      try {
        await api(`/api/org/gate-devices/${encodeURIComponent(button.dataset.gateDevice)}`, {
          method: 'PATCH',
          headers: headers(),
          body: JSON.stringify({ status: button.dataset.status })
        });
        await loadGateStaff();
      } catch (error) {
        alert(friendlyError(error));
      }
    });

    els.uploadFeesBtn.addEventListener('click', async () => {
      try { await uploadFees(); }
      catch (error) {
        els.feeNotice.textContent = friendlyError(error);
        els.feeNotice.classList.add('danger');
        els.feeNotice.classList.remove('hidden');
      }
    });

    els.refreshFeesBtn.addEventListener('click', () => {
      Promise.all([loadFees(), loadNotifications(), loadSecurityLogs(), loadOrgSummary()]).catch((error) => alert(friendlyError(error)));
    });
    els.downloadReportBtn.addEventListener('click', () => downloadPeriodReport().catch((error) => alert(friendlyError(error))));
    els.sendTestPushBtn?.addEventListener('click', async () => {
      try {
        const data = await api('/api/org/notifications/test', { method: 'POST', headers: headers(), body: '{}' });
        await loadNotifications();
        alert(`Test push status: ${data.notification?.deliveryStatus || data.notification?.status || 'Queued'}`);
      } catch (error) {
        alert(friendlyError(error));
      }
    });

    els.feesBody.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-fee-notify]');
      if (!button) return;
      try {
        await api(`/api/org/fees/${encodeURIComponent(button.dataset.feeNotify)}/notify`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ type: 'fee_balance_updated' })
        });
        await loadNotifications();
        await loadSecurityLogs();
        alert('Parent push notification queued.');
      } catch (error) {
        alert(friendlyError(error));
      }
    });

    els.applyForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        const formData = new FormData(els.applyForm);
        const fields = Object.fromEntries(formData.entries());
        const photoFile = formData.get('photo');
        if (photoFile instanceof File) fields.photo = await readPersonPhotoFile(photoFile);
        delete fields.roleType;
        await api('/api/org/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ masterToken: state.masterToken, roleType: els.roleType.value, fields }) });
        alert('Registration submitted. Organization admin must approve it.');
        els.applyForm.reset();
        renderDynamicFields();
      } catch (error) { alert(friendlyError(error)); }
    });

    els.backSettingsForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      try { await saveBackSettings(); }
      catch (error) { alert(friendlyError(error)); }
    });

    els.brandingForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      try { await saveBranding(); }
      catch (error) { alert(friendlyError(error)); }
    });
    els.initialTemplateForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      try { await saveInitialTemplate(); }
      catch (error) { alert(friendlyError(error)); }
    });

    els.roleType.addEventListener('change', renderDynamicFields);
    els.orgType.addEventListener('change', renderOrgRegistrationFields);
    els.registerBrandColor.addEventListener('input', () => setBrandColorValue('register', els.registerBrandColor.value));
    els.setupBrandColor.addEventListener('input', () => setBrandColorValue('setup', els.setupBrandColor.value));
    els.dashboardBrandColor.addEventListener('input', () => setBrandColorValue('dashboard', els.dashboardBrandColor.value));
    els.setupTemplateSelect.addEventListener('change', () => renderTemplateGallery(state.templates, els.setupTemplateSelect.value, 'setup'));
    els.setupTemplateGallery.addEventListener('click', (event) => {
      const button = event.target.closest('[data-template-id]');
      if (!button) return;
      els.setupTemplateSelect.value = button.dataset.templateId;
      renderTemplateGallery(state.templates, button.dataset.templateId, 'setup');
    });
    els.startRegisterBtn.addEventListener('click', showRegistration);
    els.alreadyRegisteredBtn.addEventListener('click', () => {
      rememberRegisteredOrganization();
      showLogin();
    });
    document.getElementById('loadMasterBtn').addEventListener('click', () => loadMasterCard().catch((error) => alert(friendlyError(error))));
    document.getElementById('printMasterBtn').addEventListener('click', () => window.print());
    document.getElementById('orgBackupBtn').addEventListener('click', () => downloadOrgBackup().catch((error) => alert(friendlyError(error))));
    els.securityLogResult?.addEventListener('change', () => loadSecurityLogs().catch((error) => alert(friendlyError(error))));
    els.securityLogAlert?.addEventListener('change', () => loadSecurityLogs().catch((error) => alert(friendlyError(error))));
    document.getElementById('refreshCardsBtn').addEventListener('click', () => loadCards().catch((error) => alert(friendlyError(error))));
    els.downloadSelectedCardsBtn.addEventListener('click', () => {
      try { downloadSelectedApprovedCards(); }
      catch (error) { alert(friendlyError(error)); }
    });
    els.requestPrintCardsBtn.addEventListener('click', () => requestSelectedCardPrint().catch((error) => alert(friendlyError(error))));
    els.selectApprovedCards.addEventListener('change', () => {
      document.querySelectorAll('[data-card-select]').forEach((input) => { input.checked = els.selectApprovedCards.checked; });
    });
    els.drawerToggle.addEventListener('click', () => toggleDrawer());
    els.drawerScrim.addEventListener('click', () => toggleDrawer(false));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') toggleDrawer(false);
    });
    els.dashboardDrawer.addEventListener('click', (event) => {
      const button = event.target.closest('[data-drawer-view]');
      if (!button) return;
      setDashboardView(button.dataset.drawerView);
    });
    els.logoutBtn.addEventListener('click', () => location.reload());
    els.assistantForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const question = els.assistantQuestion.value;
      els.assistantQuestion.value = '';
      askTeamsAi(question);
    });
    document.querySelectorAll('[data-ai-prompt]').forEach((button) => {
      button.addEventListener('click', () => {
        els.assistantQuestion.value = button.dataset.aiPrompt;
        els.assistantForm.requestSubmit();
      });
    });
    els.cardsBody.addEventListener('click', async (event) => {
      const button = event.target.closest('button[data-id]');
      if (!button) return;
      try {
        if (button.dataset.action === 'view') {
          showIdCard(state.cards.find((card) => card.id === button.dataset.id));
          return;
        }
        if (button.dataset.action === 'rotate') {
          if (!confirm('Rotate this card QR token? Existing printed QR codes for this card will stop working.')) return;
          await api(`/api/org/cards/${encodeURIComponent(button.dataset.id)}/rotate-token`, { method: 'POST', headers: headers() });
          await loadCards();
          return;
        }
        await api(`/api/org/cards/${encodeURIComponent(button.dataset.id)}/status`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ status: button.dataset.status }) });
        await loadCards();
      } catch (error) { alert(friendlyError(error)); }
    });

    setupLogoUploader('register');
    setupLogoUploader('setup');
    setupLogoUploader('dashboard');
    initializeEntryView();
    loadSetup().catch((error) => alert(friendlyError(error)));
