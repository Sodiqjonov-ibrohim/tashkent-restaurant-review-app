let map;
let markersMap = {};
const reviewModal = new bootstrap.Modal(document.getElementById('reviewModal'));
const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
const addRestaurantModal = new bootstrap.Modal(document.getElementById('addRestaurantModal'));

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    checkAuthStatus();
    fetchCategories();
    fetchRestaurants();

    document.getElementById('searchInput').addEventListener('input', fetchRestaurants);
    document.getElementById('categorySelect').addEventListener('change', fetchRestaurants);
    document.getElementById('sortSelect').addEventListener('change', fetchRestaurants);
    document.getElementById('addReviewForm').addEventListener('submit', handleAddReview);
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('addRestaurantForm').addEventListener('submit', handleAddRestaurant);
});

// Auth Statusni tekshirish
function checkAuthStatus() {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    if (user && token) {
        document.getElementById('authButtons').classList.add('d-none');
        document.getElementById('userInfo').classList.remove('d-none');
        document.getElementById('userNameLabel').textContent = `👤 ${user.name}`;
        
        if (user.role === 'admin') {
            document.getElementById('adminAddBtn').classList.remove('d-none');
        }
        document.getElementById('reviewFormContainer').classList.remove('d-none');
        document.getElementById('loginPrompt').classList.add('d-none');
    } else {
        document.getElementById('authButtons').classList.remove('d-none');
        document.getElementById('userInfo').classList.add('d-none');
        document.getElementById('adminAddBtn').classList.add('d-none');
        document.getElementById('reviewFormContainer').classList.add('d-none');
        document.getElementById('loginPrompt').classList.remove('d-none');
    }
}

