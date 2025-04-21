// script.js

// --- CONFIGURACIÓN ---
const API_BASE_URL = '/api'; // Ruta base para las funciones de Vercel

// --- REFERENCIAS A ELEMENTOS DEL DOM ---
// Formularios
const loginContainer = document.getElementById('loginContainer');
const loginForm = document.getElementById('loginForm');
const salesForm = document.getElementById('salesForm');
// Campos Login
const emailInput = document.getElementById('email');
const loginError = document.getElementById('loginError');
// Campos Venta Principal
const saleIdInput = document.getElementById('saleId');
const saleDateInput = document.getElementById('saleDate');
const sellerSearchInput = document.getElementById('sellerSearch');
const sellerIdHidden = document.getElementById('sellerIdHidden');
const sellerEmailHidden = document.getElementById('sellerEmailHidden');
const clientSearchInput = document.getElementById('clientSearch');
const clientIdHidden = document.getElementById('clientIdHidden');
const paymentTypeSelect = document.getElementById('paymentType');
const commentsTextarea = document.getElementById('comments');
const submitSaleButton = document.getElementById('submitSaleButton');
const submitError = document.getElementById('submitError');
// Carrito
const cartTableBody = document.querySelector('#cartTable tbody');
const cartEmptyMessage = document.getElementById('cartEmptyMessage');
const totalDiscountsInput = document.getElementById('totalDiscounts');
const totalSaleInput = document.getElementById('totalSale');
// Modales
const productModal = document.getElementById('productModal');
const productSearchInput = document.getElementById('productSearchInput');
const productListUl = document.getElementById('productList');
const productSearchMessage = document.getElementById('productSearchMessage');

const clientModal = document.getElementById('clientModal');
const clientSearchModalInput = document.getElementById('clientSearchModalInput');
const clientListModalUl = document.getElementById('clientListModal');
const clientSearchMessage = document.getElementById('clientSearchMessage');

const sellerModal = document.getElementById('sellerModal');
const sellerSearchModalInput = document.getElementById('sellerSearchModalInput');
const sellerListModalUl = document.getElementById('sellerListModal');
const sellerSearchMessage = document.getElementById('sellerSearchMessage');

// Animación
const successAnimationDiv = document.getElementById('successAnimation');

// --- ESTADO DE LA APLICACIÓN ---
let currentCart = []; // Podríamos usar esto o leer directamente de la tabla

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Cargado. Inicializando aplicación...');
    // Verificar si ya hay un usuario "logueado" en localStorage
    const loggedInEmail = localStorage.getItem('userEmail');
    if (loggedInEmail) {
        console.log(`Usuario ${loggedInEmail} encontrado en localStorage. Intentando restaurar sesión...`);
        // Aquí podríamos llamar a una API para verificar el usuario si quisiéramos más seguridad
        // Por ahora, asumimos que es válido y configuramos el formulario
        setupSalesFormForUser(loggedInEmail);
    } else {
        console.log('Ningún usuario en localStorage. Mostrando login.');
        showLogin();
    }

    // Configurar listeners
    loginForm.addEventListener('submit', handleLoginFormSubmit);
    salesForm.addEventListener('submit', handleSalesFormSubmit);

    // Listeners para búsqueda en modales (con debounce opcional)
    productSearchInput.addEventListener('input', debounce(handleProductSearch, 300));
    clientSearchModalInput.addEventListener('input', debounce(handleClientSearch, 300));
    sellerSearchModalInput.addEventListener('input', debounce(handleSellerSearch, 300));

    // Listener para cambios en el carrito (delegación de eventos)
    cartTableBody.addEventListener('input', handleCartInputChange);
    cartTableBody.addEventListener('click', handleCartButtonClick);

    // Inicializar fecha venta
    saleDateInput.value = new Date().toISOString().split('T')[0];

    updateCartView(); // Asegurarse que el mensaje de carrito vacío se muestre si es necesario
});

// --- FUNCIONES DE MANEJO DE VISTAS ---
function showLogin() {
    loginContainer.style.display = 'block';
    salesForm.style.display = 'none';
    localStorage.removeItem('userEmail'); // Limpiar email al mostrar login
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
}

function showSalesForm() {
    loginContainer.style.display = 'none';
    salesForm.style.display = 'block';
}

