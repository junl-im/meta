'use strict';
(() => {
  const current = new URL(location.href);
  if (current.hostname !== 'junl-im.github.io') return;
  if (!current.pathname.startsWith('/meta/ai-cleaner/')) return;
  // Old-origin browser storage remains accessible at ?stay=github.
  if (current.searchParams.has('stay')) return;
  current.hostname = 'meta-deee1.web.app';
  current.pathname = current.pathname.slice('/meta'.length);
  location.replace(current.href);
})();
