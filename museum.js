/* Ruang Rupa v2.07 - Museum 3D. Dimuat SETELAH skrip utama di index.html.
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
  kotak(g,0,10,0.4,10,1.6,0.3,'#2b2118'); teksTimbul(g,'RUANG RUPA',0,10,0.62,18,'#f3e6c8');
  kotak(g,0,6.3,-0.1,3,0.4,0.4,gelap);
  // pintu dua daun; tiap daun bergeser ke samping saat terbuka
  const pk = el(g,'a-box',{id:'daunK',position:'-0.75 2 0.1',width:1.5,height:4,depth:0.2,color:'#6d4a2b'});
  const pn = el(g,'a-box',{id:'daunN',position:'0.75 2 0.1',width:1.5,height:4,depth:0.2,color:'#6d4a2b'});
  // dinding aula/ruang: sekat antara aula (z 0..-12) dan Ruang Maestro (z -12..-26), celah pintu tengah
  kotak(g,-5.75,4,-12,8.5,8,0.4,batu); kotak(g,5.75,4,-12,8.5,8,0.4,batu); kotak(g,0,6,-12,3,4,0.4,batu);
  // aula: papan denah + penunjuk
  // papan denah berdiri di atas dua tiang berkaki; tulisan di KEDUA sisi supaya tidak terbalik dari arah mana pun
  kotak(g,-6.5,2.2,-2.5,4.4,2.8,0.2,gelap);
  kotak(g,-8.3,1.1,-2.5,0.16,2.2,0.16,gelap); kotak(g,-4.7,1.1,-2.5,0.16,2.2,0.16,gelap);
  kotak(g,-8.3,0.05,-2.5,0.8,0.1,0.8,gelap); kotak(g,-4.7,0.05,-2.5,0.8,0.1,0.8,gelap);
  [[-2.38,0],[-2.62,180]].forEach(([zz,ry])=>{ teksTimbul(g,'DENAH',-6.5,3.3,zz,8,'#f3e6c8',ry);
    teks(g,'Utara: Museum KEUN\nBarat: Studio AI\nTimur: Galeri Bersama',-6.5,2.2,zz,6,'#f3e6c8',ry); });

  [['Studio AI',-9.6,'C',90],['Galeri Bersama',9.6,'D',-90]].forEach(([n,x,z,ry])=>{
    const p = el(g,'a-box',{position:`${x} 2 -6`,width:0.3,height:2.4,depth:3,color:'#8a6a3c',class:'klik'});
    el(g,'a-text',{value:n,align:'center',width:9,position:`${x+(x<0?0.3:-0.3)} 2 -6`,rotation:`0 ${ry} 0`,color:'#fff'});
    p.addEventListener('click',()=>pindah(z));
  });
  kotak(g,-6.5,0.05,-6,5,0.04,6,'#8a6a3c');                        // karpet area Studio AI
  kotak(g,0,0.06,-7,0.6,0.04,9,'#d9a21b');                           // jalur emas ke pintu Ruang Maestro
  kotak(g,-1.6,2,-12,0.2,4,0.5,gelap); kotak(g,1.6,2,-12,0.2,4,0.5,gelap); // kusen pintu
  kotak(g,0,5.6,-11.7,6.5,1.4,0.2,gelap); teksTimbul(g,'MUSEUM KEUN',0,5.9,-11.55,20,'#f3e6c8'); teks(g,'Kurator : Diah Ayu Kurniawati',0,5.2,-11.55,8,'#f3e6c8');
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
function masukGedung(){ bukaPintu(true); fadeKe(()=>{ batalJalan(); $('rig').setAttribute('position','0 0 -4'); }); }
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
    im.addEventListener('click',()=>{ if(klikSah()) buka(i); }); im.addEventListener('error',()=>im.remove()); }
  if(kosong) el(f,'a-text',{value:'Segera hadir',align:'center',width:2.4,wrapCount:14,position:'0 0 0.1',color:'#6b6458'});
  el(f,'a-box',{width:3.1,height:0.62,depth:0.06,position:'0 -1.62 0.06',color:'#2b2118'});                       // papan nama di bawah lukisan
  teks(f,'No. '+(i+1)+(kosong?'  Segera hadir':'  '+k.judul),0,-1.51,0.1,3.4,'#f3e6c8');
  if(!kosong) teks(f,[k.pelukis,k.tahun].filter(Boolean).join(', '),0,-1.74,0.1,3.0,'#d9c9a3');
  el(f,'a-box',{width:0.06,height:0.06,depth:0.35,position:'0 1.3 0.2',color:'#2b2118'});                         // lampu sorot lukisan: lengan + kap + cahaya palsu (ringan)
  el(f,'a-cone',{position:'0 1.3 0.38','radius-bottom':0.16,'radius-top':0.05,height:0.2,rotation:'-35 0 0',color:'#d9a21b'});
  el(f,'a-plane',{width:3.4,height:3,position:'0 0.2 0.09',material:{src:cahaya(),transparent:true,blending:'additive',opacity:0.5,depthWrite:false,shader:'flat'}});
  el(f,'a-text',{id:'tanda'+i,value:'',align:'center',width:4,position:'1.1 1.0 0.12',color:'#ffd54a'}); // tempat centang (Tahap 3)
  if(k) kanvas.addEventListener('click',()=>{ if(klikSah()) buka(i); });
  daftarBingkai[i] = { x, z, ry, yaw, k };
}
function bangunRuangMaestro(g){
  daftarBingkai = [];
  kotak(g,0,0.03,-19,19,0.04,13,'#f1ede4',{class:'klik lantai'}); teksTimbul(g,RUANG_TAHAP1.toUpperCase(),0,6.5,-25.6,14,'#c9902f');
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
  if($('scene').is('vr-mode')){ kartuVR(b.k); return; }   // di VR panel HTML tidak terlihat: pakai kartu 3D
  if(bingkaiAktif<0){ const p=$('rig').object3D.position; simpanPos={x:p.x,z:p.z}; }
  bingkaiAktif = i; const k = b.k, rig = $('rig'), p = rig.object3D.position;
  rig.setAttribute('wasd-controls','enabled',false);
  const tx = b.x + (b.ry===90?4.2:-4.2), tz = b.z, x0=p.x, z0=p.z;
  tween(0,1,kurangiGerak?0:1100,u=>{ rig.setAttribute('position',`${x0+(tx-x0)*u} 0 ${z0+(tz-z0)*u}`); if(u===1) arahKamera(b.yaw); });
  $('iJudul').textContent = k.judul;
  $('iMeta').textContent = [k.pelukis,k.tahun,k.aliran].filter(Boolean).join(', ');
  $('iJelas').textContent = k.penjelasan || 'Penjelasan belum diisi.';
  $('iFakta').textContent = k.fakta || '-'; $('iMot').textContent = k.motivasi || '-';
  $('iSumber').textContent = k.contoh ? 'Data contoh: guru perlu memverifikasi sebelum dipakai.' : ('Sumber: '+(k.sumber||'-')+(k.lisensi?' ('+k.lisensi+')':''));
  $('info').style.display='block'; $('info').scrollTop=0; $('bKembali').focus();
}
function tutup(){
  if(bingkaiAktif<0) return; bingkaiAktif=-1; $('info').style.display='none';
  $('rig').setAttribute('wasd-controls','enabled',true); // kamera dilepas, siswa bebas berjalan lagi
}
$('bKembali').onclick = tutup;
$('bKerjakan').onclick = ()=>pesan('Latihan soal hadir di Tahap 3.');
$('bNext').onclick = ()=>{ let j=bingkaiAktif; const N=daftarBingkai.length; for(let n=0;n<N;n++){ j=(j+1)%N; if(daftarBingkai[j]&&daftarBingkai[j].k){ buka(j); return; } } };
addEventListener('keydown',e=>{ if(e.key==='Escape') tutup(); });

/* ---------- Lihat dari atas ---------- */
$('bAtas').onclick = ()=>{
  const rig=$('rig'), p=rig.object3D.position; tutup();
  if(!dariAtas){ simpanPos={x:p.x,z:p.z}; rig.setAttribute('position','0 30 36'); arahKamera(0,-0.75); $('bAtas').textContent='Turun ke plaza'; }
  else { rig.setAttribute('position',`${POS.A[0]} 0 ${POS.A[2]}`); arahKamera(0,0); $('bAtas').textContent='Lihat dari atas'; }
  dariAtas=!dariAtas;
};

