// profile.js - с историей заказов (только самовывоз)

// Кэш для профиля (5 минут)
let cachedProfile = null
let cacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 минут

// Кэш для заказов
let cachedOrders = null
let ordersCacheTime = 0
const ORDERS_CACHE_DURATION = 2 * 60 * 1000 // 2 минуты

async function loadProfile() {
  try {
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession()

    if (sessionError) {
      console.error("Ошибка сессии:", sessionError.message)
      redirectToReg()
      return
    }

    if (!session) {
      redirectToReg()
      return
    }

    const userId = session.user.id
    const userEmail = session.user.email

    // Проверяем кэш профиля
    if (cachedProfile && (Date.now() - cacheTime) < CACHE_DURATION) {
      displayProfile(cachedProfile)
      refreshProfileInBackground(userId)
    } else {
      await loadAndDisplayProfile(userId, userEmail)
    }

    // Загружаем заказы
    await loadOrders(userId)

  } catch (err) {
    console.error("Неожиданная ошибка:", err)
    redirectToReg()
  }
}

async function loadAndDisplayProfile(userId, userEmail) {
  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("name, email, role")
    .eq("id", userId)
    .single()

  if (error) {
    console.error("Ошибка профиля:", error)
    
    if (error.code === "PGRST116") {
      await createProfile(userId, userEmail)
    }
    return
  }

  cachedProfile = profile
  cacheTime = Date.now()
  displayProfile(profile)
}

async function createProfile(userId, userEmail) {
  const defaultName = userEmail?.split('@')[0] || "Пользователь"
  
  const { data: newProfile, error: createError } = await supabaseClient
    .from("profiles")
    .insert([{ 
      id: userId, 
      email: userEmail, 
      name: defaultName, 
      role: "user" 
    }])
    .select("name, email, role")
    .single()

  if (!createError && newProfile) {
    cachedProfile = newProfile
    cacheTime = Date.now()
    displayProfile(newProfile)
  } else {
    console.error("Ошибка создания профиля:", createError)
  }
}

async function refreshProfileInBackground(userId) {
  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("name, email, role")
    .eq("id", userId)
    .single()
  
  if (profile && JSON.stringify(profile) !== JSON.stringify(cachedProfile)) {
    cachedProfile = profile
    cacheTime = Date.now()
    displayProfile(profile)
  }
}

function displayProfile(profile) {
  const nameEl = document.getElementById("profileName")
  const emailEl = document.getElementById("profileEmail")
  const roleEl = document.getElementById("profileRole")
  const adminBtn = document.getElementById("adminButton")

  if (nameEl) nameEl.textContent = profile.name || "Без имени"
  if (emailEl) emailEl.textContent = profile.email || ""
  if (roleEl) roleEl.textContent = profile.role || "user"

  if (adminBtn && profile.role === "admin") {
    adminBtn.classList.remove("hidden")
  } else if (adminBtn) {
    adminBtn.classList.add("hidden")
  }
}

