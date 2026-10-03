async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function showPopup(message, callback) {
  popupText.textContent = message;
  popup.classList.remove("hidden");

  setTimeout(function () {
    popup.classList.add("hidden");
    if (callback) callback();
  }, 1500);
}

function renderParts() {
  const parts = JSON.parse(localStorage.getItem("parts")) || [];
  const partsListEl = document.getElementById("parts-list");
  const totalQtyNumber = document.getElementById("total-quantity-number");

  partsListEl.innerHTML = "";

  parts.forEach(function (part, index) {
    const card = document.createElement("div");
    card.className = "part-card";
    card.innerHTML = `
  <strong class="part-name-btn" data-index="${index}">${part.name}</strong><br>
  Quantity: ${part.quantity}<br>
  Buy: ${part.buyPrice} | Sell: ${part.sellPrice}<br>
  <button class="stock-in-btn" data-index="${index}">+ Stock in</button>
  <button class="stock-out-btn" data-index="${index}">- Stock out</button>
  `;
    partsListEl.appendChild(card);
  });

  totalQtyNumber.textContent = parts.length;
}

function openStockPopup(title) {
  const parts = JSON.parse(localStorage.getItem("parts")) || [];
  const part = parts[currentPartIndex];

  stockPopupTitle.textContent = title;
  stockPopupInfo.textContent = part.name + " — Current quantity: " + part.quantity;
  stockQtyInput.value = "";

  if (currentAction === "out") {
    priceePaidSection.classList.remove("hidden");
    pricePaidInput.value = part.sellPrice;
  } else {
    priceePaidSection.classList.add("hidden");
  }
  stockPopup.classList.remove("hidden");
}

function renderHistory() {
  const transactions = JSON.parse(localStorage.getItem("transactions")) || [];
  const historyList = document.getElementById("history-list");
  historyList.innerHTML = "";

  transactions.slice().reverse().forEach(function (t, reversedIndex) {
    const realIndex = transactions.length - 1 - reversedIndex;

    const item = document.createElement("div");
    item.className = "history-item";

    let contentHTML = "";
    if (t.action === "in") {
      contentHTML = `
        <strong>${t.partName}</strong> + ${t.quantity}<br>
        <small>Stocked in · ${t.date}</small>
      `;
    } else {
      contentHTML = `
        <strong>${t.partName}</strong> - ${t.quantity}<br>
        <small>Declared: ${t.declaredPrice} · Paid: ${t.pricePaid}</small><br>
        <small>Profit: ${t.profit}</small><br>
        <small>${t.date}</small>
      `;
    }

    item.innerHTML = `
      <input type="checkbox" class="history-checkbox hidden" data-index="${realIndex}">
      ${contentHTML}
    `;

    historyList.appendChild(item);
  });
}

console.log("app.js loaded");

const loginMessage = document.getElementById("login-message");
const loginBtn = document.getElementById("login-btn");
const loginScreen = document.getElementById("login-screen");  
const homeScreen = document.getElementById("home-screen"); 
const popup = document.getElementById("popup");
const popupText = document.getElementById("popup-text");

const addPartBtn = document.getElementById("add-part-btn");
const partPopup = document.getElementById("part-popup");
const partCancelBtn = document.getElementById("part-cancel-btn");

const partSaveBtn = document.getElementById("part-save-btn");

const partsList = document.getElementById("parts-list");
const stockPopup = document.getElementById("stock-popup");
const stockPopupTitle = document.getElementById("stock-popup-title");
const stockPopupInfo = document.getElementById("stock-popup-info");
const stockQtyInput = document.getElementById("stock-qty");
const stockConfirmBtn = document.getElementById("stock-confirm-btn");
const stockCancelBtn = document.getElementById("stock-cancel-btn");

const priceePaidSection = document.getElementById("price-paid-section");
const pricePaidInput = document.getElementById("price-paid");

const historyScreen = document.getElementById("history-screen");
const viewHistoryBtn = document.getElementById("view-history-btn");