/* ---------- Spanduk luar: bendera vertikal bergaya museum + papan sambutan ---------- */
function teksLapis(p,v,x,y,z,w,wrap,warna,gelap){   // huruf timbul berlapis dengan pemecah baris
  for(let k=3;k>=0;k--) el(p,'a-text',{value:v,align:'center',font:'exo2bold',width:w,wrapCount:wrap,position:`${x+0.01*k} ${y-0.01*k} ${z-0.01*k}`,color:k?gelap:warna});
}
function spanduk(g){
  const daftar=koleksi.slice(0,4);
  [-6.65,-4.75,4.75,6.65].forEach((x,i)=>{
    const k=daftar[i], w=el(g,'a-entity',{position:`${x} 4.2 0.5`}), warna=k&&WARNA[k.aliran]||'#6b5b45';
    el(w,'a-box',{position:'0 1.9 0',width:1.2,height:0.07,depth:0.07,color:'#c9a227'});                       // tongkat gantung
    el(w,'a-plane',{width:1.0,height:3.5,color:warna,side:'double'});                                           // kain
    [[0,1.72,1.0,0.05],[0,-1.72,1.0,0.05],[-0.49,0,0.05,3.5],[0.49,0,0.05,3.5]].forEach(([a,b,ww,hh])=>el(w,'a-plane',{position:`${a} ${b} 0.01`,width:ww,height:hh,color:'#c9a227'})); // list emas
    if(k&&k.gambar) el(w,'a-image',{position:'0 0.85 0.02',width:0.8,height:0.8,src:k.gambar});
    else el(w,'a-circle',{position:'0 0.85 0.02',radius:0.34,color:'#c9a227'});
    teksLapis(w,k?String(k.judul).slice(0,50):'Segera hadir',0,-0.35,0.03,1.0,11,'#fff3c4','#3a2a12');
    if(k) el(w,'a-text',{value:[k.pelukis,k.tahun].filter(Boolean).join(', ').slice(0,40),align:'center',width:0.9,wrapCount:16,position:'0 -1.3 0.03',color:'#f3e6c8'});
    for(let t=-2;t<=2;t++) el(w,'a-cone',{position:`${t*0.2} -1.85 0.02`,'radius-bottom':0.05,'radius-top':0.001,height:0.18,rotation:'180 0 0',color:'#c9a227'});   // rumbai
  });
  const s=el(g,'a-entity',{position:'0 6 0.5'});
  el(s,'a-plane',{width:2.6,height:1.2,color:'#2b2118'});
  [[0,0.58,2.6,0.05],[0,-0.58,2.6,0.05],[-1.28,0,0.05,1.2],[1.28,0,0.05,1.2]].forEach(([a,b,ww,hh])=>el(s,'a-plane',{position:`${a} ${b} 0.01`,width:ww,height:hh,color:'#c9a227'}));
  teksLapis(s,'SELAMAT DATANG',0,0.18,0.03,2.3,14,'#fff3c4','#5a4410');
  el(s,'a-text',{value:'Museum KEUN',align:'center',font:'exo2bold',width:1.8,position:'0 -0.28 0.03',color:'#e8c85a'});
}

