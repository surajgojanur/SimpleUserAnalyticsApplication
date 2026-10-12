(function () {
  try {
    // currentScript becomes null after this synchronous initialization.
    const script = document.currentScript;
    if (!script || window.__insightflow) return;
    const siteId = script.getAttribute('data-site-id');
    if (!siteId || location.origin === 'null') return;
    const apiUrl = script.getAttribute('data-api-url') || new URL('/api/events', script.src).href;
    window.__insightflow = true;
    const key = 'insightflow:' + siteId + ':session';
    const timeout = 30 * 60 * 1000;
    let memory = null;
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    function uuid() {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        return crypto.randomUUID();
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
        const value = (Math.random() * 16) | 0;
        return (character === 'x' ? value : (value & 3) | 8).toString(16);
      });
    }
    function sessionId() {
      const now = Date.now();
      let session = memory;
      try {
        session = JSON.parse(localStorage.getItem(key)) || memory;
      } catch {}
      if (
        !session ||
        !uuidPattern.test(session.id) ||
        !Number.isFinite(session.last) ||
        now - session.last >= timeout ||
        session.last > now
      )
        session = { id: uuid(), last: now };
      session.last = now;
      memory = session;
      try {
        localStorage.setItem(key, JSON.stringify(session));
      } catch {}
      return session.id;
    }
    function track(type, extra) {
      // Each callback needs its own guard; an outer catch cannot protect future events.
      try {
        const event = Object.assign(
          {
            site_id: siteId,
            event_id: uuid(),
            session_id: sessionId(),
            event_type: type,
            page_url: location.origin + location.pathname,
            timestamp: new Date().toISOString(),
          },
          extra,
        );
        fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: JSON.stringify(event),
          keepalive: true,
          credentials: 'omit',
          mode: 'cors',
        }).catch(() => {});
      } catch {}
    }
    track('page_view');
    document.addEventListener(
      'click',
      (event) => {
        try {
          const root = document.documentElement;
          const body = document.body;
          track('click', {
            click: {
              x: Math.round(event.pageX),
              y: Math.round(event.pageY),
              viewport_width: window.innerWidth,
              viewport_height: window.innerHeight,
              document_width: Math.max(
                root.scrollWidth,
                body ? body.scrollWidth : 0,
                window.innerWidth,
              ),
              document_height: Math.max(
                root.scrollHeight,
                body ? body.scrollHeight : 0,
                window.innerHeight,
              ),
            },
          });
        } catch {}
      },
      true,
    );
  } catch {
    // Analytics must never interrupt the host page.
  }
})();
