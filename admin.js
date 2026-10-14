/* Ruang Rupa v2.22 - Panel Admin: Langkah awal, Lukisan, Kelas, Soal, Moderasi, Rekap, Pengguna, Log. Dimuat setelah museum.js.
   Menyembunyikan tombol hanyalah kenyamanan; hak akses sebenarnya diperiksa server (wajibPeran_). */
const RANK = { siswa:1, manajer:2, admin:3, pemilik:4 };
let kelasData = [], tabAdm = 'mulai';
document.head.insertAdjacentHTML('beforeend','<style>#adm{inset:10px;z-index:20;display:none;overflow:auto;background:#fbf8f1}#adm .tab{background:#6b7a80}#adm .tab[aria-selected="true"]{background:var(--accent)}#adm table{border-collapse:collapse;width:100%;font-size:14px}#adm td,#adm th{border-bottom:1px solid #ddd;padding:6px;text-align:left}#adm input,#adm select{padding:6px;margin:2px 4px 2px 0;max-width:100%}#adm .bar{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0;align-items:center}#adm .tbl{overflow-x:auto}</style>');
document.body.insertAdjacentHTML('beforeend','<div id="adm" class="ui" role="dialog" aria-label="Panel Admin"><div class="bar"><b style="font-size:18px;flex:1">Panel Admin</b><button id="admTutup" class="alt">Tutup</button></div><div class="bar" id="admTab" role="tablist"></div><div id="admIsi"></div></div>');
function h(t,p,...c){ const e=document.createElement(t); Object.assign(e,p||{}); c.flat().forEach(x=>e.append(x)); return e; }   // semua teks lewat textContent (aman dari injeksi)
const opt=(v,t,sel)=>h('option',{value:v,textContent:t,selected:!!sel});

function siapkanAdmin(){
  if((RANK[saya.peran]||0)<2||$('bAdmin')) return;
  ($('hudAdmin')||$('hud')).insertAdjacentHTML('beforeend','<button id="bAdmin">Panel Admin</button>'); if($('hudAdmin')) $('hudAdmin').parentElement.style.display='block'; $('bAdmin').onclick=bukaAdmin;
}
function tutupAdmin(){ const buka=$('adm').style.display==='block'; $('adm').style.display='none'; if(buka&&sudahMasuk&&window.renderJeda) renderJeda(false); }   // v2.22: 3D digambar lagi setelah panel ditutup
$('admTutup').onclick=tutupAdmin;
addEventListener('keydown',e=>{ if(e.key==='Escape'&&$('adm').style.display==='block') tutupAdmin(); });
const keLoginAsli=keLogin; keLogin=function(i){ tutupAdmin(); const b=$('bAdmin'); if(b) b.remove(); if($('hudAdmin')) $('hudAdmin').parentElement.style.display='none'; keLoginAsli(i); };

