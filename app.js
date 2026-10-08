import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

function showPopup(message, callback) {
  popupText.textContent = message;
  popup.classList.remove("hidden");

  return new Promise(function (resolve) {
    setTimeout(function () {
      popup.classList.add("hidden");
      if (callback) callback();
      resolve();
    }, 1500);
  });
}

function guardClick(btn, handler, getLabel) {
  btn.addEventListener("click", async function () {
    if (btn.dataset.busy === "true") return;

    btn.dataset.busy = "true";
    const originalLabel = btn.textContent;
    btn.textContent = "Loading...";
    btn.classList.add("is-loading");
    btn.disabled = true;

    try {
      await handler();
    } finally {
      btn.dataset.busy = "false";
      btn.textContent = getLabel ? getLabel() : originalLabel;
      btn.classList.remove("is-loading");
      btn.disabled = false;
    }
  });
}

function askConfirm(message) {
  return new Promise(function (resolve) {
    document.getElementById("confirm-message").textContent = message;
    const confirmPopup = document.getElementById("confirm-popup");
    const yesBtn = document.getElementById("confirm-yes-btn");
    const noBtn = document.getElementById("confirm-no-btn");

    confirmPopup.classList.remove("hidden");

    function cleanup(result) {
      confirmPopup.classList.add("hidden");
      yesBtn.removeEventListener("click", onYes);
      noBtn.removeEventListener("click", onNo);
      resolve(result);
    }

    function onYes() { cleanup(true); }
    function onNo() { cleanup(false); }

    yesBtn.addEventListener("click", onYes);
    noBtn.addEventListener("click", onNo);
  });
}

// Only one box (Add part, Edit part, Stock in/out) may be open at a time
function closeAllBoxes() {
  [partPopup, editPopup, stockPopup].forEach(function (box) {
    box.classList.add("hidden");
  });
}

async function getPartById(id) {
  const snap = await getDoc(doc(window.db, "parts", id));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (data.userId !== window.auth.currentUser.uid) return null;
  return data;
}

async function renderParts() {
  const partsListEl = document.getElementById("parts-list");

  if (!navigator.onLine) {
    partsListEl.innerHTML = "<p>No internet connection. Please reconnect and reload.</p>";
    return;
  }

  partsListEl.innerHTML = "Loading...";

  const user = window.auth.currentUser;
  if (!user) return;

  try {
    const q = query(collection(window.db, "parts"), where("userId", "==", user.uid));
    const snapshot = await getDocs(q);

    partsListEl.innerHTML = "";
    let count = 0;

    snapshot.forEach(function (docSnap) {
      const part = docSnap.data();
      const id = docSnap.id;
      count++;

      const card = document.createElement("div");
      card.className = "part-card";
      card.innerHTML = `
        <div class="part-info">
          <span class="part-name">${part.name}</span>
          <button class="edit-icon-btn" data-id="${id}" aria-label="Edit part">
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 20h9"/>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>
  </svg>
</button>
          <br>
          Quantity: ${part.quantity}<br>
          Buy: ${part.buyPrice} | Sell: ${part.sellPrice}
        </div>
        <div class="part-buttons">
          <button class="stock-in-btn" data-id="${id}">Stock in</button>
          <button class="stock-out-btn" data-id="${id}">Stock out</button>
        </div>
      `;
      partsListEl.appendChild(card);
    });

    renderSummary();
  } catch (error) {
    partsListEl.innerHTML = "<p>Could not load parts. Please try again.</p>";
    console.log("renderParts error:", error);
  }
}

async function openStockPopup(title) {
  stockPopupTitle.textContent = title;
  stockPopupInfo.textContent = "Loading...";
  stockQtyInput.value = "";

  if (currentAction === "out") {
    priceePaidSection.classList.remove("hidden");
  } else {
    priceePaidSection.classList.add("hidden");
  }
  closeAllBoxes();
  stockPopup.classList.remove("hidden");

  try {
    const part = await getPartById(currentPartId);
    if (!part) {
      stockPopupInfo.textContent = "Part not found.";
      return;
    }
    stockPopupInfo.textContent = part.name + " (Current quantity: " + part.quantity + ")";
    if (currentAction === "out") {
      pricePaidInput.value = part.sellPrice;
    }
  } catch (error) {
    stockPopupInfo.textContent = "Could not load part.";
    console.log("openStockPopup error:", error);
  }
}

