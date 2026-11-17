// Pure runtime loader/flip test, no real network or Canvas dependency.
// Run with node --experimental-vm-modules tools/test_facing.mjs
import { readFileSync } from 'node:fs';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import assert from 'node:assert/strict';
const source = readFileSync(new URL('../src/soft-angle-atlases.js', import.meta.url), 'utf8');
class FakeImage {
  naturalWidth = 1200; naturalHeight = 1248;
  set src(value) { this.url = value; queueMicrotask(() => this.onload?.()); }
}
const context=createContext({
 Image:FakeImage,
 URL,
 console,
 document: {
  createElement(name) {
   assert.equal(name,'canvas');
   return { width:0,height:0, getContext() {
    return {imageSmoothingEnabled:false,drawImage(){},translate(){},scale(){},fillRect(){},set globalCompositeOperation(x){},set fillStyle(x){}};
   }};
  }
 },
});
const module = new SourceTextModule(source,{context,identifier:'file:///src/soft-angle-atlases.js', initializeImportMeta(meta){meta.url='file:///src/soft-angle-atlases.js';}});
await module.link(async(specifier)=>{
 assert.match(specifier,/^\.\/gfx\.js/);
 return new SyntheticModule(['SS'],function(){this.setExport('SS',3)}, {context});
});
await module.evaluate();
const {installSoftAngleSprites,softFacingLeft}=module.namespace;
const IDS=['BLADE','GUNNER','WIZARD','NINJA','MECHANIC','TANK','ROBOT','DEV'];
const SPR={chars:{},evo:{}};
for(const id of IDS)Object.defineProperty(SPR.evo,id,{configurable:true,get:()=>({legacy:true})});
installSoftAngleSprites(SPR);
await new Promise(resolve=>setImmediate(resolve));
assert.equal(SPR.softFacingState,'ready');
for(const id of IDS){
 const set=SPR.chars[id];
 assert.equal(set.softFacing,true);
 assert.equal(set.idles.length,8);
 assert.equal(set.walk.length,8);
 assert.equal(set.run.length,8);
 assert.equal(set.act.attack.length,3);
 assert.equal(set.act.attack[0].length,8);
 assert.equal(set.act.skill1.length,8);
 assert.equal(set.act.skill2.length,8);
 assert.equal(set.act.ultimate.length,10);
 assert.equal(set.act.dash.length,6);
 assert.equal(set.act.death.length,8);
 assert.equal(SPR.evo[id].softFacing,true);
 assert.equal(set.idle.w,40);
 assert.equal(set.idle.h,32);
}
const p={state:'move',aim:Math.PI, vx:0,vy:0};
assert.equal(softFacingLeft(p),true);
p.aim=-Math.PI/2;
assert.equal(softFacingLeft(p),true); // aim vertically, keep left
p.aim=0;
assert.equal(softFacingLeft(p),false);
p.aim=Math.PI/2;
assert.equal(softFacingLeft(p),false); // aim vertically, keep right
console.log('[PASS] 8 heroes + evolved, Q/E/R, death, pixel dimensions, and facing hysteresis');