// --- MANEJO DEL LOGIN ---
async function handleLoginFormSubmit(event) {
    event.preventDefault();
    loginError.style.display = 'none';
    const email = emailInput.value.trim();

    if (!email) {
        showError(loginError, 'Por favor, ingresa tu correo electrónico.');
        return;
    }

    const loginButton = loginForm.querySelector('button[type="submit"]');
    loginButton.disabled = true;
    loginButton.textContent = 'Verificando...';

    try {
        // Llamada a la API de login (que crearemos en Vercel)
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `Error ${response.status}`);
        }

        // Asumimos que la API devuelve { success: true, email: '...', userId: '...', name: '...' }
        if (result.success) {
            console.log('Login exitoso:', result);
            setupSalesFormForUser(result.email, result.userId, result.name);
        } else {
            // Si la API devuelve success: false pero status 200
            throw new Error(result.message || 'Correo no reconocido.');
        }

    } catch (error) {
        console.error('Error en login:', error);
        showError(loginError, error.message || 'No se pudo iniciar sesión. Verifica el correo o la conexión.');
        loginButton.disabled = false;
        loginButton.textContent = 'Iniciar Sesión';
    }
}

function setupSalesFormForUser(email, userId = null, userName = null) {
    console.log(`Configurando formulario para ${userName || email} (ID: ${userId})`);
    // Guardar en localStorage
    localStorage.setItem('userEmail', email);
    if (userId) localStorage.setItem('userId', userId);
    if (userName) localStorage.setItem('userName', userName);

    // Rellenar campos del vendedor (ocultos y visibles)
    sellerSearchInput.value = userName || email;
    sellerEmailHidden.value = email;
    sellerIdHidden.value = userId || ''; // Guardar ID si existe

    showSalesForm();
    generateSaleId(); // Generar ID inicial
    clearForm(false); // Limpiar carrito y totales, pero no el vendedor
}

// --- MANEJO DEL FORMULARIO DE VENTAS ---
async function handleSalesFormSubmit(event) {
    event.preventDefault();
    submitError.style.display = 'none';

    if (!validateForm()) {
        showError(submitError, 'Formulario inválido. Revisa los campos requeridos y el carrito.');
        return;
    }

    submitSaleButton.disabled = true;
    submitSaleButton.textContent = 'Registrando...';

    // Recolectar datos
    const saleData = {
        saleId: saleIdInput.value,
        saleDate: saleDateInput.value,
        clientId: clientIdHidden.value,
        sellerId: sellerIdHidden.value, // ID del vendedor (puede estar vacío si no se encontró)
        userEmail: sellerEmailHidden.value, // Email del vendedor logueado/seleccionado
        paymentType: paymentTypeSelect.value,
        comments: commentsTextarea.value,
        totalDiscounts: parseFloat(totalDiscountsInput.value) || 0,
        totalSale: parseFloat(totalSaleInput.value) || 0,
        products: getCartItems() // Obtener productos del carrito
    };

    console.log("Enviando datos de venta:", saleData);

    try {
        // Llamada a la API para guardar (que crearemos en Vercel)
        const response = await fetch(`${API_BASE_URL}/guardar-venta`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saleData)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
             throw new Error(result.error || `Error ${response.status} al guardar`);
        }

        console.log("Venta guardada con éxito:", result);
        showSuccessAnimation();
        // printInvoice(saleData); // Generar factura localmente con los datos enviados
        printInvoice(result.data || saleData); // Usar datos devueltos por API si existen, sino los enviados
        setTimeout(() => clearForm(false), 1500); // Limpiar después de animación

    } catch (error) {
        console.error("Error al guardar venta:", error);
        showError(submitError, `Error al registrar: ${error.message}`);
    } finally {
        submitSaleButton.disabled = false;
        submitSaleButton.textContent = 'Registrar Venta y Imprimir Factura';
    }
}

function validateForm() {
    let isValid = true;
    submitError.style.display = 'none'; // Ocultar error previo

    if (!saleDateInput.value) {
        console.warn("Validación fallida: Fecha requerida");
        isValid = false;
    }
    if (!clientIdHidden.value) {
        console.warn("Validación fallida: Cliente requerido");
        isValid = false;
    }
     if (!sellerEmailHidden.value) { // Necesitamos al menos el email del vendedor
        console.warn("Validación fallida: Vendedor/Email requerido");
        isValid = false;
    }
    if (!paymentTypeSelect.value) {
        console.warn("Validación fallida: Tipo de pago requerido");
        isValid = false;
    }
    if (getCartItems().length === 0) {
        console.warn("Validación fallida: El carrito está vacío");
        isValid = false;
    }
    // Validar cantidades en carrito
    let invalidQuantity = false;
    getCartItems().forEach(item => {
        if (item.quantity <= 0) {
            invalidQuantity = true;
        }
    });
    if (invalidQuantity) {
         console.warn("Validación fallida: Cantidad inválida en el carrito");
         isValid = false;
         showError(submitError, 'Hay productos con cantidad inválida.');
    }


    return isValid;
}

