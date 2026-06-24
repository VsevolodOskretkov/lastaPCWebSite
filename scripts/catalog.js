// catalog.js - оптимизированная версия

// Кэш для компьютеров (5 минут)
let cachedComputers = null
let cacheTimes = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 минут

// Флаг для отслеживания загрузки
let isLoading = false

async function loadComputers() {
  // Защита от параллельных вызовов
  if (isLoading) return
  isLoading = true

  try {
    // Проверяем кэш
    if (cachedComputers && (Date.now() - cacheTimes) < CACHE_DURATION) {
      console.log('📦 Загружено из кэша')
      processAndRenderComputers(cachedComputers)
      isLoading = false
      return
    }

    // Показываем скелетоны
    showSkeletons()

    // ✅ Запрашиваем только нужные поля (не * )
    const { data: computers, error } = await supabaseClient
      .from("computers")
      .select("id, title, price, image, cpu, gpu, ram, storage, category") // только нужные поля
      .eq("published", true)
      .order('price', { ascending: true }) // сортировка по цене

    if (error) {
      console.error("Ошибка загрузки:", error)
      showError()
      isLoading = false
      return
    }

    if (!computers || computers.length === 0) {
      console.log("Нет данных")
      showEmpty()
      isLoading = false
      return
    }

    console.log(`✅ Загружено ${computers.length} компьютеров`)

    // Сохраняем в кэш
    cachedComputers = computers
    cacheTimes = Date.now()

    // Обрабатываем и рендерим
    processAndRenderComputers(computers)

  } catch (err) {
    console.error("Неожиданная ошибка:", err)
    showError()
  } finally {
    isLoading = false
  }
}

function processAndRenderComputers(computers) {
  // РАЗДЕЛЕНИЕ ПО КАТЕГОРИЯМ
  const silver = computers.filter(pc => pc.category === "silver")
  const gold = computers.filter(pc => pc.category === "gold")
  const platina = computers.filter(pc => pc.category === "platina")

  // РЕНДЕР
  renderComputers(silver, "silverContainer")
  renderComputers(gold, "goldContainer")
  renderComputers(platina, "platinaContainer")
}

function renderComputers(computers, containerId) {
  const container = document.getElementById(containerId)
  if (!container) return

  // Используем DocumentFragment для лучшей производительности
  const fragment = document.createDocumentFragment()

  computers.forEach(pc => {
    const div = document.createElement('div')
    div.className = 'bg-[#2b2e36] rounded-xl px-6 py-8 text-center hover:scale-[1.02] transition'
    
    // Защита от XSS
    const safeTitle = escapeHtml(pc.title)
    const safeCpu = escapeHtml(pc.cpu || '—')
    const safeGpu = escapeHtml(pc.gpu || '—')
    const safeRam = escapeHtml(pc.ram || '—')
    const safeStorage = escapeHtml(pc.storage || '—')
    
div.innerHTML = `
  <img src="${pc.image}" 
       loading="lazy"
       decoding="async"
       class="h-40 sm:h-48 md:h-60 mx-auto mb-4 md:mb-6 object-contain"
       onerror="this.src='/src/img/placeholder.webp'">
  <h3 class="tracking-[2px] sm:tracking-[3px] text-xs sm:text-sm mb-2 text-gray-200 text-center truncate px-1">${safeTitle}</h3>
  <p class="text-gray-400 text-xs sm:text-sm mb-3 md:mb-4 text-center">${pc.price.toLocaleString()}₽</p>
  <button onclick="window.location.href='/product?id=${pc.id}'" 
          class="border border-purple-500 text-purple-400 px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm hover:bg-purple-500 hover:text-white transition w-full sm:w-auto mb-2 md:mb-0">
    Подробнее
  </button>
  
  <!-- Характеристики в одну строку на мобильных -->
  <div class="text-[10px] sm:text-[11px] text-gray-400 leading-4 sm:leading-5 mt-2 md:mt-3 text-center sm:text-left">
    <p class="hidden sm:block">Процессор: <span class="text-gray-300 text-[11px] sm:text-[13px]">${safeCpu}</span></p>
    <p class="hidden sm:block">Видеокарта: <span class="text-gray-300 text-[11px] sm:text-[13px]">${safeGpu}</span></p>
    <p class="hidden sm:block">Оперативная память: <span class="text-gray-300 text-[11px] sm:text-[13px]">${safeRam}</span></p>
    <p class="hidden sm:block">SSD накопитель: <span class="text-gray-300 text-[11px] sm:text-[13px]">${safeStorage}</span></p>
    
    <!-- Компактное отображение на мобильных -->
    <div class="sm:hidden flex flex-wrap justify-center gap-1">
      <span class="bg-gray-800 px-2 py-0.5 rounded text-[10px]">${safeCpu}</span>
      <span class="bg-gray-800 px-2 py-0.5 rounded text-[10px]">${safeGpu}</span>
      <span class="bg-gray-800 px-2 py-0.5 rounded text-[10px]">${safeRam}</span>
      <span class="bg-gray-800 px-2 py-0.5 rounded text-[10px]">${safeStorage}</span>
    </div>
  </div>
`
fragment.appendChild(div)
})

  // Один раз вставляем всё вместе
  container.innerHTML = ''
  container.appendChild(fragment)
}

// Защита от XSS
function escapeHtml(str) {
  if (!str) return '—'
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Скелетоны загрузки (адаптивные)
function showSkeletons() {
  const containers = ['silverContainer', 'goldContainer', 'platinaContainer']
  containers.forEach(id => {
    const container = document.getElementById(id)
    if (container && container.children.length === 0) {
      container.innerHTML = Array(4).fill(`
        <div class="bg-[#2b2e36] rounded-xl p-4 sm:p-6 md:px-6 md:py-8 animate-pulse">
          <div class="h-32 sm:h-48 md:h-60 bg-gray-700 rounded-lg mx-auto mb-3 md:mb-6"></div>
          <div class="h-3 sm:h-4 bg-gray-700 rounded w-24 sm:w-32 mx-auto mb-1.5 sm:mb-2"></div>
          <div class="h-3 sm:h-4 bg-gray-700 rounded w-20 sm:w-24 mx-auto mb-3 md:mb-4"></div>
          <div class="h-7 sm:h-8 bg-gray-700 rounded w-20 sm:w-28 mx-auto"></div>
        </div>
      `).join('')
    }
  })
}

function showError() {
  const containers = ['silverContainer', 'goldContainer', 'platinaContainer']
  containers.forEach(id => {
    const container = document.getElementById(id)
    if (container) {
      container.innerHTML = `
        <div class="col-span-full text-center py-8 sm:py-12">
          <p class="text-red-400 text-sm sm:text-base">❌ Ошибка загрузки данных</p>
          <button onclick="location.reload()" class="mt-3 sm:mt-4 text-purple-400 underline text-sm sm:text-base">Повторить</button>
        </div>
      `
    }
  })
}

function showEmpty() {
  const containers = ['silverContainer', 'goldContainer', 'platinaContainer']
  containers.forEach(id => {
    const container = document.getElementById(id)
    if (container) {
      container.innerHTML = `
        <div class="col-span-full text-center py-8 sm:py-12">
          <p class="text-gray-400 text-sm sm:text-base">📭 Компьютеры не найдены</p>
        </div>
      `
    }
  })
}

// Запускаем после загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Небольшая задержка для приоритета видимого контента
    setTimeout(loadComputers, 50)
  })
} else {
  setTimeout(loadComputers, 50)
}

// Для кнопок на странице товара используйте addReadyPCToCart
window.addToCart = async function(computerId) {
  return await addReadyPCToCart(computerId);
}