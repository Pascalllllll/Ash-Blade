import { W,H,FW,SX,P,fillScreen,rect,ring,text,textO } from './gfx.js?v=203';
import { input,keyHit,editor,TOUCH_BTNS,STICK_X,STICK_Y,STICK_R,placeButtons } from './input.js?v=203';
import { ACTIONS,keys,keyLabel,bindKey,resetKeys,resetLayout } from './bindings.js?v=203';
const ids = Object.keys(ACTIONS);
const state = { touch:false, row:0, capture:false, note:'' };
const click = (x,y,w,h) => input.mouse.pressed && input.mouse.x >= x && input.mouse.x < x+w && input.mouse.y >= y && input.mouse.y < y+h;
export function openControls() { Object.assign(state,{touch:input.touch,row:0,capture:false,note:''}); editor.active=state.touch; }
export function closeControls() { editor.active=false; editor.drag=null; }
export function updateControls() {
  if (state.capture) {
    if (keyHit('Escape')) { state.capture=false; return; }
    const code=input.hit.values().next().value;
    if (code) {
      if (bindKey(ids[state.row],code)) { state.capture=false; state.note=''; }
      else state.note='THIS KEY IS USED BY THE MENU';
    }
    return;
  }
  if (keyHit('Escape') || click(182,2,32,13)) { closeControls(); return 'back'; }
  if (keyHit('Tab') || click(67,2,70,13)) { state.touch=!state.touch; editor.active=state.touch; editor.drag=null; state.note=''; return; }
  if (keyHit('Backspace') || click(139,2,40,13)) {
    if (state.touch) { resetLayout(); placeButtons(); } else resetKeys();
    state.note='DEFAULTS RESTORED'; return;
  }
  if (state.touch) return;
  if (keyHit('ArrowDown','ArrowUp')) state.row=(state.row+(keyHit('ArrowDown')?1:9))%10;
  if (keyHit('ArrowRight','ArrowLeft')) state.row=(state.row+5)%10;
  for (let i=0;i<ids.length;i++) if (click(18+Math.floor(i/5)*144,49+(i%5)*16,140,14)) { state.row=i; state.capture=true; state.note=''; return; }
  if (keyHit('Enter','Space')) { state.capture=true; state.note=''; }
}
function button(x,w,label) { rect(x,2,w,13,P.ink3); text(label,x+w/2,6,P.paper,1,'c'); }
export function drawControls() {
  fillScreen(P.ink0);
  if (state.touch) {
    for (let x=-SX;x<W+SX;x+=16) rect(x,16,1,H-16,P.ink1);
    for (let y=16;y<H;y+=16) rect(-SX,y,FW,1,P.ink1);
    text('DRAG A CONTROL TO PLACE IT',W/2,31,P.dust,1,'c');
    for (const b of [{id:'stick',x:STICK_X,y:STICK_Y,r:STICK_R},...TOUCH_BTNS]) {
      const col=b.id===editor.drag?P.paper:P.ember2;
      ring(b.x,b.y,b.r,2,col); textO(b.id==='stick'?'MOVE':b.id==='attack'?'ATK':b.id.toUpperCase(),b.x,b.y-2,col,1,'c');
    }
  } else {
    text('KEY BINDINGS',W/2,24,P.ember2,2,'c');
    ids.forEach((id,i) => {
      const x=18+Math.floor(i/5)*144,y=49+(i%5)*16,on=i===state.row;
      rect(x,y,140,14,on?P.ink3:P.ink1);
      if(on) rect(x,y,2,14,P.ember);
      text(ACTIONS[id][0],x+5,y+4,P.bone);
      text(on&&state.capture?'PRESS KEY':keyLabel(id),x+135,y+4,keys[id].length?P.ember2:P.blood,1,'r');
    });
    const missing=ids.filter(id=>!keys[id].length);
    if(missing.length) textO(missing.length+' UNASSIGNED  '+missing.map(id=>ACTIONS[id][0]).join(', ').slice(0,49),W/2,138,P.ember2,1,'c');
    text(state.capture?'PRESS A NEW KEY OR ESC TO CANCEL':'SELECT AN ACTION AND PRESS ENTER TO CHANGE ITS KEY',W/2,151,P.bone,1,'c');
  }
  button(67,70,state.touch?'KEYBOARD':'TOUCH LAYOUT'); button(139,40,'RESTORE'); button(182,32,'DONE');
  if(state.note) textO(state.note,W/2,166,P.gold,1,'c');
}
