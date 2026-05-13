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
let filterStatus = 'semua';
let filterDate = new Date().toISOString().split('T')[0];
let searchQ = '';

// Jam Realtime
setInterval(() => {
    document.getElementById('clockText').innerText = new Date().toLocaleTimeString('id-ID');
}, 1000);

// Set Tanggal Hari Ini di Input
document.getElementById('filterDate').value = filterDate;

// Ambil Data
db.ref('/absensi').on('value', snap => {
    document.getElementById('fbDot').classList.add('on');
    document.getElementById('fbStatus').innerText = "Online";
    
    allData = [];
    const data = snap.val();
    if(data) {
        Object.entries(data).forEach(([key, val]) => {
            allData.push({ key, ...val });
        });
        allData.sort((a, b) => b.waktu.localeCompare(a.waktu));
    }
    renderTable();
});

function renderTable() {
    const tbody = document.getElementById('tableBody');
    let filtered = allData.filter(d => d.waktu.includes(filterDate));

    if (filterStatus !== 'semua') filtered = filtered.filter(d => d.status === filterStatus);
    if (searchQ) filtered = filtered.filter(d => d.nama.toLowerCase().includes(searchQ.toLowerCase()));

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Data tidak ditemukan</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map((d, index) => `
        <tr>
            <td>${index + 1}</td>
            <td><strong>${d.nama}</strong><br><small>${d.kelas || '-'}</small></td>
            <td>${d.id || '-'}</td>
            <td>${d.waktu.split(' ')[1] || d.waktu}</td>
            <td>${d.akurasi ? d.akurasi + '%' : '-'}</td>
            <td><span class="chip active">${d.status}</span></td>
            <td><button class="btn" onclick="ubahStatus('${d.key}')">Edit</button></td>
        </tr>
    `).join('');
    
    updateStats(filtered);
}

function updateStats(data) {
    document.getElementById('sTotal').innerText = data.length;
    document.getElementById('sHadir').innerText = data.filter(d => d.status === 'hadir').length;
    document.getElementById('sTelat').innerText = data.filter(d => d.status === 'terlambat').length;
    document.getElementById('sAlpha').innerText = data.filter(d => d.status === 'alpha').length;
}

// Fungsi Filter & UI
function applyFilter() { searchQ = document.getElementById('searchBox').value; renderTable(); }
function applyDateFilter() { filterDate = document.getElementById('filterDate').value; renderTable(); }
function setStatus(status, el) {
    filterStatus = status;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    renderTable();
}

function openModal() { document.getElementById('modalOverlay').style.display = 'flex'; }
function closeModal() { document.getElementById('modalOverlay').style.display = 'none'; }
function closeModalOutside(e) { if(e.target.id === 'modalOverlay') closeModal(); }
