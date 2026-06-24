// cart.js — ТОЛЬКО ДЛЯ СТРАНИЦЫ КОРЗИНЫ (cart.html)

// Кэш для корзины
let cachedCart = null
let cacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 минут


// ========== ДОБАВЛЕНИЕ ГОТОВОГО ПК В КОРЗИНУ (для catalog.html) ==========
window.addReadyPCToCart = async function(computerId) {
  try {
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession()

    if (sessionError || !session) {
      alert("Войдите в аккаунт, чтобы добавить товар в корзину")
      window.location.href = "/reg"
      return
    }

    const userId = session.user.id

    const { data: existingItem, error: checkError } = await supabaseClient
      .from("cart_items")
      .select("id, quantity")
      .eq("user_id", userId)
      .eq("computer_id", computerId)
      .maybeSingle()

    if (checkError) throw checkError

    if (existingItem) {
      const { error: updateError } = await supabaseClient
        .from("cart_items")
        .update({ quantity: existingItem.quantity + 1 })
        .eq("id", existingItem.id)

      if (updateError) throw updateError
      alert(`Товар добавлен! Теперь в корзине: ${existingItem.quantity + 1} шт.`)
    } else {
      const { error: insertError } = await supabaseClient
        .from("cart_items")
        .insert([{
          user_id: userId,
          computer_id: computerId,
          quantity: 1
        }])

      if (insertError) throw insertError
      alert("Товар добавлен в корзину!")
    }

    cachedCart = null
    if (typeof loadCart === 'function') loadCart()
    updateCartCount()

  } catch (err) {
    console.error("Ошибка добавления в корзину:", err)
    alert("Ошибка: " + err.message)
  }
}

async function loadCart() {
  try {
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession()

    if (sessionError || !session) {
      const localCart = JSON.parse(localStorage.getItem('pcCart') || '[]');
      if (typeof renderLocalCart === 'function') {
        renderLocalCart(localCart);
      }
      return
    }

    if (cachedCart && (Date.now() - cacheTime) < CACHE_DURATION) {
      renderCart(cachedCart)
      return
    }

    const { data, error } = await supabaseClient
      .from("cart_items")
      .select(`
        id,
        quantity,
        computer_id,
        custom_build_id,
        computers (
          id,
          title,
          price,
          image,
          cpu,
          gpu,
          ram,
          storage,
          slug
        ),
        custom_builds (
          id,
          title,
          total_price,
          custom_build_items (
            component_id,
            components (
              id,
              title,
              type,
              price
            )
          )
        )
      `)
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Ошибка загрузки корзины:", error);
      throw error;
    }

    console.log("📦 Данные корзины:", data);
    cachedCart = data
    cacheTime = Date.now()
    renderCart(data)

  } catch (err) {
    console.error("Ошибка загрузки корзины:", err)
    showError()
  }
}

// ========== РЕНДЕР КОРЗИНЫ (БД) - АДАПТИРОВАННЫЙ ==========
function renderCart(data) {
  const container = document.getElementById("cartContainer")
  if (!container) return

  if (!data || data.length === 0) {
    showEmptyCart(container)
    return
  }

  let total = 0
  container.innerHTML = ''

  data.forEach(item => {
    if (item.custom_build_id && item.custom_builds) {
      const build = item.custom_builds
      const components = build.custom_build_items || []
      const itemTotal = (build.total_price || 0) * (item.quantity || 1)
      total += itemTotal
      container.appendChild(createCustomBuildCard(item, build, components, itemTotal))
      
    } else if (item.computer_id && item.computers) {
      const pc = item.computers
      const itemTotal = (pc.price || 0) * (item.quantity || 1)
      total += itemTotal
      container.appendChild(createComputerCard(item, pc, itemTotal))
    }
  })

  // Блок с итогом и кнопкой оформления
  const totalDiv = document.createElement('div')
  totalDiv.className = 'mt-8 sm:mt-12 text-center sm:text-right'
  totalDiv.innerHTML = `
    <h2 class="text-2xl sm:text-3xl md:text-4xl mb-4 sm:mb-6 cart-total text-white">Итого: ${total.toLocaleString("ru-RU")} ₽</h2>
    <button onclick="checkout()" 
            class="checkout-btn w-full sm:w-auto">
      Оформить заказ
    </button>
  `
  container.appendChild(totalDiv)
}
  

