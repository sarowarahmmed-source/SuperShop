
// Add toggleSidebar function
        window.toggleSidebar = function() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.querySelector('.sidebar-overlay');
            
            if (!overlay) {
                const newOverlay = document.createElement('div');
                newOverlay.className = 'sidebar-overlay';
                newOverlay.onclick = toggleSidebar;
                document.body.appendChild(newOverlay);
            }
            
            sidebar.classList.toggle('active');
            document.querySelector('.sidebar-overlay').classList.toggle('active');
        };
    
        let cart = [];
        let total = 0;
    
        // Show product details
        window.showProductDetails = function(item, docId) {
            const modal = document.getElementById('productModal');
            const details = document.getElementById('productDetails');
            
            details.innerHTML = `
                <div class="product-details">
                    <div class="product-details-header">
                        <div class="product-image-container">
                            ${item.imageUrl ? 
                                `<img src="${item.imageUrl}" alt="${item.name}" class="product-details-image">` : 
                                '<div class="no-image"><i class="fas fa-image"></i></div>'
                            }
                        </div>
                        <div class="product-header-info">
                            <h2>${item.name}</h2>
                            <div class="product-meta">
                                <p><strong>Product ID:</strong> ${item.id || 'N/A'}</p>
                                <p><strong>Category:</strong> ${item.category}</p>
                                <p><strong>Special Code:</strong> ${item.specialCode}</p>
                                <p><strong>Stock:</strong> ${item.quantity} units</p>
                                <p><strong>Price:</strong> ${formatCurrency(parseFloat(item.price))}</p>
                            </div>
                            <div class="product-actions">
                        <div class="quantity-control">
                            <button onclick="updateQuantity('${docId}', -1)">-</button>
                            <input type="number" id="quantity-${docId}" value="1" min="1" max="${item.quantity}">
                            <button onclick="updateQuantity('${docId}', 1)">+</button>
                        </div>
                        <button class="add-to-cart" onclick="addToCartFromModal('${docId}', '${item.name}', ${item.price})">
                            Add to Cart
                        </button>
                    </div>
                        </div>
                        
                    </div>
                    <div class="product-description-section">
                        <h3>Description:</h3>
                        <p>${item.description || 'No description available'}</p>
                    </div>
                    
                </div>
            `;
            
            modal.style.display = 'block';
        };
    
        // Close modal
        window.closeProductModal = function() {
            document.getElementById('productModal').style.display = 'none';
        };
    
        // Update quantity
        window.updateQuantity = function(docId, change) {
            const input = document.getElementById(`quantity-${docId}`);
            let value = parseInt(input.value) + change;
            value = Math.max(1, Math.min(value, parseInt(input.max)));
            input.value = value;
        };
    // Update the addToCart function
    window.addToCart = async function(id, name, price, quantity) {
        // Check inventory quantity first
        const productDoc = await getDocs(collection(db, 'inventory'));
        let currentStock = 0;
        productDoc.forEach(doc => {
            if(doc.id === id) {
                currentStock = doc.data().quantity;
            }
        });
    
        if (currentStock <= 0) {
            alert('Sorry, this product is out of stock!');
            return;
        }
    
        const existingItem = cart.find(item => item.id === id);
        const totalQuantity = existingItem ? existingItem.quantity + quantity : quantity;
    
        if (totalQuantity > currentStock) {
            alert(`Sorry, only ${currentStock} items available in stock!`);
            return;
        }
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({ id, name, price, quantity });
        }
        updateCart();
    };
    // Update addToCartFromModal function
    window.addToCartFromModal = async function(id, name, price) {
        const quantity = parseInt(document.getElementById(`quantity-${id}`).value);
        await addToCart(id, name, price, quantity);
        closeProductModal();
    };
    // Update the loadProducts function
    window.updateCart = async function() {
        const cartItems = document.querySelector('.cart-items');
        cartItems.innerHTML = '';
        total = 0;
        let totalVat = 0;
    
        // Get VAT rules
        const vatRulesSnapshot = await getDocs(collection(db, 'vatRules'));
        const vatRules = {};
        vatRulesSnapshot.forEach(doc => {
            const rule = doc.data();
            vatRules[rule.specialCode] = rule.vatPercentage;
        });
    
        // Get product details for VAT calculation
        for (const item of cart) {
            const productDoc = await getDocs(collection(db, 'inventory'));
            let specialCode = '';
            productDoc.forEach(doc => {
                if(doc.id === item.id) {
                    specialCode = doc.data().specialCode;
                }
            });}}
    // Add these functions after the existing cart-related code
