/* Panel Admin - Tahap 2A (v2.02): tab Langkah awal, Kelas, Pengguna. Dimuat setelah museum.js.
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
function pilihTab(t){
  tabAdm=t;
  $('admTab').replaceChildren(...[['mulai','Langkah awal'],['kelas','Kelas'],['pengguna','Pengguna']].map(([k,n])=>
    h('button',{className:'tab',textContent:n,role:'tab',onclick:()=>pilihTab(k)}) )) ;
  [...$('admTab').children].forEach((b,i)=>b.setAttribute('aria-selected',String(['mulai','kelas','pengguna'][i]===t)));
  if(t==='mulai') renderMulai(); else if(t==='kelas') renderKelas(); else renderPengguna();
}
function renderMulai(){
  const ok=kelasData.length>0;
  $('admIsi').replaceChildren(h('p',{textContent:'Langkah awal menyiapkan museum:'}),
    h('ol',{},h('li',{textContent:(ok?'[selesai] ':'[belum] ')+'Buat kelas (tab Kelas)'}),
      h('li',{textContent:'[segera] Unggah lukisan (Tahap 2B)'}),h('li',{textContent:'[segera] Tulis soal (Tahap 2B)'}),h('li',{textContent:'[segera] Terbitkan (Tahap 2B)'})));
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
