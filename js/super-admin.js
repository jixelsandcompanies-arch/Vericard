const state = {
      user: sessionStorage.getItem('mapphexAdminUser') || 'admin',
      pin: sessionStorage.getItem('mapphexAdminPin') || '',
      token: sessionStorage.getItem('mapphexAdminToken') || '',
      records: [],
      editingId: '',
      currentCard: null,
      organizations: [],
      attendance: [],
      fees: [],
      notifications: [],
      expandedOrgId: '',
      refreshTimer: null
    };

    function friendlyError(error) {
      if (error && /failed to fetch/i.test(error.message || '')) {
        return 'Could not reach the local VeriCard server. Start the app, then open http://localhost:3000/admin.';
      }
      return error.message || 'Something went wrong.';
    }
    const els = {
      user: document.getElementById('user'),
      pin: document.getElementById('pin'),
      loginBtn: document.getElementById('loginBtn'),
      forgotToggleBtn: document.getElementById('forgotToggleBtn'),
      resetBox: document.getElementById('resetBox'),
      resetEmail: document.getElementById('resetEmail'),
      sendResetBtn: document.getElementById('sendResetBtn'),
      resetCode: document.getElementById('resetCode'),
      resetPassword: document.getElementById('resetPassword'),
      resetPasswordBtn: document.getElementById('resetPasswordBtn'),
      adminArea: document.getElementById('adminArea'),
      rows: document.getElementById('rows'),
      search: document.getElementById('search'),
      branchFilter: document.getElementById('branchFilter'),
      summary: document.getElementById('summary'),
      pendingBtn: document.getElementById('pendingBtn'),
      allBtn: document.getElementById('allBtn'),
      exportBtn: document.getElementById('exportBtn'),
      editForm: document.getElementById('editForm'),
      editId: document.getElementById('editId'),
      editName: document.getElementById('editName'),
      editLocation: document.getElementById('editLocation'),
      editBranch: document.getElementById('editBranch'),
      editNationalId: document.getElementById('editNationalId'),
      editPhone: document.getElementById('editPhone'),
      editEmail: document.getElementById('editEmail'),
      editPosition: document.getElementById('editPosition'),
      editInactiveReason: document.getElementById('editInactiveReason'),
      editStatus: document.getElementById('editStatus'),
      clearBtn: document.getElementById('clearBtn'),
      createForm: document.getElementById('createForm'),
      createName: document.getElementById('createName'),
      createLocation: document.getElementById('createLocation'),
      createBranch: document.getElementById('createBranch'),
      createNationalId: document.getElementById('createNationalId'),
      createPhone: document.getElementById('createPhone'),
      createEmail: document.getElementById('createEmail'),
      createPosition: document.getElementById('createPosition'),
      createPhoto: document.getElementById('createPhoto'),
      passwordForm: document.getElementById('passwordForm'),
      newUser: document.getElementById('newUser'),
      newEmail: document.getElementById('newEmail'),
      newPassword: document.getElementById('newPassword'),
      backupBtn: document.getElementById('backupBtn'),
      restoreInput: document.getElementById('restoreInput'),
      auditBtn: document.getElementById('auditBtn'),
      auditBox: document.getElementById('auditBox'),
      dashboardSummary: document.getElementById('dashboardSummary'),
      menuBtn: document.getElementById('menuBtn'),
      sideMenu: document.getElementById('sideMenu'),
      loginPanel: document.querySelector('.topbar'),
      logoutBtn: document.getElementById('logoutBtn')
      ,
      cardEmpty: document.getElementById('cardEmpty'),
      cardStage: document.getElementById('cardStage'),
      cardPhoto: document.getElementById('cardPhoto'),
      cardPhotoPlaceholder: document.getElementById('cardPhotoPlaceholder'),
      cardName: document.getElementById('cardName'),
      cardPosition: document.getElementById('cardPosition'),
      cardQr: document.getElementById('cardQr'),
      printCardBtn: document.getElementById('printCardBtn'),
      downloadCardBtn: document.getElementById('downloadCardBtn'),
      notifyBox: document.getElementById('notifyBox'),
      notifyText: document.getElementById('notifyText'),
      workerClaimLink: document.getElementById('workerClaimLink'),
      whatsappNotifyLink: document.getElementById('whatsappNotifyLink'),
      copyWorkerLinkBtn: document.getElementById('copyWorkerLinkBtn')
      ,
      loadOrganizationsBtn: document.getElementById('loadOrganizationsBtn'),
      createSampleClientBtn: document.getElementById('createSampleClientBtn'),
      deleteOrganizationsBtn: document.getElementById('deleteOrganizationsBtn'),
      organizationsRows: document.getElementById('organizationsRows')
      ,
      loadAttendanceBtn: document.getElementById('loadAttendanceBtn'),
      attendanceRows: document.getElementById('attendanceRows')
      ,
      loadReportsBtn: document.getElementById('loadReportsBtn'),
      feeReportRows: document.getElementById('feeReportRows'),
      notificationReportRows: document.getElementById('notificationReportRows')
    };

    function headers() { return { Authorization: `Bearer ${state.token}` }; }

    async function readJson(response) {
      const text = await response.text();
      if (!text) return {};
      try {
        return JSON.parse(text);
      } catch (error) {
        return { error: text };
      }
    }

    function qrUrl(data) {
      return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data=${encodeURIComponent(data)}`;
    }

    function verificationUrl(token) {
      return `${window.location.origin}/?token=${encodeURIComponent(token)}`;
    }

    function claimUrl(token) {
      return verificationUrl(token);
    }

    function formatTime(value) {
      return value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    }

    function formatDate(value) {
      return value ? new Date(`${value}T00:00:00`).toLocaleDateString() : '';
    }

    function whatsappPhone(phone) {
      const digits = String(phone || '').replace(/\D/g, '');
      if (!digits) return '';
      if (digits.startsWith('0')) return `254${digits.slice(1)}`;
      return digits;
    }

    async function login() {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: state.user, password: state.pin })
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || 'Unable to login.');
      state.token = data.token;
      sessionStorage.setItem('mapphexAdminToken', state.token);
      return data;
    }

    async function loadCards() {
      const response = await fetch('/api/cards', { headers: headers() });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || 'Unable to load cards.');
      state.records = data.cards || [];
      render();
    }

    async function loadAttendance() {
      const response = await fetch('/api/attendance', { headers: headers() });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || 'Unable to load attendance.');
      state.attendance = data.attendance || [];
      renderAttendance();
    }

    async function loadReports() {
      const [feesResponse, notificationsResponse] = await Promise.all([
        fetch('/api/fees', { headers: headers() }),
        fetch('/api/notifications', { headers: headers() })
      ]);
      const feesData = await readJson(feesResponse);
      const notificationsData = await readJson(notificationsResponse);
      if (!feesResponse.ok) throw new Error(feesData.error || 'Unable to load fee reports.');
      if (!notificationsResponse.ok) throw new Error(notificationsData.error || 'Unable to load notification reports.');
      state.fees = feesData.fees || [];
      state.notifications = notificationsData.notifications || [];
      renderReports();
    }

    function startAutoRefresh() {
      if (state.refreshTimer) clearInterval(state.refreshTimer);
      state.refreshTimer = setInterval(() => {
        if (!state.token || document.hidden) return;
        loadCards().catch((error) => console.warn(error.message));
      }, 3000);
    }

    function filtered() {
      const q = els.search.value.trim().toLowerCase();
      const branch = els.branchFilter.value.trim().toLowerCase();
      return state.records.filter((r) => {
        const matchesSearch = !q || [r.id, r.organizationName, r.roleType, r.name, r.nationalId, r.location, r.branch, r.phone, r.email, r.position, r.status]
          .some((v) => String(v || '').toLowerCase().includes(q));
        const matchesBranch = !branch || String(r.branch || '').toLowerCase().includes(branch);
        return matchesSearch && matchesBranch;
      });
    }

    function renderSummary() {
      const counts = {};
      state.records.forEach((r) => { counts[r.status || 'Pending'] = (counts[r.status || 'Pending'] || 0) + 1; });
      const statuses = ['Pending', 'Approved', 'Inactive', 'Suspended', 'Lost', 'Rejected'];
      els.summary.innerHTML = statuses
        .map((status) => `<span>${status}: ${counts[status] || 0}</span>`)
        .join('') || '<span>No records</span>';
      els.dashboardSummary.innerHTML = statuses
        .map((status) => `<div class="dash-card"><strong>${counts[status] || 0}</strong>${status}</div>`)
        .join('');
    }

    function showTab(tab) {
      document.querySelectorAll('[data-panel]').forEach((panel) => {
        panel.classList.toggle('hidden', panel.dataset.panel !== tab);
      });
      document.querySelectorAll('[data-tab]').forEach((button) => {
        button.classList.toggle('active', button.dataset.tab === tab);
      });
      els.sideMenu.classList.remove('open');
    }

    function showLoggedIn() {
      els.adminArea.classList.remove('hidden');
      els.loginPanel.classList.add('hidden');
      els.logoutBtn.classList.add('visible');
      showTab('dashboard');
    }

    function logout() {
      state.token = '';
      state.pin = '';
      state.records = [];
      state.editingId = '';
      state.currentCard = null;
      if (state.refreshTimer) clearInterval(state.refreshTimer);
      state.refreshTimer = null;
      sessionStorage.removeItem('mapphexAdminToken');
      sessionStorage.removeItem('mapphexAdminPin');
      els.pin.value = '';
      els.adminArea.classList.add('hidden');
      els.loginPanel.classList.remove('hidden');
      els.logoutBtn.classList.remove('visible');
    }

    function render() {
      renderSummary();
      const records = filtered();
      els.rows.innerHTML = records.length ? records.map((r) => `
        <tr>
          <td>${r.photo ? `<img class="thumb" data-photo="${r.id}" src="${r.photo}" alt="">` : ''}</td><td>${r.id}<br>${r.organizationName || ''}</td><td>${r.name}</td><td>${r.nationalId || ''}</td><td>${r.location || ''}</td><td>${r.branch || ''}</td><td>${r.phone || ''}</td><td>${r.email || ''}</td><td>${r.roleType || r.position}</td><td>${r.status || 'Pending'}</td><td>${r.validity?.valid ? 'Valid' : `Not valid${r.validity?.reason ? `<br>${r.validity.reason}` : ''}`}</td>
          <td>
            ${(r.status || 'Pending') === 'Approved' ? `<button data-action="view" data-id="${r.id}">View Card</button>` : ''}
            ${(r.status || 'Pending') === 'Approved' ? `<button data-action="notify" data-id="${r.id}">Notify</button>` : ''}
            <button data-action="approve" data-id="${r.id}">Approve</button>
            <button data-action="reject" data-id="${r.id}">Reject</button>
            <button data-action="inactive" data-id="${r.id}">Inactive</button>
            <button data-action="edit" data-id="${r.id}">Edit</button>
          </td>
        </tr>`).join('') : '<tr><td colspan="12">No records found.</td></tr>';
    }

    function showCard(card) {
      if (!card || (card.status || 'Pending') !== 'Approved') {
        alert('Approve this worker first before generating the ID card.');
        return;
      }
      state.currentCard = card;
      els.cardEmpty.classList.add('hidden');
      els.cardStage.classList.remove('hidden');
      els.cardName.textContent = card.name || '';
      els.cardPosition.textContent = card.position || '';
      if (card.photo) {
        els.cardPhoto.src = card.photo;
        els.cardPhoto.classList.remove('hidden');
        els.cardPhotoPlaceholder.classList.add('hidden');
      } else {
        els.cardPhoto.removeAttribute('src');
        els.cardPhoto.classList.add('hidden');
        els.cardPhotoPlaceholder.classList.remove('hidden');
      }
      els.cardQr.src = qrUrl(verificationUrl(card.verificationToken || ''));
      const link = claimUrl(card.verificationToken || '');
      const message = `Hello ${card.name || 'there'}, your VeriCard ID card has been approved. Open this link to view/download your ID card: ${link}`;
      els.notifyText.textContent = `Notify ${card.name || 'worker'} that the ID card is ready.`;
      els.workerClaimLink.href = link;
      els.workerClaimLink.textContent = link;
      const phone = whatsappPhone(card.phone);
      els.whatsappNotifyLink.href = phone
        ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;
      els.notifyBox.classList.remove('hidden');
      showTab('card');
    }

    async function downloadCurrentCard() {
      if (!state.currentCard) {
        alert('Select an approved worker card first.');
        return;
      }
      if (!window.html2canvas) {
        alert('Download library is not available. Please try again.');
        return;
      }
      const canvas = await html2canvas(els.cardStage, { backgroundColor: '#eef2f6', scale: 2, useCORS: true });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${state.currentCard.id || 'vericard-id-card'}.png`;
      link.click();
    }

    async function setStatus(id, status, inactiveReason = '') {
      const response = await fetch(`/api/cards/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, inactiveReason })
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || 'Unable to update status.');
      return data;
    }

    function startEdit(card) {
      state.editingId = card.id;
      els.editId.value = card.id;
      els.editName.value = card.name || '';
      els.editLocation.value = card.location || '';
      els.editBranch.value = card.branch || '';
      els.editNationalId.value = card.nationalId || '';
      els.editPhone.value = card.phone || '';
      els.editEmail.value = card.email || '';
      els.editPosition.value = card.position || '';
      els.editInactiveReason.value = card.inactiveReason || '';
      els.editStatus.value = card.status || 'Pending';
    }

    async function updateCard() {
      const payload = {
        name: els.editName.value.trim(),
        location: els.editLocation.value.trim(),
        branch: els.editBranch.value.trim(),
        nationalId: els.editNationalId.value.trim(),
        phone: els.editPhone.value.trim(),
        email: els.editEmail.value.trim(),
        position: els.editPosition.value.trim(),
        status: els.editStatus.value,
        inactiveReason: els.editInactiveReason.value.trim()
      };
      const response = await fetch(`/api/cards/${encodeURIComponent(state.editingId)}`, {
        method: 'PUT',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || 'Unable to update card.');
      const index = state.records.findIndex((r) => r.id === data.card.id);
      if (index !== -1) state.records[index] = data.card;
      render();
    }

    function readFileAsDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    async function createManualCard() {
      const file = els.createPhoto.files[0];
      const payload = {
        name: els.createName.value.trim(),
        location: els.createLocation.value.trim(),
        branch: els.createBranch.value.trim(),
        nationalId: els.createNationalId.value.trim(),
        phone: els.createPhone.value.trim(),
        email: els.createEmail.value.trim(),
        position: els.createPosition.value.trim(),
        photo: file ? await readFileAsDataUrl(file) : ''
      };
      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || 'Unable to create card.');
      state.records.push(data.card);
      els.createForm.reset();
      render();
    }

    function exportCsv() {
      const rows = [['ID', 'Name', 'National ID', 'Location', 'Branch', 'Phone', 'Email', 'Position', 'Status', 'Approved By', 'Approved At', 'Created At']];
      state.records.forEach((r) => rows.push([r.id, r.name, r.nationalId || '', r.location || '', r.branch || '', r.phone || '', r.email || '', r.position, r.status || 'Pending', r.approvedBy || '', r.approvedAt || '', r.createdAt || '']));
      const csv = rows.map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      link.download = 'vericard-id-cards.csv';
      link.click();
      URL.revokeObjectURL(link.href);
    }

    async function backupJson() {
      const response = await fetch('/api/backup', { headers: headers() });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || 'Unable to create backup.');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      link.download = `vericard-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
    }

    async function restoreJson(file) {
      const text = await file.text();
      const response = await fetch('/api/restore', {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: text
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || 'Unable to restore backup.');
      await loadCards();
    }

    async function showAudit() {
      const response = await fetch('/api/audit', { headers: headers() });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || 'Unable to load audit.');
      els.auditBox.textContent = JSON.stringify(data.log || [], null, 2);
    }

    function renderOrganizations() {
      if (!state.organizations.length) {
        els.organizationsRows.innerHTML = '<tr><td colspan="9">No organizations registered yet.</td></tr>';
        return;
      }
      els.organizationsRows.innerHTML = state.organizations.map((org) => {
        const orgCards = state.records.filter((card) => card.organizationId === org.id);
        const peopleRows = state.expandedOrgId === org.id ? `
          <tr class="org-people-row"><td colspan="9">
            <strong>${orgCards.length} individual registration(s)</strong>
            <div class="mini-list">${orgCards.map((card) => `
              <div>${card.name || 'Unnamed'} - ${card.roleType || card.position || ''} - ${card.status || 'Pending'} - ${card.validity?.valid ? 'Valid' : card.validity?.reason || 'Not valid'}</div>
            `).join('') || '<div>No individual registrations yet.</div>'}</div>
          </td></tr>` : '';
        return `
        <tr>
          <td>${org.name}</td>
          <td>${org.typeLabel || org.type}</td>
          <td>${org.businessNumber}</td>
          <td>${org.email}</td>
          <td>${org.phone}</td>
          <td>${org.status}</td>
          <td>${org.subscriptionStatus}</td>
          <td>${org.masterCard ? `${org.masterCard.number}<br>${org.masterCard.status}` : ''}</td>
          <td>
            <button data-org-action="viewPeople" data-id="${org.id}">View People (${orgCards.length})</button>
            <button data-org-action="activate" data-id="${org.id}">Activate</button>
            <button data-org-action="trial" data-id="${org.id}">Trial</button>
            <button data-org-action="expire" data-id="${org.id}">Expire</button>
            <button data-org-action="suspend" data-id="${org.id}">Suspend</button>
          </td>
        </tr>${peopleRows}`;
      }).join('');
    }

    function renderAttendance() {
      els.attendanceRows.innerHTML = state.attendance.length ? state.attendance.map((row) => `
        <tr>
          <td>${row.organizationName}</td>
          <td>${row.studentName}</td>
          <td>${row.studentNumber || ''}</td>
          <td>${row.classGrade || ''}</td>
          <td>${formatDate(row.attendanceDate)}</td>
          <td>${formatTime(row.entryAt)}</td>
          <td>${formatTime(row.exitAt)}</td>
          <td>${row.status}</td>
        </tr>`).join('') : '<tr><td colspan="8">No attendance records found.</td></tr>';
    }

    function renderReports() {
      els.feeReportRows.innerHTML = state.fees.length ? state.fees.map((fee) => `
        <tr>
          <td>${fee.organizationName}</td>
          <td>${fee.admissionNumber}</td>
          <td>${fee.studentName}</td>
          <td>${fee.classGrade || ''}</td>
          <td>KES ${Number(fee.balance || 0).toLocaleString()}</td>
          <td>${fee.feeStatus}</td>
          <td>${fee.dueDate || ''}</td>
        </tr>`).join('') : '<tr><td colspan="7">No fee records found.</td></tr>';
      els.notificationReportRows.innerHTML = state.notifications.length ? state.notifications.map((log) => `
        <tr>
          <td>${log.organizationName}</td>
          <td>${log.studentName}</td>
          <td>${log.parentPhone || ''}</td>
          <td>${log.notificationType}</td>
          <td>${log.message}</td>
          <td>${new Date(log.createdAt).toLocaleString()}</td>
        </tr>`).join('') : '<tr><td colspan="6">No parent communication logs found.</td></tr>';
    }

    async function loadOrganizations() {
      const response = await fetch('/api/organizations', { headers: headers() });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || 'Unable to load organizations.');
      state.organizations = data.organizations || [];
      renderOrganizations();
    }

    async function setOrganizationSubscription(id, status, subscriptionStatus) {
      const response = await fetch(`/api/organizations/${encodeURIComponent(id)}/subscription`, {
        method: 'PATCH',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, subscriptionStatus })
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || 'Unable to update organization.');
      const index = state.organizations.findIndex((org) => org.id === id);
      if (index !== -1) state.organizations[index] = data.organization;
      renderOrganizations();
    }

    async function deleteAllOrganizations() {
      const confirmation = prompt('Type DELETE ORGANIZATIONS to delete all subscriber organization accounts and their organization cards.');
      if (confirmation !== 'DELETE ORGANIZATIONS') return;
      const response = await fetch('/api/organizations', {
        method: 'DELETE',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: confirmation })
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || 'Unable to delete organization accounts.');
      state.organizations = [];
      renderOrganizations();
      alert(`Deleted ${data.deletedOrganizations || 0} organization account(s) and ${data.deletedOrganizationCards || 0} organization card(s).`);
    }

    async function createSampleClient() {
      const name = prompt('Sample client organization name:', 'Sample Client Organization');
      if (!name) return;
      const email = prompt('Sample client admin email:');
      if (!email) return;
      const phone = prompt('Sample client phone number:');
      if (!phone) return;
      const password = prompt('Sample client admin password, minimum 8 characters:');
      if (!password) return;
      const businessNumber = prompt('Sample client business/registration number:', 'SAMPLE-CLIENT') || 'SAMPLE-CLIENT';
      const response = await fetch('/api/organizations/sample-client', {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          businessNumber: businessNumber.trim(),
          brandColor: '#061a30',
          templateId: 'sample'
        })
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || 'Unable to create sample client.');
      await loadOrganizations();
      alert(data.message || 'Sample client is ready.');
    }

    async function changePassword() {
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: els.newUser.value.trim(), email: els.newEmail.value.trim(), password: els.newPassword.value })
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || 'Unable to change password.');
      alert('Admin login changed. Please log in again with the new password.');
    }

    async function sendResetCode() {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: els.resetEmail.value.trim() })
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || 'Unable to send reset code.');
      alert(data.message || 'Reset code sent.');
    }

    async function resetPassword() {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: els.resetEmail.value.trim(),
          code: els.resetCode.value.trim(),
          password: els.resetPassword.value
        })
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || 'Unable to reset password.');
      alert('Password reset successfully. Please log in with the new password.');
      els.resetBox.classList.add('hidden');
    }

    els.loginBtn.addEventListener('click', async () => {
      state.user = els.user.value.trim() || 'admin';
      state.pin = els.pin.value.trim();
      sessionStorage.setItem('mapphexAdminUser', state.user);
      sessionStorage.setItem('mapphexAdminPin', state.pin);
      try {
        await login();
        await loadCards();
        startAutoRefresh();
        showLoggedIn();
      } catch (error) {
        alert(friendlyError(error));
      }
    });
    els.logoutBtn.addEventListener('click', logout);
    els.menuBtn.addEventListener('click', () => els.sideMenu.classList.toggle('open'));
    els.sideMenu.addEventListener('click', async (event) => {
      const button = event.target.closest('button[data-tab]');
      if (!button) return;
      showTab(button.dataset.tab);
      if (button.dataset.tab === 'audit') {
        showAudit().catch((error) => alert(friendlyError(error)));
      }
      if (button.dataset.tab === 'attendance') {
        loadAttendance().catch((error) => alert(friendlyError(error)));
      }
      if (button.dataset.tab === 'reports') {
        loadReports().catch((error) => alert(friendlyError(error)));
      }
    });
    els.forgotToggleBtn.addEventListener('click', () => els.resetBox.classList.toggle('hidden'));
    els.sendResetBtn.addEventListener('click', () => sendResetCode().catch((error) => alert(friendlyError(error))));
    els.resetPasswordBtn.addEventListener('click', () => resetPassword().catch((error) => alert(friendlyError(error))));
    document.querySelectorAll('.toggle-password').forEach((button) => {
      button.addEventListener('click', () => {
        const input = document.getElementById(button.dataset.target);
        if (!input) return;
        const showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        button.textContent = showing ? 'Eye' : 'Hide';
      });
    });

    els.rows.addEventListener('click', async (event) => {
      const image = event.target.closest('img[data-photo]');
      if (image) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `<img src="${image.src}" alt="">`;
        modal.addEventListener('click', () => modal.remove());
        document.body.appendChild(modal);
        return;
      }
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const card = state.records.find((r) => r.id === button.dataset.id);
      if (!card) return;
      try {
        if (button.dataset.action === 'approve') {
          const result = await setStatus(card.id, 'Approved');
          Object.assign(card, result.card);
          showCard(card);
          if (result.emailSent) {
            alert('Worker approved. Email notification sent.');
          } else if (card.email && result.emailError) {
            alert(`Worker approved, but email was not sent: ${result.emailError}`);
          }
        }
        if (button.dataset.action === 'reject') Object.assign(card, (await setStatus(card.id, 'Rejected')).card);
        if (button.dataset.action === 'inactive') {
          const reason = prompt('Reason for marking this worker inactive?', card.inactiveReason || 'Left company') || 'This worker is no longer active.';
          Object.assign(card, (await setStatus(card.id, 'Inactive', reason)).card);
        }
        if (button.dataset.action === 'edit') startEdit(card);
        if (button.dataset.action === 'edit') showTab('edit');
        if (button.dataset.action === 'view' || button.dataset.action === 'notify') showCard(card);
        render();
      } catch (error) {
        alert(friendlyError(error));
      }
    });

    els.editForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!state.editingId) return;
      try { await updateCard(); } catch (error) { alert(friendlyError(error)); }
    });
    els.createForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      try { await createManualCard(); } catch (error) { alert(friendlyError(error)); }
    });
    els.passwordForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      try { await changePassword(); } catch (error) { alert(friendlyError(error)); }
    });
    els.clearBtn.addEventListener('click', () => { state.editingId = ''; els.editForm.reset(); });
    els.search.addEventListener('input', render);
    els.branchFilter.addEventListener('input', render);
    els.pendingBtn.addEventListener('click', () => { els.search.value = 'pending'; render(); });
    els.allBtn.addEventListener('click', () => { els.search.value = ''; render(); });
    els.exportBtn.addEventListener('click', exportCsv);
    els.backupBtn.addEventListener('click', () => backupJson().catch((error) => alert(friendlyError(error))));
    els.restoreInput.addEventListener('change', () => {
      const file = els.restoreInput.files[0];
      if (file && confirm('Restore this backup and replace current records?')) {
        restoreJson(file).catch((error) => alert(friendlyError(error)));
      }
    });
    els.auditBtn.addEventListener('click', () => showAudit().catch((error) => alert(friendlyError(error))));
    els.loadOrganizationsBtn.addEventListener('click', () => loadOrganizations().catch((error) => alert(friendlyError(error))));
    els.loadAttendanceBtn.addEventListener('click', () => loadAttendance().catch((error) => alert(friendlyError(error))));
    els.loadReportsBtn.addEventListener('click', () => loadReports().catch((error) => alert(friendlyError(error))));
    els.createSampleClientBtn.addEventListener('click', () => createSampleClient().catch((error) => alert(friendlyError(error))));
    els.deleteOrganizationsBtn.addEventListener('click', () => deleteAllOrganizations().catch((error) => alert(friendlyError(error))));
    els.organizationsRows.addEventListener('click', async (event) => {
      const button = event.target.closest('button[data-org-action]');
      if (!button) return;
      try {
        const action = button.dataset.orgAction;
        if (action === 'viewPeople') {
          state.expandedOrgId = state.expandedOrgId === button.dataset.id ? '' : button.dataset.id;
          renderOrganizations();
          return;
        }
        if (action === 'activate') await setOrganizationSubscription(button.dataset.id, 'Active', 'Active');
        if (action === 'trial') await setOrganizationSubscription(button.dataset.id, 'Active', 'Trial');
        if (action === 'expire') await setOrganizationSubscription(button.dataset.id, 'Active', 'Expired');
        if (action === 'suspend') await setOrganizationSubscription(button.dataset.id, 'Suspended', 'Suspended');
      } catch (error) {
        alert(friendlyError(error));
      }
    });
    els.printCardBtn.addEventListener('click', () => {
      if (!state.currentCard) {
        alert('Select an approved worker card first.');
        return;
      }
      window.print();
    });
    els.downloadCardBtn.addEventListener('click', () => downloadCurrentCard().catch((error) => alert(friendlyError(error))));
    els.copyWorkerLinkBtn.addEventListener('click', async () => {
      const url = els.workerClaimLink.href;
      try {
        await navigator.clipboard.writeText(url);
        els.copyWorkerLinkBtn.textContent = 'Copied';
        setTimeout(() => { els.copyWorkerLinkBtn.textContent = 'Copy Worker Link'; }, 1600);
      } catch {
        prompt('Copy this worker link:', url);
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && state.token) loadCards().catch((error) => console.warn(error.message));
    });

    if (state.pin) {
      els.user.value = state.user;
      els.pin.value = state.pin;
      if (state.token) {
        loadCards().then(() => {
          startAutoRefresh();
          showLoggedIn();
        }).catch(() => els.loginBtn.click());
      } else {
        els.loginBtn.click();
      }
    }

