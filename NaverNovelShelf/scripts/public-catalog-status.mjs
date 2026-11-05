// The marker belongs to the search-result thumbnail, not a chapter title or
// a recommendation elsewhere on the page. A malformed card is not classified.
export function publicCatalogStatus(card) {
  const thumbnail = card.match(/<div class="thumbnail">([\s\S]*?)<\/div>/)?.[1];
  if (!thumbnail || !/<img\b/i.test(thumbnail)) throw Error('Public search card lacks a valid thumbnail');
  const marker = /<span\b[^>]*class="[^"]*\bicon_comp\b[^"]*"[^>]*>\s*완결\s*<\/span>/i;
  if (/\bicon_comp\b/i.test(thumbnail) && !marker.test(thumbnail)) throw Error('Unrecognized completion marker');
  return marker.test(thumbnail) ? 'completed' : 'ongoing';
}
