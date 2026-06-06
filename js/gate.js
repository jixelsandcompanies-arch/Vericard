const state = {
  sessionToken: sessionStorage.getItem('mapphexGateSession') || '',
  deviceId: localStorage.getItem('vericardGateDeviceId') || '',
  preview: null,
  lastPayload: null
};
const els = {
  gateTitle: document.getElementById('gateTitle'),
  gateStatus: document.getElementById('gateStatus'),
  endDutyBtn: document.getElementById('endDutyBtn'),
  gateLoginPanel: document.getElementById('gateLoginPanel'),
  gateLoginForm: document.getElementById('gateLoginForm'),
  deviceIdLabel: document.getElementById('deviceIdLabel'),
  loginNotice: document.getElementById('loginNotice'),
  scannerPanel: document.getElementById('scannerPanel'),
  previewForm: document.getElementById('previewForm'),
  scanNotice: document.getElementById('scanNotice'),
  confirmPanel: document.getElementById('confirmPanel'),
  personPhoto: document.getElementById('personPhoto'),
  personName: document.getElementById('personName'),
  personMeta: document.getElementById('personMeta'),
  personOrg: document.getElementById('personOrg'),
  personState: document.getElementById('personState'),
  feeStatus: document.getElementById('feeStatus'),
  confirmBtn: document.getElementById('confirmBtn'),
  cancelBtn: document.getElementById('cancelBtn')
};

function ensureDeviceId() {
  if (!state.deviceId) {
    const randomId = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    state.deviceId = `DEV-${randomId}`;
    localStorage.setItem('vericardGateDeviceId', state.deviceId);
  }
  if (els.deviceIdLabel) els.deviceIdLabel.textContent = state.deviceId;
}

function currentLocation() {
  if (!navigator.geolocation) return Promise.resolve({});
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        locationAccuracy: position.coords.accuracy
      }),
      () => resolve({}),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  });
}

async function scannerMeta() {
  return {
    deviceId: state.deviceId,
    userAgent: navigator.userAgent,
    ...(await currentLocation())
  };
}

async function api(path, options = {}) {
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

function showDuty(session, organization) {
  state.sessionToken = session.sessionToken;
  sessionStorage.setItem('mapphexGateSession', state.sessionToken);
  els.gateTitle.textContent = `${organization.name} Gate Scanner`;
  els.gateStatus.textContent = `${session.staffName} - ${session.gateName} - On duty`;
  els.gateLoginPanel.classList.add('hidden');
  els.scannerPanel.classList.remove('hidden');
  els.endDutyBtn.classList.remove('hidden');
}

function clearPreview() {
  state.preview = null;
  state.lastPayload = null;
  els.confirmPanel.classList.add('hidden');
  els.confirmBtn.disabled = false;
  els.previewForm.elements.token.value = '';
}

function renderPreview(data, payload) {
  state.preview = data;
  state.lastPayload = payload;
  const card = data.card;
  els.personName.textContent = card.name || '';
  els.personMeta.textContent = `${card.roleLabel || card.roleType || ''} | ${card.number || ''} | ${card.classGrade || ''}`;
  els.personOrg.textContent = `${data.organization.name} (${data.organization.typeLabel})`;
  els.personState.textContent = `Current state: ${data.state}. Action: ${data.action === 'leave' ? 'Leaving' : 'Entering'}`;
  els.feeStatus.textContent = data.fee ? `Fee status: ${data.fee.feeStatus} | Balance: KES ${Number(data.fee.balance || 0).toLocaleString()}` : '';
  if (card.photo) {
    els.personPhoto.src = card.photo;
    els.personPhoto.classList.remove('hidden');
  } else {
    els.personPhoto.removeAttribute('src');
    els.personPhoto.classList.add('hidden');
  }
  els.confirmPanel.classList.remove('hidden');
}

els.gateLoginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const payload = { ...Object.fromEntries(new FormData(els.gateLoginForm).entries()), ...(await scannerMeta()) };
    const data = await api('/api/gate/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    showDuty(data.session, data.organization);
  } catch (error) {
    els.loginNotice.textContent = error.message;
    els.loginNotice.classList.add('danger');
    els.loginNotice.classList.remove('hidden');
  }
});

els.previewForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const payload = { ...Object.fromEntries(new FormData(els.previewForm).entries()), sessionToken: state.sessionToken, ...(await scannerMeta()) };
    const data = await api('/api/gate/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    els.scanNotice.classList.add('hidden');
    renderPreview(data, payload);
  } catch (error) {
    els.scanNotice.textContent = error.message;
    els.scanNotice.classList.add('danger');
    els.scanNotice.classList.remove('hidden');
    els.confirmPanel.classList.add('hidden');
  }
});

els.confirmBtn.addEventListener('click', async () => {
  if (!state.lastPayload) return;
  els.confirmBtn.disabled = true;
  try {
    const data = await api('/api/gate/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state.lastPayload) });
    els.scanNotice.textContent = data.message || 'Movement saved.';
    els.scanNotice.classList.remove('hidden', 'danger');
    clearPreview();
  } catch (error) {
    els.confirmBtn.disabled = false;
    els.scanNotice.textContent = error.message;
    els.scanNotice.classList.add('danger');
    els.scanNotice.classList.remove('hidden');
  }
});

els.cancelBtn.addEventListener('click', clearPreview);

els.endDutyBtn.addEventListener('click', async () => {
  try {
    await api('/api/gate/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionToken: state.sessionToken }) });
  } catch {}
  sessionStorage.removeItem('mapphexGateSession');
  location.reload();
});

ensureDeviceId();
