require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Auth Service: MongoDB connected'))
  .catch(err => console.log(err));

// Model User
const User = mongoose.model('User', new mongoose.Schema({
  nama: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'mahasiswa' }
}));

// POST /register
app.post('/register', async (req, res) => {
  try {
    const { nama, email, password, role } = req.body;
    const hash = await bcrypt.hash(password, 10);
    await User.create({ nama, email: email.toLowerCase().trim(), password: hash, role });
    res.json({ msg: 'Registrasi berhasil' });
  } catch (e) {
    res.status(400).json({ msg: 'Email sudah digunakan' });
  }
});

// POST /login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) return res.status(400).json({ msg: 'User tidak ditemukan' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ msg: 'Password salah' });
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET);
  res.json({ token, user: { nama: user.nama, role: user.role } });
});

// GET /verify — dipakai API Gateway untuk validasi token
app.get('/verify', (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ msg: 'Tidak ada token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch {
    res.status(401).json({ valid: false, msg: 'Token tidak valid' });
  }
});

app.listen(process.env.PORT, () =>
  console.log(`Auth Service running on port ${process.env.PORT}`)
);

// Health check
app.get('/health', (req, res) => res.json({ status: 'Auth Service OK' }));