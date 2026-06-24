// DOM элементы
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const profilePhone = document.getElementById('profilePhone');
const cartItemsContainer = document.getElementById('cartItems');
const itemsCount = document.getElementById('itemsCount');
const totalAmount = document.getElementById('totalAmount');
const checkoutBtn = document.getElementById('checkoutBtn');
const paymentOptions = document.querySelectorAll('.payment-option');

// Состояние
let currentUser = null;
let cartItems = [];
let selectedPayment = 'cash';

// Проверка инициализации
if (!supabaseClient) {
  console.error('Supabase не инициализирован!');
}

// Загрузка профиля пользователя
async function loadUserProfile() {
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (error || !session) {
      window.location.href = '/reg';
      return;
    }
    
    currentUser = session.user;
    
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (profileError) {
      console.error('Ошибка загрузки профиля:', profileError);
      if (profileName) profileName.textContent = session.user.user_metadata?.name || session.user.email || 'Без имени';
      if (profileEmail) profileEmail.textContent = session.user.email || '';
      return;
    }
    
    displayProfile(profile);
    
  } catch (err) {
    console.error('Ошибка:', err);
  }
}

// Отображение профиля
function displayProfile(profile) {
  if (profileName) profileName.textContent = profile.name || profile.full_name || 'Без имени';
  if (profileEmail) profileEmail.textContent = profile.email || '';
  if (profilePhone) profilePhone.textContent = profile.phone || 'Не указан';
}

// Загрузка корзины
async function loadCart() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
      if (cartItemsContainer) {
        cartItemsContainer.innerHTML = `
          <div class="text-center text-gray-400 py-8">
            <p>Войдите в аккаунт для просмотра корзины</p>
          </div>
        `;
      }
      return;
    }
    
    const { data: items, error } = await supabaseClient
      .from('cart_items')
      .select(`
        id,
        quantity,
        computer_id,
        custom_build_id,
        computers (
          id,
          title,
          price,
          image
        ),
        custom_builds (
          id,
          title,
          total_price
        )
      `)
      .eq('user_id', session.user.id);
    
    if (error) throw error;
    
    cartItems = items || [];
    renderCart();
    
  } catch (err) {
    console.error('Ошибка загрузки корзины:', err);
    if (cartItemsContainer) {
      cartItemsContainer.innerHTML = `
        <div class="text-center text-red-400 py-8">
          <p>Ошибка загрузки корзины</p>
        </div>
      `;
    }
  }
}

