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

// Local PostgreSQL ulanishi (parol: 2215)
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:1234@localhost:5432/restaurant_db';

const pool = new Pool({
  connectionString: DB_URL,
  ssl: false // Local baza uchun SSL talab qilinmaydi
});

// Zaxira (Static) Ma'lumotlar - Baza ishlamay qolsa ham UI buzilmaydi
const staticCategories = [
  { id: 1, name: "Milliy taomlar" },
  { id: 2, name: "Fast Food" },
  { id: 3, name: "Kofe va Shirinliklar" }
];

const staticRestaurants = [
  {
    id: 1,
    title: "Chorsu Oshi",
    category_name: "Milliy taomlar",
    description: "Toshkentning eng mazali milliy palovi va to'y oshlari.",
    address: "Chorsu bozori yonida, Toshkent",
    phone: "+998 90 123 45 67",
    latitude: 41.3275,
    longitude: 69.2411,
    avg_rating: "4.8",
    review_count: "12"
  },
  {
    id: 2,
    title: "EVOS Fast Food",
    category_name: "Fast Food",
    description: "Tezkor va mazali lavash hamda burgerlar to'plami.",
    address: "Amir Temur shoh ko'chasi, Toshkent",
    phone: "+998 71 200 00 00",
    latitude: 41.3111,
    longitude: 69.2797,
    avg_rating: "4.5",
    review_count: "25"
  },
  {
    id: 3,
    title: "ECCO Coffee",
    category_name: "Kofe va Shirinliklar",
    description: "Shirin kofe, desertlar va shinam muhit maskani.",
    address: "Oybek ko'chasi, Toshkent",
    phone: "+998 93 555 44 33",
    latitude: 41.2995,
    longitude: 69.2670,
    avg_rating: "4.9",
    review_count: "8"
  }
];

// Kategoriyalar API
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    res.json(result.rows.length > 0 ? result.rows : staticCategories);
  } catch (err) {
    console.warn('Local baza ulanmadi, static categories ishlatilmoqda:', err.message);
    res.json(staticCategories);
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
    res.json(result.rows.length > 0 ? result.rows : staticRestaurants);
  } catch (err) {
    console.warn('Local baza ulanmadi, static restaurants ishlatilmoqda:', err.message);
    res.json(staticRestaurants);
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server ${PORT}-portda muvaffaqiyatli ishlamoqda...`);
});