/* Ruang Rupa v2.09 - Museum 3D. Dimuat SETELAH skrip utama di index.html.
   Memakai: $, gs, pesan, POS, pindah. Menyediakan: bangunMuseum(). */
const WARNA = { Naturalisme:'#6f8f5a', Realisme:'#8a7a64', Romantisme:'#7b5a8c', Abstrak:'#c9902f', Impresionisme:'#8fb3a3', Kubisme:'#b08a5a', Ekspresionisme:'#b3412f', Surealisme:'#6b5b95', Nusantara:'#c9902f' };
const RUANG_TAHAP1 = 'Impresionisme';           // Tahap 1: satu ruang saja
let koleksi = [], bingkaiAktif = -1, daftarBingkai = [], dekatPintu = false, dariAtas = false, simpanPos = null;
const kurangiGerak = matchMedia('(prefers-reduced-motion: reduce)').matches;
POS.A = [0, 0, 16]; POS.C = [-5, 0, -5];   // Studio AI sekarang di sudut barat aula (di dalam gedung)

/* PERBAIKAN: status tombol keyboard harus dideklarasikan SEBELUM cekTabrak berjalan (menghindari galat 'tPutar before initialization') */
const tombolPutar={}; let tPutar=performance.now();

/* PERBAIKAN 2: look-controls milik A-Frame baru punya yawObject/pitchObject setelah scene selesai dimuat.
   Semua akses ke kontrol pandang harus lewat fungsi ini; hasilnya null bila belum siap. */
function siapScene(fn){ const sc=$('scene'); if(sc.hasLoaded) fn(); else sc.addEventListener('loaded',()=>fn(),{once:true}); }
function kendaliPandang(){ const c=$('cam')&&$('cam').components&&$('cam').components['look-controls']; return (c&&c.yawObject&&c.pitchObject)?c:null; }

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
  [[-2.39,0],[-2.61,180]].forEach(([zz,ry])=>el(g,'a-plane',{position:`-6.5 2.2 ${zz}`,rotation:`0 ${ry} 0`,width:4.2,height:2.68,material:{src:denahTex(),shader:'flat'}}));   // denah gambar, kedua sisi

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
function bingkaiLukisan(g, k, i, x, z, ry, yaw, sx, sz){
  const kosong = !k, w = k && WARNA[k.aliran] || '#9a9082';
  const f = el(g,'a-entity',{position:`${x} 2.4 ${z}`,rotation:`0 ${ry} 0`});
  el(f,'a-box',{width:2.9,height:2.3,depth:0.12,color:'#3a2f26'});
  const kanvas = el(f,'a-plane',{width:2.5,height:1.9,position:'0 0 0.07',color:kosong?'#e7e1d3':w,class:'klik',role:'img',
    'aria-label':kosong?'Bingkai kosong':`${k.judul}, ${k.pelukis}`});
  if(k && k.gambar){ const im=el(f,'a-image',{width:2.5,height:1.9,position:'0 0 0.08',src:k.gambar,class:'klik'});
    im.addEventListener('click',()=>{ if(klikSah()) buka(i); }); im.addEventListener('error',()=>im.remove()); }
  if(!kosong&&k.aliran) teks(f,String(k.aliran).toUpperCase(),0,1.52,0.07,5,'#e8c85a');
  if(kosong) el(f,'a-text',{value:'Segera hadir',align:'center',width:2.4,wrapCount:14,position:'0 0 0.1',color:'#6b6458'});
  el(f,'a-box',{width:3.1,height:0.62,depth:0.06,position:'0 -1.62 0.06',color:'#2b2118'});                       // papan nama di bawah lukisan
  teks(f,'No. '+(i+1)+(kosong?'  Segera hadir':'  '+k.judul),0,-1.51,0.1,3.4,'#f3e6c8');
  if(!kosong) teks(f,[k.pelukis,k.tahun].filter(Boolean).join(', '),0,-1.74,0.1,3.0,'#d9c9a3');
  el(f,'a-box',{width:0.06,height:0.06,depth:0.35,position:'0 1.3 0.2',color:'#2b2118'});                         // lampu sorot lukisan: lengan + kap + cahaya palsu (ringan)
  el(f,'a-cone',{position:'0 1.3 0.38','radius-bottom':0.16,'radius-top':0.05,height:0.2,rotation:'-35 0 0',color:'#d9a21b'});
  el(f,'a-plane',{width:3.4,height:3,position:'0 0.2 0.09',material:{src:cahaya(),transparent:true,blending:'additive',opacity:0.5,depthWrite:false,shader:'flat'}});
  el(f,'a-text',{id:'tanda'+i,value:'',align:'center',width:4,position:'1.1 1.0 0.12',color:'#ffd54a'}); // tempat centang (Tahap 3)
  if(k) kanvas.addEventListener('click',()=>{ if(klikSah()) buka(i); });
  daftarBingkai[i] = { x, z, ry, yaw, k, sx, sz };
}
function bangunRuangMaestro(g){
  daftarBingkai=[];
  kotak(g,0,0.03,-19,19,0.04,13,'#f1ede4',{class:'klik lantai'});
  teksTimbul(g,'RUANG LUKISAN',0,7.0,-25.6,14,'#c9902f'); teksTimbul(g,'ERA MODERNISME',0,6.0,-25.6,14,'#c9902f');
  // 12 bingkai: 4 dinding barat, 4 dinding timur, 2 dinding belakang (kiri-kanan patung), 2 dinding depan (kiri-kanan pintu)
  const S=[]; for(let n=0;n<4;n++) S.push([-9.6,-14.5-n*3.2,90,Math.PI/2,-5.4,-14.5-n*3.2]);
  for(let n=0;n<4;n++) S.push([9.6,-14.5-n*3.2,-90,-Math.PI/2,5.4,-14.5-n*3.2]);
  S.push([-5.5,-25.64,0,0,-5.5,-21.44],[5.5,-25.64,0,0,5.5,-21.44],[-5.5,-12.28,180,Math.PI,-5.5,-16.48],[5.5,-12.28,180,Math.PI,5.5,-16.48]);
  // nomor bingkai = urutan; yang nomornya bentrok atau di luar 1-12 mengisi bingkai kosong yang tersisa
  const slot=Array(S.length).fill(null), sisa=[];
  koleksi.slice().sort((a,b)=>a.urutan-b.urutan).forEach(k=>{ const n=Math.floor(k.urutan)-1; if(n>=0&&n<S.length&&!slot[n]) slot[n]=k; else sisa.push(k); });
  sisa.forEach(k=>{ const n=slot.indexOf(null); if(n>=0) slot[n]=k; });
  S.forEach((s,n)=>bingkaiLukisan(g,slot[n],n,s[0],s[1],s[2],s[3],s[4],s[5]));
  if(!koleksi.length) pesan('Koleksi masih kosong: semua bingkai bertuliskan "Segera hadir".',6000);
}

/* ---------- Kamera mendekat + panel info ---------- */
function tween(dari, ke, ms, fn){ if(!ms){ fn(ke); return; } const t0=performance.now();
  (function s(t){ const u=Math.min(1,(t-t0)/ms), e=u<0.5?2*u*u:1-Math.pow(-2*u+2,2)/2; fn(dari+(ke-dari)*e); if(u<1) requestAnimationFrame(s); })(t0); }