function clearForm(clearSeller = true) {
    console.log('Limpiando formulario...');
    salesForm.reset(); // Resetea la mayoría de los campos
    cartTableBody.innerHTML = ''; // Limpiar tabla del carrito
    currentCart = []; // Limpiar estado del carrito si lo usas
    clientIdHidden.value = ''; // Limpiar ID cliente oculto
    clientSearchInput.value = ''; // Limpiar campo visible cliente
    commentsTextarea.value = ''; // Asegurar limpieza textarea
    totalDiscountsInput.value = '0.00';
    totalSaleInput.value = '0.00';
    submitError.style.display = 'none';
    saleDateInput.value = new Date().toISOString().split('T')[0]; // Resetear fecha a hoy

    if (clearSeller) {
        sellerSearchInput.value = '';
        sellerIdHidden.value = '';
        sellerEmailHidden.value = '';
        // Podríamos llamar a showLogin() si limpiar vendedor significa cerrar sesión
    } else {
         // Mantener vendedor logueado si clearSeller es false
         const loggedInEmail = localStorage.getItem('userEmail');
         const loggedInId = localStorage.getItem('userId');
         const loggedInName = localStorage.getItem('userName');
         sellerSearchInput.value = loggedInName || loggedInEmail || '';
         sellerEmailHidden.value = loggedInEmail || '';
         sellerIdHidden.value = loggedInId || '';
    }

    generateSaleId(); // Generar nuevo ID
    updateCartView(); // Mostrar mensaje de carrito vacío
}

// --- MANEJO DEL CARRITO ---
 function getCartItems() {
     const items = [];
     cartTableBody.querySelectorAll('tr').forEach(row => {
         const quantityInput = row.querySelector('.quantity');
         const discountInput = row.querySelector('.discount');
         items.push({
             // --- AÑADIR ESTA LÍNEA ---
             detailSaleId: generateDetailSaleId(), // Generar ID único para esta línea
             // --- FIN LÍNEA AÑADIDA ---
             productId: row.dataset.productId,
             productName: row.dataset.productName,
             unitPrice: parseFloat(row.dataset.productPrice) || 0,
             quantity: parseInt(quantityInput ? quantityInput.value : 0) || 0,
             discount: parseFloat(discountInput ? discountInput.value : 0) || 0,
             subtotal: parseFloat(row.querySelector('.subtotal').textContent) || 0
         });
     });
     return items;
 }

function addProductToCart(product) {
    // product es el objeto devuelto por la API { "ID PRODUCTO": "...", "NOMBRE PRODUCTO": "...", "PRECIO VENTA": "..." }
    const productId = product['ID PRODUCTO'];
    const productName = product['NOMBRE PRODUCTO'];
    const productPrice = parseFloat(product['PRECIO VENTA']) || 0;

    const existingRow = cartTableBody.querySelector(`tr[data-product-id="${productId}"]`);

    if (existingRow) {
        const quantityInput = existingRow.querySelector('.quantity');
        quantityInput.value = parseInt(quantityInput.value) + 1;
        updateSubtotal(existingRow);
    } else {
        const row = document.createElement('tr');
        row.dataset.productId = productId;
        row.dataset.productName = productName; // Guardar nombre
        row.dataset.productPrice = productPrice;

        row.innerHTML = `
            <td>${productName}</td>
            <td><input type="number" value="1" min="1" class="quantity input-field" style="width: 70px;"></td>
            <td>${productPrice.toFixed(2)}</td>
            <td><input type="number" value="0.00" min="0" step="0.01" class="discount input-field" placeholder="0.00" style="width: 80px;"></td>
            <td class="subtotal">${productPrice.toFixed(2)}</td>
            <td><button type="button" class="btn btn-delete btn-sm">X</button></td>
        `;
        cartTableBody.appendChild(row);
        updateSubtotal(row); // Calcular subtotal inicial
    }
    closeProductModal();
    calculateTotals();
    updateCartView();
}

function handleCartInputChange(event) {
    if (event.target.classList.contains('quantity') || event.target.classList.contains('discount')) {
        const row = event.target.closest('tr');
        if (row) {
            updateSubtotal(row);
            calculateTotals();
        }
    }
}

