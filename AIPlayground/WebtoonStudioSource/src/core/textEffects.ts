import type {TextEffect} from './types.js'
export const TEXT_EFFECTS:Array<{id:string;label:string;color:string;effect:TextEffect}>=[
  {id:'plain',label:'기본',color:'#111111',effect:{}},
  {id:'ink',label:'흰 글씨·먹선',color:'#ffffff',effect:{outlineWidth:3,outlineColor:'#111111'}},
  {id:'reverse',label:'검정·흰 테두리',color:'#111111',effect:{outlineWidth:3,outlineColor:'#ffffff'}},
  {id:'impact',label:'빨강 충격',color:'#ed3939',effect:{outlineWidth:3,outlineColor:'#ffffff',shadowColor:'#391c25',shadowSize:4,slant:-10}},
  {id:'yellow',label:'노랑 강조',color:'#ffe13b',effect:{outlineWidth:3,outlineColor:'#151515',shadowColor:'#151515',shadowSize:3}},
  {id:'cold',label:'파랑 냉기',color:'#b8eeff',effect:{outlineWidth:2,outlineColor:'#254b99',shadowColor:'#6bcfff',shadowSize:8,glow:true}},
  {id:'horror',label:'보라 공포',color:'#b88de8',effect:{outlineWidth:2,outlineColor:'#23192e',shadowColor:'#41285b',shadowSize:5,letterSpacing:3}},
  {id:'double',label:'이중 테두리',color:'#ffffff',effect:{outlineWidth:2,outlineColor:'#111111',shadowColor:'#ffc941',shadowSize:5,glow:true}},
  {id:'shadow',label:'진한 그림자',color:'#ffffff',effect:{shadowColor:'#151515',shadowSize:5}},
  {id:'soft',label:'부드러운 빛',color:'#ffffff',effect:{shadowColor:'#242424',shadowSize:8,glow:true}},
  {id:'neon',label:'분홍 네온',color:'#fff4fd',effect:{outlineWidth:1,outlineColor:'#fa50b9',shadowColor:'#fb39a3',shadowSize:12,glow:true}},
  {id:'sunset',label:'노을 그라데이션',color:'#ffbf42',effect:{gradient:'#ff4566',outlineColor:'#3d1d34',outlineWidth:2}},
]
export function effectExtent(effect?:TextEffect){return Math.min(12,Math.max(0,effect?.outlineWidth||0))+Math.min(24,Math.max(0,effect?.shadowSize||0))*3+Math.abs(Math.tan((Math.min(20,Math.max(-20,effect?.slant||0)))*Math.PI/180))}