// ========== РЕНДЕР ЛОКАЛЬНОЙ КОРЗИНЫ - АДАПТИРОВАННЫЙ ==========
function renderLocalCart(localCart) {
  const container = document.getElementById("cartContainer")
  if (!container) return

  if (!localCart || localCart.length === 0) {
    showEmptyCart(container)
    return
  }

  let total = 0
  container.innerHTML = ''

  localCart.forEach(item => {
    total += item.totalPrice || 0
    
    const div = document.createElement('div')
    div.className = 'bg-[#1a1b1f] rounded-2xl sm:rounded-3xl p-4 sm:p-6 w-full mb-4 sm:mb-6'
    div.innerHTML = `
      <div class="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
<div class="w-full lg:w-48 h-40 sm:h-48 lg:h-52 bg-gray-800 rounded-xl sm:rounded-2xl flex items-center justify-center relative overflow-hidden">
  <img src="/src/img/Pc/defoultPC.webp" class="w-full h-full object-cover">
</div>
        
        <div class="flex-1">
          <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 sm:gap-6">
            <div>
              <div class="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <h2 class="text-xl sm:text-2xl md:text-3xl cart-item-title">${escapeHtml(item.name)}</h2>
                <span class="bg-purple-600 text-[10px] sm:text-xs px-2 sm:px-3 py-1 rounded-full">Кастом</span>
                ${!item.isInDB ? '<span class="bg-yellow-600 text-[10px] sm:text-xs px-2 sm:px-3 py-1 rounded-full">Локально</span>' : ''}
              </div>
              <p class="text-gray-400 text-base sm:text-lg mb-4 sm:mb-6">${(item.totalPrice || 0).toLocaleString("ru-RU")} ₽</p>
              <p class="text-gray-500 text-xs sm:text-sm">Войдите в аккаунт, чтобы сохранить сборку в облаке</p>
            </div>

            <div class="flex flex-row lg:flex-col items-center lg:items-end gap-3 sm:gap-4 w-full lg:w-auto">
              <button onclick="removeLocalItem(${item.id})" 
                      class="bg-red-600 px-4 sm:px-6 py-2 sm:py-3 rounded-2xl hover:bg-red-700 transition text-sm sm:text-base w-full lg:w-auto">
                  Удалить
              </button>
            </div>
          </div>
        </div>
      </div>
    `
    container.appendChild(div)
  })

  const totalDiv = document.createElement('div')
  totalDiv.className = 'mt-8 sm:mt-12 text-center sm:text-right'
  totalDiv.innerHTML = `
    <h2 class="text-2xl sm:text-3xl md:text-4xl mb-4 sm:mb-6 cart-total">Итого: ${total.toLocaleString("ru-RU")} ₽</h2>
    <p class="text-gray-500 text-sm sm:text-base mb-4">Войдите в аккаунт для оформления заказа</p>
    <a href="/reg" class="bg-purple-600 px-6 sm:px-10 py-3 sm:py-4 rounded-2xl text-base sm:text-xl hover:bg-purple-700 transition inline-block w-full sm:w-auto text-center">
      Войти и оформить
    </a>
  `
  container.appendChild(totalDiv)
}

