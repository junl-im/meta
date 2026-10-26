export type ComicMode='color'|'ink'|'tone'|'pastel'|'sepia'|'webtoon'|'clean'|'night'|'cel'|'manga'|'pop'|'duotone'
export interface ComicOptions {lineStrength?:number;levels?:number;toneSize?:number}
/** Deterministic, alpha-preserving local effect; this is not an AI style model. */
export function comicPixels(input:Uint8ClampedArray,width:number,height:number,mode:ComicMode,strength=.6,options:ComicOptions={}){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>4_000_000||input.length!==width*height*4)throw new Error('이미지는 최대 400만 픽셀까지 처리합니다.')
  const amount=Number.isFinite(strength)?Math.max(0,Math.min(1,strength)):.6,out=new Uint8ClampedArray(input),gray=new Float32Array(width*height)
  if(amount===0)return out
  for(let i=0;i<gray.length;i++)gray[i]=input[i*4]*.299+input[i*4+1]*.587+input[i*4+2]*.114
  if(['cel','manga','pop','duotone'].includes(mode))return advancedComic(input,width,height,mode,amount,options,gray)
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const pos=y*width+x,index=pos*4;if(input[index+3]===0)continue
    const left=gray[y*width+Math.max(0,x-1)],right=gray[y*width+Math.min(width-1,x+1)],top=gray[Math.max(0,y-1)*width+x],bottom=gray[Math.min(height-1,y+1)*width+x]
    const edge=Math.min(1,(Math.abs(right-left)+Math.abs(bottom-top))/100),levels=Math.round(8-amount*5)
    const shade=mode==='ink'?(gray[pos]>135?255:210):mode==='tone'?(gray[pos]>215?255:gray[pos]>120?(x%6<2&&y%6<2?40:255):gray[pos]>60?(x%4<2&&y%4<2?20:210):35):0
    for(let c=0;c<3;c++){const quantized=Math.round(input[index+c]/255*levels)/levels*255;let base=mode==='color'?quantized:mode==='pastel'?quantized*.75+255*.25:mode==='sepia'?Math.min(255,gray[pos]*[1.12,.96,.75][c]):shade;if(mode==='webtoon'||mode==='clean'||mode==='night'){let sum=0,n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const k=(Math.max(0,Math.min(height-1,y+dy))*width+Math.max(0,Math.min(width-1,x+dx)))*4;if(input[k+3]){sum+=input[k+c];n++}}const smooth=sum/Math.max(1,n),lum=gray[pos],saturated=lum+(smooth-lum)*(mode==='clean'?1.08:1.2),bands=mode==='clean'?10:mode==='night'?4:6;const flat=Math.round(Math.max(0,Math.min(255,saturated))/255*bands)/bands*255;base=mode==='night'?flat*(lum<120?.72:1.03):mode==='clean'?flat*.8+255*.2:flat;const line=Math.min(.9,edge*(mode==='clean'?.45:mode==='night'?1.15:.85));base=base*(1-line);out[index+c]=Math.round(Math.max(0,Math.min(255,input[index+c]*(1-amount)+base*amount)))}else out[index+c]=Math.round(input[index+c]*(1-amount)+base*(1-edge)*amount)}
  }
  return out
}

function advancedComic(input:Uint8ClampedArray,w:number,h:number,mode:ComicMode,amount:number,options:ComicOptions,gray:Float32Array){
 const bounded=(v:number|undefined,fallback:number,min:number,max:number)=>Number.isFinite(v)?Math.max(min,Math.min(max,v!)):fallback
 const line=bounded(options.lineStrength,.7,0,1),levels=Math.round(bounded(options.levels,5,2,12)),size=Math.round(bounded(options.toneSize,6,3,16)),smooth=new Uint8ClampedArray(input),out=new Uint8ClampedArray(input)
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x,k=i*4;if(!input[k+3])continue;let total=0,r=0,g=0,b=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const n=Math.max(0,Math.min(h-1,y+dy))*w+Math.max(0,Math.min(w-1,x+dx)),a=input[n*4+3]/255,d=gray[n]-gray[i],weight=a/((1+d*d/900)*(1+(dx*dx+dy*dy)*.35));total+=weight;r+=input[n*4]*weight;g+=input[n*4+1]*weight;b+=input[n*4+2]*weight}smooth[k]=r/total;smooth[k+1]=g/total;smooth[k+2]=b/total}
 for(let i=0;i<gray.length;i++)gray[i]=smooth[i*4]*.299+smooth[i*4+1]*.587+smooth[i*4+2]*.114
 const cols=Math.ceil(w/size),rows=Math.ceil(h/size),tones=new Float32Array(cols*rows),weights=new Float32Array(cols*rows)
 if(mode==='pop'||mode==='manga')for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x,a=input[i*4+3]/255,cell=Math.floor(y/size)*cols+Math.floor(x/size);tones[cell]+=gray[i]*a;weights[cell]+=a}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x,k=i*4;if(!input[k+3])continue;const sample=(dx:number,dy:number)=>{const n=Math.max(0,Math.min(h-1,y+dy))*w+Math.max(0,Math.min(w-1,x+dx));return input[n*4+3]?gray[n]:gray[i]};const gx=-sample(-1,-1)+sample(1,-1)-2*sample(-1,0)+2*sample(1,0)-sample(-1,1)+sample(1,1),gy=-sample(-1,-1)-2*sample(0,-1)-sample(1,-1)+sample(-1,1)+2*sample(0,1)+sample(1,1),edge=Math.min(1,Math.hypot(gx,gy)/180)*line,cell=Math.floor(y/size)*cols+Math.floor(x/size),lum=weights[cell]?tones[cell]/weights[cell]:gray[i],radius=Math.sqrt(Math.max(0,1-lum/255))*size*.55,dot=Math.hypot(x%size-(size-1)/2,y%size-(size-1)/2)<radius
  for(let c=0;c<3;c++){let base=Math.round(smooth[k+c]/255*(levels-1))/(levels-1)*255;if(mode==='manga')base=lum<60?25:lum>235?255:dot?45:255;else if(mode==='pop')base=dot?base*.55:base*.85+255*.15;else if(mode==='duotone'){const t=Math.round(gray[i]/255*(levels-1))/(levels-1),ink=[32,40,78][c],paper=[250,237,213][c];base=ink+(paper-ink)*t}base*=1-edge;out[k+c]=input[k+c]*(1-amount)+base*amount}
 }
 return out
}
