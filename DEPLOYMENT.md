# การ Deploy ระบบ Remote Control ฟรี

## วิธีที่ 1: Render.com (แนะนำ)

### ขั้นตอน Deploy Server:
1. ไปที่ https://render.com และสมัครสมาชิกฟรี
2. กด "New +" → "Web Service"
3. เชื่อมต่อ GitHub repository ของคุณ
4. ตั้งค่า:
   - Name: remote-control-server
   - Branch: main
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `node server.js`
5. กด "Create Web Service"
6. รอประมาณ 2-3 นาที ระบบจะ deploy ให้
7. ได้ URL เช่น: `https://remote-control-server.onrender.com`

### ขั้นตอนตั้งค่า Client:
1. แก้ไขไฟล์ `client.js`
2. เปลี่ยน SERVER_URL เป็น URL ของ server:
   ```javascript
   const SERVER_URL = process.env.SERVER_URL || 'https://remote-control-server.onrender.com';
   ```
3. รัน client: `node client.js`

---

## วิธีที่ 2: Railway.app

### ขั้นตอน Deploy Server:
1. ไปที่ https://railway.app และสมัครสมาชิกฟรี
2. กด "New Project" → "Deploy from GitHub repo"
3. เลือก repository ของคุณ
4. Railway จะ detect Node.js อัตโนมัติ
5. ตั้งค่า Environment Variables:
   - PORT: 3001
6. กด "Deploy"
7. ได้ URL เช่น: `https://remote-control-server.up.railway.app`

### ขั้นตอนตั้งค่า Client:
1. แก้ไขไฟล์ `client.js`
2. เปลี่ยน SERVER_URL:
   ```javascript
   const SERVER_URL = process.env.SERVER_URL || 'https://remote-control-server.up.railway.app';
   ```
3. รัน client: `node client.js`

---

## วิธีที่ 3: Glitch.com (ง่ายที่สุด)

### ขั้นตอน:
1. ไปที่ https://glitch.com
2. กด "New Project" → "glitch-hello-node"
3. อัปโหลดไฟล์ทั้งหมด:
   - server.js
   - package.json
   - public/ (โฟลเดอร์ทั้งหมด)
4. Glitch จะรันอัตโนมัติ
5. ได้ URL เช่น: `https://your-project-name.glitch.me`

### ขั้นตอนตั้งค่า Client:
1. แก้ไขไฟล์ `client.js`
2. เปลี่ยน SERVER_URL:
   ```javascript
   const SERVER_URL = process.env.SERVER_URL || 'https://your-project-name.glitch.me';
   ```
3. รัน client: `node client.js`

---

## วิธีที่ 4: Replit (ง่ายมาก)

### ขั้นตอน:
1. ไปที่ https://replit.com
2. กด "Create Repl" → "Node.js"
3. อัปโหลดไฟล์ทั้งหมด
4. กด "Run"
5. ได้ URL เช่น: `https://your-project-name.replit.co`

### ขั้นตอนตั้งค่า Client:
1. แก้ไขไฟล์ `client.js`
2. เปลี่ยน SERVER_URL:
   ```javascript
   const SERVER_URL = process.env.SERVER_URL || 'https://your-project-name.replit.co';
   ```
3. รัน client: `node client.js`

---

## ข้อจำกัดของ Free Hosting:

### Render.com:
- ✅ ฟรีถาวร
- ✅ รองรับ WebSocket (Socket.io)
- ❌ หยุดทำงานหลังไม่ใช้งาน 15 นาที (ต้องกดปุ่มเปิดใหม่)
- ❌ จำกัด 750 hours/month

### Railway.app:
- ✅ ฟรี $5 credit/month
- ✅ รองรับ WebSocket
- ❌ หลังจากใช้เงินฟรีหมด ต้องจ่าย

### Glitch.com:
- ✅ ฟรีถาวร
- ✅ ง่ายที่สุด
- ❌ หยุดทำงานหลังไม่ใช้งาน 5 นาที
- ❌ จำกัด resources

### Replit:
- ✅ ฟรีถาวร
- ✅ ง่ายมาก
- ❌ หยุดทำงานหลังไม่ใช้งาน
- ❌ จำกัด resources

---

## แนะนำ:

**สำหรับการใช้งานจริง:** ใช้ **Render.com** เนื่องจาก:
- ฟรีถาวร
- รองรับ WebSocket ดี
- เสถียรกว่า

**สำหรับการทดลอง:** ใช้ **Glitch.com** หรือ **Replit** เนื่องจาก:
- ง่ายที่สุดในการตั้งค่า
- Deploy ได้ทันที
- เหมาะสำหรับการทดสอบ

---

## การตั้งค่า Client หลายเครื่อง:

สำหรับแต่ละเครื่องที่ต้องการควบคุม:
1. ติดตั้ง Node.js
2. ดาวน์โหลดไฟล์ `client.js` และ `package.json`
3. รัน `npm install`
4. แก้ไข `client.js` ให้ชี้ไปที่ server URL
5. รัน `node client.js`

---

## การเข้าถึงจากภายนอก:

เมื่อ deploy แล้ว สามารถเข้าถึงได้จากทุกที่:
- Controller: เข้าเว็บผ่าน browser
- Target: รัน client.js บนเครื่องที่ต้องการควบคุม

ตัวอย่าง:
- Server: `https://your-app.onrender.com`
- เข้าเว็บ: `https://your-app.onrender.com`
- Client เชื่อมต่อ: `https://your-app.onrender.com`