// ========== КАРТОЧКИ - АДАПТИРОВАННЫЕ ==========
function createComputerCard(item, pc, itemTotal) {
  const div = document.createElement('div')
  div.className = 'bg-[#1a1b1f] border border-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 w-full mb-4 sm:mb-6'
  div.innerHTML = `
    <div class="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
<img src="${pc.image || '/src/img/Pc/defoultPC.webp'}" 
     loading="lazy"
     class="w-full lg:w-48 h-40 sm:h-48 lg:h-52 object-contain rounded-xl sm:rounded-2xl"
     onerror="this.src='/src/img/Pc/defoultPC.webp'">
      
      <div class="flex-1">
        <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 sm:gap-6">
          <div class="w-full">
            <h2 class="text-xl sm:text-2xl md:text-3xl mb-2 sm:mb-3 cart-item-title">${escapeHtml(pc.title)}</h2>
            <p class="text-gray-400 text-base sm:text-lg mb-4 sm:mb-6">${itemTotal.toLocaleString("ru-RU")} ₽</p>
            
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
              <div class="bg-[#23252b] p-3 sm:p-4 rounded-xl">
                <p class="text-gray-500 text-[10px] sm:text-sm mb-0.5 sm:mb-1">Процессор</p>
                <p class="text-[11px] sm:text-sm">${escapeHtml(pc.cpu || '—')}</p>
              </div>
              <div class="bg-[#23252b] p-3 sm:p-4 rounded-xl">
                <p class="text-gray-500 text-[10px] sm:text-sm mb-0.5 sm:mb-1">Видеокарта</p>
                <p class="text-[11px] sm:text-sm">${escapeHtml(pc.gpu || '—')}</p>
              </div>
              <div class="bg-[#23252b] p-3 sm:p-4 rounded-xl">
                <p class="text-gray-500 text-[10px] sm:text-sm mb-0.5 sm:mb-1">Оперативная память</p>
                <p class="text-[11px] sm:text-sm">${escapeHtml(pc.ram || '—')}</p>
              </div>
              <div class="bg-[#23252b] p-3 sm:p-4 rounded-xl">
                <p class="text-gray-500 text-[10px] sm:text-sm mb-0.5 sm:mb-1">Накопитель</p>
                <p class="text-[11px] sm:text-sm">${escapeHtml(pc.storage || '—')}</p>
              </div>
            </div>
          </div>

         <div class="flex flex-row lg:flex-col items-center lg:items-end gap-2 sm:gap-3 w-full lg:w-auto">
  <div class="flex items-center bg-[#23252b] rounded-2xl overflow-hidden flex-shrink-0">
    <button onclick="changeQuantity('${item.id}', -1)" 
            class="px-3 sm:px-4 py-1.5 sm:py-2 hover:bg-[#2e3138] transition text-base sm:text-lg">−</button>
    <div class="px-3 sm:px-5 text-sm sm:text-base min-w-[30px] text-center">${item.quantity}</div>
    <button onclick="changeQuantity('${item.id}', 1)" 
            class="px-3 sm:px-4 py-1.5 sm:py-2 hover:bg-[#2e3138] transition text-base sm:text-lg">+</button>
  </div>
  <button onclick="removeFromCart('${item.id}')" 
          class="bg-red-600 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl hover:bg-red-700 transition text-xs sm:text-sm flex-shrink-0">
     Удалить
  </button>
</div>
        </div>
      </div>
    </div>
  `
  return div
}

