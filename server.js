const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const JWT_SECRET = process.env.JWT_SECRET || 'maxfiy_kalit_123';

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        }
      }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'tashkent_restaurants',
        password: process.env.DB_PASSWORD || '12345',
        port: process.env.DB_PORT || 6543,
      }
);

// --- MIDDLEWARE: Token tekshirish ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token topilmadi, iltimos tizimga kiring' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Noto`g`ri yoki eskirgan token' });
    req.user = user;
    next();
  });
};

// --- MIDDLEWARE: Faqat Admin tekshiruvi ---
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Ruxsat berilmadi: Faqat adminlar uchun!' });
  }
};

// ================= API ENDPOINT'LAR =================

// 1. Ro'yxatdan o'tish (Register)
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const userExist = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExist.rows.length > 0) {
      return res.status(400).json({ error: 'Bu email allaqachon ro`yxatdan o`tgan' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, hashedPassword, 'user']
    );

    res.json({ message: 'Muvaffaqiyatli ro`yxatdan o`tdingiz!', user: newUser.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Tizimga kirish (Login)
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) return res.status(400).json({ error: 'Email yoki parol xato!' });

    const user = userRes.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Email yoki parol xato!' });

    const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Kategoriyalar va Restoranlarni olish
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/restaurants', async (req, res) => {
  const { search, category_id, sort } = req.query;
  let queryText = `
    SELECT r.*, c.name as category_name,
      COALESCE(AVG(rev.rating), 0) as average_rating,
      COUNT(rev.id) as review_count
    FROM restaurants r
    LEFT JOIN categories c ON r.category_id = c.id
    LEFT JOIN reviews rev ON r.id = rev.restaurant_id
  `;
  const values = [];
  const conditions = [];

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(r.title ILIKE $${values.length} OR r.address ILIKE $${values.length})`);
  }
  if (category_id) {
    values.push(category_id);
    conditions.push(`r.category_id = $${values.length}`);
  }
  if (conditions.length > 0) queryText += ' WHERE ' + conditions.join(' AND ');

  queryText += ' GROUP BY r.id, c.name';

  if (sort === 'rating') queryText += ' ORDER BY average_rating DESC';
  else if (sort === 'name') queryText += ' ORDER BY r.title ASC';
  else queryText += ' ORDER BY r.created_at DESC';

  try {
    const result = await pool.query(queryText, values);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Sharhlar
app.get('/api/restaurants/:id/reviews', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, u.name as user_name FROM reviews r 
       LEFT JOIN users u ON r.user_id = u.id 
       WHERE r.restaurant_id = $1 ORDER BY r.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reviews', authenticateToken, async (req, res) => {
  const { restaurant_id, rating, comment } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO reviews (restaurant_id, user_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *',
      [restaurant_id, req.user.id, rating, comment]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ADMIN PANELDAN FOYDALANISH YO'NALISHLARI ---

// Yangi restoran qo'shish (Faqat Admin)
app.post('/api/admin/restaurants', authenticateToken, requireAdmin, async (req, res) => {
  const { title, description, address, latitude, longitude, phone, category_id } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO restaurants (title, description, address, latitude, longitude, phone, category_id, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, description, address, latitude, longitude, phone, category_id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Restoranni o'chirish (Faqat Admin)
app.delete('/api/admin/restaurants/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM restaurants WHERE id = $1', [req.params.id]);
    res.json({ message: 'Restoran muvaffaqiyatli o`chirildi' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DB Yaratish va Dastlabki Ma'lumotlar
const createTablesAndSeed = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(20) DEFAULT 'user',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE
      );
      CREATE TABLE IF NOT EXISTS restaurants (
          id SERIAL PRIMARY KEY,
          title VARCHAR(150) NOT NULL,
          description TEXT,
          address TEXT NOT NULL,
          latitude DECIMAL(10, 8),
          longitude DECIMAL(11, 8),
          phone VARCHAR(30),
          category_id INT REFERENCES categories(id) ON DELETE SET NULL,
          user_id INT REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS reviews (
          id SERIAL PRIMARY KEY,
          restaurant_id INT REFERENCES restaurants(id) ON DELETE CASCADE,
          user_id INT REFERENCES users(id) ON DELETE CASCADE,
          rating INT CHECK (rating >= 1 AND rating <= 5),
          comment TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Boshlang'ich Admin yaratish
    const adminCheck = await pool.query("SELECT * FROM users WHERE email = 'admin@gmail.com'");
    if (adminCheck.rows.length === 0) {
      const hashedPass = await bcrypt.hash('admin123', 10);
      await pool.query(
        "INSERT INTO users (name, email, password, role) VALUES ('Admin', 'admin@gmail.com', $1, 'admin')",
        [hashedPass]
      );
      console.log("👑 Boshlang'ich Admin yaratildi: admin@gmail.com / admin123");
    }

    // Boshlang'ich Kategoriyalarni yaratish va ID larini olish
    const categories = ['Milliy Taomlar', 'Fast Food', 'Qahvaxona / Tortlar', 'Osiyo Oshxonasi', 'Yevropa Oshxonasi'];
    for (const catName of categories) {
      await pool.query("INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING", [catName]);
    }

    // Kategoriyalar ID sini aniqlash
    const catRows = await pool.query("SELECT id, name FROM categories");
    const categoryMap = {};
    catRows.rows.forEach(c => { categoryMap[c.name] = c.id; });

    // Boshlang'ich Real Restoranlar yaratish
    const restCheck = await pool.query("SELECT COUNT(*) FROM restaurants");
    if (parseInt(restCheck.rows[0].count) === 0) {
      const realRestaurants = [
        { title: 'Rayhon Milliy Taomlari', address: 'Navoiy ko`chasi, 27', phone: '+998712000000', category: 'Milliy Taomlar', lat: 41.3168, lon: 69.2483, desc: 'Mashhur milliy taomlar' },
        { title: 'Caravan Restaurant', address: 'Abdulla Qahhor ko`chasi, 22', phone: '+998712556296', category: 'Milliy Taomlar', lat: 41.2891, lon: 69.2632, desc: 'O`zbek milliy taomlari' },
        { title: 'Yapona Mama', address: 'Shota Rustaveli ko`chasi, 12', phone: '+998711401414', category: 'Osiyo Oshxonasi', lat: 41.2985, lon: 69.2665, desc: 'Yapon va Osiyo oshxonasi' },
        { title: 'Bon! Coffee & Bakery', address: 'Sharaf Rashidov ko`chasi, 16', phone: '+998712000202', category: 'Qahvaxona / Tortlar', lat: 41.3102, lon: 69.2721, desc: 'Fransuz qahvaxonasi' },
        { title: 'Besh Qozon (Osh Markazi)', address: 'Iftxor ko`chasi, 1', phone: '+998712000100', category: 'Milliy Taomlar', lat: 41.3468, lon: 69.2847, desc: 'Toshkentning eng katta palov markazi' }
      ];

      for (const r of realRestaurants) {
        const catId = categoryMap[r.category] || null;
        await pool.query(
          `INSERT INTO restaurants (title, address, phone, category_id, description, latitude, longitude)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [r.title, r.address, r.phone, catId, r.desc, r.lat, r.lon]
        );
      }
      console.log("📍 Dastlabki restoranlar va kategoriyalar yaratildi!");
    }
  } catch (err) {
    console.error("Baza sozlanishida xatolik:", err.message);
  }
};

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  await createTablesAndSeed();
  console.log(`Server ${PORT}-portda ishlamoqda...`);
});