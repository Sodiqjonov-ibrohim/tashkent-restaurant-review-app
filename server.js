const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// PostgreSQL connection
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres.omtgapknfqbzzrtppznx:xusniddin001@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require';

const pool = new Pool({
  connectionString: DB_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('error', (err) => {
  console.error('Baza xatosi (zaxira rejimiga o\'tiladi):', err.message);
});

// Zaxira ma'lumotlar (Baza ishlamagan holat uchun)
const staticCategories = [
  { id: 1, name: "Milliy taomlar" },
  { id: 2, name: "Fast Food" },
  { id: 3, name: "Kofe va Shirinliklar" },
  { id: 4, name: "Yevropa oshxonasi" }
];

const staticRestaurants = [
  {
    id: 1,
    title: "Chorsu Oshi",
    description: "Toshkentning eng mazali milliy palovi va taomlari.",
    address: "Chorsu bozori yonida, Toshkent",
    latitude: 41.3275,
    longitude: 69.2411,
    phone: "+998 90 123 45 67",
    category_id: 1,
    category_name: "Milliy taomlar",
    avg_rating: "4.8",
    review_count: "12"
  },
  {
    id: 2,
    title: "EVOS Fast Food",
    description: "Tezkor va mazali lavashlar to'plami.",
    address: "Amir Temur shoh ko'chasi, Toshkent",
    latitude: 41.3111,
    longitude: 69.2797,
    phone: "+998 71 200 00 00",
    category_id: 2,
    category_name: "Fast Food",
    avg_rating: "4.5",
    review_count: "25"
  },
  {
    id: 3,
    title: "ECCO Coffee",
    description: "Shirin kofe va shirinliklar maskani.",
    address: "Oybek ko'chasi, Toshkent",
    latitude: 41.2995,
    longitude: 69.2672,
    phone: "+998 93 555 44 33",
    category_id: 3,
    category_name: "Kofe va Shirinliklar",
    avg_rating: "4.9",
    review_count: "8"
  }
];

// --- API ENDPOINTS ---

// 1. Kategoriyalar API
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    if (result.rows.length > 0) {
      return res.json(result.rows);
    }
    res.json(staticCategories);
  } catch (err) {
    console.log('Kategoriyalar bazadan olinmadi, statik ma\'lumot berilmoqda:', err.message);
    res.json(staticCategories);
  }
});

// 2. Restoranlar API
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
    if (result.rows.length > 0) {
      return res.json(result.rows);
    }
    res.json(staticRestaurants);
  } catch (err) {
    console.log('Restoranlar bazadan olinmadi, statik ma\'lumot berilmoqda:', err.message);
    res.json(staticRestaurants);
  }
});

// Boshqa barcha so'rovlarni frontend index.html ga yo'naltirish
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serverni ishga tushirish
app.listen(PORT, () => {
  console.log(`Server ${PORT}-portda ishlamoqda...`);
});