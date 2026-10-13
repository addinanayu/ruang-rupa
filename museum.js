/* Ruang Rupa v2.22 (optimasi kecepatan, plakat karya siswa gaya museum; fitur sampai v2.25 tetap) - Museum 3D. Dimuat SETELAH skrip utama di index.html.
   Memakai: $, gs, pesan, POS, pindah. Menyediakan: bangunMuseum(). */
const WARNA = { Naturalisme:'#6f8f5a', Realisme:'#8a7a64', Romantisme:'#7b5a8c', Abstrak:'#c9902f', Impresionisme:'#8fb3a3', Kubisme:'#b08a5a', Ekspresionisme:'#b3412f', Surealisme:'#6b5b95', Nusantara:'#c9902f' };
const RUANG_TAHAP1 = 'Impresionisme';           // Tahap 1: satu ruang saja
let koleksi = [], bingkaiAktif = -1, daftarBingkai = [], dekatPintu = false, dariAtas = false, simpanPos = null;
const kurangiGerak = matchMedia('(prefers-reduced-motion: reduce)').matches;
POS.A = [0, -0.47, 16]; POS.C = [-4.6, 0, -5.6]; POS.D = [12, 0, -6];   // v2.16: Studio AI = booth di sudut barat aula; Galeri Karya Siswa = sayap timur

