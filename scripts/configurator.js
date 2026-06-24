// configurator.js
document.addEventListener('DOMContentLoaded', function() {
    // Проверка наличия Supabase клиента
    if (typeof window.supabaseClient === 'undefined') {
        console.error('❌ Supabase клиент не найден!');
        return;
    }

    const supabase = window.supabaseClient;
    
    // Состояние конструктора
    const state = {
        components: {
            cpu: null,
            gpu: null,
            ram: null,
            motherboard: null,
            cooler: null,
            storage: null,
            psu: null,
            case: null
        },
        totalPrice: 0,
        buildName: ''
    };

    // Контейнеры для компонентов
    const containers = {
        cpu: document.getElementById('cpuContainer'),
        gpu: document.getElementById('gpuContainer'),
        ram: document.getElementById('ramContainer'),
        motherboard: document.getElementById('motherboardContainer'),
        cooler: document.getElementById('coolerContainer'),
        storage: document.getElementById('storageContainer'),
        psu: document.getElementById('psuContainer'),
        case: document.getElementById('caseContainer')
    };

    // Элементы для отображения summary
    const summaryElements = {
        cpu: document.getElementById('summaryCpu'),
        gpu: document.getElementById('summaryGpu'),
        ram: document.getElementById('summaryRam'),
        motherboard: document.getElementById('summaryMotherboard'),
        cooler: document.getElementById('summaryCooler'),
        storage: document.getElementById('summaryStorage'),
        psu: document.getElementById('summaryPsu'),
        case: document.getElementById('summaryCase')
    };

    // Названия компонентов для отображения
    const componentLabels = {
        cpu: 'Процессор',
        gpu: 'Видеокарта',
        ram: 'Оперативная память',
        motherboard: 'Материнская плата',
        cooler: 'Охлаждение',
        storage: 'Накопитель',
        psu: 'Блок питания',
        case: 'Корпус'
    };

    // Загрузка компонентов из БД
    async function loadComponents() {
        try {
            const { data, error } = await supabase
                .from('components')
                .select('*')
                .order('price', { ascending: true });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Ошибка загрузки компонентов:', error);
            return [];
        }
    }

    // Создание UI для компонента
    function createComponentUI(type, components) {
        const container = containers[type];
        if (!container) return;

        const typeComponents = components.filter(c => c.type === type);
        
        // Создаем основной контейнер
        const wrapper = document.createElement('div');
        wrapper.className = 'bg-[#18191d] rounded-2xl border border-gray-800 p-4 relative';
        
        // Заголовок с кнопкой
        const header = document.createElement('div');
        header.className = 'flex justify-between items-center cursor-pointer';
        header.onclick = () => toggleDropdown(type);
        
        const label = document.createElement('span');
        label.className = 'text-sm text-gray-400 uppercase tracking-wider';
        label.textContent = componentLabels[type];
        
        const button = document.createElement('button');
        button.className = 'text-purple-400 hover:text-purple-300 transition';
        button.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
        `;
        button.id = `dropdownBtn-${type}`;
        
        header.appendChild(label);
        header.appendChild(button);
        
        // Выбранный компонент
        const selected = document.createElement('div');
        selected.className = 'mt-2 text-sm text-gray-300';
        selected.id = `selected-${type}`;
        selected.textContent = 'Не выбран';
        
        // Выпадающий список
        const dropdown = document.createElement('div');
        dropdown.className = 'component-dropdown hidden';
        dropdown.id = `dropdown-${type}`;
        
        // Заполняем выпадающий список
        typeComponents.forEach(comp => {
            const item = document.createElement('div');
            item.className = 'px-4 py-3 hover:bg-purple-500/10 cursor-pointer transition border-b border-gray-700/50 last:border-0';
            item.onclick = () => selectComponent(type, comp);
            
            const title = document.createElement('div');
            title.className = 'font-medium text-white';
            title.textContent = comp.title;
            
            const info = document.createElement('div');
            info.className = 'flex justify-between text-xs text-gray-400 mt-1';
            
            const price = document.createElement('span');
            price.textContent = `${comp.price.toLocaleString()} ₽`;
            
            const specs = document.createElement('span');
            const specParts = [];
            if (comp.socket) specParts.push(comp.socket);
            if (comp.ram_type) specParts.push(comp.ram_type);
            if (comp.chipset) specParts.push(comp.chipset);
            if (comp.form_factor) specParts.push(comp.form_factor);
            specs.textContent = specParts.join(' • ');
            
            info.appendChild(specs);
            info.appendChild(price);
            
            item.appendChild(title);
            item.appendChild(info);
            dropdown.appendChild(item);
        });
        
        wrapper.appendChild(header);
        wrapper.appendChild(selected);
        wrapper.appendChild(dropdown);
        
        container.innerHTML = '';
        container.appendChild(wrapper);
    }

    // Переключение выпадающего списка
    function toggleDropdown(type) {
        const dropdown = document.getElementById(`dropdown-${type}`);
        const btn = document.getElementById(`dropdownBtn-${type}`);
        
        if (dropdown.classList.contains('hidden')) {
            // Закрываем все другие дропдауны
            document.querySelectorAll('.component-dropdown').forEach(d => {
                if (d.id !== `dropdown-${type}`) {
                    d.classList.add('hidden');
                }
            });
            
            dropdown.classList.remove('hidden');
            btn.querySelector('svg').style.transform = 'rotate(180deg)';
        } else {
            dropdown.classList.add('hidden');
            btn.querySelector('svg').style.transform = 'rotate(0deg)';
        }
    }

    // Выбор компонента
    function selectComponent(type, component) {
        state.components[type] = component;
        
        // Обновляем отображение
        const selected = document.getElementById(`selected-${type}`);
        selected.textContent = `${component.title} (${component.price.toLocaleString()} ₽)`;
        
        // Закрываем дропдаун
        const dropdown = document.getElementById(`dropdown-${type}`);
        const btn = document.getElementById(`dropdownBtn-${type}`);
        dropdown.classList.add('hidden');
        btn.querySelector('svg').style.transform = 'rotate(0deg)';
        
        // Обновляем summary
        const summaryEl = summaryElements[type];
        summaryEl.textContent = component.title;
        summaryEl.className = 'truncate font-semibold text-base text-white';
        
        // Обновляем общую цену
        updateTotalPrice();
    }

    // Обновление общей цены
    function updateTotalPrice() {
        let total = 0;
        for (const key in state.components) {
            if (state.components[key]) {
                total += state.components[key].price;
            }
        }
        state.totalPrice = total;
        document.getElementById('totalPrice').textContent = `${total.toLocaleString()} ₽`;
    }

    // Добавление в корзину
    window.addToCart = async function() {
        // Проверка названия сборки
        const buildNameInput = document.getElementById('buildName');
        const buildNameError = document.getElementById('buildNameError');
        const buildName = buildNameInput.value.trim();
        
        if (!buildName) {
            buildNameError.classList.remove('hidden');
            buildNameInput.focus();
            return;
        }
        buildNameError.classList.add('hidden');
        
        // Проверка, что выбраны все компоненты
        const missingComponents = [];
        for (const key in state.components) {
            if (!state.components[key]) {
                missingComponents.push(componentLabels[key]);
            }
        }
        
        if (missingComponents.length > 0) {
            alert(`Пожалуйста, выберите все компоненты!\nОтсутствуют: ${missingComponents.join(', ')}`);
            return;
        }
        
        try {
            // Получение текущего пользователя
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !user) {
                alert('Пожалуйста, войдите в аккаунт для добавления в корзину');
                window.location.href = '/login';
                return;
            }
            
            // Создание сборки
            const { data: buildData, error: buildError } = await supabase
                .from('custom_builds')
                .insert({
                    user_id: user.id,
                    title: buildName,
                    total_price: state.totalPrice
                })
                .select()
                .single();
            
            if (buildError) throw buildError;
            
            // Добавление компонентов в сборку
            const buildItems = Object.values(state.components).map(comp => ({
                build_id: buildData.id,
                component_id: comp.id
            }));
            
            const { error: itemsError } = await supabase
                .from('custom_build_items')
                .insert(buildItems);
            
            if (itemsError) throw itemsError;
            
            // Добавление в корзину
            const { error: cartError } = await supabase
                .from('cart_items')
                .insert({
                    user_id: user.id,
                    custom_build_id: buildData.id,
                    quantity: 1
                });
            
            if (cartError) throw cartError;
            
            alert('Сборка успешно добавлена в корзину!');
            window.location.href = '/cart';
            
        } catch (error) {
            console.error('Ошибка при добавлении в корзину:', error);
            alert('Произошла ошибка при добавлении в корзину. Пожалуйста, попробуйте позже.');
        }
    };

    // Инициализация
    async function init() {
        const components = await loadComponents();
        
        if (components.length === 0) {
            // Если компонентов нет, показываем заглушку
            for (const key in containers) {
                containers[key].innerHTML = `
                    <div class="bg-[#18191d] rounded-2xl border border-gray-800 p-4">
                        <div class="text-sm text-gray-400 uppercase tracking-wider">${componentLabels[key]}</div>
                        <div class="mt-2 text-sm text-gray-500">Нет компонентов</div>
                    </div>
                `;
            }
            return;
        }
        
        // Создаем UI для каждого типа
        for (const key in containers) {
            createComponentUI(key, components);
        }
    }

    // Закрытие дропдаунов при клике вне
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.component-container')) {
            document.querySelectorAll('.component-dropdown').forEach(d => {
                d.classList.add('hidden');
                const btn = document.getElementById(`dropdownBtn-${d.id.replace('dropdown-', '')}`);
                if (btn) {
                    btn.querySelector('svg').style.transform = 'rotate(0deg)';
                }
            });
        }
    });

    // Инициализация
    init();
});