async function bukaAdmin(){
  $('adm').style.display='block'; $('admIsi').textContent='Memuat...'; if(window.renderJeda) renderJeda(true);   // v2.22: hentikan penggambaran museum 3D di belakang panel
  try{ kelasData=await gs('adminDaftarKelas'); }catch(e){ tutupAdmin(); return pesan(e.message); }
  pilihTab(kelasData.length?'kelas':'mulai');
}
const TABS=[['mulai','Langkah awal',2],['lukisan','Lukisan',2],['kelas','Kelas',2],['soal','Soal',2],['moderasi','Moderasi',2],['rekap','Rekap',2],['pengguna','Pengguna',2],['log','Log',3]];
function pilihTab(t){
  tabAdm=t; const ada=TABS.filter(x=>(RANK[saya.peran]||0)>=x[2]);
  $('admTab').replaceChildren(...ada.map(([k,n])=>{ const b=h('button',{className:'tab',textContent:n,onclick:()=>pilihTab(k)});
    b.setAttribute('role','tab'); b.setAttribute('aria-selected',String(k===t)); return b; }));
  ({mulai:renderMulai,lukisan:renderLukisan,kelas:renderKelas,soal:renderSoal,moderasi:renderModerasi,rekap:renderRekap,pengguna:renderPengguna,log:renderLog})[t]();
}
async function renderMulai(){
  let l=[]; try{ l=await gs('adminDaftarLukisan'); }catch(e){}
  const asli=l.filter(x=>!x.contoh&&x.status!=='nonaktif'), terbit=asli.filter(x=>x.status==='terbit');
  const li=(ok,t)=>h('li',{textContent:(ok?'[selesai] ':'[belum] ')+t});
  $('admIsi').replaceChildren(h('p',{textContent:'Langkah awal menyiapkan museum:'}),
    h('ol',{},li(kelasData.length>0,'Buat kelas (tab Kelas)'),li(asli.length>0,'Unggah lukisan (tab Lukisan)'),
      h('li',{textContent:'Tulis soal untuk tiap lukisan (tab Soal)'}),li(terbit.length>0,'Terbitkan lukisan (tombol Terbitkan di formulir)')),
    h('p',{style:'font-size:13px;color:#555',textContent:'Data contoh bisa dinonaktifkan dari tab Lukisan setelah lukisan asli siap.'}));
}
function renderKelas(){
  let idEdit='';
  const nama=h('input',{placeholder:'mis. 7A atau 8 Mawar',maxLength:30}), urut=h('input',{type:'number',style:'width:70px',value:kelasData.length+1}),
        st=h('select',{},opt('aktif','aktif'),opt('nonaktif','nonaktif')), kode=h('input',{placeholder:'kode kelas (4-20 huruf/angka)',maxLength:20,style:'width:190px'});
  const simpan=h('button',{textContent:'Simpan kelas',onclick:async()=>{
    try{ await gs('adminSimpanKelas',{id:idEdit,nama:nama.value,urutan:Number(urut.value)||0,status:st.value,kode:kode.value}); kelasData=await gs('adminDaftarKelas'); renderKelas(); pesan('Kelas disimpan.'); }
    catch(e){ pesan(e.message); } }});
  const baru=h('button',{className:'alt',textContent:'Tambah Kelas',onclick:()=>{ idEdit=''; nama.value=''; kode.value=''; urut.value=kelasData.length+1; st.value='aktif'; nama.focus(); }});
  const baris=kelasData.map(k=>h('tr',{},h('td',{textContent:k.nama}),h('td',{textContent:k.urutan}),h('td',{textContent:k.status}),h('td',{textContent:k.kode||'-'}),h('td',{textContent:k.jumlah}),
    h('td',{},h('button',{className:'alt',textContent:'Ubah',onclick:()=>{ idEdit=k.id; nama.value=k.nama; kode.value=k.kode||''; urut.value=k.urutan; st.value=k.status; nama.focus(); }}))));
  $('admIsi').replaceChildren(h('div',{className:'bar'},baru),h('div',{className:'bar'},nama,urut,st,kode,simpan),
    h('p',{style:'font-size:13px;color:#555',textContent:'Kelas tidak dihapus, hanya dinonaktifkan. Mengganti nama aman karena data memakai ID tetap. Bagikan KODE kelas kepada siswa untuk mendaftar; kosongkan kode untuk menutup pendaftaran ke kelas itu.'}),
    h('div',{className:'tbl'},h('table',{},h('tr',{},...['Nama','Urutan','Status','Kode','Siswa',''].map(x=>h('th',{textContent:x}))),...baris)));
}
async function renderPengguna(){
  const isi=$('admIsi'); isi.textContent='Memuat...';
  let u; try{ /* v2.22: dua panggilan paralel */ [u,kelasData]=await Promise.all([gs('adminDaftarPengguna'),gs('adminDaftarKelas')]); }catch(e){ isi.textContent=e.message; return; }
  const kepala=[];
  if((RANK[saya.peran]||0)>=3){
    const em=h('input',{type:'email',placeholder:'email Google',style:'min-width:220px'}), pr=h('select',{},opt('manajer','manajer'),opt('admin','admin'));
    kepala.push(h('div',{className:'bar'},em,pr,h('button',{textContent:'Tambah peran',onclick:async()=>{
      try{ await gs('adminTambahPeran',em.value,pr.value); pesan('Peran ditambahkan.'); renderPengguna(); }catch(e){ pesan(e.message); } }})));
  }
  const baris=u.map(x=>{ const aksi=[];
    if(x.peran==='siswa'){
      const sel=h('select',{},opt('','(belum ada)'),...kelasData.filter(k=>k.status==='aktif'||k.id===x.kelas_id).map(k=>opt(k.id,k.nama+(k.status==='aktif'?'':' (nonaktif)'),k.id===x.kelas_id)));
      sel.onchange=async()=>{ try{ await gs('adminPindahSiswaKelas',x.email,sel.value); pesan('Kelas siswa dipindah.'); }catch(e){ pesan(e.message); } };
      aksi.push(sel);
    } else if(x.peran==='manajer'||x.peran==='admin'){
      aksi.push(h('button',{className:'alt',textContent:'Turunkan jadi siswa',onclick:async()=>{
        if(!confirm('Turunkan '+x.email+' menjadi siswa?')) return;
        try{ await gs('adminHapusPeran',x.email); renderPengguna(); }catch(e){ pesan(e.message); } }}));
    }
    if(x.email.endsWith('#pw')) aksi.push(h('button',{className:'alt',textContent:'Reset sandi',onclick:async()=>{
      const b=prompt('Sandi baru untuk '+x.email.replace('#pw','')+' (minimal 8 karakter):'); if(!b) return;
      try{ await gs('adminResetSandi',x.email,b); pesan('Sandi direset. Sampaikan ke yang bersangkutan.'); }catch(e){ pesan(e.message); } }}));
    return h('tr',{},h('td',{textContent:x.email.replace('#pw',' (sandi)')}),h('td',{textContent:x.peran}),h('td',{},...aksi)); });
  isi.replaceChildren(...kepala,h('div',{className:'tbl'},h('table',{},h('tr',{},...['Email','Peran','Kelas / aksi'].map(t=>h('th',{textContent:t}))),...baris)));
}

