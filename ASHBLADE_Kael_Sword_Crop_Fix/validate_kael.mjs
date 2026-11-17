/** Verify source sprite frame data after the Kael sword-crop fix. Run: node validate_kael.mjs */
import { KAEL } from './src/kael-art.js';
import assert from 'node:assert/strict';
assert.equal(KAEL.w, 74);
assert.equal(KAEL.h, 64);
assert.equal(KAEL.k, 3);
assert.equal(KAEL.sym.length, KAEL.palette.length);
const expected = { idle: 8, walk: 8, run: 8, attack1: 8, attack2: 8, attack3: 8,
  skill1: 6, skill2: 8, dash: 6, hit: 4, death: 6, jump: 2 };
function decode(frame) {
  const pixels=[];
  for(let i=0;i<frame.length;) {
    const ch=frame[i++];
    let times=''; while(i<frame.length && frame[i]>='0' && frame[i]<='9')times+=frame[i++];
    const count=times ? Number(times) : 1;
    assert.ok(ch==='.' || KAEL.sym.includes(ch),`Unknown character: ${ch}`);
    for(let k=0;k<count;k++)pixels.push(ch);
  }
  assert.equal(pixels.length, KAEL.w*KAEL.h);
  return pixels;
}
let total=0;
for(const [name,n] of Object.entries(expected)) {
  assert.equal(KAEL.frames[name].length,n,`Wrong number of ${name} frames`);
  for(const encoded of KAEL.frames[name]) {decode(encoded);total++;}
}
// Assert full blade highlights now fit inside the canvas's lower-left corner.
for(const name of ['idle','walk','run']) {
  for(const [index,f] of KAEL.frames[name].entries()) {
    const px=decode(f); let minX=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(let y=49;y<64;y++) for(let x=0;x<31;x++) {
      const ch=px[y*KAEL.w+x]; if(ch==='.')continue;
      const color=KAEL.palette[KAEL.sym.indexOf(ch)];
      const [r,g,b]=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
      if(Math.min(r,g,b)>135 && Math.max(r,g,b)-Math.min(r,g,b)<95) {
        minX=Math.min(minX,x);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
      }
    }
    assert.ok(minX<=10,`${name}[${index}] blade has no full tip`);
    assert.ok(maxX-minX>=15,`${name}[${index}] blade appears too short`);
    assert.ok(maxY<=62,`${name}[${index}] bright blade touches canvas bottom edge`);
  }
}
console.log(`Validated ${total} frames across ${Object.keys(expected).length} animations; sword complete in idle/walk/run.`);