window.updateCartQuantity = async function(index, change) {
    const item = cart[index];
    const newQuantity = item.quantity + change;
    
    // Check inventory
    const productDoc = await getDocs(collection(db, 'inventory'));
    let currentStock = 0;
    
    productDoc.forEach(doc => {
        if(doc.id === item.id) {
            currentStock = doc.data().quantity;
        }
    });

    if (newQuantity <= 0) {
        removeFromCart(index);
        return;
    }

    if (newQuantity > currentStock) {
        alert(`Sorry, only ${currentStock} items available in stock!`);
        return;
    }

    item.quantity = newQuantity;
    updateCart();
};

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    updateCart();
};
// Update the checkout function to include receipt generation
// Update the checkout function to handle inventory updates
// Update the checkout function to include special codes in the sales data
window.checkout = async function() {
    if (cart.length === 0) {
        alert('Cart is empty!');
        return;
    }
    try {
        const salesId = Math.floor(100000 + Math.random() * 900000);
        
        // Get current user data from session storage
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        if (!currentUser) {
            alert('Please login to complete checkout');
            return;
        }

        // Update inventory quantities and collect special codes
        for (const item of cart) {
            const inventoryRef = doc(db, 'inventory', item.id);
            const inventoryDoc = await getDoc(inventoryRef);
            
            if (inventoryDoc.exists()) {
                const currentQuantity = inventoryDoc.data().quantity;
                if (currentQuantity < item.quantity) {
                    alert(`Not enough stock for ${item.name}! Available: ${currentQuantity}`);
                    return;
                }
                
                // Store special code in the cart item
                item.specialCode = inventoryDoc.data().specialCode || '';
                
                await updateDoc(inventoryRef, {
                    quantity: currentQuantity - item.quantity
                });
            }
        }

        // Process VAT
        await processVat(cart);

        // Create sale record with user information and special codes
        const saleData = {
            saleId: salesId.toString(),
            items: cart.map(item => ({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                total: item.price * item.quantity,
                specialCode: item.specialCode || '' // Include special code in each item
            })),
            totalAmount: total,
            totalVat: totalVat,
            grandTotal: total + totalVat,
            timestamp: new Date().toISOString(),
            username: currentUser.username
        };

        await addDoc(collection(db, 'sales'), saleData);

        // Generate and show receipt
        generateReceipt(saleData);

        cart = [];
        updateCart();
        loadProducts();
        
        alert('Checkout successful!');
    } catch (error) {
        console.error('Checkout error:', error);
        alert('Error processing checkout. Please try again.');
    }
};

// Add receipt generation function
// Add currency settings
let currentCurrency = '৳';
let currentCurrencyCode = 'BDT';

// Add currency loading function
async function loadCurrencySettings() {
    try {
        const storeSnapshot = await getDocs(collection(db, 'storeInfo'));
        if (!storeSnapshot.empty) {
            const storeData = storeSnapshot.docs[0].data();
            currentCurrency = storeData.currencySymbol || '৳';
            currentCurrencyCode = storeData.currency || 'BDT';
        }
    } catch (error) {
        console.error('Error loading currency settings:', error);
    }
}

// Add format currency function
function formatCurrency(amount) {
    return `${amount.toFixed(2)}${currentCurrency}`;
}

