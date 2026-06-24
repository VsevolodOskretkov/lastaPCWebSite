let editingId = null
let isLoadingComputers = false


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
      alert(" Нет доступа к админ-панели")
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

// ✅ Оптимизированная загрузка компьютеров (с кэшем)
let cachedComputers = null
let cacheTime = 0
const CACHE_DURATION = 60 * 1000 // 1 минута для админки

async function loadComputers() {
  if (isLoadingComputers) return
  isLoadingComputers = true

  try {
    // Проверяем кэш
    if (cachedComputers && (Date.now() - cacheTime) < CACHE_DURATION) {
      renderComputersList(cachedComputers)
      isLoadingComputers = false
      return
    }

    const { data, error } = await supabaseClient
      .from("computers")
      .select("id, title, price, image, created_at, published") // только нужные поля
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
      <div class="text-center py-12 text-gray-400">
         Компьютеры не найдены<br>
        <button onclick="resetForm()" class="mt-4 text-purple-400 underline">Создать первый компьютер</button>
      </div>
    `
    return
  }

  const fragment = document.createDocumentFragment()

  computers.forEach(pc => {
    const div = document.createElement('div')
    div.className = 'bg-[#1a1b1f] border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition'
    div.innerHTML = `
      <img src="${pc.image || '/src/img/placeholder.webp'}" 
           loading="lazy"
           class="w-full h-48 object-cover rounded-xl mb-4"
           onerror="this.src='/src/img/placeholder.webp'">
      <h3 class="text-xl mb-2">${escapeHtml(pc.title)}</h3>
      <p class="text-gray-400 mb-4">${pc.price.toLocaleString("ru-RU")} ₽</p>
      <div class="flex gap-3">
        <button onclick="editComputer('${pc.id}')" 
                class="flex-1 bg-purple-600 py-2 rounded-xl hover:bg-purple-700 transition">
           Редактировать
        </button>
        <button onclick="deleteComputer('${pc.id}')" 
                class="flex-1 bg-red-600/20 text-red-400 py-2 rounded-xl hover:bg-red-600 hover:text-white transition">
           Удалить
        </button>
      </div>
    `
    fragment.appendChild(div)
  })

  container.innerHTML = ''
  container.appendChild(fragment)
}

// ✅ Удаление компьютера
window.deleteComputer = async function(id) {
  if (!confirm('Вы уверены, что хотите удалить этот компьютер?')) return

  try {
    const { error } = await supabaseClient
      .from("computers")
      .delete()
      .eq("id", id)

    if (error) throw error

    alert('✅ Компьютер удален')
    
    // Очищаем кэш и перезагружаем
    cachedComputers = null
    loadComputers()
    
    // Если редактировали удаленный компьютер - сбрасываем форму
    if (editingId === id) {
      resetForm()
    }
  } catch (err) {
    console.error("Ошибка удаления:", err)
    alert(' Ошибка удаления: ' + err.message)
  }
}

// ✅ Сброс формы
window.resetForm = function() {
  editingId = null
  document.getElementById("createComputerForm").reset()
  document.getElementById("slug").value = ""
  document.getElementById("features").value = ""
  document.getElementById("fps").value = ""
  document.getElementById("published").checked = true
  
  // Меняем текст кнопки
  const submitBtn = document.querySelector('#createComputerForm button[type="submit"]')
  if (submitBtn) {
    submitBtn.textContent = '✨ Создать компьютер'
  }
  
  window.scrollTo({ top: 0, behavior: "smooth" })
}

// ✅ Авто-генерация slug из title
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .substring(0, 100)
}

// ✅ Обработчик формы
document.getElementById("createComputerForm")?.addEventListener("submit", async (e) => {
  e.preventDefault()

  // Получаем значения с проверками
  const title = document.getElementById("title")?.value.trim()
  if (!title) {
    alert(" Введите название компьютера")
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

  // Проверка цены
  if (isNaN(price) || price <= 0) {
    alert(" Введите корректную цену")
    return
  }

  // Обработка features (построчно)
  const featuresText = document.getElementById("features")?.value || ""
  const features = featuresText
    .split("\n")
    .map(f => f.trim())
    .filter(f => f.length > 0)

  // Обработка FPS (формат: "Игра: значение" или "Игра:значение")
  const fpsText = document.getElementById("fps")?.value || ""
  const fps = {}
  fpsText.split("\n").forEach(line => {
    const [game, value] = line.split(/[:：]/) // поддержка : и ：
    if (game?.trim() && value?.trim()) {
      fps[game.trim()] = value.trim()
    }
  })

  // Авто-генерация slug
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

  // Показываем индикатор загрузки
  const submitBtn = e.target.querySelector('button[type="submit"]')
  const originalText = submitBtn?.textContent
  if (submitBtn) {
    submitBtn.textContent = ' Сохранение...'
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

    alert(editingId ? " Компьютер обновлен" : " Компьютер создан")
    
    // Сбрасываем форму и перезагружаем список
    resetForm()
    
    // Очищаем кэш и обновляем список
    cachedComputers = null
    await loadComputers()

  } catch (err) {
    console.error("Ошибка:", err)
    alert(` Ошибка: ${err.message}`)
  } finally {
    if (submitBtn) {
      submitBtn.textContent = originalText || (editingId ? " Обновить компьютер" : "✨ Создать компьютер")
      submitBtn.disabled = false
    }
  }
})

// ✅ Редактирование компьютера
window.editComputer = async function(id) {
  try {
    const { data: pc, error } = await supabaseClient
      .from("computers")
      .select("*")
      .eq("id", id)
      .single()

    if (error) throw error

    editingId = id

    // Заполняем форму
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

    // Меняем текст кнопки
    const submitBtn = document.querySelector('#createComputerForm button[type="submit"]')
    if (submitBtn) {
      submitBtn.textContent = ' Обновить компьютер'
    }

    window.scrollTo({ top: 0, behavior: "smooth" })

  } catch (err) {
    console.error("Ошибка загрузки компьютера:", err)
    alert(' Ошибка загрузки данных компьютера')
  }
}

// ✅ Авто-генерация slug при вводе названия
const titleInput = document.getElementById("title")
const slugInput = document.getElementById("slug")

if (titleInput && slugInput) {
  titleInput.addEventListener("input", () => {
    if (!slugInput.value || slugInput.value === generateSlug(titleInput.value)) {
      slugInput.value = generateSlug(titleInput.value)
    }
  })
}

// Защита от XSS
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
      <div class="text-center py-12 text-red-400">
         Ошибка загрузки списка компьютеров<br>
        <button onclick="location.reload()" class="mt-4 text-purple-400 underline">Повторить</button>
      </div>
    `
  }
}

// Запуск
checkAdmin()
loadComputers()