function createCustomBuildCard(item, build, components, itemTotal) {
  const div = document.createElement('div')
  div.className = 'bg-[#1a1b1f] border border-purple-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 w-full mb-4 sm:mb-6'
  
  const specsHtml = components.map(bi => {
    const comp = bi.components
    if (!comp) return ''
    return `
      <div class="bg-[#23252b] p-3 sm:p-4 rounded-xl">
        <p class="text-gray-500 text-[10px] sm:text-sm mb-0.5 sm:mb-1">${escapeHtml(comp.type)}</p>
        <p class="text-[11px] sm:text-sm">${escapeHtml(comp.title)}</p>
      </div>
    `
  }).join('')

  div.innerHTML = `
    <div class="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
<div class="w-full lg:w-48 h-40 sm:h-48 lg:h-52 bg-gray-800 rounded-xl sm:rounded-2xl flex items-center justify-center relative overflow-hidden">
  <img src="/src/img/Pc/defoultPC.webp" class="w-full h-full object-cover">
</div>
      
      <div class="flex-1">
        <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 sm:gap-6">
          <div class="w-full">
            <div class="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <h2 class="text-xl sm:text-2xl md:text-3xl cart-item-title">${escapeHtml(build.title)}</h2>
              <span class="bg-purple-600 text-[10px] sm:text-xs px-2 sm:px-3 py-1 rounded-full">Кастом</span>
            </div>
            <p class="text-gray-400 text-base sm:text-lg mb-4 sm:mb-6">${itemTotal.toLocaleString("ru-RU")} ₽</p>
            
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
              ${specsHtml}
            </div>
          </div>

<div class="flex flex-row lg:flex-col items-center lg:items-end gap-2 sm:gap-3 w-full lg:w-auto">
  <div class="flex items-center bg-[#23252b] rounded-2xl overflow-hidden flex-shrink-0">
    <button onclick="changeQuantity('${item.id}', -1)" 
            class="px-3 sm:px-4 py-1.5 sm:py-2 hover:bg-[#2e3138] transition text-base sm:text-lg">−</button>
    <div class="px-3 sm:px-5 text-sm sm:text-base min-w-[30px] text-center">${item.quantity}</div>
    <button onclick="changeQuantity('${item.id}', 1)" 
            class="px-3 sm:px-4 py-1.5 sm:py-2 hover:bg-[#2e3138] transition text-base sm:text-lg">+</button>
  </div>
  <button onclick="removeFromCart('${item.id}')" 
          class="bg-red-600 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl hover:bg-red-700 transition text-xs sm:text-sm flex-shrink-0">
     Удалить
  </button>
</div>
        </div>
      </div>
    </div>
  `
  return div
}

// ========== ДЕЙСТВИЯ С КОРЗИНОЙ ==========
window.changeQuantity = async function(id, delta) {
  try {
    const { data: item, error: getError } = await supabaseClient
      .from("cart_items")
      .select("*")
      .eq("id", id)
      .single()

    if (getError || !item) return

    const newQuantity = item.quantity + delta

    if (newQuantity <= 0) {
      await removeFromCart(id)
    } else {
      const { error: updateError } = await supabaseClient
        .from("cart_items")
        .update({ quantity: newQuantity })
        .eq("id", id)

      if (updateError) throw updateError
    }

    cachedCart = null
    loadCart()
    updateCartCount()

  } catch (err) {
    console.error("Ошибка изменения количества:", err)
  }
}

window.removeFromCart = async function(id) {
  try {
    const { error } = await supabaseClient
      .from("cart_items")
      .delete()
      .eq("id", id)

    if (error) throw error

    cachedCart = null
    loadCart()
    updateCartCount()

  } catch (err) {
    console.error("Ошибка удаления:", err)
  }
}

window.removeLocalItem = function(id) {
  const cart = JSON.parse(localStorage.getItem('pcCart') || '[]');
  const updatedCart = cart.filter(item => item.id !== id);
  localStorage.setItem('pcCart', JSON.stringify(updatedCart));
  renderLocalCart(updatedCart);
}
// ========== ОФОРМЛЕНИЕ ЗАКАЗА - ПЕРЕХОД НА СТРАНИЦУ ОПЛАТЫ ==========
window.checkout = async function() {
  try {
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    
    if (sessionError || !session) {
      alert('Войдите в аккаунт для оформления заказа');
      window.location.href = '/reg';
      return;
    }
    
    // Проверяем, есть ли товары в корзине
    const { data: cartItems, error: cartError } = await supabaseClient
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', session.user.id);
    
    if (cartError) throw cartError;
    
    if (!cartItems || cartItems.length === 0) {
      alert('Корзина пуста');
      return;
    }
    
    // Сохраняем данные в localStorage для передачи на страницу оплаты
    localStorage.setItem('checkout_user_id', session.user.id);
    localStorage.setItem('checkout_timestamp', Date.now().toString());
    
    // Перенаправляем на страницу оформления заказа
    window.location.href = '/opl.html';
    
  } catch (err) {
    console.error('Ошибка оформления заказа:', err);
    alert('Ошибка: ' + err.message);
  }
};

