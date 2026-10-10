/* Museum Ruang Rupa - Tahap 1 (v1.05). Dimuat SETELAH skrip utama di index.html.
   Memakai: $, gs, pesan, POS, pindah. Menyediakan: bangunMuseum(). */
const WARNA = { Impresionisme:'#8fb3a3', Kubisme:'#b08a5a', Ekspresionisme:'#b3412f', Surealisme:'#6b5b95', Nusantara:'#c9902f' };
const RUANG_TAHAP1 = 'Impresionisme';           // Tahap 1: satu ruang saja
let koleksi = [], bingkaiAktif = -1, daftarBingkai = [], dekatPintu = false, dariAtas = false, simpanPos = null;
const kurangiGerak = matchMedia('(prefers-reduced-motion: reduce)').matches;
POS.A = [0, 0, 16]; POS.C = [-5, 0, -5];   // Studio AI sekarang di sudut barat aula (di dalam gedung)

/* ---------- UI: panel info + layar fade (HTML, bukan teks 3D) ---------- */
document.head.insertAdjacentHTML('beforeend', `<style>
#fade{position:fixed;inset:0;background:#1d1812;opacity:0;pointer-events:none;transition:opacity .5s;z-index:30}
#info{right:10px;bottom:10px;width:min(380px,94vw);max-height:70vh;overflow:auto;display:none;background:#fbf8f1}
#info h3{margin:0 0 2px;font:700 20px/1.2 Georgia,serif}
#info .meta{color:#5b5346;font-size:13px;margin:0 0 8px}
#info h4{margin:10px 0 2px;font-size:14px}
#info p{margin:0}
#info .aksi{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}
#info small{color:#6b6458;display:block;margin-top:8px}
</style>`);
document.body.insertAdjacentHTML('beforeend', `<div id="fade"></div>
<div id="info" class="ui" role="dialog" aria-labelledby="iJudul"><h3 id="iJudul"></h3><p class="meta" id="iMeta"></p>
<h4>Tentang karya</h4><p id="iJelas"></p><h4>Tahukah kamu?</h4><p id="iFakta"></p><h4>Semangat hari ini</h4><p id="iMot"></p>
<small id="iSumber"></small>
<div class="aksi"><button id="bKerjakan">Kerjakan</button><button id="bNext" class="alt">Lukisan berikutnya</button><button id="bKembali" class="alt">Kembali</button></div></div>`);
$('hud').insertAdjacentHTML('beforeend', '<button id="bMasuk" class="alt">Masuk gedung</button><button id="bAtas" class="alt">Lihat dari atas</button>');
document.querySelector('[data-zona="A"]').textContent = 'Museum';

/* ---------- Pembantu pembuat entitas ---------- */
function el(parent, tag, at, kelas){
  const e = document.createElement(tag); for(const k in at) e.setAttribute(k, at[k]);
  if(kelas) e.classList.add(kelas); parent.append(e); return e;
}
const kotak = (p,x,y,z,w,h,d,c,at={}) => el(p,'a-box',Object.assign({position:`${x} ${y} ${z}`,width:w,height:h,depth:d,color:c},at));
const teks = (p,v,x,y,z,w,c='#222',ry=0) => el(p,'a-text',{value:v,align:'center',width:w,position:`${x} ${y} ${z}`,rotation:`0 ${ry} 0`,color:c,side:'double'});

