// Keep the text intact; language boundaries are used only for speech synthesis.
export function languageSegments(text) {
  if (!/[A-Za-z]/.test(text)) return [{text, language:'ko'}];
  if (!/[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/.test(text)) return [{text, language:'en'}];
  const segments=[];
  const words=/[A-Za-z]+(?:[0-9]+[A-Za-z]*)*(?:['’-][A-Za-z]+)*(?:[ \t]+[A-Za-z]+(?:[0-9]+[A-Za-z]*)*(?:['’-][A-Za-z]+)*)*/g;
  let offset=0, match;
  while ((match=words.exec(text))) {
    if (match.index>offset) segments.push({text:text.slice(offset,match.index),language:'ko'});
    segments.push({text:match[0],language:'en'});
    offset=match.index+match[0].length;
  }
  if(offset<text.length) segments.push({text:text.slice(offset),language:'ko'});
  return segments;
}
