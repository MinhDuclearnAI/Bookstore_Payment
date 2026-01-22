from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json
import os

app = Flask(__name__)

# --- CẤU HÌNH DATABASE ---
# Sử dụng SQLite, file sẽ được tạo tự động
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///pos_system.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- ĐỊNH NGHĨA BẢNG DỮ LIỆU (MODELS) ---

class Product(db.Model):
    """Bảng chứa thông tin sản phẩm"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)   # Tên món (VD: Cà phê nâu)
    price = db.Column(db.Float, nullable=False)        # Giá bán
    
    # Các trường phân loại mới
    category = db.Column(db.String(50), default="Chung")  # Mục (VD: Đồ uống)
    subcategory = db.Column(db.String(50), default="")    # Dòng (VD: Cà phê)
    variant = db.Column(db.String(50), default="")        # Biến thể (VD: Nóng, Đá, Size L)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "price": self.price,
            "category": self.category,
            "subcategory": self.subcategory,
            "variant": self.variant
        }

class Order(db.Model):
    """Bảng lưu lịch sử đơn hàng"""
    id = db.Column(db.Integer, primary_key=True)
    customer_name = db.Column(db.String(100), default="Khách lẻ")
    total_amount = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    # Lưu chi tiết món đã mua (Dạng chuỗi JSON)
    items_json = db.Column(db.Text, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "customer_name": self.customer_name,
            "total_amount": self.total_amount,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }

# --- KHỞI TẠO DATABASE ---
with app.app_context():
    db.create_all()
    # Tạo dữ liệu mẫu nếu chưa có gì (để bạn test cho dễ)
    if not Product.query.first():
        sample_products = [
            Product(name="Cà phê nâu", variant="Nóng", price=20000, category="Đồ uống", subcategory="Cà phê"),
            Product(name="Cà phê nâu", variant="Đá", price=25000, category="Đồ uống", subcategory="Cà phê"),
            Product(name="Hướng dương", variant="Gói nhỏ", price=10000, category="Đồ ăn vặt", subcategory="Hạt"),
        ]
        db.session.add_all(sample_products)
        db.session.commit()

# --- ROUTES: GIAO DIỆN HTML ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/admin')
def admin():
    return render_template('admin.html')

@app.route('/invoice/<int:order_id>')
def invoice(order_id):
    order = Order.query.get_or_404(order_id)
    items = json.loads(order.items_json)
    return render_template('invoice.html', order=order, items=items)

# --- ROUTES: API (XỬ LÝ LOGIC) ---

# 1. API Lấy danh sách sản phẩm (Để hiển thị lên POS và Admin)
@app.route('/api/products', methods=['GET'])
def get_products():
    products = Product.query.all()
    return jsonify([p.to_dict() for p in products])

# 2. API Thêm hoặc Sửa sản phẩm (Cập nhật full tính năng)
@app.route('/api/products', methods=['POST'])
def save_product():
    data = request.json
    
    # Kiểm tra dữ liệu đầu vào cơ bản
    if not data.get('name') or not data.get('price'):
        return jsonify({"success": False, "message": "Thiếu tên hoặc giá!"}), 400

    if 'id' in data and data['id']:
        # --- LOGIC SỬA SẢN PHẨM ---
        product = Product.query.get(data['id'])
        if product:
            product.name = data['name']
            product.price = float(data['price'])
            product.category = data.get('category', 'Chung')
            product.subcategory = data.get('subcategory', '')
            product.variant = data.get('variant', '')
            message = "Đã cập nhật sản phẩm!"
        else:
            return jsonify({"success": False, "message": "Không tìm thấy ID!"}), 404
    else:
        # --- LOGIC THÊM MỚI ---
        new_product = Product(
            name=data['name'],
            price=float(data['price']),
            category=data.get('category', 'Chung'),
            subcategory=data.get('subcategory', ''),
            variant=data.get('variant', '')
        )
        db.session.add(new_product)
        message = "Đã thêm sản phẩm mới!"
    
    db.session.commit()
    return jsonify({"message": message, "success": True})

# 3. API Thanh toán (Tính tiền server-side an toàn)
@app.route('/api/pay', methods=['POST'])
def pay():
    data = request.json
    cart_items = data.get('items', [])
    customer_name = data.get('customer_name', 'Khách lẻ')

    total = 0
    final_items = []

    for item in cart_items:
        # Tìm sản phẩm trong DB bằng ID gửi lên
        product = Product.query.get(item['id'])
        if product:
            item_total = product.price * item['quantity']
            total += item_total
            
            # Tạo tên hiển thị cho hóa đơn (VD: "Cà phê nâu (Đá)")
            display_name = product.name
            if product.variant:
                display_name += f" ({product.variant})"

            final_items.append({
                "name": display_name,      # Tên đã kèm biến thể
                "price": product.price,
                "quantity": item['quantity'],
                "total": item_total
            })

    # Lưu đơn hàng
    new_order = Order(
        customer_name=customer_name,
        total_amount=total,
        items_json=json.dumps(final_items) # Lưu danh sách món
    )
    db.session.add(new_order)
    db.session.commit()

    return jsonify({
        "success": True, 
        "order_id": new_order.id, 
        "total": total
    })

# 4. API Lấy lịch sử 10 đơn gần nhất
@app.route('/api/history', methods=['GET'])
def get_history():
    orders = Order.query.order_by(Order.id.desc()).limit(10).all()
    return jsonify([o.to_dict() for o in orders])


if __name__ == '__main__':
    # app.run(debug=True, port=5000, host='0.0.0.0')
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)