/* PERBAIKAN: status tombol keyboard harus dideklarasikan SEBELUM cekTabrak berjalan (menghindari galat 'tPutar before initialization') */
const tombolPutar={}; let tPutar=performance.now(); const vKunci={x:0,z:0};   // v2.20: kecepatan gerak halus; harus di atas karena cekTabrak langsung memanggil gerakKunci
let joy={x:0,y:0}, tJoy=performance.now(), joyId=null;   // v2.22b: harus di atas karena cekTabrak langsung memanggil gerakJoy()

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
<div class="aksi"><button id="bKerjakan">Kerjakan</button><button id="bNext" class="alt">Karya berikutnya</button><button id="bKembali" class="alt">Kembali</button></div></div>`);
$('hud').insertAdjacentHTML('beforeend', '<button id="bMasuk" class="alt">Masuk gedung</button><button id="bAtas" class="alt">Lihat dari atas</button>');
$('hud').insertAdjacentHTML('beforeend', '<span id="hudPoin" style="display:none;font-weight:700" role="status" aria-live="polite"></span>');
document.querySelector('[data-zona="A"]').textContent = 'Museum';
document.querySelector('[data-zona="D"]').textContent = 'Galeri Karya Siswa';

/* ---------- Pembantu pembuat entitas ---------- */
function el(parent, tag, at, kelas){
  const e = document.createElement(tag); for(const k in at) e.setAttribute(k, at[k]);
  if(kelas) e.classList.add(kelas); parent.append(e); return e;
}
const kotak = (p,x,y,z,w,h,d,c,at={}) => el(p,'a-box',Object.assign({position:`${x} ${y} ${z}`,width:w,height:h,depth:d,color:c},at));
const teks = (p,v,x,y,z,w,c='#222',ry=0) => el(p,'a-text',{value:v,align:'center',width:w,position:`${x} ${y} ${z}`,rotation:`0 ${ry} 0`,color:c,side:'double'});

/* ---------- v2.25: huruf khusus ----------
   "MUSEUM SENI" memakai Versailles, nama kurator memakai Moontime.
   A-Frame hanya punya font MSDF bawaan, jadi teks ini digambar di canvas lalu dipasang sebagai tekstur bidang.
   Berkas font: taruh di folder fonts/ sejajar index.html (Versailles.ttf, Moontime.ttf), atau pasang di perangkat (local()). */
const FONT_MUSEUM  = "Versailles, 'Versailles LT Std', Georgia, 'Times New Roman', serif";
const FONT_KURATOR = "Moontime, 'Brush Script MT', 'Segoe Script', cursive";
document.head.insertAdjacentHTML('beforeend', `<style>
@font-face{font-family:'Versailles';src:local('Versailles'),local('Versailles LT Std'),local('Versailles-Roman'),url('fonts/Versailles.ttf') format('truetype'),url('fonts/Versailles.otf') format('opentype'),url('fonts/Versailles.woff2') format('woff2');font-display:swap}
@font-face{font-family:'Moontime';src:local('Moontime'),local('Moontime Regular'),url('fonts/Moontime.ttf') format('truetype'),url('fonts/Moontime.otf') format('opentype'),url('fonts/Moontime.woff2') format('woff2');font-display:swap}
</style>`);
const _teksFont = [];
/* Bidang teks bertekstur canvas. pw,ph = ukuran bidang (m). opt.lebar = bagian lebar yang boleh dipakai huruf;
   opt.timbul=[warna,jarak m,lapis] = bayangan gelap berlapis; opt.cahaya=[warna,dx m,dy m] = tepi terang di belakang huruf. */
function teksFont(p,v,x,y,z,pw,ph,fam,warna,opt={}){
  const e = el(p,'a-plane',{position:`${x} ${y} ${z}`,width:pw,height:ph});
  const gambar = ()=>{
    const pm=Math.min(sentuh?100:200,2048/pw), cw=Math.round(pw*pm), ch=Math.round(ph*pm), c=document.createElement('canvas'); c.width=cw; c.height=ch;
    const g=c.getContext('2d'); g.textAlign='center'; g.textBaseline='middle';
    let uk=ch*0.8; g.font=`${uk}px ${fam}`; const w=g.measureText(v).width, maks=cw*(opt.lebar||0.9); if(w>maks) uk*=maks/w; g.font=`${uk}px ${fam}`;
    const cx=cw/2, cy=ch/2+uk*0.04;
    if(opt.cahaya){ g.fillStyle=opt.cahaya[0]; g.fillText(v,cx+opt.cahaya[1]*pm,cy+opt.cahaya[2]*pm); }
    if(opt.timbul){ g.fillStyle=opt.timbul[0]; for(let k=opt.timbul[2];k>=1;k--) g.fillText(v,cx+opt.timbul[1]*k*pm,cy+opt.timbul[1]*k*pm); }
    g.fillStyle=warna; g.fillText(v,cx,cy);
    e.setAttribute('material',{src:c.toDataURL(),shader:'flat',transparent:true,side:'double',depthWrite:false});
  };
  gambar(); _teksFont.push(gambar); return e;
}
/* Setelah font selesai dimuat: gambar ulang semua teks khusus dan papan denah di aula */
function segarHuruf(){
  _teksFont.forEach(f=>f()); texDenah=null;
  document.querySelectorAll('.denahPapan').forEach(e=>e.setAttribute('material',{src:denahTex(),shader:'flat'}));
}
Promise.all(['64px Versailles','64px Moontime'].map(f=>document.fonts.load(f).catch(()=>{}))).then(segarHuruf);

/* ---------- Gedung: plaza, fasad, pintu, aula ---------- */
function bangunGedung(g){
  const batu = '#d8cdb8', gelap = '#4a3f33';
  /* v2.18 T11 (Opsi B): tanah y -0,47; plaza atas -0,43; tiga undak naik 0,17 (atas -0,30, -0,13, +0,04); atas undak = lantai dalam (+0,04) */
  kotak(g,0,-0.45,12,40,0.04,22,'#bfb5a0',{class:'klik lantai'});                         // plaza
  [-0.30,-0.13,0.04].forEach((t,i)=>{ const h=t+0.47; kotak(g,0,t-h/2,4.1-i*0.9,12-i*1.2,h,1.6,batu); });   // tangga: dari tanah sampai atas undak
  kotak(g,0,-0.215,0.75,16.8,0.51,1.5,batu);                                                // ambang batu depan pintu (v2.19 T17a: z 0..1,5, menutup celah z 0..0,3), atas +0,04
  [-6.6,6.6].forEach(x=>kotak(g,x,-0.215,1.8,3.6,0.51,0.6,batu));                          // sisi serambi di bawah kolom (z 1,5..2,1)
  kotak(g,0,-0.235,-13,20.6,0.47,26.6,gelap);                                              // alas gedung utama: dinding tidak melayang di atas tanah
  kotak(g,19.6,-0.235,-6,18.6,0.47,12.6,gelap);                                            // alas sayap timur
  // dinding depan (celah pintu di tengah, lebar 3, tinggi 4)
  kotak(g,-6.25,4,0,7.5,8,0.6,batu); kotak(g,6.25,4,0,7.5,8,0.6,batu); kotak(g,0,6,0,5,4,0.6,batu);
  kotak(g,-10,4,-13,0.6,8,26,batu); kotak(g,10,4,-2.25,0.6,8,4.5,batu); kotak(g,10,4,-16.75,0.6,8,18.5,batu); kotak(g,10,6,-6,0.6,4,3,batu);   /* v2.16: bukaan sayap z -7.5..-4.5, lintel y 4..8 */ kotak(g,0,4,-26,20.6,8,0.6,batu); // sisi + belakang
  kotak(g,0,8.3,-12,22,0.6,28,gelap);                               // atap
  kotak(g,10.15,0.02,-6,0.3,0.04,3,'#e9e1d0');                                             // v2.19 T17b: ambang x 10,0..10,3 pada bukaan sayap (z -7,5..-4,5)
  kotak(g,0,6,-6,20,0.1,12,gelap); kotak(g,0,5,-19,20,0.1,14,gelap);                       // v2.19 T13: plafon aula (y 6,0) dan Ruang Lukisan (y 5,0); atap tetap
  kotak(g,0,0.02,-13,20,0.04,26,'#e9e1d0',{class:'klik lantai'});                         // lantai dalam
  for(let i=-4;i<=4;i+=2){ if(i===0) continue; const cx=i*1.9;
    el(g,'a-cylinder',{position:`${cx} 4 1.6`,radius:0.4,height:8,color:'#efe8d9'});
    kotak(g,cx,0.19,1.6,1.0,0.3,1.0,'#efe8d9'); kotak(g,cx,7.85,1.6,1.0,0.3,1.0,'#efe8d9'); }   // v2.19 T12: alas (atas y 0,34) dan kepala kolom (atas y 8,0)
  kotak(g,0,9.7,0.7,8,1.7,0.7,'#e4d6b4'); kotak(g,0,10.58,0.7,8.2,0.08,0.78,'#c9a227'); kotak(g,0,8.82,0.7,8.2,0.08,0.78,'#c9a227');   // v2.20: papan nama dimajukan (muka z 1,05) ke depan pediment, bingkai emas
  teksFont(g,'MUSEUM SENI',0,9.7,1.09,7.6,1.5,FONT_MUSEUM,'#6f4a0c',{lebar:0.92,cahaya:['#f8f0da',0.02,0.02]});   // v2.16: duduk di tepi atap (tidak melayang), nama gedung
  // pintu dua daun; tiap daun bergeser ke samping saat terbuka
  // v2.15: lubang pintu lebar 5 (x -2.5..2.5), tinggi 4. Tiap daun 2.54 x 4.02 supaya menutup rapat tanpa celah ke dinding/ambang.
  const pk = el(g,'a-box',{id:'daunK',position:'-1.25 2 0.1',width:2.54,height:4.02,depth:0.2,color:'#6d4a2b'});
  const pn = el(g,'a-box',{id:'daunN',position:'1.25 2 0.1',width:2.54,height:4.02,depth:0.2,color:'#6d4a2b'});
  [pk,pn].forEach(d=>{ el(d,'a-plane',{position:'0 0.25 0.105',width:2.1,height:3.1,color:'#c9a227'}); el(d,'a-plane',{position:'0 0.25 0.108',width:1.85,height:2.85,color:'#8fb0b8'}); });   // v2.21: bingkai emas + kaca
  // dinding aula/ruang: sekat antara aula (z 0..-12) dan Ruang Maestro (z -12..-26), celah pintu tengah
  kotak(g,-5.75,4,-12,8.5,8,0.4,batu); kotak(g,5.75,4,-12,8.5,8,0.4,batu); kotak(g,0,6,-12,3,4,0.4,batu);
  // aula: papan denah + penunjuk
  // papan denah berdiri di atas dua tiang berkaki; tulisan di KEDUA sisi supaya tidak terbalik dari arah mana pun
  kotak(g,6.2,2.2,-2.5,4.4,2.8,0.2,gelap);
  kotak(g,4.4,1.1,-2.5,0.16,2.2,0.16,gelap); kotak(g,8.0,1.1,-2.5,0.16,2.2,0.16,gelap);
  kotak(g,4.4,0.05,-2.5,0.8,0.1,0.8,gelap); kotak(g,8.0,0.05,-2.5,0.8,0.1,0.8,gelap);
  [[-2.39,0],[-2.61,180]].forEach(([zz,ry])=>el(g,'a-plane',{position:`6.2 2.2 ${zz}`,rotation:`0 ${ry} 0`,width:4.2,height:2.68,material:{src:denahTex(),shader:'flat'}},'denahPapan'));   // denah gambar, kedua sisi

  kotak(g,0,0.06,-7,0.6,0.04,9,'#d9a21b');                           // jalur emas ke pintu Ruang Maestro
  kotak(g,-1.6,2,-12,0.2,4,0.5,gelap); kotak(g,1.6,2,-12,0.2,4,0.5,gelap); // kusen pintu
  kotak(g,0,5.0,-11.7,6.5,1.4,0.2,gelap); teksFont(g,'MUSEUM SENI',0,5.3,-11.55,6.2,0.9,FONT_MUSEUM,'#f3e6c8',{lebar:0.9,timbul:['#3a2a12',0.012,4]}); teksFont(g,'Kurator : Diah Ayu Kurniawati',0,4.6,-11.55,5.6,0.6,FONT_KURATOR,'#f3e6c8',{lebar:0.92});   // v2.19 T13: turun 0,6 agar di bawah plafon aula
  // lampu hangat palsu (tanpa bayangan)
  el(g,'a-light',{type:'point',color:'#ffe2b0',intensity:0.5,distance:20,position:'0 6 -6'});
  el(g,'a-light',{type:'point',color:'#fff4dc',intensity:0.6,distance:24,position:'0 6 -19'});
  return {pk,pn};
}
/* v2.19 T15: fasad dari bentuk dasar bersama (tanpa lampu dan model baru): plint, kornis, pediment 18 derajat, jendela atas. */
function bangunFasad(g){
  const batu='#d8cdb8', gelap='#4a3f33', P=0.45;
  // plint 0,45 keliling gedung (menonjol 0,12); celah pintu depan (x -2,5..2,5) tidak ditutup
  [[-6.46,0.36,7.92,0.12],[6.46,0.36,7.92,0.12],[0,-26.36,20.84,0.12],[19.6,0.36,18.6,0.12],[19.6,-12.36,18.6,0.12]].forEach(([x,z,w,d])=>kotak(g,x,P/2,z,w,P,d,gelap));
  kotak(g,-10.36,P/2,-12.94,0.12,P,26.72,gelap); kotak(g,10.36,P/2,-19.3,0.12,P,14,gelap); kotak(g,28.96,P/2,-6,0.12,P,12.84,gelap);
  // kornis 0,4 di bawah tepi atap, menonjol 0,3; bawahnya turun 0,1 agar tidak sebidang dengan sisi bawah atap (tidak berkedip)
  kotak(g,0,8.15,-12,22.6,0.5,28.6,batu); kotak(g,19.65,8.15,-6,19.9,0.5,13.2,batu);
  // pediment 18 derajat di atas portik: bidang segitiga + dua balok miring di sepanjang lereng
  const R=10.3, A=18*Math.PI/180, H=R*Math.tan(A), L=R/Math.cos(A), y0=8.6;
  el(g,'a-entity',{geometry:`primitive:triangle;vertexA:${-R} ${y0} 0.35;vertexB:${R} ${y0} 0.35;vertexC:0 ${y0+H} 0.35`,material:`color:${batu};side:double`});
  kotak(g,-R/2,y0+H/2,0.35,L,0.28,0.5,gelap,{rotation:'0 0 18'}); kotak(g,R/2,y0+H/2,0.35,L,0.28,0.5,gelap,{rotation:'0 0 -18'});
  // jendela atas: aula (3, dinding barat) dan Ruang Lukisan (3 di tiap dinding samping). Ceruk dangkal 0,3 + bidang krem 'flat' (bukan lampu).
  const jendela=(sisi,z,y)=>{
    kotak(g,sisi*10.45,y,z,0.3,1.4,1.7,gelap);
    el(g,'a-plane',{position:`${sisi*10.61} ${y} ${z}`,rotation:`0 ${sisi>0?90:-90} 0`,width:1.4,height:1.1,material:'color:#fff1c8;shader:flat'});   // sisi luar
    el(g,'a-plane',{position:`${sisi*9.69} ${y} ${z}`,rotation:`0 ${sisi>0?-90:90} 0`,width:1.4,height:1.1,material:'color:#fff1c8;shader:flat'}); };   // sisi dalam
  [-2.5,-6,-9.5].forEach(z=>jendela(-1,z,5));
  [-15.5,-19,-22.5].forEach(z=>{ jendela(-1,z,3.95); jendela(1,z,3.95); });
  // v2.21 (tampilan saja): atap pelana gedung utama 18 derajat (sama dengan pediment) berwarna krem-pasir, bingkai tepi gelap
  const crm='#d3c19c', tep='#6a6258', Hu=R*Math.tan(A), Lu=R/Math.cos(A)+0.1, zc=-13.07, dz=26.85;
  [-1,1].forEach(s=>{ kotak(g,s*(R/2+0.03),y0+Hu/2-0.005,zc,Lu,0.2,dz,crm,{rotation:`0 0 ${-s*18}`}); kotak(g,s*(R+0.05),8.72,zc,0.2,0.25,dz,tep); });
  kotak(g,0,y0+Hu+0.1,zc,0.3,0.2,dz,tep);
  el(g,'a-entity',{geometry:`primitive:triangle;vertexA:${-R} ${y0} -26.4;vertexB:${R} ${y0} -26.4;vertexC:0 ${y0+Hu} -26.4`,material:`color:${batu};side:double`});
  // atap sayap timur: pelana landai 10 derajat, bubungan sejajar sumbu x (ukuran sayap tetap)
  const Aw=10*Math.PI/180, Hw=6.3*Math.tan(Aw), Lw=6.3/Math.cos(Aw)+0.1;
  [[-2.85,10],[-9.15,-10]].forEach(([z,rx])=>kotak(g,19.6,8.6+Hw/2+0.1,z,18.6,0.2,Lw,crm,{rotation:`${rx} 0 0`}));
  kotak(g,19.6,8.6+Hw+0.12,-6,18.6,0.2,0.3,tep); [0.35,-12.35].forEach(z=>kotak(g,19.6,8.72,z,18.6,0.25,0.2,tep));
  el(g,'a-entity',{geometry:`primitive:triangle;vertexA:28.95 8.6 0.3;vertexB:28.95 8.6 -12.3;vertexC:28.95 ${8.6+Hw} -6`,material:`color:${batu};side:double`});
  // pilaster sudut, bingkai pintu emas, kepala/alas kolom bergaya ionik, pot cemara di serambi
  [-9.6,9.6].forEach(x=>kotak(g,x,4.2,0.45,0.7,8,0.3,'#e8dcc3'));
  kotak(g,0,4.1,0.4,5.5,0.25,0.2,'#c9a227'); [-2.65,2.65].forEach(x=>kotak(g,x,2.05,0.4,0.2,4.1,0.2,'#c9a227'));
  [-7.6,-3.8,3.8,7.6].forEach(cx=>{ el(g,'a-cylinder',{position:`${cx} 7.7 1.6`,radius:0.46,height:0.12,color:'#efe8d9'}); el(g,'a-cylinder',{position:`${cx} 0.39 1.6`,radius:0.5,height:0.1,color:'#efe8d9'});
    [-0.36,0.36].forEach(d=>el(g,'a-cylinder',{position:`${cx+d} 7.85 2.13`,rotation:'90 0 0',radius:0.17,height:0.08,color:'#e4dac5','segments-radial':16})); });
  [-8.9,-5.7,5.7,8.9].forEach(x=>{ el(g,'a-cylinder',{position:`${x} 0.24 1.25`,radius:0.2,height:0.4,color:'#b5562f'}); el(g,'a-cone',{position:`${x} 1.1 1.25`,'radius-bottom':0.24,'radius-top':0.01,height:1.4,color:'#2f5d34','segments-radial':8}); });
}
let daun = null;
function bukaPintu(buka){
  const t = kurangiGerak ? 0 : 600, ke = buka ? 3.9 : 1.25;   // terbuka: daun masuk ke ketebalan dinding (x 2.5..5)
  [['daunK',-1],['daunN',1]].forEach(([id,s])=>{ const d=$(id); if(!d) return;
    d.removeAttribute('animation'); d.setAttribute('animation',{property:'position',to:`${s*ke} 2 0.1`,dur:t}); });
}
function fadeKe(fn){ const f=$('fade'); f.style.opacity=1; setTimeout(()=>{ fn(); f.style.opacity=0; }, kurangiGerak?0:500); }
function masukGedung(){ bukaPintu(true); fadeKe(()=>{ batalJalan(); $('rig').setAttribute('position','0 0 -4'); }); }
$('bMasuk').onclick = masukGedung;
setInterval(()=>{ if(zonaAktif!=='A'||!token) return; const p=$('rig').object3D.position;
  const d = p.z<12 && p.z>-1.5 && Math.abs(p.x)<4; if(d!==dekatPintu){ dekatPintu=d; bukaPintu(d||p.z<=0); } }, 250);

/* ---------- Ruang Maestro ---------- */
/* v2.24: tekstur plakat bersudut membulat (tepi emas + dasar cokelat tua), digambar di canvas, di-cache per ukuran */
const _texPlk={};
function texPlakat(w,h,r){
  const key=w.toFixed(2)+'x'+h.toFixed(2)+'r'+r; if(_texPlk[key]) return _texPlk[key];
  const pm=260, cw=Math.round(w*pm), ch=Math.round(h*pm), c=document.createElement('canvas'); c.width=cw; c.height=ch; const g=c.getContext('2d');
  const rr=(x,y,ww,hh,rad)=>{ g.beginPath(); g.moveTo(x+rad,y); g.arcTo(x+ww,y,x+ww,y+hh,rad); g.arcTo(x+ww,y+hh,x,y+hh,rad); g.arcTo(x,y+hh,x,y,rad); g.arcTo(x,y,x+ww,y,rad); g.closePath(); };
  const R=r*pm, bt=0.025*pm;
  rr(0,0,cw,ch,R); g.fillStyle='#c9a24a'; g.fill();
  rr(bt,bt,cw-2*bt,ch-2*bt,Math.max(2,R-bt)); g.fillStyle='#2b1d12'; g.fill();
  rr(bt*2.4,bt*2.4,cw-4.8*bt,ch-4.8*bt,Math.max(2,R-bt*2.4)); g.strokeStyle='rgba(201,162,74,0.5)'; g.lineWidth=1.5; g.stroke();
  return _texPlk[key]=c.toDataURL();
}
function plakatBulat(p){ return el(p,'a-plane',{material:{transparent:true,alphaTest:0.02,roughness:0.6}}); }
function aturPlakat(e,w,h,r,pos){ e.setAttribute('width',w); e.setAttribute('height',h); e.setAttribute('position',pos); e.setAttribute('material',{src:texPlakat(w,h,r),transparent:true,alphaTest:0.02,roughness:0.6}); }
function bingkaiLukisan(g, k, i, x, z, ry, yaw, sx, sz){
  const kosong = !k, w = k && WARNA[k.aliran] || '#9a9082';
  // v2.24: pusat y 1,85; kanvas maks 2,0 x 1,5; plakat aliran dan info bersudut membulat, huruf diperbesar
  const f = el(g,'a-entity',{position:`${x} 1.85 ${z}`,rotation:`0 ${ry} 0`});
  const bingkai = el(f,'a-box',{depth:0.14,color:'#5a3a22'});
  const lekuk = el(f,'a-plane',{position:'0 0 0.076',color:'#33200f'});
  const garis = el(f,'a-plane',{position:'0 0 0.082',color:'#c9a24a'});
  const celah = el(f,'a-plane',{position:'0 0 0.088',color:'#22160b'});
  const kanvas = el(f,'a-plane',{position:'0 0 0.094',color:kosong?'#e7e1d3':w,class:'klik',role:'img',
    'aria-label':kosong?'Bingkai kosong':`${k.judul}, ${k.pelukis}`});
  let im=null;
  if(k && k.gambar){ im=el(f,'a-image',{position:'0 0 0.1',src:kecil(k.gambar,1024),class:'klik'});
    im.addEventListener('click',()=>{ if(klikSah()) buka(i); }); pulihGambar(im,k.gambar,1024); }
  // papan aliran
  const adaAliran = !kosong && !!k.aliran;
  const pAl = adaAliran ? plakatBulat(f) : null;
  const tAl = adaAliran ? teks(f,String(k.aliran).toUpperCase(),0,0,0.07,4.2,'#e9c46a') : null;
  // lampu sorot: kepala lampu miring ke lukisan, lensa menyala, kerucut cahaya tipis
  const lengan = el(f,'a-box',{width:0.05,height:0.05,depth:0.56,color:'#2b2118'});
  const kepala = el(f,'a-entity',{});
  el(kepala,'a-cylinder',{radius:0.07,height:0.2,color:'#2b2118'});
  el(kepala,'a-cylinder',{radius:0.055,height:0.012,position:'0 -0.103 0',material:'color:#fff1c8;emissive:#ffe9a8;emissiveIntensity:1;shader:flat'});
  const sinar = el(f,'a-cone',{'radius-top':0.03,'open-ended':true,material:'shader:flat;color:#fff0c8;opacity:0.07;transparent:true;depthWrite:false;side:double'});
  if(kosong) el(f,'a-text',{value:'Segera hadir',align:'center',width:1.8,wrapCount:14,position:'0 0 0.12',color:'#6b6458'});
  // plakat info: judul (emas, besar) + "tahun | pelukis"
  const judul = kosong ? 'Segera hadir' : String(k.judul).slice(0,44), panjang = judul.length>16;
  const baris2 = kosong ? '' : [k.tahun,k.pelukis].filter(Boolean).join(' | ').slice(0,34);
  const plk = plakatBulat(f);
  const tJd = el(f,'a-text',{value:judul,align:'center',font:'exo2bold',wrapCount:panjang?28:18,color:'#e9c46a'});
  const tB2 = baris2 ? el(f,'a-text',{value:baris2,align:'center',wrapCount:36,color:'#f3e6c8'}) : null;
  const td=el(f,'a-circle',{id:'tanda'+i,radius:0.2,color:'#3f7d4f',visible:false});   // tanda selesai (Tahap 3): hijau 'OK' = sudah dikerjakan, emas '100' = semua benar
  el(td,'a-text',{value:'OK',align:'center',width:1.4,position:'0 0 0.01',color:'#ffffff'});
  const atur = (cw,ch)=>{
    const W=cw+0.48, H=ch+0.48, set=(e,a,v)=>e.setAttribute(a,v);
    set(bingkai,'width',W); set(bingkai,'height',H);
    [[lekuk,0.30],[garis,0.14],[celah,0.06]].forEach(([e,d])=>{ set(e,'width',cw+d); set(e,'height',ch+d); });
    set(kanvas,'width',cw); set(kanvas,'height',ch); if(im){ set(im,'width',cw); set(im,'height',ch); }
    const yA=H/2+0.28; if(pAl){ aturPlakat(pAl,2.1,0.4,0.1,`0 ${yA} 0.05`); set(tAl,'position',`0 ${yA} 0.07`); }
    const yL=H/2+0.72, th=Math.atan2(0.42,yL), dg=th*180/Math.PI;
    set(lengan,'position',`0 ${yL} 0.22`); set(kepala,'position',`0 ${yL-0.05} 0.5`); set(kepala,'rotation',`${dg} 0 0`);
    const ay=yL-0.14, az=0.47, d=Math.hypot(ay,az-0.1);
    set(sinar,'height',d); set(sinar,'radius-bottom',Math.min(W,2.4)/2); set(sinar,'position',`0 ${ay/2} ${(az+0.1)/2}`); set(sinar,'rotation',`${Math.atan2(az-0.1,ay)*180/Math.PI} 0 0`);
    const Wp=Math.round(Math.max(2.2,Math.min(2.6,W*1.05))*10)/10, tw=Wp-0.2, yP=-(H/2+0.36);   // v2.22: plakat lebih pendek (0,6), tepi atas tetap sama, jarak baris rapat
    aturPlakat(plk,Wp,0.6,0.1,`0 ${yP} 0.05`);
    set(tJd,'width',tw); set(tJd,'position',`0 ${yP+(baris2?0.09:0)} 0.07`);
    if(tB2){ set(tB2,'width',tw); set(tB2,'position',`0 ${yP-0.11} 0.07`); }
    set(td,'position',`${W/2-0.2} ${H/2-0.2} 0.16`);
  };
  atur(2.0,1.5);
  if(im) ukuranGambar(k.gambar).then(d=>{ if(!d||!im.parentNode) return; const [a,b]=fitRasio(d[0],d[1],2.0,1.5); atur(a,b); });
  if(k) kanvas.addEventListener('click',()=>{ if(klikSah()) buka(i); });
  daftarBingkai[i] = { x, z, ry, yaw, k, sx, sz };
}
function bangunRuangMaestro(g){
  daftarBingkai=[];
  kotak(g,0,0.03,-19,19,0.04,13,'#f1ede4',{class:'klik lantai'});
  teksFont(g,'RUANG LUKISAN',0,4.3,-25.6,7,0.7,FONT_MUSEUM,'#c9902f',{lebar:0.8,timbul:['#3a2a12',0.012,4]}); teksFont(g,'ERA MODERNISME',0,3.6,-25.6,7,0.7,FONT_MUSEUM,'#c9902f',{lebar:0.8,timbul:['#3a2a12',0.012,4]});   // v2.19 T13: di bawah plafon (y 5,0)
  // v2.19 T18: 12 bingkai, urutan keliling searah jarum jam dari pintu: barat dekat ke jauh (1-4), belakang barat ke timur (5-6), timur jauh ke dekat (7-10), depan timur ke barat (11-12)
  const S=[]; for(let n=0;n<4;n++) S.push([-9.6,-14.5-n*3.2,90,Math.PI/2,-5.4,-14.5-n*3.2]);
  S.push([-5.5,-25.64,0,0,-5.5,-21.44],[5.5,-25.64,0,0,5.5,-21.44]);
  for(let n=3;n>=0;n--) S.push([9.6,-14.5-n*3.2,-90,-Math.PI/2,5.4,-14.5-n*3.2]);
  S.push([5.5,-12.28,180,Math.PI,5.5,-16.48],[-5.5,-12.28,180,Math.PI,-5.5,-16.48]);
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
  $('bKerjakan').style.display = k.id ? '' : 'none';   // v2.19 T18: patung (tanpa id) tidak punya latihan
  $('info').style.display='block'; $('info').scrollTop=0; $('bKembali').focus();
}
function tutup(){
  if(bingkaiAktif<0) return; bingkaiAktif=-1; karyaAktif=-1; $('info').style.display='none'; $('latihan').style.display='none'; $('kartuKarya').style.display='none';
  /* gerak keyboard ditangani gerakKunci() */ 0; // kamera dilepas, siswa bebas berjalan lagi
}
$('bKembali').onclick = tutup;
$('bKerjakan').onclick = ()=>mulaiLatihan();
$('bNext').onclick = ()=>{ let j=bingkaiAktif; const N=daftarBingkai.length; for(let n=0;n<N;n++){ j=(j+1)%N; if(daftarBingkai[j]&&daftarBingkai[j].k){ buka(j); return; } } };
addEventListener('keydown',e=>{ if(e.key==='Escape') tutup(); });

/* ---------- Lihat dari atas ---------- */
$('bAtas').onclick = ()=>{
  const rig=$('rig'), p=rig.object3D.position; tutup();
  if(!dariAtas){ simpanPos={x:p.x,z:p.z}; rig.setAttribute('position','0 30 36'); arahKamera(0,-0.75); $('bAtas').textContent='Turun ke plaza'; }
  else { rig.setAttribute('position',`${POS.A[0]} ${POS.A[1]} ${POS.A[2]}`); arahKamera(0,0); $('bAtas').textContent='Lihat dari atas'; }
  dariAtas=!dariAtas;
};

/* ---------- Spanduk luar: bendera vertikal bergaya museum + papan sambutan ---------- */
function teksLapis(p,v,x,y,z,w,wrap,warna,gelap){   // huruf timbul berlapis dengan pemecah baris
  for(let k=3;k>=0;k--) el(p,'a-text',{value:v,align:'center',font:'exo2bold',width:w,wrapCount:wrap,position:`${x+0.01*k} ${y-0.01*k} ${z-0.01*k}`,color:k?gelap:warna});
}
function spanduk(g){
  const daftar=koleksi.slice(0,4);
  [-6.65,-4.75,4.75,6.65].forEach((x,i)=>{
    const k=daftar[i], w=el(g,'a-entity',{position:`${x} 4.2 0.36`}), warna=k&&WARNA[k.aliran]||'#6b5b45';
    el(w,'a-box',{position:'0 1.9 0',width:1.2,height:0.07,depth:0.07,color:'#c9a227'});                       // tongkat gantung
    el(w,'a-plane',{width:1.0,height:3.5,color:warna,side:'double'});                                           // kain
    [[0,1.72,1.0,0.05],[0,-1.72,1.0,0.05],[-0.49,0,0.05,3.5],[0.49,0,0.05,3.5]].forEach(([a,b,ww,hh])=>el(w,'a-plane',{position:`${a} ${b} 0.01`,width:ww,height:hh,color:'#c9a227'})); // list emas
    if(k&&k.gambar){ const im=el(w,'a-image',{position:'0 0.85 0.02',width:0.8,height:0.8,src:kecil(k.gambar,1024)}); pulihGambar(im,k.gambar,1024);   // v2.19 T17f: rasio asli
      ukuranGambar(k.gambar).then(d=>{ if(!d||!im.parentNode) return; const [a,b]=fitRasio(d[0],d[1],0.8,0.8); im.setAttribute('width',a); im.setAttribute('height',b); }); }
    else el(w,'a-circle',{position:'0 0.85 0.02',radius:0.34,color:'#c9a227'});
    teksLapis(w,k?String(k.judul).slice(0,50):'Segera hadir',0,-0.35,0.03,1.0,11,'#fff3c4','#3a2a12');
    for(let t=-2;t<=2;t++) el(w,'a-cone',{position:`${t*0.2} -1.85 0.02`,'radius-bottom':0.05,'radius-top':0.001,height:0.18,rotation:'180 0 0',color:'#c9a227'});   // rumbai
  });
  const s=el(g,'a-entity',{position:'0 5.9 0.36'});   // v2.22: plakat perunggu 4,8 x 2,0: judul 1 baris (~77% lebar), pembatas belah ketupat, subjudul, empat sekrup sudut
  el(s,'a-plane',{width:4.8,height:2.0,color:'#2e251a'});
  el(s,'a-plane',{position:'0 0 0.005',width:4.5,height:1.7,color:'#3d3225'});
  [[0,0.96,4.8,0.07],[0,-0.96,4.8,0.07],[-2.37,0,0.07,2.0],[2.37,0,0.07,2.0]].forEach(([a,b,ww,hh])=>el(s,'a-plane',{position:`${a} ${b} 0.01`,width:ww,height:hh,color:'#b8923a'}));
  [[0,0.84,4.5,0.025],[0,-0.84,4.5,0.025],[-2.25,0,0.025,1.7],[2.25,0,0.025,1.7]].forEach(([a,b,ww,hh])=>el(s,'a-plane',{position:`${a} ${b} 0.015`,width:ww,height:hh,color:'#d4b05a'}));
  [[-2.03,0.64],[2.03,0.64],[-2.03,-0.64],[2.03,-0.64]].forEach(([a,b])=>el(s,'a-sphere',{position:`${a} ${b} 0.03`,radius:0.065,color:'#d4b05a','segments-width':10,'segments-height':8}));
  teksLapis(s,'SELAMAT DATANG',0,0.3,0.03,10,21,'#e3c06f','#241908');
  [-1.05,1.05].forEach(x0=>el(s,'a-plane',{position:`${x0} -0.2 0.02`,width:1.6,height:0.03,color:'#d4b05a'}));
  el(s,'a-box',{position:'0 -0.2 0.03',width:0.17,height:0.17,depth:0.02,rotation:'0 0 45',color:'#d4b05a'});
  el(s,'a-text',{value:'Ayo jelajahi karya seni bersama-sama',align:'center',width:4.4,wrapCount:38,position:'0 -0.58 0.03',color:'#e3c06f'});
}

/* ---------- Titik masuk dari index.html ---------- */
/* v2.22: jeda satu frame antar bagian supaya layar "Menyiapkan museum..." tetap bergerak dan HP tidak membeku. Urutan pembangunan SAMA seperti sebelumnya. */
const jedaFrame=()=>new Promise(r=>{ let s=false; const f=()=>{ if(!s){ s=true; r(); } }; requestAnimationFrame(f); setTimeout(f,100); });
async function bangunMuseum(){
  if(dataAwal&&dataAwal.koleksi) koleksi=dataAwal.koleksi;   // v2.22: sudah diambil bersama galeri
  else{ try{ koleksi = await gs('getKoleksi'); }catch(e){ koleksi=[]; pesan('Koleksi belum bisa dimuat: '+e.message,6000); } }
  const d=$('dunia'); d.querySelectorAll('.zm').forEach(e=>e.remove());
  _teksFont.length=0;   // v2.22: bangun ulang tidak menumpuk penggambar teks lama
  const g=document.createElement('a-entity'); g.classList.add('zm'); d.append(g);
  for(const f of [bangunGedung,bangunFasad,bangunRuangMaestro,bangunPatung,bangunDekor,spanduk,bangunSayap,bangunBooth]){ f(g); await jedaFrame(); }
  g.querySelectorAll('.lantai').forEach(f=>f.addEventListener('click',e=>{ if(e.detail&&e.detail.intersection) jalanKe(e.detail.intersection.point); }));
  if(dataAwal&&dataAwal.poin){ poinSaya=dataAwal.poin; perbaruiPoinUI(); } else muatPoin();   // Tahap 3: poin dan tanda selesai (tidak menahan pemuatan museum)
  dataAwal=null;
}

/* ---------- v1.05: berjalan lebih natural ---------- */
/* Dinding padat [x1,x2,z1,z2], sudah ditambah jari-jari badan 0.4. Celah pintu tetap bebas. */
const SOLID = [[-10.7,-2.1,-0.7,0.7],[2.1,10.7,-0.7,0.7],[-10.7,-9.3,-26.7,0.7],[9.3,10.7,-4.9,0.7],[9.3,10.7,-26.7,-7.1],[-10.7,10.7,-26.7,-25.3],
  [-10.7,-1.1,-12.6,-11.4],[1.1,10.7,-12.6,-11.4],[3.6,8.8,-3.0,-2.0],
  [4.8,10.7,0.7,2.1],[-10.7,-4.8,0.7,2.1],   // v2.18: sisi serambi (kolom) padat; masuk hanya lewat tangga tengah
  [-4.6,-3.0,0.4,2.8],[3.0,4.6,0.4,2.8],[-8.4,-6.8,0.4,2.8],[6.8,8.4,0.4,2.8]];   // v2.19 T12: empat kolom serambi (x = +-3,8 dan +-7,6); di SOLID dasar supaya tidak terhapus bangunPatung
const SOLID_DASAR = SOLID.length;
const LONGGAR = 0.05;   // v2.20: radius badan efektif 0,35 m (SOLID sudah memuat 0,4), lorong sempit tidak menjepit
const dalamPadat = (x,z)=>SOLID.some(s=>x>s[0]+LONGGAR&&x<s[1]-LONGGAR&&z>s[2]+LONGGAR&&z<s[3]-LONGGAR);
/* v2.20: bila terlanjur di dalam benda padat (teleport, tumpang-tindih), dorong ke tepi terdekat supaya tidak macet */
function keluarkan(p){
  const L=LONGGAR;
  for(let n=0;n<4;n++){ const s=SOLID.find(s=>p.x>s[0]+L&&p.x<s[1]-L&&p.z>s[2]+L&&p.z<s[3]-L); if(!s) return;
    const c=[[p.x-(s[0]+L),'x',s[0]+L,-1],[(s[1]-L)-p.x,'x',s[1]-L,1],[p.z-(s[2]+L),'z',s[2]+L,-1],[(s[3]-L)-p.z,'z',s[3]-L,1]].sort((a,b)=>a[0]-b[0]);
    const bebas=c.find(e=>!dalamPadat(e[1]==='x'?e[2]+e[3]*0.002:p.x,e[1]==='z'?e[2]+e[3]*0.002:p.z))||c[0];   // utamakan tepi yang tidak masuk benda padat lain
    p[bebas[1]]=bebas[2]+bebas[3]*0.002; } }
/* v2.18 T11: tinggi pijakan (y rig) di titik x,z. Dalam gedung 0; serambi dan undak teratas +0,04; undak -0,13 dan -0,30; selain itu tanah -0,47. */
function tinggiTanah(x,z){
  const a=Math.abs(x);
  if(z>=0.3&&z<1.5&&a<8.4) return 0.04;                        // ambang
  if(z>=1.5&&z<2.1&&a>=4.8&&a<8.4) return 0.04;                // sisi serambi
  if(z>=1.5&&z<3.1&&a<4.8) return 0.04;                        // undak atas
  if(z>=3.1&&z<4.0&&a<5.4) return -0.13;                       // undak tengah
  if(z>=4.0&&z<4.9&&a<6) return -0.30;                         // undak bawah
  if(z<0.3&&((a<10.7&&z>-26.7)||(x>=10.7&&x<29.3&&z>-12.7))) return 0;   // aula, ruang lukisan, sayap
  return -0.47;                                                // plaza dan tanah luar
}
let prevPos = null;
(function cekTabrak(){ requestAnimationFrame(cekTabrak);
  const yy=$('rig').object3D.position.y;   // status 'dari atas' dibaca dari tinggi kamera, jadi tabrakan tidak pernah tertinggal mati
  if((yy>5)!==dariAtas){ dariAtas=yy>5; $('bAtas').textContent=dariAtas?'Turun ke plaza':'Lihat dari atas'; }
  gerakKunci();
  if(dariAtas||bingkaiAktif>=0||!token){ prevPos=null; return; }
  gerakJoy();
  const p=$('rig').object3D.position;
  p.x=Math.max(-38,Math.min(38,p.x)); p.z=Math.max(-27,Math.min(38,p.z));   // v2.19 T16: tidak bisa berjalan keluar dari tanah
  if(prevPos && dalamPadat(p.x,p.z)){            // geser menyusuri dinding, bukan menembusnya
    if(dalamPadat(prevPos.x,prevPos.z)) keluarkan(p);   // v2.20: sudah terjepit, jangan dikunci di tempat
    else if(!dalamPadat(prevPos.x,p.z)) p.x=prevPos.x; else if(!dalamPadat(p.x,prevPos.z)) p.z=prevPos.z; else { p.x=prevPos.x; p.z=prevPos.z; } }
  else if(!prevPos) keluarkan(p);
  { const ty=tinggiTanah(p.x,p.z); p.y = Math.abs(ty-p.y)<0.004 ? ty : p.y+(ty-p.y)*0.3; }   // v2.18 T11: naik/turun undak dengan halus
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
    rig.object3D.position.set(x0+(tx-x0)*e,rig.object3D.position.y,z0+(tz-z0)*e); if(u<1) requestAnimationFrame(s); })(t0);
}

/* Tombol pintas ke Ruang Maestro + label tombol atas ikut benar saat pindah zona */
const pindahAsli = pindah;
pindah = function(z){ batalJalan(); if(dariAtas){ dariAtas=false; $('bAtas').textContent='Lihat dari atas'; } pindahAsli(z); if(z==='C') arahKamera(Math.PI/2,0); else if(z==='D') arahKamera(-Math.PI/2,0); perbaruiPager(); };
$('hud').insertAdjacentHTML('beforeend','<button id="bMaestro" class="alt">Museum SENI</button>');
$('bMaestro').onclick=()=>{ bukaPintu(true); fadeKe(()=>{ pindah('A'); $('rig').setAttribute('position','0 0 -13.2'); arahKamera(0,0); }); };

/* ---------- v1.06: klik sah (bukan geser layar), joystick sentuh, patung & pahatan ---------- */
let awal=null, geser=0;
addEventListener('pointerdown',e=>{ awal={x:e.clientX,y:e.clientY}; geser=0; });
addEventListener('pointermove',e=>{ if(awal) geser=Math.max(geser,Math.hypot(e.clientX-awal.x,e.clientY-awal.y)); });
addEventListener('pointerup',()=>setTimeout(()=>{ awal=null; },0));
function klikSah(){ return modeVR||geser<10; }      // geser layar untuk menoleh tidak dihitung klik
siapScene(()=>$('cam').setAttribute('look-controls','magicWindowTrackingEnabled',false));   // matikan giroskop HP (penyebab layar bergoyang); ditunda sampai A-Frame siap

/* (joy, tJoy, joyId dideklarasikan di bagian atas file, sebelum cekTabrak) */
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
    papanPatung(w,s.k.judul,s.k.aliran);
    const url=GLB_PATUNG[s.tipe];
    if(url){ const m=el(w,'a-entity',Object.assign({'bahan-patung':BAHAN_GLB[s.tipe]||'',position:`0 ${1.05+SKALA_GLB} 0`,rotation:'0 90 0',scale:`${SKALA_GLB} ${SKALA_GLB} ${SKALA_GLB}`},{'gltf-model':`url(${url})`}));
      m.addEventListener('model-error',()=>{ m.remove(); patungFoto(w,s.tipe); }); }   /* GLB gagal dimuat: pakai model bentuk dasar */
    else patungFoto(w,s.tipe);
    const hit=el(w,'a-box',{position:'0 1.9 0',width:1.4,height:2,depth:1.4,material:'opacity:0;transparent:true',class:'klik',role:'img','aria-label':s.k.judul});
    hit.addEventListener('click',()=>{ if(klikSah()) buka(i); });
    daftarBingkai[i]={x:0,z,ry:90,yaw:Math.PI/2,k:s.k};
  });
}

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
/* v2.19 T16: data plaza dipakai bangunDekor dan gambarDenah (satu sumber). Bangku [x,z,ry], tanaman [x,z,skala,jenis], tiang lampu [x,z]. */
const PLAZA={ y:-0.43,
  bangku:[[-9,9,0],[9,9,0],[-9,17,0],[9,17,0],[-15,13,90],[15,13,90]],
  tanaman:[[-17,3.2,1.2,1],[17,3.2,1.2,2],[-11.5,3.2,1,2],[11.5,3.2,1,1],[-17,20.5,1.2,2],[17,20.5,1.2,1],[-6,21,1,1],[6,21,1,2]],
  lampu:[[-13,6],[13,6],[-13,20],[13,20]] };
/* v2.21 (tampilan saja, tanpa tabrakan): kolam cermin memanjang, empat taman parterre berpagar tanaman, jalur batu kali. Semua rendah (maks 0,35 m) dari bentuk dasar. */
function hiasPlaza(g){
  const W=el(g,'a-entity',{position:`0 ${PLAZA.y} 0`},'dekor'), K=(x,y,z,w,h,d,c)=>kotak(W,x,y,z,w,h,d,c), HIJAU='#2e5d2b';
  [-2.55,2.55].forEach(x=>K(x,0.015,14.25,0.7,0.03,15.5,'#8d877c'));                                    // jalur batu kali di tepi kolam
  [-2,2].forEach(x=>K(x,0.05,14.25,0.4,0.1,15.5,'#b7b1a4')); [6.7,21.8].forEach(z=>K(0,0.05,z,4.4,0.1,0.4,'#b7b1a4'));   // bingkai granit
  el(W,'a-box',{position:'0 0.05 14.25',width:3.6,height:0.06,depth:14.8,material:'color:#6d93aa;roughness:0.1;metalness:0.4'});   // air
  [8.7,11.4,14.1,16.8,19.5].forEach(z=>{ el(W,'a-cylinder',{position:`0 0.35 ${z}`,radius:0.04,height:0.55,color:'#dcecf4'}); el(W,'a-sphere',{position:`0 0.66 ${z}`,radius:0.09,color:'#eef6fa','segments-width':8,'segments-height':6});
    el(W,'a-ring',{position:`0 0.09 ${z}`,rotation:'-90 0 0','radius-inner':0.28,'radius-outer':0.36,color:'#b9d3e2','segments-theta':16}); });
  const parterre=(cx,cz,w,d)=>{ K(cx,0.015,cz,w,0.03,d,'#4b7a3a');
    [-1,1].forEach(s=>{ K(cx,0.175,cz+s*(d/2-0.12),w,0.35,0.24,HIJAU); K(cx+s*(w/2-0.12),0.175,cz,0.24,0.35,d-0.48,HIJAU); });
    el(W,'a-torus',{position:`${cx} 0.12 ${cz}`,rotation:'90 0 0',radius:Math.min(w,d)*0.3,'radius-tubular':0.1,'segments-radial':6,'segments-tubular':24,color:HIJAU});
    el(W,'a-sphere',{position:`${cx} 0.4 ${cz}`,radius:0.55,color:'#3f7d3a','segments-width':10,'segments-height':8});
    ['#e58fb0','#b79ae0','#f1c94f','#e58fb0'].forEach((c,i)=>el(W,'a-sphere',{position:`${cx+Math.cos(i*1.571+0.8)*0.95} 0.2 ${cz+Math.sin(i*1.571+0.8)*0.95}`,radius:0.1,color:c,'segments-width':6,'segments-height':4}));
    [-1,1].forEach(s=>el(W,'a-cone',{position:`${cx+s*(w/2-0.6)} 0.3 ${cz+s*(d/2-0.6)}`,'radius-bottom':0.18,'radius-top':0.01,height:0.6,color:HIJAU,'segments-radial':8})); };
  [-5.5,5.5].forEach(x=>{ parterre(x,10.5,4.6,5); parterre(x,17.25,4.6,5.5); });
}
function tiangLampu(g,x,z){
  const w=el(g,'a-entity',{position:`${x} ${PLAZA.y} ${z}`},'dekor');
  el(w,'a-cylinder',{position:'0 0.1 0',radius:0.2,height:0.2,color:'#2b2118'}); el(w,'a-cylinder',{position:'0 1.7 0',radius:0.07,height:3.4,color:'#2b2118'});
  el(w,'a-sphere',{position:'0 3.55 0',radius:0.24,material:'color:#fff1c8;emissive:#ffd98a;emissiveIntensity:1','segments-width':12,'segments-height':8});
  SOLID.push([x-0.5,x+0.5,z-0.5,z+0.5]);
}
function tanaman(g,x,z,s,jenis,y=0){
  const w=el(g,'a-entity',{position:`${x} ${y} ${z}`,scale:`${s} ${s} ${s}`},'dekor');
  el(w,'a-cylinder',{position:'0 0.3 0',radius:0.32,height:0.6,color:'#b5562f'}); el(w,'a-cylinder',{position:'0 0.61 0',radius:0.28,height:0.04,color:'#4a3a2a'});
  if(jenis===1){ el(w,'a-cylinder',{position:'0 0.95 0',radius:0.04,height:0.7,color:'#5b4630'});
    [[0,1.15,0,0.4],[0.22,1.5,0.1,0.3],[-0.2,1.4,-0.12,0.32],[0.05,1.8,-0.05,0.26]].forEach(([a,b,c,r])=>el(w,'a-sphere',{position:`${a} ${b} ${c}`,radius:r,color:'#2f7d3a','segments-width':8,'segments-height':6})); }
  else { el(w,'a-cylinder',{position:'0 1.15 0',radius:0.05,height:1.1,color:'#6b5336'});
    for(let a=0;a<6;a++){ const lf=el(w,'a-entity',{position:'0 1.7 0',rotation:`0 ${a*60} 0`}); el(lf,'a-cone',{position:'0 0.05 0.45',rotation:'70 0 0','radius-bottom':0.18,'radius-top':0.01,height:1.1,color:'#2f7d3a'}); } }
  const r=0.72*s; SOLID.push([x-r,x+r,z-r,z+r]);
}
function bangku(g,x,z,ry,y=0){
  const w=el(g,'a-entity',{position:`${x} ${y} ${z}`,rotation:`0 ${ry} 0`},'dekor');
  el(w,'a-box',{position:'0 0.45 0',width:1.8,height:0.1,depth:0.5,color:'#6d4a2b'});
  [-0.75,0.75].forEach(a=>el(w,'a-box',{position:`${a} 0.22 0`,width:0.1,height:0.44,depth:0.45,color:'#3a2f26'}));
  const hx=(ry%180===0?0.9:0.25)+0.4, hz=(ry%180===0?0.25:0.9)+0.4; SOLID.push([x-hx,x+hx,z-hz,z+hz]);
}
function bangunDekor(g){
  el(g,'a-entity',{id:'tRuang',position:'0 0 -19'});
  el(g,'a-entity',{id:'lampuBayang',position:'4 12 -14',light:'type:directional;color:#fff1d6;intensity:0.7;castShadow:true;shadowCameraLeft:-12;shadowCameraRight:12;shadowCameraTop:16;shadowCameraBottom:-16;shadowCameraNear:1;shadowCameraFar:40;shadowMapWidth:1024;shadowMapHeight:1024;shadowBias:-0.0005;target:#tRuang'});
  // lampu gantung (hiasan; cahaya asli datang dari lampu titik di aula dan ruang)
  [[0,-4,6],[0,-9,6],[0,-15,5],[0,-19.5,5],[0,-24,5]].forEach(([x,z,pl])=>{ const h=pl-4.58; el(g,'a-cylinder',{position:`${x} ${4.58+h/2} ${z}`,radius:0.015,height:h,color:'#222'});   // v2.19 T13: bola y 4,3; kabel dari plafon (aula 6,0 / ruang 5,0)
    el(g,'a-sphere',{position:`${x} 4.3 ${z}`,radius:0.28,material:'color:#fff1c8;emissive:#ffd98a;emissiveIntensity:1','segments-width':12,'segments-height':8}); });
  // karpet Ruang Maestro
  el(g,'a-box',{position:'0 0.045 -19.4',width:3.6,height:0.02,depth:12.4,color:'#7a2f2a',shadow:'cast:false;receive:true'}); el(g,'a-box',{position:'0 0.055 -19.4',width:3.1,height:0.02,depth:11.9,color:'#9a4a38',shadow:'cast:false;receive:true'});
  [[-8.7,-1.4,1,1],[9.0,-0.9,1,1],[-8.7,-10.6,1.1,2],[8.7,-10.6,1.1,2],[-8.3,-13.2,1,2],[8.3,-13.2,1,2],[-8.5,-24.9,1.1,1],[8.5,-24.9,1.1,1]].forEach(([x,z,s,j])=>tanaman(g,x,z,s,j));
  bangku(g,6.5,-10,0); bangku(g,7.9,-19.3,90); bangku(g,-7.9,-19.3,90);
  g.querySelectorAll('.dekor *').forEach(e=>{ if(e.tagName!=='A-TEXT') e.setAttribute('shadow','cast:true;receive:true'); });
  g.querySelectorAll('.lantai').forEach(e=>e.setAttribute('shadow','cast:false;receive:true'));
  PLAZA.bangku.forEach(([x,z,ry])=>bangku(g,x,z,ry,PLAZA.y)); PLAZA.tanaman.forEach(([x,z,sk,j])=>tanaman(g,x,z,sk,j,PLAZA.y)); PLAZA.lampu.forEach(([x,z])=>tiangLampu(g,x,z)); hiasPlaza(g);   // v2.19 T16: plaza (dibuat setelah reset SOLID di bangunPatung)
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
  if(!token||bingkaiAktif>=0){ vKunci.x=vKunci.z=0; return; }
  const T=tombolPutar, lc=kendaliPandang(); if(!lc) return;
  const putar=((T.arrowleft||T.q)?1:0)-((T.arrowright||T.e)?1:0); if(putar) lc.yawObject.rotation.y+=putar*1.5*dt;
  const maju=((T.w||T.arrowup)?1:0)-((T.s||T.arrowdown)?1:0), geser=(T.d?1:0)-(T.a?1:0);
  /* v2.20: gerak halus. Kecepatan target 1,3 m/s (lari 2,6), dicapai/dilepas bertahap (~0,25 dtk) dan arah miring tidak lebih cepat */
  const yaw=lc.yawObject.rotation.y, mg=Math.max(1,Math.hypot(maju,geser)), sp=1.3*(T.shift?2:1), p=$('rig').object3D.position;
  const tx=(-Math.sin(yaw)*maju+Math.cos(yaw)*geser)/mg*sp, tz=(-Math.cos(yaw)*maju-Math.sin(yaw)*geser)/mg*sp, k=Math.min(1,dt*7);
  vKunci.x+=(tx-vKunci.x)*k; vKunci.z+=(tz-vKunci.z)*k;
  if(!maju&&!geser&&Math.hypot(vKunci.x,vKunci.z)<0.02){ vKunci.x=vKunci.z=0; return; }
  p.x+=vKunci.x*dt; p.z+=vKunci.z*dt;
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
function papanPatung(w,judul,aliran){
  const pl=el(w,'a-entity',{position:'0.63 0.5 0',rotation:'0 90 0'});
  el(pl,'a-box',{width:1.12,height:0.74,depth:0.04,color:'#c9a227'});
  el(pl,'a-box',{width:1.02,height:0.64,depth:0.05,color:'#2b2118'});
  [[-0.5,0.32],[0.5,0.32],[-0.5,-0.32],[0.5,-0.32]].forEach(([a,b])=>el(pl,'a-sphere',{position:`${a} ${b} 0.03`,radius:0.03,color:'#e8c85a','segments-width':8,'segments-height':6}));
  /* v2.20: huruf diperkecil agar muat di plakat (judul maks 2-3 baris) + baris kecil aliran */
  const yj=aliran?0.08:0;
  el(pl,'a-text',{value:judul,align:'center',font:'exo2bold',width:0.92,wrapCount:15,position:`0.008 ${yj-0.008} 0.074`,color:'#6b4e10'});
  el(pl,'a-text',{value:judul,align:'center',font:'exo2bold',width:0.92,wrapCount:15,position:`0 ${yj} 0.077`,color:'#fff3c4'});
  if(aliran) el(pl,'a-text',{value:String(aliran).slice(0,30),align:'center',width:0.9,wrapCount:26,position:'0 -0.23 0.077',color:'#e8c85a'});
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
siapScene(()=>{ $('rig').setAttribute('wasd-controls','enabled',false); $('cam').setAttribute('wasd-controls','enabled',false); });   // v2.20: kamera juga punya wasd-controls bawaan (jalan tanpa cek tabrakan, kecepatan dobel)   // gerak keyboard kini sepenuhnya oleh gerakKunci()

/* ---- denah nyata: gambar kanvas, dipakai di papan aula dan layar penuh ---- */
let texDenah=null; function denahTex(){ return texDenah||(texDenah=gambarDenah({x:6.2,z:-2.5,statis:true})); }
document.body.insertAdjacentHTML('beforeend','<div id="denahBox" class="ui" role="dialog" aria-label="Denah museum" style="display:none;inset:8px;z-index:25;overflow:auto;background:#f4ecd8;padding:8px"><div style="display:flex;gap:6px;margin-bottom:6px"><button id="dnZoom">Perbesar</button><button id="dnTutup" class="alt">Tutup</button></div><img id="dnImg" alt="Denah museum" style="width:100%;display:block"></div>');
function bukaDenah(){ const p=$('rig').object3D.position, lc=kendaliPandang();
  $('dnImg').src=gambarDenah({x:p.x,z:p.z,yaw:lc?lc.yawObject.rotation.y:0}); $('dnImg').style.width='100%'; $('dnZoom').textContent='Perbesar'; $('denahBox').style.display='block'; if(bukaMenu) bukaMenu(false); }
$('dnTutup').onclick=()=>{ $('denahBox').style.display='none'; };
$('dnZoom').onclick=()=>{ const i=$('dnImg'), b=i.style.width==='100%'; i.style.width=b?'220%':'100%'; $('dnZoom').textContent=b?'Perkecil':'Perbesar'; };
addEventListener('keydown',e=>{ if(e.key==='Escape') $('denahBox').style.display='none'; });


/* ================= v2.12: menu ringkas gaya tombol 3D. Deretan tombol grup ke samping, sub menu turun ke bawah (tampilan saja; isi menu tidak diubah) ================= */
document.head.insertAdjacentHTML('beforeend',`<style>
#hud.ui{--tt:36px;background:transparent;box-shadow:none;padding:0;border-radius:0;flex-direction:row;flex-wrap:wrap;align-items:flex-start;gap:8px;max-width:calc(100vw - 20px);pointer-events:none;
  top:max(10px,env(safe-area-inset-top,0px));left:max(10px,env(safe-area-inset-left,0px))}