/* ---------- Titik masuk dari index.html ---------- */
async function bangunMuseum(){
  try{ koleksi = await gs('getKoleksi'); }catch(e){ koleksi=[]; pesan('Koleksi belum bisa dimuat: '+e.message,6000); }
  const d=$('dunia'); d.querySelectorAll('.zm').forEach(e=>e.remove());
  const g=document.createElement('a-entity'); g.classList.add('zm'); d.append(g);
  bangunGedung(g); bangunRuangMaestro(g); bangunPatung(g); bangunDekor(g); spanduk(g);
  g.querySelectorAll('.lantai').forEach(f=>f.addEventListener('click',e=>{ if(e.detail&&e.detail.intersection) jalanKe(e.detail.intersection.point); }));
}

/* ---------- v1.05: berjalan lebih natural ---------- */
/* Dinding padat [x1,x2,z1,z2], sudah ditambah jari-jari badan 0.4. Celah pintu tetap bebas. */
const SOLID = [[-10.7,-2.1,-0.7,0.7],[2.1,10.7,-0.7,0.7],[-10.7,-9.3,-26.7,0.7],[9.3,10.7,-26.7,0.7],[-10.7,10.7,-26.7,-25.3],
  [-10.7,-1.1,-12.6,-11.4],[1.1,10.7,-12.6,-11.4],[-9.1,-3.9,-3.0,-2.0]];
const SOLID_DASAR = SOLID.length;
const dalamPadat = (x,z)=>SOLID.some(s=>x>s[0]&&x<s[1]&&z>s[2]&&z<s[3]);
let prevPos = null;
(function cekTabrak(){ requestAnimationFrame(cekTabrak);
  const yy=$('rig').object3D.position.y;   // status 'dari atas' dibaca dari tinggi kamera, jadi tabrakan tidak pernah tertinggal mati
  if((yy>5)!==dariAtas){ dariAtas=yy>5; $('bAtas').textContent=dariAtas?'Turun ke plaza':'Lihat dari atas'; }
  if(dariAtas||bingkaiAktif>=0||!token){ prevPos=null; return; }
  putarKunci();
  gerakJoy();
  const p=$('rig').object3D.position;
  if(prevPos && dalamPadat(p.x,p.z)){            // geser menyusuri dinding, bukan menembusnya
    if(!dalamPadat(prevPos.x,p.z)) p.x=prevPos.x; else if(!dalamPadat(p.x,prevPos.z)) p.z=prevPos.z; else { p.x=prevPos.x; p.z=prevPos.z; } }
  prevPos={x:p.x,z:p.z}; })();

