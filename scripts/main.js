const state = {
    products: [],      // Массив всех товаров из XML
    categories: [],    // Массив категорий из XML
    news: [],          // Массив новостей из XML
    cart: [],          // Массив товаров в корзине
    filters: {         // Текущие фильтры каталога
        category: 'all',    // 'all' или slug категории
        sortBy: 'name'      // 'name', 'price-asc', 'price-desc'
    },
    currentPage: ''    // Текущая страница (определяется из URL)
};

// ЗАГРУЗКА ДАННЫХ
async function loadXMLData() {
    const ts = Date.now();
    console.log('Fetching XML...', 'data/products.xml?t=' + ts);
    
    // Запрос XML с параметром времени для обхода кэширования
    const response = await fetch('data/products.xml?t=' + ts);
    const xmlText = await response.text();
    console.log('XML length:', xmlText.length);
    
    // Парсинг XML строки в DOM
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    // Извлечение всех статей новостей
    const articles = xmlDoc.querySelectorAll('store > news > article');
    console.log('Found articles:', articles.length);
    
    // Парсинг категорий из XML
    state.categories = Array.from(xmlDoc.querySelectorAll('store > categories > category')).map(cat => ({
        id: cat.getAttribute('id'),           // Уникальный ID категории
        name: cat.getAttribute('name'),       // Отображаемое имя
        slug: cat.getAttribute('slug')        // URL-френдли идентификатор
    }));
    
    // Парсинг товаров из XML
    state.products = Array.from(xmlDoc.querySelectorAll('store > products > product')).map(prod => ({
        id: prod.getAttribute('id'),                          // Уникальный ID товара
        category: prod.getAttribute('category'),              // ID категории
        price: parseFloat(prod.getAttribute('price')),        // Цена (число)
        stock: parseInt(prod.getAttribute('stock')),          // Количество на складе
        featured: prod.getAttribute('featured') === 'true',   // Рекомендуемый ли товар
        name: prod.querySelector('name')?.textContent || '',  // Название товара
        image: prod.querySelector('image')?.textContent || '' // Путь к изображению
    }));

    // Парсинг новостей из XML с сортировкой по дате (сначала новые)
    state.news = Array.from(articles).map(article => ({
        title: article.querySelector('title')?.textContent || '',
        summary: article.querySelector('summary')?.textContent || '',
        content: article.querySelector('content')?.textContent || ''
    })).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    console.log(`Loaded ${state.products.length} products, ${state.categories.length} categories, ${state.news.length} news articles`);
}

// УПРАВЛЕНИЕ КОРЗИНОЙ
function getCart() {
    const raw = localStorage.getItem('lego_cart') || '';
    if (!raw) {
        state.cart = [];
    } else {
        // Парсинг строки "productId:quantity,productId:quantity,..."
        const items = raw.split(',').filter(Boolean);
        state.cart = items.map(itemStr => {
            const [productId, quantity] = itemStr.split(':');
            return { productId, quantity: parseInt(quantity, 10) };
        }).map(item => {
            // Поиск товара в загруженном каталоге
            const product = state.products.find(p => p.id === item.productId);
            if (product) {
                return {
                    productId: item.productId,
                    quantity: item.quantity,
                    name: product.name,    // Добавляем данные товара
                    price: product.price,
                    image: product.image
                };
            }
            return null; // Товар удалён из каталога
        }).filter(Boolean); // Удаляем null значения
    }
    updateCartCount(); // Обновляем счётчик в хедере
}

// Сохранение корзины в localStorage
// Сохраняет только productId и quantity в компактном формате
function saveCart() {
    const raw = state.cart.map(item => `${item.productId}:${item.quantity}`).join(',');
    localStorage.setItem('lego_cart', raw);
    updateCartCount();
}

// Обновление счётчика товаров в корзине в хедере сайта
function updateCartCount() {
    const total = state.cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const badge = document.getElementById('cart-count');
    if (badge) {
        badge.textContent = total;
        badge.style.display = total > 0 ? 'flex' : 'none'; // Показываем только если есть товары
    }
}