// Update the receipt generation section
window.generateReceipt = async function(saleData) {
    await loadCurrencySettings();
    const receiptWindow = window.open('', '_blank', 'width=400,height=600');
    const date = new Date(saleData.timestamp);

    const receiptHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Sales Receipt</title>
            <style>
                body {
                    font-family: 'Courier New', monospace;
                    padding: 20px;
                    max-width: 400px;
                    margin: 0 auto;
                }
                .header {
                    text-align: center;
                    margin-bottom: 20px;
                }
                .receipt-item {
                    display: flex;
                    justify-content: space-between;
                    margin: 5px 0;
                }
                .divider {
                    border-top: 1px dashed #000;
                    margin: 10px 0;
                }
                .total-section {
                    margin-top: 20px;
                }
                .print-btn {
                    display: block;
                    margin: 20px auto;
                    padding: 10px 20px;
                    background: #124e66;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>SUPER SHOP</h2>
                <p>Sales Receipt</p>
                <p>Date: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}</p>
                <p>Receipt No: ${saleData.saleId}</p>
            </div>
            <div class="divider"></div>
            <div class="items">
                ${saleData.items.map(item => `
                    <div class="receipt-item">
                        <span>${item.name} x${item.quantity}</span>
                        <span>${formatCurrency(item.price * item.quantity)}</span>
                    </div>
                `).join('')}
            </div>
            <div class="divider"></div>
            <div class="total-section">
                <div class="receipt-item">
                    <span>Subtotal:</span>
                    <span>${formatCurrency(saleData.totalAmount)}</span>
                </div>
                <div class="receipt-item">
                    <span>VAT:</span>
                    <span>${formatCurrency(saleData.totalVat)}</span>
                </div>
                <div class="receipt-item">
                    <strong>Total:</strong>
                    <strong>${formatCurrency(saleData.grandTotal)}</strong>
                </div>
            </div>
            <div class="divider"></div>
            <p style="text-align: center;">Thank you for shopping with us!</p>
            <button class="print-btn" onclick="window.print()">Print Receipt</button>
        </body>
        </html>
    `;

    receiptWindow.document.write(receiptHTML);
    receiptWindow.document.close();
};
// Update the updateCart function
window.updateCart = async function() {
    const cartItems = document.querySelector('.cart-items');
    cartItems.innerHTML = '';
    total = 0;
    totalVat = 0;

    // Get VAT rules
    const vatRulesSnapshot = await getDocs(collection(db, 'vatRules'));
    const vatRules = {};
    vatRulesSnapshot.forEach(doc => {
        const rule = doc.data();
        vatRules[rule.specialCode] = rule.vatPercentage;
    });

    for (const item of cart) {
        const productDoc = await getDocs(collection(db, 'inventory'));
        let specialCode = '';
        let currentStock = 0;
        
        productDoc.forEach(doc => {
            if(doc.id === item.id) {
                specialCode = doc.data().specialCode;
                currentStock = doc.data().quantity;
            }
        });

        const vatPercentage = vatRules[specialCode] || 0;
        const itemTotal = item.price * item.quantity;
        const itemVat = itemTotal * (vatPercentage / 100);
        total += itemTotal;
        totalVat += itemVat;

        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-details">
                <span class="cart-item-name">${item.name}</span>
                <div class="cart-item-price-details">
                    <span class="cart-item-price">${formatCurrency(itemTotal)}</span>
                    ${vatPercentage > 0 ? `<span class="cart-item-vat">(+${vatPercentage}% VAT: ${formatCurrency(itemVat)})</span>` : ''}
                </div>
            </div>
            <div class="cart-item-controls">
                <div class="cart-quantity-control">
                    <button onclick="updateCartQuantity(${cart.indexOf(item)}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateCartQuantity(${cart.indexOf(item)}, 1)" 
                            ${item.quantity >= currentStock ? 'disabled' : ''}>+</button>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart(${cart.indexOf(item)})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        cartItems.appendChild(cartItem);
    }

    // Update total display with VAT
    const cartTotal = document.querySelector('.cart-total');
    cartTotal.innerHTML = `
        <div class="total-breakdown">
            <p>Subtotal: ${formatCurrency(total)}</p>
            <p>VAT: ${formatCurrency(totalVat)}</p>
            <h3>Total: ${formatCurrency(total + totalVat)}</h3>
        </div>
        <button class="checkout-btn" onclick="checkout()">Checkout</button>
    `;
};
        // Add this new function to handle quantity updates
        window.updateCartQuantity = function(index, change) {
            if (cart[index]) {
                cart[index].quantity = Math.max(1, cart[index].quantity + change);
                updateCart();
            }
        };
    
        // Remove from cart
        window.removeFromCart = function(index) {
            cart.splice(index, 1);
            updateCart();
        };
    
        // Close modal when clicking outside
        window.onclick = function(event) {
            const modal = document.getElementById('productModal');
            if (event.target == modal) {
                closeProductModal();
            }
        };
        
        // Add pagination variables
        let currentPage = 1;
        let productsPerPage = 100;
        let totalProducts = 0;
        let totalPages = 1;
    
        // Modify the loadProducts function to include pagination
        window.loadProducts = async function(page = 1) {
            currentPage = page;
            const productsContainer = document.getElementById('productsContainer');
            productsContainer.innerHTML = '<div class="loading-spinner"></div>';
            
            try {
                // Load currency settings first
                await loadCurrencySettings();
                
                const category = document.getElementById('categoryFilter').value;
                const searchTerm = document.getElementById('searchInput').value.toLowerCase();
                
                let q = collection(db, 'inventory');
                if (category && category !== 'all') {
                    q = query(q, where('category', '==', category));
                }
                
                const querySnapshot = await getDocs(q);
                let products = [];
                
                querySnapshot.forEach((doc) => {
                    const product = doc.data();
                    product.id = doc.id;
                    
                    // Apply search filter in memory
                    if (searchTerm && 
                        !product.name.toLowerCase().includes(searchTerm) && 
                        !product.id.toLowerCase().includes(searchTerm) &&
                        !(product.specialCode && product.specialCode.toLowerCase().includes(searchTerm))) {
                        return;
                    }
                    
                    products.push(product);
                });
                
                // Sort products by name
                products.sort((a, b) => a.name.localeCompare(b.name));
                
                // Calculate pagination
                totalProducts = products.length;
                totalPages = Math.ceil(totalProducts / productsPerPage);
                
                // Apply pagination
                const startIndex = (currentPage - 1) * productsPerPage;
                const paginatedProducts = products.slice(startIndex, startIndex + productsPerPage);
                
                productsContainer.innerHTML = '';
                
                if (paginatedProducts.length === 0) {
                    productsContainer.innerHTML = '<div class="no-products">No products found</div>';
                    return;
                }
                
                paginatedProducts.forEach((product) => {
                    const productCard = document.createElement('div');
                    productCard.className = 'product-card';
                    
                    // Add out of stock indicator
                    const stockClass = parseInt(product.quantity) <= 0 ? 'out-of-stock' : '';
                    
                    productCard.innerHTML = `
                        <div class="product-card-inner ${stockClass}">
                            <div class="product-image">
                                ${product.imageUrl ? 
                                    `<img src="${product.imageUrl}" alt="${product.name}">` : 
                                    '<div class="no-image"><i class="fas fa-image"></i></div>'
                                }
                                ${parseInt(product.quantity) <= 0 ? '<div class="out-of-stock-label">Out of Stock</div>' : ''}
                            </div>
                            <div class="product-info">
                                <h3>${product.name}</h3>
                                <p class="product-price">${formatCurrency(parseFloat(product.price))}</p>
                                <p class="product-stock">Stock: ${product.quantity}</p>
                            </div>
                            <div class="product-actions">
                                <button class="view-details" onclick="showProductDetails(${JSON.stringify(product).replace(/"/g, '&quot;')}, '${product.id}')">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="add-to-cart" onclick="addToCart('${product.id}', '${product.name.replace(/'/g, "\\'")}', ${product.price}, 1)" 
                                    ${parseInt(product.quantity) <= 0 ? 'disabled' : ''}>
                                    <i class="fas fa-cart-plus"></i>
                                </button>
                            </div>
                        </div>
                    `;
                    
                    productsContainer.appendChild(productCard);
                });
                
                // Add pagination controls
                renderPaginationControls();
                
            } catch (error) {
                console.error('Error loading products:', error);
                productsContainer.innerHTML = '<div class="error">Error loading products. Please try again.</div>';
            }
        };
        
        // Add function to render pagination controls
       