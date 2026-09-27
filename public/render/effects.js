export class Effects{
 constructor(){this.pool=Array.from({length:350},()=>({life:0}));this.texts=[];this.hits=new Map();this.shake=0;}
 emit(x,y,color,count=12){for(let i=0;i<count;i++){const p=this.pool.find(p=>p.life<=0);if(!p)break;Object.assign(p,{x,y,vx:(Math.random()-.5)*100,vy:-20-Math.random()*85,life:.5+Math.random()*.4,max:1,color,size:2+Math.random()*3});}}
 text(x,y,text,color='#ffe3a3'){this.texts.push({x,y,text,color,life:1.3});}
 update(dt){for(const p of this.pool)if(p.life>0){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=140*dt;}for(const p of this.texts){p.life-=dt;p.y-=dt*22;}this.texts=this.texts.filter(p=>p.life>0);this.shake=Math.max(0,this.shake-dt*25);}
 draw(ctx){for(const p of this.pool)if(p.life>0){ctx.globalAlpha=Math.min(1,p.life*2);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);}ctx.textAlign='center';ctx.font='bold 17px Georgia';for(const p of this.texts){ctx.globalAlpha=Math.min(1,p.life*2);ctx.strokeStyle='#16372d';ctx.lineWidth=3;ctx.strokeText(p.text,p.x,p.y);ctx.fillStyle=p.color;ctx.fillText(p.text,p.x,p.y);}ctx.globalAlpha=1;}
}
export class Audio{
 constructor(){this.enabled=true;this.ctx=null;}
 unlock(){if(!this.ctx)this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.ctx.resume();}
 play(kind){if(!this.ctx||!this.enabled)return;const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);const now=c.currentTime,base={gather:180,hit:90,loot:740,build:320,level:880,heal:550,slam:60}[kind]||240;o.type=['hit','gather','slam'].includes(kind)?'triangle':'sine';o.frequency.setValueAtTime(base,now);o.frequency.exponentialRampToValueAtTime(base*(kind==='loot'?1.6:.5),now+.13);g.gain.setValueAtTime(.045,now);g.gain.exponentialRampToValueAtTime(.001,now+.2);o.start(now);o.stop(now+.22);}
}
