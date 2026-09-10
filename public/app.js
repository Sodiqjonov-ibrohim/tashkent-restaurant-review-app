const API_URL = 'http://localhost:5000/api';

let activeCategoryId = null;
let mainMap = null;
let modalMap = null;
let markersGroup = null;
let selectedMarker = null;

// Toshkent shahrining boshlang'ich koordinatalari (Default: Tashkent)
const DEFAULT_LAT = 41.2995;
const DEFAULT_LNG = 69.2401;

document.addEventListener('DOMContentLoaded', () => {
  initMainMap();
  fetchCategories();
  fetchRestaurants();

  document.getElementById('add-restaurant-form').addEventListener('submit', handleAddRestaurant);
  document.getElementById('add-review-form').addEventListener('submit', handleAddReview);
});

// 1. Asosiy Xaritani Initsializatsiya qilish
function initMainMap() {
  const mapElement = document.getElementById('map');
  if (!mapElement) return;

  mainMap = L.map('map').setView([DEFAULT_LAT, DEFAULT_LNG], 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mainMap);

  markersGroup = L.layerGroup().addTo(mainMap);
}

// 2. Kategoriyalarni olish
async function fetchCategories() {
  try {
    const res = await fetch(`${API_URL}/categories`);
    const categories = await res.json();

    const categoryContainer = document.getElementById('category-buttons');
    const selectCategory = document.getElementById('rest-category');

    if (categoryContainer) {
      categoryContainer.innerHTML = '<button class="filter-btn active" onclick="filterCategory(null, this)">Barchasi</button>';
    }

    categories.forEach(cat => {
      if (categoryContainer) {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.innerText = cat.name;
        btn.onclick = () => filterCategory(cat.id, btn);
        categoryContainer.appendChild(btn);
      }

      if (selectCategory) {
        const option = document.createElement('option');
        option.value = cat.id;
        option.innerText = cat.name;
        selectCategory.appendChild(option);
      }
    });
  } catch (err) {
    console.error('Kategoriyalarni yuklashda xatolik:', err);
  }
}

// 3. Restoranlarni olish va xaritaga marker sifatida qo'shish
async function fetchRestaurants() {
  try {
    const searchVal = document.getElementById('search-input')?.value || '';
    const sortVal = document.getElementById('sort-select')?.value || 'newest';

    let url = `${API_URL}/restaurants?sort=${sortVal}`;
    if (activeCategoryId) url += `&category_id=${activeCategoryId}`;
    if (searchVal.trim() !== '') url += `&search=${encodeURIComponent(searchVal.trim())}`;

    const res = await fetch(url);
    const restaurants = await res.json();

    displayRestaurants(restaurants);
    updateMapMarkers(restaurants);
  } catch (err) {
    console.error('Restoranlarni yuklashda xatolik:', err);
  }
}

// 4. Restoran kartochkalarini ekranga chiqarish
function displayRestaurants(restaurants) {
  const container = document.getElementById('restaurants-list');
  container.innerHTML = '';

  if (restaurants.length === 0) {
    container.innerHTML = '<p class="empty-msg">Hozircha hech qanday restoran topilmadi.</p>';
    return;
  }

  restaurants.forEach(rest => {
    const card = document.createElement('div');
    card.className = 'restaurant-card';
    card.innerHTML = `
      <h3>${rest.title}</h3>
      <span class="badge">${rest.category_name || 'Umumiy'}</span>
      <p>📍 ${rest.address}</p>
      <p>📞 ${rest.phone || 'Kiritilmagan'}</p>
      <div class="rating">⭐ ${Number(rest.average_rating).toFixed(1)} (${rest.review_count} ta sharh)</div>
      <button class="btn-secondary" onclick="openReviewModal(${rest.id}, '${rest.title}')">Sharh qoldirish</button>
    `;
    container.appendChild(card);
  });
}

// 5. Asosiy xaritadagi markerlarni yangilash
function updateMapMarkers(restaurants) {
  if (!markersGroup) return;
  markersGroup.clearLayers();

  restaurants.forEach(rest => {
    if (rest.latitude && rest.longitude) {
      const marker = L.marker([rest.latitude, rest.longitude]);
      marker.bindPopup(`
        <b>${rest.title}</b><br>
        📍 ${rest.address}<br>
        ⭐ ${Number(rest.average_rating).toFixed(1)}
      `);
      markersGroup.addLayer(marker);
    }
  });
}

// Qidiruv va saralash hodisasi
function handleSearchSort() {
  fetchRestaurants();
}

// Kategoriya bo'yicha saralash
function filterCategory(categoryId, element) {
  activeCategoryId = categoryId;
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  if (element) element.classList.add('active');
  fetchRestaurants();
}

// 6. Restoran qo'shish
async function handleAddRestaurant(e) {
  e.preventDefault();
  const data = {
    title: document.getElementById('rest-title').value,
    address: document.getElementById('rest-address').value,
    phone: document.getElementById('rest-phone').value,
    category_id: document.getElementById('rest-category').value,
    description: document.getElementById('rest-desc').value,
    latitude: document.getElementById('rest-lat').value,
    longitude: document.getElementById('rest-lng').value
  };

  try {
    const res = await fetch(`${API_URL}/restaurants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      closeModal('restaurant-modal');
      document.getElementById('add-restaurant-form').reset();
      fetchRestaurants();
    }
  } catch (err) {
    console.error('Restoran qo\'shishda xatolik:', err);
  }
}

// 7. Sharh qoldirish
async function handleAddReview(e) {
  e.preventDefault();
  const data = {
    restaurant_id: document.getElementById('review-rest-id').value,
    rating: document.getElementById('review-rating').value,
    comment: document.getElementById('review-comment').value
  };

  try {
    const res = await fetch(`${API_URL}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      closeModal('review-modal');
      document.getElementById('add-review-form').reset();
      fetchRestaurants();
    }
  } catch (err) {
    console.error('Sharh yuborishda xatolik:', err);
  }
}

// Modal va Mini-Xaritani boshqarish
function openModal(id) {
  document.getElementById(id).style.display = 'flex';

  // Agar restoran qo'shish modali ochilsa, mini-xaritani initsializatsiya qilamiz
  if (id === 'restaurant-modal') {
    setTimeout(() => initModalMap(), 200);
  }
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

function openReviewModal(restId, restTitle) {
  document.getElementById('review-rest-id').value = restId;
  document.getElementById('review-rest-title').innerText = `Sharh: ${restTitle}`;
  openModal('review-modal');
}

// Modal ichidagi mini-xaritanikini sozlash
function initModalMap() {
  if (!modalMap) {
    modalMap = L.map('modal-map').setView([DEFAULT_LAT, DEFAULT_LNG], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(modalMap);

    modalMap.on('click', (e) => {
      const { lat, lng } = e.latlng;
      document.getElementById('rest-lat').value = lat.toFixed(6);
      document.getElementById('rest-lng').value = lng.toFixed(6);

      if (selectedMarker) {
        selectedMarker.setLatLng([lat, lng]);
      } else {
        selectedMarker = L.marker([lat, lng]).addTo(modalMap);
      }
    });
  } else {
    modalMap.invalidateSize();
  }
}