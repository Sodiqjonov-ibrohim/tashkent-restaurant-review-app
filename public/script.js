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

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  renderCategories();
  renderRestaurants(restaurants);

  document.getElementById('searchInput').addEventListener('input', filterData);
  document.getElementById('categoryFilter').addEventListener('change', filterData);
});

function initMap() {
  map = L.map('map').setView([41.311081, 69.240562], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  addMarkers(restaurants);
}

function renderCategories() {
  const select = document.getElementById('categoryFilter');
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.name;
    select.appendChild(opt);
  });
}

function renderRestaurants(list) {
  const container = document.getElementById('restaurantList');
  container.innerHTML = '';

  if (list.length === 0) {
    container.innerHTML = '<p>Restoran topilmadi.</p>';
    return;
  }

  list.forEach(r => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${r.title}</h3>
      <span class="badge">${r.category_name}</span>
      <p>${r.description}</p>
      <p>📍 ${r.address}</p>
      <p>📞 ${r.phone}</p>
      <div class="rating">⭐ ${r.avg_rating} (${r.review_count} sharh)</div>
    `;
    container.appendChild(card);
  });
}

function addMarkers(list) {
  markers.forEach(m => map.removeLayer(m));
  markers = [];
  list.forEach(r => {
    const m = L.marker([r.latitude, r.longitude]).addTo(map).bindPopup(`<b>${r.title}</b><br>${r.address}`);
    markers.push(m);
  });
}

function filterData() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const catId = document.getElementById('categoryFilter').value;

  const filtered = restaurants.filter(r => {
    const matchSearch = r.title.toLowerCase().includes(search) || r.address.toLowerCase().includes(search);
    const matchCat = catId === '' || r.category_id == catId;
    return matchSearch && matchCat;
  });

  renderRestaurants(filtered);
  addMarkers(filtered);
}