function handleCartButtonClick(event) {
     if (event.target.classList.contains('btn-delete')) {
        const row = event.target.closest('tr');
        if (row) {
            row.remove();
            calculateTotals();
            updateCartView();
        }
    }
}

function updateSubtotal(row) {
    const price = parseFloat(row.dataset.productPrice) || 0;
    const quantityInput = row.querySelector('.quantity');
    const discountInput = row.querySelector('.discount');
    const quantity = parseInt(quantityInput.value) || 0; // Usar 0 si es inválido
    const discount = parseFloat(discountInput.value) || 0;

     // Validar cantidad mínima
    if (quantity < 1 && quantityInput === document.activeElement) { // Solo validar si el usuario está editando este campo
         // quantityInput.value = 1; // Opcional: forzar a 1
         // quantity = 1;
         // Por ahora, permitimos 0 temporalmente mientras escribe, pero la validación del form fallará
    }
     // Validar descuento
     if (discount < 0) {
         discountInput.value = 0;
         discount = 0;
     }

    const subtotal = (price * quantity) - discount;
    row.querySelector('.subtotal').textContent = subtotal.toFixed(2);
}

function calculateTotals() {
    let totalDiscounts = 0;
    let totalSale = 0;
    cartTableBody.querySelectorAll('tr').forEach(row => {
        const discount = parseFloat(row.querySelector('.discount').value) || 0;
        const subtotal = parseFloat(row.querySelector('.subtotal').textContent) || 0;
        totalDiscounts += discount;
        totalSale += subtotal; // El subtotal ya tiene el descuento aplicado
    });
    totalDiscountsInput.value = totalDiscounts.toFixed(2);
    totalSaleInput.value = totalSale.toFixed(2);
}

function updateCartView() {
    const hasItems = cartTableBody.querySelector('tr') !== null;
    cartEmptyMessage.style.display = hasItems ? 'none' : 'block';
    cartTableBody.style.display = hasItems ? '' : 'none'; // Ocultar tbody si no hay filas
}


// --- MANEJO DE MODALES Y BÚSQUEDA ---
async function handleProductSearch() {
    const searchTerm = productSearchInput.value.trim();
    productListUl.innerHTML = ''; // Limpiar resultados anteriores
    productSearchMessage.textContent = 'Buscando...';

    if (searchTerm.length < 1 && searchTerm.length !== 0) { // Permitir búsqueda vacía para mostrar iniciales
        productSearchMessage.textContent = 'Escribe para buscar productos.';
        return;
    }

    try {
        // Llamada a la API (que crearemos en Vercel)
        const response = await fetch(`${API_BASE_URL}/productos?term=${encodeURIComponent(searchTerm)}`);
        if (!response.ok) {
             const err = await response.json();
             throw new Error(err.error || `Error ${response.status}`);
        }
        const products = await response.json();
        displayProductList(products);

    } catch (error) {
        console.error("Error buscando productos:", error);
        productSearchMessage.textContent = `Error: ${error.message}`;
    }
}

function displayProductList(products) {
    productListUl.innerHTML = ''; // Limpiar
    if (!products || products.length === 0) {
        productSearchMessage.textContent = 'No se encontraron productos.';
        return;
    }
    productSearchMessage.textContent = `${products.length} producto(s) encontrado(s).`;

    products.forEach(product => {
        const listItem = document.createElement('li');
        // Asumiendo que la API devuelve objetos con claves iguales a las columnas
        listItem.textContent = `${product['NOMBRE PRODUCTO']} - Precio: ${product['PRECIO VENTA']}`;
        listItem.style.cursor = 'pointer';
        listItem.onclick = () => addProductToCart(product); // Pasar el objeto completo
        productListUl.appendChild(listItem);
    });
}