/* ---------- Gedung: plaza, fasad, pintu, aula ---------- */
function bangunGedung(g){
  const batu = '#d8cdb8', gelap = '#4a3f33';
  kotak(g,0,0.02,12,40,0.04,22,'#bfb5a0',{class:'klik lantai'});                          // plaza
  [0.2,0.6,1.0].forEach((t,i)=>kotak(g,0,t/2+0.0,3.2-i*0.9+0.9,12-i*1.2,t,1.6,batu)); // tangga
  // dinding depan (celah pintu di tengah, lebar 3, tinggi 4)
  kotak(g,-6.25,4,0,7.5,8,0.6,batu); kotak(g,6.25,4,0,7.5,8,0.6,batu); kotak(g,0,6,0,5,4,0.6,batu);
  kotak(g,-10,4,-13,0.6,8,26,batu); kotak(g,10,4,-13,0.6,8,26,batu); kotak(g,0,4,-26,20.6,8,0.6,batu); // sisi + belakang
  kotak(g,0,8.3,-12,22,0.6,28,gelap);                               // atap
  kotak(g,0,0.02,-13,20,0.04,26,'#e9e1d0',{class:'klik lantai'});                         // lantai dalam
  for(let i=-4;i<=4;i+=2){ if(i===0) continue; const c=el(g,'a-cylinder',{position:`${i*1.9} 4 1.6`,radius:0.4,height:8,color:'#efe8d9'}); }
  kotak(g,0,10,0.4,10,1.6,0.3,'#2b2118'); teks(g,'RUANG RUPA',0,10,0.6,12,'#f3e6c8');
  kotak(g,0,6.3,-0.1,3,0.4,0.4,gelap);
  // pintu dua daun; tiap daun bergeser ke samping saat terbuka
  const pk = el(g,'a-box',{id:'daunK',position:'-0.75 2 0.1',width:1.5,height:4,depth:0.2,color:'#6d4a2b'});
  const pn = el(g,'a-box',{id:'daunN',position:'0.75 2 0.1',width:1.5,height:4,depth:0.2,color:'#6d4a2b'});
  // dinding aula/ruang: sekat antara aula (z 0..-12) dan Ruang Maestro (z -12..-26), celah pintu tengah
  kotak(g,-5.75,4,-12,8.5,8,0.4,batu); kotak(g,5.75,4,-12,8.5,8,0.4,batu); kotak(g,0,6,-12,3,4,0.4,batu);
  // aula: papan denah + penunjuk
  kotak(g,-6.5,2.2,-2.5,4.4,2.8,0.2,gelap); teks(g,'DENAH',-6.5,3.3,-2.38,4); 
  teks(g,'Utara: Ruang Maestro (Impresionisme)\nBarat: Studio AI\nTimur: Galeri Bersama',-6.5,2.2,-2.38,3.2);
  [['Studio AI',-9.6,'C',90],['Galeri Bersama',9.6,'D',-90]].forEach(([n,x,z,ry])=>{
    const p = el(g,'a-box',{position:`${x} 2 -6`,width:0.3,height:2.4,depth:3,color:'#8a6a3c',class:'klik'});
    el(g,'a-text',{value:n,align:'center',width:5,position:`${x+(x<0?0.3:-0.3)} 2 -6`,rotation:`0 ${ry} 0`,color:'#fff'});
    p.addEventListener('click',()=>pindah(z));
  });
  kotak(g,-6.5,0.05,-6,5,0.04,6,'#8a6a3c');                        // karpet area Studio AI
  kotak(g,0,0.06,-7,0.6,0.04,9,'#d9a21b');                           // jalur emas ke pintu Ruang Maestro
  kotak(g,-1.6,2,-12,0.2,4,0.5,gelap); kotak(g,1.6,2,-12,0.2,4,0.5,gelap); // kusen pintu
  kotak(g,0,5.6,-11.7,6.5,1.4,0.2,gelap); teks(g,'RUANG MAESTRO',0,5.8,-11.55,9,'#f3e6c8'); teks(g,'Impresionisme',0,5.3,-11.55,5,'#f3e6c8');
  // lampu hangat palsu (tanpa bayangan)
  el(g,'a-light',{type:'point',color:'#ffe2b0',intensity:0.5,distance:20,position:'0 6 -6'});
  el(g,'a-light',{type:'point',color:'#fff4dc',intensity:0.6,distance:24,position:'0 6 -19'});
  return {pk,pn};
}
let daun = null;
function bukaPintu(buka){
  const t = kurangiGerak ? 0 : 600, ke = buka ? 2.6 : 0.75;
  [['daunK',-1],['daunN',1]].forEach(([id,s])=>{ const d=$(id); if(!d) return;
    d.removeAttribute('animation'); d.setAttribute('animation',{property:'position',to:`${s*ke} 2 0.1`,dur:t}); });
}
function fadeKe(fn){ const f=$('fade'); f.style.opacity=1; setTimeout(()=>{ fn(); f.style.opacity=0; }, kurangiGerak?0:500); }
function masukGedung(){ bukaPintu(true); fadeKe(()=>{ $('rig').setAttribute('position','0 0 -4'); }); }
$('bMasuk').onclick = masukGedung;
setInterval(()=>{ if(zonaAktif!=='A'||!token) return; const p=$('rig').object3D.position;
  const d = p.z<12 && p.z>-1.5 && Math.abs(p.x)<4; if(d!==dekatPintu){ dekatPintu=d; bukaPintu(d||p.z<=0); } }, 250);

