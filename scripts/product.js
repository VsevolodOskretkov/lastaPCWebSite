// Получаем ID товара из URL
const params = new URLSearchParams(window.location.search);
const id = params.get("id");

/* Загружает данные товара из Supabase */
async function loadProduct() {
    try {
        const { data: product, error } = await supabaseClient
            .from("computers")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !product) {
            document.getElementById("productContainer").innerHTML = `
                <div class="text-center py-20 sm:py-40 text-2xl sm:text-3xl">
                    Товар не найден
                </div>
            `;
            return;
        }

        renderProduct(product);
    } catch (error) {
        console.error('Ошибка загрузки товара:', error);
        document.getElementById("productContainer").innerHTML = `
            <div class="text-center py-20 sm:py-40 text-2xl sm:text-3xl">
                ❌ Ошибка загрузки товара
            </div>
        `;
    }
}

/**
 * Отрисовывает страницу товара
 * @param {Object} product
 */
function renderProduct(product) {
    // Блок преимуществ
    const featuresHtml = product.features
        ?.map(
            (feature) => `
                <div class="bg-[#1f2024] border border-gray-800 rounded-xl p-4 sm:p-5">
                    <p class="text-gray-200 leading-relaxed text-sm sm:text-base">
                        ${feature}
                    </p>
                </div>
            `
        )
        .join("");

    // Блок FPS в играх
    const fpsHtml = product.fps
        ? Object.entries(product.fps)
              .map(
                  ([game, fps]) => `
                    <div class="bg-[#1f2024] border border-gray-800 rounded-xl p-3 sm:p-4">
                        <p class="text-gray-400 text-[10px] sm:text-xs mb-1 sm:mb-2 truncate">
                            ${game}
                        </p>
                        <p class="text-lg sm:text-xl font-bold text-purple-400">
                            ${fps}
                        </p>
                    </div>
                `
              )
              .join("")
        : "";

    // Основная разметка страницы товара
    document.getElementById("productContainer").innerHTML = `
        <section class="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 md:py-20 product-padding">

            <!-- Основная информация о товаре -->
            <div class="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-start">

                <!-- Изображение -->
                <div class="bg-[#1a1b1f] rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-gray-800">
                    <img
                        src="${product.image}"
                        alt="${product.title}"
                        class="w-full rounded-xl sm:rounded-2xl object-cover"
                        loading="lazy"
                        onerror="this.src='/src/img/placeholder.webp'"
                    >
                </div>

                <!-- Информация -->
                <div>
                    <p class="uppercase tracking-[3px] sm:tracking-[5px] text-purple-400 mb-3 sm:mb-4 text-xs sm:text-sm">
                        ${product.category}
                    </p>

                    <h1 class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 product-title">
                        ${product.title}
                    </h1>

                    <p class="text-gray-400 text-base sm:text-lg md:text-2xl leading-relaxed mb-6 sm:mb-10">
                        ${product.short_description || ""}
                    </p>

                    <div class="flex flex-wrap items-center gap-4 sm:gap-6 mb-6 sm:mb-10">
                        <div class="text-3xl sm:text-4xl md:text-5xl font-bold product-price">
                            ${product.price.toLocaleString("ru-RU")} ₽
                        </div>

                        <div class="text-green-400 text-xs sm:text-sm">
                            В наличии
                        </div>
                    </div>

                    <button
                        onclick="addToCart('${product.id}')"
                        class="bg-purple-600 hover:bg-purple-700 transition px-8 sm:px-12 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-base sm:text-lg w-full sm:w-auto"
                    >
                        Купить
                    </button>
                </div>

            </div>

            <!-- Производительность -->
            ${product.fps ? `
            <div class="mt-12 sm:mt-14">

                <h2 class="text-xl sm:text-2xl mb-4 sm:mb-6 product-section-title">
                    Производительность в играх
                </h2>

                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                    ${fpsHtml}
                </div>

            </div>
            ` : ''}

            <!-- Описание -->
            ${product.description ? `
            <div class="mt-16 sm:mt-24">

                <h2 class="text-2xl sm:text-3xl md:text-4xl mb-6 sm:mb-10 product-section-title">
                    Описание
                </h2>

                <div class="bg-[#1a1b1f] border border-gray-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10">

                    <div class="text-gray-300 text-base sm:text-lg leading-7 sm:leading-9">
                        ${product.description.replace(/\n/g, "<br>")}
                    </div>

                </div>

            </div>
            ` : ''}

            <!-- Преимущества -->
            ${product.features ? `
            <div class="mt-16 sm:mt-24">

                <h2 class="text-2xl sm:text-3xl md:text-4xl mb-6 sm:mb-10 product-section-title">
                    Преимущества
                </h2>

                <div class="grid sm:grid-cols-2 gap-4 sm:gap-6">
                    ${featuresHtml}
                </div>

            </div>
            ` : ''}

            <!-- Характеристики -->
            <div class="mt-16 sm:mt-24">

                <h2 class="text-2xl sm:text-3xl md:text-4xl mb-6 sm:mb-10 product-section-title">
                    Характеристики
                </h2>

                <div class="bg-[#1a1b1f] border border-gray-800 rounded-2xl sm:rounded-3xl overflow-hidden">

                    <div class="grid grid-cols-1 sm:grid-cols-2 border-b border-gray-800 p-4 sm:p-6">
                        <div class="text-gray-400 text-sm sm:text-base">Процессор</div>
                        <div class="text-sm sm:text-base mt-1 sm:mt-0">${product.cpu || '—'}</div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 border-b border-gray-800 p-4 sm:p-6">
                        <div class="text-gray-400 text-sm sm:text-base">Видеокарта</div>
                        <div class="text-sm sm:text-base mt-1 sm:mt-0">${product.gpu || '—'}</div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 border-b border-gray-800 p-4 sm:p-6">
                        <div class="text-gray-400 text-sm sm:text-base">Оперативная память</div>
                        <div class="text-sm sm:text-base mt-1 sm:mt-0">${product.ram || '—'}</div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 border-b border-gray-800 p-4 sm:p-6">
                        <div class="text-gray-400 text-sm sm:text-base">Накопитель</div>
                        <div class="text-sm sm:text-base mt-1 sm:mt-0">${product.storage || '—'}</div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 p-4 sm:p-6">
                        <div class="text-gray-400 text-sm sm:text-base">ОС</div>
                        <div class="text-sm sm:text-base mt-1 sm:mt-0">${product.windows || 'Не указано'}</div>
                    </div>

                </div>

            </div>

        </section>
    `;
}

// Запуск загрузки товара при открытии страницы
loadProduct();