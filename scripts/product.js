// Получаем ID товара из URL
const params = new URLSearchParams(window.location.search);
const id = params.get("id");

/* Загружает данные товара из Supabase*/
async function loadProduct() {
    const { data: product, error } = await supabaseClient
        .from("computers")
        .select("*")
        .eq("id", id)
        .single();

    console.log(product);
    console.log(error);

    // Если товар не найден
    if (error || !product) {
        document.getElementById("productContainer").innerHTML = `
            <div class="text-center py-40 text-3xl">
                Товар не найден
            </div>
        `;

        return;
    }

    renderProduct(product);
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
                <div class="bg-[#1f2024] border border-gray-800 rounded-xl p-5">
                    <p class="text-gray-200 leading-relaxed">
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
                    <div class="bg-[#1f2024] border border-gray-800 rounded-xl p-4">
                        <p class="text-gray-400 text-xs mb-2 truncate">
                            ${game}
                        </p>

                        <p class="text-xl font-bold text-purple-400">
                            ${fps}
                        </p>
                    </div>
                `
              )
              .join("")
        : "";

    // Основная разметка страницы товара
    document.getElementById("productContainer").innerHTML = `
        <section class="max-w-7xl mx-auto px-8 py-20">

            <!-- Основная информация о товаре -->
            <div class="grid lg:grid-cols-2 gap-16 items-start">

                <!-- Изображение -->
                <div class="bg-[#1a1b1f] rounded-3xl p-8 border border-gray-800">
                    <img
                        src="${product.image}"
                        class="w-full rounded-2xl object-cover"
                    >
                </div>

                <!-- Информация -->
                <div>
                    <p class="uppercase tracking-[5px] text-purple-400 mb-4">
                        ${product.category}
                    </p>

                    <h1 class="text-6xl font-bold mb-6">
                        ${product.title}
                    </h1>

                    <p class="text-gray-400 text-2xl leading-relaxed mb-10">
                        ${product.short_description || ""}
                    </p>

                    <div class="flex items-center gap-6 mb-10">
                        <div class="text-5xl font-bold">
                            ${product.price.toLocaleString("ru-RU")} ₽
                        </div>

                        <div class="text-green-400 text-sm">
                            В наличии
                        </div>
                    </div>

                    <button
                        onclick="addToCart('${product.id}')"
                        class="bg-purple-600 hover:bg-purple-700 transition px-12 py-4 rounded-2xl text-lg"
                    >
                        Купить
                    </button>
                </div>

            </div>

            <!-- Производительность -->
            <div class="mt-14">

                <h2 class="text-2xl mb-6">
                    Производительность в играх
                </h2>

                <div class="grid grid-cols-2 gap-4">
                    ${fpsHtml}
                </div>

            </div>

            <!-- Описание -->
            <div class="mt-24">

                <h2 class="text-4xl mb-10">
                    Описание
                </h2>

                <div class="bg-[#1a1b1f] border border-gray-800 rounded-3xl p-10">

                    <div class="text-gray-300 text-lg leading-9">
                        ${
                            product.description
                                ? product.description.replace(/\n/g, "<br>")
                                : "Описание отсутствует"
                        }
                    </div>

                </div>

            </div>

            <!-- Преимущества -->
            <div class="mt-24">

                <h2 class="text-4xl mb-10">
                    Преимущества
                </h2>

                <div class="grid md:grid-cols-2 gap-6">
                    ${featuresHtml}
                </div>

            </div>

            <!-- Характеристики -->
            <div class="mt-24">

                <h2 class="text-4xl mb-10">
                    Характеристики
                </h2>

                <div class="bg-[#1a1b1f] border border-gray-800 rounded-3xl overflow-hidden">

                    <div class="grid grid-cols-2 border-b border-gray-800 p-6">
                        <div class="text-gray-400">Процессор</div>
                        <div>${product.cpu}</div>
                    </div>

                    <div class="grid grid-cols-2 border-b border-gray-800 p-6">
                        <div class="text-gray-400">Видеокарта</div>
                        <div>${product.gpu}</div>
                    </div>

                    <div class="grid grid-cols-2 border-b border-gray-800 p-6">
                        <div class="text-gray-400">Оперативная память</div>
                        <div>${product.ram}</div>
                    </div>

                    <div class="grid grid-cols-2 border-b border-gray-800 p-6">
                        <div class="text-gray-400">Накопитель</div>
                        <div>${product.storage}</div>
                    </div>

                    <div class="grid grid-cols-2 p-6">
                        <div class="text-gray-400">ОС</div>
                        <div>${product.windows || "Не указано"}</div>
                    </div>

                </div>

            </div>

        </section>
    `;
}

// Запуск загрузки товара при открытии страницы
loadProduct();