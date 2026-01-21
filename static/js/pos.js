// --- BIẾN TOÀN CỤC ---
let cart = [];          // Giỏ hàng hiện tại (chứa danh sách object)
let products = [];      // Danh sách sản phẩm tải từ server

// --- KHỞI TẠO KHI TRANG WEB LOAD XONG ---
document.addEventListener('DOMContentLoaded', () => {
    loadProducts(); // Tải danh sách món ăn
    loadHistory();  // Tải lịch sử 10 người gần nhất
    
    // Gán sự kiện cho nút Thanh toán
    document.getElementById('btn-pay').addEventListener('click', handleCheckout);
});

// --- 1. HÀM TẢI DỮ LIỆU TỪ SERVER ---

async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        products = await response.json();
        renderProductGrid();
    } catch (error) {
        console.error('Lỗi khi tải sản phẩm:', error);
        alert('Không thể kết nối đến server!');
    }
}

async function loadHistory() {
    try {
        const response = await fetch('/api/history');
        const historyData = await response.json();
        renderHistoryList(historyData);
    } catch (error) {
        console.error('Lỗi tải lịch sử:', error);
    }
}

// --- 2. HÀM HIỂN THỊ GIAO DIỆN (RENDER) ---

// Hiển thị lưới sản phẩm để chọn
function renderProductGrid() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = ''; // Xóa nội dung cũ

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card'; // Class CSS để style
        // Khi click vào thẻ món ăn -> Thêm vào giỏ
        card.onclick = () => addToCart(product.id);
        
        card.innerHTML = `
            <div class="p-name">${product.name}</div>
            <div class="p-price">${formatCurrency(product.price)}</div>
        `;
        grid.appendChild(card);
    });
}

// Hiển thị giỏ hàng và tính tổng tiền hiển thị
function renderCart() {
    const tbody = document.getElementById('cart-body');
    const totalSpan = document.getElementById('total-amount');
    tbody.innerHTML = '';

    let total = 0;

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.name}</td>
            <td>
                <button onclick="updateQuantity(${index}, -1)">-</button>
                ${item.quantity}
                <button onclick="updateQuantity(${index}, 1)">+</button>
            </td>
            <td>${formatCurrency(itemTotal)}</td>
            <td><button class="btn-del" onclick="removeFromCart(${index})">Xóa</button></td>
        `;
        tbody.appendChild(row);
    });

    // Hiển thị tổng tiền
    totalSpan.textContent = formatCurrency(total);
}

// Hiển thị lịch sử 10 đơn hàng
function renderHistoryList(orders) {
    const list = document.getElementById('history-list');
    list.innerHTML = '';

    orders.forEach(order => {
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>${order.customer_name}</strong> - ${formatCurrency(order.total_amount)}
            <br><small>${order.created_at}</small>
            <a href="/invoice/${order.id}" target="_blank">In lại</a>
        `;
        list.appendChild(li);
    });
}

// --- 3. LOGIC GIỎ HÀNG (CLIENT SIDE) ---

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Kiểm tra xem món này đã có trong giỏ chưa
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        // Copy thông tin sản phẩm và thêm số lượng
        cart.push({ ...product, quantity: 1 });
    }
    
    renderCart(); // Vẽ lại giỏ hàng
}

function updateQuantity(index, change) {
    cart[index].quantity += change;
    
    // Nếu số lượng giảm về 0 thì xóa luôn món đó
    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }
    renderCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
}

// --- 4. LOGIC THANH TOÁN (GỌI API) ---

async function handleCheckout() {
    if (cart.length === 0) {
        alert("Giỏ hàng đang trống!");
        return;
    }

    const customerName = document.getElementById('customer-name').value || "Khách lẻ";
    const btnPay = document.getElementById('btn-pay');

    // Chuẩn bị dữ liệu gửi lên server
    const payload = {
        customer_name: customerName,
        items: cart.map(item => ({
            id: item.id,
            quantity: item.quantity
        }))
    };

    try {
        // Khóa nút thanh toán để tránh click đúp
        btnPay.disabled = true;
        btnPay.textContent = "Đang xử lý...";

        const response = await fetch('/api/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            // 1. Mở hóa đơn ở tab mới để in
            window.open(`/invoice/${result.order_id}`, '_blank');
            
            // 2. Reset giỏ hàng và form
            cart = [];
            document.getElementById('customer-name').value = '';
            renderCart();
            
            // 3. Cập nhật lại lịch sử bên cạnh
            loadHistory(); 
        } else {
            alert('Có lỗi xảy ra: ' + result.message);
        }

    } catch (error) {
        console.error('Lỗi thanh toán:', error);
        alert('Lỗi kết nối server!');
    } finally {
        // Mở lại nút thanh toán
        btnPay.disabled = false;
        btnPay.textContent = "Thanh toán & Xuất hóa đơn";
    }
}

// --- TIỆN ÍCH ---
// Hàm format tiền Việt Nam (Ví dụ: 100000 -> 100.000 đ)
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}