function initMap() {
    map = L.map('map').setView([41.311081, 69.240562], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
}

async function fetchCategories() {
    const res = await fetch('/api/categories');
    const categories = await res.json();
    const select = document.getElementById('categorySelect');
    const restSelect = document.getElementById('restCategory');
    categories.forEach(cat => {
        select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
        restSelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
    });
}

async function fetchRestaurants() {
    const search = document.getElementById('searchInput').value;
    const category_id = document.getElementById('categorySelect').value;
    const sort = document.getElementById('sortSelect').value;

    const url = new URL('/api/restaurants', window.location.origin);
    if (search) url.searchParams.append('search', search);
    if (category_id) url.searchParams.append('category_id', category_id);
    if (sort) url.searchParams.append('sort', sort);

    const res = await fetch(url);
    const restaurants = await res.json();
    renderRestaurantsList(restaurants);
    renderMapMarkers(restaurants);
}

function renderRestaurantsList(restaurants) {
    const container = document.getElementById('restaurantsList');
    container.innerHTML = '';
    const user = JSON.parse(localStorage.getItem('user'));

    restaurants.forEach(rest => {
        const rating = parseFloat(rest.average_rating).toFixed(1);
        const isAdmin = user && user.role === 'admin';

        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-4 mb-4';
        card.innerHTML = `
            <div class="card h-100 restaurant-card shadow-sm" onclick="focusOnRestaurant(${rest.id}, ${rest.latitude}, ${rest.longitude})">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h5 class="card-title m-0 fw-bold text-primary">${rest.title}</h5>
                        <span class="badge badge-rating">⭐ ${rating}</span>
                    </div>
                    <p class="text-muted small mb-1">🏷️ ${rest.category_name || 'Kategoriyasiz'}</p>
                    <p class="card-text small mb-2 text-secondary">📍 ${rest.address}</p>
                    <p class="card-text small mb-3">📞 ${rest.phone || 'Telefon yo\'q'}</p>
                    
                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-primary btn-sm flex-grow-1" onclick="event.stopPropagation(); openReviewModal(${rest.id}, '${escapeQuotes(rest.title)}')">
                            💬 Sharhlar (${rest.review_count})
                        </button>
                        ${isAdmin ? `<button class="btn btn-outline-danger btn-sm" onclick="event.stopPropagation(); deleteRestaurant(${rest.id})">🗑️</button>` : ''}
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderMapMarkers(restaurants) {
    Object.values(markersMap).forEach(m => map.removeLayer(m));
    markersMap = {};
    restaurants.forEach(rest => {
        if (rest.latitude && rest.longitude) {
            const marker = L.marker([rest.latitude, rest.longitude]).addTo(map)
                .bindPopup(`<b>${rest.title}</b><br>📍 ${rest.address}<br>⭐ ${parseFloat(rest.average_rating).toFixed(1)}`);
            markersMap[rest.id] = marker;
        }
    });
}

function focusOnRestaurant(id, lat, lon) {
    if (lat && lon) {
        document.getElementById('map').scrollIntoView({ behavior: 'smooth', block: 'center' });
        map.flyTo([lat, lon], 16, { animate: true, duration: 1.5 });
        if (markersMap[id]) setTimeout(() => markersMap[id].openPopup(), 1200);
    }
}

// AUTH FUNKSIYALARI
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        loginModal.hide();
        checkAuthStatus();
        fetchRestaurants();
    } else {
        alert(data.error);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (res.ok) {
        alert('Muvaffaqiyatli ro\'yxatdan o\'tdingiz. Endi kiring!');
        registerModal.hide();
        loginModal.show();
    } else {
        alert(data.error);
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    checkAuthStatus();
    fetchRestaurants();
}

// ADMIN & SHARH FUNKSIYALARI
async function handleAddRestaurant(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const body = {
        title: document.getElementById('restTitle').value,
        address: document.getElementById('restAddress').value,
        phone: document.getElementById('restPhone').value,
        category_id: document.getElementById('restCategory').value,
        latitude: parseFloat(document.getElementById('restLat').value),
        longitude: parseFloat(document.getElementById('restLon').value),
        description: document.getElementById('restDesc').value,
    };

    const res = await fetch('/api/admin/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
    });
    if (res.ok) {
        addRestaurantModal.hide();
        fetchRestaurants();
    } else {
        alert('Restoran qo\'shishda xatolik!');
    }
}

async function deleteRestaurant(id) {
    if (!confirm('Haqiqatdan ham ushbu restoranni o\'chirmoqchimisiz?')) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/admin/restaurants/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) fetchRestaurants();
}

async function openReviewModal(restaurantId, title) {
    document.getElementById('modalRestaurantId').value = restaurantId;
    document.getElementById('modalTitle').textContent = `${title} — Sharhlar`;
    await loadReviews(restaurantId);
    reviewModal.show();
}

async function loadReviews(restaurantId) {
    const container = document.getElementById('reviewsContainer');
    container.innerHTML = 'Yuklanmoqda...';
    const res = await fetch(`/api/restaurants/${restaurantId}/reviews`);
    const reviews = await res.json();
    container.innerHTML = reviews.length === 0 ? '<p class="text-muted small">Hali sharhlar yo\'q.</p>' : '';
    reviews.forEach(rev => {
        container.innerHTML += `
            <div class="list-group-item">
                <div class="d-flex justify-content-between">
                    <h6 class="mb-1 fw-bold">⭐ ${rev.rating}/5 (${rev.user_name || 'Foydalanuvchi'})</h6>
                    <small class="text-muted">${new Date(rev.created_at).toLocaleDateString('uz-UZ')}</small>
                </div>
                <p class="mb-1 text-secondary">${rev.comment}</p>
            </div>
        `;
    });
}

async function handleAddReview(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const restaurantId = document.getElementById('modalRestaurantId').value;
    const rating = document.getElementById('reviewRating').value;
    const comment = document.getElementById('reviewComment').value;

    const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ restaurant_id: restaurantId, rating: parseInt(rating), comment })
    });
    if (res.ok) {
        document.getElementById('reviewComment').value = '';
        await loadReviews(restaurantId);
        fetchRestaurants();
    }
}

function escapeQuotes(str) { return str.replace(/'/g, "\\'").replace(/"/g, '&quot;'); }