function arahKamera(yaw, pitch){ const lc=kendaliPandang(); if(lc){ lc.yawObject.rotation.y=yaw; lc.pitchObject.rotation.x=pitch||0; } }
function buka(i){
  const b = daftarBingkai[i]; if(!b||!b.k) return;
  if($('scene').is('vr-mode')){ kartuVR(b.k); return; }   // di VR panel HTML tidak terlihat: pakai kartu 3D
  if(bingkaiAktif<0){ const p=$('rig').object3D.position; simpanPos={x:p.x,z:p.z}; }
  bingkaiAktif = i; const k = b.k, rig = $('rig'), p = rig.object3D.position;
  rig.setAttribute('wasd-controls','enabled',false);
  const tx = b.sx!==undefined?b.sx:b.x + (b.ry===90?4.2:-4.2), tz = b.sz!==undefined?b.sz:b.z, x0=p.x, z0=p.z;
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
  /* gerak keyboard ditangani gerakKunci() */ 0; // kamera dilepas, siswa bebas berjalan lagi
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
  gerakKunci();
  if(dariAtas||bingkaiAktif>=0||!token){ prevPos=null; return; }
  gerakJoy();
  const p=$('rig').object3D.position;
  if(prevPos && dalamPadat(p.x,p.z)){            // geser menyusuri dinding, bukan menembusnya
    if(!dalamPadat(prevPos.x,p.z)) p.x=prevPos.x; else if(!dalamPadat(p.x,prevPos.z)) p.z=prevPos.z; else { p.x=prevPos.x; p.z=prevPos.z; } }
  prevPos={x:p.x,z:p.z}; })();

/* Klik lantai = berjalan halus. Jalur dipotong di dinding pertama (tidak bisa menembus). Di HP dimatikan: hanya joystick. */
let jalanId=0; function batalJalan(){ jalanId++; }
function jalanKe(pt){
  if(dariAtas||bingkaiAktif>=0) return;
  if(sentuh&&!modeVR&&!$('scene').is('vr-mode')) return;
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
function klikSah(){ return modeVR||geser<10; }      // geser layar untuk menoleh tidak dihitung klik
siapScene(()=>$('cam').setAttribute('look-controls','magicWindowTrackingEnabled',false));   // matikan giroskop HP (penyebab layar bergoyang); ditunda sampai A-Frame siap

let joy={x:0,y:0}, tJoy=performance.now(), joyId=null;
const sentuh = matchMedia('(pointer:coarse)').matches;
if(sentuh){
  document.head.insertAdjacentHTML('beforeend','<style>#joy{position:fixed;right:16px;bottom:92px;width:92px;height:92px;border-radius:50%;background:rgba(20,40,50,.38);border:3px solid rgba(255,255,255,.95);box-shadow:0 0 0 2px rgba(20,40,50,.6),0 2px 10px rgba(0,0,0,.35);z-index:11;touch-action:none;display:none}#joy i{position:absolute;left:26px;top:26px;width:34px;height:34px;border-radius:50%;background:#1d5f7c;border:2px solid #fff}</style>');
  document.body.insertAdjacentHTML('beforeend','<div id="joy" role="application" aria-label="Kendali jalan"><i></i></div>');
  const j=$('joy'), kn=j.firstChild;
  const atur=e=>{ const r=j.getBoundingClientRect(); let dx=(e.clientX-r.left-r.width/2)/(r.width*0.36), dy=(e.clientY-r.top-r.height/2)/(r.width*0.36), mg=Math.hypot(dx,dy);
    if(mg>1){ dx/=mg; dy/=mg; } joy={x:dx,y:-dy}; kn.style.transform=`translate(${dx*r.width*0.26}px,${dy*r.width*0.26}px)`; };
  const lepas=()=>{ joyId=null; joy={x:0,y:0}; kn.style.transform=''; };           // berhenti seketika saat jari dilepas
  j.addEventListener('pointerdown',e=>{ joyId=e.pointerId; batalJalan(); j.setPointerCapture(joyId); atur(e); e.preventDefault(); });
  j.addEventListener('pointermove',e=>{ if(e.pointerId===joyId) atur(e); });
  ['pointerup','pointercancel','lostpointercapture'].forEach(n=>j.addEventListener(n,lepas));
  addEventListener('blur',lepas); document.addEventListener('visibilitychange',lepas);
  setInterval(()=>{ j.style.display=(token&&$('hud').style.display!=='none'&&bingkaiAktif<0&&!dariAtas&&!modeVR)?'block':'none'; if(joyId===null&&(joy.x||joy.y)) lepas(); },300);
}
function gerakJoy(){   // joystick: kecepatan tetap 1,6 m/s, searah pandangan; berhenti bila tidak ada jari di joystick
  const n=performance.now(), dt=Math.min(0.05,(n-tJoy)/1000); tJoy=n;
  if(joyId===null||(!joy.x&&!joy.y)||bingkaiAktif>=0||dariAtas) return;
  const lc=kendaliPandang(), yaw=lc?lc.yawObject.rotation.y:0, p=$('rig').object3D.position, v=1.6*dt;
  p.x+=(-Math.sin(yaw)*joy.y+Math.cos(yaw)*joy.x)*v; p.z+=(-Math.cos(yaw)*joy.y-Math.sin(yaw)*joy.x)*v;
}

/* Patung & pahatan di tengah Ruang Maestro (model 3D sederhana dari bentuk dasar; teks WAJIB diverifikasi guru) */
const CAT='Model sederhana buatan, bukan tiruan karya asli. [verifikasi guru]';
const CAT_FOTO='Model 3D hasil konversi foto, bukan tiruan persis karya asli. [verifikasi guru]';
const PATUNG=[
 {z:-15,tipe:'figur',k:{judul:'Patung Figur Manusia',pelukis:'Patung dada marmer (model 3D dari foto)',aliran:'Seni patung Romawi',
  penjelasan:'Ini patung dada (bust), yaitu patung yang hanya menampilkan kepala, leher, bahu, dan dada. Tokohnya digambarkan dengan karangan daun di kepala, rambut berponi pendek, dan jubah yang jatuh berlipat-lipat dari bahu. Bahannya marmer putih yang dipahat halus, lalu diletakkan di atas alas bulat. '+CAT_FOTO,
  fakta:'Orang Romawi kuno memakai karangan daun sebagai tanda kemenangan dan kehormatan. Perhatikan lipatan jubahnya: batu keras bisa terlihat seperti kain yang lembut.',motivasi:'Dari satu bongkah batu, kesabaran bisa membentuk sebuah karya.',contoh:true}},
 {z:-18.2,tipe:'arca',k:{judul:'Arca Candi (Ukiran Bali)',pelukis:'Seni ukir kayu Bali (model 3D dari foto)',aliran:'Patung Nusantara',
  penjelasan:'Ini patung dada ukiran kayu bergaya Bali. Wajahnya tenang dengan mata terpejam, memakai mahkota berhias dan hiasan telinga, dengan kalung berukir di dada. Di belakang kepala ada lingkaran sinar berlubang-lubang yang dipahat satu per satu. Kayunya dibiarkan berwarna cokelat alami, sehingga serat dan hasil pahatannya terlihat. '+CAT_FOTO,
  fakta:'Ukiran Bali terkenal dengan hiasan yang rumit dan rapi. Coba hitung berapa sinar yang mengelilingi kepalanya.',motivasi:'Karya yang dibuat dengan teliti bisa bertahan ratusan tahun.',contoh:true}},
 {z:-21.4,tipe:'abstrak',k:{judul:'Patung Abstrak',pelukis:'Patung (model sederhana)',aliran:'Seni patung modern',
  penjelasan:'Patung abstrak tidak meniru benda nyata. Seniman bermain dengan bentuk, garis, warna, dan ruang. Patung ini berbentuk simpul yang melilit dan berwarna-warni seperti pelangi: merah, jingga, kuning, hijau, biru, nila, dan ungu. '+CAT,
  fakta:'Lihat dari beberapa sisi: bentuknya terasa berubah-ubah. Ikuti satu warna dari ujung ke ujung, ke mana ia berakhir?',motivasi:'Tidak semua karya harus mirip benda nyata. Imajinasimu juga karya.',contoh:true}},
 {z:-24.2,tipe:'relief',k:{judul:'Garuda Wisnu (Kayu)',pelukis:'Seni ukir kayu Bali (model 3D dari foto)',aliran:'Patung Nusantara',
  penjelasan:'Patung ukiran kayu ini menggambarkan Dewa Wisnu yang duduk di atas Garuda, burung raksasa dalam cerita Hindu. Garuda berdiri dengan kaki ditekuk, kedua tangannya terentang, dan sayapnya mengembang lebar dengan celah-celah di antara bulunya. Wisnu memakai mahkota dan duduk di belakang kepala Garuda. Alasnya bulat dengan tepi bergerigi. '+CAT_FOTO,
  fakta:'Garuda juga menjadi lambang negara Indonesia. Di Bali ada patung Garuda Wisnu Kencana yang termasuk salah satu patung terbesar di dunia.',motivasi:'Cerita bisa ditulis di buku, tetapi juga bisa dipahat di kayu dan batu.',contoh:true}}];

/* Bahan 3D: geometri dasar dipakai bersama (hemat memori untuk HP) */
const T3=AFRAME.THREE;
const BHN=(c,r,x)=>new T3.MeshStandardMaterial(Object.assign({color:c,roughness:r==null?0.7:r,metalness:0},x||{}));
const G3={sph:new T3.SphereGeometry(1,12,9),cyl:new T3.CylinderGeometry(1,1,1,12),con:new T3.ConeGeometry(1,1,10),box:new T3.BoxGeometry(1,1,1),
  tap:new T3.CylinderGeometry(1.7,1,1,4),cap:new T3.SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI*0.55),
  mangkok:new T3.CylinderGeometry(1,0.45,1,14,1,true,Math.PI/2,Math.PI)};
