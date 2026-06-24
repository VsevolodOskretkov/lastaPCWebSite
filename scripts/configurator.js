const build = {
  cpu: null,
  gpu: null,
  ram: null,
  motherboard: null,
  cooler: null,
  storage: null,
  psu: null,
  case: null
};

    let components = [];

async function loadComponents() {
  const { data, error } = await supabaseClient
    .from("components")
    .select("*")
    .order("price");

  if (error) {
    console.error(error);
    return;
  }

  components = data;

  renderComponent("cpu");
  renderComponent("gpu");
  renderComponent("ram");
  renderComponent("motherboard");
  renderComponent("cooler");
  renderComponent("storage");
  renderComponent("psu");
  renderComponent("case");
}

document.addEventListener("DOMContentLoaded", loadComponents);

function renderComponent(type) {

  const container =
    document.getElementById(`${type}Container`);

  const items = components.filter(
    c => c.type === type
  );

  container.innerHTML = `
  
  <button
    class="w-full bg-[#18191d] border border-gray-800 rounded-2xl p-4 text-left"
    onclick="toggleDropdown('${type}')"
  >
    ${getTitle(type)}
  </button>

  <div
    id="${type}Dropdown"
    class="component-dropdown hidden"
  >
    ${items.map(item => `
    
      <div
        class="p-4 hover:bg-gray-800 cursor-pointer"
        onclick="selectComponent('${type}', ${item.id})"
      >
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

  document
    .getElementById(`${type}Dropdown`)
    .classList
    .toggle("hidden");

}

function selectComponent(type, id) {

  const component =
    components.find(c => c.id === id);

  build[type] = component;

  document.getElementById(
    `summary${capitalize(type)}`
  ).textContent = component.title;

  updatePrice();

  document
    .getElementById(`${type}Dropdown`)
    .classList.add("hidden");
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function updatePrice() {

  let total = 0;

  Object.values(build).forEach(item => {

    if (item) {
      total += item.price;
    }

  });

  document.getElementById(
    "totalPrice"
  ).textContent =
    total.toLocaleString() + " ₽";
}

function validateBuild() {

  if (
    build.cpu &&
    build.motherboard &&
    build.cpu.socket !== build.motherboard.socket
  ) {

    alert("Несовместимый сокет");

    return false;
  }

  return true;
}

async function saveBuild() {

  const {
    data: { user }
  } = await supabaseClient.auth.getUser();

  if (!user) {
    alert("Войдите в аккаунт");
    return null;
  }

  const title =
    document.getElementById("buildName").value;

  if (!title.trim()) {
    return null;
  }

  const totalPrice =
    Object.values(build)
      .filter(Boolean)
      .reduce((sum, item) =>
        sum + item.price, 0);

  const { data: customBuild, error } =
    await supabaseClient
      .from("custom_builds")
      .insert({
        user_id: user.id,
        title,
        total_price: totalPrice
      })
      .select()
      .single();

  if (error) {
    console.error(error);
    return null;
  }

  const items = Object.values(build)
    .filter(Boolean)
    .map(component => ({
      build_id: customBuild.id,
      component_id: component.id
    }));

  await supabaseClient
    .from("custom_build_items")
    .insert(items);

  return customBuild.id;
}

async function addToCart() {

  if (!validateBuild()) {
    return;
  }

  const buildId = await saveBuild();

  if (!buildId) {
    return;
  }

  const {
    data: { user }
  } = await supabaseClient.auth.getUser();

  const { error } =
    await supabaseClient
      .from("cart_items")
      .insert({
        user_id: user.id,
        custom_build_id: buildId,
        quantity: 1
      });

  if (error) {
    console.error(error);
    alert("Ошибка");
    return;
  }

  alert("Сборка добавлена в корзину");

  window.location.href = "/cart";
}