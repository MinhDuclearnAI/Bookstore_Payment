// --- BIẾN TOÀN CỤC ---
let products = []; // Lưu danh sách sản phẩm tải về để dùng lại khi cần edit

// --- KHỞI TẠO ---
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();

    // Gán sự kiện submit cho form thêm/sửa
    const form = document.getElementById('product-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    // Gán sự kiện cho nút Hủy (nếu đang ở chế độ sửa mà muốn quay lại thêm mới)
    document.getElementById('btn-cancel').addEventListener('click', resetForm);
});

// --- 1. TẢI DỮ LIỆU ---
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        products = await response.json();
        renderProductTable(products);
    } catch (error) {
        console.error('Lỗi tải sản phẩm:', error);
        alert('Không thể tải danh sách sản phẩm.');
    }
}

// --- 2. HIỂN THỊ BẢNG SẢN PHẨM ---
function renderProductTable(data) {
    const tbody = document.getElementById('product-table-body');
    tbody.innerHTML = ''; // Xóa dữ liệu cũ

    data.forEach((product, index) => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${product.name}</td>
            <td>${formatCurrency(product.price)}</td>
            <td>
                <button class="btn-edit" onclick="editProduct(${product.id})">Sửa</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// --- 3. XỬ LÝ FORM (THÊM / SỬA) ---
async function handleFormSubmit(event) {
    event.preventDefault(); // Chặn load lại trang

    // Lấy dữ liệu từ form
    const idInput = document.getElementById('product-id').value; // Hidden input
    const nameInput = document.getElementById('product-name').value;
    const priceInput = document.getElementById('product-price').value;

    // Validate cơ bản
    if (!nameInput || !priceInput) {
        alert("Vui lòng nhập tên và giá!");
        return;
    }

    const payload = {
        id: idInput ? parseInt(idInput) : null, // Nếu có ID là Sửa, không có là Thêm
        name: nameInput,
        price: parseFloat(priceInput)
    };

    try {
        const response = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            alert(result.message);
            resetForm();    // Xóa form về trắng
            loadProducts(); // Tải lại bảng dữ liệu mới
        } else {
            alert('Lỗi: ' + result.message);
        }

    } catch (error) {
        console.error('Lỗi lưu sản phẩm:', error);
        alert('Lỗi kết nối đến server.');
    }
}

// --- 4. CHỨC NĂNG SỬA (Đổ dữ liệu lên form) ---
function editProduct(id) {
    // Tìm sản phẩm trong biến toàn cục
    const product = products.find(p => p.id === id);
    if (!product) return;

    // Đổ dữ liệu vào các ô input
    document.getElementById('product-id').value = product.id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-price').value = product.price;

    // Đổi nút "Thêm mới" thành "Lưu thay đổi" & Hiện nút Hủy
    document.getElementById('form-title').innerText = "Sửa sản phẩm";
    document.getElementById('btn-submit').innerText = "Lưu thay đổi";
    document.getElementById('btn-cancel').style.display = "inline-block";
}

// --- 5. CHỨC NĂNG RESET FORM ---
function resetForm() {
    // Xóa sạch các ô input
    document.getElementById('product-id').value = '';
    document.getElementById('product-name').value = '';
    document.getElementById('product-price').value = '';

    // Đưa giao diện về trạng thái "Thêm mới"
    document.getElementById('form-title').innerText = "Thêm sản phẩm mới";
    document.getElementById('btn-submit').innerText = "Thêm mới";
    document.getElementById('btn-cancel').style.display = "none";
}

// --- TIỆN ÍCH ---
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}