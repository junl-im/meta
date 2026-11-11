/** Browser-only labeled proof; it overlays a photo, not a swapped identity. */
export const defaultBox = Object.freeze({x: 0.37, y: 0.17, width: 0.26, height: 0.37});
export function outputDimensions(width, height, maxSide = 960) {
  if (![width, height, maxSide].every(Number.isFinite) || width <= 0 || height <= 0 || maxSide < 2) return null;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return {width: Math.max(2, Math.floor(width * scale / 2) * 2),
    height: Math.max(2, Math.floor(height * scale / 2) * 2)};
}
export function chooseRecordingFormat(recorderType) {
  if (!recorderType || typeof recorderType.isTypeSupported !== "function") return null;
  return [
    {mimeType: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", extension: "mp4"},
    {mimeType: "video/webm;codecs=vp8,opus", extension: "webm"},
    {mimeType: "video/webm", extension: "webm"},
    {mimeType: "video/mp4", extension: "mp4"}
  ].find((type) => recorderType.isTypeSupported(type.mimeType)) || null;
}
export function drawOverlayFrame(ctx, video, portrait, faceBox = defaultBox, size = 100, opacity = 86) {
  const width = ctx.canvas.width, height = ctx.canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(video, 0, 0, width, height);
  const box = faceBox || defaultBox;
  const factor = Math.max(0.4, Math.min(1.8, Number(size) / 100 || 1));
  const alpha = Math.max(0.2, Math.min(1, Number(opacity) / 100 || 0.86));
  const ew = box.width * width * factor, eh = box.height * height * factor;
  const x = (box.x + box.width / 2) * width, y = (box.y + box.height / 2) * height;
  const pw = portrait.naturalWidth || portrait.width, ph = portrait.naturalHeight || portrait.height;
  const crop = Math.min(pw, ph);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, ew / 2, eh / 2, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.globalAlpha = alpha;
  ctx.drawImage(portrait, (pw - crop) / 2, (ph - crop) / 2, crop, crop, x - ew / 2, y - eh / 2, ew, eh);
  ctx.restore();
  const fs = Math.max(11, Math.round(Math.min(width, height) * 0.027));
  ctx.save();
  ctx.font = "700 " + fs + "px system-ui, sans-serif";
  ctx.fillStyle = "rgba(7,17,24,0.84)";
  ctx.fillRect(8, height - fs - 18, Math.min(width - 16, fs * 16), fs + 12);
  ctx.fillStyle = "#f6f7f2";
  ctx.fillText("DEMO / NOT AI SWAP", 14, height - 15);
  ctx.restore();
}
