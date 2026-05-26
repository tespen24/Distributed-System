require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Inventory Service: MongoDB connected'))
  .catch(err => console.log(err));

const Alat = mongoose.model('Alat', new mongoose.Schema({
  nama: String,
  stok: Number,
}));

// Middleware auth lokal
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

app.get('/', async (req, res) => {
  const data = await Alat.find();
  res.json(data);
});

app.post('/', auth, async (req, res) => {
  try {
    const alat = new Alat(req.body);
    await alat.save();
    res.json(alat);
  } catch {
    res.status(500).json({ msg: 'Gagal tambah alat' });
  }
});

app.put('/:id', auth, async (req, res) => {
  try {
    const alat = await Alat.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(alat);
  } catch {
    res.status(500).json({ msg: 'Gagal update alat' });
  }
});

app.delete('/:id', auth, async (req, res) => {
  try {
    await Alat.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Alat berhasil dihapus' });
  } catch {
    res.status(500).json({ msg: 'Gagal hapus alat' });
  }
});

app.listen(process.env.PORT, () =>
  console.log(`Inventory Service running on port ${process.env.PORT}`)
);