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

let allData = [];
let feedList = [];
let filterStatus = 'semua';
let filterDate = new Date().toISOString().slice(0, 10);
let searchQ = '';
let lastKeys = new Set();

const pad = (n) => String(n).padStart(2, '0');

function nowStr() {
  const d = new Date();
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function parseWaktu(w) {
  if (!w || typeof w !== 'string') return null;
  const parts = w.split(' ');
  if (parts.length < 2) return null;
  const [d, m, y] = parts[0].split('/');
  return new Date(`${y}-${m}-${d}T${parts[1]}`);
}

function getDateStr(w) {
  const dt = parseWaktu(w);
  return dt ? `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}` : '';
}

function getStatus(w) {
  const dt = parseWaktu(w);
  if (!dt) return 'hadir';
  const h = dt.getHours(), m = dt.getMinutes();
  return (h > 7 || (h === 7 && m >= 15)) ? 'terlambat' : 'hadir';
}

function initials(nama) {
  return nama ? nama.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?';
}

const ref = db.ref('/absensi');

ref.on('value', snap => {
  const raw = snap.val() || {};
  allData = [];

  Object.entries(raw).forEach(([key, val]) => {
    if (!lastKeys.has(key)) {
      lastKeys.add(key);
      if (allData.length > 0 || feedList.length > 0) addToFeed(val, key);
    }

    allData.push({
      key,
      id: val.id || '—',
      nama: val.nama || 'Tidak Dikenal',
      kelas: val.kelas || '—',
      waktu: val.waktu || '—',
      akurasi: val.akurasi !== undefined ? val.akurasi : null,
      status: val.status || getStatus(val.waktu),
    });
  });

  allData.sort((a, b) => (parseWaktu(b.waktu) || 0) - (parseWaktu(a.waktu) || 0));

  if (feedList.length === 0 && allData.length > 0) {
    feedList = allData.filter(d => getDateStr(d.waktu) === filterDate).slice(0, 15);
    renderFeed();
  }

  renderAll();
});

db.ref('.info/connected').on('value', snap => {
  const on = snap.val();
  const dot = document.getElementById('fbDot');
  const txt = document.getElementById('fbStatus');
  if (dot) dot.className = 'fb-dot ' + (on ? 'on' : 'off');
  if (txt) txt.textContent = on ? 'Terhubung' : 'Offline';
});

function renderAll() {
  renderTable();
  updateStats();
}

function renderTable() {
  const tbody = document.getElementById('tableBody');
  if (!tbody) return;

  let data = allData.filter(d => getDateStr(d.waktu) === filterDate);
  if (filterStatus !== 'semua') data = data.filter(d => d.status === filterStatus);
  if (searchQ) {
    const q = searchQ.toLowerCase();
    data = data.filter(d => d.nama.toLowerCase().includes(q) || d.kelas.toLowerCase().includes(q));
  }

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty">Tidak ada data masuk</div></td></tr>`;
    return;
  }

  tbody.innerHTML = data.map((d, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>
        <div style="display:flex; align-items:center; gap:10px">
          <div style="width:32px; height:32px; background:#e2e8f0; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700">
            ${initials(d.nama)}
          </div>
          <div>
            <div style="font-weight:600">${d.nama}</div>
            <div style="font-size:11px; color:#64748b">${d.kelas}</div>
          </div>
        </div>
      </td>
      <td style="font-family:monospace">${d.id}</td>
      <td style="font-size:12px">${d.waktu}</td>
      <td>${d.akurasi ? d.akurasi + '%' : '—'}</td>
      <td><span class="chip active" style="background:${getStatusColor(d.status)}">${d.status}</span></td>
      <td>
        <select class="btn" style="padding:4px" onchange="ubahStatus('${d.key}', this.value)">
          <option value="hadir" ${d.status==='hadir'?'selected':''}>Hadir</option>
          <option value="terlambat" ${d.status==='terlambat'?'selected':''}>Terlambat</option>
          <option value="izin" ${d.status==='izin'?'selected':''}>Izin</option>
          <option value="alpha" ${d.status==='alpha'?'selected':''}>Alpha</option>
        </select>
      </td>
    </tr>
  `).join('');
}

function updateStats() {
  const today = allData.filter(d => getDateStr(d.waktu) === filterDate);
  const hadir = today.filter(d => d.status === 'hadir').length;
  const telat = today.filter(d => d.status === 'terlambat').length;
  const alpha = today.filter(d => d.status === 'alpha').length;
  
  document.getElementById('sTotal').textContent = today.length;
  document.getElementById('sHadir').textContent = hadir + telat;
  document.getElementById('sTelat').textContent = telat;
  document.getElementById('sAlpha').textContent = alpha;
  const pct = today.length ? Math.round((hadir+telat)/today.length*100) + '%' : '—';
  document.getElementById('sHadirPct').textContent = pct;
}

function addToFeed(val, key) {
  feedList.unshift({ ...val, key, status: val.status || getStatus(val.waktu) });
  if (feedList.length > 20) feedList.pop();
  renderFeed();
}

function renderFeed() {
  const feedEl = document.getElementById('liveFeed');
  if (!feedEl) return;
  document.getElementById('feedCount').textContent = feedList.length;
  
  feedEl.innerHTML = feedList.map(f => `
    <div style="padding:12px; border-bottom:1px solid #f1f5f9; display:flex; align-items:center; gap:10px">
      <div style="width:8px; height:8px; border-radius:50%; background:${getStatusColor(f.status)}"></div>
      <div style="flex:1">
        <div style="font-size:13px; font-weight:600">${f.nama}</div>
        <div style="font-size:11px; color:#94a3b8">${f.waktu.split(' ')[1] || ''} • ${f.kelas}</div>
      </div>
    </div>
  `).join('');
}

function getStatusColor(s) {
  const colors = { hadir: '#10b981', terlambat: '#f59e0b', izin: '#3b82f6', alpha: '#ef4444' };
  return colors[s] || '#64748b';
}

function applyFilter() { searchQ = document.getElementById('searchBox').value; renderAll(); }
function applyDateFilter() { filterDate = document.getElementById('filterDate').value; renderAll(); }

function setStatus(s, el) {
  filterStatus = s;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderAll();
}

function ubahStatus(key, status) {
  db.ref('/absensi/' + key + '/status').set(status);
}

function submitManual() {
  const nama = document.getElementById('mNama').value.trim();
  const kelas = document.getElementById('mKelas').value.trim();
  const status = document.getElementById('mStatus').value;
  if (!nama) return alert('Nama harus diisi');

  db.ref('/absensi').push({
    id: 'MANUAL', nama, kelas, waktu: nowStr(), status, akurasi: null
  }).then(() => {
    closeModal();
    document.getElementById('mNama').value = '';
    document.getElementById('mKelas').value = '';
  });
}

function exportCSV() {
  const todayData = allData.filter(d => getDateStr(d.waktu) === filterDate);
  if (todayData.length === 0) return alert('Tidak ada data untuk diekspor pada tanggal ini.');

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "No,Nama,Kelas,ID Sensor,Waktu,Akurasi,Status\n";

  todayData.forEach((d, i) => {
    let row = [
      i + 1,
      d.nama,
      d.kelas,
      d.id,
      d.waktu,
      d.akurasi ? d.akurasi + "%" : "—",
      d.status
    ].map(x => `"${x}"`).join(",");
    csvContent += row + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `absensi_tei_${filterDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

setInterval(() => {
  const clk = document.getElementById('clockText');
  if (clk) clk.textContent = new Date().toLocaleTimeString('id-ID');
}, 1000);

function closeModal() { document.getElementById('modalOverlay').style.display = 'none'; }
function openModal() { document.getElementById('modalOverlay').style.display = 'flex'; }
function closeModalOutside(e) { if(e.target.id === 'modalOverlay') closeModal(); }

window.onload = () => {
    document.getElementById('filterDate').value = filterDate;
};
