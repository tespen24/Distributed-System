require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Reporting Service: MongoDB connected'))
  .catch(err => console.log(err));

const Peminjaman = mongoose.model('Peminjaman', new mongoose.Schema({
  alatId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Alat' },
  userId:         { type: mongoose.Schema.Types.ObjectId },
  jumlah:         Number,
  keperluan:      String,
  tanggalPinjam:  Date,
  tanggalKembali: Date,
  status:         String,
}, { timestamps: true }));

const Alat = mongoose.model('Alat', new mongoose.Schema({ nama: String, stok: Number }));

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

// GET /laporan — ringkasan statistik
app.get('/laporan', auth, async (req, res) => {
  try {
    const total = await Peminjaman.countDocuments();
    const menunggu = await Peminjaman.countDocuments({ status: 'Menunggu' });
    const dipinjam = await Peminjaman.countDocuments({ status: 'Dipinjam' });
    const dikembalikan = await Peminjaman.countDocuments({ status: 'Dikembalikan' });
    res.json({ total, menunggu, dipinjam, dikembalikan });
  } catch (err) {
    res.status(500).json({ msg: 'Gagal ambil laporan', error: err.message });
  }
});

// GET /laporan/detail — semua data peminjaman lengkap
app.get('/laporan/detail', auth, async (req, res) => {
  try {
    const data = await Peminjaman.find().populate('alatId', 'nama').sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ msg: 'Gagal ambil detail laporan', error: err.message });
  }
});

app.listen(process.env.PORT, () =>
  console.log(`Reporting Service running on port ${process.env.PORT}`)
);