#hud.ui button,#pager,.grupMenu .gHead,.grupMenu .baris{pointer-events:auto}
#hud.ui button{--a:#3f7fa0;--b:#2f6f8f;--s:#1b4760;color:#fff;font-weight:600;font-size:14px;min-height:34px;padding:6px 14px;border:0;border-radius:10px;
  background:linear-gradient(180deg,var(--a) 0%,var(--b) 100%);text-shadow:0 1px 1px rgba(0,0,0,.45);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 3px 0 var(--s),0 5px 8px rgba(0,0,0,.28);transition:transform .08s,box-shadow .08s,filter .12s}
#hud.ui button.alt{--a:#6f7e84;--b:#586870;--s:#3a464b}
#hud.ui button:hover{filter:brightness(1.08)}
#hud.ui button:active{transform:translateY(2px);box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 1px 0 var(--s),0 2px 4px rgba(0,0,0,.25)}
#hud.ui #bMenu{box-sizing:border-box;height:var(--tt);min-height:var(--tt);padding:0 14px;line-height:1;font-size:14px}
#hud.ui #bMenu[aria-expanded="true"]{filter:brightness(.93);box-shadow:inset 0 3px 6px rgba(0,0,0,.35),0 3px 0 var(--s),0 5px 8px rgba(0,0,0,.28)}
#hud.ui #hudIsi{flex-direction:row;flex-wrap:wrap;align-items:flex-start;gap:8px;width:auto;max-width:none;max-height:none;overflow:visible;padding:0;margin:0;background:none;border:0;box-shadow:none;border-radius:0;pointer-events:none}
.grupMenu .gHead{--a:#3f7fa0;--b:#2f6f8f;--s:#1b4760;display:flex;align-items:center;gap:6px;margin:0;box-sizing:border-box;height:var(--tt);min-height:var(--tt);padding:0 14px;line-height:1;border-radius:10px;color:#fff;font-size:14px;font-weight:600;letter-spacing:0;text-transform:none;
  background:linear-gradient(180deg,var(--a) 0%,var(--b) 100%);text-shadow:0 1px 1px rgba(0,0,0,.45);cursor:pointer;user-select:none;-webkit-user-select:none;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 3px 0 var(--s),0 5px 8px rgba(0,0,0,.28);transition:transform .08s,box-shadow .08s,filter .12s}
