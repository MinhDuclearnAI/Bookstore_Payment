from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

app = Flask(__name__)
# --- CẤU HÌNH DATABASE (SQLite) ---
# Dữ liệu sẽ được lưu vào file 'pos_system.db'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///pos_system.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- ĐỊNH NGHĨA BẢNG DỮ LIỆU (MODELS) ---

class Product(db.Model):
    """Bảng chứa thông tin sản phẩm và giá"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, nullable=False)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "price": self.price}

class Order(db.Model):
    """Bảng lưu lịch sử đơn hàng"""
    id = db.Column(db.Integer, primary_key=True)
    customer_name = db.Column(db.String(100), default="Khách lẻ")
    total_amount = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    # Lưu danh sách món đã mua dưới dạng chuỗi JSON để in lại hóa đơn sau này
    items_json = db.Column(db.Text, nullable=False) 

    def to_dict(self):
        return {
            "id": self.id,
            "customer_name": self.customer_name,
            "total_amount": self.total_amount,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }

# --- KHỞI TẠO DATABASE ---
# Chạy lệnh này để tạo file db nếu chưa tồn tại
with app.app_context():
    db.create_all()
    # (Tùy chọn) Tạo dữ liệu mẫu nếu bảng rỗng
    if not Product.query.first():
        db.session.add_all([
            Product(name="Cà phê đen", price=25000),
            Product(name="Bạc xỉu", price=35000),
            Product(name="Trà đào", price=40000)
        ])
        db.session.commit()

# --- ROUTES: GIAO DIỆN (FRONTEND) ---

@app.route('/')
def index():
    """Trang bán hàng (POS)"""
    return render_template('index.html')

@app.route('/admin')
def admin():
    """Trang quản lý sản phẩm"""
    return render_template('admin.html')

@app.route('/invoice/<int:order_id>')
def invoice(order_id):
    """Trang xem và in hóa đơn"""
    order = Order.query.get_or_404(order_id)
    # Chuyển chuỗi JSON ngược lại thành danh sách để hiển thị
    items = json.loads(order.items_json)
    return render_template('invoice.html', order=order, items=items)

# --- ROUTES: API (XỬ LÝ LOGIC) ---

# 1. API Lấy danh sách sản phẩm
@app.route('/api/products', methods=['GET'])
def get_products():
    products = Product.query.all()
    return jsonify([p.to_dict() for p in products])

# 2. API Thêm hoặc Sửa sản phẩm
@app.route('/api/products', methods=['POST'])
def save_product():
    data = request.json
    # Nếu có ID thì là Sửa giá/Tên, không có ID thì là Thêm mới
    if 'id' in data and data['id']:
        product = Product.query.get(data['id'])
        if product:
            product.name = data['name']
            product.price = float(data['price'])
            message = "Đã cập nhật sản phẩm!"
    else:
        new_product = Product(name=data['name'], price=float(data['price']))
        db.session.add(new_product)
        message = "Đã thêm sản phẩm mới!"
    
    db.session.commit()
    return jsonify({"message": message, "success": True})

# 3. API Xử lý Thanh toán (QUAN TRỌNG)
@app.route('/api/pay', methods=['POST'])
def pay():
    data = request.json
    cart_items = data.get('items', [])
    customer_name = data.get('customer_name', 'Khách lẻ')

    total = 0
    final_items = []

    # Tính toán lại tổng tiền từ Database (Không tin tưởng giá từ client gửi lên)
    for item in cart_items:
        product = Product.query.get(item['id'])
        if product:
            item_total = product.price * item['quantity']
            total += item_total
            # Lưu lại chi tiết chính xác để in hóa đơn
            final_items.append({
                "name": product.name,
                "price": product.price,
                "quantity": item['quantity'],
                "total": item_total
            })

    # Lưu đơn hàng vào lịch sử
    new_order = Order(
        customer_name=customer_name,
        total_amount=total,
        items_json=json.dumps(final_items) # Lưu list món thành chuỗi JSON
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
    # Sắp xếp giảm dần theo id (mới nhất lên đầu) và lấy 10 dòng
    orders = Order.query.order_by(Order.id.desc()).limit(10).all()
    return jsonify([o.to_dict() for o in orders])

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')