function B3(g,geo,mat,p,s,r){ const m=new T3.Mesh(G3[geo]||geo,mat); if(p)m.position.set(p[0],p[1],p[2]);
  if(s)m.scale.set(s[0],s[1],s[2]); if(r)m.rotation.set(r[0],r[1],r[2]); g.add(m); return m; }
/* Putar bagian pada sumbu Z dari titik tumpu (dipakai untuk sinar dan bulu sayap) */
function kipas(g,mat,px,py,pz,sudut,panjang,jari,tebal,rx){ const sg=new T3.Group(); sg.position.set(px,py,pz); sg.rotation.set(rx||0,0,sudut); g.add(sg);
  B3(sg,'tap',mat,[0,jari+panjang/2,0],[tebal[0],panjang,tebal[1]]); }

function patungFoto(w,tipe){
  const g=new T3.Group(); g.position.y=1.05; g.rotation.y=Math.PI/2; w.object3D.add(g); /* depan patung menghadap papan nama (+x) */
  if(tipe==='figur'){ /* patung dada marmer bermahkota daun */
    const mr=BHN('#e9e4d4',0.5), lp=BHN('#d6cfba',0.6), gl=BHN('#bdb6a3',0.7);
    const prof=[[0.001,0],[0.30,0],[0.30,0.05],[0.24,0.07],[0.24,0.11],[0.17,0.14],[0.17,0.20],[0.22,0.22],[0.22,0.25],[0.001,0.25]].map(a=>new T3.Vector2(a[0],a[1]));
    B3(g,new T3.LatheGeometry(prof,18),mr);
    B3(g,'sph',mr,[0,0.50,0],[0.42,0.26,0.20]);
    B3(g,'sph',mr,[-0.30,0.52,0],[0.17,0.15,0.16]); B3(g,'sph',mr,[0.30,0.52,0],[0.17,0.15,0.16]);
    B3(g,'sph',lp,[-0.26,0.50,0.12],[0.14,0.12,0.07],[0,0,0.5]);           /* gumpalan jubah di bahu */
    B3(g,'sph',lp,[0.22,0.38,0.14],[0.20,0.17,0.08],[0,0,-0.3]);
    [[0.03,0.47,-0.55,0.62],[0.00,0.40,-0.55,0.58],[-0.03,0.33,-0.55,0.50]].forEach(a=>B3(g,'box',lp,[a[0],a[1],0.19],[a[3],0.07,0.05],[0,0,a[2]])); /* lipatan diagonal */
    B3(g,'sph',mr,[-0.27,0.56,0.20],[0.05,0.05,0.03]);                      /* bros bahu */
    B3(g,'cyl',mr,[0,0.70,0],[0.075,0.12,0.075]);                           /* leher */
    B3(g,'sph',mr,[0,0.86,0.01],[0.115,0.145,0.12]);                        /* kepala */
    B3(g,'sph',mr,[0,0.77,0.07],[0.05,0.04,0.05]);                          /* dagu */
    B3(g,'con',mr,[0,0.85,0.12],[0.025,0.07,0.025],[Math.PI/2,0,0]);        /* hidung */
    [-1,1].forEach(s=>{ B3(g,'sph',gl,[s*0.045,0.89,0.108],[0.025,0.012,0.01]); B3(g,'sph',mr,[s*0.118,0.87,0],[0.02,0.035,0.02]); });
    B3(g,'sph',gl,[0,0.80,0.115],[0.04,0.007,0.01]);
    B3(g,'cap',lp,[0,0.89,-0.005],[0.125,0.13,0.13],[-0.15,0,0]);           /* rambut */
    for(let i=-2;i<=2;i++) B3(g,'con',lp,[i*0.04,0.96,0.1],[0.02,0.07,0.02],[Math.PI*0.85,0,i*0.12]); /* poni */
    for(let k=0;k<12;k++){ const a=k/12*Math.PI*2; B3(g,'sph',lp,[Math.sin(a)*0.13,0.975,Math.cos(a)*0.13],[0.04,0.016,0.055],[0,a,0.2]); } /* karangan daun */
  }
  if(tipe==='arca'){ /* patung dada kayu Bali, mahkota dan lingkar sinar */
    const kw=BHN('#c98a3e',0.55), kg=BHN('#9c5f25',0.65), em=BHN('#d9a441',0.35), kt=BHN('#4a2a12',0.8);
    B3(g,'cyl',kw,[0,0.10,0],[0.34,0.20,0.15]);
    B3(g,'sph',kw,[0,0.30,0],[0.40,0.17,0.17]);
    B3(g,'sph',kg,[0,0.30,0.12],[0.22,0.12,0.06]);                          /* kalung berukir */
    B3(g,'box',kg,[-0.09,0.36,0.15],[0.24,0.05,0.03],[0,0,-0.55]); B3(g,'box',kg,[0.09,0.36,0.15],[0.24,0.05,0.03],[0,0,0.55]);
    B3(g,'cyl',kw,[0,0.46,0],[0.08,0.14,0.08]);
    B3(g,'sph',kw,[0,0.66,0.01],[0.14,0.17,0.13]);                          /* wajah */
    B3(g,'con',kw,[0,0.64,0.13],[0.03,0.08,0.03],[Math.PI/2,0,0]);
    [-1,1].forEach(s=>{ B3(g,'box',kt,[s*0.05,0.69,0.125],[0.06,0.012,0.01],[0,0,-s*0.12]); B3(g,'box',kg,[s*0.05,0.715,0.12],[0.07,0.01,0.01],[0,0,-s*0.12]);
      B3(g,'sph',kg,[s*0.18,0.62,0],[0.04,0.10,0.05]); B3(g,'sph',kg,[s*0.19,0.55,0.02],[0.05,0.06,0.05]); });  /* hiasan telinga */
    B3(g,'box',kt,[0,0.585,0.125],[0.05,0.012,0.012]);                      /* bibir */
    B3(g,'sph',em,[0,0.745,0.13],[0.015,0.015,0.01]);                       /* urna di dahi */
    B3(g,'cyl',kg,[0,0.84,-0.01],[0.17,0.09,0.15]);                         /* mahkota (gelungan) */
    for(let i=-2;i<=2;i++) B3(g,'sph',em,[i*0.06,0.86,0.14-Math.abs(i)*0.012],[0.03,0.04,0.02]);
    B3(g,'cyl',kw,[0,0.93,-0.02],[0.15,0.08,0.12]); B3(g,'con',em,[0,1.02,-0.02],[0.05,0.10,0.05]);
    for(let i=0;i<17;i++){ const a=(-105+i*210/16)*Math.PI/180; kipas(g,i%2?kw:kg,0,0.82,-0.04,-a,0.30,0.17,[0.028,0.012]); } /* lingkar sinar berlubang */
  }
  if(tipe==='abstrak'){ /* simpul pelangi, putar pelan */
    const gk=new T3.TorusKnotGeometry(0.35,0.09,120,10), pos=gk.attributes.position, col=new Float32Array(pos.count*3), c=new T3.Color(), R=11;
    for(let v=0;v<pos.count;v++){ c.setHSL((Math.floor(v/R)%120)/120,0.9,0.55); col[v*3]=c.r; col[v*3+1]=c.g; col[v*3+2]=c.b; }
    gk.setAttribute('color',new T3.BufferAttribute(col,3));
    const t=el(w,'a-entity',{position:'0 1.9 0'}); t.object3D.add(new T3.Mesh(gk,BHN('#ffffff',0.35,{vertexColors:true})));
    if(!kurangiGerak) t.setAttribute('animation','property:rotation;to:0 360 0;loop:true;dur:16000;easing:linear');
    w.object3D.remove(g);
  }
  if(tipe==='relief'){ /* Garuda Wisnu, ukiran kayu */
    const kw=BHN('#bf7a35',0.55), kg=BHN('#8e5322',0.65), kl=BHN('#d29a52',0.5), kt=BHN('#2a1608',0.8), md=BHN('#bf7a35',0.55,{side:T3.DoubleSide});
    g.scale.set(0.88,0.88,0.88);
    B3(g,'cyl',kg,[0,0.05,0],[0.50,0.10,0.34]); B3(g,'cyl',kw,[0,0.13,0],[0.42,0.07,0.28]);       /* alas oval */
    [-1,1].forEach(s=>{
      B3(g,'cyl',kw,[s*0.15,0.30,0.08],[0.045,0.28,0.045],[0,0,s*0.45]);                          /* kaki ditekuk */
      B3(g,'box',kg,[s*0.22,0.17,0.10],[0.12,0.04,0.14]);
      B3(g,'con',kg,[s*0.44,0.22,0],[0.08,0.20,0.04],[0,0,s*-1.2]);                                /* hiasan ujung */
      B3(g,'cyl',kw,[s*0.26,0.55,0.02],[0.035,0.24,0.035],[0,0,s*-1.97]); B3(g,'sph',kw,[s*0.40,0.50,0.02],[0.05,0.05,0.05]); /* tangan terentang */
      B3(g,'sph',kg,[s*0.24,0.62,-0.04],[0.17,0.12,0.04],[0,0,s*-0.4]);                           /* pangkal sayap */
      B3(g,'sph',kl,[s*0.05,0.77,0.14],[0.04,0.04,0.04]); B3(g,'sph',kt,[s*0.05,0.77,0.178],[0.016,0.016,0.016]); /* mata Garuda */
      for(let i=0;i<8;i++) kipas(g,i%2?kw:kg,s*0.14,0.62,-0.06,s*-(0.1+i*0.1643),0.42-i*0.02,0.10,[0.05,0.016],-0.15); /* bulu sayap */
    });
    B3(g,'sph',kw,[0,0.55,0],[0.17,0.22,0.12]); B3(g,'con',kg,[0,0.34,0.10],[0.10,0.30,0.03],[Math.PI,0,0]); /* badan dan hiasan dada */
    B3(g,'sph',kw,[0,0.74,0.06],[0.11,0.11,0.11]);
    B3(g,'con',kw,[0,0.70,0.17],[0.05,0.13,0.04],[Math.PI/2+0.5,0,0]);                              /* paruh */
    B3(g,'con',kg,[0,0.90,0.04],[0.07,0.14,0.07]);                                                    /* mahkota Garuda */
    B3(g,'sph',kw,[0,1.00,-0.04],[0.09,0.12,0.07]); B3(g,'sph',kw,[0,1.17,-0.03],[0.065,0.075,0.06]);    /* Wisnu */
    B3(g,'con',kg,[0,1.27,-0.03],[0.05,0.11,0.05]);
    [-1,1].forEach(s=>{ B3(g,'cyl',kw,[s*0.10,1.00,0.0],[0.025,0.12,0.025],[0,0,s*-0.5]); B3(g,'sph',kw,[s*0.04,1.02,0.05],[0.025,0.025,0.025]); B3(g,'sph',kt,[s*0.025,1.18,0.03],[0.008,0.008,0.008]); });
    B3(g,'mangkok',md,[0,1.12,-0.04],[0.50,0.26,0.30]);                                                /* kipas lengkung di belakang Wisnu */
  }
}
/* Model GLB (hasil konversi foto). Taruh file di folder patung/ sejajar index.html. Kosongkan alamat untuk memakai model bentuk dasar. */
const GLB_PATUNG={figur:'patung/patung_figur.glb',arca:'patung/patung_arca.glb',relief:'patung/patung_relief.glb'};
const BAHAN_GLB={figur:'warna:#e9e4d4;kasar:0.55',arca:'warna:#c98a3e;kasar:0.6',relief:''};  /* relief memakai tekstur bawaan GLB */
const SKALA_GLB=0.65;  /* tinggi model GLB 2 unit, jadi tinggi tampil 1,3 unit di atas podium */
AFRAME.registerComponent('bahan-patung',{schema:{warna:{type:'color',default:''},kasar:{default:0.6}},
  init(){ this.el.addEventListener('model-loaded',()=>{ const d=this.data, m3=this.el.getObject3D('mesh'); if(!m3) return;
    m3.traverse(o=>{ if(!o.isMesh) return;
      if(!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
      if(d.warna) o.material=new AFRAME.THREE.MeshStandardMaterial({color:d.warna,roughness:d.kasar,metalness:0});
      else { o.material.metalness=0; o.material.flatShading=false; o.material.needsUpdate=true; } }); }); }});
function bangunPatung(g){
  SOLID.length=SOLID_DASAR;
  PATUNG.forEach((s,n)=>{
    const i=12+n, z=s.z, w=el(g,'a-entity',{position:`0 0 ${z}`},'dekor'); SOLID.push([-1.1,1.1,z-1.1,z+1.1]);
    el(w,'a-box',{position:'0 0.5 0',width:1.2,height:1,depth:1.2,color:'#efe8d9'});
    el(w,'a-box',{position:'0 1.02 0',width:1.3,height:0.06,depth:1.3,color:'#d9a21b'});
    papanPatung(w,s.k.judul);
    const url=GLB_PATUNG[s.tipe];
    if(url){ const m=el(w,'a-entity',Object.assign({'bahan-patung':BAHAN_GLB[s.tipe]||'',position:`0 ${1.05+SKALA_GLB} 0`,rotation:'0 90 0',scale:`${SKALA_GLB} ${SKALA_GLB} ${SKALA_GLB}`},{'gltf-model':`url(${url})`}));
      m.addEventListener('model-error',()=>{ m.remove(); patungFoto(w,s.tipe); }); }   /* GLB gagal dimuat: pakai model bentuk dasar */
    else patungFoto(w,s.tipe);
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
  [[-8.7,-1.4,1,1],[8.7,-1.4,1,1],[-8.7,-10.6,1.1,2],[8.7,-10.6,1.1,2],[-8.3,-13.2,1,2],[8.3,-13.2,1,2],[-8.5,-24.9,1.1,1],[8.5,-24.9,1.1,1]].forEach(([x,z,s,j])=>tanaman(g,x,z,s,j));
  bangku(g,6.5,-10,0); bangku(g,7.9,-19.3,90); bangku(g,-7.9,-19.3,90);
  g.querySelectorAll('.dekor *').forEach(e=>{ if(e.tagName!=='A-TEXT') e.setAttribute('shadow','cast:true;receive:true'); });
  g.querySelectorAll('.lantai').forEach(e=>e.setAttribute('shadow','cast:false;receive:true'));
  aturBayangan(bayangan);
  pesan(sentuh?'Joystick di kanan bawah untuk berjalan, geser layar untuk menoleh, cubit dua jari untuk zoom.':'W/panah atas: maju. S/panah bawah: mundur. A/D: geser. Q/E atau panah kiri/kanan: putar. Z: balik badan. Shift: lari. Roda mouse atau +/-: zoom.',9000);
}

/* Laptop: putar dengan panah kiri/kanan atau Q/E (panah kiri/kanan tidak lagi menggeser ke samping) */
/* (tombolPutar dan tPutar sudah dideklarasikan di bagian atas file) */
const KUNCI=['w','a','s','d','q','e','arrowup','arrowdown','arrowleft','arrowright'];
addEventListener('keydown',e=>{
  tombolPutar.shift=e.shiftKey;
  if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey) return;
  const k=e.key.toLowerCase();
  if(k==='z'&&token&&bingkaiAktif<0){ const lc=kendaliPandang(); if(lc) lc.yawObject.rotation.y+=Math.PI; return; }   // balik badan
  if(k==='+'||k==='='){ aturFov(fov-5); return; } if(k==='-'){ aturFov(fov+5); return; } if(k==='0'){ aturFov(80); return; }
  if(!KUNCI.includes(k)) return;
  tombolPutar[k]=true; batalJalan(); if(k.startsWith('arrow')){ e.preventDefault(); e.stopImmediatePropagation(); } },true);
addEventListener('keyup',e=>{ tombolPutar.shift=e.shiftKey; delete tombolPutar[e.key.toLowerCase()]; },true);
addEventListener('blur',()=>{ for(const k in tombolPutar) delete tombolPutar[k]; });
function gerakKunci(){   // W/panah atas maju, S/panah bawah mundur, A/D geser, Q/E/panah kiri-kanan putar, Shift lari
  const n=performance.now(), dt=Math.min(0.05,(n-tPutar)/1000); tPutar=n;
  if(!token||bingkaiAktif>=0) return;
  const T=tombolPutar, lc=kendaliPandang(); if(!lc) return;
  const putar=((T.arrowleft||T.q)?1:0)-((T.arrowright||T.e)?1:0); if(putar) lc.yawObject.rotation.y+=putar*1.5*dt;
  const maju=((T.w||T.arrowup)?1:0)-((T.s||T.arrowdown)?1:0), geser=(T.d?1:0)-(T.a?1:0); if(!maju&&!geser) return;
  const yaw=lc.yawObject.rotation.y, v=1.6*(T.shift?2:1)*dt, p=$('rig').object3D.position;
  p.x+=(-Math.sin(yaw)*maju+Math.cos(yaw)*geser)*v; p.z+=(-Math.cos(yaw)*maju-Math.sin(yaw)*geser)*v;
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

/* ================= v2.08 ================= */
Object.assign(WARNA,{Naturalisme:'#6f8f5a',Realisme:'#8a7a64',Romantisme:'#7b5a8c',Abstrak:'#c9902f',Nusantara:'#a9703a'});
let modeVR=false, gyroOn=false, geserIkut=true;     // geserIkut: geser ke kiri = pandangan ikut ke kiri

function buatGaze(){ if($('gaze')) return; const c=document.createElement('a-entity'); c.id='gaze';
  c.setAttribute('cursor','fuse:true;fuseTimeout:1200'); c.setAttribute('raycaster','objects:.klik;far:40'); c.setAttribute('position','0 0 -1');
  c.setAttribute('geometry','primitive:ring;radiusInner:0.014;radiusOuter:0.026'); c.setAttribute('material','color:#ffffff;shader:flat;opacity:0.9'); $('cam').append(c); }
function hapusGaze(){ const c=$('gaze'); if(c) c.remove(); }
$('scene').addEventListener('exit-vr',()=>{ if(modeVR) buatGaze(); });

function setLook(){   // pasang ulang kontrol pandang: sensor gerak HP (gyro) dan arah geser
  const cam=$('cam'), lc=kendaliPandang(), y=lc?lc.yawObject.rotation.y:0;
  cam.removeAttribute('look-controls'); cam.setAttribute('look-controls',{magicWindowTrackingEnabled:gyroOn,reverseTouchDrag:geserIkut});
  setTimeout(()=>arahKamera(y,0),80);
}
/* PERBAIKAN 2: pemasangan awal ditunda sampai scene A-Frame selesai dimuat */
siapScene(setLook);

async function aturMode(mode){
  if(mode==='vr'){
    try{ if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){
        if(await DeviceOrientationEvent.requestPermission()!=='granted'){ pesan('Izin sensor gerak ditolak. Mode VR memakai sensor HP.',7000); return; } } }
    catch(e){ pesan('Sensor gerak tidak dapat diaktifkan: '+e.message,7000); return; }
    modeVR=true; gyroOn=true; batalJalan(); joy={x:0,y:0}; joyId=null; setLook(); buatGaze(); bukaMenu(false);
    pesan('Mode VR: gerakkan HP untuk melihat sekeliling. Tatap lantai sekitar 1 detik untuk berjalan, tatap lukisan untuk memilihnya.',9000);
  } else { modeVR=false; gyroOn=false; setLook(); hapusGaze(); }
  segarMenu();
}

/* ---- Menu yang bisa dilipat ---- */
let bukaMenu, segarMenu;
try{ (function(){
  const hud=$('hud'), isi=document.createElement('div'); isi.id='hudIsi';
  const grup=(judul,id)=>{ const d=document.createElement('div'); d.className='grupMenu'; const t=document.createElement('b'); t.textContent=judul;
    const w=document.createElement('div'); w.className='baris'; if(id) w.id=id; d.append(t,w); isi.append(d); return w; };
  const tempat=grup('Tempat'), mode=grup('Mode gerak'), atur=grup('Pengaturan'), adm=grup('Admin','hudAdmin'); adm.parentElement.style.display='none';
  /* PERBAIKAN 3: ubah teks tombol SEBELUM dipindah. Setelah dipindah ke wadah menu yang belum terpasang di halaman,
     getElementById tidak lagi menemukannya (galat 'Cannot set properties of null (setting textContent)'). */
  $('bMaestro').textContent='Ruang Lukisan';
  ['[data-zona="A"]','[data-zona="C"]','[data-zona="D"]','#bMasuk','#bMaestro','#bAtas'].forEach(s=>{ const b=hud.querySelector(s); if(b) tempat.append(b); });
  const tb=(id,t,fn,tgt)=>{ const b=document.createElement('button'); b.id=id; b.className='alt'; b.textContent=t; b.onclick=fn; tgt.append(b); return b; };
  if(sentuh){ tb('mJoy','Joystick',()=>aturMode('joy'),mode); tb('mVR','VR layar penuh',()=>aturMode('vr'),mode); }
  if(sentuh||navigator.xr) tb('mKac','Kacamata VR (2 layar)',()=>{ try{ $('scene').enterVR(); }catch(e){ pesan('Perangkat ini belum mendukung mode kacamata.',6000); } },mode);
  if(!mode.children.length) mode.parentElement.style.display='none';
  if(sentuh) tb('mGeser','',()=>{ geserIkut=!geserIkut; setLook(); segarMenu(); },atur);
  tb('mDenah','Denah',()=>bukaDenah(),tempat);
  atur.append($('bBayang')); tb('mZoom','Zoom normal',()=>aturFov(80),atur);
  if(document.fullscreenEnabled) tb('mFull','Layar penuh',()=>{ document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen(); },atur);
  const bm=document.createElement('button'); bm.id='bMenu'; bm.textContent='\u2630 Menu'; bm.setAttribute('aria-expanded','false');
  bukaMenu=b=>{ isi.style.display=b?'flex':'none'; bm.setAttribute('aria-expanded',String(b)); };
  bm.onclick=()=>bukaMenu(isi.style.display!=='flex');
  segarMenu=()=>{ const j=$('mJoy'), v=$('mVR'), g=$('mGeser');
    if(j) j.setAttribute('aria-pressed',String(!modeVR)); if(v) v.setAttribute('aria-pressed',String(modeVR));
    if(g) g.textContent='Geser layar: '+(geserIkut?'ikut jari':'tarik dunia'); };
  hud.prepend(bm); hud.insertBefore(isi,$('pager')); bukaMenu(!sentuh); segarMenu();
})(); }catch(e){ pesan('Menu gagal dibuat: '+e.message,12000); }
document.head.insertAdjacentHTML('beforeend','<style>#hud{flex-direction:column;align-items:flex-start;gap:6px}#hudIsi{display:none;flex-direction:column;gap:8px;max-height:72vh;overflow:auto;max-width:calc(100vw - 40px)}'+
  '.grupMenu b{display:block;font-size:12px;color:#5b5346;margin:2px 0 3px}.grupMenu .baris{display:flex;flex-wrap:wrap;gap:6px}#hud button[aria-pressed="true"]{outline:3px solid #1d2a2f}</style>');

/* ================= v2.09 ================= */
/* ---- zoom: cubit dua jari (HP), roda mouse atau +/- (laptop) ---- */
let fov=80, jarak0=null;
function aturFov(v){ fov=Math.max(30,Math.min(90,v)); $('cam').setAttribute('camera','fov',fov); }
const jarakSentuh=e=>Math.hypot(e.touches[0].pageX-e.touches[1].pageX,e.touches[0].pageY-e.touches[1].pageY);
const diJoy=t=>t.target&&t.target.closest&&t.target.closest('#joy,.ui');
addEventListener('touchstart',e=>{ if(e.touches.length===2&&![...e.touches].some(diJoy)){ jarak0=jarakSentuh(e); $('cam').setAttribute('look-controls','touchEnabled',false); } },{passive:true});
addEventListener('touchmove',e=>{ if(jarak0===null||e.touches.length!==2) return; const d=jarakSentuh(e); aturFov(fov*jarak0/d); jarak0=d; if(e.cancelable) e.preventDefault(); },{passive:false});
addEventListener('touchend',e=>{ if(jarak0!==null&&e.touches.length<2){ jarak0=null; $('cam').setAttribute('look-controls','touchEnabled',true); } },{passive:true});
addEventListener('wheel',e=>{ if(e.target.tagName==='CANVAS') aturFov(fov+(e.deltaY>0?4:-4)); },{passive:true});
document.addEventListener('gesturestart',e=>e.preventDefault());
document.head.insertAdjacentHTML('beforeend','<style>a-scene,.a-canvas{touch-action:none}</style>');
siapScene(()=>$('rig').setAttribute('wasd-controls','enabled',false));   // gerak keyboard kini sepenuhnya oleh gerakKunci()

/* ---- denah nyata: gambar kanvas, dipakai di papan aula dan layar penuh ---- */
function gambarDenah(pos){
  const W=1280,H=820,c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d');
  const s=25, ox=50, oy=40, X=x=>ox+(x+10)*s, Z=z=>oy+(z+26)*s;
  g.fillStyle='#f4ecd8'; g.fillRect(0,0,W,H); g.strokeStyle='#3a2f26'; g.lineWidth=6; g.strokeRect(6,6,W-12,H-12);
  const R=(x1,z1,x2,z2,isi,garis,tebal)=>{ g.fillStyle=isi; g.fillRect(X(x1),Z(z1),(x2-x1)*s,(z2-z1)*s); if(garis){ g.strokeStyle=garis; g.lineWidth=tebal||4; g.strokeRect(X(x1),Z(z1),(x2-x1)*s,(z2-z1)*s); } };
  const T=(t,x,y,uk,warna,rata,tebal)=>{ g.font=(tebal?'bold ':'')+uk+'px Georgia, serif'; g.fillStyle=warna||'#2b2118'; g.textAlign=rata||'left'; g.textBaseline='middle'; g.fillText(t,x,y); };
  const B=(n,x,z)=>{ g.fillStyle='#8a2c1c'; g.beginPath(); g.arc(X(x),Z(z),15,0,7); g.fill(); T(String(n),X(x),Z(z)+1,19,'#fff','center',true); };
  const bagi=(t,x,y,w,uk,warna,lh)=>{ g.font=uk+'px Georgia, serif'; let baris='',yy=y; t.split(' ').forEach(k=>{ const u=baris?baris+' '+k:k; if(g.measureText(u).width>w&&baris){ T(baris,x,yy,uk,warna); yy+=lh; baris=k; } else baris=u; }); T(baris,x,yy,uk,warna); return yy; };
  R(-10,0,10,3.4,'#d9cfb6'); R(-10,-12,10,0,'#efe6cf','#3a2f26',5); R(-10,-26,10,-12,'#e1e8d6','#3a2f26',5);
  R(-9,-9,-4,-3,'#f2d9a8'); R(-1.8,-25.6,1.8,-13.2,'#d9a597');
  g.setLineDash([10,7]); R(10.8,-9,15.2,-3,'#e7dff0','#6b5b95',3); g.setLineDash([]);
  g.strokeStyle='#efe6cf'; g.lineWidth=10; g.beginPath(); g.moveTo(X(-2.5),Z(0)); g.lineTo(X(2.5),Z(0)); g.moveTo(X(-1.5),Z(-12)); g.lineTo(X(1.5),Z(-12)); g.stroke();   // pintu
  g.fillStyle='#c9902f';
  for(let n=0;n<4;n++){ const z=-14.5-n*3.2; g.fillRect(X(-10)+2,Z(z)-36,8,72); g.fillRect(X(10)-10,Z(z)-36,8,72); }
  [-5.5,5.5].forEach(x=>{ g.fillRect(X(x)-36,Z(-26)+2,72,8); g.fillRect(X(x)-36,Z(-12)-10,72,8); });
  for(let n=0;n<4;n++){ const z=-14.5-n*3.2; B(n+1,-8.6,z); B(n+5,8.6,z); }
  B(9,-5.5,-24.2); B(10,5.5,-24.2); B(11,-5.5,-13.4); B(12,5.5,-13.4);
  [-15,-18.2,-21.4,-24.2].forEach(z=>R(-0.6,z-0.6,0.6,z+0.6,'#8b867c','#3a2f26',2));
  g.fillStyle='#2f7d3a'; [[-8.7,-1.4],[8.7,-1.4],[-8.7,-10.6],[8.7,-10.6],[-8.3,-13.2],[8.3,-13.2],[-8.5,-24.9],[8.5,-24.9]].forEach(([x,z])=>{ g.beginPath(); g.arc(X(x),Z(z),8,0,7); g.fill(); });
  R(5.6,-10.25,7.4,-9.75,'#6d4a2b'); R(7.65,-20.2,8.15,-18.4,'#6d4a2b'); R(-8.15,-20.2,-7.65,-18.4,'#6d4a2b'); R(-8.7,-2.6,-4.3,-2.4,'#3a2f26');
  T('PLAZA',X(-6),Z(1.7),20,'#6b5a3a','center',true); T('AULA',X(5),Z(-6),22,'#6b5a3a','center',true); T('STUDIO AI',X(-6.5),Z(-6),17,'#7a5a1c','center',true); T('GALERI',X(13),Z(-6),17,'#6b5b95','center',true);
  B(1,0,1.7); B(2,2,-7.5); B(3,-6.5,-4.5); B(4,-3.2,-19); B(5,0,-19.8); B(6,13,-4.2);
  g.fillStyle='#2b2118'; g.beginPath(); g.moveTo(X(0),Z(3.2)-12); g.lineTo(X(0)-10,Z(3.2)+4); g.lineTo(X(0)+10,Z(3.2)+4); g.fill(); T('PINTU MASUK',X(4.3),Z(2.6),18,'#2b2118','center',true);
  g.beginPath(); g.arc(640,100,34,0,7); g.stroke(); T('U',640,88,26,'#2b2118','center',true); g.beginPath(); g.moveTo(640,104); g.lineTo(640,128); g.lineWidth=5; g.stroke();
  T('DENAH MUSEUM KEUN',700,150,44,'#2b2118','left',true); T('Kurator: Diah Ayu Kurniawati',700,192,22,'#6b5a3a');
  [['Plaza dan pintu masuk','Titik awal kunjungan'],['Aula','Papan denah, bangku, tanaman'],['Studio AI','Membuat gambar dengan bantuan AI'],
   ['Ruang Lukisan Era Modernisme','12 bingkai, Romantisme sampai Abstrak'],['Patung dan Pahatan','Empat podium di tengah ruang lukisan'],['Galeri Bersama','Karya siswa (zona di luar gedung, sementara)']]
   .forEach(([a,b],n)=>{ const y=250+n*72; g.fillStyle='#8a2c1c'; g.beginPath(); g.arc(718,y,16,0,7); g.fill(); T(String(n+1),718,y+1,20,'#fff','center',true); T(a,750,y-10,24,'#2b2118','left',true); bagi(b,750,y+17,500,19,'#5b4a30',22); });
  g.fillStyle='#c9902f'; g.fillRect(700,704,8,28); T('Bingkai lukisan (angka = nomor bingkai)',722,718,18,'#2b2118');
  g.fillStyle='#8b867c'; g.fillRect(700,742,28,20); T('Podium',740,752,18,'#2b2118'); g.fillStyle='#2f7d3a'; g.beginPath(); g.arc(850,752,9,0,7); g.fill(); T('Tanaman',868,752,18,'#2b2118');
  g.fillStyle='#d6322a'; g.beginPath(); g.arc(1010,752,10,0,7); g.fill(); T('Anda di sini',1030,752,18,'#2b2118');
  g.fillStyle='#2b2118'; g.fillRect(700,786,5*s,6); T('5 m',700+5*s+10,789,17,'#2b2118');
  if(pos){ const px=Math.max(X(-10.8),Math.min(X(15.5),X(pos.x))), pz=Math.max(Z(-26),Math.min(Z(3.4),Z(pos.z)));
    g.fillStyle='#d6322a'; g.strokeStyle='#fff'; g.lineWidth=4; g.beginPath(); g.arc(px,pz,13,0,7); g.fill(); g.stroke();
    if(!pos.statis){ const dx=-Math.sin(pos.yaw), dy=-Math.cos(pos.yaw); g.beginPath(); g.moveTo(px+dx*30,pz+dy*30); g.lineTo(px-dy*10+dx*8,pz+dx*10+dy*8); g.lineTo(px+dy*10+dx*8,pz-dx*10+dy*8); g.closePath(); g.fill(); }
    T('ANDA DI SINI',px+(px>X(5)?-22:22),pz-24,17,'#d6322a',px>X(5)?'right':'left',true); }
  return c.toDataURL('image/png');
}
let texDenah=null; function denahTex(){ return texDenah||(texDenah=gambarDenah({x:-6.5,z:-2.5,statis:true})); }
document.body.insertAdjacentHTML('beforeend','<div id="denahBox" class="ui" role="dialog" aria-label="Denah museum" style="display:none;inset:8px;z-index:25;overflow:auto;background:#f4ecd8;padding:8px"><div style="display:flex;gap:6px;margin-bottom:6px"><button id="dnZoom">Perbesar</button><button id="dnTutup" class="alt">Tutup</button></div><img id="dnImg" alt="Denah museum" style="width:100%;display:block"></div>');
function bukaDenah(){ const p=$('rig').object3D.position, lc=kendaliPandang();
  $('dnImg').src=gambarDenah({x:p.x,z:p.z,yaw:lc?lc.yawObject.rotation.y:0}); $('dnImg').style.width='100%'; $('dnZoom').textContent='Perbesar'; $('denahBox').style.display='block'; if(bukaMenu) bukaMenu(false); }
$('dnTutup').onclick=()=>{ $('denahBox').style.display='none'; };
$('dnZoom').onclick=()=>{ const i=$('dnImg'), b=i.style.width==='100%'; i.style.width=b?'220%':'100%'; $('dnZoom').textContent=b?'Perkecil':'Perbesar'; };
addEventListener('keydown',e=>{ if(e.key==='Escape') $('denahBox').style.display='none'; });

try{ $('ver').textContent+=' \u00b7 museum 2.09c'; }catch(e){}   // penanda: museum.js termuat sampai akhir

/* ================= v2.12: menu ringkas gaya tombol 3D. Deretan tombol grup ke samping, sub menu turun ke bawah (tampilan saja; isi menu tidak diubah) ================= */
document.head.insertAdjacentHTML('beforeend',`<style>
#hud.ui{background:transparent;box-shadow:none;padding:0;border-radius:0;flex-direction:row;flex-wrap:wrap;align-items:flex-start;gap:8px;max-width:calc(100vw - 20px);pointer-events:none;
  top:max(10px,env(safe-area-inset-top,0px));left:max(10px,env(safe-area-inset-left,0px))}
#hud.ui button,#pager,.grupMenu .gHead,.grupMenu .baris{pointer-events:auto}
#hud.ui button{--a:#3f7fa0;--b:#2f6f8f;--s:#1b4760;color:#fff;font-weight:600;font-size:14px;min-height:34px;padding:6px 14px;border:0;border-radius:10px;
  background:linear-gradient(180deg,var(--a) 0%,var(--b) 100%);text-shadow:0 1px 1px rgba(0,0,0,.45);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 3px 0 var(--s),0 5px 8px rgba(0,0,0,.28);transition:transform .08s,box-shadow .08s,filter .12s}
#hud.ui button.alt{--a:#6f7e84;--b:#586870;--s:#3a464b}
#hud.ui button:hover{filter:brightness(1.08)}
#hud.ui button:active,#hud.ui #bMenu[aria-expanded="true"]{transform:translateY(2px);box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 1px 0 var(--s),0 2px 4px rgba(0,0,0,.25)}
#hud.ui #hudIsi{flex-direction:row;flex-wrap:wrap;align-items:flex-start;gap:8px;width:auto;max-width:none;max-height:none;overflow:visible;padding:0;margin:0;background:none;border:0;box-shadow:none;border-radius:0;pointer-events:none}
.grupMenu .gHead{--a:#3f7fa0;--b:#2f6f8f;--s:#1b4760;display:inline-flex;align-items:center;gap:6px;margin:0;min-height:34px;padding:6px 12px;border-radius:10px;color:#fff;font-size:14px;font-weight:600;letter-spacing:0;text-transform:none;
  background:linear-gradient(180deg,var(--a) 0%,var(--b) 100%);text-shadow:0 1px 1px rgba(0,0,0,.45);cursor:pointer;user-select:none;-webkit-user-select:none;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 3px 0 var(--s),0 5px 8px rgba(0,0,0,.28);transition:transform .08s,box-shadow .08s,filter .12s}
.grupMenu .gHead:hover{filter:brightness(1.08)}
.grupMenu .gHead:focus-visible{outline:3px solid #f2b705}
.grupMenu .gHead::after{content:"\\25BE";font-size:12px;transition:transform .15s}
.grupMenu.buka .gHead{transform:translateY(2px);box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 1px 0 var(--s),0 2px 4px rgba(0,0,0,.25);filter:brightness(.93)}
.grupMenu.buka .gHead::after{transform:rotate(180deg)}
.grupMenu:not(.buka) .baris{display:none}
.grupMenu.buka .baris{display:grid;grid-template-columns:minmax(0,1fr);gap:6px;position:absolute;left:0;top:100%;margin-top:8px;width:max-content;min-width:170px;max-width:calc(100vw - 20px);
  max-height:min(62vh,calc(100vh - 170px));overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;padding:0 2px 8px;animation:hudMuncul .14s ease-out}
.grupMenu.buka .baris.dua{grid-template-columns:repeat(2,minmax(0,1fr));width:min(300px,calc(100vw - 20px))}
#hud.ui .grupMenu .baris button{width:100%;min-height:34px;padding:6px 12px;font-size:13px;line-height:1.2;white-space:normal}
#pager{background:var(--paper);padding:3px 8px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.25)}
@keyframes hudMuncul{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
@media (max-width:640px){#hud.ui #hudIsi{flex-basis:100%}}
@media (max-height:480px){.grupMenu.buka .baris{max-height:calc(100vh - 92px)}.grupMenu.buka .baris.dua{width:min(440px,calc(100vw - 20px));grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (pointer:coarse){#hud.ui button,.grupMenu .gHead{min-height:40px}#hud.ui .grupMenu .baris button{min-height:44px}.grupMenu.buka .baris{gap:8px}}
@media (prefers-reduced-motion:reduce){.grupMenu.buka .baris{animation:none}#hud.ui button,.grupMenu .gHead,.grupMenu .gHead::after{transition:none}}
</style>`);
/* Dropdown: judul grup menjadi tombol. Satu grup terbuka sekaligus; semua tertutup di awal. Lebih dari 5 item memakai 2 kolom. */
try{ const isiM=$('hudIsi'); if(isiM){
  const grups=[...isiM.querySelectorAll('.grupMenu')];
  const set=(g,b)=>{ g.classList.toggle('buka',b); const h=g.querySelector('.gHead'); if(h) h.setAttribute('aria-expanded',String(b));
    if(b){ const br=g.querySelector('.baris'); if(br) br.classList.toggle('dua',br.children.length>5); } };
  const tutupSemua=()=>grups.forEach(g=>set(g,false));
  const ganti=g=>{ const b=!g.classList.contains('buka'); tutupSemua(); if(b) set(g,true); };
  grups.forEach(g=>{ const h=g.querySelector('b'); if(!h) return; h.classList.add('gHead'); h.setAttribute('role','button'); h.tabIndex=0; h.setAttribute('aria-expanded','false');
    h.addEventListener('click',()=>ganti(g)); h.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); ganti(g); } }); });
  document.addEventListener('pointerdown',e=>{ if(!(e.target.closest&&e.target.closest('#hud'))) tutupSemua(); },true);   /* ketuk di luar menu: sub menu menutup */
  document.addEventListener('keydown',e=>{ if(e.key==='Escape') tutupSemua(); });
  const bm=$('bMenu'); if(bm) bm.addEventListener('click',tutupSemua);
  /* Layar sentuh: setelah memilih tempat (grup pertama), seluruh menu menutup sendiri supaya layar tidak tertutup. Pengaturan tetap terbuka. */
  if(sentuh) isiM.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('button'); if(!b) return;
    if(b.closest('.grupMenu')===grups[0]){ tutupSemua(); setTimeout(()=>{ if(bukaMenu) bukaMenu(false); },150); } });
} }catch(e){}
