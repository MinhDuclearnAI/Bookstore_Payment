// --- BIẾN TOÀN CỤC ---
let allProducts = [];       // Chứa danh sách gốc tải từ server
let cart = [];              // Chứa các món trong giỏ hàng
let currentCategory = "All";// Danh mục đang chọn

// --- KHỞI TẠO ---
document.addEventListener('DOMContentLoaded', () => {
    loadProducts(); // Tải sản phẩm
    loadHistory();  // Tải lịch sử
    
    // Gán sự kiện nút thanh toán
    const btnPay = document.getElementById('btn-pay');
    if (btnPay) btnPay.addEventListener('click', handleCheckout);
});

// --- 1. TẢI DỮ LIỆU TỪ SERVER ---
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        allProducts = await response.json();
        
        renderCategories();       // Vẽ cột danh mục bên trái
        renderProductGrid("All"); // Vẽ lưới sản phẩm (mặc định hiện tất cả)
    } catch (error) {
        console.error('Lỗi tải sản phẩm:', error);
        document.getElementById('product-grid').innerHTML = '<p style="color:red">Lỗi kết nối server!</p>';
    }
}

async function loadHistory() {
    try {
        const response = await fetch('/api/history');
        const orders = await response.json();
        
        const list = document.getElementById('history-list');
        list.innerHTML = '';
        orders.forEach(order => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center">
                    <div>
                        <strong>${order.customer_name}</strong><br>
                        <small>${formatCurrency(order.total_amount)}</small>
                    </div>
                    <a href="/invoice/${order.id}" target="_blank" style="color:#2980b9"><i class="fas fa-print"></i></a>
                </div>
            `;
            li.style.borderBottom = "1px dashed #eee";
            li.style.padding = "10px 0";
            list.appendChild(li);
        });
    } catch (error) { console.error(error); }
}

// --- 2. VẼ DANH MỤC (SIDEBAR) ---
function renderCategories() {
    // Lấy danh sách Category duy nhất từ data
    const categories = ["All", ...new Set(allProducts.map(p => p.category).filter(Boolean))];
    const ul = document.getElementById('category-list');
    ul.innerHTML = '';

    categories.forEach(cat => {
        const li = document.createElement('li');
        li.textContent = cat === "All" ? "Tất cả" : cat;
        
        if (cat === "All") li.classList.add('active');

        li.onclick = () => {
            // Xử lý active class
            document.querySelectorAll('#category-list li').forEach(el => el.classList.remove('active'));
            li.classList.add('active');
            
            // Vẽ lại lưới sản phẩm theo mục đã chọn
            renderProductGrid(cat);
        };
        ul.appendChild(li);
    });
}

// --- 3. VẼ LƯỚI SẢN PHẨM (CORE LOGIC) ---
function renderProductGrid(filterCategory) {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = ''; 
    currentCategory = filterCategory;

    // BƯỚC A: Cập nhật tiêu đề
    document.getElementById('current-category-title').innerText = 
        filterCategory === "All" ? "Tất cả sản phẩm" : filterCategory;

    // BƯỚC B: Lọc sản phẩm theo Category
    let filtered = allProducts;
    if (filterCategory !== "All") {
        filtered = allProducts.filter(p => p.category === filterCategory);
    }

    // BƯỚC C: Gom nhóm theo Dòng (Subcategory) để vẽ tiêu đề ngăn cách
    // Tạo object: { "Cà phê": [list...], "Trà": [list...] }
    const groupedBySub = {};
    filtered.forEach(p => {
        const sub = p.subcategory || "Khác";
        if (!groupedBySub[sub]) groupedBySub[sub] = [];
        groupedBySub[sub].push(p);
    });

    // BƯỚC D: Duyệt từng Dòng để vẽ
    for (const [subName, productsInSub] of Object.entries(groupedBySub)) {
        
        // 1. Vẽ tiêu đề Dòng (nếu không phải "All" hoặc muốn hiển thị rõ ràng)
        if (Object.keys(groupedBySub).length > 1 || subName !== "Khác") {
            const header = document.createElement('div');
            header.className = 'subcategory-header'; // Class này cần CSS đã viết ở bước trước
            header.innerHTML = `<i class="fas fa-tag"></i> ${subName}`;
            header.style.gridColumn = "1 / -1"; // Chiếm hết chiều ngang
            header.style.marginTop = "15px";
            header.style.color = "#7f8c8d";
            header.style.fontWeight = "bold";
            header.style.borderBottom = "1px solid #eee";
            grid.appendChild(header);
        }

        // 2. Trong mỗi Dòng, ta lại phải gom nhóm theo TÊN SẢN PHẨM (để xử lý biến thể)
        // VD: [Cafe Nóng, Cafe Đá] -> Gom thành 1 nút "Cafe"
        const uniqueNames = {};
        productsInSub.forEach(p => {
            if (!uniqueNames[p.name]) uniqueNames[p.name] = [];
            uniqueNames[p.name].push(p);
        });

        // 3. Vẽ thẻ sản phẩm
        for (const [prodName, variants] of Object.entries(uniqueNames)) {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            // Giá hiển thị: Nếu có nhiều loại thì hiện giá min + dấu "+"
            const minPrice = Math.min(...variants.map(v => v.price));
            let priceText = formatCurrency(minPrice);
            if (variants.length > 1) priceText += "+";

            // Sự kiện click
            card.onclick = () => handleProductClick(prodName, variants);

            card.innerHTML = `
                <div class="p-name" style="font-weight:bold">${prodName}</div>
                <div class="p-price" style="color:#e67e22">${priceText}</div>
                ${variants.length > 1 ? `<small style="color:#2980b9; font-size:0.8em">${variants.length} loại</small>` : ''}
            `;
            grid.appendChild(card);
        }
    }
}

// --- 4. XỬ LÝ CLICK SẢN PHẨM (MODAL HOẶC ADD) ---
function handleProductClick(name, variants) {
    // TH1: Chỉ có 1 biến thể duy nhất -> Thêm ngay
    if (variants.length === 1) {
        addToCart(variants[0].id);
        return;
    }

    // TH2: Có nhiều biến thể -> Hiện Modal
    const modal = document.getElementById('variant-modal');
    const title = document.getElementById('modal-title');
    const container = document.getElementById('modal-options');

    title.innerText = `Chọn loại: ${name}`;
    container.innerHTML = ''; // Xóa cũ

    variants.forEach(v => {
        const btn = document.createElement('button');
        // Hiển thị: "Nóng (20.000 đ)"
        const variantName = v.variant || "Tiêu chuẩn";
        btn.innerHTML = `<span>${variantName}</span> <span>${formatCurrency(v.price)}</span>`;
        
        btn.onclick = () => {
            addToCart(v.id);
            modal.style.display = 'none'; // Đóng modal sau khi chọn
        };
        container.appendChild(btn);
    });

    modal.style.display = 'flex'; // Hiện modal
}

// --- 5. LOGIC GIỎ HÀNG ---
function addToCart(productId) {
    // Tìm chi tiết sản phẩm trong allProducts
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    // Kiểm tra đã có trong giỏ chưa
    const existingItem = cart.find(i => i.id === productId);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        // Copy và thêm trường quantity
        cart.push({ ...product, quantity: 1 });
    }
    renderCart();
}

function renderCart() {
    const tbody = document.getElementById('cart-body');
    const totalEl = document.getElementById('total-amount');
    tbody.innerHTML = '';
    let total = 0;

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const row = document.createElement('tr');
        
        // Tên hiển thị kèm biến thể
        let displayName = item.name;
        if (item.variant) displayName += ` <small>(${item.variant})</small>`;

        row.innerHTML = `
            <td>${displayName}</td>
            <td>
                <button onclick="updateQuantity(${index}, -1)" style="padding:2px 5px">-</button>
                ${item.quantity}
                <button onclick="updateQuantity(${index}, 1)" style="padding:2px 5px">+</button>
            </td>
            <td>${formatCurrency(itemTotal)}</td>
            <td><i class="fas fa-trash" style="color:red; cursor:pointer" onclick="removeFromCart(${index})"></i></td>
        `;
        tbody.appendChild(row);
    });

    totalEl.textContent = formatCurrency(total);
}

function updateQuantity(index, change) {
    cart[index].quantity += change;
    if (cart[index].quantity <= 0) cart.splice(index, 1);
    renderCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
}

// --- 6. THANH TOÁN ---
async function handleCheckout() {
    if (cart.length === 0) {
        alert('Giỏ hàng trống!');
        return;
    }

    const customerName = document.getElementById('customer-name').value || "Khách lẻ";
    const btn = document.getElementById('btn-pay');
    
    // Tạo payload chỉ gửi ID và số lượng (Server tự tính tiền)
    const payload = {
        customer_name: customerName,
        items: cart.map(i => ({ id: i.id, quantity: i.quantity }))
    };

    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';

        const res = await fetch('/api/pay', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (result.success) {
            // Mở hóa đơn tab mới
            window.open(`/invoice/${result.order_id}`, '_blank');
            // Reset
            cart = [];
            document.getElementById('customer-name').value = '';
            renderCart();
            loadHistory();
        } else {
            alert(result.message);
        }
    } catch (e) {
        console.error(e);
        alert('Lỗi thanh toán');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-file-invoice-dollar"></i> Thanh toán & In';
    }
}

// --- UTILS ---
function formatCurrency(num) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
}