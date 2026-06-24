// DOM элементы
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const profilePhone = document.getElementById('profilePhone');
const cartItemsContainer = document.getElementById('cartItems');
const itemsCount = document.getElementById('itemsCount');
const totalAmount = document.getElementById('totalAmount');
const checkoutBtn = document.getElementById('checkoutBtn');
const deliveryAddress = document.getElementById('deliveryAddress');
const deliveryPhone = document.getElementById('deliveryPhone');
const deliveryComment = document.getElementById('deliveryComment');
const paymentOptions = document.querySelectorAll('.payment-option');

// Состояние
let currentUser = null;
let cartItems = [];
let selectedPayment = 'cash';



// Проверка инициализации
if (!supabaseClient) {
  console.error('Supabase не инициализирован!');
}

// Загрузка профиля пользователя - ИСПРАВЛЕНО
async function loadUserProfile() {
  try {
    // Используем supabaseClient вместо supabase
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
  
  if (profile.phone && deliveryPhone) {
    deliveryPhone.value = profile.phone;
  }
}

// Загрузка корзины - ИСПРАВЛЕНО
async function loadCart() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
      cartItemsContainer.innerHTML = `
        <div class="text-center text-gray-400 py-8">
          <p>Войдите в аккаунт для просмотра корзины</p>
        </div>
      `;
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
          image_url
        ),
        custom_builds (
          id,
          title,
          total_price,
          image_url
        )
      `)
      .eq('user_id', session.user.id);
    
    if (error) throw error;
    
    cartItems = items || [];
    renderCart();
    
  } catch (err) {
    console.error('Ошибка загрузки корзины:', err);
    cartItemsContainer.innerHTML = `
      <div class="text-center text-red-400 py-8">
        <p>Ошибка загрузки корзины</p>
      </div>
    `;
  }
}

// Рендер корзины
function renderCart() {
  if (!cartItems || cartItems.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="text-center text-gray-400 py-8">
        <p class="text-4xl mb-2">🛒</p>
        <p>Корзина пуста</p>
        <a href="/catalog" class="text-purple-400 hover:underline text-sm">Перейти в каталог</a>
      </div>
    `;
    checkoutBtn.disabled = true;
    return;
  }
  
  let html = '';
  let total = 0;
  let count = 0;
  
  cartItems.forEach(item => {
    let title = 'Товар';
    let price = 0;
    let imageUrl = '/src/img/default-product.jpg';
    
    if (item.computer_id && item.computers) {
      title = item.computers.title || 'Готовый ПК';
      price = item.computers.price || 0;
      imageUrl = item.computers.image_url || imageUrl;
    } else if (item.custom_build_id && item.custom_builds) {
      title = item.custom_builds.title || 'Сборка';
      price = item.custom_builds.total_price || 0;
      imageUrl = item.custom_builds.image_url || imageUrl;
    }
    
    const itemTotal = price * item.quantity;
    total += itemTotal;
    count += item.quantity;
    
    html += `
      <div class="flex gap-3 items-center p-2 bg-gray-900/50 rounded-lg">
        <img src="${imageUrl}" alt="${title}" class="w-12 h-12 object-cover rounded-lg flex-shrink-0">
        <div class="flex-1 min-w-0">
          <p class="text-sm font-bold truncate">${title}</p>
          <p class="text-xs text-gray-400">${item.quantity} × ${price.toLocaleString()} ₽</p>
        </div>
        <p class="text-sm font-bold text-purple-400 whitespace-nowrap">${itemTotal.toLocaleString()} ₽</p>
      </div>
    `;
  });
  
  cartItemsContainer.innerHTML = html;
  itemsCount.textContent = count;
  totalAmount.textContent = total.toLocaleString() + ' ₽';
  checkoutBtn.disabled = false;
}

// Обработка выбора способа оплаты
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

// Оформление заказа - ИСПРАВЛЕНО
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
    
    let address = deliveryAddress.value.trim();
    if (!address) {
      address = 'г. Санкт-Петербург, ул. Коллонтай, 21к1, 8 подъезд, 1 этаж';
    }
    
    let phone = deliveryPhone.value.trim();
    if (!phone) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('phone')
        .eq('id', session.user.id)
        .single();
      
      if (profile?.phone) {
        phone = profile.phone;
      } else {
        alert('Укажите номер телефона для связи');
        deliveryPhone.focus();
        return;
      }
    }
    
    checkoutBtn.disabled = true;
    checkoutBtn.innerHTML = '<span class="spinner"></span> Обработка...';
    
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
          phone: phone,
          comment: deliveryComment.value || ''
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка создания платежа');
      }
      
      window.location.href = data.url;
      
    } else {
      const orderData = {
        user_id: session.user.id,
        items: orderItems,
        total_amount: totalAmount,
        delivery_address: address,
        phone: phone,
        comment: deliveryComment.value || '',
        payment_method: 'cash',
        status: 'pending',
        created_at: new Date().toISOString()
      };
      
      const { data: order, error: orderError } = await supabaseClient
        .from('orders')
        .insert(orderData)
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      const { error: clearError } = await supabaseClient
        .from('cart_items')
        .delete()
        .eq('user_id', session.user.id);
      
      if (clearError) throw clearError;
      
      alert('Заказ успешно оформлен! Ожидайте звонка от менеджера.');
      window.location.href = '/profile';
    }
    
  } catch (err) {
    console.error('Ошибка оформления заказа:', err);
    alert('Ошибка: ' + (err.message || 'Неизвестная ошибка'));
  } finally {
    checkoutBtn.disabled = false;
    checkoutBtn.innerHTML = 'Оформить заказ';
  }
}

// Инициализация
document.addEventListener('DOMContentLoaded', async function() {
  // Проверяем, что supabaseClient доступен
  if (typeof supabaseClient === 'undefined') {
    console.error('supabaseClient не определен! Проверьте подключение supabase.js');
    alert('Ошибка подключения к базе данных. Пожалуйста, обновите страницу.');
    return;
  }
  
  await loadUserProfile();
  await loadCart();
  checkoutBtn.addEventListener('click', handleCheckout);
});