import { KAEL } from './src/kael-art.js';
import assert from 'node:assert/strict';

assert.equal(KAEL.w, 74);
assert.equal(KAEL.h, 64);
assert.equal(KAEL.k, 3);
assert.equal(KAEL.ownWeapon, true);
const expected = { idle:8, walk:8, run:8, attack1:8, attack2:8, attack3:8, skill1:6, skill2:8, dash:6, hit:4, death:6, jump:2 };
function decode(encoded) {
  const data=[];
  for(let i=0;i<encoded.length;){
    const ch=encoded[i++];
    assert.ok(ch==='.' || KAEL.sym.includes(ch), `Bad palette symbol ${ch}`);
    let qty=''; while(i<encoded.length && /\d/.test(encoded[i]))qty+=encoded[i++];
    const count=qty ? Number(qty) : 1;
    for(let n=0;n<count;n++)data.push(ch);
  }
  assert.equal(data.length, KAEL.w*KAEL.h);
  return data;
}
let total=0;
for(const [name,n] of Object.entries(expected)) {
  assert.equal(KAEL.frames[name].length,n,`Wrong ${name} frame count`);
  for(const frame of KAEL.frames[name]) {
    const px=decode(frame); total++;
    for(let x=0;x<KAEL.w;x++)assert.equal(px[x], '.', `Art touches upper canvas edge in ${name}`);
  }
}
// Full silver blade remains in resting frames, never crosses the lower canvas boundary.
for (const name of ['idle','walk','run']) {
  for(const [i,s] of KAEL.frames[name].entries()) {
    const chars=decode(s); let minX=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(let y=49;y<64;y++)for(let x=0;x<31;x++){
      const char=chars[y*KAEL.w+x];if(char==='.')continue;
      const color=KAEL.palette[KAEL.sym.indexOf(char)];
      const [r,g,b]=[1,3,5].map(q=>parseInt(color.slice(q,q+2),16));
      if(Math.min(r,g,b)>135 && Math.max(r,g,b)-Math.min(r,g,b)<95){
        minX=Math.min(minX,x);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
      }
    }
    assert.ok(minX<=10 && maxX-minX>=15 && maxY<=62, `Blade cropped in ${name}[${i}]`);
  }
}
// Hair has pointed pixels above the old flattened y=13 edge in all idle frames.
for(const [i,s] of KAEL.frames.idle.entries()) {
  const px=decode(s);let top=64;
  for(let y=0;y<35;y++)for(let x=16;x<56;x++)if(px[y*KAEL.w+x]!=='.') top=Math.min(top,y);
  assert.ok(top <= 7, `Hair crown still flat in idle[${i}]`);
}
console.log(`PASS: ${total} valid frames; complete sword; hair no longer flat; 74x64 dimensions preserved`);