const editPopup = document.getElementById("edit-popup");
const editNameInput = document.getElementById("edit-name");
const editQtyInput = document.getElementById("edit-qty");
const editBuyInput = document.getElementById("edit-buy");
const editSellInput = document.getElementById("edit-sell");
const editSaveBtn = document.getElementById("edit-save-btn");
const editDeleteBtn = document.getElementById("edit-delete-btn");
const editCancelBtn = document.getElementById("edit-cancel-btn");

const clearHistoryBtn = document.getElementById("clear-history-btn");
const deleteSelectedBtn = document.getElementById("delete-selected-btn");

let currentPartIndex = null;
let currentAction = null;
let selectMode = false;

loginBtn.addEventListener("click", async function () {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  if (!emailInput.checkValidity()) {
    emailInput.reportValidity();
    return;
  }

  if (!passwordInput.checkValidity()) {
    passwordInput.reportValidity();
    return;
  }

  const email = emailInput.value;
  const password = passwordInput.value;
  const hashedPassword = await hashPassword(password);

  const savedEmail = localStorage.getItem("email");
  const savedPassword = localStorage.getItem("password");

  if (!savedEmail) {
    localStorage.setItem("email", email);
    localStorage.setItem("password", hashedPassword);
    showPopup("Account created successfully!", function () {
      loginScreen.classList.add("hidden");
      homeScreen.classList.remove("hidden");
      renderParts();
    });

  } else {
    if (email === savedEmail && hashedPassword === savedPassword) {
      showPopup("Sign in successful!", function () {
        loginScreen.classList.add("hidden");
        homeScreen.classList.remove("hidden");
        renderParts();
      });
    } else {
      showPopup("Wrong email or password.");
    }
  }
});

addPartBtn.addEventListener("click", function () {
  partPopup.classList.remove("hidden");
});

partCancelBtn.addEventListener("click", function () {
  partPopup.classList.add("hidden");
});

partSaveBtn.addEventListener("click", function () {
  const nameInput = document.getElementById("part-name");
  const qtyInput = document.getElementById("part-qty");
  const buyInput = document.getElementById("part-buy");
  const sellInput = document.getElementById("part-sell");

 const fields = [nameInput, qtyInput, buyInput, sellInput];
for (const field of fields) {
  if (!field.checkValidity()) {
    field.reportValidity();
    return;
  }
}

  const newPart = {
    name: nameInput.value,
    quantity: Number(qtyInput.value),
    buyPrice: Number(buyInput.value),
    sellPrice: Number(sellInput.value)
  };

  const parts = JSON.parse(localStorage.getItem("parts")) || [];
  parts.push(newPart);
  localStorage.setItem("parts", JSON.stringify(parts));

  console.log("Part saved:", newPart);
  console.log("All parts:", parts);

  renderParts();
  partPopup.classList.add("hidden");
});

partsList.addEventListener("click", function (event) {
  if (event.target.classList.contains("stock-in-btn")) {
    currentPartIndex = event.target.dataset.index;
    currentAction = "in";
    openStockPopup("Stock in");
  }
  
  if (event.target.classList.contains("stock-out-btn")) {
    currentPartIndex = event.target.dataset.index;
    currentAction = "out";
    openStockPopup("Stock out");
  }

  if (event.target.classList.contains("part-name-btn")) {
    currentPartIndex = event.target.dataset.index;
    const parts = JSON.parse(localStorage.getItem("parts")) || [];
    const part = parts[currentPartIndex];

    editNameInput.value = part.name;
    editQtyInput.value = part.quantity;
    editBuyInput.value = part.buyPrice;
    editSellInput.value = part.sellPrice;

    editPopup.classList.remove("hidden");
  }
});

stockCancelBtn.addEventListener("click", function () {
  stockPopup.classList.add("hidden");
});