/* Klik lantai = berjalan halus. Jalur dipotong di dinding pertama (tidak bisa menembus). Di HP dimatikan: hanya joystick. */
let jalanId=0; function batalJalan(){ jalanId++; }
function jalanKe(pt){
  if(dariAtas||bingkaiAktif>=0) return;
  if(sentuh&&!$('scene').is('vr-mode')) return;
  const rig=$('rig'), p=rig.object3D.position, x0=p.x, z0=p.z, d0=Math.hypot(pt.x-x0,pt.z-z0), n=Math.max(1,Math.ceil(d0/0.25));
  let aman=0; for(let k=1;k<=n;k++){ const u=k/n; if(dalamPadat(x0+(pt.x-x0)*u,z0+(pt.z-z0)*u)) break; aman=u; }
  const tx=x0+(pt.x-x0)*aman, tz=z0+(pt.z-z0)*aman, d=Math.hypot(tx-x0,tz-z0); if(d<0.2) return;
  const id=++jalanId, t0=performance.now(), ms=kurangiGerak?1:Math.min(5000,d*550);
  (function s(t){ if(id!==jalanId) return; const u=Math.min(1,(t-t0)/ms), e=u<0.5?2*u*u:1-Math.pow(-2*u+2,2)/2;
    rig.object3D.position.set(x0+(tx-x0)*e,0,z0+(tz-z0)*e); if(u<1) requestAnimationFrame(s); })(t0);
}

/* Tombol pintas ke Ruang Maestro + label tombol atas ikut benar saat pindah zona */
const pindahAsli = pindah;
pindah = function(z){ batalJalan(); if(dariAtas){ dariAtas=false; $('bAtas').textContent='Lihat dari atas'; } pindahAsli(z); };
$('hud').insertAdjacentHTML('beforeend','<button id="bMaestro" class="alt">Museum KEUN</button>');
$('bMaestro').onclick=()=>{ bukaPintu(true); fadeKe(()=>{ pindah('A'); $('rig').setAttribute('position','0 0 -14.5'); arahKamera(0,0); }); };

/* ---------- v1.06: klik sah (bukan geser layar), joystick sentuh, patung & pahatan ---------- */
let awal=null, geser=0;
addEventListener('pointerdown',e=>{ awal={x:e.clientX,y:e.clientY}; geser=0; });
addEventListener('pointermove',e=>{ if(awal) geser=Math.max(geser,Math.hypot(e.clientX-awal.x,e.clientY-awal.y)); });
addEventListener('pointerup',()=>setTimeout(()=>{ awal=null; },0));
function klikSah(){ return geser<10; }      // geser layar untuk menoleh tidak dihitung klik
$('cam').setAttribute('look-controls','magicWindowTrackingEnabled',false);   // matikan giroskop HP (penyebab layar bergoyang)

let joy={x:0,y:0}, tJoy=performance.now(), joyId=null;
const sentuh = matchMedia('(pointer:coarse)').matches;
if(sentuh){
  document.head.insertAdjacentHTML('beforeend','<style>#joy{position:fixed;right:16px;bottom:92px;width:92px;height:92px;border-radius:50%;background:#ffffff40;border:2px solid #ffffff90;z-index:11;touch-action:none;display:none}#joy i{position:absolute;left:28px;top:28px;width:36px;height:36px;border-radius:50%;background:#2f6f8fb0}</style>');
  document.body.insertAdjacentHTML('beforeend','<div id="joy" role="application" aria-label="Kendali jalan"><i></i></div>');
  const j=$('joy'), kn=j.firstChild;
  const atur=e=>{ const r=j.getBoundingClientRect(); let dx=(e.clientX-r.left-r.width/2)/(r.width*0.36), dy=(e.clientY-r.top-r.height/2)/(r.width*0.36), mg=Math.hypot(dx,dy);
    if(mg>1){ dx/=mg; dy/=mg; } joy={x:dx,y:-dy}; kn.style.transform=`translate(${dx*r.width*0.26}px,${dy*r.width*0.26}px)`; };
  const lepas=()=>{ joyId=null; joy={x:0,y:0}; kn.style.transform=''; };           // berhenti seketika saat jari dilepas
  j.addEventListener('pointerdown',e=>{ joyId=e.pointerId; batalJalan(); j.setPointerCapture(joyId); atur(e); e.preventDefault(); });
  j.addEventListener('pointermove',e=>{ if(e.pointerId===joyId) atur(e); });
  ['pointerup','pointercancel','lostpointercapture'].forEach(n=>j.addEventListener(n,lepas));
  addEventListener('blur',lepas); document.addEventListener('visibilitychange',lepas);
  setInterval(()=>{ j.style.display=(token&&$('hud').style.display!=='none'&&bingkaiAktif<0&&!dariAtas)?'block':'none'; if(joyId===null&&(joy.x||joy.y)) lepas(); },300);
}
function gerakJoy(){   // joystick: kecepatan tetap 1,6 m/s, searah pandangan; berhenti bila tidak ada jari di joystick
  const n=performance.now(), dt=Math.min(0.05,(n-tJoy)/1000); tJoy=n;
  if(joyId===null||(!joy.x&&!joy.y)||bingkaiAktif>=0||dariAtas) return;
  const lc=$('cam').components['look-controls'], yaw=lc?lc.yawObject.rotation.y:0, p=$('rig').object3D.position, v=1.6*dt;
  p.x+=(-Math.sin(yaw)*joy.y+Math.cos(yaw)*joy.x)*v; p.z+=(-Math.cos(yaw)*joy.y-Math.sin(yaw)*joy.x)*v;
}

