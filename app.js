document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const form = document.getElementById("item-form");
    const inventoryList = document.getElementById("inventory-list");
    const editIdInput = document.getElementById("edit-id");
    const submitBtn = document.getElementById("submit-btn");
    const cancelEditBtn = document.getElementById("cancel-edit");
    const searchInput = document.getElementById("search");
    const exportBtn = document.getElementById("export-btn");
    const importBtn = document.getElementById("import-btn");
    const importFileInput = document.getElementById("import-file");

    // IndexedDB setup
    let db;
    const request = indexedDB.open("inventoryDB", 1);

    request.onupgradeneeded = function(e) {
        db = e.target.result;
        if (!db.objectStoreNames.contains("items")) {
            db.createObjectStore("items", { keyPath: "id", autoIncrement: true });
        }
    };

    request.onsuccess = function(e) {
        db = e.target.result;
        displayItems();
        attachImportExport(); // Attach import/export buttons now that DB is ready
    };

    request.onerror = function(e) {
        console.error("IndexedDB error", e);
    };

    // Helper: convert image to base64
    async function resizeImage(file, maxWidth = 200, maxHeight = 200) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = e => img.src = e.target.result;
            reader.onerror = error => reject(error);
            img.onload = () => {
                let { width, height } = img;
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width *= ratio;
                    height *= ratio;
                }
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL("image/jpeg", 0.8));
            };
        });
    }

    // Add/Edit item
    form.addEventListener("submit", async function(e) {
        e.preventDefault();
        const name = document.getElementById("name").value;
        const price = parseFloat(document.getElementById("price").value);
        const imageFile = document.getElementById("image").files[0];

        let imageData = null;
        if (imageFile) imageData = await resizeImage(imageFile, 200, 200);

        const tx = db.transaction("items", "readwrite");
        const store = tx.objectStore("items");

        const editId = editIdInput.value;
        if (editId) {
            const getRequest = store.get(Number(editId));
            getRequest.onsuccess = function() {
                const item = getRequest.result;
                item.name = name;
                item.price = price;
                if (imageData) item.image = imageData;
                store.put(item);
            };
        } else {
            store.add({ name, price, image: imageData });
        }

        tx.oncomplete = () => {
            form.reset();
            editIdInput.value = "";
            submitBtn.textContent = "Add Item";
            cancelEditBtn.style.display = "none";
            displayItems();
        };
    });

    cancelEditBtn.addEventListener("click", () => {
        form.reset();
        editIdInput.value = "";
        submitBtn.textContent = "Add Item";
        cancelEditBtn.style.display = "none";
    });

    // Display items
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

                    if (item.image) {
                        const img = document.createElement("img");
                        img.src = item.image;
                        img.style.cursor = "pointer";
                        img.onclick = () => openImage(item.image);
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

    function editItem(item) {
        document.getElementById("name").value = item.name;
        document.getElementById("price").value = item.price;
        editIdInput.value = item.id;
        submitBtn.textContent = "Update Item";
        cancelEditBtn.style.display = "inline";
    }

    function deleteItem(id) {
        const tx = db.transaction("items", "readwrite");
        const store = tx.objectStore("items");
        store.delete(id);
        tx.oncomplete = displayItems;
    }

    searchInput.addEventListener("input", displayItems);

    // ================= IMPORT / EXPORT ==================

    function attachImportExport() {
    const exportBtn = document.getElementById("export-btn");
    const importBtn = document.getElementById("import-btn");
    const importFileInput = document.getElementById("import-file");

    // Export
    exportBtn.addEventListener("click", () => {
        const tx = db.transaction("items", "readonly");
        const store = tx.objectStore("items");
        const req = store.getAll();
        req.onsuccess = () => {
            const dataStr = JSON.stringify(req.result, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "inventory.json";
            a.click();
            URL.revokeObjectURL(url);
        };
    });

    // Import
    importBtn.addEventListener("click", () => importFileInput.click());

    importFileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const items = JSON.parse(event.target.result);
                const tx = db.transaction("items", "readwrite");
                const store = tx.objectStore("items");
                items.forEach(item => delete item.id && store.add(item));
                tx.oncomplete = () => {
                    displayItems();
                    importFileInput.value = "";
                    alert("Inventory imported successfully!");
                };
            } catch (err) {
                console.error("Import failed", err);
                alert("Failed to import inventory.");
            }
        };
        reader.readAsText(file);
    });
}


    // Modal for image zoom
    const modal = document.createElement("div");
    modal.id = "image-modal";
    modal.style.cssText = "display:none;position:fixed;z-index:999;left:0;top:0;width:100%;height:100%;background-color:rgba(0,0,0,0.8);justify-content:center;align-items:center;display:flex;";
    const modalImg = document.createElement("img");
    modalImg.style.cssText = "max-width:90%;max-height:90%;border-radius:10px;box-shadow:0 4px 8px rgba(0,0,0,0.5);object-fit:contain;";
    modal.appendChild(modalImg);
    document.body.appendChild(modal);

    window.openImage = function(src) {
        modalImg.src = src;
        modal.style.display = "flex";
    };

    modal.addEventListener("click", () => modal.style.display = "none");
});