/* ===== v2.04: tab Lukisan, Soal, Log ===== */
const ALIRAN=['Romantisme','Naturalisme','Realisme','Impresionisme','Ekspresionisme','Kubisme','Surealisme','Abstrak','Nusantara'];
const fld=(label,el)=>h('div',{},h('label',{textContent:label,style:'display:block;font-weight:600;margin-top:8px'}),el);
const ta=(v,n)=>h('textarea',{value:v||'',rows:n||3,style:'width:100%;box-sizing:border-box;padding:6px'});
const inp=(v,ph,max)=>h('input',{value:v==null?'':String(v),placeholder:ph||'',maxLength:max||120,style:'width:100%;box-sizing:border-box'});

function kecilkan(f){   // perkecil ke <= 1024 px lalu jadi JPEG base64
  return new Promise((ok,gagal)=>{
    if(!/^image\/(jpeg|png)$/.test(f.type)) return gagal(new Error('Pilih file JPG atau PNG.'));
    const im=new Image(), u=URL.createObjectURL(f);
    im.onload=()=>{ const s=Math.min(1,1024/Math.max(im.width,im.height)), c=document.createElement('canvas'); c.width=Math.round(im.width*s); c.height=Math.round(im.height*s);
      const g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,c.width,c.height); g.drawImage(im,0,0,c.width,c.height); URL.revokeObjectURL(u); ok(c.toDataURL('image/jpeg',0.85)); };
    im.onerror=()=>gagal(new Error('Gambar tidak terbaca.')); im.src=u; });
}
async function renderLukisan(){
  const isi=$('admIsi'); isi.textContent='Memuat...';
  let l; try{ l=await gs('adminDaftarLukisan'); }catch(e){ isi.textContent=e.message; return; }
  l.sort((a,b)=>a.urutan-b.urutan);
  /* v2.15: tampilkan SEMUA 12 bingkai. Bingkai tanpa lukisan tampil "Kosong" dengan tombol "Isi bingkai N". */
  const slot={};
  l.filter(x=>x.status!=='nonaktif').forEach(x=>{ const n=x.urutan; if(!(n>=1&&n<=12)) return; if(!slot[n]||(x.status==='terbit'&&slot[n].status!=='terbit')) slot[n]=x; });
  const kosong=[]; for(let n=1;n<=12;n++) if(!slot[n]) kosong.push(n);
  const urlAman=u=>/^https:\/\/lh3\.googleusercontent\.com\/d\/[\w-]+$/.test(String(u||''));
  const nonaktifkan=x=>h('button',{className:'alt',textContent:'Nonaktifkan',onclick:async()=>{ if(!confirm('Nonaktifkan "'+x.judul+'"?')) return;
    try{ await gs('adminHapusLukisan',x.id); renderLukisan(); }catch(e){ pesan(e.message); } }});
  const thumb=x=>{ const t=h('img',{alt:x.gambar?'Gambar '+x.judul:'',style:'width:56px;height:42px;object-fit:cover;border-radius:3px;background:#eee'}); if(urlAman(x.gambar)){ t.onerror=()=>{ t.onerror=null; t.src=x.gambar; }; t.src=kecil(x.gambar,160); } return t; };   // v2.22: miniatur kecil, bukan gambar penuh
  const baris12=[]; for(let n=1;n<=12;n++){
    const x=slot[n];
    if(!x){ baris12.push(h('tr',{},h('td',{textContent:String(n)}),h('td',{textContent:'-'}),h('td',{textContent:'Kosong',style:'color:#8a7f6c'}),h('td',{textContent:'-'}),h('td',{textContent:'-'}),
      h('td',{},h('button',{textContent:'Isi bingkai '+n,onclick:()=>formLukisan({urutan:n})})))); continue; }
    const aksi=[h('button',{className:'alt',textContent:'Ubah',onclick:()=>formLukisan(x)})];
    [['\u25B2',-1,'Tukar dengan bingkai sebelumnya'],['\u25BC',1,'Tukar dengan bingkai berikutnya']].forEach(([s,dd,tt])=>{ const o=slot[n+dd]; if(o) aksi.push(h('button',{className:'alt',textContent:s,title:tt,onclick:async()=>{
      try{ await gs('adminTukarUrutan',x.id,o.id); renderLukisan(); }catch(e){ pesan(e.message); } }})); });
    aksi.push(nonaktifkan(x));
    baris12.push(h('tr',{},h('td',{textContent:String(n)}),h('td',{},thumb(x)),h('td',{textContent:x.judul+(x.pelukis?' - '+x.pelukis:'')+(x.contoh?' (contoh)':'')}),h('td',{textContent:x.aliran}),h('td',{textContent:x.status}),h('td',{},...aksi)));
  }
  const lain=l.filter(x=>slot[x.urutan]!==x);
  const bar=[h('button',{textContent:kosong.length?'Isi bingkai kosong berikutnya (No '+kosong[0]+')':'Unggah Lukisan',style:'font-size:16px;padding:12px 20px',onclick:()=>formLukisan({urutan:kosong[0]||1})})];
  if(l.some(x=>x.contoh&&x.status!=='nonaktif')) bar.push(h('button',{className:'alt',textContent:'Nonaktifkan semua data contoh',onclick:async()=>{
    if(!confirm('Nonaktifkan semua lukisan bertanda contoh?')) return; try{ const n=await gs('adminNonaktifkanContoh'); pesan(n+' lukisan contoh dinonaktifkan.'); renderLukisan(); }catch(e){ pesan(e.message); } }}));
  const bagian=[h('div',{className:'bar'},...bar),
    h('p',{style:'font-size:14px;margin:6px 0',textContent:'Bingkai terisi: '+(12-kosong.length)+' dari 12'+(kosong.length?'. Kosong: No '+kosong.join(', ')+'.':'.')}),
    h('p',{style:'font-size:13px;color:#555',textContent:'Gunakan karya domain publik (pelukis wafat sebelum 1956) atau karya sendiri. Lukisan hanya bisa terbit jika gambar, sumber, dan lisensi terisi.'}),
    h('div',{className:'tbl'},h('table',{},h('tr',{},...['No','Gambar','Judul','Aliran','Status',''].map(t=>h('th',{textContent:t}))),...baris12))];
  if(lain.length) bagian.push(h('h4',{textContent:'Draf lain dan lukisan tidak aktif',style:'margin:14px 0 4px'}),
    h('div',{className:'tbl'},h('table',{},h('tr',{},...['No','Aliran','Judul','Status',''].map(t=>h('th',{textContent:t}))),
      ...lain.map(x=>h('tr',{},h('td',{textContent:String(x.urutan)}),h('td',{textContent:x.aliran}),h('td',{textContent:x.judul}),h('td',{textContent:x.status}),
        h('td',{},h('button',{className:'alt',textContent:'Ubah',onclick:()=>formLukisan(x)}),...(x.status!=='nonaktif'?[nonaktifkan(x)]:[])))))));
  isi.replaceChildren(...bagian);
}
function formLukisan(x){
  x=x||{}; let baru=null;
  const judul=inp(x.judul,'judul karya',120), pelukis=inp(x.pelukis,'nama pelukis',80), tahun=inp(x.tahun,'mis. 1872',20),
    aliran=h('select',{},...ALIRAN.map(a=>opt(a,a,a===(x.aliran||ALIRAN[0])))),
    urutan=h('input',{type:'number',min:1,max:12,value:x.urutan||1,style:'width:80px'}),
    jelas=ta(x.penjelasan,4), fakta=ta(x.fakta,2), mot=ta(x.motivasi,2),
    sumber=inp(x.sumber,'sumber gambar (nama museum/situs + tautan)',300), lisensi=inp(x.lisensi,'mis. Domain publik atau CC BY 4.0',100);
  const prev=h('img',{alt:'Pratinjau gambar',src:x.gambar?kecil(x.gambar,512):'',style:'max-width:100%;max-height:220px;margin-top:8px;border-radius:4px;display:'+(x.gambar?'block':'none')});
  prev.onerror=()=>{ if(x.gambar&&prev.src!==x.gambar){ prev.onerror=null; prev.src=x.gambar; } };
  const file=h('input',{type:'file',accept:'image/jpeg,image/png'});
  file.onchange=async()=>{ const f=file.files[0]; if(!f) return; try{ baru=await kecilkan(f); prev.src=baru; prev.style.display='block'; }catch(e){ pesan(e.message); } };
  const simpan=async(aksi,btn)=>{ btn.disabled=true;
    try{ if(baru){ x.gambar=(await gs('adminUnggahGambar',baru)).url; baru=null; }
      await gs('adminSimpanLukisan',{id:x.id||'',aksi,judul:judul.value,pelukis:pelukis.value,tahun:tahun.value,aliran:aliran.value,ruang:'Modernisme',urutan:urutan.value,
        gambar:x.gambar||'',penjelasan:jelas.value,fakta:fakta.value,motivasi:mot.value,sumber:sumber.value,lisensi:lisensi.value});
      pesan(aksi==='terbit'?'Lukisan diterbitkan.':'Draf disimpan.'); renderLukisan();
    }catch(e){ pesan(e.message,8000); btn.disabled=false; } };
  const bDraf=h('button',{className:'alt',textContent:'Simpan sebagai draf'}), bTerbit=h('button',{textContent:'Terbitkan'}), bBatal=h('button',{className:'alt',textContent:'Batal',onclick:renderLukisan});
  bDraf.onclick=()=>simpan('draf',bDraf); bTerbit.onclick=()=>simpan('terbit',bTerbit);
  $('admIsi').replaceChildren(h('h3',{textContent:x.id?'Ubah lukisan':'Unggah lukisan',style:'margin:0'}),
    fld('Gambar (JPG/PNG; di HP boleh dari galeri atau kamera)',file),prev,fld('Judul',judul),fld('Pelukis',pelukis),fld('Tahun',tahun),
    fld('Aliran',aliran),fld('Nomor bingkai di Ruang Lukisan Era Modernisme (1-12)',urutan),fld('Penjelasan karya',jelas),fld('Fakta menarik',fakta),fld('Kalimat motivasi',mot),
    fld('Sumber',sumber),fld('Lisensi',lisensi),h('div',{className:'bar',style:'margin-top:12px'},bDraf,bTerbit,bBatal));
}
async function renderSoal(){
  const isi=$('admIsi'); isi.textContent='Memuat...';
  let l; try{ l=(await gs('adminDaftarLukisan')).filter(x=>x.status!=='nonaktif'); }catch(e){ isi.textContent=e.message; return; }
  if(!l.length){ isi.textContent='Belum ada lukisan. Buat lukisan di tab Lukisan dahulu.'; return; }
  const sel=h('select',{},...l.map(x=>opt(x.id,'No.'+x.urutan+' ('+x.aliran+'): '+x.judul+(x.status==='terbit'?'':' ('+x.status+')')))), area=h('div');
  isi.replaceChildren(h('div',{className:'bar'},h('b',{textContent:'Lukisan:'}),sel),area);
  sel.onchange=()=>muatSoal(sel.value,area); muatSoal(sel.value,area);
}
async function muatSoal(lid,area){
  area.textContent='Memuat...'; let s; try{ s=await gs('adminDaftarSoal',lid); }catch(e){ area.textContent=e.message; return; }
  const baris=s.map(q=>h('tr',{},h('td',{textContent:q.pertanyaan}),h('td',{textContent:q.opsi[q.jawaban]||'?'}),h('td',{textContent:q.poin}),
    h('td',{},h('button',{className:'alt',textContent:'Ubah',onclick:()=>formSoal(lid,q,area)}),
      h('button',{className:'alt',textContent:'Hapus',onclick:async()=>{ if(!confirm('Hapus soal ini?')) return; try{ await gs('adminHapusSoal',q.id); muatSoal(lid,area); }catch(e){ pesan(e.message); } }}))));
  area.replaceChildren(h('div',{className:'bar'},h('button',{textContent:'Tambah soal',onclick:()=>formSoal(lid,null,area)}),
      h('span',{style:'font-size:13px;color:#555',textContent:'Maksimal 5 soal per lukisan ('+s.length+' terisi). Tulis soal yang benar dan dapat diverifikasi.'})),
    h('div',{className:'tbl'},h('table',{},h('tr',{},...['Pertanyaan','Jawaban benar','Poin',''].map(t=>h('th',{textContent:t}))),...baris)));
}
function formSoal(lid,q,area){
  q=q||{}; const L='ABCD';
  const tanya=ta(q.pertanyaan,3), op=[0,1,2,3].map(i=>inp((q.opsi||[])[i]||'','pilihan '+L[i],120)),
    kunci=h('select',{},...[0,1,2,3].map(i=>opt(String(i),'Kunci: '+L[i],i===q.jawaban))),
    poin=h('input',{type:'number',min:1,max:20,value:q.poin||10,style:'width:80px'}), pem=ta(q.pembahasan,3),
    pv=h('div',{style:'border:1px dashed #999;border-radius:6px;padding:8px;margin-top:10px;background:#fff'});
  const segar=()=>pv.replaceChildren(h('b',{textContent:'Pratinjau untuk siswa'}),h('p',{textContent:tanya.value||'(pertanyaan)'}),
    ...op.filter(o=>o.value.trim()).map(o=>h('div',{textContent:L[op.indexOf(o)]+'. '+o.value})),
    h('p',{style:'font-size:13px;color:#555',textContent:'Pembahasan: '+(pem.value||'-')}));
  [tanya,pem,...op].forEach(e=>e.addEventListener('input',segar));
  const simpan=h('button',{textContent:'Simpan soal',onclick:async()=>{
    const pasang=op.map((o,i)=>({t:o.value.trim(),i})).filter(p=>p.t), jaw=pasang.findIndex(p=>p.i===Number(kunci.value));
    if(jaw<0) return pesan('Kunci jawaban menunjuk pilihan yang kosong.');
    try{ await gs('adminSimpanSoal',{id:q.id||'',lukisanId:lid,pertanyaan:tanya.value,opsi:pasang.map(p=>p.t),jawaban:jaw,poin:poin.value,pembahasan:pem.value}); pesan('Soal disimpan.'); muatSoal(lid,area); }
    catch(e){ pesan(e.message,8000); } }});
  area.replaceChildren(fld('Pertanyaan',tanya),...op.map((o,i)=>fld('Pilihan '+L[i],o)),fld('Kunci jawaban',kunci),fld('Poin',poin),fld('Pembahasan',pem),pv,
    h('div',{className:'bar',style:'margin-top:10px'},simpan,h('button',{className:'alt',textContent:'Batal',onclick:()=>muatSoal(lid,area)})));
  segar();
}
async function renderLog(){
  const isi=$('admIsi'); isi.textContent='Memuat...';
  try{ const g=await gs('adminLihatLog');
    isi.replaceChildren(h('div',{className:'tbl'},h('table',{},h('tr',{},...['Waktu','Pelaku','Aksi','Objek'].map(t=>h('th',{textContent:t}))),
      ...g.map(r=>h('tr',{},h('td',{textContent:r.waktu}),h('td',{textContent:r.pelaku}),h('td',{textContent:r.aksi}),h('td',{textContent:r.objek}))))));
  }catch(e){ isi.textContent=e.message; }
}

