const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],r=(a,b)=>a+Math.random()*(b-a);
const st=$('#stage'),fx=$('#fx'),pill=$('#music'),cta=$('#cta');
// background particles
for(let i=0;i<0;i++){const s=document.createElement('i');s.className='spark';const a=r(0,6.28),k=Math.sqrt(Math.random());
 s.style.left=(20+Math.cos(a)*k*15)+'%';s.style.top=(52+Math.sin(a)*k*34)+'%';s.style.setProperty('--d',r(1.6,3.4)+'s');s.style.setProperty('--s',r(3.4,7)+'s');fx.appendChild(s)}
for(let i=0;i<12;i++){const n=document.createElement('span');n.className='note';n.textContent='♪♫♩♬'[i%4];n.style.left=r(15,26)+'%';
 n.style.setProperty('--x',r(-8,14)+'vw');n.style.setProperty('--d',r(5,8)+'s');n.style.setProperty('--s',(4.4+i*.7)+'s');fx.appendChild(n)}
// oud synth (Karplus-Strong plucks in maqam Hijaz)
let ctx,master,bus,tapBus,on=false,tN=0,idx=5;const cache={},sc=[0,1,4,5,7,8,10,12,13,16,17,19,20],base=146.83,fr=i=>base*Math.pow(2,sc[i]/12);
function mk(f){const sr=ctx.sampleRate,len=sr*3|0,b=ctx.createBuffer(1,len,sr),d=b.getChannelData(0);
 [1,1.0025].forEach(m=>{const n=Math.round(sr/(f*m)),l=new Float32Array(n);for(let i=0;i<n;i++)l[i]=Math.random()*2-1;
  let p=0;for(let i=0;i<len;i++){const a=l[p];l[p]=(a+l[(p+1)%n])*.4985;d[i]+=a*.5;p=(p+1)%n}});return b}
function pluck(t,f,v,out=bus){const k=f.toFixed(1),s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=cache[k]||(cache[k]=mk(f));
 g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+2.8);s.connect(g);g.connect(out);s.start(t)}
function phrase(){let t=tN;const n=5+(Math.random()*5|0);idx=4+(Math.random()*5|0);pluck(t,base/2,.5);
 for(let k=0;k<n;k++){const last=k==n-1;idx=last?(Math.random()<.2?4:0):Math.max(0,Math.min(12,idx+Math.round(Math.random()*3-1.7)));
  if(!last&&Math.random()<.3){pluck(t,fr(Math.min(12,idx+1)),.3);t+=.13}
  const d=last?2:[.42,.42,.62,.9][Math.random()*4|0];pluck(t,fr(idx),.55);
  if(d>=.9&&!last)for(let j=1;j<5;j++)pluck(t+j*.09,fr(idx),.28);t+=d}
 tN=t+1.2+Math.random()*1.8}
function startAudio(){try{ctx=new(window.AudioContext||window.webkitAudioContext)();ctx.resume();master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);
 bus=ctx.createBiquadFilter();bus.type='lowpass';bus.frequency.value=3600;const dry=ctx.createGain();dry.gain.value=.8;bus.connect(dry);dry.connect(master);
 const cv=ctx.createConvolver(),len=ctx.sampleRate*2.8|0,ir=ctx.createBuffer(2,len,ctx.sampleRate);
 for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.5)}
 cv.buffer=ir;const w=ctx.createGain();w.gain.value=.35;bus.connect(cv);cv.connect(w);w.connect(master);
 // separate path for menu taps so they sound even when the background music is switched off
 tapBus=ctx.createBiquadFilter();tapBus.type='lowpass';tapBus.frequency.value=4200;const td=ctx.createGain();td.gain.value=1;tapBus.connect(td);td.connect(ctx.destination);
 const tc=ctx.createConvolver(),tw=ctx.createGain();tc.buffer=ir;tw.gain.value=.3;tapBus.connect(tc);tc.connect(tw);tw.connect(ctx.destination);
 tN=ctx.currentTime+.8;setInterval(()=>{while(tN<ctx.currentTime+4)phrase()},800);setMusic(true);ctx.onstatechange=ui;unlock()}catch(e){console.warn(e)}}