// Обновление состояния кнопок "В корзину" в зависимости от наличия товара в корзине
function updateAddToCartButtons() {
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        const productId = btn.dataset.id;
        const cartItem = state.cart.find(item => item.productId === productId);
        if (cartItem) {
            btn.textContent = 'В корзине';
            btn.classList.add('in-cart');
        } else {
            btn.textContent = 'В корзину';
            btn.classList.remove('in-cart');
        }
    });
}

// Добавление товара в корзину
function addToCart(productId, quantity = 1) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return; // Товар не найден
    
    const existing = state.cart.find(i => i.productId === productId);
    if (existing) {
        // Товар уже в корзине - увеличиваем количество
        existing.quantity += quantity;
    } else {
        // Новый товар - добавляем в корзину
        state.cart.push({
            productId,
            quantity,
            name: product.name,
            price: product.price,
            image: product.image
        });
    }
    saveCart();
    updateAddToCartButtons();
}


// ============================================
// ФОРМАТИРОВАНИЕ И РЕНДЕРИНГ
// ============================================

// Форматирование цены: "1234.5" → "1 234.50 BYN"
function formatPrice(price) {
    return price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' BYN';
}

// Создание HTML-карточки товара
function renderProductCard(product) {
    const cartItem = state.cart.find(item => item.productId === product.id);
    const inCart = cartItem ? 'in-cart' : '';
    const buttonText = cartItem ? 'В корзине' : 'В корзину';
    return `
        <div class="product-card" data-id="${product.id}">
            <img src="${product.image || 'assets/images/placeholder.png'}" alt="${product.name}" class="product-image">
            <h3>${product.name}</h3>
            <p class="price">${formatPrice(product.price)}</p>
            <button class="add-to-cart ${inCart}" data-id="${product.id}">${buttonText}</button>
        </div>
    `;
}

// Рендеринг рекомендуемых товаров на главной странице
function renderFeaturedProducts() {
    const container = document.getElementById('featured-grid');
    if (!container) return;
    
    // Выборка только рекомендованных товаров (максимум 5)
    const featured = state.products.filter(p => p.featured).slice(0, 5);
    container.innerHTML = featured.length ? featured.map(renderProductCard).join('') : '<p>Нет рекомендуемых товаров</p>';
    
    // Добавление обработчиков кликов по кнопке "В корзину"
    container.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', () => {
            addToCart(btn.dataset.id);
        });
    });
}// Рендеринг рекомендуемых товаров на главной странице

// Рендеринг категорий на главной странице
function renderCategories() {
    const container = document.getElementById('categories-grid');
    if (!container) return;
    
    container.innerHTML = state.categories.map(cat => `
        <div class="category-card">
            <h3>${cat.name}</h3>
            <p>${state.products.filter(p => p.category === cat.id).length} товаров</p>
            <a href="catalog.html?category=${cat.slug}" class="btn">Смотреть</a>
        </div>
    `).join('');
}

// Рендеринг каталога с фильтрацией и сортировкой
function renderCatalog() {
    const container = document.getElementById('catalog-grid');
    const loading = document.getElementById('loading');
    const noResults = document.getElementById('no-results');
    
    if (!container) return;
    
    loading.style.display = 'block';
    container.innerHTML = '';
    
    setTimeout(() => {
        loading.style.display = 'none';
        
        // Фильтрация по выбранной категории
        let filtered = [...state.products];
        if (state.filters.category !== 'all') {
            const cat = state.categories.find(c => c.slug === state.filters.category);
            if (cat) filtered = filtered.filter(p => p.category === cat.id);
        }
        
        // Сортировка
        if (state.filters.sortBy === 'price-asc') filtered.sort((a, b) => a.price - b.price);
        else if (state.filters.sortBy === 'price-desc') filtered.sort((a, b) => b.price - a.price);
        else filtered.sort((a, b) => a.name.localeCompare(b.name)); // По умолчанию - по имени
        
        // Рендеринг результатов
        if (filtered.length === 0) {
            noResults.style.display = 'block';
            container.style.display = 'none';
        } else {
            noResults.style.display = 'none';
            container.style.display = 'grid';
            container.innerHTML = filtered.map(renderProductCard).join('');
            
            // Добавление обработчиков кнопок "В корзину"
            container.querySelectorAll('.add-to-cart').forEach(btn => {
                btn.addEventListener('click', () => {
                    addToCart(btn.dataset.id);
                });
            });
        }
    }, 300); // Имитация загрузки (300мс)
}


