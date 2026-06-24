let editingId = null
let isLoadingComputers = false
let isLoadingOrders = false

async function checkAdmin() {
  try {
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession()

    if (sessionError || !session) {
      redirectToReg()
      return
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    if (profileError || !profile || profile.role !== "admin") {
      alert("Нет доступа к админ-панели")
      location.href = "/index"
      return
    }
  } catch (err) {
    console.error("Ошибка проверки прав:", err)
    redirectToReg()
  }
}

function redirectToReg() {
  if (!window.location.pathname.includes("/reg")) {
    location.href = "/reg"
  }
}

// ============================================
// УПРАВЛЕНИЕ ТОВАРАМИ
// ============================================

let cachedComputers = null
let cacheTime = 0
const CACHE_DURATION = 60 * 1000

async function loadComputers() {
  if (isLoadingComputers) return
  isLoadingComputers = true

  try {
    if (cachedComputers && (Date.now() - cacheTime) < CACHE_DURATION) {
      renderComputersList(cachedComputers)
      isLoadingComputers = false
      return
    }

    const { data, error } = await supabaseClient
      .from("computers")
      .select("id, title, price, image, created_at, published")
      .order("created_at", { ascending: false })

    if (error) throw error

    cachedComputers = data
    cacheTime = Date.now()
    renderComputersList(data)

  } catch (err) {
    console.error("Ошибка загрузки:", err)
    showError()
  } finally {
    isLoadingComputers = false
  }
}

function renderComputersList(computers) {
  const container = document.getElementById("computersList")
  if (!container) return

  if (!computers || computers.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-gray-400 col-span-full">
        Компьютеры не найдены<br>
        <button onclick="resetForm()" class="mt-4 text-purple-400 underline">Создать первый компьютер</button>
      </div>
    `
    return
  }

  const fragment = document.createDocumentFragment()

  computers.forEach(pc => {
    const div = document.createElement('div')
    div.className = 'product-card bg-[#1a1b1f] border border-gray-800 rounded-2xl p-3 hover:border-gray-700 transition'
    div.innerHTML = `
      <div class="relative">
        <img src="${pc.image || '/src/img/placeholder.webp'}" 
             loading="lazy"
             class="product-image"
             alt="${escapeHtml(pc.title)}"
             onerror="this.src='/src/img/placeholder.webp'">
        ${!pc.published ? '<span class="absolute top-2 right-2 bg-yellow-600 text-xs px-2 py-1 rounded-full">Черновик</span>' : ''}
      </div>
      <div class="mt-3">
        <h3 class="text-sm font-semibold truncate">${escapeHtml(pc.title)}</h3>
        <p class="text-purple-400 font-bold text-sm mt-1">${pc.price.toLocaleString("ru-RU")} ₽</p>
        <div class="flex gap-2 mt-3">
          <button onclick="editComputer('${pc.id}')" 
                  class="flex-1 bg-purple-600 text-xs py-1.5 rounded-lg hover:bg-purple-700 transition">
            Редакт.
          </button>
          <button onclick="deleteComputer('${pc.id}')" 
                  class="flex-1 bg-red-600/20 text-red-400 text-xs py-1.5 rounded-lg hover:bg-red-600 hover:text-white transition">
            Удалить
          </button>
        </div>
      </div>
    `
    fragment.appendChild(div)
  })

  container.innerHTML = ''
  container.appendChild(fragment)
}

window.deleteComputer = async function(id) {
  if (!confirm('Вы уверены, что хотите удалить этот компьютер?')) return

  try {
    const { error } = await supabaseClient
      .from("computers")
      .delete()
      .eq("id", id)

    if (error) throw error

    alert('Компьютер удален')
    
    cachedComputers = null
    loadComputers()
    
    if (editingId === id) {
      resetForm()
    }
  } catch (err) {
    console.error("Ошибка удаления:", err)
    alert('Ошибка удаления: ' + err.message)
  }
}

window.resetForm = function() {
  editingId = null
  document.getElementById("createComputerForm").reset()
  document.getElementById("slug").value = ""
  document.getElementById("features").value = ""
  document.getElementById("fps").value = ""
  document.getElementById("published").checked = true
  
  const submitBtn = document.querySelector('#createComputerForm button[type="submit"]')
  if (submitBtn) {
    submitBtn.textContent = 'Создать компьютер'
  }
  
  window.scrollTo({ top: 0, behavior: "smooth" })
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .substring(0, 100)
}

document.getElementById("createComputerForm")?.addEventListener("submit", async (e) => {
  e.preventDefault()

  const title = document.getElementById("title")?.value.trim()
  if (!title) {
    alert("Введите название компьютера")
    return
  }

  let slug = document.getElementById("slug")?.value.trim()
  const category = document.getElementById("category")?.value
  const description = document.getElementById("description")?.value
  const short_description = document.getElementById("short_description")?.value
  const price = Number(document.getElementById("price")?.value)
  const cpu = document.getElementById("cpu")?.value
  const gpu = document.getElementById("gpu")?.value
  const ram = document.getElementById("ram")?.value
  const storage = document.getElementById("storage")?.value
  const image = document.getElementById("image")?.value
  const windows = document.getElementById("windows")?.value
  const published = document.getElementById("published")?.checked || false

  if (isNaN(price) || price <= 0) {
    alert("Введите корректную цену")
    return
  }

  const featuresText = document.getElementById("features")?.value || ""
  const features = featuresText
    .split("\n")
    .map(f => f.trim())
    .filter(f => f.length > 0)

  const fpsText = document.getElementById("fps")?.value || ""
  const fps = {}
  fpsText.split("\n").forEach(line => {
    const [game, value] = line.split(/[:：]/)
    if (game?.trim() && value?.trim()) {
      fps[game.trim()] = value.trim()
    }
  })

  if (!slug) {
    slug = generateSlug(title)
  }

  const computer = {
    title,
    slug,
    category,
    description,
    short_description,
    price,
    cpu,
    gpu,
    ram,
    storage,
    image,
    windows,
    published,
    features,
    fps
  }

  const submitBtn = e.target.querySelector('button[type="submit"]')
  const originalText = submitBtn?.textContent
  if (submitBtn) {
    submitBtn.textContent = 'Сохранение...'
    submitBtn.disabled = true
  }

  try {
    let error

    if (editingId) {
      const result = await supabaseClient
        .from("computers")
        .update(computer)
        .eq("id", editingId)
      error = result.error
    } else {
      const result = await supabaseClient
        .from("computers")
        .insert([computer])
      error = result.error
    }

    if (error) throw error

    alert(editingId ? "Компьютер обновлен" : "Компьютер создан")
    
    resetForm()
    cachedComputers = null
    await loadComputers()

  } catch (err) {
    console.error("Ошибка:", err)
    alert("Ошибка: " + err.message)
  } finally {
    if (submitBtn) {
      submitBtn.textContent = originalText || (editingId ? "Обновить компьютер" : "Создать компьютер")
      submitBtn.disabled = false
    }
  }
})

window.editComputer = async function(id) {
  try {
    const { data: pc, error } = await supabaseClient
      .from("computers")
      .select("*")
      .eq("id", id)
      .single()

    if (error) throw error

    editingId = id

    const fields = ['title', 'slug', 'category', 'description', 'short_description', 'price', 'cpu', 'gpu', 'ram', 'storage', 'image', 'windows']
    fields.forEach(field => {
      const el = document.getElementById(field)
      if (el) el.value = pc[field] || ''
    })

    const publishedEl = document.getElementById("published")
    if (publishedEl) publishedEl.checked = pc.published || false

    const featuresEl = document.getElementById("features")
    if (featuresEl) featuresEl.value = pc.features ? pc.features.join("\n") : ""

    const fpsEl = document.getElementById("fps")
    if (fpsEl) {
      fpsEl.value = pc.fps
        ? Object.entries(pc.fps)
            .map(([game, value]) => `${game}: ${value}`)
            .join("\n")
        : ""
    }

    const submitBtn = document.querySelector('#createComputerForm button[type="submit"]')
    if (submitBtn) {
      submitBtn.textContent = 'Обновить компьютер'
    }

    window.scrollTo({ top: 0, behavior: "smooth" })

  } catch (err) {
    console.error("Ошибка загрузки компьютера:", err)
    alert('Ошибка загрузки данных компьютера')
  }
}

const titleInput = document.getElementById("title")
const slugInput = document.getElementById("slug")

if (titleInput && slugInput) {
  titleInput.addEventListener("input", () => {
    if (!slugInput.value || slugInput.value === generateSlug(titleInput.value)) {
      slugInput.value = generateSlug(titleInput.value)
    }
  })
}

function escapeHtml(str) {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function showError() {
  const container = document.getElementById("computersList")
  if (container) {
    container.innerHTML = `
      <div class="text-center py-12 text-red-400 col-span-full">
        Ошибка загрузки списка компьютеров<br>
        <button onclick="location.reload()" class="mt-4 text-purple-400 underline">Повторить</button>
      </div>
    `
  }
}

// ============================================
// УПРАВЛЕНИЕ ЗАКАЗАМИ
// ============================================

async function loadOrders() { 
  if (isLoadingOrders) return
  isLoadingOrders = true

  try {
    const { data: orders, error } = await supabaseClient
      .from('orders')
      .select(`
        id,
        total_price,
        status,
        payment_method,
        payment_status,
        delivery_address,
        phone,
        created_at,

        profiles (
          name,
          email
        ),

        order_items (
          id,
          quantity,
          price,
          computer_id,
          custom_build_id,

          computers (
            title,
            image
          ),

          custom_builds (
            title
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    renderOrdersList(orders || [])

  } catch (err) {
    console.error('Ошибка загрузки заказов:', err)
    const container = document.getElementById('ordersList')
    if (container) {
      container.innerHTML = `
        <div class="text-center text-red-400 py-8">
          Ошибка загрузки заказов<br>
          <button onclick="loadOrders()" class="mt-4 text-purple-400 underline">Повторить</button>
        </div>
      `
    }
  } finally {
    isLoadingOrders = false
  }
}

function renderOrdersList(orders) {
  const container = document.getElementById('ordersList')
  if (!container) return

  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-gray-400">
        Заказов пока нет
      </div>
    `
    return
  }

  let html = '<div class="space-y-3">'

  orders.forEach(order => {
    const createdDate = new Date(order.created_at).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    const statusMap = {
      'pending': { label: 'Ожидает', class: 'status-pending' },
      'processing': { label: 'В обработке', class: 'status-processing' },
      'shipped': { label: 'Отправлен', class: 'status-shipped' },
      'delivered': { label: 'Доставлен', class: 'status-delivered' },
      'cancelled': { label: 'Отменен', class: 'status-cancelled' }
    }

    const currentStatus = statusMap[order.status] || statusMap['pending']

    html += `
      <div class="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div class="flex-1">
            <div class="flex flex-wrap items-center gap-2 mb-2">
              <span class="text-sm font-semibold text-white">Заказ #${order.id.slice(0, 8)}</span>
              <span class="text-xs text-gray-400">${createdDate}</span>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs px-2 py-1 rounded-full ${currentStatus.class}">
                ${currentStatus.label}
              </span>
              <span class="text-xs px-2 py-1 rounded-full bg-gray-700/50 text-gray-300">
                ${order.payment_status === 'paid' ? 'Оплачен' : 'Не оплачен'}
              </span>
              <span class="text-xs px-2 py-1 rounded-full bg-gray-700/50 text-gray-300">
                ${order.payment_method === 'cash' ? 'Наличные' : 'Карта'}
              </span>
            </div>
            <div class="mt-2 text-sm text-gray-400">
              <p>${order.profiles?.name || 'Пользователь'} (${order.profiles?.email || 'нет email'})</p>
              <p>${order.delivery_address || 'Самовывоз'}</p>
              ${order.phone ? `<p>${order.phone}</p>` : ''}
            </div>
          </div>
          <div class="flex flex-col items-end gap-2">
            <p class="text-xl font-bold text-purple-400">${order.total_price.toLocaleString()} ₽</p>
            <div class="flex gap-2">
              <select onchange="updateOrderStatus('${order.id}', this.value)" 
                      class="bg-gray-700 text-white text-sm px-3 py-1.5 rounded-lg border border-gray-600 focus:border-purple-500 outline-none">
                <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Ожидает</option>
                <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>В обработке</option>
                <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Отправлен</option>
                <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Доставлен</option>
                <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Отменен</option>
              </select>
              <button onclick="deleteOrder('${order.id}')" 
                      class="bg-red-600 px-3 py-1.5 rounded-lg text-sm hover:bg-red-700 transition">
                Удалить
              </button>
            </div>
          </div>
        </div>

        <!-- Кнопка Подробнее -->
        <div class="mt-3">
          <button onclick="toggleOrderDetails('${order.id}')" 
                  class="bg-purple-600 px-3 py-1 rounded-lg text-sm hover:bg-purple-700 transition">
            Подробнее
          </button>
        </div>

        <!-- Детали заказа (скрыты по умолчанию) -->
        <div class="hidden mt-4 border-t border-gray-700 pt-4" id="details-${order.id}">
          <h4 class="font-semibold mb-3">Товары заказа</h4>
          ${order.order_items && order.order_items.length > 0 ? order.order_items.map(item => {
            const title = item.computers?.title || item.custom_builds?.title || 'Товар';
            return `
              <div class="flex justify-between bg-gray-900 rounded-lg p-3 mb-2">
                <div>
                  <p>${escapeHtml(title)}</p>
                  <p class="text-xs text-gray-400">${item.quantity} шт.</p>
                </div>
                <div>${item.price.toLocaleString()} ₽</div>
              </div>
            `;
          }).join('') : '<p class="text-gray-400 text-sm">Товары не найдены</p>'}
        </div>
      </div>
    `
  })

  html += '</div>'
  container.innerHTML = html
}

// Обновление статуса заказа
window.updateOrderStatus = async function(orderId, newStatus) {
  try {
    const { error } = await supabaseClient
      .from('orders')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (error) throw error

    const statusMap = {
      'pending': 'Ожидает',
      'processing': 'В обработке',
      'shipped': 'Отправлен',
      'delivered': 'Доставлен',
      'cancelled': 'Отменен'
    }
    
    alert('Статус заказа обновлен на "' + statusMap[newStatus] + '"')
    
    await loadOrders()

  } catch (err) {
    console.error('Ошибка обновления статуса:', err)
    alert('Ошибка обновления статуса: ' + err.message)
    await loadOrders()
  }
}

// Показать/скрыть детали заказа
window.toggleOrderDetails = function(orderId) {
  const block = document.getElementById('details-' + orderId)
  if (!block) return
  block.classList.toggle('hidden')
}

// Удаление заказа
window.deleteOrder = async function(orderId) {
  if (!confirm('Удалить заказ?')) return

  try {
    await supabaseClient
      .from('order_items')
      .delete()
      .eq('order_id', orderId)

    const { error } = await supabaseClient
      .from('orders')
      .delete()
      .eq('id', orderId)

    if (error) throw error

    alert('Заказ удален')
    await loadOrders()

  } catch (err) {
    console.error(err)
    alert(err.message)
  }
}

// ============================================
// ЗАПУСК
// ============================================

checkAdmin()
loadComputers()
loadOrders()