window.VeriCardFeatures = window.VeriCardFeatures || {};

(function () {
  const types = [
    'Salon / Beauty', 'Clothing / Fashion', 'Restaurant / Food', 'Real Estate', 'Construction',
    'Cleaning Service', 'Photography', 'Event Planning', 'Fitness / Gym', 'Auto Repair',
    'Barbershop', 'Makeup Artist', 'Spa / Wellness', 'Tech / IT', 'Logistics / Delivery',
    'School / Training', 'Medical / Clinic', 'Law / Professional', 'Accounting / Finance', 'Boutique',
    'Hotel / Travel', 'Agriculture', 'Security Service', 'NGO / Community', 'Interior Design',
    'Music / Entertainment', 'Printing / Branding', 'Bakery', 'Phone / Electronics', 'General Business'
  ];
  const styleNames = ['Signature', 'Elite', 'Studio', 'Executive', 'Fresh', 'Classic', 'Prime', 'Urban', 'Clean', 'Bold'];
  const layouts = ['luxe', 'modern', 'premium'];
  const state = {
    type: '',
    templateId: '',
    logo: '',
    submitted: false,
    colors: { primary: '#061a30', accent: '#149ee8' }
  };

  function $(id) { return document.getElementById(id); }
  function slug(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'business';
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }
  function normalizeHex(color) {
    const value = String(color || '').trim();
    return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : '#061a30';
  }
  function smartAccent(primary) {
    const number = parseInt(normalizeHex(primary).slice(1), 16);
    const r = (number >> 16) & 255;
    const g = (number >> 8) & 255;
    const b = number & 255;
    const accent = [255 - Math.round(r * .58), 255 - Math.round(g * .58), 255 - Math.round(b * .58)]
      .map((part) => Math.max(45, Math.min(235, part)).toString(16).padStart(2, '0')).join('');
    return `#${accent}`;
  }
  function templatesFor(type) {
    const prefix = slug(type);
    return Array.from({ length: 30 }, (_, index) => ({
      id: `${prefix}-${index + 1}`,
      name: `${type} ${styleNames[index % styleNames.length]}`,
      layout: layouts[index % layouts.length],
      description: index % 3 === 0 ? 'Luxury centered logo with footer QR.' : index % 3 === 1 ? 'Modern brand-forward front layout.' : 'Premium contrast card for strong visibility.'
    }));
  }
  function values() {
    return {
      businessType: state.type,
      templateId: state.templateId,
      logo: state.logo,
      brandColor: state.colors.primary,
      accentColor: state.colors.accent,
      businessName: $('bcBusinessName')?.value.trim() || '',
      contactName: $('bcContactName')?.value.trim() || '',
      phone: $('bcPhone')?.value.trim() || '',
      quantity: $('bcQuantity')?.value.trim() || '',
      email: $('bcEmail')?.value.trim() || '',
      whatsapp: $('bcWhatsapp')?.value.trim() || '',
      website: $('bcWebsite')?.value.trim() || '',
      tagline: $('bcTagline')?.value.trim() || '',
      services: $('bcServices')?.value.trim() || ''
    };
  }
  function internalQrReady(formValues) {
    return Boolean(formValues.businessType && formValues.templateId && formValues.businessName && formValues.contactName && formValues.phone);
  }
  function canSubmit() {
    const formValues = values();
    return Boolean(
      formValues.businessType &&
      formValues.templateId &&
      formValues.logo &&
      formValues.businessName &&
      formValues.contactName &&
      formValues.phone &&
      Number.parseInt(formValues.quantity, 10) > 0 &&
      internalQrReady(formValues)
    );
  }
  function setCardColors() {
    document.querySelectorAll('.bc-card').forEach((card) => {
      card.style.setProperty('--bc-primary', state.colors.primary);
      card.style.setProperty('--bc-accent', state.colors.accent);
    });
    const brand = $('bcBrandColor');
    const accent = $('bcAccentColor');
    if (brand) brand.value = state.colors.primary;
    if (accent) accent.value = state.colors.accent;
  }
  function updatePreview() {
    const formValues = values();
    $('bcBusinessType').value = formValues.businessType;
    $('bcTemplateId').value = formValues.templateId;
    $('bcLogoValue').value = formValues.logo;
    $('bcPreviewBusiness').textContent = formValues.businessName || 'Business Name';
    $('bcPreviewName').textContent = formValues.contactName || 'Name';
    $('bcPreviewPhone').textContent = formValues.phone || 'Phone';
    $('bcPreviewEmail').textContent = formValues.email || 'Email';
    $('bcPreviewWebsite').textContent = formValues.website || 'Website / social';
    $('bcPreviewWhatsapp').textContent = formValues.whatsapp || 'WhatsApp';
    $('bcPreviewTagline').textContent = formValues.tagline || 'Tagline';
    $('bcPreviewServices').textContent = formValues.services || 'Services appear here';
    ['bcPreviewLogoFront', 'bcPreviewLogoBack', 'bcLogoPreview'].forEach((id) => {
      const image = $(id);
      if (!image) return;
      if (formValues.logo) {
        image.src = formValues.logo;
        image.classList.remove('hidden');
      } else {
        image.removeAttribute('src');
        image.classList.add('hidden');
      }
    });
    const activeTemplate = templatesFor(state.type).find((template) => template.id === state.templateId);
    const stage = $('bcPreviewStage');
    if (stage) {
      stage.classList.remove('bc-template-luxe', 'bc-template-modern', 'bc-template-premium');
      stage.classList.add(`bc-template-${activeTemplate?.layout || 'luxe'}`);
    }
    setCardColors();
    const submit = $('bcSubmitBtn');
    if (submit) submit.disabled = !canSubmit() || state.submitted;
  }
  function renderTypes() {
    const grid = $('bcTypeGrid');
    if (!grid) return;
    grid.innerHTML = types.map((type) => `
      <button type="button" class="bc-type ${state.type === type ? 'active' : ''}" data-bc-type="${escapeHtml(type)}">
        <strong>${escapeHtml(type)}</strong>
        <span>Open ${escapeHtml(type.toLowerCase())} card templates.</span>
      </button>
    `).join('');
  }
  function renderTemplates() {
    const grid = $('bcTemplateGrid');
    if (!grid) return;
    const list = templatesFor(state.type);
    if (!state.templateId) state.templateId = list[0]?.id || '';
    grid.innerHTML = list.map((template) => `
      <button type="button" class="bc-template-choice ${template.id === state.templateId ? 'active' : ''}" data-bc-template="${escapeHtml(template.id)}">
        <strong>${escapeHtml(template.name)}</strong>
        <span>${escapeHtml(template.description)}</span>
      </button>
    `).join('');
  }
  function chooseType(type) {
    state.type = type;
    state.templateId = templatesFor(type)[0]?.id || '';
    $('bcTypeStep')?.classList.add('hidden');
    $('bcOrderForm')?.classList.remove('hidden');
    renderTypes();
    renderTemplates();
    updatePreview();
  }
  function showTypes() {
    $('bcTypeStep')?.classList.remove('hidden');
    $('bcOrderForm')?.classList.add('hidden');
  }
  function resetOrder() {
    state.submitted = false;
    $('bcOrderForm')?.reset();
    state.logo = '';
    $('bcLogoValue').value = '';
    $('bcLogoRemove')?.classList.add('hidden');
    $('bcNotice').textContent = 'Choose a template, fill the required details, upload a logo, and choose quantity before submitting.';
    $('bcNotice').classList.remove('danger');
    updatePreview();
  }
  function detectLogoColor(dataUrl) {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 48;
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0, size, size);
      const pixels = context.getImageData(0, 0, size, size).data;
      let r = 0; let g = 0; let b = 0; let count = 0;
      for (let index = 0; index < pixels.length; index += 16) {
        if (pixels[index + 3] < 80) continue;
        r += pixels[index];
        g += pixels[index + 1];
        b += pixels[index + 2];
        count += 1;
      }
      if (count) {
        const hex = `#${[r / count, g / count, b / count].map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`;
        state.colors.primary = normalizeHex(hex);
        state.colors.accent = smartAccent(state.colors.primary);
        $('bcColorStatus').textContent = 'Logo colors applied to the card.';
        updatePreview();
      }
    };
    image.src = dataUrl;
  }
  function handleLogo(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.logo = String(reader.result || '');
      $('bcLogoRemove')?.classList.remove('hidden');
      detectLogoColor(state.logo);
      updatePreview();
    };
    reader.readAsDataURL(file);
  }
  async function submitOrder(event) {
    event.preventDefault();
    updatePreview();
    if (!canSubmit()) return;
    const formValues = values();
    const response = await fetch('/api/business-card-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formValues)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      $('bcNotice').textContent = data.error || 'Unable to submit business card order.';
      $('bcNotice').classList.add('danger');
      return;
    }
    state.submitted = true;
    $('bcNotice').textContent = `Submitted to Super Admin. Request #${data.request?.id || ''}. QR remains inactive until payment and processing.`;
    $('bcNotice').classList.remove('danger');
    updatePreview();
  }

  window.VeriCardFeatures['business-card'] = {
    activate() {
      const flow = $('businessCardFlow');
      if (!flow || flow.dataset.ready === 'true') return;
      flow.dataset.ready = 'true';
      renderTypes();
      showTypes();
      $('bcTypeGrid')?.addEventListener('click', (event) => {
        const button = event.target.closest('[data-bc-type]');
        if (button) chooseType(button.dataset.bcType);
      });
      $('bcTemplateGrid')?.addEventListener('click', (event) => {
        const button = event.target.closest('[data-bc-template]');
        if (!button) return;
        state.templateId = button.dataset.bcTemplate;
        state.submitted = false;
        renderTemplates();
        updatePreview();
      });
      $('bcTypeBack')?.addEventListener('click', showTypes);
      $('bcOrderForm')?.addEventListener('submit', submitOrder);
      $('bcResetBtn')?.addEventListener('click', resetOrder);
      $('bcLogoPick')?.addEventListener('click', () => $('bcLogoFile')?.click());
      $('bcLogoDrop')?.addEventListener('click', (event) => {
        if (!event.target.closest('button')) $('bcLogoFile')?.click();
      });
      $('bcLogoRemove')?.addEventListener('click', () => {
        state.logo = '';
        $('bcLogoFile').value = '';
        $('bcLogoRemove')?.classList.add('hidden');
        updatePreview();
      });
      $('bcLogoFile')?.addEventListener('change', (event) => handleLogo(event.target.files?.[0]));
      $('bcOrderForm')?.addEventListener('input', () => {
        state.submitted = false;
        updatePreview();
      });
      updatePreview();
    }
  };
})();
