// Statik ma'lumotlar (Backend va Bazaga so'rov yuborilmaydi)
const categories = [
  { id: 1, name: "Milliy taomlar" },
  { id: 2, name: "Fast Food" },
  { id: 3, name: "Kofe va Shirinliklar" },
  { id: 4, name: "Yevropa oshxonasi" }
];

const restaurants = [
  {
    id: 1,
    title: "Chorsu Oshi",
    description: "Toshkentning eng mazali milliy palovi va to'y oshlari.",
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
    description: "Tezkor va mazali lavash hamda burgerlar to'plami.",
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
    description: "Shirin kofe, desertlar va shinam muhit maskani.",
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

let map;
let markers = [];

// Xaritani va sahifani yuklash
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  renderCategories();
  renderRestaurants(restaurants);

  // Qidiruv va Filter voqealari
  document.getElementById('searchInput')?.addEventListener('input', filterData);
  document.getElementById('categoryFilter')?.addEventListener('change', filterData);
});

// Leaflet Xaritasini rejalashtirish
function initMap() {
  const mapElement = document.getElementById('map');
  if (!mapElement) return;

  map = L.map('map').setView([41.311081, 69.240562], 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  addMarkers(restaurants);
}

// Kategoriyalarni Select'ga chiqarish
function renderCategories() {
  const select = document.getElementById('categoryFilter');
  if (!select) return;

  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.id;
    option.textContent = cat.name;
    select.appendChild(option);
  });
}

// Restoranlarni kartochka qilib chiqarish
function renderRestaurants(list) {
  const container = document.getElementById('restaurantList');
  if (!container) return;

  container.innerHTML = '';

  if (list.length === 0) {
    container.innerHTML = '<p class="text-center">Hech qanday restoran topilmadi.</p>';
    return;
  }

  list.forEach(item => {
    const card = document.createElement('div');
    card.className = 'restaurant-card';
    card.innerHTML = `
      <h3>${item.title}</h3>
      <span class="badge">${item.category_name}</span>
      <p>${item.description}</p>
      <p><strong>📍 Manzil:</strong> ${item.address}</p>
      <p><strong>📞 Tel:</strong> ${item.phone}</p>
      <p><strong>⭐ Reyting:</strong> ${item.avg_rating} (${item.review_count} ta sharh)</p>
    `;
    container.appendChild(card);
  });
}

// Xaritaga markerlarni qo'shish
function addMarkers(list) {
  // Eskilarini tozalash
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  list.forEach(item => {
    if (item.latitude && item.longitude) {
      const marker = L.marker([item.latitude, item.longitude])
        .addTo(map)
        .bindPopup(`<b>${item.title}</b><br>${item.address}`);
      markers.push(marker);
    }
  });
}

// Qidiruv va kategoriyalar bo'yicha saralash
function filterData() {
  const searchValue = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const categoryValue = document.getElementById('categoryFilter')?.value || '';

  const filtered = restaurants.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchValue) || r.address.toLowerCase().includes(searchValue);
    const matchesCategory = categoryValue === '' || r.category_id == categoryValue;
    return matchesSearch && matchesCategory;
  });

  renderRestaurants(filtered);
  addMarkers(filtered);
}