/* ---------- Ruang Maestro ---------- */
function bingkaiLukisan(g, k, i, x, z, ry, yaw){
  const kosong = !k, w = k && WARNA[k.aliran] || '#9a9082';
  const f = el(g,'a-entity',{position:`${x} 2.4 ${z}`,rotation:`0 ${ry} 0`});
  el(f,'a-box',{width:2.9,height:2.3,depth:0.12,color:'#3a2f26'});
  const kanvas = el(f,'a-plane',{width:2.5,height:1.9,position:'0 0 0.07',color:kosong?'#e7e1d3':w,class:'klik',role:'img',
    'aria-label':kosong?'Bingkai kosong':`${k.judul}, ${k.pelukis}`});
  if(k && k.gambar){ const im=el(f,'a-image',{width:2.5,height:1.9,position:'0 0 0.08',src:k.gambar,class:'klik'});
    im.addEventListener('click',()=>buka(i)); im.addEventListener('error',()=>im.remove()); }
  el(f,'a-text',{value:kosong?'Segera hadir':k.judul,align:'center',width:2.3,wrapCount:22,position:'0 0 0.1',color:kosong?'#6b6458':'#fff'});
  el(f,'a-text',{value:String(i+1),align:'center',width:3,position:'0 -1.55 0.05',color:'#444'});
  el(f,'a-box',{width:0.5,height:0.06,depth:0.3,position:'0 1.45 0.2',color:'#fff4d8'});   // lampu sorot (kotak sederhana)
  el(f,'a-text',{id:'tanda'+i,value:'',align:'center',width:4,position:'1.1 1.0 0.12',color:'#ffd54a'}); // tempat centang (Tahap 3)
  if(k) kanvas.addEventListener('click',()=>buka(i));
  daftarBingkai[i] = { x, z, ry, yaw, k };
}
function bangunRuangMaestro(g){
  daftarBingkai = [];
  kotak(g,0,0.03,-19,19,0.04,13,'#f1ede4',{class:'klik lantai'}); teks(g,RUANG_TAHAP1.toUpperCase(),0,6.5,-25.6,6,'#6b6458');
  const data = koleksi.filter(k=>k.ruang===RUANG_TAHAP1).sort((a,b)=>a.urutan-b.urutan).slice(0,8);
  // 4 di dinding barat (menghadap timur), 4 di dinding timur (menghadap barat)
  for(let i=0;i<8;i++){ const barat=i<4, z=-14.5-(i%4)*3.2;
    bingkaiLukisan(g, data[i], i, barat?-9.6:9.6, z, barat?90:-90, barat?Math.PI/2:-Math.PI/2); }
  if(!data.length) pesan('Koleksi masih kosong: semua bingkai bertuliskan "Segera hadir".',6000);
}

/* ---------- Kamera mendekat + panel info ---------- */
function tween(dari, ke, ms, fn){ if(!ms){ fn(ke); return; } const t0=performance.now();
  (function s(t){ const u=Math.min(1,(t-t0)/ms), e=u<0.5?2*u*u:1-Math.pow(-2*u+2,2)/2; fn(dari+(ke-dari)*e); if(u<1) requestAnimationFrame(s); })(t0); }
function arahKamera(yaw, pitch){ const lc=$('cam').components['look-controls']; if(lc){ lc.yawObject.rotation.y=yaw; lc.pitchObject.rotation.x=pitch||0; } }
function buka(i){
  const b = daftarBingkai[i]; if(!b||!b.k) return;
  if(bingkaiAktif<0){ const p=$('rig').object3D.position; simpanPos={x:p.x,z:p.z}; }
  bingkaiAktif = i; const k = b.k, rig = $('rig'), p = rig.object3D.position;
  rig.setAttribute('wasd-controls','enabled:false');
  const tx = b.x + (b.ry===90?4.2:-4.2), tz = b.z, x0=p.x, z0=p.z;
  tween(0,1,kurangiGerak?0:700,u=>{ rig.setAttribute('position',`${x0+(tx-x0)*u} 0 ${z0+(tz-z0)*u}`); if(u===1) arahKamera(b.yaw); });
  $('iJudul').textContent = k.judul;
  $('iMeta').textContent = [k.pelukis,k.tahun,k.aliran].filter(Boolean).join(', ');
  $('iJelas').textContent = k.penjelasan || 'Penjelasan belum diisi.';
  $('iFakta').textContent = k.fakta || '-'; $('iMot').textContent = k.motivasi || '-';
  $('iSumber').textContent = k.contoh ? 'Data contoh: guru perlu memverifikasi sebelum dipakai.' : ('Sumber: '+(k.sumber||'-')+(k.lisensi?' ('+k.lisensi+')':''));
  $('info').style.display='block'; $('bKembali').focus();
}
function tutup(){
  if(bingkaiAktif<0) return; bingkaiAktif=-1; $('info').style.display='none';
  $('rig').setAttribute('wasd-controls','enabled:true'); // kamera dilepas, siswa bebas berjalan lagi
}
$('bKembali').onclick = tutup;
$('bKerjakan').onclick = ()=>pesan('Latihan soal hadir di Tahap 3.');
$('bNext').onclick = ()=>{ let j=bingkaiAktif; for(let n=0;n<8;n++){ j=(j+1)%8; if(daftarBingkai[j]&&daftarBingkai[j].k){ buka(j); return; } } };
addEventListener('keydown',e=>{ if(e.key==='Escape') tutup(); });

