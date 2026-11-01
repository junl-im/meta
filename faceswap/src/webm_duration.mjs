/** Local WebM Duration metadata repair for MediaRecorder output.
 * No transcoding, codecs or network calls. Follows Matroska/EBML element rules.
 * Deliberately limited to unknown-size Segment files without a SeekHead.
 * Unrecognized containers are returned untouched.
 */
const HEADER = 0x1a45dfa3;
const SEGMENT = 0x18538067;
const INFO = 0x1549a966;
const SEEK_HEAD = 0x114d9b74;
const TIMESTAMP_SCALE = 0x2ad7b1;
const DURATION = 0x4489;
const MAX_PREFIX_BYTES = 1024 * 1024;

function vint(bytes, offset, isSize) {
  if (offset >= bytes.length) return null;
  const first = bytes[offset];
  let length = 1, mask = 0x80;
  while (length <= 8 && !(first & mask)) { mask >>= 1; length++; }
  if (length > 8 || offset + length > bytes.length) return null;
  if (!isSize && length > 4) return null;
  let value = isSize ? first & (mask - 1) : first;
  let unknown = isSize && value === mask - 1;
  for (let i = 1; i < length; i++) {
    value = value * 256 + bytes[offset + i];
    if (isSize) unknown = unknown && bytes[offset + i] === 0xff;
  }
  if (!unknown && !Number.isSafeInteger(value)) return null;
  return {value: unknown ? null : value, length, unknown};
}

function element(bytes, offset) {
  const id = vint(bytes, offset, false);
  if (!id) return null;
  const sizeOffset = offset + id.length;
  const size = vint(bytes, sizeOffset, true);
  if (!size) return null;
  const dataStart = sizeOffset + size.length;
  const end = size.unknown ? null : dataStart + size.value;
  return {id: id.value, offset, idLength: id.length, sizeOffset,
    sizeLength: size.length, size: size.value, unknown: size.unknown, dataStart, end};
}

function sizeVint(size, minLength) {
  for (let length = minLength; length <= 8; length++) {
    // Reserve the all-ones pattern because that means unknown-size.
    const maxValue = 2 ** (7 * length) - 2;
    if (size > maxValue || !Number.isSafeInteger(size)) continue;
    const result = new Uint8Array(length);
    let remaining = size;
    for (let i = length - 1; i >= 0; i--) {
      result[i] = remaining % 256;
      remaining = Math.floor(remaining / 256);
    }
    result[0] |= 1 << (8 - length);
    return result;
  }
  return null;
}

function uintValue(bytes, node) {
  const length = node.end - node.dataStart;
  if (length < 1 || length > 6) return null;
  let value = 0;
  for (let i = node.dataStart; i < node.end; i++) value = value * 256 + bytes[i];
  return value;
}

function floatValue(bytes, node) {
  const length = node.end - node.dataStart;
  if (length !== 4 && length !== 8) return NaN;
  const view = new DataView(bytes.buffer, bytes.byteOffset + node.dataStart, length);
  return length === 8 ? view.getFloat64(0) : view.getFloat32(0);
}

const unchanged = (blob, reason) => ({blob, repaired: false, reason});

/**
 * @param {Blob} blob final browser MediaRecorder file
 * @param {number} durationMs elapsed monotonic recording milliseconds
 * @returns {Promise<{blob:Blob,repaired:boolean,reason:string}>}
 */
export async function repairWebmDuration(blob, durationMs) {
  if (!blob || !/^video\/webm(?:;|$)/i.test(blob.type)) return unchanged(blob, "not-webm");
  if (!Number.isFinite(durationMs) || durationMs <= 0 || durationMs > 86400000)
    return unchanged(blob, "invalid-duration");
  try {
    const bytes = new Uint8Array(await blob.slice(0, MAX_PREFIX_BYTES).arrayBuffer());
    const header = element(bytes, 0);
    if (!header || header.id !== HEADER || header.end > bytes.length)
      return unchanged(blob, "invalid-header");
    let top = header.end;
    let segment = null;
    while (top < bytes.length) {
      const node = element(bytes, top);
      if (!node) break;
      if (node.id === SEGMENT) { segment = node; break; }
      if (node.end === null || node.end > bytes.length) break;
      top = node.end;
    }
    // A known-size Segment may carry byte-offset references that would move.
    if (!segment || !segment.unknown) return unchanged(blob, "unsupported-segment");
    let cursor = segment.dataStart, info = null, seenSeekHead = false;
    while (cursor < bytes.length) {
      const node = element(bytes, cursor);
      if (!node) return unchanged(blob, "unreadable-segment");
      if (node.id === SEEK_HEAD) seenSeekHead = true;
      if (node.id === INFO) { info = node; break; }
      if (node.end === null || node.end > bytes.length) break;
      cursor = node.end;
    }
    if (!info || info.unknown || info.end > bytes.length || seenSeekHead)
      return unchanged(blob, "unsupported-info");
    let timestampScale = 1000000, durationElement = null;
    cursor = info.dataStart;
    while (cursor < info.end) {
      const node = element(bytes, cursor);
      if (!node || node.end === null || node.end > info.end)
        return unchanged(blob, "invalid-info-child");
      if (node.id === TIMESTAMP_SCALE) {
        timestampScale = uintValue(bytes, node);
        if (!timestampScale) return unchanged(blob, "invalid-timestamp-scale");
      }
      if (node.id === DURATION) durationElement = node;
      cursor = node.end;
    }
    const ticks = durationMs * 1000000 / timestampScale;
    if (!Number.isFinite(ticks) || ticks <= 0)
      return unchanged(blob, "invalid-ticks");
    if (durationElement) {
      if (floatValue(bytes, durationElement) > 0)
        return unchanged(blob, "already-present");
      const length = durationElement.end - durationElement.dataStart;
      if (length !== 4 && length !== 8) return unchanged(blob, "unsupported-float");
      const value = new Uint8Array(length);
      const view = new DataView(value.buffer);
      if (length === 8) view.setFloat64(0, ticks);
      else view.setFloat32(0, ticks);
      return {blob: new Blob([
        blob.slice(0, durationElement.dataStart), value, blob.slice(durationElement.end)
      ], {type: blob.type}), repaired: true, reason: "updated"};
    }
    const newSize = sizeVint(info.size + 11, info.sizeLength);
    if (!newSize) return unchanged(blob, "info-size-overflow");
    const durationBytes = new Uint8Array(11);
    durationBytes.set([0x44, 0x89, 0x88]);
    new DataView(durationBytes.buffer).setFloat64(3, ticks);
    return {blob: new Blob([
      blob.slice(0, info.sizeOffset), newSize,
      blob.slice(info.dataStart, info.end), durationBytes, blob.slice(info.end)
    ], {type: blob.type}), repaired: true, reason: "inserted"};
  } catch {
    return unchanged(blob, "parse-error");
  }
}
