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

// Группировка компонентов по типу
function groupAndSortComponents(components) {
    const grouped = {};
    components.forEach(comp => {
        if (!grouped[comp.type]) grouped[comp.type] = [];
        grouped[comp.type].push(comp);
    });
    // Сортируем по цене
    Object.keys(grouped).forEach(key => {
        grouped[key].sort((a, b) => a.price - b.price);
    });
    return grouped;
}

function renderComponent(type, items, preserveSelection = false) {
    const container = document.getElementById(`${type}Container`);
    if (!container) {
        console.error(`Контейнер ${type}Container не найден`);
        return;
    }

    const selectedId = build[type]?.id;

    container.innerHTML = `
        <button class="w-full bg-[#18191d] border border-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-left text-sm sm:text-base component-btn" 
                onclick="toggleDropdown('${type}')">
            <span class="flex items-center justify-between">
                <span>${getTitle(type)} ${build[type] ? '✅' : ''}</span>
                <svg class="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
            </span>
        </button>
        <div id="${type}Dropdown" class="component-dropdown hidden">
            ${items.map(item => `
                <div class="p-3 sm:p-4 hover:bg-gray-800 cursor-pointer ${selectedId === item.id ? 'bg-purple-900/20 border-l-4 border-purple-500' : ''}" 
                     onclick="selectComponent('${type}', ${item.id})">
                    <div class="flex items-center justify-between">
                        <span class="text-sm sm:text-base">${item.title} ${selectedId === item.id ? '✓' : ''}</span>
                        <span class="text-purple-400 text-sm sm:text-base font-medium">
                            ${item.price.toLocaleString()} ₽
                        </span>
                    </div>
                    ${item.socket ? `<div class="text-gray-500 text-xs sm:text-sm mt-1">Сокет: ${item.socket}</div>` : ''}
                    ${item.ram_type ? `<div class="text-gray-500 text-xs sm:text-sm">Тип RAM: ${item.ram_type}</div>` : ''}
                    ${item.form_factor ? `<div class="text-gray-500 text-xs sm:text-sm">Форм-фактор: ${item.form_factor}</div>` : ''}
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
    
    // ЛОГИКА АВТОПОДБОРА
    // Если выбран CPU — авто-подбираем MB и RAM
    if (type === 'cpu') {
        autoSelectCompatibleForCPU(component);
        
        // Перерисовываем зависимые компоненты
        const grouped = groupAndSortComponents(components);
        renderComponent('motherboard', grouped.motherboard || [], true);
        renderComponent('ram', grouped.ram || [], true);
        renderComponent('cooler', grouped.cooler || [], true);
    }
    
    // Если выбрана MB — проверяем совместимость с CPU
    if (type === 'motherboard' && build.cpu) {
        if (component.socket !== build.cpu.socket) {
            // MB несовместима с CPU — меняем CPU
            const grouped = groupAndSortComponents(components);
            const compatibleCPU = (grouped.cpu || []).find(cpu => cpu.socket === component.socket);
            if (compatibleCPU) {
                build.cpu = compatibleCPU;
                console.log(`Автозамена CPU: ${compatibleCPU.title} (сокет: ${compatibleCPU.socket})`);
                
                // После смены CPU — авто-подбор RAM
                if (component.ram_type) {
                    const compatibleRAM = (grouped.ram || []).find(ram => ram.ram_type === component.ram_type);
                    if (compatibleRAM) {
                        build.ram = compatibleRAM;
                        console.log(`Автовыбор RAM: ${compatibleRAM.title} (${compatibleRAM.ram_type})`);
                    }
                }
                
                // Подбираем охлаждение по сокету
                const compatibleCooler = (grouped.cooler || []).find(cooler => 
                    cooler.socket === compatibleCPU.socket || cooler.socket === 'universal'
                );
                if (compatibleCooler) {
                    build.cooler = compatibleCooler;
                    console.log(`Автовыбор Cooler: ${compatibleCooler.title} (сокет: ${compatibleCooler.socket})`);
                }
                
                // Перерисовываем всё
                renderComponent('cpu', grouped.cpu || [], true);
                renderComponent('ram', grouped.ram || [], true);
                renderComponent('cooler', grouped.cooler || [], true);
            }
        } else {
            // MB совместима — просто обновляем RAM
            const grouped = groupAndSortComponents(components);
            if (component.ram_type) {
                const compatibleRAM = (grouped.ram || []).find(ram => ram.ram_type === component.ram_type);
                if (compatibleRAM && (!build.ram || build.ram.ram_type !== component.ram_type)) {
                    build.ram = compatibleRAM;
                    console.log(`Автовыбор RAM: ${compatibleRAM.title} (${compatibleRAM.ram_type})`);
                }
            }
            renderComponent('ram', grouped.ram || [], true);
        }
    }
    
    // Обновляем сумму в интерфейсе
    updatePrice();
    updateAllSummaries();
    
    // Закрываем выпадающий список
    const dropdown = document.getElementById(`${type}Dropdown`);
    if (dropdown) dropdown.classList.add("hidden");
    
    // Проверяем совместимость
    checkCompatibility();
}

