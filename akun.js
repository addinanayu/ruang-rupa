/* Ruang Rupa v2.15 - Akun sandi / buku tamu. Dimuat setelah admin.js. Menambah pilihan "masuk dengan email + sandi" dan formulir pendaftaran. */
document.head.insertAdjacentHTML('beforeend','<style>#daftar{inset:0;margin:auto;width:min(420px,94vw);max-height:92vh;overflow:auto;height:fit-content;display:none}#daftar label{display:block;margin:8px 0 2px;font-weight:600}#daftar input,#daftar select,#sandiBox input{width:100%;padding:7px;box-sizing:border-box}#sandiBox{margin-top:14px;border-top:1px solid #ccc;padding-top:10px}#sandiBox p{margin:0 0 6px;font-size:13px}</style>');
$('login').insertAdjacentHTML('beforeend',`<div id="sandiBox"><p>Atau masuk dengan email dan kata sandi:</p>
  <input id="lgEmail" type="email" placeholder="email" autocomplete="username" aria-label="Email"><div style="height:6px"></div>
  <input id="lgSandi" type="password" placeholder="kata sandi" autocomplete="current-password" aria-label="Kata sandi">
  <p style="margin-top:8px"><button id="lgMasuk">Masuk</button> <button id="lgDaftar" class="alt">Daftar akun baru</button></p></div>`);
document.body.insertAdjacentHTML('beforeend',`<div id="daftar" class="ui" role="dialog" aria-label="Pendaftaran buku tamu">
  <h2 style="margin:0 0 4px">Buku Tamu: Daftar Akun</h2><p style="margin:0;font-size:13px;color:#555">Isi data diri. Nama pendek akan tampil di atas avatarmu.</p>
  <label for="dJenis">Saya adalah</label><select id="dJenis"><option value="siswa">Siswa</option><option value="lainnya">Lainnya (tamu, guru, orang tua)</option></select>
  <label for="dLengkap">Nama lengkap</label><input id="dLengkap" maxlength="60" autocomplete="name">
  <label for="dPendek">Nama pendek (tampil di avatar)</label><input id="dPendek" maxlength="20">
  <div id="dKelasBox"><label for="dKelas">Kelas</label><select id="dKelas"></select></div>
  <label for="dEmail">Email</label><input id="dEmail" type="email" autocomplete="username">
  <label for="dSekolah">Asal sekolah / instansi</label><input id="dSekolah" maxlength="60">
  <label for="dSandi">Buat kata sandi (minimal 8 karakter)</label><input id="dSandi" type="password" autocomplete="new-password" maxlength="64">
  <label for="dSandi2">Ulangi kata sandi</label><input id="dSandi2" type="password" autocomplete="new-password" maxlength="64">
  <p id="dInfo" style="color:var(--warn);font-size:13px;min-height:18px;margin:8px 0 0"></p>
  <p><button id="dKirim">Daftar</button> <button id="dBatal" class="alt">Kembali</button></p></div>`);
const dInfo=t=>{ $('dInfo').textContent=t||''; };
$('lgMasuk').onclick=async()=>{
  infoLogin('');
  try{ const r=await gs('masukSandi',$('lgEmail').value,$('lgSandi').value); $('lgSandi').value=''; await setelahLogin(r.token); }
  catch(e){ infoLogin(e.message); }
};
$('lgDaftar').onclick=async()=>{
  $('login').style.display='none'; $('daftar').style.display='block'; dInfo('');
  try{ const ks=await gs('getKelasPublik'), s=$('dKelas'); s.innerHTML=''; s.add(new Option('Pilih kelas...','')); ks.forEach(k=>s.add(new Option(k.nama,k.id))); $('dKelasBox').dataset.ada=ks.length?'1':''; }
  catch(e){ dInfo(e.message); }
  aturKelas();
};
function aturKelas(){ $('dKelasBox').style.display=($('dJenis').value==='siswa'&&$('dKelasBox').dataset.ada)?'block':'none'; }
$('dJenis').onchange=aturKelas;
$('dBatal').onclick=()=>{ $('daftar').style.display='none'; $('login').style.display='block'; };
$('dKirim').onclick=async()=>{
  dInfo('');
  if($('dSandi').value!==$('dSandi2').value) return dInfo('Kedua kata sandi harus sama.');
  $('dKirim').disabled=true;
  try{
    const r=await gs('daftarAkun',{jenis:$('dJenis').value,namaLengkap:$('dLengkap').value,namaPendek:$('dPendek').value,kelasId:$('dKelas').value,
      email:$('dEmail').value,sekolah:$('dSekolah').value,sandi:$('dSandi').value});
    $('dSandi').value=''; $('dSandi2').value=''; $('daftar').style.display='none';
    await setelahLogin(r.token);
  }catch(e){ dInfo(e.message); }
  $('dKirim').disabled=false;
};
const keLoginAsli2=keLogin; keLogin=function(i){ $('daftar').style.display='none'; keLoginAsli2(i); };

try{ document.getElementById('ver').textContent+=' \u00b7 akun 2.15'; }catch(e){}