/* Patung & pahatan di tengah Ruang Maestro (model sederhana dari bentuk dasar; teks WAJIB diverifikasi guru) */
const CAT='Model sederhana buatan, bukan tiruan karya asli. [verifikasi guru]';
const PATUNG=[
 {z:-15,tipe:'figur',k:{judul:'Patung Figur Manusia',pelukis:'Patung (model sederhana)',aliran:'Seni patung',
  penjelasan:'Patung adalah karya seni tiga dimensi. Patung bisa dibuat dengan memahat (mengurangi bahan seperti batu atau kayu), memodel (menambah bahan seperti tanah liat), atau mengecor (menuang logam cair ke cetakan). '+CAT,
  fakta:'Karena tiga dimensi, patung bisa dilihat dari semua sisi. Coba berjalan mengelilinginya.',motivasi:'Dari satu bongkah batu, kesabaran bisa membentuk sebuah karya.',contoh:true}},
 {z:-18.2,tipe:'arca',k:{judul:'Arca Candi (stilisasi)',pelukis:'Seni patung Nusantara',aliran:'Patung Nusantara',
  penjelasan:'Arca adalah patung dari masa Hindu-Buddha di Nusantara, banyak ditemukan di candi dan dipahat dari batu. '+CAT,
  fakta:'Banyak arca di Jawa dipahat dari batu andesit. Perhatikan sikap duduk, mahkota, dan hiasannya.',motivasi:'Karya yang dibuat dengan teliti bisa bertahan ratusan tahun.',contoh:true}},
 {z:-21.4,tipe:'abstrak',k:{judul:'Patung Abstrak',pelukis:'Patung (model sederhana)',aliran:'Seni patung modern',
  penjelasan:'Patung abstrak tidak meniru benda nyata. Seniman bermain dengan bentuk, garis, dan ruang. '+CAT,
  fakta:'Lihat dari beberapa sisi: bentuknya terasa berubah-ubah.',motivasi:'Tidak semua karya harus mirip benda nyata. Imajinasimu juga karya.',contoh:true}},
 {z:-24.2,tipe:'relief',k:{judul:'Relief (Pahatan Timbul)',pelukis:'Seni pahat Nusantara',aliran:'Relief',
  penjelasan:'Relief adalah pahatan yang menonjol dari bidang datar seperti dinding atau lempeng batu. Relief candi sering menceritakan sebuah kisah. '+CAT,
  fakta:'Candi Borobudur dikenal memiliki ribuan panel relief.',motivasi:'Cerita bisa ditulis di buku, tetapi juga bisa dipahat di batu.',contoh:true}}];
function bangunPatung(g){
  SOLID.length=SOLID_DASAR;
  PATUNG.forEach((s,n)=>{
    const i=8+n, z=s.z, w=el(g,'a-entity',{position:`0 0 ${z}`},'dekor'); SOLID.push([-1.1,1.1,z-1.1,z+1.1]);
    el(w,'a-box',{position:'0 0.5 0',width:1.2,height:1,depth:1.2,color:'#efe8d9'});
    el(w,'a-box',{position:'0 1.02 0',width:1.3,height:0.06,depth:1.3,color:'#d9a21b'});
    papanPatung(w,s.k.judul);
    if(s.tipe==='figur'){ const c='#e8e2d4';
      el(w,'a-cylinder',{position:'0 1.5 0',radius:0.2,height:0.9,color:c}); el(w,'a-sphere',{position:'0 2.12 0',radius:0.16,color:c});
      el(w,'a-cylinder',{position:'0 1.55 0.27',radius:0.06,height:0.7,color:c}); el(w,'a-cylinder',{position:'0 1.55 -0.27',radius:0.06,height:0.7,color:c}); }
    if(s.tipe==='arca'){ const c='#8b867c';
      el(w,'a-cylinder',{position:'0 1.11 0',radius:0.45,height:0.18,color:c}); el(w,'a-cylinder',{position:'0 1.6 0',radius:0.2,height:0.75,color:c,'radius-bottom':0.3});
      el(w,'a-sphere',{position:'0 2.15 0',radius:0.18,color:c}); el(w,'a-cone',{position:'0 2.44 0',radius:0.13,height:0.3,color:c}); }
    if(s.tipe==='abstrak'){ const t=el(w,'a-torus-knot',{position:'0 1.9 0',radius:0.35,'radius-tubular':0.09,color:'#c9902f'});
      if(!kurangiGerak) t.setAttribute('animation','property:rotation;to:0 360 0;loop:true;dur:16000;easing:linear'); }
    if(s.tipe==='relief'){ el(w,'a-box',{position:'0 1.85 0',width:0.25,height:1.6,depth:1.1,color:'#8d877b'});
      [-0.27,0.27].forEach(zz=>[1.4,1.85,2.3].forEach(yy=>el(w,'a-box',{position:`0.16 ${yy} ${zz}`,width:0.08,height:0.3,depth:0.3,color:'#a59f92'}))); }
    const hit=el(w,'a-box',{position:'0 1.9 0',width:1.4,height:2,depth:1.4,material:'opacity:0;transparent:true',class:'klik',role:'img','aria-label':s.k.judul});
    hit.addEventListener('click',()=>{ if(klikSah()) buka(i); });
    daftarBingkai[i]={x:0,z,ry:90,yaw:Math.PI/2,k:s.k};
  });
}