stockConfirmBtn.addEventListener("click", function () {
  if (!stockQtyInput.checkValidity() || stockQtyInput.value === "") {
    stockQtyInput.reportValidity();
    return;
  }

  const enteredQty = Number(stockQtyInput.value);
  const parts = JSON.parse(localStorage.getItem("parts")) || [];
  const part = parts[currentPartIndex];

  if (currentAction === "in") {
    part.quantity += enteredQty;

    const transactions = JSON.parse(localStorage.getItem("transactions")) || [];
    transactions.push({
      partName: part.name,
      action: "in",
      quantity: enteredQty,
      date: new Date().toLocaleString()
    });
    localStorage.setItem("transactions", JSON.stringify(transactions));

  } else if (currentAction === "out") {
    if (enteredQty > part.quantity) {
      alert("Only " + part.quantity + " in stock.");
      return;
    }

    if (!pricePaidInput.checkValidity() || pricePaidInput.value === "") {
      pricePaidInput.reportValidity();
      return;
    }

    const pricePaid = Number(pricePaidInput.value);
    const profit = (pricePaid - part.buyPrice) * enteredQty;

    part.quantity -= enteredQty;

    const transactions = JSON.parse(localStorage.getItem("transactions")) || [];
    transactions.push({
      partName: part.name,
      action: "out",
      quantity: enteredQty,
      declaredPrice: part.sellPrice,
      pricePaid: pricePaid,
      profit: profit,
      date: new Date().toLocaleString()
    });
    localStorage.setItem("transactions", JSON.stringify(transactions));
  }

  localStorage.setItem("parts", JSON.stringify(parts));
  renderParts();
  stockPopup.classList.add("hidden");
});

viewHistoryBtn.addEventListener("click", function () {
  renderHistory();
  homeScreen.classList.add("hidden");
  historyScreen.classList.remove("hidden");
  history.pushState({ screen: "history" }, "");
});

editCancelBtn.addEventListener("click", function () {
  editPopup.classList.add("hidden");
});

editSaveBtn.addEventListener("click", function () {
  if (!editNameInput.checkValidity() || !editQtyInput.checkValidity() || !editBuyInput.checkValidity() || !editSellInput.checkValidity()) {
    editNameInput.reportValidity();
    return;
  }

  const parts = JSON.parse(localStorage.getItem("parts")) || [];
  parts[currentPartIndex] = {
    name: editNameInput.value,
    quantity: Number(editQtyInput.value),
    buyPrice: Number(editBuyInput.value),
    sellPrice: Number(editSellInput.value)
  };

  localStorage.setItem("parts", JSON.stringify(parts));
  renderParts();
  editPopup.classList.add("hidden");
});

editDeleteBtn.addEventListener("click", function () {
  const confirmDelete = confirm("Delete this part? This cannot be undone.");
  if (!confirmDelete) return;

  const parts = JSON.parse(localStorage.getItem("parts")) || [];
  parts.splice(currentPartIndex, 1);

  localStorage.setItem("parts", JSON.stringify(parts));
  renderParts();
  editPopup.classList.add("hidden");
});

clearHistoryBtn.addEventListener("click", function () {
  selectMode = !selectMode;

  const checkboxes = document.querySelectorAll(".history-checkbox");
  checkboxes.forEach(function (box) {
    box.classList.toggle("hidden", !selectMode);
  });

  deleteSelectedBtn.classList.toggle("hidden", !selectMode);
});

deleteSelectedBtn.addEventListener("click", function () {
  const checkedBoxes = document.querySelectorAll(".history-checkbox:checked");
  if (checkedBoxes.length === 0) {
    alert("Select at least one transaction to delete.");
    return;
  }

  const confirmDelete = confirm("Delete " + checkedBoxes.length + " transaction(s)?");
  if (!confirmDelete) return;

  const indexesToDelete = Array.from(checkedBoxes).map(function (box) {
    return Number(box.dataset.index);
  });

  const transactions = JSON.parse(localStorage.getItem("transactions")) || [];
  const updatedTransactions = transactions.filter(function (t, index) {
    return !indexesToDelete.includes(index);
  });

  localStorage.setItem("transactions", JSON.stringify(updatedTransactions));
  selectMode = false;
  deleteSelectedBtn.classList.add("hidden");
  renderHistory();
});
window.addEventListener("popstate", function () {
  if (!historyScreen.classList.contains("hidden")) {
    historyScreen.classList.add("hidden");
    homeScreen.classList.remove("hidden");
  }
});

const logoutBtn = document.getElementById("logout-btn");

logoutBtn.addEventListener("click", function () {
  homeScreen.classList.add("hidden");
  historyScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  document.getElementById("email").value = "";
  document.getElementById("password").value = "";
});