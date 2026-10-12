const productionOrigin = 'https://insightflow-store.netlify.app';

export function filterPages(pages, environment) {
  return pages.filter((page) => {
    try {
      const url = new URL(page.page_url);
      if (!['http:', 'https:'].includes(url.protocol)) return false;
      if (environment === 'production') return url.origin === productionOrigin;
      if (environment === 'local')
        return (
          url.hostname === 'localhost' ||
          url.hostname.endsWith('.localhost') ||
          url.hostname === '[::1]' ||
          /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(url.hostname)
        );
      return true;
    } catch {
      return false;
    }
  });
}