// Рендер корзины
function renderCart() {
  if (!cartItemsContainer) return;
  
  if (!cartItems || cartItems.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="text-center text-gray-400 py-8">
        <p class="text-4xl mb-2">🛒</p>
        <p>Корзина пуста</p>
        <a href="/catalog" class="text-purple-400 hover:underline text-sm">Перейти в каталог</a>
      </div>
    `;
    if (checkoutBtn) checkoutBtn.disabled = true;
    return;
  }
  
  let html = '';
  let total = 0;
  let count = 0;
  
  cartItems.forEach(item => {
    let title = 'Товар';
    let price = 0;
    let imageUrl = '/src/img/defoult.webp';
    
    if (item.computer_id && item.computers) {
      title = item.computers.title || 'Готовый ПК';
      price = item.computers.price || 0;
      imageUrl = item.computers.image || imageUrl;
    } else if (item.custom_build_id && item.custom_builds) {
      title = item.custom_builds.title || 'Сборка';
      price = item.custom_builds.total_price || 0;
    }
    
    const itemTotal = price * item.quantity;
    total += itemTotal;
    count += item.quantity;
    
    html += `
      <div class="flex gap-3 p-3 bg-gray-800 rounded-xl">
        <img
          src="${imageUrl}"
          alt="${title}"
          class="w-16 h-16 rounded-lg object-cover"
          onerror="this.src='/src/img/defoult.webp'"
        >
        <div class="flex-1">
          <p class="font-semibold text-white">${title}</p>
          <p class="text-sm text-gray-400">${item.quantity} × ${price.toLocaleString()} ₽</p>
        </div>
        <div class="font-bold text-purple-400">${itemTotal.toLocaleString()} ₽</div>
      </div>
    `;
  });
  
  cartItemsContainer.innerHTML = html;
  if (itemsCount) itemsCount.textContent = count;
  if (totalAmount) totalAmount.textContent = total.toLocaleString() + ' ₽';
  if (checkoutBtn) checkoutBtn.disabled = false;
}

// Обработка выбора способа оплаты
if (paymentOptions && paymentOptions.length > 0) {
  paymentOptions.forEach(option => {
    option.addEventListener('click', function() {
      paymentOptions.forEach(opt => opt.classList.remove('active'));
      this.classList.add('active');
      const radio = this.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        selectedPayment = radio.value;
      }
    });
  });
}

// ============================================
// ОФОРМЛЕНИЕ ЗАКАЗА (БЕЗ ТЕЛЕФОНА)
// ============================================
async function handleCheckout() {
  try {
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    
    if (sessionError || !session) {
      alert('Войдите в аккаунт для оформления заказа');
      window.location.href = '/reg';
      return;
    }
    
    if (!cartItems || cartItems.length === 0) {
      alert('Корзина пуста');
      return;
    }
    
    // Адрес самовывоза (фиксированный)
    const address = 'г. Санкт-Петербург, ул. Коллонтай, 21к1, 8 подъезд, 1 этаж';
    
    // Получаем email пользователя
    const userEmail = session.user.email || '';
    
    if (checkoutBtn) {
      checkoutBtn.disabled = true;
      checkoutBtn.innerHTML = '<span class="spinner"></span> Обработка...';
    }
    
    let totalAmount = 0;
    const orderItems = [];
    
    for (const item of cartItems) {
      let itemPrice = 0;
      let itemId = null;
      let itemType = null;
      
      if (item.computer_id && item.computers) {
        itemPrice = item.computers.price;
        itemId = item.computer_id;
        itemType = 'ready_pc';
      } else if (item.custom_build_id && item.custom_builds) {
        itemPrice = item.custom_builds.total_price;
        itemId = item.custom_build_id;
        itemType = 'custom_build';
      }
      
      totalAmount += itemPrice * item.quantity;
      
      orderItems.push({
        id: itemId,
        quantity: item.quantity,
        price: itemPrice,
        type: itemType
      });
    }
    
    // Если выбран способ оплаты картой - создаем платеж через Robokassa
    if (selectedPayment === 'card') {
      const response = await fetch('/api/robokassa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: orderItems,
          totalAmount: totalAmount,
          userId: session.user.id,
          deliveryAddress: address,
          email: userEmail,
          comment: ''
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка создания платежа');
      }
      
      window.location.href = data.url;
      
    } else {
      // === ОПЛАТА НАЛИЧНЫМИ ===
      
      // 1. Создаем заказ
      const orderData = {
        user_id: session.user.id,
        total_price: totalAmount,
        payment_method: 'cash',
        payment_status: 'unpaid',
        status: 'pending',
        delivery_address: address,
        phone: null, // Телефон не требуется
        created_at: new Date().toISOString()
      };
      
      const { data: order, error: orderError } = await supabaseClient
        .from('orders')
        .insert(orderData)
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      // 2. Создаем позиции заказа (order_items) по одной
      console.log('Создание позиций заказа для order_id:', order.id);
      
      for (const item of cartItems) {
        const orderItemData = {
          order_id: order.id,
          computer_id: item.computer_id || null,
          custom_build_id: item.custom_build_id || null,
          quantity: item.quantity,
          price: item.computers 
            ? item.computers.price 
            : item.custom_builds.total_price
        };
        
        console.log('Вставка позиции:', orderItemData);
        
        const { error: itemError } = await supabaseClient
          .from('order_items')
          .insert(orderItemData);
        
        if (itemError) {
          console.error('Ошибка вставки позиции:', itemError);
          throw itemError;
        }
      }
      
      // 3. Очищаем корзину
      const { error: clearError } = await supabaseClient
        .from('cart_items')
        .delete()
        .eq('user_id', session.user.id);
      
      if (clearError) throw clearError;
      
      // 4. Показываем сообщение об успехе
      alert('✅ Заказ успешно оформлен! Ожидайте звонка от менеджера.');
      window.location.href = '/profile';
    }
    
  } catch (err) {
    console.error('Ошибка оформления заказа:', err);
    alert('❌ Ошибка: ' + (err.message || 'Неизвестная ошибка'));
  } finally {
    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.innerHTML = 'Оформить заказ';
    }
  }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
  // Проверяем, что supabaseClient доступен
  if (typeof supabaseClient === 'undefined') {
    console.error('supabaseClient не определен! Проверьте подключение supabase.js');
    alert('Ошибка подключения к базе данных. Пожалуйста, обновите страницу.');
    return;
  }
  
  await loadUserProfile();
  await loadCart();
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', handleCheckout);
  }
});