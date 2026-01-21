# 1. Chọn hệ điều hành cơ bản chứa Python (bản slim cho nhẹ)
FROM python:3.9-slim

# 2. Thiết lập thư mục làm việc bên trong container
WORKDIR /app

# 3. Copy file requirements vào trước (để tận dụng cache của Docker)
COPY requirements.txt .

# 4. Cài đặt các thư viện cần thiết
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy toàn bộ mã nguồn dự án vào container
COPY . .

# 6. Mở cổng 8000 để truy cập
EXPOSE 8080

# 7. Lệnh chạy ứng dụng khi container khởi động
CMD ["python", "app.py"]