// --- Funciones similares para Clientes y Vendedores ---
async function handleClientSearch() {
    const searchTerm = clientSearchModalInput.value.trim();
    clientListModalUl.innerHTML = '';
    clientSearchMessage.textContent = 'Buscando...';

     if (searchTerm.length < 1 && searchTerm.length !== 0) {
        clientSearchMessage.textContent = 'Escribe para buscar clientes.';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/clientes?term=${encodeURIComponent(searchTerm)}`);
         if (!response.ok) { const err = await response.json(); throw new Error(err.error || `Error ${response.status}`); }
        const clients = await response.json();
        displayClientList(clients);
    } catch (error) {
        console.error("Error buscando clientes:", error);
        clientSearchMessage.textContent = `Error: ${error.message}`;
    }
}

function displayClientList(clients) {
     clientListModalUl.innerHTML = '';
    if (!clients || clients.length === 0) {
        clientSearchMessage.textContent = 'No se encontraron clientes.';
        return;
    }
    clientSearchMessage.textContent = `${clients.length} cliente(s) encontrado(s).`;
    clients.forEach(client => {
        const listItem = document.createElement('li');
        listItem.textContent = `${client['CLIENTE']} (ID: ${client['ID CLIENTE']})`; // Ajusta nombres de campo
        listItem.style.cursor = 'pointer';
        listItem.onclick = () => selectClient(client);
        clientListModalUl.appendChild(listItem);
    });
}

function selectClient(client) {
    clientSearchInput.value = client['CLIENTE'];
    clientIdHidden.value = client['ID CLIENTE']; // Guardar ID en campo oculto
    closeClientModal();
}

async function handleSellerSearch() {
    const searchTerm = sellerSearchModalInput.value.trim();
    sellerListModalUl.innerHTML = '';
    sellerSearchMessage.textContent = 'Buscando...';

     if (searchTerm.length < 1 && searchTerm.length !== 0) {
        sellerSearchMessage.textContent = 'Escribe para buscar vendedores.';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/vendedores?term=${encodeURIComponent(searchTerm)}`);
        if (!response.ok) { const err = await response.json(); throw new Error(err.error || `Error ${response.status}`); }
        const sellers = await response.json();
        displaySellerList(sellers);
    } catch (error) {
        console.error("Error buscando vendedores:", error);
        sellerSearchMessage.textContent = `Error: ${error.message}`;
    }
}

function displaySellerList(sellers) {
     sellerListModalUl.innerHTML = '';
    if (!sellers || sellers.length === 0) {
        sellerSearchMessage.textContent = 'No se encontraron vendedores.';
        return;
    }
     sellerSearchMessage.textContent = `${sellers.length} vendedor(es) encontrado(s).`;
    sellers.forEach(seller => {
        const listItem = document.createElement('li');
        // Asumiendo que API devuelve ID USUARIO, NOMBRE, APELLIDO, EMAIL
        const displayName = `${seller['NOMBRE'] || ''} ${seller['APELLIDO'] || ''}`.trim();
        listItem.textContent = `${displayName || seller['EMAIL']} (ID: ${seller['ID USUARIO']})`;
        listItem.style.cursor = 'pointer';
        listItem.onclick = () => selectSeller(seller);
        sellerListModalUl.appendChild(listItem);
    });
}

function selectSeller(seller) {
    const displayName = `${seller['NOMBRE'] || ''} ${seller['APELLIDO'] || ''}`.trim();
    sellerSearchInput.value = displayName || seller['EMAIL']; // Mostrar nombre o email
    sellerIdHidden.value = seller['ID USUARIO']; // Guardar ID
    sellerEmailHidden.value = seller['EMAIL']; // Guardar email
    closeSellerModal();
    generateSaleId(); // Regenerar ID si cambia el vendedor
}


// --- Funciones de Utilidad ---
function generateSaleId() {
    const saleDate = new Date();
    const year = saleDate.getFullYear();
    const month = String(saleDate.getMonth() + 1).padStart(2, '0');
    const day = String(saleDate.getDate()).padStart(2, '0');
    const hours = String(saleDate.getHours()).padStart(2, '0');
    const minutes = String(saleDate.getMinutes()).padStart(2, '0');
    const seconds = String(saleDate.getSeconds()).padStart(2, '0');
    const sellerIdentifier = sellerIdHidden.value || sellerEmailHidden.value.split('@')[0] || 'NOSLR'; // Usar ID o parte del email

    const saleId = `${year}${month}${day}-${sellerIdentifier.substring(0, 8)}-${hours}${minutes}${seconds}`;
    saleIdInput.value = saleId;
    console.log('Generated Sale ID:', saleId);
}

function generateDetailSaleId() {
    // Genera un ID único para el detalle
    return 'det-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}

function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
}

function showSuccessAnimation() {
    successAnimationDiv.style.display = 'block';
    setTimeout(() => {
        successAnimationDiv.style.display = 'none';
    }, 2000);
}

// Debounce para evitar llamadas API excesivas en la búsqueda
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

