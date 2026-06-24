// cart.js — ТОЛЬКО ДЛЯ СТРАНИЦЫ КОРЗИНЫ (cart.html)

// Кэш для корзины
let cachedCart = null
let cacheTime = 0


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

    // ИСПРАВЛЕННЫЙ ЗАПРОС (убрана лишняя запятая в конце select)
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

// ========== РЕНДЕР КОРЗИНЫ (БД) ==========
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

  const totalDiv = document.createElement('div')
  totalDiv.className = 'mt-12 text-right'
  totalDiv.innerHTML = `
    <h2 class="text-4xl mb-6">Итого: ${total.toLocaleString("ru-RU")} ₽</h2>
    <button onclick="checkout()" 
            class="bg-purple-600 px-10 py-4 rounded-2xl text-xl hover:bg-purple-700 transition">
      Оформить заказ
    </button>
  `
  container.appendChild(totalDiv)
}

// ========== РЕНДЕР ЛОКАЛЬНОЙ КОРЗИНЫ ==========
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
div.className = 'bg-[#1a1b1f] rounded-3xl p-6 w-full mb-6'
div.innerHTML = `
<div class="flex flex-col lg:flex-row gap-8">
    <div class="w-full lg:w-48 h-52 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center relative overflow-hidden">
        <img 
            src="/src/img/mainView/defoultPC.webp" 
            alt="Кастомная сборка" 
            class="w-full h-full object-cover"
        >
        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <p class="text-white font-medium text-center">Кастомная сборка</p>
        </div>
    </div>
        
    <div class="flex-1">
        <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div>
                <div class="flex items-center gap-3 mb-3">
                    <h2 class="text-3xl">${escapeHtml(item.name)}</h2>
                    <span class="bg-purple-600 text-xs px-3 py-1 rounded-full">Кастом</span>
                    ${!item.isInDB ? '<span class="bg-yellow-600 text-xs px-3 py-1 rounded-full">Локально</span>' : ''}
                </div>
                <p class="text-gray-400 text-lg mb-6">${(item.totalPrice || 0).toLocaleString("ru-RU")} ₽</p>
                <p class="text-gray-500 text-sm">Войдите в аккаунт, чтобы сохранить сборку в облаке</p>
            </div>

            <div class="flex flex-col items-end gap-4">
                <button onclick="removeLocalItem(${item.id})" 
                        class="bg-red-600 px-6 py-3 rounded-2xl hover:bg-red-700 transition">
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
  totalDiv.className = 'mt-12 text-right'
  totalDiv.innerHTML = `
    <h2 class="text-4xl mb-6">Итого: ${total.toLocaleString("ru-RU")} ₽</h2>
    <p class="text-gray-500 mb-4">Войдите в аккаунт для оформления заказа</p>
    <a href="/reg" class="bg-purple-600 px-10 py-4 rounded-2xl text-xl hover:bg-purple-700 transition inline-block">
      Войти и оформить
    </a>
  `
  container.appendChild(totalDiv)
}

// ========== КАРТОЧКИ ==========
function createComputerCard(item, pc, itemTotal) {
  const div = document.createElement('div')
  div.className = 'bg-[#1a1b1f] border border-gray-800 rounded-3xl p-6 w-full mb-6'
  div.innerHTML = `
    <div class="flex flex-col lg:flex-row gap-8">
      <img src="${pc.image || '/src/img/placeholder.webp'}" 
           loading="lazy"
           class="w-full lg:w-48 h-52 object-cover rounded-2xl"
           onerror="this.src='/src/img/placeholder.webp'">
      
      <div class="flex-1">
        <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div>
            <h2 class="text-3xl mb-3">${escapeHtml(pc.title)}</h2>
            <p class="text-gray-400 text-lg mb-6">${itemTotal.toLocaleString("ru-RU")} ₽</p>
            
            <div class="grid sm:grid-cols-3 gap-4">
              <div class="bg-[#23252b] p-4 rounded-xl">
                <p class="text-gray-500 text-sm mb-1">CPU</p>
                <p class="text-sm">${escapeHtml(pc.cpu || '—')}</p>
              </div>
              <div class="bg-[#23252b] p-4 rounded-xl">
                <p class="text-gray-500 text-sm mb-1">GPU</p>
                <p class="text-sm">${escapeHtml(pc.gpu || '—')}</p>
              </div>
              <div class="bg-[#23252b] p-4 rounded-xl">
                <p class="text-gray-500 text-sm mb-1">RAM</p>
                <p class="text-sm">${escapeHtml(pc.ram || '—')}</p>
              </div>
            </div>
          </div>

          <div class="flex flex-col items-end gap-4">
            <div class="flex items-center bg-[#23252b] rounded-2xl overflow-hidden">
              <button onclick="changeQuantity('${item.id}', -1)" 
                      class="px-5 py-3 hover:bg-[#2e3138] transition text-xl">−</button>
              <div class="px-6 text-lg">${item.quantity}</div>
              <button onclick="changeQuantity('${item.id}', 1)" 
                      class="px-5 py-3 hover:bg-[#2e3138] transition text-xl">+</button>
            </div>
            <button onclick="removeFromCart('${item.id}')" 
                    class="bg-red-600 px-6 py-3 rounded-2xl hover:bg-red-700 transition">
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
  div.className = 'bg-[#1a1b1f] border border-purple-800 rounded-3xl p-6 w-full mb-6'
  
  const specsHtml = components.map(bi => {
    const comp = bi.components
    if (!comp) return ''
    return `
      <div class="bg-[#23252b] p-4 rounded-xl">
        <p class="text-gray-500 text-sm mb-1">${escapeHtml(comp.type)}</p>
        <p class="text-sm">${escapeHtml(comp.title)}</p>
      </div>
    `
  }).join('')

  div.innerHTML = `
<div class="flex flex-col lg:flex-row gap-8">
    <div class="w-full lg:w-48 h-52 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center relative overflow-hidden">
        <img 
            src="/src/img/mainView/defoultPC.webp" 
            alt="Кастомная сборка" 
            class="w-full h-full object-cover"
        >
        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <p class="text-white font-medium text-center">Кастомная сборка</p>
        </div>
    </div>
      
      <div class="flex-1">
        <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div>
            <div class="flex items-center gap-3 mb-3">
              <h2 class="text-3xl">${escapeHtml(build.title)}</h2>
              <span class="bg-purple-600 text-xs px-3 py-1 rounded-full">Кастом</span>
            </div>
            <p class="text-gray-400 text-lg mb-6">${itemTotal.toLocaleString("ru-RU")} ₽</p>
            
            <div class="grid sm:grid-cols-3 gap-4">
              ${specsHtml}
            </div>
          </div>

          <div class="flex flex-col items-end gap-4">
            <div class="flex items-center bg-[#23252b] rounded-2xl overflow-hidden">
              <button onclick="changeQuantity('${item.id}', -1)" 
                      class="px-5 py-3 hover:bg-[#2e3138] transition text-xl">−</button>
              <div class="px-6 text-lg">${item.quantity}</div>
              <button onclick="changeQuantity('${item.id}', 1)" 
                      class="px-5 py-3 hover:bg-[#2e3138] transition text-xl">+</button>
            </div>
            <button onclick="removeFromCart('${item.id}')" 
                    class="bg-red-600 px-6 py-3 rounded-2xl hover:bg-red-700 transition">
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

// ========== ОФОРМЛЕНИЕ ЗАКАЗА ЧЕРЕЗ ROBOKASSA ==========
window.checkout = async function() {
  try {
    // Проверяем авторизацию
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    
    if (sessionError || !session) {
      alert('Войдите в аккаунт для оформления заказа');
      window.location.href = '/reg';
      return;
    }
    
    // Собираем данные доставки (можно через модальное окно)
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
    
    // Показываем индикатор загрузки
    const checkoutBtn = document.querySelector('button[onclick="checkout()"]');
    const originalText = checkoutBtn?.innerHTML;
    if (checkoutBtn) {
      checkoutBtn.innerHTML = '⏳ Обработка...';
      checkoutBtn.disabled = true;
    }
    
    // Получаем текущую корзину из БД
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
    
    // Формируем данные для заказа
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
    
    // Создаём платёж через API
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
    
    // Перенаправляем на Robokassa
    window.location.href = data.url;
    
  } catch (err) {
    console.error('Ошибка оформления заказа:', err);
    alert('Ошибка: ' + err.message);
    
    // Восстанавливаем кнопку
    const checkoutBtn = document.querySelector('button[onclick="checkout()"]');
    if (checkoutBtn) {
      checkoutBtn.innerHTML = 'Оформить заказ';
      checkoutBtn.disabled = false;
    }
  }
};

// ========== ВСПОМОГАТЕЛЬНЫЕ ==========
function showEmptyCart(container) {
  container.innerHTML = `
    <div class="text-center py-16">
      <div class="text-6xl mb-4">🛒</div>
      <h3 class="text-xl text-gray-400 mb-2">Корзина пуста</h3>
      <p class="text-gray-500 mb-6">Добавьте товары, чтобы оформить заказ</p>
      <a href="/catalog" class="bg-purple-600 px-6 py-3 rounded-xl hover:bg-purple-700 transition inline-block">
        Перейти в каталог
      </a>
    </div>
  `
}

function showError() {
  const container = document.getElementById("cartContainer")
  if (container) {
    container.innerHTML = `
      <div class="text-center py-16 text-red-400">
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