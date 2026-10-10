/* Ruang Rupa v2.07 - Panel Admin: Langkah awal, Lukisan, Kelas, Soal, Pengguna, Log. Dimuat setelah museum.js.
   Menyembunyikan tombol hanyalah kenyamanan; hak akses sebenarnya diperiksa server (wajibPeran_). */
const RANK = { siswa:1, manajer:2, admin:3, pemilik:4 };
let kelasData = [], tabAdm = 'mulai';
document.head.insertAdjacentHTML('beforeend','<style>#adm{inset:10px;z-index:20;display:none;overflow:auto;background:#fbf8f1}#adm .tab{background:#6b7a80}#adm .tab[aria-selected="true"]{background:var(--accent)}#adm table{border-collapse:collapse;width:100%;font-size:14px}#adm td,#adm th{border-bottom:1px solid #ddd;padding:6px;text-align:left}#adm input,#adm select{padding:6px;margin:2px 4px 2px 0;max-width:100%}#adm .bar{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0;align-items:center}#adm .tbl{overflow-x:auto}</style>');
document.body.insertAdjacentHTML('beforeend','<div id="adm" class="ui" role="dialog" aria-label="Panel Admin"><div class="bar"><b style="font-size:18px;flex:1">Panel Admin</b><button id="admTutup" class="alt">Tutup</button></div><div class="bar" id="admTab" role="tablist"></div><div id="admIsi"></div></div>');
function h(t,p,...c){ const e=document.createElement(t); Object.assign(e,p||{}); c.flat().forEach(x=>e.append(x)); return e; }   // semua teks lewat textContent (aman dari injeksi)
const opt=(v,t,sel)=>h('option',{value:v,textContent:t,selected:!!sel});

function siapkanAdmin(){
  if((RANK[saya.peran]||0)<2||$('bAdmin')) return;
  $('hud').insertAdjacentHTML('beforeend','<button id="bAdmin">Panel Admin</button>'); $('bAdmin').onclick=bukaAdmin;
}
function tutupAdmin(){ $('adm').style.display='none'; }
$('admTutup').onclick=tutupAdmin;
addEventListener('keydown',e=>{ if(e.key==='Escape'&&$('adm').style.display==='block') tutupAdmin(); });
const keLoginAsli=keLogin; keLogin=function(i){ tutupAdmin(); const b=$('bAdmin'); if(b) b.remove(); keLoginAsli(i); };