function printInvoice(saleData) {
    // Esta función generará el HTML localmente como en el ejemplo anterior
    // O podría modificarse para abrir un endpoint /api/generar-factura?saleId=...
    // si prefieres generar el PDF/HTML en el backend.
    // Por ahora, mantenemos la generación local:
    console.log("Generando factura para (datos recibidos):", saleData);
     if (!saleData || !saleData.saleId) {
        console.error("No hay datos de venta para imprimir la factura.");
        alert("No se pueden generar la factura, faltan datos.");
        return;
    }

    // Asegurarse que products esté presente y sea un array
    const products = Array.isArray(saleData.products) ? saleData.products : (saleData.data && Array.isArray(saleData.data.products) ? saleData.data.products : []);

    let invoiceHTML = `...`; // (Pega aquí el código HTML de la factura del ejemplo anterior)
                            // Asegúrate de usar las claves correctas del objeto saleData
                            // que recibes (puede ser saleData.clientName o saleData.cliente.nombre, etc.)
                            // y lo mismo para los productos dentro del bucle.

     // --- Ejemplo de cómo adaptar el HTML de la factura ---
     invoiceHTML = `
        <!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Factura ${saleData.saleId}</title>
        <style>/* ... tus estilos de factura ... */</style></head><body><div class="invoice-box">
        <div class="header"><h1>Factura</h1><p><strong>Número:</strong> ${saleData.saleId}</p><p><strong>Fecha:</strong> ${new Date(saleData.saleDate + 'T00:00:00').toLocaleDateString()}</p></div>
        <div class="client-info"><h2>Cliente</h2><p><strong>Nombre:</strong> ${saleData.clientName || saleData.clientId || 'N/A'}</p><p><strong>ID:</strong> ${saleData.clientId || 'N/A'}</p></div>
        <div class="seller-info"><h2>Vendedor</h2><p><strong>Email:</strong> ${saleData.userEmail || 'N/A'}</p><p><strong>ID:</strong> ${saleData.sellerId || 'N/A'}</p></div>
        <div class="details"><h2>Detalles</h2><table><thead><tr><th>Producto</th><th>Cant.</th><th>P. Unit.</th><th>Desc.</th><th>Subtotal</th></tr></thead><tbody>`;

     let calculatedTotalSale = 0;
     products.forEach(item => {
         const unitPrice = parseFloat(item.unitPrice || item['PRECIO UNITARIO'] || 0);
         const quantity = parseInt(item.quantity || item.CANTIDAD || 0);
         const discount = parseFloat(item.discount || item.DESCUENTO || 0);
         const subtotal = (unitPrice * quantity) - discount;
         calculatedTotalSale += subtotal;
         invoiceHTML += `
             <tr>
                 <td>${item.productName || item['NOMBRE PRODUCTO']}</td>
                 <td class="num">${quantity}</td>
                 <td class="num">${unitPrice.toFixed(2)}</td>
                 <td class="num">${discount.toFixed(2)}</td>
                 <td class="num">${subtotal.toFixed(2)}</td>
             </tr>`;
     });

     invoiceHTML += `</tbody></table></div>
        <div class="totals"><p>Forma de Pago: ${saleData.paymentType}</p><p>Comentarios: ${saleData.comments || ''}</p><hr>
        <p>Total Descuentos Items: -${parseFloat(saleData.totalDiscounts).toFixed(2)}</p>
        <p>Total Venta: ${parseFloat(saleData.totalSale).toFixed(2)}</p> <!-- Usar el total calculado o el del form -->
        </div><button onclick="window.print();">Imprimir</button></div></body></html>`;
     // --- Fin Ejemplo adaptación ---


    const invoiceWindow = window.open('', '_blank', 'width=800,height=600');
    if (invoiceWindow) {
        invoiceWindow.document.open();
        invoiceWindow.document.write(invoiceHTML);
        invoiceWindow.document.close();
    } else {
        alert('No se pudo abrir la ventana para imprimir. Revisa los bloqueadores de pop-ups.');
    }
}


// --- Funciones para abrir/cerrar modales ---
function openProductModal() { productModal.style.display = 'block'; productSearchInput.focus(); handleProductSearch(); }
function closeProductModal() { productModal.style.display = 'none'; }
function openClientModal() { clientModal.style.display = 'block'; clientSearchModalInput.focus(); handleClientSearch(); }
function closeClientModal() { clientModal.style.display = 'none'; }
function openSellerModal() { sellerModal.style.display = 'block'; sellerSearchModalInput.focus(); handleSellerSearch(); }
function closeSellerModal() { sellerModal.style.display = 'none'; }
