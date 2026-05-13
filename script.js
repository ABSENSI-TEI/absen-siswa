// =====================================================
// FIREBASE CONFIG
// =====================================================
const firebaseConfig = {
  apiKey: "AIzaSyAUswvBeyWLt7jYQ11MGfS-KcopD2FqkHg",
  authDomain: "absensi-4384e.firebaseapp.com",
  databaseURL: "https://absensi-4384e-default-rtdb.firebaseio.com",
  projectId: "absensi-4384e",
  storageBucket: "absensi-4384e.firebasestorage.app",
  messagingSenderId: "431493892970",
  appId: "1:431493892970:web:84f2d96c8ec11308037313",
  measurementId: "G-TCGT1EJC26"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// =====================================================
// STATE
// =====================================================
let allData = [];       // semua record dari Firebase
let feedList = [];      // untuk live feed
let filterStatus = 'semua';
let filterDate = getTodayStr();
let searchQ = '';
let lastKeys = new Set(); // deteksi record baru

// =====================================================
// HELPERS
// =====================================================
function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function pad(n) { return String(n).padStart(2, '0'); }

function nowStr() {
  const d = new Date();
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function parseWaktu(w) {
  if (!w) return null;
  const parts = w.split(' ');
  if (parts.length < 2) return null;
  const [d, m, y] = parts[0].split('/');
  return new Date(`${y}-${m}-${d}T${parts[1]}`);
}

function getDateStr(w) {
  const dt = parseWaktu(w);
  if (!dt) return '';
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
}

function getStatus(w) {
  const dt = parseWaktu(w);
  if (!dt) return 'hadir';
  const h = dt.getHours(), m = dt.getMinutes();
  if (h > 7 || (h === 7 && m >= 15)) return 'terlambat';
  return 'hadir';
}

function initials(nama) {
  if (!nama) return '?';
  return nama.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// =====================================================
// CLOCK
// =====================================================
function tick() {
  const d = new Date();
  const clockEl = document.getElementById('clockText');
  if(clockEl) clockEl.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
setInterval(tick, 1000);
tick();

// Set default filter date
window.onload = () => {
    document.getElementById('filterDate').value = getTodayStr();
};

// =====================================================
// FIREBASE — LISTEN REALTIME
// =====================================================
const ref = db.ref('/absensi');

ref.on('value', snap => {
  document.getElementById('fbDot').className = 'fb-dot on';
  document.getElementById('fbStatus').textContent = 'Firebase Terhubung';

  allData = [];
  const raw = snap.val() || {};

  Object.entries(raw).forEach(([key, val]) => {
    if (!lastKeys.has(key)) {
      lastKeys.add(key);
      if (allData.length > 0 || feedList.length > 0) {
        addToFeed(val, key);
      }
    }

    allData.push({
      key,
      id:       val.id       || '—',
      nama:     val.nama     || 'Tidak Dikenal',
      kelas:    val.kelas    || '—',
      waktu:    val.waktu    || '—',
      akurasi:  val.akurasi  !== undefined ? val.akurasi : null,
      status:   val.status   || getStatus(val.waktu),
    });
  });

  allData.sort((a, b) => {
    const da = parseWaktu(a.waktu), db2 = parseWaktu(b.waktu);
    if (!da || !db2) return 0;
    return db2 - da;
  });

  if (feedList.length === 0 && allData.length > 0) {
    const today = allData.filter(d => getDateStr(d.waktu) === getTodayStr()).slice(0, 20);
    feedList = today.map(d => ({...d}));
    renderFeed();
  }

  renderAll();
}, err => {
  document.getElementById('fbDot').className = 'fb-dot off';
  document.getElementById('fbStatus').textContent = 'Gagal terhubung';
  console.error(err);
});

db.ref('.info/connected').on('value', snap => {
  const on = snap.val();
  document.getElementById('fbDot').className = 'fb-dot ' + (on ? 'on' : 'off');
  document.getElementById('fbStatus').textContent = on ? 'Firebase Terhubung' : 'Offline';
});

// =====================================================
// RENDER LOGIC
// =====================================================
function renderAll() {
  renderTable();
  updateStats();
}

function renderTable() {
  let data = allData;
  if (filterDate) data = data.filter(d => getDateStr(d.waktu) === filterDate);
  if (filterStatus !== 'semua') data = data.filter(d => d.status === filterStatus);
  if (searchQ) {
    const q = searchQ.toLowerCase();
    data = data.filter(d => (d.nama||'').toLowerCase().includes(q) || (d.kelas||'').toLowerCase().includes(q));
  }

  if (!data.length) {
    document.getElementById('tableBody').innerHTML = `<tr><td colspan="7"><div class="empty"><div class="empty-icon">📭</div>Tidak ada data</div></td></tr>`;
    return;
  }

  const badgeClass = { hadir: 'b-hadir', terlambat: 'b-terlambat', izin: 'b-izin', alpha: 'b-alpha' };

  document.getElementById('tableBody').innerHTML = data.map((d, i) => {
    const acc = d.akurasi !== null ? d.akurasi : null;
    const accBar = acc !== null ? `<div class="acc-bar-wrap"><div class="acc-bar-bg"><div class="acc-bar-fill" style="width:${acc}%"></div></div><span class="mono">${acc}%</span></div>` : '<span style="color:#ccc;font-size:12px">—</span>';

    return `<tr>
      <td style="color:#bbb;font-size:12px">${i+1}</td>
      <td><div class="nama-cell"><div class="ava">${initials(d.nama)}</div><div><div class="nama-text">${d.nama}</div><div class="kelas-text">${d.kelas}</div></div></div></td>
      <td><span class="mono">${d.id}</span></td>
      <td style="font-size:12px;color:#555">${d.waktu}</td>
      <td>${accBar}</td>
      <td><span class="badge ${badgeClass[d.status]||'b-hadir'}">${d.status}</span></td>
      <td>
        <select class="btn" style="padding:4px 6px;font-size:11px" onchange="ubahStatus('${d.key}',this.value)">
          <option value="hadir" ${d.status==='hadir'?'selected':''}>Hadir</option>
          <option value="terlambat" ${d.status==='terlambat'?'selected':''}>Terlambat</option>
          <option value="izin" ${d.status==='izin'?'selected':''}>Izin</option>
          <option value="alpha" ${d.status==='alpha'?'selected':''}>Alpha</option>
        </select>
      </td>
    </tr>`;
  }).join('');
}

function updateStats() {
  const today = allData.filter(d => getDateStr(d.waktu) === filterDate);
  const hadir = today.filter(d => d.status === 'hadir').length;
  const telat  = today.filter(d => d.status === 'terlambat').length;
  const alpha  = today.filter(d => d.status === 'alpha').length;
  const total  = today.length;

  document.getElementById('sTotal').textContent = total;
  document.getElementById('sHadir').textContent = hadir + telat;
  document.getElementById('sTelat').textContent = telat;
  document.getElementById('sAlpha').textContent = alpha;
  document.getElementById('sHadirPct').textContent = total ? Math.round((hadir+telat)/total*100) + '% kehadiran' : '—';
}

function addToFeed(val, key) {
  feedList.unshift({
    key, id: val.id || '—',
    nama: val.nama || 'Tidak Dikenal',
    kelas: val.kelas || '—',
    waktu: val.waktu || nowStr(),
    akurasi: val.akurasi !== undefined ? val.akurasi : null,
    status: val.status || getStatus(val.waktu)
  });
  if (feedList.length > 50) feedList.pop();
  renderFeed();
}

function renderFeed() {
  document.getElementById('feedCount').textContent = feedList.length + ' scan';
  const dotColor = { hadir:'#22c55e', terlambat:'#f59e0b', izin:'#3b82f6', alpha:'#ef4444' };
  document.getElementById('liveFeed').innerHTML = feedList.map(f => `
    <div class="feed-item">
      <div class="feed-dot" style="background:${dotColor[f.status]||'#ccc'}"></div>
      <div class="feed-body">
        <div class="feed-name">${f.nama}</div>
        <div class="feed-meta">${f.kelas} • ${f.waktu}</div>
        ${f.akurasi !== null ? `<div class="feed-acc">Akurasi: ${f.akurasi}%</div>` : ''}
      </div>
      <span class="badge b-${f.status}" style="font-size:10px;padding:2px 8px">${f.status}</span>
    </div>
  `).join('');
}

function setStatus(s, el) {
  filterStatus = s;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderAll();
}

function applyFilter() {
  searchQ = document.getElementById('searchBox').value;
  renderTable();
}

function applyDateFilter() {
  filterDate = document.getElementById('filterDate').value;
  renderAll();
}

function ubahStatus(key, status) {
  db.ref('/absensi/' + key + '/status').set(status)
    .then(() => notif('Status diubah: ' + status, 'ok'))
    .catch(e => notif('Gagal: ' + e.message, 'err'));
}

function openModal() { document.getElementById('modalOverlay').style.display = 'flex'; }
function closeModal() { document.getElementById('modalOverlay').style.display = 'none'; }
function closeModalOutside(e) { if (e.target.id === 'modalOverlay') closeModal(); }

function submitManual() {
  const nama   = document.getElementById('mNama').value.trim();
  const kelas  = document.getElementById('mKelas').value.trim();
  const status = document.getElementById('mStatus').value;
  if (!nama) { notif('Masukkan nama siswa', 'err'); return; }

  const key = 'manual_' + Date.now();
  db.ref('/absensi/' + key).set({
    id: 0, nama, kelas, waktu: nowStr(), akurasi: null, status
  }).then(() => {
    notif('✓ Absensi manual disimpan', 'ok');
    closeModal();
    document.getElementById('mNama').value = '';
    document.getElementById('mKelas').value = '';
  }).catch(e => notif('Gagal: ' + e.message, 'err'));
}

function exportCSV() {
  const today = allData.filter(d => !filterDate || getDateStr(d.waktu) === filterDate);
  const rows = [['No','Nama','Kelas','ID Sensor','Waktu','Akurasi','Status']];
  today.forEach((d, i) => rows.push([i+1, d.nama, d.kelas, d.id, d.waktu, d.akurasi !== null ? d.akurasi + '%' : '—', d.status]));
  const csv = rows.map(r => r.map(x => `"${x}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
  a.download = 'absensi_' + (filterDate||getTodayStr()) + '.csv';
  a.click();
}

let notifTimer;
function notif(msg, type = '') {
  const old = document.querySelector('.notif');
  if (old) old.remove();
  clearTimeout(notifTimer);
  const el = document.createElement('div');
  el.className = 'notif ' + type;
  el.textContent = msg;
  document.body.appendChild(el);
  notifTimer = setTimeout(() => el.remove(), 3000);
}