/* v1.07: panel Studio AI hanya muncul saat berdiri di karpet Studio (sudut barat aula) */
setInterval(()=>{
  if(!token||dariAtas||bingkaiAktif>=0||zonaAktif==='D') return;
  const p=$('rig').object3D.position, di=p.x>-9.2&&p.x<-3.8&&p.z>-9.2&&p.z<-2.8;
  if(di&&zonaAktif!=='C'){ zonaAktif='C'; $('studio').style.display='block'; }
  else if(!di&&zonaAktif==='C'){ zonaAktif='A'; $('studio').style.display='none'; }
},300);

/* ================= v2.05 ================= */
/* Tulisan timbul: beberapa lapis bayangan gelap di belakang huruf depan */
function teksTimbul(p,v,x,y,z,w,warna,ry=0){ const d=(ry===180?-1:1); for(let k=4;k>=1;k--) teks(p,v,x+0.012*k*d,y-0.012*k,z-0.012*k*d,w,'#3a2a12',ry); teks(p,v,x,y,z,w,warna,ry); }

/* Cahaya lukisan palsu (bidang berpendar): ringan untuk HP, tanpa lampu sungguhan per lukisan */
let texCahaya=null;
function cahaya(){ if(texCahaya) return texCahaya;
  const c=document.createElement('canvas'); c.width=128; c.height=128; const g=c.getContext('2d'), gr=g.createRadialGradient(64,64,4,64,64,62);
  gr.addColorStop(0,'rgba(255,236,190,0.9)'); gr.addColorStop(1,'rgba(255,236,190,0)'); g.fillStyle=gr; g.fillRect(0,0,128,128); return texCahaya=c.toDataURL(); }

/* Bayangan nyata: hidup di laptop, mati di HP (bisa diubah lewat tombol) */
let bayangan = !sentuh;
function aturBayangan(on){
  bayangan=on; $('scene').setAttribute('shadow',{enabled:on,type:'pcf',autoUpdate:true});
  const l=$('lampuBayang'); if(l) l.setAttribute('light','castShadow',on);
  $('scene').object3D.traverse(o=>{ if(o.material) [].concat(o.material).forEach(mt=>{ mt.needsUpdate=true; }); });   // paksa render ulang bahan
  $('bBayang').textContent='Bayangan: '+(on?'Hidup':'Mati');
}
$('hud').insertAdjacentHTML('beforeend','<button id="bBayang" class="alt"></button>');
$('bBayang').onclick=()=>aturBayangan(!bayangan);