async function renderSummary() {
  const salesCountEl = document.getElementById("sales-count");
  const salesAmountEl = document.getElementById("sales-amount");
  const profitEl = document.getElementById("total-quantity-number");

  const user = window.auth.currentUser;
  if (!user || !navigator.onLine) return;

  try {
    const q = query(collection(window.db, "transactions"), where("userId", "==", user.uid));
    const snapshot = await getDocs(q);

    let sales = 0;
    let amount = 0;
    let profit = 0;
    snapshot.forEach(function (docSnap) {
      const t = docSnap.data();
      if (t.action === "out") {
        sales++;
        amount += (Number(t.pricePaid) || 0) * (Number(t.quantity) || 0);
        profit += Number(t.profit) || 0;
      }
    });

    salesCountEl.textContent = sales;
    salesAmountEl.textContent = amount.toLocaleString();
    profitEl.textContent = profit.toLocaleString();
  } catch (error) {
    console.log("renderSummary error:", error);
  }
}

async function renderHistory() {
  const historyList = document.getElementById("history-list");

  if (!navigator.onLine) {
    historyList.innerHTML = "<p>No internet connection. Please reconnect and reload.</p>";
    return;
  }

  historyList.innerHTML = "Loading...";

  const user = window.auth.currentUser;
  if (!user) return;

  try {
    const q = query(collection(window.db, "transactions"), where("userId", "==", user.uid));
    const snapshot = await getDocs(q);

    const transactions = [];
    snapshot.forEach(function (docSnap) {
      transactions.push({ id: docSnap.id, ...docSnap.data() });
    });

    transactions.sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });

    historyList.innerHTML = "";

    transactions.forEach(function (t) {
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
        <input type="checkbox" class="history-checkbox hidden" data-id="${t.id}">
        ${contentHTML}
      `;

      historyList.appendChild(item);
    });
  } catch (error) {
    historyList.innerHTML = "<p>Could not load history. Please try again.</p>";
    console.log("renderHistory error:", error);
  }
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
const resetSummaryBtn = document.getElementById("reset-summary-btn");

const logoutBtn = document.getElementById("logout-btn");
const forgotPasswordLink = document.getElementById("forgot-password-link");

let currentPartId = null;
let currentAction = null;
let selectMode = false;

const authTitle = document.getElementById("auth-title");
const switchModeText = document.getElementById("switch-mode-text");
let authMode = "signin";

function setAuthMode(mode) {
  authMode = mode;
  if (mode === "signin") {
    authTitle.textContent = "Sign in";
    loginBtn.textContent = "Sign in";
    switchModeText.innerHTML = 'New here? <span id="switch-mode-link">Create account</span>';
    if (forgotPasswordLink) forgotPasswordLink.classList.remove("hidden");
  } else {
    authTitle.textContent = "Create account";
    loginBtn.textContent = "Create account";
    switchModeText.innerHTML = 'Already have an account? <span id="switch-mode-link">Sign in</span>';
    if (forgotPasswordLink) forgotPasswordLink.classList.add("hidden");
  }
}

switchModeText.addEventListener("click", function (event) {
  if (event.target.id === "switch-mode-link") {
    setAuthMode(authMode === "signin" ? "create" : "signin");
  }
});

guardClick(loginBtn, async function () {
  if (!navigator.onLine) {
    showPopup("No internet connection. Please connect and try again.");
    return;
  }

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

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (authMode === "signin") {
    try {
      await signInWithEmailAndPassword(window.auth, email, password);
      await showPopup("Sign in successful!", function () {
        loginScreen.classList.add("hidden");
        homeScreen.classList.remove("hidden");
        renderParts();
      });
    } catch (error) {
      if (error.code === "auth/invalid-email") {
        showPopup("Please enter a valid email.");
      } else if (error.code === "auth/too-many-requests") {
        showPopup("Too many attempts. Please try again later.");
      } else {
        showPopup("Wrong email or password.");
      }
    }
  } else {
    try {
      await createUserWithEmailAndPassword(window.auth, email, password);
      await showPopup("Account created successfully!", function () {
        loginScreen.classList.add("hidden");
        homeScreen.classList.remove("hidden");
        renderParts();
      });
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        showPopup("This email already has an account. Please sign in.");
        setAuthMode("signin");
      } else if (error.code === "auth/weak-password") {
        showPopup("Password must be at least 6 characters.");
      } else if (error.code === "auth/invalid-email") {
        showPopup("Please enter a valid email.");
      } else {
        showPopup("Error: " + error.message);
      }
    }
  }
}, function () {
  return authMode === "signin" ? "Sign in" : "Create account";
});

if (forgotPasswordLink) {
  guardClick(forgotPasswordLink, async function () {
    if (!navigator.onLine) {
      showPopup("No internet connection.");
      return;
    }

    const email = document.getElementById("email").value.trim();

    if (!email) {
      showPopup("Please type your email first, then click 'Forgot password?'");
      return;
    }

    try {
      await sendPasswordResetEmail(window.auth, email);
      showPopup("If an account exists, a reset email has been sent. Check your inbox and spam.");
    } catch (error) {
      if (error.code === "auth/invalid-email") {
        showPopup("Please enter a valid email.");
      } else {
        showPopup("Error: " + error.message);
      }
    }
  });
}

addPartBtn.addEventListener("click", function () {
  closeAllBoxes();
  partPopup.classList.remove("hidden");
});

partCancelBtn.addEventListener("click", function () {
  partPopup.classList.add("hidden");
});

guardClick(partSaveBtn, async function () {
  if (!navigator.onLine) {
    showPopup("No internet connection.");
    return;
  }

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

  const user = window.auth.currentUser;

  try {
    await addDoc(collection(window.db, "parts"), {
      userId: user.uid,
      name: nameInput.value,
      quantity: Number(qtyInput.value),
      buyPrice: Number(buyInput.value),
      sellPrice: Number(sellInput.value)
    });
  } catch (error) {
    showPopup("Could not save part: " + error.message);
    return;
  }

  nameInput.value = "";
  qtyInput.value = "";
  buyInput.value = "";
  sellInput.value = "";

  renderParts();
  partPopup.classList.add("hidden");
});

partsList.addEventListener("click", async function (event) {
  if (event.target.classList.contains("stock-in-btn")) {
    currentPartId = event.target.dataset.id;
    currentAction = "in";
    openStockPopup("Stock in");
  }

  if (event.target.classList.contains("stock-out-btn")) {
    currentPartId = event.target.dataset.id;
    currentAction = "out";
    openStockPopup("Stock out");
  }

  const editBtn = event.target.closest(".edit-icon-btn");
  if (editBtn) {
    currentPartId = editBtn.dataset.id;

    try {
      const part = await getPartById(currentPartId);
      if (!part) {
        showPopup("Part not found.");
        return;
      }
      editNameInput.value = part.name;
      editQtyInput.value = part.quantity;
      editBuyInput.value = part.buyPrice;
      editSellInput.value = part.sellPrice;
    } catch (error) {
      showPopup("Could not load part.");
      return;
    }

    closeAllBoxes();
    editPopup.classList.remove("hidden");
  }
});

stockCancelBtn.addEventListener("click", function () {
  stockPopup.classList.add("hidden");
});

guardClick(stockConfirmBtn, async function () {
  if (!navigator.onLine) {
    showPopup("No internet connection.");
    return;
  }

  if (!stockQtyInput.checkValidity() || stockQtyInput.value === "") {
    stockQtyInput.reportValidity();
    return;
  }

  const enteredQty = Number(stockQtyInput.value);
  const partRef = doc(window.db, "parts", currentPartId);

  try {
    const part = await getPartById(currentPartId);
    if (!part) return;

    if (currentAction === "in") {
      await updateDoc(partRef, { quantity: part.quantity + enteredQty });

      await addDoc(collection(window.db, "transactions"), {
        userId: window.auth.currentUser.uid,
        partName: part.name,
        action: "in",
        quantity: enteredQty,
        date: new Date().toLocaleString()
      });

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

      await updateDoc(partRef, { quantity: part.quantity - enteredQty });

      await addDoc(collection(window.db, "transactions"), {
        userId: window.auth.currentUser.uid,
        partName: part.name,
        action: "out",
        quantity: enteredQty,
        declaredPrice: part.sellPrice,
        pricePaid: pricePaid,
        profit: profit,
        date: new Date().toLocaleString()
      });
    }
  } catch (error) {
    showPopup("Something went wrong: " + error.message);
    return;
  }

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

guardClick(editSaveBtn, async function () {
  if (!navigator.onLine) {
    showPopup("No internet connection.");
    return;
  }

  const editFields = [editNameInput, editQtyInput, editBuyInput, editSellInput];
  for (const field of editFields) {
    if (!field.checkValidity()) {
      field.reportValidity();
      return;
    }
  }

  const partRef = doc(window.db, "parts", currentPartId);

  try {
    await updateDoc(partRef, {
      name: editNameInput.value,
      quantity: Number(editQtyInput.value),
      buyPrice: Number(editBuyInput.value),
      sellPrice: Number(editSellInput.value)
    });
  } catch (error) {
    showPopup("Could not save changes: " + error.message);
    return;
  }

  renderParts();
  editPopup.classList.add("hidden");
});

guardClick(editDeleteBtn, async function () {
  if (!navigator.onLine) {
    showPopup("No internet connection.");
    return;
  }

  const confirmDelete = await askConfirm("Are you sure you want to delete this?");
  if (!confirmDelete) return;

  try {
    await deleteDoc(doc(window.db, "parts", currentPartId));
  } catch (error) {
    showPopup("Could not delete part: " + error.message);
    return;
  }

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

guardClick(deleteSelectedBtn, async function () {
  if (!navigator.onLine) {
    showPopup("No internet connection.");
    return;
  }

  const checkedBoxes = document.querySelectorAll(".history-checkbox:checked");
  if (checkedBoxes.length === 0) {
    alert("Select at least one transaction to delete.");
    return;
  }

  const confirmDelete = await askConfirm("Are you sure you want to delete " + checkedBoxes.length + " transaction(s)?");
  if (!confirmDelete) return;

  try {
    for (const box of checkedBoxes) {
      await deleteDoc(doc(window.db, "transactions", box.dataset.id));
    }
  } catch (error) {
    showPopup("Could not delete: " + error.message);
    return;
  }

  selectMode = false;
  deleteSelectedBtn.classList.add("hidden");
  renderHistory();
  renderSummary();
});

guardClick(resetSummaryBtn, async function () {
  if (!navigator.onLine) {
    showPopup("No internet connection.");
    return;
  }

  const confirmReset = await askConfirm("This will permanently delete all sales history and reset your stats. Continue?");
  if (!confirmReset) return;

  try {
    const q = query(collection(window.db, "transactions"), where("userId", "==", window.auth.currentUser.uid));
    const snapshot = await getDocs(q);

    for (const docSnap of snapshot.docs) {
      await deleteDoc(doc(window.db, "transactions", docSnap.id));
    }
  } catch (error) {
    showPopup("Could not reset: " + error.message);
    return;
  }

  renderSummary();
  showPopup("Stats reset.");
});

// Tap the dimmed area outside an open sheet (Add part, Edit part, Stock in/out) to close it without saving.
// The tap only closes the sheet: nothing behind it gets pressed.
document.addEventListener("click", function (event) {
  if (event.target.closest("#popup")) return;

  const confirmPopup = document.getElementById("confirm-popup");
  if (confirmPopup && !confirmPopup.classList.contains("hidden")) {
    if (!confirmPopup.contains(event.target)) {
      event.stopPropagation();
      event.preventDefault();
    }
    return;
  }

  const sheets = [stockPopup, editPopup, partPopup];
  for (const box of sheets) {
    if (box.classList.contains("hidden")) continue;

    if (!box.contains(event.target)) {
      event.stopPropagation();
      event.preventDefault();
      if (!box.querySelector('[data-busy="true"]')) {
        box.classList.add("hidden");
      }
    }
    return;
  }
}, true);

window.addEventListener("popstate", function () {
  if (!historyScreen.classList.contains("hidden")) {
    historyScreen.classList.add("hidden");
    homeScreen.classList.remove("hidden");
  }
});

guardClick(logoutBtn, async function () {
  try {
    await signOut(window.auth);
  } catch (error) {
    console.log("Sign out error:", error);
  }
  homeScreen.classList.add("hidden");
  historyScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  document.getElementById("email").value = "";
  document.getElementById("password").value = "";
  setAuthMode("signin");
  document.getElementById("sales-count").textContent = "0";
  document.getElementById("sales-amount").textContent = "0";
  document.getElementById("total-quantity-number").textContent = "0";
});

function startAuthListener() {
  if (!window.auth) {
    setTimeout(startAuthListener, 50);
    return;
  }

  onAuthStateChanged(window.auth, function (user) {
    if (user) {
      loginScreen.classList.add("hidden");
      homeScreen.classList.remove("hidden");
      renderParts();
    } else {
      homeScreen.classList.add("hidden");
      historyScreen.classList.add("hidden");
      loginScreen.classList.remove("hidden");
    }
  });
}

startAuthListener();