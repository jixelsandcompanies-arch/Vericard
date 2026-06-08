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
  const styleNames = ['Classic Stripe', 'Circle Luxe', 'Box Mark', 'Plain Executive', 'Corner Pro', 'Minimal White', 'Split Brand', 'QR Footer', 'Gold Line', 'Clean Contact'];
  const layouts = ['primary', 'clean', 'bold', 'qr'];
  const logoShapes = ['circle', 'box', 'plain'];
  const previewFormats = ['classic', 'corner', 'minimal', 'split'];
  const state = {
    type: '',
    templateId: '',
    logo: '',
    continued: false,
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
  function escapeAttr(value) { return escapeHtml(value).replace(/`/g, '&#96;'); }
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
    return Array.from({ length: styleNames.length }, (_, index) => ({
      id: `${prefix}-${index + 1}`,
      name: `${type} ${styleNames[index % styleNames.length]}`,
      layout: layouts[index % layouts.length],
      logoShape: logoShapes[index % logoShapes.length],
      previewFormat: previewFormats[index % previewFormats.length],
      description: index % 3 === 0 ? 'Sample-style front with contact details and footer QR.' : index % 3 === 1 ? 'Modern brand card with balanced logo and contact spacing.' : 'Clean professional layout with services on the back.'
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
  function formReadyForTemplates(formValues = values()) {
    return Boolean(
      formValues.businessType &&
      formValues.logo &&
      formValues.businessName &&
      formValues.contactName &&
      formValues.phone
    );
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
    const readyForTemplates = formReadyForTemplates(formValues);
    if (!readyForTemplates) {
      state.continued = false;
      state.templateId = '';
    }
    $('bcBusinessType').value = formValues.businessType;
    $('bcLogoValue').value = formValues.logo;
    $('bcPreviewBusiness').textContent = formValues.businessName || 'Business Name';
    $('bcPreviewBackBusiness').textContent = formValues.businessName || 'Business Name';
    $('bcPreviewName').textContent = formValues.contactName || 'Name';
    $('bcPreviewPhone').textContent = formValues.phone ? `Phone: ${formValues.phone}` : 'Phone:';
    $('bcPreviewEmail').textContent = formValues.email ? `Email: ${formValues.email}` : 'Email:';
    $('bcPreviewWebsite').textContent = formValues.website ? `Website: ${formValues.website}` : 'Website / social:';
    $('bcPreviewWhatsapp').textContent = formValues.whatsapp ? `WhatsApp: ${formValues.whatsapp}` : 'WhatsApp:';
    $('bcPreviewTagline').textContent = formValues.tagline || 'Tagline';
    $('bcPreviewBackTagline').textContent = formValues.tagline || '';
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
    const designStep = $('bcDesignStep');
    const quantityStep = $('bcQuantityStep');
    const submitActions = $('bcSubmitActions');
    const continueBtn = $('bcContinueBtn');
    const templateTitle = $('bcTemplateTitle');
    const changeTemplateBtn = $('bcChangeTemplateBtn');
    const templateGrid = $('bcTemplateGrid');
    const previewStage = $('bcPreviewStage');
    if (continueBtn) continueBtn.disabled = !readyForTemplates;
    if (designStep) designStep.classList.toggle('hidden', !state.continued);
    if (quantityStep) quantityStep.classList.toggle('hidden', !state.templateId);
    if (submitActions) submitActions.classList.toggle('hidden', !state.templateId);
    if (templateTitle) templateTitle.textContent = state.templateId ? 'Selected Template' : 'Choose Template';
    if (changeTemplateBtn) changeTemplateBtn.classList.toggle('hidden', !state.templateId);
    if (templateGrid) templateGrid.classList.toggle('hidden', Boolean(state.templateId));
    if (previewStage) previewStage.classList.toggle('hidden', !state.templateId);
    if (state.continued && !state.templateId && !templateGrid?.children.length) renderTemplates();
    if (!state.continued && templateGrid) templateGrid.innerHTML = '';
    $('bcTemplateId').value = state.templateId;
    if ($('bcNotice') && !state.submitted) {
      $('bcNotice').textContent = !readyForTemplates
        ? 'Fill the business card details and upload a logo, then continue.'
        : !state.continued
          ? 'Click Continue to see the card templates.'
        : state.templateId
          ? 'Enter the quantity needed, then submit the business card order.'
          : 'Choose the template you want before entering the quantity.';
      $('bcNotice').classList.remove('danger');
    }
    const activeTemplate = templatesFor(state.type).find((template) => template.id === state.templateId);
    const stage = $('bcPreviewStage');
    if (stage) {
      stage.classList.remove('bc-template-primary', 'bc-template-clean', 'bc-template-bold', 'bc-template-qr');
      stage.classList.remove('bc-logo-circle', 'bc-logo-box', 'bc-logo-plain');
      stage.classList.remove('bc-format-classic', 'bc-format-corner', 'bc-format-minimal', 'bc-format-split');
      stage.classList.add(`bc-template-${activeTemplate?.layout || 'primary'}`);
      stage.classList.add(`bc-logo-${activeTemplate?.logoShape || 'circle'}`);
      stage.classList.add(`bc-format-${activeTemplate?.previewFormat || 'classic'}`);
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
    if (!state.continued || !formReadyForTemplates()) {
      grid.innerHTML = '';
      return;
    }
    const formValues = values();
    const list = templatesFor(state.type);
    if (state.templateId && !list.some((template) => template.id === state.templateId)) state.templateId = '';
    grid.innerHTML = list.map((template) => `
      <button type="button" class="bc-template-choice ${template.id === state.templateId ? 'active' : ''}" data-bc-template="${escapeHtml(template.id)}" style="--template-color:${state.colors.primary};--template-accent:${state.colors.accent};">
        <span class="bc-template-sides">
          <span class="bc-template-card bc-template-front template-${escapeHtml(template.layout)} bc-thumb-logo-${escapeHtml(template.logoShape)} bc-thumb-format-${escapeHtml(template.previewFormat)}">
            <span class="template-logo">${formValues.logo ? `<img src="${escapeAttr(formValues.logo)}" alt="">` : '<b>LOGO</b>'}</span>
            <span class="bc-thumb-business">${escapeHtml(formValues.businessName || template.name)}</span>
            <span class="bc-thumb-tagline">${escapeHtml(formValues.tagline || 'Tagline')}</span>
            <span class="bc-thumb-contact">
              <b>${escapeHtml(formValues.contactName || 'Name')}</b>
              <i>${escapeHtml(formValues.phone ? `Phone: ${formValues.phone}` : 'Phone:')}</i>
              <i>${escapeHtml(formValues.email ? `Email: ${formValues.email}` : 'Email:')}</i>
              <i>${escapeHtml(formValues.whatsapp ? `WhatsApp: ${formValues.whatsapp}` : 'WhatsApp:')}</i>
              <i>${escapeHtml(formValues.website ? `Web: ${formValues.website}` : 'Website:')}</i>
            </span>
            <span class="template-qr-mark"></span>
          </span>
          <span class="bc-template-card bc-template-back bc-thumb-logo-${escapeHtml(template.logoShape)}">
            <span class="template-logo">${formValues.logo ? `<img src="${escapeAttr(formValues.logo)}" alt="">` : '<b>LOGO</b>'}</span>
            <span class="bc-thumb-services">${escapeHtml(formValues.services || 'Services appear here')}</span>
          </span>
        </span>
        <strong>${escapeHtml(template.name)}</strong>
        <span>${escapeHtml(template.description)}</span>
      </button>
    `).join('');
  }
  function chooseType(type) {
    state.type = type;
    state.templateId = '';
    state.continued = false;
    $('bcTypeStep')?.classList.add('hidden');
    $('bcOrderForm')?.classList.remove('hidden');
    renderTypes();
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
    state.templateId = '';
    state.continued = false;
    $('bcLogoValue').value = '';
    $('bcTemplateGrid').innerHTML = '';
    $('bcDesignStep')?.classList.add('hidden');
    $('bcQuantityStep')?.classList.add('hidden');
    $('bcSubmitActions')?.classList.add('hidden');
    $('bcLogoRemove')?.classList.add('hidden');
    $('bcNotice').textContent = 'Fill the business card details and upload a logo. Choose a template, then enter the quantity.';
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
        state.templateId = '';
        state.continued = false;
        $('bcLogoFile').value = '';
        $('bcTemplateGrid').innerHTML = '';
        $('bcQuantityStep')?.classList.add('hidden');
        $('bcSubmitActions')?.classList.add('hidden');
        $('bcLogoRemove')?.classList.add('hidden');
        updatePreview();
      });
      $('bcLogoFile')?.addEventListener('change', (event) => handleLogo(event.target.files?.[0]));
      $('bcContinueBtn')?.addEventListener('click', () => {
        if (!formReadyForTemplates()) return;
        state.continued = true;
        renderTemplates();
        updatePreview();
      });
      $('bcChangeTemplateBtn')?.addEventListener('click', () => {
        state.templateId = '';
        state.submitted = false;
        renderTemplates();
        updatePreview();
      });
      $('bcOrderForm')?.addEventListener('input', () => {
        state.submitted = false;
        if (!formReadyForTemplates()) state.continued = false;
        if (state.continued) renderTemplates();
        updatePreview();
      });
      updatePreview();
    }
  };
})();