/* Tanaman dan bangku (bentuk dasar, ringan); ikut menjadi dinding padat */
function tanaman(g,x,z,s,jenis){
  const w=el(g,'a-entity',{position:`${x} 0 ${z}`,scale:`${s} ${s} ${s}`},'dekor');
  el(w,'a-cylinder',{position:'0 0.3 0',radius:0.32,height:0.6,color:'#b5562f'}); el(w,'a-cylinder',{position:'0 0.61 0',radius:0.28,height:0.04,color:'#4a3a2a'});
  if(jenis===1){ el(w,'a-cylinder',{position:'0 0.95 0',radius:0.04,height:0.7,color:'#5b4630'});
    [[0,1.15,0,0.4],[0.22,1.5,0.1,0.3],[-0.2,1.4,-0.12,0.32],[0.05,1.8,-0.05,0.26]].forEach(([a,b,c,r])=>el(w,'a-sphere',{position:`${a} ${b} ${c}`,radius:r,color:'#2f7d3a','segments-width':8,'segments-height':6})); }
  else { el(w,'a-cylinder',{position:'0 1.15 0',radius:0.05,height:1.1,color:'#6b5336'});
    for(let a=0;a<6;a++){ const lf=el(w,'a-entity',{position:'0 1.7 0',rotation:`0 ${a*60} 0`}); el(lf,'a-cone',{position:'0 0.05 0.45',rotation:'70 0 0','radius-bottom':0.18,'radius-top':0.01,height:1.1,color:'#2f7d3a'}); } }
  const r=0.72*s; SOLID.push([x-r,x+r,z-r,z+r]);
}
function bangku(g,x,z,ry){
  const w=el(g,'a-entity',{position:`${x} 0 ${z}`,rotation:`0 ${ry} 0`},'dekor');
  el(w,'a-box',{position:'0 0.45 0',width:1.8,height:0.1,depth:0.5,color:'#6d4a2b'});
  [-0.75,0.75].forEach(a=>el(w,'a-box',{position:`${a} 0.22 0`,width:0.1,height:0.44,depth:0.45,color:'#3a2f26'}));
  const hx=(ry%180===0?0.9:0.25)+0.4, hz=(ry%180===0?0.25:0.9)+0.4; SOLID.push([x-hx,x+hx,z-hz,z+hz]);
}
function bangunDekor(g){
  el(g,'a-entity',{id:'tRuang',position:'0 0 -19'});
  el(g,'a-entity',{id:'lampuBayang',position:'4 12 -14',light:'type:directional;color:#fff1d6;intensity:0.7;castShadow:true;shadowCameraLeft:-12;shadowCameraRight:12;shadowCameraTop:16;shadowCameraBottom:-16;shadowCameraNear:1;shadowCameraFar:40;shadowMapWidth:1024;shadowMapHeight:1024;shadowBias:-0.0005;target:#tRuang'});
  // lampu gantung (hiasan; cahaya asli datang dari lampu titik di aula dan ruang)
  [[0,-4],[0,-9],[0,-15],[0,-19.5],[0,-24]].forEach(([x,z])=>{ el(g,'a-cylinder',{position:`${x} 7.7 ${z}`,radius:0.015,height:0.6,color:'#222'});
    el(g,'a-sphere',{position:`${x} 7.1 ${z}`,radius:0.28,material:'color:#fff1c8;emissive:#ffd98a;emissiveIntensity:1','segments-width':12,'segments-height':8}); });
  // karpet Ruang Maestro
  el(g,'a-box',{position:'0 0.045 -19.4',width:3.6,height:0.02,depth:12.4,color:'#7a2f2a',shadow:'cast:false;receive:true'}); el(g,'a-box',{position:'0 0.055 -19.4',width:3.1,height:0.02,depth:11.9,color:'#9a4a38',shadow:'cast:false;receive:true'});
  [[-8.7,-1.4,1,1],[8.7,-1.4,1,1],[-8.7,-10.6,1.1,2],[8.7,-10.6,1.1,2],[-7.2,-13,1,2],[7.2,-13,1,2],[-7.2,-25,1.1,1],[7.2,-25,1.1,1]].forEach(([x,z,s,j])=>tanaman(g,x,z,s,j));
  bangku(g,6.5,-10,0); bangku(g,7.9,-19.3,90); bangku(g,-7.9,-19.3,90);
  g.querySelectorAll('.dekor *').forEach(e=>{ if(e.tagName!=='A-TEXT') e.setAttribute('shadow','cast:true;receive:true'); });
  g.querySelectorAll('.lantai').forEach(e=>e.setAttribute('shadow','cast:false;receive:true'));
  aturBayangan(bayangan);
  pesan(sentuh?'Joystick di kiri bawah untuk berjalan, geser layar untuk menoleh.':'Panah atas/bawah atau W/S: maju/mundur. Panah kiri/kanan atau Q/E: putar. Klik lantai: berjalan ke titik itu.',9000);
}

/* Laptop: putar dengan panah kiri/kanan atau Q/E (panah kiri/kanan tidak lagi menggeser ke samping) */
const tombolPutar={}; let tPutar=performance.now();
addEventListener('keydown',e=>{ if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  const k=e.key.toLowerCase();
  if(['arrowleft','arrowright','q','e'].includes(k)){ tombolPutar[k]=true; batalJalan(); if(k.startsWith('arrow')){ e.preventDefault(); e.stopImmediatePropagation(); } }
  else if(['w','a','s','d','arrowup','arrowdown'].includes(k)) batalJalan(); },true);
