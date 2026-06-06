if (!location.pathname.endsWith('/portal.html')) {
  location.replace(`/portal.html${location.search}${location.hash}`);
}
