require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Loan Service: MongoDB connected'))
  .catch(err => console.log(err));

const Alat = mongoose.model('Alat', new mongoose.Schema({ nama: String, stok: Number }));
const Peminjaman = mongoose.model('Peminjaman', new mongoose.Schema({
  alatId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Alat', required: true },
  userId:         { type: mongoose.Schema.Types.ObjectId, required: true },
  jumlah:         { type: Number, required: true },
  keperluan:      { type: String, required: true },
  tanggalPinjam:  { type: Date, default: Date.now },
  tanggalKembali: { type: Date, required: true },
  status:         { type: String, default: 'Menunggu' },
}, { timestamps: true }));

const auth = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ msg: 'Tidak ada token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ msg: 'Token tidak valid' });
  }
};

// Semua route dari routes/peminjaman.js original dipindahkan ke sini
// POST / (buat peminjaman)
app.post('/', auth, async (req, res) => {
  try {
    const { alatId, jumlah, tanggalKembali, keperluan } = req.body;
    if (!alatId || !jumlah || !tanggalKembali || !keperluan)
      return res.status(400).json({ msg: 'Semua field wajib diisi' });
    const alat = await Alat.findById(alatId);
    if (!alat) return res.status(404).json({ msg: 'Alat tidak ditemukan' });
    if (alat.stok < jumlah) return res.status(400).json({ msg: `Stok tidak cukup. Tersedia: ${alat.stok}` });
    alat.stok -= jumlah;
    await alat.save();
    const peminjaman = new Peminjaman({ alatId, userId: req.user.id, jumlah, keperluan,
      tanggalKembali: new Date(tanggalKembali), tanggalPinjam: new Date(), status: 'Menunggu' });
    await peminjaman.save();
    res.json({ msg: 'Berhasil ajukan peminjaman' });
  } catch (err) {
    res.status(500).json({ msg: 'Gagal pinjam', error: err.message });
  }
});

// GET / (list peminjaman)
app.get('/', auth, async (req, res) => {
  try {
    const filter = req.user.role === 'mahasiswa' ? { userId: req.user.id } : {};
    const data = await Peminjaman.find(filter).populate('alatId', 'nama stok').sort({ createdAt: -1 });
    const result = data.filter(p => p.alatId).map(p => ({
      _id: p._id, alat: p.alatId, userId: p.userId,
      jumlah: p.jumlah, keperluan: p.keperluan,
      tanggalPinjam: p.tanggalPinjam, tanggalKembali: p.tanggalKembali, status: p.status,
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ msg: 'Gagal ambil data', error: err.message });
  }
});

// PUT /:id/setujui
app.put('/:id/setujui', auth, async (req, res) => {
  try {
    await Peminjaman.findByIdAndUpdate(req.params.id, { status: 'Dipinjam' });
    res.json({ msg: 'Peminjaman disetujui' });
  } catch {
    res.status(500).json({ msg: 'Gagal setujui' });
  }
});

// PUT /:id/kembalikan
app.put('/:id/kembalikan', auth, async (req, res) => {
  try {
    const p = await Peminjaman.findById(req.params.id);
    if (!p) return res.status(404).json({ msg: 'Data tidak ditemukan' });
    const alat = await Alat.findById(p.alatId);
    if (alat) { alat.stok += p.jumlah; await alat.save(); }
    await Peminjaman.findByIdAndUpdate(req.params.id, { status: 'Dikembalikan' });
    res.json({ msg: 'Alat berhasil dikembalikan' });
  } catch {
    res.status(500).json({ msg: 'Gagal kembalikan' });
  }
});

app.listen(process.env.PORT, () =>
  console.log(`Loan Service running on port ${process.env.PORT}`)
);