addEventListener('keyup',e=>{ const k=e.key.toLowerCase(); delete tombolPutar[k]; if(k==='arrowleft'||k==='arrowright') e.stopImmediatePropagation(); },true);
function putarKunci(){
  const n=performance.now(), dt=Math.min(0.05,(n-tPutar)/1000); tPutar=n;
  const arah=(tombolPutar.arrowleft||tombolPutar.q?1:0)-(tombolPutar.arrowright||tombolPutar.e?1:0);
  if(!arah||bingkaiAktif>=0) return;
  const lc=$('cam').components['look-controls']; if(lc) lc.yawObject.rotation.y+=arah*1.5*dt;
}

/* VR: kontroler (laser) dan kursor tatap (HP/Cardboard) agar bisa berpindah dengan mengarah ke lantai */
['left','right'].forEach(t=>{ const c=document.createElement('a-entity'); c.setAttribute('laser-controls','hand:'+t); c.setAttribute('raycaster','objects:.klik;far:40'); $('rig').append(c); });
$('scene').addEventListener('enter-vr',()=>{
  batalJalan(); tutup(); const p=$('rig').object3D.position; if(p.y>5) p.set(0,0,16);
  if(AFRAME.utils.device.isMobile()&&!$('gaze')){ const c=document.createElement('a-entity'); c.id='gaze';
    c.setAttribute('cursor','fuse:true;fuseTimeout:1200'); c.setAttribute('raycaster','objects:.klik;far:40'); c.setAttribute('position','0 0 -1');
    c.setAttribute('geometry','primitive:ring;radiusInner:0.012;radiusOuter:0.022'); c.setAttribute('material','color:#ffffff;shader:flat;opacity:0.85'); $('cam').append(c); } });
$('scene').addEventListener('exit-vr',()=>{ const c=$('gaze'); if(c) c.remove(); const k=$('kartuvr'); if(k) k.remove(); });
function kartuVR(k){
  const lama=$('kartuvr'); if(lama) lama.remove();
  const c=document.createElement('a-entity'); c.id='kartuvr'; c.setAttribute('position','0 -0.1 -1.6');
  el(c,'a-plane',{width:1.8,height:1.1,color:'#fbf8f1',opacity:0.95});
  el(c,'a-text',{value:k.judul+'\n'+[k.pelukis,k.tahun].filter(Boolean).join(', ')+'\n\n'+(k.penjelasan||''),width:1.6,wrapCount:38,anchor:'left',baseline:'top',align:'left',position:'-0.8 0.48 0.01',color:'#222'});
  $('cam').append(c); setTimeout(()=>c.remove(),15000);
}

/* ================= v2.06 ================= */
/* Papan nama patung: bingkai emas, dasar gelap, paku hias, huruf timbul berlapis */
function papanPatung(w,judul){
  const pl=el(w,'a-entity',{position:'0.63 0.5 0',rotation:'0 90 0'});
  el(pl,'a-box',{width:1.12,height:0.74,depth:0.04,color:'#c9a227'});
  el(pl,'a-box',{width:1.02,height:0.64,depth:0.05,color:'#2b2118'});
  [[-0.5,0.32],[0.5,0.32],[-0.5,-0.32],[0.5,-0.32]].forEach(([a,b])=>el(pl,'a-sphere',{position:`${a} ${b} 0.03`,radius:0.03,color:'#e8c85a','segments-width':8,'segments-height':6}));
  for(let k=3;k>=0;k--) el(pl,'a-text',{value:judul,align:'center',font:'exo2bold',width:1.3,wrapCount:11,position:`${0.012*k} ${-0.012*k} ${0.075-0.012*k}`,color:k?'#6b4e10':'#fff3c4'});
}
/* Klik ganda = berhenti berjalan (klik pertama sudah mulai berjalan) */
addEventListener('dblclick',()=>batalJalan());

/* ================= v2.07 ================= */
/* Panel info: tidak keluar layar di HP, bisa digulir, tombol tetap terlihat di bawah */
document.head.insertAdjacentHTML('beforeend','<style>.ui{box-sizing:border-box}'+
 '#info{left:10px;right:10px;bottom:10px;width:auto;max-width:460px;margin-left:auto;max-height:62vh;overflow-y:auto;overflow-x:hidden;overflow-wrap:anywhere;padding:0;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y}'+
 '#info .isi{padding:14px 16px 4px}#info .aksi{position:sticky;bottom:0;background:#fbf8f1;padding:10px 16px 12px;margin:0;border-top:1px solid #e0d9c8}'+
 '@media (max-width:600px){#info{max-width:none;max-height:58vh}#info h3{font-size:19px}#info p{font-size:15px;line-height:1.55}}'+
 '@media (pointer:coarse){#hud{top:6px;left:6px;padding:8px;gap:4px}#hud button{padding:6px 9px;font-size:13px}}</style>');
(function(){ const inf=$('info'), aks=inf.querySelector('.aksi'), isi=document.createElement('div'); isi.className='isi';
  [...inf.children].forEach(c=>{ if(c!==aks) isi.append(c); }); inf.prepend(isi); })();
