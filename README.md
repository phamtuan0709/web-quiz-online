# Hệ Thống Trắc Nghiệm Online

Hệ thống trắc nghiệm online cho phép giáo viên tạo và quản lý các bài kiểm tra, học sinh có thể làm bài và xem kết quả ngay lập tức.

## Tính năng

### Giáo viên
- Đăng nhập/đăng ký tài khoản
- Tạo, chỉnh sửa, xóa bài kiểm tra
- Thêm câu hỏi trắc nghiệm với nhiều đáp án
- Mở/đóng quyền truy cập vào bài kiểm tra
- Xem kết quả và thống kê

### Học sinh
- Nhập tên và lớp để truy cập
- Làm bài kiểm tra trắc nghiệm
- Xem kết quả ngay sau khi nộp bài
- Xem đáp án đúng cho các câu hỏi

## Yêu cầu hệ thống

- Node.js (v14+)
- MongoDB
- Kết nối mạng LAN cho các máy tính

## Cài đặt

1. Cài đặt MongoDB trên máy giáo viên (server):
   - Tải MongoDB từ [trang chủ MongoDB](https://www.mongodb.com/try/download/community)
   - Cài đặt theo hướng dẫn

2. Clone hoặc tải dự án về:
   ```
   git clone [đường dẫn repository]
   ```
   hoặc giải nén file zip

3. Di chuyển vào thư mục dự án:
   ```
   cd Web\ quizz
   ```

4. Cài đặt các gói phụ thuộc:
   ```
   npm install
   ```

5. Cấu hình:
   - Mở file `src/index.js`
   - Sửa đường dẫn MongoDB nếu cần thiết (mặc định: `mongodb://localhost:27017/webquiz`)

## Chạy ứng dụng

### Bước 1: Khởi động MongoDB
Trước khi chạy ứng dụng, cần đảm bảo MongoDB đã được khởi động:

**Trên macOS (sử dụng Homebrew):**
```bash
brew services start mongodb/brew/mongodb-community
```

**Trên Windows:**
- Mở Command Prompt với quyền Administrator
- Chạy lệnh: `net start MongoDB`
- Hoặc khởi động từ Services trong Control Panel

**Trên Linux (Ubuntu/Debian):**
```bash
sudo systemctl start mongod
```

### Bước 2: Cài đặt dependencies
Di chuyển vào thư mục dự án và cài đặt các package cần thiết:
```bash
cd "Web quizz"
npm install
```

### Bước 3: Khởi động server
Có 3 cách để khởi động server:

**Cách 1: Chế độ Production (khuyến nghị cho sử dụng thực tế)**
```bash
npm start
```

**Cách 2: Chế độ Development (khuyến nghị cho phát triển)**
```bash
npm run dev
```
*Chế độ này sẽ tự động khởi động lại server khi có thay đổi trong code*

**Cách 3: Khởi động trực tiếp**
```bash
node src/index.js
```

### Bước 4: Truy cập ứng dụng
Sau khi server khởi động thành công, bạn sẽ thấy thông báo:
```
Server running on http://localhost:3000
```

- **Trên máy chủ**: Mở trình duyệt và truy cập `http://localhost:3000`
- **Trên các máy khác trong mạng LAN**: Truy cập `http://[địa-chỉ-IP-máy-chủ]:3000`

### Bước 5: Dừng server
Để dừng server, nhấn `Ctrl + C` trong terminal đang chạy ứng dụng.

## Khắc phục sự cố thường gặp

### Lỗi MongoDB không kết nối được:
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Giải pháp**: Đảm bảo MongoDB đã được khởi động trước khi chạy ứng dụng.

### Lỗi Port đã được sử dụng:
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Giải pháp**: 
- Dừng tiến trình đang sử dụng port 3000
- Hoặc thay đổi port trong file `src/index.js`

### Lỗi thiếu dependencies:
```
Error: Cannot find module 'express'
```
**Giải pháp**: Chạy lại `npm install` để cài đặt các package cần thiết.

## Đăng ký tài khoản giáo viên đầu tiên

Khi lần đầu chạy ứng dụng, bạn cần đăng ký tài khoản giáo viên:

1. Truy cập `http://[địa-chỉ-IP-máy-chủ]:3000/teacher/register`
2. Điền thông tin đăng ký
3. Sau khi đăng ký, hệ thống sẽ chuyển hướng đến trang đăng nhập

## Liên hệ và hỗ trợ

Nếu bạn cần hỗ trợ hoặc có câu hỏi, vui lòng liên hệ:
- Email: phamtuan07092005@gmail.com
- Điện thoại: 0966546347