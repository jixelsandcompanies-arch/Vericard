window.VeriCardFeatures = window.VeriCardFeatures || {};

(function () {
  const loadedCss = new Set();
  const loadedJs = new Set();
  const validTypes = new Set(['school', 'university', 'company', 'hospital', 'ngo', 'security', 'government', 'custom']);

  function safeType(type) {
    return validTypes.has(type) ? type : 'custom';
  }

  function loadCss(type) {
    if (loadedCss.has(type)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `/features/${type}/${type}.css`;
    link.dataset.featureCss = type;
    document.head.appendChild(link);
    loadedCss.add(type);
  }

  function loadJs(type) {
    if (loadedJs.has(type)) return;
    const script = document.createElement('script');
    script.src = `/features/${type}/${type}.js`;
    script.defer = true;
    script.dataset.featureJs = type;
    document.body.appendChild(script);
    loadedJs.add(type);
  }

  async function loadHtml(type) {
    const mount = document.getElementById('organizationFeatureMount');
    if (!mount) return;
    try {
      const response = await fetch(`/features/${type}/${type}.html`);
      mount.innerHTML = response.ok ? await response.text() : '';
      mount.classList.toggle('hidden', !mount.innerHTML.trim());
    } catch {
      mount.innerHTML = '';
      mount.classList.add('hidden');
    }
  }

  window.loadOrganizationFeature = async function loadOrganizationFeature(type) {
    const featureType = safeType(type);
    document.documentElement.dataset.organizationFeature = featureType;
    loadCss(featureType);
    loadJs(featureType);
    await loadHtml(featureType);
    const feature = window.VeriCardFeatures?.[featureType];
    if (feature?.activate) feature.activate();
  };
})();