/* ===== v2.13: tab Rekap (poin per siswa dan per kelas, ekspor CSV). Hanya siswa yang dihitung. ===== */
async function renderRekap(){
  const isi=$('admIsi'); isi.textContent='Memuat...';
  let r; try{ r=await gs('adminRekapPoin'); }catch(e){ isi.textContent=e.message; return; }
  const sel=h('select',{},opt('*','Semua kelas'),...r.kelas.map(k=>opt(k.id,k.nama)));
  const tSiswa=h('div',{className:'tbl'});
  const gambarSiswa=()=>{ const f=sel.value, L=r.siswa.filter(s=>f==='*'||s.kelasId===f);
    tSiswa.replaceChildren(L.length?h('table',{},h('tr',{},...['No','Nama','Email','Kelas','Poin','Dikerjakan','Nilai penuh'].map(t=>h('th',{textContent:t}))),
      ...L.map((s,i)=>h('tr',{},h('td',{textContent:String(i+1)}),h('td',{textContent:s.nama||'-'}),h('td',{textContent:s.email}),h('td',{textContent:s.kelas||'-'}),
        h('td',{textContent:String(s.poin)}),h('td',{textContent:s.dikerjakan+'/'+r.lukisan.length}),h('td',{textContent:String(s.penuh)})))):h('p',{textContent:'Belum ada siswa.'})); };
  sel.onchange=gambarSiswa; gambarSiswa();
  const unduh=h('button',{textContent:'Unduh CSV',onclick:async ev=>{ ev.target.disabled=true;
    try{ const f=await gs('adminEksporRekap'), u=URL.createObjectURL(new Blob([f.csv],{type:'text/csv;charset=utf-8'})), a=h('a',{href:u,download:f.nama});
      document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),2000);
    }catch(e){ pesan(e.message); }
    ev.target.disabled=false; }});
  const tKelas=h('div',{className:'tbl'},h('table',{},h('tr',{},...['Kelas','Siswa','Total poin','Rata-rata'].map(t=>h('th',{textContent:t}))),
    ...r.kelas.map(k=>h('tr',{},h('td',{textContent:k.nama}),h('td',{textContent:String(k.jumlah)}),h('td',{textContent:String(k.totalPoin)}),h('td',{textContent:String(k.rata)})))));
  const tLuk=h('div',{className:'tbl'},h('table',{},h('tr',{},...['Bingkai','Lukisan','Soal aktif','Siswa mengerjakan','Nilai penuh'].map(t=>h('th',{textContent:t}))),
    ...r.lukisan.map(l=>h('tr',{},h('td',{textContent:String(l.urutan)}),h('td',{textContent:l.judul}),h('td',{textContent:String(l.soal)}),h('td',{textContent:String(l.dikerjakan)}),h('td',{textContent:String(l.penuh)})))));
  isi.replaceChildren(h('div',{className:'bar'},sel,unduh,h('button',{className:'alt',textContent:'Muat ulang',onclick:renderRekap})),
    h('h4',{textContent:'Per siswa (urut poin tertinggi)'}),tSiswa,h('h4',{textContent:'Per kelas'}),tKelas,h('h4',{textContent:'Per lukisan'}),tLuk);
}

