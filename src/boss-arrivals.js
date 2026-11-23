import { ctx, P, line, rect, px, disc, ring, glow, drawSprite } from './gfx.js?v=200';
import { G, TAU, heroSet } from './world.js?v=200';

export function drawBossArrival(id, x, floor, progress, col) {
  const k = Math.min(1, Math.max(0, progress)), open = Math.sin(k * Math.PI), y = floor - 13;
  ctx.save();
  ctx.globalAlpha = Math.min(1, k * 8, (1 - k) * 9);
  switch (id) {
    case 'warden':
      for (const side of [-1, 1]) {
        const gx = x + side * (5 + 23 * k);
        for (let j = 0; j < 4; j++) { const bx = gx + side * j * 4; rect(bx,y-31,2,42,'#58617b'); px(bx,y-32,P.paper); }
        for (let j=0;j<7;j++) ring(gx+side*j*4,y-11+j*1.5,2,1,col);
      }
      break;
    case 'brood':
      for (let i=0;i<8;i++) {
        const a=i*TAU/8, b=a+TAU/8;
        const tip=j=>[x+Math.cos(a)*j, y+Math.sin(a)*j*0.7];
        line(x,y,...tip(42),col);
        for(const r of [12,27,39]) line(...tip(r),x+Math.cos(b)*r,y+Math.sin(b)*r*0.7,'#aaa69e');
      }
      for (const side of [-1,1]) { const xx=x+side*k*12; line(xx,y-11,xx+side*6,y, P.bone,3); line(xx+side*6,y,xx,y+9,col,2); }
      break;
    case 'colossus':
      for (const side of [-1,1]) {
        const dx=x+side*24, drop=18*Math.abs(Math.sin(k*Math.PI*2));
        rect(dx-5,y-39+drop,10,27,'#536070'); rect(dx-7,y-20+drop,14,5,col);
        for (let j=0;j<6;j++) px(dx+side*j*2,y+5-j*open*2,col);
      }
      rect(x-17,y+6,34,3,'#b96d3f'); glow(x,y+4,col,24,open);
      break;
    case 'king':
    case 'eclipse': {
      const royal=id==='king', r=royal?13:19, sy=y-12;
      disc(x,sy,r+2,'#ffac49'); disc(x+(k-0.5)*r*2,sy,r,'#160e21');
      for(let j=0;j<12;j++){const a=j*TAU/12+k*0.4; line(x+Math.cos(a)*(r+4),sy+Math.sin(a)*(r+4),x+Math.cos(a)*(r+7+6*open),sy+Math.sin(a)*(r+7+6*open),col);}
      if(royal) for(let j=-2;j<=2;j++) line(x+j*5,y+5,x+j*6,y-1-Math.abs(j)*2,col,2);
      break;
    }
    case 'wyrm':
      for(let j=0;j<12;j++){const a=k*7-j*0.34,r=7+j*2.2; const xx=x+Math.cos(a)*r, yy=floor+Math.sin(a)*r*0.55; disc(xx,yy,4-j*0.21,'#452c5e'); line(xx-2,yy-2,xx,yy-5-j%2,col);}
      break;
    case 'herald':
      for(const side of [-1,1]) { const xx=x+side*(31-12*k); line(xx,y-57,xx-side*12,y-33,col,2); line(xx-side*12,y-33,xx-side*4,y-36,P.paper,2); line(xx-side*4,y-36,x,y+5,col,2); }
      break;
    case 'mirror': {
      const spr=heroSet().idles[Math.floor(k*20)%16];
      for(const side of [-1,1]){const xx=x+side*(37-32*k); drawSprite(spr,xx-spr.w/2,floor-spr.h,side<0,'#826d9b'); line(xx-7,y+11,xx+4,y-32,col);}
      break;
    }
    case 'clock':
      for(let j=0;j<12;j++){const a=j*TAU/12;line(x+Math.cos(a)*22,y+Math.sin(a)*22,x+Math.cos(a)*25,y+Math.sin(a)*25,col,2);}
      for(const [speed,len] of [[9,20],[-3,14]]) line(x,y,x+Math.cos(k*speed)*len,y+Math.sin(k*speed)*len,P.bone,2);
      break;
    case 'nox':
      for(let j=-17;j<=17;j++){const h=Math.sin((j+17)*Math.PI/34)*open*12; rect(x+j*1.6,y-h,2,Math.max(1,2*h),'#392449'); px(x+j*1.6,y-h,col); px(x+j*1.6,y+h,col);}
      rect(x-1,y-open*9,3,open*18,P.paper);
      break;
  }
  ctx.restore();
}