function ui(){const run=ctx&&ctx.state=='running';pill.classList.toggle('on',on&&run);pill.setAttribute('aria-pressed',!!(on&&run));$('#hint').style.opacity=(ctx&&!run&&on)?1:0}
function setMusic(v){on=v;if(master)master.gain.setTargetAtTime(v?.9:0,ctx.currentTime,.4);ui()}
function unlock(){const E=['pointerdown','touchend','keydown','click'],f=()=>{if(ctx&&ctx.state!='running')ctx.resume().then(()=>{if(ctx.state=='running')E.forEach(e=>removeEventListener(e,f,true))})};E.forEach(e=>addEventListener(e,f,true))}
pill.onclick=()=>{if(!ctx)startAudio();else if(ctx.state!='running'){ctx.resume();setMusic(true)}else setMusic(!on)};
// enter
let entered=false;
function enter(fromPill){if(entered)return;entered=true;st.classList.add('play');if(!ctx)startAudio();
 }
cta.onclick=()=>go('menu');addEventListener('load',()=>setTimeout(enter,500));
function go(id){document.getElementById(id).scrollIntoView({behavior:'smooth'})}
$$('[data-go]').forEach(a=>a.onclick=e=>{e.preventDefault();go(a.dataset.go)});$('#bag').onclick=()=>go('menu');
// menu: categories, illustrated items, and every tap plays that item's own short oud phrase
const CATS=[
 {name:'Coffee',icon:'<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8.5 3c0 1.5 1.5 1.5 1.5 3M12 3c0 1.5 1.5 1.5 1.5 3"/>',items:[
  ['Espresso','A short, intense shot under a hazelnut crema.',3.5,{k:'cup',c1:'#2a1408',c2:'#7a3f17',art:'crema',small:1}],
  ['Americano','Espresso lengthened with hot water, clean and bold.',4,{k:'cup',c1:'#1c0d05',c2:'#4a2410',art:'none'}],
  ['Cappuccino','Rich espresso, steamed milk, and a silky foam.',4.5,{k:'cup',c1:'#6b3a18',c2:'#b77a45',art:'heart'}],
  ['Latte','Smooth espresso under a deep layer of steamed milk.',5,{k:'cup',c1:'#8a5328',c2:'#c99460',art:'leaf'}],
  ['Spanish Latte','Condensed milk, espresso and velvety milk.',5.5,{k:'cup',c1:'#9b6334',c2:'#d4a873',art:'heart'}],
  ['Mocha','Espresso, dark chocolate and steamed milk.',5.5,{k:'cup',c1:'#3d1d0c',c2:'#7a4220',art:'dust'}],
  ['Caramel Latte','A latte finished with a ribbon of house caramel.',5.5,{k:'cup',c1:'#8d5526',c2:'#cf9a5c',art:'drizzle'}],
  ['Qahwa Arabiyya','Light-roast Arabic coffee with cardamom, poured from the dallah.',4,{k:'finjan',c1:'#8a5a1c',c2:'#d0a352'}],
  ['Turkish Coffee','Finely ground, slow-simmered in a copper cezve.',4,{k:'cup',c1:'#24110a',c2:'#5b3519',art:'crema',small:1}],
  ['Cardamom Latte','Silky steamed milk, espresso and fresh-ground cardamom.',6,{k:'cup',c1:'#8a5a2c',c2:'#c9a16a',art:'leaf',spice:1}]]},
 {name:'Tea',icon:'<path d="M6 10h10v3.5a5 5 0 0 1-5 5h0a5 5 0 0 1-5-5z"/><path d="M16 11.5l3.5-2.5v1.5L16 15"/><path d="M6 11.5H4.8a1.8 1.8 0 0 0 0 3.6H6.4"/><path d="M8.5 10V8.2h5V10M11 8.2V6.5"/>',items:[
  ['Karak Chai','Black tea simmered with milk, cardamom and saffron.',3.5,{k:'glass',c1:'#a8652a',c2:'#d9a066'}],
  ['Moroccan Mint','Green tea poured high over fresh mint leaves.',4,{k:'glass',c1:'#8a6a1a',c2:'#c9a43c',mint:1}],
  ['Saffron Tea','Golden saffron threads steeped with a hint of rose.',4.5,{k:'glass',c1:'#b8561a',c2:'#f0a040',saffron:1}],
  ['Chamomile','Whole chamomile flowers with wild honey.',4,{k:'glass',c1:'#b99a3a',c2:'#ecd27a',flower:1}]]},
 {name:'Cold Drinks',icon:'<path d="M6 7h12l-1.6 13H7.6z"/><path d="M13 7l2-4.5h3"/><path d="M6.6 11.5h10.8"/>',items:[
  ['Rose & Saffron Cold Brew','Twelve-hour cold brew with rose water and a thread of saffron.',7,{k:'iced',c1:'#3a1a0b',c2:'#6b3a18',saffron:1}],
  ['Iced Spanish Latte','Condensed milk, espresso and cold milk over ice.',6,{k:'iced',c1:'#a87444',c2:'#d9b58a'}],
  ['Lemon Mint','Fresh lemon blended with mint and crushed ice.',5,{k:'iced',c1:'#9fbf4a',c2:'#d7ea8a',mint:1}],
  ['Jallab','Grape molasses and rose water with pine nuts.',5.5,{k:'iced',c1:'#4a1410',c2:'#8a2c1c',nuts:1}]]},
 {name:'Desserts',icon:'<path d="M3.5 20h17v-7h-17z"/><path d="M3.5 15c2.8 2 2.8-2 5.7 0s2.8-2 5.6 0 2.9-2 5.7 0"/><path d="M12 13V9.5"/><path d="M12 7.3c.9 0 1.1-1.1 0-2.8-1.1 1.7-.9 2.8 0 2.8z"/>',items:[
  ['Ma’amoul','Semolina cookies filled with dates and pistachio.',5,{k:'plate',p:'maamoul'}],
  ['Baklava Selection','Flaky layers, pistachio and orange blossom syrup.',8,{k:'plate',p:'baklava'}],
  ['Kunafa','Warm cheese kunafa under crisp golden pastry.',8.5,{k:'plate',p:'kunafa'}],
  ['Basbousa','Semolina cake soaked in syrup, topped with almonds.',5,{k:'plate',p:'basbousa'}]]}];

