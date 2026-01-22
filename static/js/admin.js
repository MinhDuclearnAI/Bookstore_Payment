// --- BIẾN TOÀN CỤC ---
let products = []; // Lưu danh sách sản phẩm để xử lý cục bộ

// --- KHỞI TẠO ---
document.addEventListener('DOMContentLoaded', () => {
    loadProducts(); // Tải dữ liệu khi vào trang

    // Gán sự kiện cho form
    const form = document.getElementById('product-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    // Gán sự kiện cho nút Hủy
    const btnCancel = document.getElementById('btn-cancel');
    if (btnCancel) {
        btnCancel.addEventListener('click', resetForm);
    }
});

// --- 1. TẢI DỮ LIỆU TỪ SERVER ---
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        products = await response.json();
        
        renderProductTable(products); // Vẽ bảng danh sách
        updateSuggestions(products);  // Cập nhật các từ khóa gợi ý nhập liệu
    } catch (error) {
        console.error('Lỗi tải sản phẩm:', error);
        alert('Không thể kết nối đến server!');
    }
}

// --- 2. CẬP NHẬT GỢI Ý NHẬP LIỆU (DATALIST) ---
function updateSuggestions(data) {
    // Lọc lấy danh sách Mục (Category) duy nhất
    const uniqueCategories = [...new Set(data.map(p => p.category).filter(Boolean))];
    const catList = document.getElementById('category-suggestions');
    catList.innerHTML = '';
    uniqueCategories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        catList.appendChild(opt);
    });

    // Lọc lấy danh sách Dòng (Subcategory) duy nhất
    const uniqueSubs = [...new Set(data.map(p => p.subcategory).filter(Boolean))];
    const subList = document.getElementById('subcategory-suggestions');
    subList.innerHTML = '';
    uniqueSubs.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub;
        subList.appendChild(opt);
    });
}

// --- 3. HIỂN THỊ BẢNG SẢN PHẨM ---
function renderProductTable(data) {
    const tbody = document.getElementById('product-table-body');
    tbody.innerHTML = ''; // Xóa dữ liệu cũ

    // Sắp xếp: Mới nhất lên đầu (theo ID giảm dần)
    const sortedData = [...data].sort((a, b) => b.id - a.id);

    sortedData.forEach((product, index) => {
        const row = document.createElement('tr');
        
        // Hiển thị tên + biến thể (nếu có)
        let nameDisplay = `<strong>${product.name}</strong>`;
        if (product.variant) {
            nameDisplay += ` <span style="color:#e67e22; font-size:0.9em">(${product.variant})</span>`;
        }

        // Hiển thị phân loại
        let catDisplay = product.category;
        if (product.subcategory) {
            catDisplay += ` <i class="fas fa-angle-right" style="font-size:0.8em; color:#ccc"></i> ${product.subcategory}`;
        }

        row.innerHTML = `
            <td style="text-align: center;">${index + 1}</td>
            <td>
                ${nameDisplay}<br>
                <small style="color:#7f8c8d">${catDisplay}</small>
            </td>
            <td>${formatCurrency(product.price)}</td>
            <td style="text-align: center;">
                <button class="btn-edit" onclick="editProduct(${product.id})">
                    <i class="fas fa-pen"></i> Sửa
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// --- 4. XỬ LÝ FORM (THÊM / SỬA) ---
async function handleFormSubmit(event) {
    event.preventDefault(); // Chặn load lại trang

    // Lấy dữ liệu từ các ô input
    const idInput = document.getElementById('product-id').value;
    const name = document.getElementById('product-name').value.trim();
    const price = document.getElementById('product-price').value;
    const category = document.getElementById('product-category').value.trim();
    const subcategory = document.getElementById('product-subcategory').value.trim();
    const variant = document.getElementById('product-variant').value.trim();

    // Validate cơ bản
    if (!name || !price) {
        alert("Vui lòng nhập Tên và Giá sản phẩm!");
        return;
    }

    // Tạo payload gửi lên server
    const payload = {
        id: idInput ? parseInt(idInput) : null, // Nếu có ID là Sửa, không là Thêm
        name: name,
        price: parseFloat(price),
        category: category,
        subcategory: subcategory,
        variant: variant
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
            resetForm();    // Xóa trắng form
            loadProducts(); // Tải lại bảng để thấy thay đổi
        } else {
            alert('Lỗi server: ' + result.message);
        }

    } catch (error) {
        console.error(error);
        alert('Lỗi kết nối!');
    }
}

// --- 5. CHỨC NĂNG SỬA (ĐỔ DỮ LIỆU LÊN FORM) ---
function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    // Điền dữ liệu vào form
    document.getElementById('product-id').value = product.id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-category').value = product.category || "";
    document.getElementById('product-subcategory').value = product.subcategory || "";
    document.getElementById('product-variant').value = product.variant || "";

    // Đổi giao diện sang chế độ "Sửa"
    document.getElementById('form-title').innerHTML = `<i class="fas fa-edit"></i> Sửa sản phẩm: ${product.name}`;
    document.getElementById('btn-submit').innerHTML = `<i class="fas fa-save"></i> Lưu thay đổi`;
    document.getElementById('btn-cancel').style.display = "inline-block";
    
    // Cuộn trang lên đầu để nhập liệu
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- 6. RESET FORM (QUAY VỀ CHẾ ĐỘ THÊM MỚI) ---
function resetForm() {
    // Xóa sạch input
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = ''; // Quan trọng: Xóa ID ẩn

    // Đổi giao diện về chế độ "Thêm mới"
    document.getElementById('form-title').innerHTML = `<i class="fas fa-plus-circle"></i> Thêm sản phẩm mới`;
    document.getElementById('btn-submit').innerHTML = `<i class="fas fa-plus"></i> Thêm sản phẩm`;
    document.getElementById('btn-cancel').style.display = "none";
}

// --- TIỆN ÍCH ---
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}