/* ===== v2.14: tab Moderasi karya Galeri Bersama (setujui / tolak / sembunyikan). Server memeriksa peran (wajibPeran_). ===== */
let modFilter='menunggu';
async function renderModerasi(){
  const isi=$('admIsi'); isi.textContent='Memuat...';
  const sel=h('select',{},opt('menunggu','Menunggu persetujuan'),opt('disetujui','Sudah tampil'),opt('ditolak','Ditolak / disembunyikan'));
  sel.value=modFilter;
  const area=h('div',{});
  const muat=async()=>{ modFilter=sel.value; area.textContent='Memuat...';
    let l; try{ l=await gs('adminDaftarKaryaMenunggu',sel.value); }catch(e){ area.textContent=e.message; return; }
    if(!l.length){ area.textContent='Tidak ada karya pada daftar ini.'; return; }
    area.replaceChildren(...l.map(k=>{
      const act=(teks,a,alt)=>h('button',{className:alt?'alt':'',textContent:teks,onclick:async ev=>{ ev.target.disabled=true;
        try{ await gs('adminModerasi',k.email,a); pesan('Tersimpan.'); muat(); }catch(e){ pesan(e.message,6000); ev.target.disabled=false; } }});
      const aksi=k.status==='menunggu'?[act('Setujui','setujui'),act('Tolak','tolak',true)]:k.status==='disetujui'?[act('Sembunyikan','sembunyikan',true)]:[act('Setujui lagi','setujui')];
      const img=h('img',{alt:'Karya '+k.nama,style:'max-width:180px;max-height:180px;border-radius:4px'});
      if(/^https:\/\/lh3\.googleusercontent\.com\/d\/[\w-]+$/.test(k.url)){ img.onerror=()=>{ img.onerror=null; img.src=k.url; }; img.src=kecil(k.url,400); }   // v2.22: gambar karya dimuat kecil
      return h('div',{className:'bar',style:'align-items:flex-start;border-bottom:1px solid #ddd;padding-bottom:8px'},img,
        h('div',{style:'flex:1;min-width:200px'},h('b',{textContent:k.nama+' ('+k.email+')'}),h('div',{textContent:'Tema: '+k.prompt,style:'font-size:13px'}),
          h('div',{textContent:k.suka+' suka',style:'font-size:13px'}),h('div',{className:'bar'},...aksi)));
    })); };
  sel.onchange=muat;
  isi.replaceChildren(h('div',{className:'bar'},sel,h('button',{className:'alt',textContent:'Muat ulang',onclick:muat})),area);
  muat();
}

try{ document.getElementById('ver').textContent+=' \u00b7 admin 2.22'; }catch(e){}
