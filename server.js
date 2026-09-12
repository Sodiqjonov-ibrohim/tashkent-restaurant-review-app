const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// SSL sertifikat xatosini aylanib o'tuvchi to'g'ri ulanish
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres.omtgapknfqbzzrtppznx:xusniddin001@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require';

const pool = new Pool({
  connectionString: DB_URL,
  ssl: {
    rejectUnauthorized: false // Sertifikat xatosini (self-signed certificate) e'tiborsiz qoldirish
  }
});

// Kategoriyalar API
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Kategoriyalar baza xatosi:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Restoranlar API
app.get('/api/restaurants', async (req, res) => {
  try {
    const query = `
      SELECT r.*, c.name as category_name,
        COALESCE(AVG(rev.rating), 0) as avg_rating,
        COUNT(rev.id) as review_count
      FROM restaurants r
      LEFT JOIN categories c ON r.category_id = c.id
      LEFT JOIN reviews rev ON r.id = rev.restaurant_id
      GROUP BY r.id, c.name
      ORDER BY r.created_at DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Restoranlar baza xatosi:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server ${PORT}-portda ishlamoqda...`);
});