.grupMenu .gHead:hover{filter:brightness(1.08)}
.grupMenu .gHead:focus-visible{outline:3px solid #f2b705}
.grupMenu .gHead::after{content:"\\25BE";font-size:12px;transition:transform .15s}
.grupMenu.buka .gHead{filter:brightness(.93);box-shadow:inset 0 3px 6px rgba(0,0,0,.35),0 3px 0 var(--s),0 5px 8px rgba(0,0,0,.28)}
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
@media (pointer:coarse){#hud.ui{--tt:42px}#hud.ui .grupMenu .baris button{min-height:44px}.grupMenu.buka .baris{gap:8px}}
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

/* ================= v2.13: Tahap 3 - latihan soal, poin, tanda selesai =================
   Penilaian dan poin dihitung di SERVER (getSoalLukisan tanpa kunci, kirimJawabanLukisan, getPoinSaya). Semua teks lewat textContent. */
document.head.insertAdjacentHTML('beforeend',`<style>
#latihan{right:10px;bottom:10px;width:min(420px,94vw);max-height:80vh;overflow:auto;display:none;background:#fbf8f1;box-sizing:border-box}
#latihan h3{margin:0 0 2px;font:700 18px/1.2 Georgia,serif}
#latihan .soal{margin:12px 0;padding-bottom:10px;border-bottom:1px solid #ddd}
#latihan .soal p{margin:0 0 6px;font-weight:600}
#latihan label.op{display:flex;gap:8px;align-items:flex-start;padding:8px;margin:4px 0;border:1px solid #cfc7b8;border-radius:6px;cursor:pointer;background:#fff}
#latihan label.op input{margin-top:4px}
#latihan .aksi{position:sticky;bottom:0;background:#fbf8f1;padding:8px 0 2px;display:flex;gap:6px;flex-wrap:wrap}
#latihan .ok{color:#2b6b3c}#latihan .salah{color:#9c3322}
#latihan .bahas{background:#f0ebdf;border-radius:6px;padding:6px 8px;margin-top:6px;font-size:14px}
#latihan .ringkas{font-size:16px;font-weight:700;margin:8px 0}
</style>`);
document.body.insertAdjacentHTML('beforeend','<div id="latihan" class="ui" role="dialog" aria-labelledby="lJudul"><h3 id="lJudul"></h3><p id="lMeta" style="margin:0;color:#5b5346;font-size:13px"></p><div id="lIsi"></div></div>');

const hh=(t,p,...c)=>{ const e=document.createElement(t); Object.assign(e,p||{}); c.flat().forEach(x=>e.append(x)); return e; };
let poinSaya={hitung:false,total:0,selesai:{}}, latihanSibuk=false;

function perbaruiPoinUI(){
  const hp=$('hudPoin'); if(hp){ hp.style.display=poinSaya.hitung?'inline':'none'; hp.textContent='Poin: '+poinSaya.total; }
  daftarBingkai.forEach((b,i)=>{ if(i>=12) return; const t=document.getElementById('tanda'+i); if(!t) return;
    const s=b&&b.k&&poinSaya.selesai[b.k.id]; t.setAttribute('visible',!!s);
    if(s){ t.setAttribute('color',s==='p'?'#d9a21b':'#3f7d4f'); const tx=t.querySelector('a-text'); if(tx) tx.setAttribute('value',s==='p'?'100':'OK'); } });
}
async function muatPoin(){ try{ poinSaya=await gs('getPoinSaya'); }catch(e){ return; } perbaruiPoinUI(); }

function kembaliKeInfo(){ $('latihan').style.display='none'; $('info').style.display='block'; $('bKembali').focus(); }
function bukaPanelLatihan(){ $('info').style.display='none'; $('latihan').style.display='block'; $('latihan').scrollTop=0; }

async function mulaiLatihan(){
  const b=daftarBingkai[bingkaiAktif], k=b&&b.k; if(!k||latihanSibuk) return;
  if(!k.id){ pesan('Karya ini tidak punya soal latihan. Latihan ada pada lukisan di dinding.',6000); return; }
  latihanSibuk=true;
  try{
    const r=await gs('getSoalLukisan',k.id);
    if(!r.soal.length) pesan('Belum ada soal untuk lukisan ini. Minta guru menambahkannya.',6000); else tampilSoal(k,r);
  }catch(e){ pesan(e.message,6000); }
  latihanSibuk=false;
}

function tampilSoal(k,r){
  $('lJudul').textContent='Latihan: '+k.judul;
  $('lMeta').textContent=r.hitung?(r.sudahPernah?'Kamu sudah pernah mengerjakan ini. Mengulang boleh, tetapi tidak menambah poin.':'Jawab semua soal. Poin dihitung dari jawaban pertama pada tiap soal.'):'Latihan bebas: hanya siswa yang mendapat poin.';
  const jawab={}, kirim=hh('button',{textContent:'Kirim jawaban',disabled:true});
  const cek=()=>{ kirim.disabled=Object.keys(jawab).length<r.soal.length; };
  const blok=r.soal.map((s,n)=>hh('div',{className:'soal'},hh('p',{textContent:(n+1)+'. '+s.pertanyaan}),
    ...s.opsi.map(o=>{ const rb=hh('input',{type:'radio',name:'q'+n,value:String(o.i)}); rb.onchange=()=>{ jawab[s.id]=o.i; cek(); };
      return hh('label',{className:'op'},rb,hh('span',{textContent:o.t})); })));
  kirim.onclick=async()=>{ kirim.disabled=true; kirim.textContent='Memeriksa...';
    try{ tampilHasil(k,await gs('kirimJawabanLukisan',k.id,jawab)); }
    catch(e){ pesan(e.message,6000); kirim.disabled=false; kirim.textContent='Kirim jawaban'; } };
  $('lIsi').replaceChildren(...blok,hh('div',{className:'aksi'},kirim,hh('button',{className:'alt',textContent:'Kembali ke lukisan',onclick:kembaliKeInfo})));
  bukaPanelLatihan();
}

function tampilHasil(k,hs){
  if(hs.hitung){ poinSaya.hitung=true; poinSaya.total=hs.poinTotal; poinSaya.selesai[k.id]=hs.status; perbaruiPoinUI(); }
  $('lMeta').textContent='Hasil latihan';
  const ringkas=[hh('p',{className:'ringkas',textContent:'Benar '+hs.benar+' dari '+hs.total+' soal'})];
  ringkas.push(hh('p',{textContent:hs.hitung
    ?(hs.poinBaru>0?('Poin baru: +'+hs.poinBaru+(hs.bonus?' (termasuk bonus '+hs.bonus+')':'')+'. Total poinmu: '+hs.poinTotal+'.')
      :('Tidak ada poin baru: poin hanya dihitung dari jawaban pertama. Total poinmu: '+hs.poinTotal+'.'))
    :'Latihan ini tidak menambah poin karena hanya siswa yang dihitung.'}));
  const rinci=hs.hasil.map((x,n)=>hh('div',{className:'soal'},hh('p',{textContent:(n+1)+'. '+x.pertanyaan}),
    hh('p',{className:x.benar?'ok':'salah',textContent:(x.benar?'Benar':'Belum tepat')+(x.hitungPoin&&x.poinDidapat?' (+'+x.poinDidapat+' poin)':'')}),
    hh('p',{textContent:'Jawabanmu: '+x.opsi[x.pilihan]}),
    ...(x.benar?[]:[hh('p',{textContent:'Jawaban yang benar: '+x.opsi[x.kunci]})]),
    ...(x.pembahasan?[hh('div',{className:'bahas',textContent:x.pembahasan})]:[])));
  $('lIsi').replaceChildren(...ringkas,...rinci,hh('div',{className:'aksi'},
    hh('button',{textContent:'Ulangi latihan',onclick:mulaiLatihan}),
    hh('button',{className:'alt',textContent:'Lukisan berikutnya',onclick:()=>{ $('latihan').style.display='none'; $('bNext').click(); }}),
    hh('button',{className:'alt',textContent:'Kembali ke lukisan',onclick:kembaliKeInfo})));
  $('latihan').scrollTop=0;
}

/* ================= v2.16: Tahap 4B - Sayap Karya Siswa, booth Studio AI, kartu karya, denah baru ================= */
const TEAL='#2f6f8f', PUTIH='#f1ede4', KAYU='#c9a77a', EMAS='#c9902f', ARANG='#3f444a';
let slotSayap=[], daftarKarya=[], karyaAktif=-1, PER_SAYAP=42, judulSayap=[];
let layarBooth={im:null,fb:null,i:0};

function fitRasio(nw,nh,mw,mh){ if(!(nw>0&&nh>0)) return [mw,mh]; const r=nw/nh; let w=mw,h=w/r; if(h>mh){ h=mh; w=h*r; } return [w,h]; }
/* v2.22: gambar Drive (lh3.googleusercontent.com/d/ID) diminta dalam ukuran kecil (=sPX: sisi terpanjang PX piksel) agar memori GPU HP tidak habis.
   Bila ukuran kecil gagal dimuat, dipakai alamat asli. Ukuran asli disimpan di sheet; rasio gambar sama. */
function kecil(url,px){ return /^https:\/\/lh3\.googleusercontent\.com\/d\/[\w-]+$/.test(String(url||''))?url+'=s'+px:url; }
function pulihGambar(im,asli,px,saatGagal){ let coba=false; im.addEventListener('error',()=>{ if(!coba&&kecil(asli,px)!==asli){ coba=true; im.setAttribute('src',asli); } else (saatGagal||(()=>im.remove()))(); }); }
const _ukuranMemo={};
function ukuranGambar(url,px){ px=px||1024; const key=url+'|'+px; if(_ukuranMemo[key]) return _ukuranMemo[key];
  const muat=u=>new Promise(res=>{ const im=new Image(); im.onload=()=>res([im.naturalWidth,im.naturalHeight]); im.onerror=()=>res(null); im.src=u; });
  return _ukuranMemo[key]=muat(kecil(url,px)).then(d=>d||(kecil(url,px)!==url?muat(url):null)).then(d=>{ if(!d) delete _ukuranMemo[key]; return d; }); }
function temaKarya(k){ const p=String(k.prompt||'').split(' / '); return p.length>=2?{tema:p[0],aliran:p[1],palet:p[2]||''}:{tema:String(k.prompt||'Tanpa tema'),aliran:'',palet:''}; }

/* ---------- Sayap Karya Siswa (sisi timur aula, x 10.3..28.3, z -11.7..-0.3) ---------- */
function slotBaru(g,s){
  const f=el(g,'a-entity',{position:`${s.x} ${s.y} ${s.z}`,rotation:`0 ${s.ry} 0`});
  s.luar=el(f,'a-box',{width:s.mw+0.1,height:s.mh+0.1,depth:0.05,color:'#2b2118'});
  s.kanvas=el(f,'a-plane',{width:s.mw,height:s.mh,position:'0 0 0.03',color:'#e7e1d3'});
  s.ket=el(f,'a-text',{value:'Segera hadir',align:'center',width:s.mw*0.9,wrapCount:14,position:'0 0 0.04',color:'#8a7f6c'});
  el(f,'a-box',{width:0.5,height:0.05,depth:0.14,position:`0 ${s.mh/2+0.14} 0.1`,color:'#2b2118'});   // lampu sorot (hiasan)
  s.f=f; s.im=null; s.kartu=null; s.v=0;
  const nx=Math.round(Math.sin(s.ry*Math.PI/180)), nz=Math.round(Math.cos(s.ry*Math.PI/180));
  s.sx=s.x+nx*s.jarak; s.sz=s.z+nz*s.jarak; s.yaw=Math.atan2(nx,nz);
  slotSayap.push(s);
}
function bangunSayap(g){
  slotSayap=[]; daftarKarya=[]; judulSayap=[];
  const putih=PUTIH, gelapP='#2a211b', gelap='#4a3f33';   // gelap sama dengan warna gelap gedung
  kotak(g,19.3,0.03,-6,18,0.04,11.4,'#2b2b30',{class:'klik lantai'});                    // karpet gelap
  kotak(g,19.6,4,0,18.6,8,0.6,putih); kotak(g,19.6,4,-12,18.6,8,0.6,putih); kotak(g,28.6,4,-6,0.6,8,12.6,putih);   // dinding selatan, utara, timur
  kotak(g,19.65,8.3,-6,19.3,0.6,12.6,gelap);                                              // atap
  kotak(g,19.3,4.5,-6,18,0.1,11.4,gelapP);                                                // plafon gelap
  for(let i=0;i<6;i++) for(let j=0;j<4;j++) el(g,'a-circle',{position:`${12.5+i*3} 4.43 ${-2.1-j*2.6}`,rotation:'90 0 0',radius:0.07,material:'color:#fff1c8;emissive:#ffd98a;emissiveIntensity:1;shader:flat'});
  // bukaan di dinding timur aula: kusen + tulisan di sisi aula
  kotak(g,10.1,2,-4.45,0.5,4,0.12,gelap); kotak(g,10.1,2,-7.55,0.5,4,0.12,gelap);
  kotak(g,9.68,4.75,-6,0.04,0.9,2.2,'#2b2118');   // v2.17 T04: latar gelap di sisi aula (muka depan x 9,66)
  el(g,'a-text',{value:'GALERI\nKARYA SISWA',align:'center',font:'exo2bold',width:5.0,wrapCount:17,position:'9.64 4.75 -6',rotation:'0 -90 0',color:'#f3e6c8',side:'double'});
  // slot dinding (12): selatan menghadap utara, utara menghadap selatan; dahulukan dinding
  const S=[]; for(let n=0;n<6;n++){ const x=12.7+2.3*n; S.push({x,y:1.75,z:-0.33,ry:180,mw:1.5,mh:1.1,jarak:2.4}); S.push({x,y:1.75,z:-11.67,ry:0,mw:1.5,mh:1.1,jarak:2.4}); }
  // panel jenis A: dua baris x tiga panel, zig-zag 1,5 m
  const baris=[[-4.0,[14.1,18.3,22.5]],[-8.0,[16.8,21.0]]];
  const sisi=[];   // urutan: baris1 depan, baris1 belakang, baris2 depan, baris2 belakang
  baris.forEach(([cz,xs])=>{ xs.forEach(cx=>{
    kotak(g,cx,1.34,cz,3.0,2.52,0.1,'#f6f3ec');
    [-1.2,1.2].forEach(d=>kotak(g,cx+d,0.04,cz,0.3,0.08,0.9,'#d8d2c4'));
    SOLID.push([cx-1.9,cx+1.9,cz-0.85,cz+0.85]);
  }); });
  baris.forEach(([cz,xs])=>[[0.065,0],[-0.065,180]].forEach(([dz,ry])=>xs.forEach(cx=>[-0.7,0.7].forEach(dx=>sisi.push({x:cx+dx,y:1.7,z:cz+dz,ry,mw:1.1,mh:1.1,jarak:2.0})))));
  // v2.20: panel judul berdiri dihapus (menyempitkan jalan). Judul kini papan di dinding timur (terlihat lurus dari pintu); satu lukisan di dinding barat bekas tempat panel.
  sisi.push({x:10.33,y:1.75,z:-2.3,ry:90,mw:1.5,mh:1.1,jarak:2.4});
  sisi.push({x:10.33,y:1.75,z:-9.6,ry:90,mw:1.5,mh:1.1,jarak:2.4});   // v2.20: satu lukisan lagi di sisi utara dinding barat (kanan pintu), simetris
  [[-9.6,4.2,8],[-2.4,4.2,8]].forEach(([z,d,h])=>kotak(g,10.31,h/2,z,0.02,h,d,PUTIH));   // v2.20: sisi galeri dinding barat dilapis putih (sama dengan dinding galeri lain); celah pintu tetap terbuka
  kotak(g,10.31,6,-6,0.02,4,3,PUTIH);   // di atas pintu (y 4..8)
  // kotak jenis B (abu, berkaki baja): kolom barat 2 kotak dua sisi, kolom timur 2 kotak satu sisi (barat)
  [[25.1,-2.7,true],[25.1,-8.3,true],[26.9,-5.5,false],[26.9,-10.4,false]].forEach(([x,z,dua])=>{
    kotak(g,x,1.5,z,0.5,1.8,2.2,'#585d66'); [[-0.9,-0.2],[0.9,-0.2],[-0.9,0.2],[0.9,0.2]].forEach(([dz,dx])=>kotak(g,x+dx,0.3,z+dz,0.05,0.6,0.05,'#9aa0a8'));
    SOLID.push([x-0.65,x+0.65,z-1.5,z+1.5]);
    sisi.push({x:x-0.265,y:1.6,z,ry:-90,mw:1.2,mh:1.2,jarak:1.7});
    if(dua) sisi.push({x:x+0.265,y:1.6,z,ry:90,mw:1.2,mh:1.2,jarak:1.7});
  });
  S.concat(sisi).forEach(s=>slotBaru(g,s));
  PER_SAYAP=slotSayap.length;
  // dinding sayap: tabrakan
  SOLID.push([10.7,29.3,-0.7,0.7],[10.7,29.3,-12.7,-11.3],[27.9,29.3,-12.7,0.7]);
}

function isiSayap(){
  if(!slotSayap.length) return;
  const n=galeri.length, maks=Math.max(0,Math.ceil(n/PER_SAYAP)-1); halaman=Math.min(halaman,maks);
  const hal=galeri.slice(halaman*PER_SAYAP,(halaman+1)*PER_SAYAP); daftarKarya=[];
  slotSayap.forEach((s,i)=>{
    s.v++; const ver=s.v;
    if(s.im){ s.im.remove(); s.im=null; } if(s.kartu){ s.kartu.remove(); s.kartu=null; }
    s.luar.setAttribute('width',s.mw+0.1); s.luar.setAttribute('height',s.mh+0.1); s.kanvas.setAttribute('width',s.mw); s.kanvas.setAttribute('height',s.mh);
    const k=hal[i];
    if(!k){ s.ket.setAttribute('visible',true); s.luar.setAttribute('color','#2b2118'); return; }
    s.ket.setAttribute('visible',false); s.luar.setAttribute('color',k.milikSaya?'#d9a21b':'#2b2118');
    const idx=daftarKarya.push({k,s})-1;
    const im=el(s.f,'a-image',{width:s.mw,height:s.mh,position:'0 0 0.035',src:kecil(k.url,512),class:'klik',role:'img','aria-label':'Karya '+namaAman(k.nama)+': '+temaKarya(k).tema});
    s.im=im; im.addEventListener('click',()=>{ if(klikSah()) bukaKarya(idx); }); pulihGambar(im,k.url,512,()=>{ im.remove(); if(s.im===im) s.im=null; });
    const tm=temaKarya(k), kt=el(s.f,'a-entity',{position:`0 ${-(s.mh/2+0.31)} 0.03`});   // v2.22: plakat gaya museum (dasar cokelat tua, tepi emas, judul emas, teks krem), ringkas dan rapat
    const pk=plakatBulat(kt); aturPlakat(pk,1.3,0.4,0.05,'0 0 0.011');
    const bar=(v,w,mn,y,warna,tebal)=>{ v=String(v); const at={value:v,align:'center',width:w,wrapCount:Math.max(mn,v.length+1),position:`0 ${y} 0.025`,color:warna}; if(tebal) at.font='exo2bold'; el(kt,'a-text',at); };
    bar((k.milikSaya?'Karyamu: ':'')+(namaAman(k.nama)||'Siswa').slice(0,18),1.1,20,0.1,'#e9c46a',true);
    bar(String(tm.tema).slice(0,26),1.1,22,0,'#f3e6c8');
    bar([tm.aliran,String(tm.palet||'').split(' (')[0]].filter(Boolean).join(' | ').slice(0,34)||'Karya siswa',1.1,24,-0.1,'#e0d2b0');   // palet tanpa keterangan dalam kurung agar tidak terpotong
    s.kartu=kt;
    ukuranGambar(k.url,512).then(d=>{ if(s.v!==ver||!d) return; const [w,h]=fitRasio(d[0],d[1],s.mw,s.mh);
      im.setAttribute('width',w); im.setAttribute('height',h); s.luar.setAttribute('width',w+0.1); s.luar.setAttribute('height',h+0.1); s.kanvas.setAttribute('width',w); s.kanvas.setAttribute('height',h);
      kt.setAttribute('position',`0 ${-(h/2+0.31)} 0.03`); });
  });
  if(judulSayap) judulSayap.forEach(j=>j.setAttribute('value',n+' karya terpajang'+(maks>0?' (halaman '+(halaman+1)+' dari '+(maks+1)+')':'')));
  perbaruiPager(); perbaruiLayar();
}
function perbaruiPager(){ const maks=Math.ceil(galeri.length/PER_SAYAP); $('pager').style.display=(zonaAktif==='D'&&maks>1)?'inline-flex':'none'; $('hal').textContent=`${halaman+1}/${Math.max(1,maks)}`; }

/* ---------- Kartu karya siswa ---------- */
document.head.insertAdjacentHTML('beforeend',`<style>#kartuKarya{right:10px;bottom:10px;width:min(340px,94vw);display:none;background:#fbf8f1}#kartuKarya h3{margin:0 0 4px;font:700 18px/1.25 Georgia,serif}#kartuKarya p{margin:2px 0}#kartuKarya .aksi{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}</style>`);
document.body.insertAdjacentHTML('beforeend','<div id="kartuKarya" class="ui" role="dialog" aria-labelledby="kTema"><h3 id="kTema"></h3><p id="kMeta"></p><p id="kAI" style="font-size:13px;color:#5b5346">Dibuat dengan bantuan AI</p><p id="kSuka"></p><div class="aksi"><button id="kLike">Beri apresiasi</button><button id="kNext" class="alt">Karya berikutnya</button><button id="kTutup" class="alt">Kembali</button></div></div>');
function isiKartu(){ const e=daftarKarya[karyaAktif]; if(!e) return; const k=e.k, t=temaKarya(k);
  $('kTema').textContent=t.tema; $('kMeta').textContent=['Oleh '+(namaAman(k.nama)||'siswa'),t.aliran,t.palet].filter(Boolean).join(' | '); $('kSuka').textContent=k.suka+' apresiasi';
  $('kLike').disabled=!!(k.milikSaya||k.sayaSuka); $('kLike').textContent=k.milikSaya?'Ini karyamu':(k.sayaSuka?'Sudah diapresiasi':'Beri apresiasi'); }
function bukaKarya(n){
  const e=daftarKarya[n]; if(!e) return; const s=e.s;
  if($('scene').is('vr-mode')){ pesan((namaAman(e.k.nama)||'Siswa')+': '+temaKarya(e.k).tema,6000); return; }
  if(bingkaiAktif<0){ const p=$('rig').object3D.position; simpanPos={x:p.x,z:p.z}; }
  bingkaiAktif=100+n; karyaAktif=n;
  const rig=$('rig'), p=rig.object3D.position, x0=p.x, z0=p.z; rig.setAttribute('wasd-controls','enabled',false);
  tween(0,1,kurangiGerak?0:900,u=>{ rig.setAttribute('position',`${x0+(s.sx-x0)*u} 0 ${z0+(s.sz-z0)*u}`); if(u===1) arahKamera(s.yaw); });
  $('info').style.display='none'; $('latihan').style.display='none'; $('kartuKarya').style.display='block'; isiKartu(); $('kTutup').focus();
}
$('kTutup').onclick=()=>tutup();
$('kNext').onclick=()=>{ if(daftarKarya.length) bukaKarya((karyaAktif+1)%daftarKarya.length); };
$('kLike').onclick=async()=>{ const e=daftarKarya[karyaAktif]; if(!e) return; try{ const n=await gs('sukaiKarya',e.k.id);
  if(n){ e.k.suka=n; e.k.sayaSuka=true; isiKartu(); pesan('Terima kasih sudah memberi apresiasi.'); } else pesan('Kamu sudah menyukai karya ini.'); }catch(er){ pesan(er.message,5000); } };

/* ---------- Booth Studio AI (6 x 6 m di sudut barat aula: x -9.5..-3.5, z -9.4..-3.4) ---------- */
function bangunBooth(g){
  kotak(g,-6.5,0.022,-6.4,6.16,0.04,6.16,PUTIH); kotak(g,-6.5,0.04,-6.4,6,0.06,6,KAYU,{class:'klik lantai'});   // panggung
  kotak(g,-9.5,1.7,-4.9,0.2,3.4,3.0,ARANG); kotak(g,-9.5,1.7,-7.9,0.2,3.4,3.0,PUTIH);                         // dinding latar: selatan arang, utara putih
  kotak(g,-7.9,1.7,-9.3,3.0,3.4,0.2,TEAL); SOLID.push([-9.8,-6.0,-9.7,-8.8]);                               // dinding L utara
  const WA={Impresionisme:'#8fb3a3',Kubisme:'#b08a5a',Ekspresionisme:'#b3412f','Batik kontemporer':EMAS,Surealisme:'#6b5b95'}, na=Object.keys(WA);
  for(let r=0;r<3;r++) for(let c=0;c<3;c++) kotak(g,-8.7+c*0.8,1.0+r*0.6,-9.17,0.34,0.34,0.06,WA[na[(r*3+c)%5]]);   // relung warna aliran
  for(let i=0;i<6;i++) kotak(g,-6.2+i*0.42,1.5,-9.2,0.08,3.0,0.25,PUTIH); SOLID.push([-6.75,-3.65,-9.75,-8.75]);     // sirip putih
  // layar besar (karya terbaru) di dinding latar utara
  const lay=el(g,'a-entity',{position:'-9.36 1.9 -7.9',rotation:'0 90 0'});
  el(lay,'a-box',{width:2.4,height:1.35,depth:0.08,color:'#1d1812'});
  layarBooth.fb=el(lay,'a-text',{value:'STUDIO AI',align:'center',width:2.0,position:'0 0 0.05',color:'#f3e6c8'});
  layarBooth.im=el(lay,'a-image',{width:2.2,height:1.15,position:'0 0 0.05',visible:false}); layarBooth.i=0;
  // dua poster di dinding latar selatan
  [[-5.55,'TEMA','Apa yang ingin kamu lukis?'],[-4.15,'ALIRAN','Pilih gaya senimu']].forEach(([z,a,b])=>{
    const p=el(g,'a-entity',{position:`-9.38 1.7 ${z}`,rotation:'0 90 0'}); el(p,'a-box',{width:1.1,height:1.5,depth:0.04,color:PUTIH});
    el(p,'a-text',{value:a,align:'center',width:1.0,position:'0 0.3 0.03',color:TEAL}); el(p,'a-text',{value:b,align:'center',width:0.9,wrapCount:12,position:'0 -0.2 0.03',color:'#2b2118'}); });
  // lima papan aliran (klik mengisi pilihan aliran)
  na.forEach((nm,i)=>{ const b=el(g,'a-entity',{position:`-9.38 2.95 ${-6.0+i*0.6}`,rotation:'0 90 0'});
    const bx=el(b,'a-box',{width:0.5,height:0.5,depth:0.04,color:WA[nm],class:'klik'});
    el(b,'a-text',{value:nm,align:'center',width:0.46,wrapCount:8,position:'0 0 0.03',color:'#ffffff'});
    bx.addEventListener('click',()=>{ if(!klikSah()) return; const sel=$('aliran'); if(sel){ sel.value=nm; pesan('Aliran dipilih: '+nm+'.',2500); } }); });
  // balok judul sisi timur (dua tulisan: ke aula dan ke dalam booth) + dua tiang
  kotak(g,-3.6,3.95,-6.4,0.3,1.5,6.0,TEAL); [-9.2,-3.6].forEach(z=>kotak(g,-3.6,1.6,z,0.12,3.2,0.12,PUTIH)); SOLID.push([-4.1,-3.1,-9.65,-8.75],[-4.1,-3.1,-4.05,-3.15]);
  [[-3.44,90],[-3.76,-90]].forEach(([x,ry])=>{ el(g,'a-text',{value:'STUDIO AI',align:'center',font:'exo2bold',width:11,wrapCount:20,position:`${x} 4.2 -6.4`,rotation:`0 ${ry} 0`,color:'#f3e6c8',side:'double'});
    el(g,'a-text',{value:'Ciptakan karyamu',align:'center',width:4.4,wrapCount:16,position:`${x} 3.8 -6.4`,rotation:`0 ${ry} 0`,color:EMAS,side:'double'}); });
  // totem sudut tenggara (v2.22: tulisan vertikal dihapus)
  kotak(g,-3.85,1.7,-3.75,0.4,3.4,0.3,TEAL); SOLID.push([-4.45,-3.25,-4.25,-3.15]);
  // meja layanan + papan langkah
  kotak(g,-5.3,0.5,-3.95,1.4,1.0,0.5,TEAL); kotak(g,-5.3,1.02,-3.95,1.5,0.04,0.6,KAYU); SOLID.push([-6.4,-4.2,-4.55,-3.25]);
  kotak(g,-5.3,1.55,-3.98,1.3,0.55,0.04,PUTIH);
  el(g,'a-text',{value:'MULAI DI SINI\n1 Tulis tema   2 Pilih aliran\n3 Buat gambar   4 Pajang',align:'center',width:1.2,position:'-5.3 1.55 -3.95',color:'#2b2118'});
  // dua meja bundar + empat kursi
  [[-7.7,-5.6,[[-0.75,0,90],[0,0.75,180]]],[-5.9,-7.9,[[-0.75,0,90],[0,-0.75,0]]]].forEach(([x,z,ks])=>{
    el(g,'a-cylinder',{position:`${x} 0.75 ${z}`,radius:0.5,height:0.05,color:KAYU}); el(g,'a-cylinder',{position:`${x} 0.37 ${z}`,radius:0.05,height:0.74,color:ARANG}); el(g,'a-cylinder',{position:`${x} 0.02 ${z}`,radius:0.28,height:0.04,color:ARANG});
    SOLID.push([x-0.9,x+0.9,z-0.9,z+0.9]);
    ks.forEach(([dx,dz,ry])=>{ const c=el(g,'a-entity',{position:`${x+dx} 0 ${z+dz}`,rotation:`0 ${ry} 0`}); el(c,'a-box',{position:'0 0.45 0',width:0.42,height:0.05,depth:0.42,color:PUTIH}); el(c,'a-box',{position:'0 0.72 -0.19',width:0.42,height:0.5,depth:0.05,color:PUTIH}); }); });
  tanaman(g,-8.8,-3.9,1,1); tanaman(g,-4.1,-8.6,1,2);
}
function perbaruiLayar(){
  if(!layarBooth.im||!layarBooth.im.parentNode) return; const L=galeri.slice(-8).reverse();
  if(!L.length){ layarBooth.im.setAttribute('visible',false); layarBooth.fb.setAttribute('visible',true); return; }
  const k=L[layarBooth.i%L.length];
  ukuranGambar(k.url,512).then(d=>{ if(!d||!layarBooth.im.parentNode) return; const [w,h]=fitRasio(d[0],d[1],2.2,1.15); layarBooth.im.setAttribute('src',kecil(k.url,512)); layarBooth.im.setAttribute('width',w); layarBooth.im.setAttribute('height',h); layarBooth.im.setAttribute('visible',true); layarBooth.fb.setAttribute('visible',false); });
}
setInterval(()=>{ if(document.hidden||!token||!layarBooth.im||kurangiGerak) return; layarBooth.i++; perbaruiLayar(); },6000);

/* ---------- Zona: Studio AI (booth), Galeri Karya Siswa (sayap), Museum ---------- */
setInterval(()=>{
  if(!token||dariAtas||bingkaiAktif>=0) return;
  const p=$('rig').object3D.position;
  const sayap=p.x>10.4&&p.x<28.3&&p.z>-11.7&&p.z<-0.3;
  const masukB=p.x>-9.3&&p.x<-3.7&&p.z>-9.2&&p.z<-3.6, keluarB=p.x<-9.8||p.x>-3.1||p.z<-9.9||p.z>-2.9;
  const baru=sayap?'D':(zonaAktif==='C'?(keluarB?'A':'C'):(masukB?'C':'A'));
  if(baru===zonaAktif) return;
  zonaAktif=baru; $('studio').style.display=baru==='C'?'block':'none'; perbaruiPager();
  if(baru==='D'&&Date.now()-(window.__galMuat||0)>20000){ window.__galMuat=Date.now(); muatGaleri().then(isiSayap).catch(()=>{}); }
},300);

/* ---------- Denah baru: sama dengan dunia 3D (plaza, aula, booth, ruang lukisan, sayap) ---------- */
function gambarDenah(pos){
  const W=1280,H=820,c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d');
  /* v2.19 T19: skala 14 px/m supaya plaza penuh (x -20..20, z 1..23) dan gedung (x -10..29, z -26..0) muat dalam satu peta */
  const s=14, ox=30, oy=60, X=x=>ox+(x+20)*s, Z=z=>oy+(z+26.5)*s;
  g.fillStyle='#f4ecd8'; g.fillRect(0,0,W,H); g.strokeStyle='#3a2f26'; g.lineWidth=6; g.strokeRect(6,6,W-12,H-12);
  const R=(x1,z1,x2,z2,isi,garis,tebal)=>{ g.fillStyle=isi; g.fillRect(X(x1),Z(z1),(x2-x1)*s,(z2-z1)*s); if(garis){ g.strokeStyle=garis; g.lineWidth=tebal||3; g.strokeRect(X(x1),Z(z1),(x2-x1)*s,(z2-z1)*s); } };
  const O=(x,z,r,isi,garis)=>{ g.fillStyle=isi; g.beginPath(); g.arc(X(x),Z(z),r*s,0,7); g.fill(); if(garis){ g.strokeStyle=garis; g.lineWidth=1.5; g.stroke(); } };   // lingkaran, jari-jari dalam meter
  const T=(t,x,y,uk,warna,rata,tebal,fam)=>{ g.font=(tebal?'bold ':'')+uk+'px '+(fam||'Georgia, serif'); g.fillStyle=warna||'#2b2118'; g.textAlign=rata||'left'; g.textBaseline='middle'; g.fillText(t,x,y); };
  const B=(n,x,z)=>{ g.fillStyle='#8a2c1c'; g.beginPath(); g.arc(X(x),Z(z),10,0,7); g.fill(); T(String(n),X(x),Z(z)+1,13,'#fff','center',true); };
  const bagi=(t,x,y,w,uk,warna,lh)=>{ g.font=uk+'px Georgia, serif'; let baris='',yy=y; t.split(' ').forEach(k=>{ const u=baris?baris+' '+k:k; if(g.measureText(u).width>w&&baris){ T(baris,x,yy,uk,warna); yy+=lh; baris=k; } else baris=u; }); T(baris,x,yy,uk,warna); return yy; };
  // plaza penuh 40 x 22 m, serambi, tiga undak (dari bawah ke atas), empat kolom
  R(-20,1,20,23,'#d9cfb6','#3a2f26',2);
  R(-8.4,0.3,8.4,1.5,'#efe6cf'); R(-8.4,1.5,-4.8,2.1,'#efe6cf'); R(4.8,1.5,8.4,2.1,'#efe6cf');
  [[-6,3.3,6,4.9],[-5.4,2.4,5.4,4.0],[-4.8,1.5,4.8,3.1]].forEach(([x1,z1,x2,z2])=>R(x1,z1,x2,z2,'#e8dfc9','#6b5a3a',1.5));
  [-7.6,-3.8,3.8,7.6].forEach(x=>O(x,1.6,0.4,'#fbf6ea','#3a2f26'));
  PLAZA.bangku.forEach(([x,z,ry])=>ry?R(x-0.25,z-0.9,x+0.25,z+0.9,'#6d4a2b'):R(x-0.9,z-0.25,x+0.9,z+0.25,'#6d4a2b'));
  PLAZA.tanaman.forEach(([x,z])=>O(x,z,0.45,'#2f7d3a')); PLAZA.lampu.forEach(([x,z])=>O(x,z,0.3,'#f2c14e','#3a2f26'));
  R(-10,-12,10,0,'#efe6cf','#3a2f26',4); R(-10,-26,10,-12,'#e1e8d6','#3a2f26',4);
  R(10,-12,29,0,'#f1ede4','#3a2f26',4);                                  // sayap karya siswa
  R(-9.5,-9.4,-3.5,-3.4,'#c9a77a','#2f6f8f',3);                          // booth Studio AI
  g.strokeStyle='#efe6cf'; g.lineWidth=7; g.beginPath(); g.moveTo(X(-2.5),Z(0)); g.lineTo(X(2.5),Z(0)); g.moveTo(X(-1.5),Z(-12)); g.lineTo(X(1.5),Z(-12)); g.moveTo(X(10),Z(-4.5)); g.lineTo(X(10),Z(-7.5)); g.stroke();   // pintu depan, pintu Ruang Maestro, bukaan sayap
  g.fillStyle='#c9902f';
  for(let n=0;n<4;n++){ const z=-14.5-n*3.2; g.fillRect(X(-9.7),Z(z)-1.2*s,5,2.4*s); g.fillRect(X(9.7)-5,Z(z)-1.2*s,5,2.4*s); }
  [-5.5,5.5].forEach(x=>{ g.fillRect(X(x)-1.2*s,Z(-25.7),2.4*s,5); g.fillRect(X(x)-1.2*s,Z(-12.2)-6,2.4*s,5); });
  // nomor bingkai mengikuti urutan keliling (v2.19 T18): barat 1-4, belakang 5-6, timur 7-10 (jauh ke dekat), depan 11-12 (timur ke barat)
  for(let n=0;n<4;n++){ const z=-14.5-n*3.2; B(n+1,-8.6,z); B(10-n,8.6,z); }
  B(5,-5.5,-24.2); B(6,5.5,-24.2); B(11,5.5,-13.4); B(12,-5.5,-13.4);
  [-15,-18.2,-21.4,-24.2].forEach(z=>R(-0.6,z-0.6,0.6,z+0.6,'#8b867c','#3a2f26',2));
  [[-8.7,-1.4],[9.0,-0.9],[-8.7,-10.6],[8.7,-10.6],[-8.3,-13.2],[8.3,-13.2],[-8.5,-24.9],[8.5,-24.9],[-8.8,-3.9],[-4.1,-8.6]].forEach(([x,z])=>O(x,z,0.4,'#2f7d3a'));
  R(5.6,-10.25,7.4,-9.75,'#6d4a2b'); R(7.65,-20.2,8.15,-18.4,'#6d4a2b'); R(-8.15,-20.2,-7.65,-18.4,'#6d4a2b'); R(5.1,-2.6,7.3,-2.4,'#3a2f26');   // bangku, papan denah
  // isi booth: meja layanan, meja bundar, layar, totem
  R(-6.0,-4.2,-4.6,-3.7,'#2f6f8f'); [[-7.7,-5.6],[-5.9,-7.9]].forEach(([x,z])=>O(x,z,0.55,'#fff','#3a2f26'));
  R(-9.55,-9.0,-9.4,-6.8,'#1d1812'); R(-4.05,-3.9,-3.65,-3.6,'#2f6f8f');
  // isi sayap: panel A (dua baris), panel judul, kotak B
  [[-4.0,[14.1,18.3,22.5]],[-8.0,[16.8,21.0]]].forEach(([z,xs])=>xs.forEach(x=>R(x-1.5,z-0.07,x+1.5,z+0.07,'#8b867c','#3a2f26',1)));
  [[25.1,-2.7],[25.1,-8.3],[26.9,-5.5],[26.9,-10.4]].forEach(([x,z])=>R(x-0.25,z-1.1,x+0.25,z+1.1,'#585d66','#3a2f26',1));
  T('PLAZA',X(0),Z(21.8),16,'#6b5a3a','center',true); T('AULA',X(3),Z(-1.2),16,'#6b5a3a','center',true); T('STUDIO AI',X(-6.5),Z(-6.5),13,'#1d3a4a','center',true); T('GALERI KARYA SISWA',X(19.5),Z(-6),17,'#3a2f26','center',true);
  B(1,0,10); B(2,2,-7.5); B(3,-4.6,-5.6); B(4,-3.2,-19); B(5,0,-19.8); B(6,14,-6);
  g.fillStyle='#2b2118'; g.beginPath(); g.moveTo(X(0),Z(5.4)-10); g.lineTo(X(0)-9,Z(5.4)+4); g.lineTo(X(0)+9,Z(5.4)+4); g.fill(); T('PINTU MASUK',X(0),Z(5.4)+20,14,'#2b2118','center',true);
  g.strokeStyle='#2b2118'; g.lineWidth=4; g.beginPath(); g.arc(W-70,90,28,0,7); g.stroke(); T('U',W-70,80,22,'#2b2118','center',true); g.beginPath(); g.moveTo(W-70,94); g.lineTo(W-70,114); g.stroke();
  { let uk=34; g.font=uk+'px '+FONT_MUSEUM; while(g.measureText('DENAH MUSEUM SENI').width>380&&uk>18){ uk--; g.font=uk+'px '+FONT_MUSEUM; } T('DENAH MUSEUM SENI',860,60,uk,'#2b2118','left',false,FONT_MUSEUM); }
  T('Kurator: Diah Ayu Kurniawati',860,102,30,'#6b5a3a','left',false,FONT_KURATOR);   // v2.25: Moontime
  [['Plaza dan pintu masuk','Plaza 40 x 22 m, tiga undak naik ke pintu'],['Aula','20 x 12 m: papan denah, bangku, tanaman'],['Studio AI','Booth 6 x 6 m untuk membuat gambar dengan bantuan AI'],
   ['Ruang Lukisan Era Modernisme','20 x 14 m, 12 bingkai, Romantisme sampai Abstrak'],['Patung dan Pahatan','Empat podium di tengah ruang lukisan'],['Galeri Karya Siswa','Sayap timur 18,6 x 12,6 m: karya Studio AI yang sudah disetujui']]
   .forEach(([a,b],n)=>{ const y=170+n*70; g.fillStyle='#8a2c1c'; g.beginPath(); g.arc(872,y,13,0,7); g.fill(); T(String(n+1),872,y+1,16,'#fff','center',true); T(a,898,y-9,20,'#2b2118','left',true); bagi(b,898,y+14,360,16,'#5b4a30',19); });
  g.fillStyle='#c9902f'; g.fillRect(860,640,7,24); T('Bingkai lukisan (angka = nomor bingkai)',878,652,15,'#2b2118');
  g.fillStyle='#8b867c'; g.fillRect(860,676,24,16); T('Podium / panel pajang',894,684,15,'#2b2118'); g.fillStyle='#6d4a2b'; g.fillRect(1090,678,24,12); T('Bangku',1122,684,15,'#2b2118');
  g.fillStyle='#2f7d3a'; g.beginPath(); g.arc(872,716,7,0,7); g.fill(); T('Tanaman',888,716,15,'#2b2118');
  g.fillStyle='#d6322a'; g.beginPath(); g.arc(1030,716,8,0,7); g.fill(); T('Anda di sini',1046,716,15,'#2b2118');
  g.fillStyle='#2b2118'; g.fillRect(860,756,5*s,5); T('5 m',860+5*s+8,758,14,'#2b2118');
  g.fillStyle='#fbf6ea'; g.strokeStyle='#3a2f26'; g.lineWidth=1.5; g.beginPath(); g.arc(1010,758,7,0,7); g.fill(); g.stroke(); T('Kolom',1022,758,15,'#2b2118');
  g.fillStyle='#f2c14e'; g.beginPath(); g.arc(1110,758,6,0,7); g.fill(); g.stroke(); T('Tiang lampu',1122,758,15,'#2b2118');
  if(pos){ const di=pos.x>=-20.5&&pos.x<=29.6&&pos.z>=-26.5&&pos.z<=23.8;
    if(di){ const px=X(pos.x), pz=Z(pos.z);
      g.fillStyle='#d6322a'; g.strokeStyle='#fff'; g.lineWidth=3; g.beginPath(); g.arc(px,pz,10,0,7); g.fill(); g.stroke();
      if(!pos.statis){ const dx=-Math.sin(pos.yaw), dy=-Math.cos(pos.yaw); g.beginPath(); g.moveTo(px+dx*24,pz+dy*24); g.lineTo(px-dy*8+dx*6,pz+dx*8+dy*6); g.lineTo(px+dy*8+dx*6,pz-dx*8+dy*6); g.closePath(); g.fill(); }
      T('ANDA DI SINI',px+(px>X(18)?-18:18),pz-20,14,'#d6322a',px>X(18)?'right':'left',true);
    } else T('Anda sedang di luar peta',860,796,16,'#d6322a','left',true); }   // v2.19 T19: mis. saat 'Lihat dari atas'
  return c.toDataURL('image/png');
}

try{ $('ver').textContent+=' \u00b7 museum 2.22'; }catch(e){}   // penanda: museum.js termuat sampai akhir (HARUS tetap paling bawah)