// ============================================
// ФИЛЬТРЫ КАТАЛОГА
// ============================================
// Инициализация выпадающих списков фильтров на странице каталога
// Читает параметры из URL и применяет фильтры
function initFilters() {
    const categoryFilter = document.getElementById('category-filter');
    const sortFilter = document.getElementById('sort-filter');
    
    if (!categoryFilter || !sortFilter) return;
    
    // Чтение параметров из URL (например, catalog.html?category=technic&sort=price-asc)
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    if (categoryParam) {
        categoryFilter.value = categoryParam;
        state.filters.category = categoryParam;
    }
    
    const sortParam = urlParams.get('sort');
    if (sortParam) {
        sortFilter.value = sortParam;
        state.filters.sortBy = sortParam;
    }
    
    // Обработчики изменений фильтров
    categoryFilter.addEventListener('change', e => {
        state.filters.category = e.target.value;
        renderCatalog();
    });
    
    sortFilter.addEventListener('change', e => {
        state.filters.sortBy = e.target.value;
        renderCatalog();
    });
}


// ============================================
// FAQ (ЧАСТЫЕ ВОПРОСЫ)
// ============================================
// Инициализация раскрывающихся блоков FAQ на странице помощи
function initFAQ() {
    const toggles = document.querySelectorAll('.question-toggle');
    toggles.forEach(toggle => {
        const icon = toggle.querySelector('svg');
        const content = toggle.parentElement.querySelector('.question-content');
        
        toggle.addEventListener('click', () => {
            const isOpen = toggle.getAttribute('aria-expanded') === 'true';
            
            toggle.setAttribute('aria-expanded', !isOpen);
            if (isOpen) {
                // Закрытие
                content.style.maxHeight = '0';
                if (icon) icon.style.transform = 'rotate(0deg)';
            } else {
                // Открытие
                content.style.maxHeight = content.scrollHeight + 'px';
                if (icon) icon.style.transform = 'rotate(180deg)';
            }
        });
    });
}


