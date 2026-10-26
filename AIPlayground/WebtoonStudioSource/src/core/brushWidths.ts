export type BrushWidths = Record<'pen'|'eraser'|'soft-eraser'|'restore',number>
export function normalizeBrushWidths(value:unknown):BrushWidths{
 const result:BrushWidths={pen:4,eraser:30,'soft-eraser':50,restore:30}
 if(!value||typeof value!=='object'||Array.isArray(value))return result
 for(const key of ['pen','eraser','soft-eraser','restore'] as const){const width=(value as Record<string,unknown>)[key];if(typeof width==='number'&&Number.isFinite(width)&&width>=1&&width<=150)result[key]=width}
 return result
}
