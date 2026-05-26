require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
app.use(cors());

// Health check
app.get('/health', (req, res) => res.json({ status: 'API Gateway OK' }));

// Route ke masing-masing service
app.use('/auth',       createProxyMiddleware({ target: process.env.AUTH_SERVICE,      changeOrigin: true }));
app.use('/alat',       createProxyMiddleware({ target: process.env.INVENTORY_SERVICE, changeOrigin: true }));
app.use('/peminjaman', createProxyMiddleware({ target: process.env.LOAN_SERVICE,      changeOrigin: true }));
app.use('/laporan',    createProxyMiddleware({ target: process.env.REPORTING_SERVICE, changeOrigin: true }));

app.listen(process.env.PORT, () =>
  console.log(`API Gateway running on port ${process.env.PORT}`)
);