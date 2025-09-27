// DOM Elements
const form = document.getElementById("item-form");
const inventoryList = document.getElementById("inventory-list");
const editIdInput = document.getElementById("edit-id");
const submitBtn = document.getElementById("submit-btn");
const cancelEditBtn = document.getElementById("cancel-edit");
const searchInput = document.getElementById("search");

// IndexedDB setup
let db;
const request = indexedDB.open("inventoryDB", 1);

request.onupgradeneeded = function(e) {
    db = e.target.result;
    if(!db.objectStoreNames.contains("items")) {
        db.createObjectStore("items", { keyPath: "id", autoIncrement: true });
    }
};

request.onsuccess = function(e) {
    db = e.target.result;
    displayItems();
};

request.onerror = function(e) {
    console.error("IndexedDB error", e);
};

// Convert image to base64
function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Add/Edit Item
form.addEventListener("submit", async function(e){
    e.preventDefault();
    const name = document.getElementById("name").value;
    const price = parseFloat(document.getElementById("price").value);
    const imageFile = document.getElementById("image").files[0];

    let imageData = null;
    if(imageFile) imageData = await toBase64(imageFile);

    const tx = db.transaction("items", "readwrite");
    const store = tx.objectStore("items");

    const editId = editIdInput.value;
    if(editId) {
        const getRequest = store.get(Number(editId));
        getRequest.onsuccess = function() {
            const item = getRequest.result;
            item.name = name;
            item.price = price;
            if(imageData) item.image = imageData;
            store.put(item);
        };
    } else {
        store.add({name, price, image: imageData});
    }

    tx.oncomplete = () => {
        form.reset();
        editIdInput.value = "";
        submitBtn.textContent = "Add Item";
        cancelEditBtn.style.display = "none";
        displayItems();
    };
});

// Cancel Edit
cancelEditBtn.addEventListener("click", () => {
    form.reset();
    editIdInput.value = "";
    submitBtn.textContent = "Add Item";
    cancelEditBtn.style.display = "none";
});

// Display Items with search filter
function displayItems() {
    const filter = searchInput.value.toLowerCase();
    const tx = db.transaction("items", "readonly");
    const store = tx.objectStore("items");
    const request = store.getAll();
    request.onsuccess = function() {
        inventoryList.innerHTML = "";
        request.result
            .filter(item => item.name.toLowerCase().includes(filter))
            .forEach(item => {
                const div = document.createElement("div");
                div.className = "inventory-item";

                const infoDiv = document.createElement("div");
                infoDiv.className = "item-info";

                if(item.image) {
                    const img = document.createElement("img");
                    img.src = item.image;
                    infoDiv.appendChild(img);
                }

                const text = document.createElement("span");
                text.textContent = `${item.name} - ₱${item.price.toFixed(2)}`;
                infoDiv.appendChild(text);

                div.appendChild(infoDiv);

                const editBtn = document.createElement("button");
                editBtn.textContent = "Edit";
                editBtn.onclick = () => editItem(item);
                div.appendChild(editBtn);

                const deleteBtn = document.createElement("button");
                deleteBtn.textContent = "Delete";
                deleteBtn.onclick = () => deleteItem(item.id);
                div.appendChild(deleteBtn);

                inventoryList.appendChild(div);
            });
    };
}

// Edit Item
function editItem(item) {
    document.getElementById("name").value = item.name;
    document.getElementById("price").value = item.price;
    editIdInput.value = item.id;
    submitBtn.textContent = "Update Item";
    cancelEditBtn.style.display = "inline";
}

// Delete Item
function deleteItem(id) {
    const tx = db.transaction("items", "readwrite");
    const store = tx.objectStore("items");
    store.delete(id);
    tx.oncomplete = displayItems;
}

// Search filter
searchInput.addEventListener("input", displayItems);

if('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => {
        console.log('Service Worker registered');
    });
}