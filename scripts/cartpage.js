// cart.js - полная оптимизированная версия

// Кэш для корзины
let cachedCart = null
let cacheTime = 0
const CACHE_DURATION = 30 * 1000 // 30 секунд

// ========== ДОБАВЛЕНИЕ В КОРЗИНУ ==========
window.addToCart = async function(computerId) {
  try {
    //  Используем getSession вместо getUser (быстрее)
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession()

    if (sessionError || !session) {
      alert("Войдите в аккаунт, чтобы добавить товар в корзину")
      window.location.href = "/reg"
      return
    }

    const userId = session.user.id

    // Проверяем, есть ли уже товар
    const { data: existingItem, error: checkError } = await supabaseClient
      .from("cart_items")
      .select("id, quantity")
      .eq("user_id", userId)
      .eq("computer_id", computerId)
      .maybeSingle()

    if (checkError) throw checkError

    if (existingItem) {
      // Увеличиваем количество
      const { error: updateError } = await supabaseClient
        .from("cart_items")
        .update({ quantity: existingItem.quantity + 1 })
        .eq("id", existingItem.id)

      if (updateError) throw updateError
      alert(`Товар добавлен! Теперь в корзине: ${existingItem.quantity + 1} шт.`)
    } else {
      // Добавляем новый товар
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

    // Очищаем кэш и обновляем корзину (если открыта)
    cachedCart = null
    if (typeof loadCart === 'function') {
      loadCart()
    }
    updateCartCount()

  } catch (err) {
    console.error("Ошибка добавления в корзину:", err)
    alert("Ошибка: " + err.message)
  }
}

// ========== ЗАГРУЗКА КОРЗИНЫ ==========
async function loadCart() {
  try {
    // Используем getSession вместо getUser
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession()

    if (sessionError || !session) {
      location.href = "/reg"
      return
    }

    // Проверяем кэш
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
        )
      `)
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })

    if (error) throw error

    cachedCart = data
    cacheTime = Date.now()
    renderCart(data)

  } catch (err) {
    console.error("Ошибка загрузки корзины:", err)
    showError()
  }
}

// ========== РЕНДЕР КОРЗИНЫ ==========
function renderCart(data) {
  const container = document.getElementById("cartContainer")
  if (!container) return

  if (!data || data.length === 0) {
    showEmptyCart(container)
    return
  }

  let total = 0
  const fragment = document.createDocumentFragment()

  data.forEach(item => {
    const pc = item.computers
    if (!pc) return

    const itemTotal = pc.price * item.quantity
    total += itemTotal

    const div = document.createElement('div')
    div.className = 'bg-[#1a1b1f] border border-gray-800 rounded-3xl p-6 w-full'
    div.innerHTML = `
      <div class="flex flex-col lg:flex-row gap-8">
        <!-- IMAGE -->
        <img src="${pc.image || '/src/img/placeholder.webp'}" 
             loading="lazy"
             class="w-full lg:w-48 h-52 object-cover rounded-2xl"
             onerror="this.src='/src/img/placeholder.webp'">
        
        <!-- INFO -->
        <div class="flex-1">
          <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div>
              <h2 class="text-3xl mb-3">${escapeHtml(pc.title)}</h2>
              <p class="text-gray-400 text-lg mb-6">${pc.price.toLocaleString("ru-RU")} ₽</p>
              
              <!-- SPECS -->
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

            <!-- RIGHT -->
            <div class="flex flex-col items-end gap-4">
              <!-- QUANTITY -->
              <div class="flex items-center bg-[#23252b] rounded-2xl overflow-hidden">
                <button onclick="changeQuantity('${item.id}', -1)" 
                        class="px-5 py-3 hover:bg-[#2e3138] transition text-xl">
                  −
                </button>
                <div class="px-6 text-lg">${item.quantity}</div>
                <button onclick="changeQuantity('${item.id}', 1)" 
                        class="px-5 py-3 hover:bg-[#2e3138] transition text-xl">
                  +
                </button>
              </div>
              <!-- DELETE -->
              <button onclick="removeFromCart('${item.id}')" 
                      class="bg-red-600 px-6 py-3 rounded-2xl hover:bg-red-700 transition">
                 Удалить
              </button>
            </div>
          </div>
        </div>
      </div>
    `
    fragment.appendChild(div)
  })

  container.innerHTML = ''
  container.appendChild(fragment)

  // Добавляем итоговую сумму
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

function showEmptyCart(container) {
  container.innerHTML = `
    <div class="text-center py-16">
      <div class="text-6xl mb-4"></div>
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

// ========== ИЗМЕНЕНИЕ КОЛИЧЕСТВА ==========
window.changeQuantity = async function(id, delta) {
  try {
    // Получаем текущий item
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

    // Очищаем кэш и обновляем
    cachedCart = null
    loadCart()
    updateCartCount()

  } catch (err) {
    console.error("Ошибка изменения количества:", err)
    alert("Ошибка: " + err.message)
  }
}

// ========== УДАЛЕНИЕ ИЗ КОРЗИНЫ ==========
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
    alert("Ошибка удаления: " + err.message)
  }
}

// ========== ОФОРМЛЕНИЕ ЗАКАЗА ==========
window.checkout = async function() {
  const { data: { session } } = await supabaseClient.auth.getSession()
  
  if (!session) {
    alert("Войдите в аккаунт для оформления заказа")
    window.location.href = "/reg"
    return
  }

  alert("Функция оформления заказа будет доступна в следующей версии!")
}

// ========== СЧЕТЧИК КОРЗИНЫ (для иконки) ==========
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

// ========== ЗАЩИТА ОТ XSS ==========
function escapeHtml(str) {
  if (!str) return '—'
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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