// ============================================
// СТРАНИЦА КОРЗИНЫ
// ============================================
// Рендеринг страницы корзины с подсчётом итоговой суммы
function renderCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    const emptyCart = document.getElementById('empty-cart');
    const cartContent = document.getElementById('cart-content');
    const totalItemsEl = document.getElementById('total-items');
    const totalPriceEl = document.getElementById('total-price');
    const shippingCostEl = document.getElementById('shipping-cost');
    const grandTotalEl = document.getElementById('grand-total');
    
    if (!cartItemsContainer || !emptyCart || !cartContent) return;
    
    // Корзина пуста - показываем сообщение
    if (state.cart.length === 0) {
        emptyCart.style.display = 'block';
        cartContent.style.display = 'none';
        if (totalItemsEl) totalItemsEl.textContent = '0';
        if (totalPriceEl) totalPriceEl.textContent = '0 BYN';
        if (shippingCostEl) shippingCostEl.textContent = '0 BYN';
        if (grandTotalEl) grandTotalEl.textContent = '0 BYN';
        return;
    }
    
    emptyCart.style.display = 'none';
    cartContent.style.display = 'block';
    
    // Рендеринг строк таблицы с товарами
    cartItemsContainer.innerHTML = state.cart.map(item => `
        <tr>
            <td>${item.name}</td>
            <td>${formatPrice(item.price)}</td>
            <td>
                <button class="qty-btn" data-action="decrease" data-id="${item.productId}">−</button>
                <span>${item.quantity}</span>
                <button class="qty-btn" data-action="increase" data-id="${item.productId}">+</button>
            </td>
            <td>${formatPrice(item.price * item.quantity)}</td>
            <td><button class="remove-btn" data-id="${item.productId}">Удалить</button></td>
        </tr>
    `).join('');
    
    // Подсчёт итогов
    const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (totalItemsEl) totalItemsEl.textContent = totalItems;
    if (totalPriceEl) totalPriceEl.textContent = formatPrice(totalPrice);
    
    // Доставка: бесплатно от 200 BYN, иначе 5 BYN
    const shippingCost = totalPrice > 200 ? 0 : 5;
    if (shippingCostEl) shippingCostEl.textContent = formatPrice(shippingCost);
    
    // Итоговая сумма
    const grandTotal = totalPrice + shippingCost;
    if (grandTotalEl) grandTotalEl.textContent = formatPrice(grandTotal);
    
    // Обновление счётчика в хедере
    updateCartCount();
    
    // Обработчики кнопок изменения количества и удаления
    cartItemsContainer.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.getAttribute('data-action');
            const productId = btn.getAttribute('data-id');
            const delta = action === 'increase' ? 1 : -1;
            updateQuantity(productId, delta);
        });
    });
    
    cartItemsContainer.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const productId = btn.getAttribute('data-id');
            removeFromCart(productId);
        });
    });
}

// Изменение количества товара в корзине
function updateQuantity(productId, delta) {
    const item = state.cart.find(i => i.productId === productId);
    if (!item) return;
    
    item.quantity += delta;
    if (item.quantity <= 0) {
        removeFromCart(productId); // Удалить если количество <= 0
    } else {
        saveCart();
        renderCart(); // Перерендерить страницу корзины
    }
}

// Удаление товара из корзины
function removeFromCart(productId) {
    state.cart = state.cart.filter(item => item.productId !== productId);
    saveCart();
    renderCart();
    updateAddToCartButtons();
}
// ============================================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// ============================================
// Главная функция инициализации, вызываемая при загрузке страницы
async function init() {
    // Определение текущей страницы из URL (index.html → 'index')
    state.currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
    
    // Загрузка XML-данных (нужно до работы с корзиной)
    await loadXMLData();
    
    // Загрузка корзины из localStorage (после загрузки товаров)
    getCart();
    
    // Загрузка футера
    await loadFooter();
    
    // Рендеринг в зависимости от страницы
    switch (state.currentPage) {
        case 'index':
            renderCategories();
            renderFeaturedProducts();
            renderNews();
            break;
            
        case 'catalog':
            initFilters();
            renderCatalog();
            break;
            
        case 'cart':
            renderCart();
            break;
            
        case 'help':
            initFAQ();
            break;
    }
    
    // Инициализация мобильного меню (гамбургер)
    const toggle = document.querySelector('.header__mobile-toggle');
    const nav = document.querySelector('.header__nav');
    if (toggle && nav) {
        toggle.addEventListener('click', () => {
            nav.classList.toggle('active');
        });
    }
}


// ============================================
// ЗАПУСК ПРИЛОЖЕНИЯ
// ============================================
// Ожидание загрузки DOM и запуск инициализации
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Загрузка централизованного футера
async function loadFooter() {
    try {
        const response = await fetch('partials/footer.html');
        const footerHTML = await response.text();
        const footerContainer = document.getElementById('footer-placeholder');
        if (footerContainer) {
            footerContainer.innerHTML = footerHTML;
        }
    } catch (error) {
        console.error('Failed to load footer:', error);
    }
}

// Экспорт функций в глобальный объект window для использования в HTML-атрибутах onclick
window.addToCart = addToCart;