/* ---------- Lihat dari atas ---------- */
$('bAtas').onclick = ()=>{
  const rig=$('rig'), p=rig.object3D.position; tutup();
  if(!dariAtas){ simpanPos={x:p.x,z:p.z}; rig.setAttribute('position','0 30 36'); arahKamera(0,-0.75); $('bAtas').textContent='Turun ke plaza'; }
  else { rig.setAttribute('position',`${POS.A[0]} 0 ${POS.A[2]}`); arahKamera(0,0); $('bAtas').textContent='Lihat dari atas'; }
  dariAtas=!dariAtas;
};

/* ---------- Spanduk luar + titik masuk ---------- */
function spanduk(g){
  const ada = koleksi.filter(k=>k.status==='terbit'||true).slice(0,3);
  [-7.5,0,7.5].forEach((x,i)=>{ const k=ada[i], f=el(g,'a-entity',{position:`${x} 5.2 0.5`});
    if(x===0) f.setAttribute('position','0 6 0.45');  // tengah: di atas pintu, di dalam area lintel
    el(f,'a-plane',{width:2.2,height:2.8,color:k&&WARNA[k.aliran]||'#9a9082'});
    el(f,'a-text',{value:k?k.judul:'Segera hadir',align:'center',width:3.6,wrapCount:16,position:'0 0 0.02',color:'#fff'}); });
}

/* ---------- Titik masuk dari index.html ---------- */
async function bangunMuseum(){
  try{ koleksi = await gs('getKoleksi'); }catch(e){ koleksi=[]; pesan('Koleksi belum bisa dimuat: '+e.message,6000); }
  const d=$('dunia'); d.querySelectorAll('.zm').forEach(e=>e.remove());
  const g=document.createElement('a-entity'); g.classList.add('zm'); d.append(g);
  bangunGedung(g); bangunRuangMaestro(g); spanduk(g);
  g.querySelectorAll('.lantai').forEach(f=>f.addEventListener('click',e=>{ if(e.detail&&e.detail.intersection) jalanKe(e.detail.intersection.point); }));
}

/* ---------- v1.05: berjalan lebih natural ---------- */
/* Dinding padat [x1,x2,z1,z2], sudah ditambah jari-jari badan 0.4. Celah pintu tetap bebas. */
const SOLID = [[-10.7,-2.1,-0.7,0.7],[2.1,10.7,-0.7,0.7],[-10.7,-9.3,-26.7,0.7],[9.3,10.7,-26.7,0.7],[-10.7,10.7,-26.7,-25.3],
  [-10.7,-1.1,-12.6,-11.4],[1.1,10.7,-12.6,-11.4],[-9.1,-3.9,-3.0,-2.0]];
const dalamPadat = (x,z)=>SOLID.some(s=>x>s[0]&&x<s[1]&&z>s[2]&&z<s[3]);
let prevPos = null;
(function cekTabrak(){ requestAnimationFrame(cekTabrak);
  if(dariAtas||bingkaiAktif>=0||!token){ prevPos=null; return; }
  const p=$('rig').object3D.position;
  if(prevPos && dalamPadat(p.x,p.z)){            // geser menyusuri dinding, bukan menembusnya
    if(!dalamPadat(prevPos.x,p.z)) p.x=prevPos.x; else if(!dalamPadat(p.x,prevPos.z)) p.z=prevPos.z; else { p.x=prevPos.x; p.z=prevPos.z; } }
  prevPos={x:p.x,z:p.z}; })();

/* Ketuk/klik lantai = berjalan halus ke titik itu */
function jalanKe(pt){
  if(dariAtas||bingkaiAktif>=0) return;
  const rig=$('rig'), p=rig.object3D.position, x0=p.x, z0=p.z, d=Math.hypot(pt.x-x0,pt.z-z0);
  tween(0,1,kurangiGerak?0:Math.min(1800,d*170),u=>rig.setAttribute('position',`${x0+(pt.x-x0)*u} 0 ${z0+(pt.z-z0)*u}`));
}

/* Tombol pintas ke Ruang Maestro + label tombol atas ikut benar saat pindah zona */
const pindahAsli = pindah;
pindah = function(z){ if(dariAtas){ dariAtas=false; $('bAtas').textContent='Lihat dari atas'; } pindahAsli(z); };
$('hud').insertAdjacentHTML('beforeend','<button id="bMaestro" class="alt">Ruang Maestro</button>');
$('bMaestro').onclick=()=>{ bukaPintu(true); fadeKe(()=>{ pindah('A'); $('rig').setAttribute('position','0 0 -14.5'); arahKamera(0,0); }); };
