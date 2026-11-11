// Incremental SHA-256 (FIPS 180-4) with bounded chunk memory.
// No third-party source, no network, no model inference.
const K = Uint32Array.from([
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
]);
const rotr = (value, bits) => (value >>> bits) | (value << (32 - bits));

export class Sha256Stream {
  constructor() {
    this.h = Uint32Array.from([
      0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,
      0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19
    ]);
    this.buffer = new Uint8Array(64);
    this.words = new Uint32Array(64);
    this.bufferLength = 0;
    this.totalBytes = 0;
    this.finished = false;
  }

  compress(bytes, start) {
    const w = this.words;
    for (let i = 0; i < 16; i++) {
      const p = start + i * 4;
      w[i] = ((bytes[p] << 24) | (bytes[p + 1] << 16) |
        (bytes[p + 2] << 8) | bytes[p + 3]) >>> 0;
    }
    for (let i = 16; i < 64; i++) {
      const x = w[i - 15], y = w[i - 2];
      const s0 = rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
      const s1 = rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a,b,c,d,e,f,g,h] = this.h;
    for (let i = 0; i < 64; i++) {
      const s1 = rotr(e,6) ^ rotr(e,11) ^ rotr(e,25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + s1 + ch + K[i] + w[i]) >>> 0;
      const s0 = rotr(a,2) ^ rotr(a,13) ^ rotr(a,22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (s0 + maj) >>> 0;
      h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;
    }
    const values=[a,b,c,d,e,f,g,h];
    for(let i=0;i<8;i++) this.h[i]=(this.h[i]+values[i])>>>0;
  }

  update(data) {
    if (this.finished) throw new Error("SHA-256 검사가 이미 완료됐어.");
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    this.totalBytes += bytes.byteLength;
    if (!Number.isSafeInteger(this.totalBytes)) throw new Error("SHA-256 파일 길이가 너무 커.");
    let pos=0;
    if (this.bufferLength > 0) {
      const take = Math.min(64-this.bufferLength, bytes.length);
      this.buffer.set(bytes.subarray(0,take),this.bufferLength);
      this.bufferLength+=take;pos+=take;
      if(this.bufferLength===64){this.compress(this.buffer,0);this.bufferLength=0;}
    }
    while (pos + 64 <= bytes.length) {this.compress(bytes,pos);pos+=64;}
    if (pos<bytes.length){
      this.buffer.set(bytes.subarray(pos),0);
      this.bufferLength=bytes.length-pos;
    }
    return this;
  }

  digestHex() {
    if(this.finished) throw new Error("SHA-256 검사가 이미 완료됐어.");
    const bits=BigInt(this.totalBytes)*8n;
    const padLength=this.bufferLength<56?56-this.bufferLength:120-this.bufferLength;
    const pad=new Uint8Array(padLength+8);
    pad[0]=0x80;
    for(let i=0;i<8;i++) pad[padLength+i]=Number((bits>>BigInt(56-i*8))&255n);
    this.update(pad);
    this.finished=true;
    return Array.from(this.h,word=>word.toString(16).padStart(8,"0")).join("");
  }
}

export const HASH_CHUNK_BYTES=1024*1024;
export async function sha256BlobInChunks(blob,{
  chunkBytes=HASH_CHUNK_BYTES,onProgress=()=>{},shouldAbort=()=>false
}={}) {
  if (!blob || !Number.isSafeInteger(blob.size) || blob.size<0) throw new Error("파일 크기를 확인할 수 없어.");
  if (!Number.isInteger(chunkBytes) || chunkBytes<1 || chunkBytes>4*1024*1024) {
    throw new Error("유효하지 않은 해시 분할 크기야.");
  }
  const sha=new Sha256Stream();
  for(let offset=0;offset<blob.size;offset+=chunkBytes){
    if(shouldAbort()) throw new Error("검사를 취소했어.");
    const chunk=await blob.slice(offset,offset+chunkBytes).arrayBuffer();
    if(shouldAbort()) throw new Error("검사를 취소했어.");
    sha.update(new Uint8Array(chunk));
    onProgress(Math.min(blob.size,offset+chunkBytes),blob.size);
  }
  if(shouldAbort()) throw new Error("검사를 취소했어.");
  return sha.digestHex();
}