// top-down illustrations drawn as SVG (centred on 50,50)
let gid=0;
const dots=(n,R,col,rad,op)=>{let s='';for(let i=0;i<n;i++){const a=i*2.39996,d=Math.sqrt((i+.5)/n)*R;s+=`<circle cx="${(Math.cos(a)*d).toFixed(1)}" cy="${(Math.sin(a)*d).toFixed(1)}" r="${rad}" fill="${col}" opacity="${op}"/>`}return s};
const mint=(sc=1)=>[[-9,-6,30],[8,-8,-40],[2,9,80]].map(([x,y,r])=>`<g transform="translate(${x*sc} ${y*sc}) rotate(${r})"><ellipse rx="7" ry="3.6" fill="#4f8f3e"/><path d="M-6 0H6" stroke="#2f6326" stroke-width=".7"/></g>`).join('');
const saffron=()=>[[-8,-4,20],[5,6,-35],[9,-7,65],[-3,9,110]].map(([x,y,r])=>`<path transform="translate(${x} ${y}) rotate(${r})" d="M-5 0q2.5-1.6 5 0t5 0" stroke="#c42a14" stroke-width="1.1" fill="none" stroke-linecap="round"/>`).join('');
function latte(o,F){switch(o.art){
 case 'crema':return `<circle r="21" fill="${o.c2}" opacity=".6"/><circle cx="-6" cy="-5" r="5" fill="#c98a4a" opacity=".45"/><circle cx="7" cy="5" r="3" fill="#c98a4a" opacity=".4"/>`+dots(14,18,'#e2b07a',.7,.5);
 case 'heart':return `<circle r="22" fill="${F}" opacity=".16"/><path d="M0 15C-17 4-15-13-4.5-10-1.5-9 0-6.5 0-4.5 0-6.5 1.5-9 4.5-10 15-13 17 4 0 15Z" fill="${F}"/><path d="M0 15V20" stroke="${F}" stroke-width="1.6" stroke-linecap="round"/>`;
 case 'leaf':{let s=`<ellipse rx="15" ry="19" fill="${F}" opacity=".14"/>`;for(let i=0;i<7;i++){const y=13-i*4.2,w=14-i*1.6;s+=`<path d="M${-w} ${y}Q0 ${y+5.5} ${w} ${y}" stroke="${F}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`}
  return s+`<path d="M0-16V19" stroke="${F}" stroke-width="1.3"/>`+(o.spice?dots(12,20,'#3d2a12',.8,.6):'')}
 case 'dust':return `<circle r="22" fill="${F}" opacity=".92"/><circle r="11" fill="#5a2e14" opacity=".3"/>`+dots(46,21,'#4a230e',.9,.75);
 case 'drizzle':return `<circle r="22" fill="${F}" opacity=".88"/><path d="M-16-12 15-8-16-2 15 2-15 8 13 12" stroke="#b86c22" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
 default:return `<ellipse cx="-7" cy="-8" rx="10" ry="5" fill="#fff" opacity=".07"/>`}}
function pastry(p){switch(p){
 case 'maamoul':return [[-13,-8],[13,-7],[0,13]].map(([x,y])=>`<g transform="translate(${x} ${y})"><circle r="13" fill="url(#p${gid})"/>${Array.from({length:12},(_,i)=>`<path transform="rotate(${i*30})" d="M0-4V-11" stroke="#a8743a" stroke-width="1.2" stroke-linecap="round"/>`).join('')}<circle r="2.5" fill="#b07a40"/></g>`).join('')+dots(10,30,'#7aa648',1,.9);
 case 'baklava':return [[-14,-10],[10,-12],[-12,12],[13,10],[0,0]].map(([x,y])=>`<g transform="translate(${x} ${y}) rotate(45)"><rect x="-8" y="-8" width="16" height="16" rx="1.5" fill="url(#p${gid})" stroke="#8a5a18" stroke-width=".8"/><path d="M-8 0H8M0-8V8" stroke="#a87028" stroke-width=".5" opacity=".7"/><circle r="2.6" fill="#6a9a3a"/></g>`).join('');
 case 'kunafa':{let s=`<circle r="28" fill="url(#p${gid})"/>`;for(let i=0;i<60;i++){const a=i*2.39996,d=Math.sqrt((i+.5)/60)*25;s+=`<path transform="translate(${(Math.cos(a)*d).toFixed(1)} ${(Math.sin(a)*d).toFixed(1)}) rotate(${i*47%180})" d="M-3 0q3-2 6 0" stroke="#f7b25c" stroke-width=".8" fill="none" opacity=".8"/>`}
  return s+`<circle r="8" fill="#7aa648" opacity=".9"/>`+dots(8,7,'#b8d47a',1.2,.9)}
 default:return [[-11,-11,-6],[11,-11,4],[-11,11,3],[11,11,-4]].map(([x,y,r])=>`<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-10" y="-10" width="20" height="20" rx="2" fill="url(#p${gid})" stroke="#9a6420" stroke-width=".6"/><ellipse rx="3.4" ry="5.5" transform="rotate(30)" fill="#f3e3c3" stroke="#c9a46a" stroke-width=".5"/></g>`).join('')}}
const PC={maamoul:['#f0d9a8','#c99a5a'],baklava:['#e8b452','#b87a24'],kunafa:['#f08a2a','#b5520e'],basbousa:['#e8b45a','#b97a28']};
function art(o){const u=++gid,F='#f3e7d3',pc=PC[o.p]||['#000','#000'];
 let s=`<svg viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="s${u}" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#f4ead9"/><stop offset=".8" stop-color="#cdb999"/><stop offset="1" stop-color="#8f7b5e"/></radialGradient>
 <radialGradient id="l${u}" cx=".45" cy=".42" r=".65"><stop offset="0" stop-color="${o.c2}"/><stop offset="1" stop-color="${o.c1}"/></radialGradient>
 <radialGradient id="p${u}" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="${pc[0]}"/><stop offset="1" stop-color="${pc[1]}"/></radialGradient></defs>
 <ellipse cx="53" cy="55" rx="44" ry="42" fill="#000" opacity=".35"/><g transform="translate(50 50)">`;
 if(o.k=='cup'||o.k=='finjan'){const S=o.small?38:45,R=o.k=='finjan'?24:o.small?24:31,r=R-4;
  s+=`<circle r="${S}" fill="url(#s${u})"/><circle r="${S-7}" fill="none" stroke="#6e5a3c" stroke-opacity=".3"/>`;
  if(o.k=='cup')s+=`<rect x="${R-5}" y="-5" width="${o.small?13:16}" height="10" rx="5" fill="#e6d7bf" stroke="#b8a383" stroke-width=".6"/>`;
  s+=`<circle r="${R}" fill="#efe4d1" stroke="#c4ae8c" stroke-width=".6"/>`+(o.k=='finjan'?`<circle r="${R-1.6}" fill="none" stroke="#c9a24a" stroke-width="1.6"/>`:'');
  s+=`<circle r="${r}" fill="url(#l${u})"/>`+(o.k=='finjan'?dots(9,r-6,'#5b4320',.8,.5):`<g transform="scale(${(r/26).toFixed(3)})">${latte(o,F)}</g>`)}
 else if(o.k=='glass'){s+=`<circle r="40" fill="url(#s${u})"/><circle r="36" fill="none" stroke="#c9a24a" stroke-width="1.4"/><circle r="28" fill="#fff" fill-opacity=".14" stroke="#fff" stroke-opacity=".55" stroke-width="1.4"/>
  <circle r="25" fill="url(#l${u})" opacity=".94"/>`+(o.mint?mint():'')+(o.saffron?saffron():'')+(o.flower?[[-8,-6],[8,4],[-2,10]].map(([x,y])=>`<g transform="translate(${x} ${y})">${Array.from({length:10},(_,i)=>`<ellipse transform="rotate(${i*36}) translate(0 -4)" rx="1.3" ry="3" fill="#fbf6e8"/>`).join('')}<circle r="2.4" fill="#f2c230"/></g>`).join(''):'')+
  `<path d="M-19-12A23 23 0 0 1-8-21" stroke="#fff" stroke-opacity=".5" stroke-width="2" fill="none" stroke-linecap="round"/>`}
 else if(o.k=='iced'){s+=`<circle r="38" fill="#fff" fill-opacity=".1" stroke="#fff" stroke-opacity=".5" stroke-width="1.4"/><circle r="35" fill="url(#l${u})"/>`+
  [[-12,-10,15],[10,-14,-20],[-6,12,40],[14,8,5]].map(([x,y,r])=>`<rect transform="translate(${x} ${y}) rotate(${r})" x="-8" y="-8" width="16" height="16" rx="3" fill="#fff" fill-opacity=".28" stroke="#fff" stroke-opacity=".55" stroke-width=".8"/>`).join('')+
  (o.mint?mint(1.3):'')+(o.saffron?saffron():'')+(o.nuts?dots(14,24,'#f3e2bf',1.6,.95):'')+
  `<circle cx="16" cy="-18" r="4.5" fill="#ead6ae" stroke="#a98450" stroke-width=".8"/><circle cx="16" cy="-18" r="2.4" fill="#3a2410"/><path d="M-29-15A33 33 0 0 1-14-30" stroke="#fff" stroke-opacity=".45" stroke-width="2" fill="none" stroke-linecap="round"/>`}
 else s+=`<circle r="45" fill="url(#s${u})"/><circle r="36" fill="none" stroke="#6e5a3c" stroke-opacity=".28"/>`+pastry(o.p);
 return s+'</g></svg>'}

// a short rising phrase in maqam Hijaz, different for every item; ducks the background music under it
function chime(ci,ii){if(!ctx)startAudio();if(!ctx)return;ctx.resume();
 const t=ctx.currentTime+.04,s=1+(ii*2+ci*3)%7,shape=[[0,1,2,4,2],[0,2,1,3,4],[4,3,2,1,0],[0,1,3,2,1]][(ii+ci)%4];
 pluck(t,fr(0)/2,.35,tapBus);shape.forEach((d,k)=>pluck(t+k*.13,fr(Math.min(12,s+d)),.5,tapBus));
 const end=t+shape.length*.13,last=fr(Math.min(12,s+shape[shape.length-1]));for(let j=0;j<5;j++)pluck(end+j*.085,last,.24-.035*j,tapBus);
 if(on&&master){master.gain.setTargetAtTime(.3,ctx.currentTime,.08);master.gain.setTargetAtTime(.9,end+1,.6)}}

let cat=0,sel=0,n=0;const cats=$('#cats'),list=$('#items'),price=p=>'$'+p.toFixed(2);
cats.innerHTML=CATS.map((c,i)=>`<button role="tab" data-c="${i}" aria-selected="${i==0}"><span class="ci"><svg viewBox="0 0 24 24">${c.icon}</svg></span>${c.name}</button>`).join('');
function showCat(i){cat=i;sel=0;$$('#cats button').forEach((b,k)=>b.setAttribute('aria-selected',k==i));$('#catt').textContent=CATS[i].name;
 list.innerHTML=CATS[i].items.map((m,k)=>`<li><button class="it" role="option" data-i="${k}" aria-selected="${k==0}"><span class="th">${art(m[3])}</span><span class="nm">${m[0]}<small>${price(m[2])}</small><span class="ds">${m[1]}</span></span><i>›</i></button></li>`).join('');
 list.scrollTop=0;feature()}
function feature(){const m=CATS[cat].items[sel],f=$('#feat');f.classList.remove('in');void f.offsetWidth;
 $('#fart').innerHTML=art(m[3]);$('#fname').textContent=m[0];$('#fdesc').textContent=m[1];$('#fprice').textContent=price(m[2]);f.classList.add('in')}
function noteFrom(b){const s=document.createElement('span');s.className='fnote';s.textContent='♪♫♩♬'[Math.random()*4|0];b.appendChild(s);setTimeout(()=>s.remove(),1400)}
cats.onclick=e=>{const b=e.target.closest('button');if(b)showCat(+b.dataset.c)};
list.onclick=e=>{const b=e.target.closest('.it');if(!b)return;sel=+b.dataset.i;$$('#items .it').forEach(x=>x.setAttribute('aria-selected',x==b));feature();chime(cat,sel);noteFrom(b)};
const addc=$('#addc'),addHTML=addc.innerHTML;
addc.onclick=()=>{n++;const c=$('#cnt');c.textContent=n;c.style.display='block';addc.classList.add('ok');addc.innerHTML=`Added ${CATS[cat].items[sel][0]} ✓`;
 clearTimeout(addc.t);addc.t=setTimeout(()=>{addc.classList.remove('ok');addc.innerHTML=addHTML},1600)};
showCat(0);
// gallery photos load only when the gallery is about to scroll into view
const gal=$('.gal');if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){gal.classList.add('vis');io.disconnect()}},{rootMargin:'600px'});io.observe(gal)}else gal.classList.add('vis');
$('#f').onsubmit=e=>{e.preventDefault();$('#ok').textContent='Thank you! We’ll get back to you soon.';e.target.reset()};
// header + scroll spy
const ids=['home','menu','about','gallery','contact'];
function sp(){$('#hd').classList.toggle('sc',scrollY>40);let cur='home';ids.forEach(i=>{if(document.getElementById(i).getBoundingClientRect().top<innerHeight*.4)cur=i});
 $$('nav a').forEach(a=>a.classList.toggle('on',a.dataset.go==cur))}
addEventListener('scroll',sp,{passive:true});sp();
