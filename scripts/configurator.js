// ===== 1. ИНИЦИАЛИЗАЦИЯ И ПРОВЕРКА =====
if (typeof supabaseClient === 'undefined') {
    console.error('Supabase клиент не инициализирован!');
    setTimeout(() => {
        console.log('Проверка supabaseClient:', typeof supabaseClient);
    }, 1000);
}

// ===== 2. ВСЕ ФУНКЦИИ (Утилиты и Рендер) =====
function getTitle(type) {
    const titles = {
        cpu: "Процессор",
        gpu: "Видеокарта",
        ram: "Оперативная память",
        motherboard: "Материнская плата",
        cooler: "Охлаждение",
        storage: "Накопитель",
        psu: "Блок питания",
        case: "Корпус"
    };
    return titles[type] || type;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function renderComponent(type) {
    const container = document.getElementById(`${type}Container`);
    if (!container) {
        console.error(`Контейнер ${type}Container не найден`);
        return;
    }

    const items = components.filter(c => c.type === type);
    container.innerHTML = `
        <button class="w-full bg-[#18191d] border border-gray-800 rounded-2xl p-4 text-left" 
                onclick="toggleDropdown('${type}')">
            ${getTitle(type)}
        </button>
        <div id="${type}Dropdown" class="component-dropdown hidden">
            ${items.map(item => `
                <div class="p-4 hover:bg-gray-800 cursor-pointer" 
                     onclick="selectComponent('${type}', ${item.id})">
                    <div>${item.title}</div>
                    <div class="text-purple-400">
                        ${item.price.toLocaleString()} ₽
                    </div>
                </div>
            `).join("")}
        </div>
    `;
}

function toggleDropdown(type) {
    const dropdown = document.getElementById(`${type}Dropdown`);
    if (dropdown) dropdown.classList.toggle("hidden");
}

function selectComponent(type, id) {
    const component = components.find(c => c.id === id);
    if (!component) return;

    build[type] = component;
    const summaryElement = document.getElementById(`summary${capitalize(type)}`);
    if (summaryElement) {
        summaryElement.textContent = component.title;
    }

    updatePrice();
    const dropdown = document.getElementById(`${type}Dropdown`);
    if (dropdown) dropdown.classList.add("hidden");
}

function updatePrice() {
    let total = 0;
    Object.values(build).forEach(item => {
        if (item) total += item.price;
    });
    const priceElement = document.getElementById("totalPrice");
    if (priceElement) {
        priceElement.textContent = total.toLocaleString() + " ₽";
    }
}

function validateBuild() {
    if (build.cpu && build.motherboard && build.cpu.socket !== build.motherboard.socket) {
        alert("Несовместимый сокет");
        return false;
    }
    return true;
}

// ===== 3. ДАННЫЕ И СОСТОЯНИЕ =====
const build = { cpu: null, gpu: null, ram: null, motherboard: null, cooler: null, storage: null, psu: null, case: null };
let components = [];

// ===== 4. РАБОТА С СЕРВЕРОМ =====
async function saveBuild() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        alert("Войдите в аккаунт");
        return null;
    }

    const title = document.getElementById("buildName")?.value;
    if (!title?.trim()) {
        alert("Введите название сборки");
        return null;
    }

    const totalPrice = Object.values(build)
        .filter(Boolean)
        .reduce((sum, item) => sum + item.price, 0);

    const { data: customBuild, error } = await supabaseClient
        .from("custom_builds")
        .insert({ user_id: user.id, title, total_price: totalPrice })
        .select()
        .single();

    if (error) {
        console.error(error);
        alert("Ошибка при сохранении сборки");
        return null;
    }

    const items = Object.values(build)
        .filter(Boolean)
        .map(component => ({ build_id: customBuild.id, component_id: component.id }));

    await supabaseClient.from("custom_build_items").insert(items);
    return customBuild.id;
}

async function addToCart() {
    if (!validateBuild()) return;

    const buildId = await saveBuild();
    if (!buildId) return;

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        alert("Войдите в аккаунт");
        return;
    }

    const { error } = await supabaseClient
        .from("cart_items")
        .insert({ user_id: user.id, custom_build_id: buildId, quantity: 1 });

    if (error) {
        console.error(error);
        alert("Ошибка при добавлении в корзину");
        return;
    }

    alert("Сборка добавлена в корзину");
    window.location.href = "/cart";
}

// ===== 5. ЗАПУСК ПРИ ЗАГРУЗКЕ СТРАНИЦЫ =====
async function init() {
    // Ждем, пока Supabase точно загрузится, если скрипты идут асинхронно
    if (typeof supabaseClient === 'undefined') {
        setTimeout(init, 100);
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from("components")
            .select("*")
            .order("price");

        if (error) throw error;

        components = data;
        console.log("Компоненты загружены:", components);

        // Список типов для рендера
        const types = ["cpu", "gpu", "ram", "motherboard", "cooler", "storage", "psu", "case"];
        types.forEach(type => renderComponent(type));

    } catch (error) {
        console.error("Ошибка инициализации приложения:", error);
    }
}

// Регистрируем старт только после полной готовности DOM
document.addEventListener("DOMContentLoaded", init);