async function bukaAdmin(){
  $('adm').style.display='block';
  try{ kelasData=await gs('adminDaftarKelas'); }catch(e){ tutupAdmin(); return pesan(e.message); }
  pilihTab(kelasData.length?'kelas':'mulai');
}
const TABS=[['mulai','Langkah awal',2],['lukisan','Lukisan',2],['kelas','Kelas',2],['soal','Soal',2],['pengguna','Pengguna',2],['log','Log',3]];
function pilihTab(t){
  tabAdm=t; const ada=TABS.filter(x=>(RANK[saya.peran]||0)>=x[2]);
  $('admTab').replaceChildren(...ada.map(([k,n])=>{ const b=h('button',{className:'tab',textContent:n,onclick:()=>pilihTab(k)});
    b.setAttribute('role','tab'); b.setAttribute('aria-selected',String(k===t)); return b; }));
  ({mulai:renderMulai,lukisan:renderLukisan,kelas:renderKelas,soal:renderSoal,pengguna:renderPengguna,log:renderLog})[t]();
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
        st=h('select',{},opt('aktif','aktif'),opt('nonaktif','nonaktif'));
  const simpan=h('button',{textContent:'Simpan kelas',onclick:async()=>{
    try{ await gs('adminSimpanKelas',{id:idEdit,nama:nama.value,urutan:Number(urut.value)||0,status:st.value}); kelasData=await gs('adminDaftarKelas'); renderKelas(); pesan('Kelas disimpan.'); }
    catch(e){ pesan(e.message); } }});
  const baru=h('button',{className:'alt',textContent:'Tambah Kelas',onclick:()=>{ idEdit=''; nama.value=''; urut.value=kelasData.length+1; st.value='aktif'; nama.focus(); }});
  const baris=kelasData.map(k=>h('tr',{},h('td',{textContent:k.nama}),h('td',{textContent:k.urutan}),h('td',{textContent:k.status}),h('td',{textContent:k.jumlah}),
    h('td',{},h('button',{className:'alt',textContent:'Ubah',onclick:()=>{ idEdit=k.id; nama.value=k.nama; urut.value=k.urutan; st.value=k.status; nama.focus(); }}))));
  $('admIsi').replaceChildren(h('div',{className:'bar'},baru),h('div',{className:'bar'},nama,urut,st,simpan),
    h('p',{style:'font-size:13px;color:#555',textContent:'Kelas tidak dihapus, hanya dinonaktifkan. Mengganti nama aman karena data memakai ID tetap.'}),
    h('div',{className:'tbl'},h('table',{},h('tr',{},...['Nama','Urutan','Status','Siswa',''].map(x=>h('th',{textContent:x}))),...baris)));
}
async function renderPengguna(){
  const isi=$('admIsi'); isi.textContent='Memuat...';
  let u; try{ u=await gs('adminDaftarPengguna'); kelasData=await gs('adminDaftarKelas'); }catch(e){ isi.textContent=e.message; return; }
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
const ALIRAN=['Impresionisme','Kubisme','Ekspresionisme','Surealisme','Nusantara'];
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
  l.sort((a,b)=>a.ruang.localeCompare(b.ruang)||a.urutan-b.urutan);
  const unggah=h('button',{textContent:'Unggah Lukisan',style:'font-size:16px;padding:12px 20px',onclick:()=>formLukisan(null)});
  const baris=l.map((x,i)=>{
    const tetangga=d=>{ for(let j=i+d;j>=0&&j<l.length;j+=d){ if(l[j].ruang===x.ruang&&l[j].status!=='nonaktif') return l[j]; } return null; };
    const aksi=[h('button',{className:'alt',textContent:'Ubah',onclick:()=>formLukisan(x)})];
    if(x.status!=='nonaktif'){
      [['\u25B2',-1,'Naik'],['\u25BC',1,'Turun']].forEach(([s,d,tt])=>{ const n=tetangga(d); if(n) aksi.push(h('button',{className:'alt',textContent:s,title:tt,onclick:async()=>{
        try{ await gs('adminTukarUrutan',x.id,n.id); renderLukisan(); }catch(e){ pesan(e.message); } }})); });
      aksi.push(h('button',{className:'alt',textContent:'Nonaktifkan',onclick:async()=>{ if(!confirm('Nonaktifkan "'+x.judul+'"?')) return;
        try{ await gs('adminHapusLukisan',x.id); renderLukisan(); }catch(e){ pesan(e.message); } }}));
    }
    return h('tr',{},h('td',{textContent:x.urutan}),h('td',{textContent:x.ruang}),h('td',{textContent:x.judul+(x.contoh?' (contoh)':'')}),h('td',{textContent:x.status}),h('td',{},...aksi)); });
  const bar=[unggah];
  if(l.some(x=>x.contoh&&x.status!=='nonaktif')) bar.push(h('button',{className:'alt',textContent:'Nonaktifkan semua data contoh',onclick:async()=>{
    if(!confirm('Nonaktifkan semua lukisan bertanda contoh?')) return; try{ const n=await gs('adminNonaktifkanContoh'); pesan(n+' lukisan contoh dinonaktifkan.'); renderLukisan(); }catch(e){ pesan(e.message); } }}));
  isi.replaceChildren(h('div',{className:'bar'},...bar),
    h('p',{style:'font-size:13px;color:#555',textContent:'Gunakan karya domain publik (pelukis wafat sebelum 1956) atau karya sendiri. Lukisan hanya bisa terbit jika sumber dan lisensi terisi.'}),
    h('div',{className:'tbl'},h('table',{},h('tr',{},...['No','Ruang','Judul','Status',''].map(t=>h('th',{textContent:t}))),...baris)));
}
function formLukisan(x){
  x=x||{}; let baru=null;
  const judul=inp(x.judul,'judul karya',120), pelukis=inp(x.pelukis,'nama pelukis',80), tahun=inp(x.tahun,'mis. 1872',20),
    aliran=h('select',{},...ALIRAN.map(a=>opt(a,a,a===(x.aliran||ALIRAN[0])))),
    ruang=h('select',{},...ALIRAN.map((a,i)=>opt(a,a+(i?' (ruangan belum dibangun)':''),a===(x.ruang||ALIRAN[0])))),
    urutan=h('input',{type:'number',min:1,max:8,value:x.urutan||1,style:'width:80px'}),
    jelas=ta(x.penjelasan,4), fakta=ta(x.fakta,2), mot=ta(x.motivasi,2),
    sumber=inp(x.sumber,'sumber gambar (nama museum/situs + tautan)',300), lisensi=inp(x.lisensi,'mis. Domain publik atau CC BY 4.0',100);
  aliran.onchange=()=>{ ruang.value=aliran.value; };
  const prev=h('img',{alt:'Pratinjau gambar',src:x.gambar||'',style:'max-width:100%;max-height:220px;margin-top:8px;border-radius:4px;display:'+(x.gambar?'block':'none')});
  const file=h('input',{type:'file',accept:'image/jpeg,image/png'});
  file.onchange=async()=>{ const f=file.files[0]; if(!f) return; try{ baru=await kecilkan(f); prev.src=baru; prev.style.display='block'; }catch(e){ pesan(e.message); } };
  const simpan=async(aksi,btn)=>{ btn.disabled=true;
    try{ if(baru){ x.gambar=(await gs('adminUnggahGambar',baru)).url; baru=null; }
      await gs('adminSimpanLukisan',{id:x.id||'',aksi,judul:judul.value,pelukis:pelukis.value,tahun:tahun.value,aliran:aliran.value,ruang:ruang.value,urutan:urutan.value,
        gambar:x.gambar||'',penjelasan:jelas.value,fakta:fakta.value,motivasi:mot.value,sumber:sumber.value,lisensi:lisensi.value});
      pesan(aksi==='terbit'?'Lukisan diterbitkan.':'Draf disimpan.'); renderLukisan();
    }catch(e){ pesan(e.message,8000); btn.disabled=false; } };
  const bDraf=h('button',{className:'alt',textContent:'Simpan sebagai draf'}), bTerbit=h('button',{textContent:'Terbitkan'}), bBatal=h('button',{className:'alt',textContent:'Batal',onclick:renderLukisan});
  bDraf.onclick=()=>simpan('draf',bDraf); bTerbit.onclick=()=>simpan('terbit',bTerbit);
  $('admIsi').replaceChildren(h('h3',{textContent:x.id?'Ubah lukisan':'Unggah lukisan',style:'margin:0'}),
    fld('Gambar (JPG/PNG; di HP boleh dari galeri atau kamera)',file),prev,fld('Judul',judul),fld('Pelukis',pelukis),fld('Tahun',tahun),
    fld('Aliran',aliran),fld('Ruang',ruang),fld('Nomor urut di ruang (1-8)',urutan),fld('Penjelasan karya',jelas),fld('Fakta menarik',fakta),fld('Kalimat motivasi',mot),
    fld('Sumber',sumber),fld('Lisensi',lisensi),h('div',{className:'bar',style:'margin-top:12px'},bDraf,bTerbit,bBatal));
}
async function renderSoal(){
  const isi=$('admIsi'); isi.textContent='Memuat...';
  let l; try{ l=(await gs('adminDaftarLukisan')).filter(x=>x.status!=='nonaktif'); }catch(e){ isi.textContent=e.message; return; }
  if(!l.length){ isi.textContent='Belum ada lukisan. Buat lukisan di tab Lukisan dahulu.'; return; }
  const sel=h('select',{},...l.map(x=>opt(x.id,x.ruang+' no.'+x.urutan+': '+x.judul+(x.status==='terbit'?'':' ('+x.status+')')))), area=h('div');
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
