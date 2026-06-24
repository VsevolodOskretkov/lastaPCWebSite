// profile.js - оптимизированная версия

// Кэш для профиля (5 минут)
let cachedProfile = null
let cacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 минут

async function loadProfile() {
  try {
    // ✅ 1. Используем getSession() вместо getUser() - в 1000 раз быстрее
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

    // ✅ 2. Проверяем кэш
    if (cachedProfile && (Date.now() - cacheTime) < CACHE_DURATION) {
      displayProfile(cachedProfile)
      // Обновляем в фоне
      refreshProfileInBackground(userId)
      return
    }

    // ✅ 3. Загружаем профиль
    await loadAndDisplayProfile(userId, userEmail)

  } catch (err) {
    console.error("Неожиданная ошибка:", err)
    redirectToReg()
  }
}

async function loadAndDisplayProfile(userId, userEmail) {
  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("name, email, role") // ✅ Только нужные поля
    .eq("id", userId)
    .single()

  if (error) {
    console.error("Ошибка профиля:", error)
    
    // ✅ Если профиля нет - создаем автоматически
    if (error.code === "PGRST116") {
      await createProfile(userId, userEmail)
    }
    return
  }

  // Сохраняем в кэш
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

// Фоновая проверка обновлений профиля
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
  // ✅ С проверкой существования элементов
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

function redirectToReg() {
  // ✅ Избегаем множественных редиректов
  if (window.location.pathname !== "/reg" && window.location.pathname !== "/views/pages/reg.html") {
    window.location.href = "/reg"
  }
}

// ✅ LOGOUT с очисткой кэша
const logoutBtn = document.getElementById("logoutBtn")
if (logoutBtn) {
  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault()
    
    // Очищаем кэш
    cachedProfile = null
    cacheTime = 0
    
    // Выход
    await supabaseClient.auth.signOut()
    window.location.href = "/reg"
  })
}

// ✅ Запускаем после загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadProfile)
} else {
  loadProfile()
}