// ============================================
// ЗАГРУЗКА И ОТОБРАЖЕНИЕ ЗАКАЗОВ
// ============================================
async function loadOrders(userId) {
  try {
    // Проверяем кэш
    if (cachedOrders && (Date.now() - ordersCacheTime) < ORDERS_CACHE_DURATION) {
      displayOrders(cachedOrders)
      return
    }

    const { data: orders, error } = await supabaseClient
      .from('orders')
      .select(`
        id,
        total_price,
        status,
        payment_method,
        payment_status,
        created_at,
        order_items (
          id,
          quantity,
          price,
          computer_id,
          custom_build_id,
          computers (
            id,
            title,
            image
          ),
          custom_builds (
            id,
            title
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    cachedOrders = orders || []
    ordersCacheTime = Date.now()
    displayOrders(cachedOrders)

  } catch (err) {
    console.error('Ошибка загрузки заказов:', err)
    const container = document.getElementById('ordersContainer')
    if (container) {
      container.innerHTML = `
        <div class="text-center text-red-400 py-8">
          <p>Ошибка загрузки заказов</p>
          <button onclick="loadOrders()" class="mt-4 text-purple-400 hover:underline">
            Попробовать снова
          </button>
        </div>
      `
    }
  }
}

function displayOrders(orders) {
  const container = document.getElementById('ordersContainer')
  if (!container) return

  // Если заказов нет - показываем пустое состояние
  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <div class="border border-dashed border-gray-700 rounded-2xl p-12 text-center">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
        </svg>
        <p class="text-gray-400 text-lg">У вас пока нет заказов</p>
        <a href="/catalog" class="inline-block mt-6 text-purple-400 hover:text-purple-300 transition text-sm">
          Перейти в каталог →
        </a>
      </div>
    `
    return
  }

  // Если заказы есть - показываем их
  let html = '<div class="space-y-4">'
  
  orders.forEach(order => {
    const createdDate = new Date(order.created_at).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    // Статус заказа
    const statusMap = {
      'pending': { label: 'Ожидает обработки', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
      'processing': { label: 'В обработке', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
      'shipped': { label: 'Готов', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
      'cancelled': { label: 'Отменен', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' }
    }

    const status = statusMap[order.status] || statusMap['pending']
    
    // Статус оплаты
    const paymentStatusMap = {
      'unpaid': { label: 'Не оплачен', color: 'text-red-400' },
      'paid': { label: 'Оплачен', color: 'text-green-400' },
      'pending': { label: 'Ожидает оплаты', color: 'text-yellow-400' }
    }
    const paymentStatus = paymentStatusMap[order.payment_status] || paymentStatusMap['unpaid']

    // Товары в заказе
    let itemsHtml = ''
    if (order.order_items && order.order_items.length > 0) {
      itemsHtml = '<div class="space-y-2 mt-3">'
      order.order_items.forEach(item => {
        let title = 'Товар'
        let imageUrl = '/src/img/defoult.webp'
        
        if (item.computer_id && item.computers) {
          title = item.computers.title || 'Готовый ПК'
          imageUrl = item.computers.image || imageUrl
        } else if (item.custom_build_id && item.custom_builds) {
          title = item.custom_builds.title || 'Сборка'
        }
        
        itemsHtml += `
          <div class="flex items-center gap-3 p-2 bg-gray-800 rounded-lg">
            <img src="${imageUrl}" alt="${title}" class="w-10 h-10 object-cover rounded-lg" onerror="this.src='/src/img/defoult.webp'">
            <div class="flex-1">
              <p class="text-sm text-white">${title}</p>
              <p class="text-xs text-gray-400">${item.quantity} × ${item.price.toLocaleString()} ₽</p>
            </div>
            <p class="text-sm font-bold text-purple-400">${(item.price * item.quantity).toLocaleString()} ₽</p>
          </div>
        `
      })
      itemsHtml += '</div>'
    }

    html += `
      <div class="bg-gray-800/50 border ${status.border} rounded-xl p-4 hover:border-gray-600 transition">
        <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div class="flex-1">
            <div class="flex flex-wrap items-center gap-2 mb-2">
              <span class="text-sm font-semibold text-white">Заказ #${order.id.slice(0, 8)}</span>
              <span class="text-xs text-gray-400">${createdDate}</span>
            </div>
            <div class="flex flex-wrap items-center gap-2 mb-2">
              <span class="text-xs px-2 py-1 rounded-full ${status.bg} ${status.color} border ${status.border}">
                ${status.label}
              </span>
              <span class="text-xs px-2 py-1 rounded-full bg-gray-700/50 text-gray-300">
                ${paymentStatus.label}
              </span>
              <span class="text-xs px-2 py-1 rounded-full bg-gray-700/50 text-gray-300">
                ${order.payment_method === 'cash' ? 'Наличные' : 'Карта'}
              </span>
            </div>
            <p class="text-xs text-gray-400 mb-2">📍 Самовывоз (г. Санкт-Петербург, ул. Коллонтай, 21к1)</p>
            ${itemsHtml}
          </div>
          <div class="text-right whitespace-nowrap">
            <p class="text-xl font-bold text-purple-400">${order.total_price.toLocaleString()} ₽</p>
          </div>
        </div>
      </div>
    `
  })

  html += '</div>'
  container.innerHTML = html
}

function redirectToReg() {
  if (window.location.pathname !== "/reg" && window.location.pathname !== "/views/pages/reg.html") {
    window.location.href = "/reg"
  }
}

// LOGOUT
const logoutBtn = document.getElementById("logoutBtn")
if (logoutBtn) {
  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault()
    cachedProfile = null
    cacheTime = 0
    cachedOrders = null
    ordersCacheTime = 0
    await supabaseClient.auth.signOut()
    window.location.href = "/reg"
  })
}

// Запускаем после загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadProfile)
} else {
  loadProfile()
}