// Функция автоподбора совместимых компонентов для CPU
function autoSelectCompatibleForCPU(cpu) {
    if (!cpu) return;
    
    const grouped = groupAndSortComponents(components);
    
    // Подбираем материнскую плату по сокету
    const compatibleMB = (grouped.motherboard || []).find(mb => mb.socket === cpu.socket);
    if (compatibleMB) {
        build.motherboard = compatibleMB;
        console.log(`Автовыбор MB: ${compatibleMB.title} (сокет: ${compatibleMB.socket})`);
        
        // Подбираем RAM по типу памяти материнской платы
        if (compatibleMB.ram_type) {
            const compatibleRAM = (grouped.ram || []).find(ram => ram.ram_type === compatibleMB.ram_type);
            if (compatibleRAM) {
                build.ram = compatibleRAM;
                console.log(`Автовыбор RAM: ${compatibleRAM.title} (${compatibleRAM.ram_type})`);
            }
        }
    }
    
    // Подбираем охлаждение по сокету (или универсальное)
    const compatibleCooler = (grouped.cooler || []).find(cooler => 
        cooler.socket === cpu.socket || cooler.socket === 'universal' || !cooler.socket
    );
    if (compatibleCooler) {
        build.cooler = compatibleCooler;
        console.log(`Автовыбор Cooler: ${compatibleCooler.title} (сокет: ${compatibleCooler.socket || 'универсальный'})`);
    }
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

function updateAllSummaries() {
    const types = ["cpu", "gpu", "ram", "motherboard", "cooler", "storage", "psu", "case"];
    types.forEach(type => {
        const summaryElement = document.getElementById(`summary${capitalize(type)}`);
        if (summaryElement && build[type]) {
            summaryElement.textContent = build[type].title;
        } else if (summaryElement) {
            summaryElement.textContent = "Не выбран";
        }
    });
}

function validateBuild() {
    if (build.cpu && build.motherboard && build.cpu.socket !== build.motherboard.socket) {
        alert("Несовместимый сокет!");
        return false;
    }
    
    // Проверка на наличие всех компонентов
    const required = ["cpu", "motherboard", "ram", "psu", "case"];
    const missing = required.filter(type => !build[type]);
    if (missing.length > 0) {
        alert(`Выберите все обязательные компоненты: ${missing.map(t => getTitle(t)).join(", ")}`);
        return false;
    }
    
    return true;
}

function checkCompatibility() {
    const issues = [];
    let isCompatible = true;
    
    // Проверка сокета CPU и MB
    if (build.cpu && build.motherboard) {
        if (build.cpu.socket !== build.motherboard.socket) {
            issues.push(`❌ Сокет CPU (${build.cpu.socket}) не совместим с сокетом MB (${build.motherboard.socket})`);
            isCompatible = false;
        }
    }
    
    // Проверка типа RAM
    if (build.motherboard && build.ram) {
        if (build.motherboard.ram_type && build.ram.ram_type) {
            if (build.ram.ram_type !== build.motherboard.ram_type) {
                issues.push(`❌ Тип RAM (${build.ram.ram_type}) не совместим с MB (${build.motherboard.ram_type})`);
                isCompatible = false;
            }
        }
    }
    
    // Проверка охлаждения
    if (build.cpu && build.cooler) {
        if (build.cooler.socket && build.cooler.socket !== 'universal' && build.cooler.socket !== build.cpu.socket) {
            issues.push(`⚠️ Охлаждение (сокет: ${build.cooler.socket}) не подходит для CPU (сокет: ${build.cpu.socket})`);
        }
    }
    
    // Проверка форм-фактора корпуса и материнской платы
    if (build.case && build.motherboard) {
        if (build.case.form_factor && build.motherboard.form_factor) {
            // Простая проверка - обычно корпус поддерживает несколько форм-факторов
            // Это упрощенная версия, можно доработать
        }
    }
    
    // Отображаем предупреждения
    const warningElement = document.getElementById("compatibilityWarnings");
    if (warningElement) {
        if (issues.length > 0) {
            warningElement.innerHTML = issues.join("<br>");
            warningElement.classList.remove("hidden");
            warningElement.style.color = "#ef4444";
        } else if (build.cpu && build.motherboard && build.ram) {
            warningElement.innerHTML = "Все компоненты совместимы!";
            warningElement.classList.remove("hidden");
            warningElement.style.color = "#4ade80";
        } else {
            warningElement.innerHTML = "⚠️ Выберите основные компоненты для проверки совместимости";
            warningElement.classList.remove("hidden");
            warningElement.style.color = "#f59e0b";
        }
    }
    
    return isCompatible;
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
    // Ждем, пока Supabase точно загрузится
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
        const grouped = groupAndSortComponents(components);
        types.forEach(type => {
            renderComponent(type, grouped[type] || []);
        });

        // Добавляем кнопку для ручной проверки совместимости
        const checkBtn = document.getElementById("checkCompatibilityBtn");
        if (checkBtn) {
            checkBtn.addEventListener("click", checkCompatibility);
        }

        // Добавляем кнопку для сброса сборки
        const resetBtn = document.getElementById("resetBuildBtn");
        if (resetBtn) {
            resetBtn.addEventListener("click", resetBuild);
        }

        console.log("Приложение инициализировано");

    } catch (error) {
        console.error("Ошибка инициализации приложения:", error);
    }
}

// Функция сброса сборки
function resetBuild() {
    if (!confirm("Очистить все выбранные компоненты?")) return;
    
    Object.keys(build).forEach(key => {
        build[key] = null;
    });
    
    const grouped = groupAndSortComponents(components);
    const types = ["cpu", "gpu", "ram", "motherboard", "cooler", "storage", "psu", "case"];
    types.forEach(type => {
        renderComponent(type, grouped[type] || []);
    });
    
    updatePrice();
    updateAllSummaries();
    
    const warningElement = document.getElementById("compatibilityWarnings");
    if (warningElement) {
        warningElement.classList.add("hidden");
    }
    
    console.log("Сборка сброшена");
}

// Регистрируем старт только после полной готовности DOM
document.addEventListener("DOMContentLoaded", init);