/* ========== ОФОРМЛЕНИЕ ЗАКАЗА ЧЕРЕЗ ROBOKASSA ==========
window.checkout = async function() {
  try {
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    
    if (sessionError || !session) {
      alert('Войдите в аккаунт для оформления заказа');
      window.location.href = '/reg';
      return;
    }
    
    const deliveryAddress = prompt('Введите адрес доставки:');
    if (!deliveryAddress) {
      alert('Адрес доставки обязателен');
      return;
    }
    
    const phone = prompt('Введите номер телефона для связи:');
    if (!phone) {
      alert('Номер телефона обязателен');
      return;
    }
    
    const checkoutBtn = document.querySelector('button[onclick="checkout()"]');
    const originalText = checkoutBtn?.innerHTML;
    if (checkoutBtn) {
      checkoutBtn.innerHTML = '⏳ Обработка...';
      checkoutBtn.disabled = true;
    }
    
    const { data: cartItems, error: cartError } = await supabaseClient
      .from('cart_items')
      .select(`
        id,
        quantity,
        computer_id,
        custom_build_id,
        computers (
          id,
          title,
          price
        ),
        custom_builds (
          id,
          title,
          total_price
        )
      `)
      .eq('user_id', session.user.id);
    
    if (cartError) throw cartError;
    
    if (!cartItems || cartItems.length === 0) {
      alert('Корзина пуста');
      if (checkoutBtn) {
        checkoutBtn.innerHTML = originalText;
        checkoutBtn.disabled = false;
      }
      return;
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
    
    const response = await fetch('/api/robokassa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: orderItems,
        totalAmount: totalAmount,
        userId: session.user.id,
        deliveryAddress: deliveryAddress,
        phone: phone
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Ошибка создания платежа');
    }
    
    window.location.href = data.url;
    
  } catch (err) {
    console.error('Ошибка оформления заказа:', err);
    alert('Ошибка: ' + err.message);
    
    const checkoutBtn = document.querySelector('button[onclick="checkout()"]');
    if (checkoutBtn) {
      checkoutBtn.innerHTML = 'Оформить заказ';
      checkoutBtn.disabled = false;
    }
  }
};
*/
// ========== ВСПОМОГАТЕЛЬНЫЕ - АДАПТИРОВАННЫЕ ==========
function showEmptyCart(container) {
  container.innerHTML = `
    <div class="text-center py-12 sm:py-16">
      <h3 class="text-lg sm:text-xl text-gray-400 mb-2">Корзина пуста</h3>
      <p class="text-gray-500 text-sm sm:text-base mb-6">Добавьте товары, чтобы оформить заказ</p>
      <a href="/catalog" class="bg-purple-600 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:bg-purple-700 transition inline-block text-sm sm:text-base">
        Перейти в каталог
      </a>
    </div>
  `
}

function showError() {
  const container = document.getElementById("cartContainer")
  if (container) {
    container.innerHTML = `
      <div class="text-center py-12 sm:py-16 text-red-400 text-sm sm:text-base">
        Ошибка загрузки корзины<br>
        <button onclick="location.reload()" class="mt-4 text-purple-400 underline">Повторить</button>
      </div>
    `
  }
}

async function updateCartCount() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession()
    if (!session) return

    const { data: items, error } = await supabaseClient
      .from("cart_items")
      .select("quantity")
      .eq("user_id", session.user.id)

    if (error) throw error

    const count = items.reduce((sum, item) => sum + (item.quantity || 0), 0)
    
    const cartCountEl = document.getElementById("cartCount")
    if (cartCountEl) {
      cartCountEl.textContent = count
      cartCountEl.classList.toggle("hidden", count === 0)
    }
  } catch (err) {
    console.error("Ошибка обновления счетчика:", err)
  }
}

function escapeHtml(str) {
  if (!str) return '—'
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ========== ДЛЯ СОВМЕСТИМОСТИ С product.html ==========
window.addToCart = function(computerId) {
  return addReadyPCToCart(computerId);
}

// ========== ЗАПУСК ==========
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    loadCart()
    updateCartCount()
  })
} else {
  loadCart()
  updateCartCount()
}