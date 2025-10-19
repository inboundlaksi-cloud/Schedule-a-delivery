import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc, getDoc, collection, query, orderBy, limit, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBezNic5rqHg2xh9_9dHo5DUDoHZx1Z_v8",
  authDomain: "schedule-a-delivery.firebaseapp.com",
  projectId: "schedule-a-delivery",
  storageBucket: "schedule-a-delivery.appspot.com",
  messagingSenderId: "222743116863",
  appId: "1:222743116863:web:12df3ee05d2894f23ccc8a",
  measurementId: "G-EDV364EREE"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const docRef = doc(db, "schedules", "main");
const GEMINI_API_KEY = "AIzaSyD_d2g0XgVxkClULTmh6dfl_eKIkRuVo7E";

let state = {
    isLoggedIn: false, 
    userRole: 'guest', 
    currentView: 'calendar',
    currentDate: new Date(), 
    selectedDate: null, 
    selectedBookingId: null,
    guestSessionId: null, // ID สำหรับผู้ใช้ทั่วไป (Guest)
    guestBookingIds: [], 
    data: { bookings: {}, companies: [], holidays: [], users: [], notifications: [] },
    kpiSearchTerm: '', 
    selectedKpiCompany: null,
    currentUser: null,
    unreadNotifications: 0,
    notificationPage: 1,
    notificationsPerPage: 10
};

const icons = {
    dashboard: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z"></path></svg>`,
    calendar: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>`,
    kpi: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>`,
    queue: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
    company: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>`,
    booking: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>`,
    scanner: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>`,
    manual: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>`,
    check: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`,
    clock: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
    users: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`,
    notifications: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM4.868 19.504l5.612-5.612c.357-.357.566-.848.566-1.357V9c0-2.334 1.79-4.24 4-4.24s4 1.906 4 4.24v3.535c0 .509.209 1 .566 1.357l5.612 5.612"></path></svg>`,
    trash: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`
};

const kpiDefinitions = [
    { id: 'productQuality', label: 'คุณภาพสินค้า/บริการ' }, 
    { id: 'onTimeDelivery', label: 'การจัดส่งตรงเวลา' }, 
    { id: 'documentAccuracy', label: 'ความถูกต้องของเอกสาร' }, 
    { id: 'compliance', label: 'การปฏิบัติตามข้อตกลง' }
];

const appContainer = document.getElementById('app-container');
const modalContainer = document.getElementById('modal-container');

const initialCompanies = [
    "Yokohama Thai sale ประเทศไทยจำกัด", "บริษัทโตชิโนซัพพลายจำกัด", "กิม แม็กซ์", "คิมเบอร์ลี่ย์", "เคเอสโกลเด้น", 
    "บริษัทแคบริคไทยแลนด์จำกัด", "หจก.จันทร์ประไพภัทรอินดัสตรี", "จีระวัฒนา", "ชินเตอโปรดัดจำกัด", "โชลุชั่น", 
    "เซ้าซิตีโพลีเคมจำกัด", "ณภัทร​โปรดักส์", "เด็นโซ่​เซลล์​", "ต.สยามคอมเมอร์เชียล", "โตโยไทร์", "ทีเอสที อินเตอร์ โปรดักส์", 
    "ทีโอเอ", "บริษัท ไทยเคเคอุตสาหกรรม จำกัด", "ไทยนาโต้แพคกิ้งเทป", "ไทยหัวเว่ย", "นณภางค์อินเตอร์เทรด", 
    "บจก.ณภัทร​โปรดักส์", "บจก.เอดีบี ซีแลนท์", "บจ.สยามคีนิคเชลส์", "บริษัท จีกูู๊ด จำกัด", "บริษัท บางกอกแอ๊บเบอร์ซีฟ จำกัด", 
    "บริษัท สยามคีนิค เซลส์ จำกัด", "บริษัท อัลติเมท พลัส ซัพพลาย", "บริษัท อัสซ่า อัลลอย", "บริษัท โออีเอ็ม แอ๊บเบรชีฟ โปรดักส์ จำกัด", 
    "บจก ประมาณและบุตรจำกัด", "บจก ผลธัญญะจำกัด", "พี.ดี.เอส", "พี.เอ.พี", "มโนยนต์ชัย", "รวงข้าว 168 กรุ๊ป (ประเทศไทย)", 
    "วรากุล", "ศรีอุดมสรรพ์", "สมาร์ท ปริ้นท์ แฟบริค จำกัด", "สยามวาลา", "เอฟเอ็มพีดิสทริบิวชั่น", "เอ็น.ดี รับเบอร์ จำกัด มหาชน", 
    "FUCHS", "IPA", "MNI", "NCR", "SMTV", "บริษัท ยัวซ่าแบตเตอรี่ ประเทศไทย จำกัด (มหาชน)", "บริษัท มายสกาย จำกัด"
];

const formatDate = (date) => {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatThaiDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
};

const formatTime24h = (timeStr) => {
    if (!timeStr) return '-';
    const [hour, minute] = timeStr.split(':');
    return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

const formatDateTime = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    return `${formatDate(d)} ${formatTime24h(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`)}`;
};

const generateReferenceNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `QR${year}${month}${day}${random}`;
};

const handleFileUpload = (fileInput) => {
    const files = fileInput.files;
    const filePromises = [];
    const MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10MB
    
    // ตรวจสอบขนาดรวมของไฟล์
    const totalSize = Array.from(files).reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_TOTAL_SIZE) {
        showAlert(`ขนาดรวมของไฟล์เกิน ${MAX_TOTAL_SIZE / (1024 * 1024)}MB`);
        return Promise.reject(new Error('Total file size exceeds limit'));
    }
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        
        const filePromise = new Promise((resolve) => {
            reader.onload = (e) => {
                resolve({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: e.target.result
                });
            };
            reader.readAsDataURL(file);
        });
        
        filePromises.push(filePromise);
    }
    
    return Promise.all(filePromises);
};

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const generateQRCode = (data, container) => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    
    try {
        QRCode.toCanvas(canvas, data, {
            width: 200,
            margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' }
        }, function (error) {
            if (error) {
                console.error('Error generating QR Code:', error);
                showQRCodeError(container, data);
            } else {
                container.innerHTML = '';
                container.appendChild(canvas);
                
                // เพิ่มการแก้ไขสำหรับ Safari บน iPhone
                if (navigator.userAgent.includes('iPhone') && navigator.userAgent.includes('Safari')) {
                    try {
                        const img = new Image();
                        img.onload = function() {
                            container.innerHTML = '';
                            container.appendChild(img);
                            
                            const downloadBtn = document.createElement('button');
                            downloadBtn.id = 'download-qr-btn';
                            downloadBtn.className = 'btn btn-primary mt-3';
                            downloadBtn.textContent = 'บันทึก QR Code';
                            downloadBtn.addEventListener('click', downloadQRCodeForSafari);
                            container.appendChild(downloadBtn);
                        };
                        img.src = canvas.toDataURL('image/png');
                    } catch (e) {
                        console.error('Safari image conversion error:', e);
                        showQRCodeError(container, data);
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error using QRCode library:', error);
        showQRCodeError(container, data);
    }
};

const downloadQRCodeForSafari = () => {
    const img = document.querySelector('#qrcode-container img');
    if (img) {
        const link = document.createElement('a');
        link.download = `qrcode-${Date.now()}.png`;
        link.href = img.src;
        
        if (navigator.userAgent.includes('Safari')) {
            const newWindow = window.open();
            newWindow.document.write(`<img src="${img.src}" alt="QR Code" style="max-width:100%;height:auto;"/>`);
        } else {
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } else {
        alert('ไม่พบ QR Code ที่จะดาวน์โหลด');
    }
};

const showQRCodeError = (container, data) => {
    const parsedData = JSON.parse(data);
    container.innerHTML = `
        <div class="text-center p-6 bg-red-50 border border-red-200 rounded-lg">
            <div class="mb-4">
                <svg class="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
            </div>
            <h3 class="text-lg font-semibold text-red-800 mb-2">ไม่สามารถสร้าง QR Code ได้</h3>
            <p class="text-red-600 mb-4">กรุณาบันทึกข้อมูลการจองคิว</p>
            <div class="bg-white p-4 rounded border text-left">
                <div class="space-y-2 text-sm">
                    <div><strong>รหัสจอง:</strong> ${parsedData.id}</div>
                    <div><strong>เลขกำกับ:</strong> ${parsedData.referenceNumber}</div>
                    <div><strong>บริษัท:</strong> ${parsedData.company}</div>
                    <div><strong>วันที่:</strong> ${parsedData.date}</div>
                    <div><strong>เวลา:</strong> ${parsedData.time}</div>
                </div>
            </div>
        </div>
    `;
};

const downloadQRCode = () => {
    const canvas = document.querySelector('#qrcode-container canvas');
    if (canvas) {
        const link = document.createElement('a');
        link.download = `qrcode-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    } else {
        alert('ไม่พบ QR Code ที่จะดาวน์โหลด');
    }
};

const checkTimeConflict = (date, time, excludeBookingId = null) => {
    const bookings = state.data.bookings[date] || [];
    const sameTimeBookings = bookings.filter(booking => 
        booking.id !== excludeBookingId && booking.eta === time
    );
    
    return sameTimeBookings.length;
};

const calculateNewTime = (time, addMinutes = 10) => {
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + addMinutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
};

const checkDailyQueueLimit = (date) => {
    const bookings = state.data.bookings[date] || [];
    return bookings.length >= 20;
};

const isHoliday = (date) => {
    if (!state.data.holidays) return false;
    
    const dateStr = formatDate(date);
    const monthDay = `${date.getMonth() + 1}-${date.getDate()}`;
    
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return { name: 'วันหยุดสุดสัปดาห์', type: 'weekend' };
    }
    
    const holiday = state.data.holidays.find(h => {
        if (h.date === dateStr) return true;
        if (h.recurring) {
            const holidayDate = new Date(h.date);
            const holidayMonthDay = `${holidayDate.getMonth() + 1}-${holidayDate.getDate()}`;
            return holidayMonthDay === monthDay;
        }
        return false;
    });
    
    return holiday || false;
};

const checkIfLate = (booking) => {
    if (!booking || !booking.eta || !booking.checkInTime) return false;
    
    const bookingDateTime = new Date(`${booking.date} ${booking.eta}`);
    const checkInDateTime = new Date(booking.checkInTime);
    
    const diffMinutes = (checkInDateTime - bookingDateTime) / (1000 * 60);
    return diffMinutes > 15;
};

const getAttendanceStats = () => {
    const today = formatDate(new Date());
    const todayBookings = state.data.bookings[today] || [];
    
    let onTime = 0;
    let late = 0;
    let total = 0;
    
    todayBookings.forEach(booking => {
        if (booking.checkInTime) {
            total++;
            if (checkIfLate(booking)) {
                late++;
            } else {
                onTime++;
            }
        }
    });
    
    return { onTime, late, total };
};

const createNotification = (type, title, content, userId = null, bookingId = null) => {
    const notification = {
        id: Date.now(),
        type,
        title,
        content,
        userId,
        bookingId,
        timestamp: new Date().toISOString(),
        read: false
    };
    
    if (!state.data.notifications) {
        state.data.notifications = [];
    }
    
    state.data.notifications.push(notification);
    
    if (!userId || userId === state.currentUser?.id) {
        state.unreadNotifications++;
    }
    
    setDoc(docRef, state.data);
    
    if (Notification.permission === 'granted' && (!userId || userId === state.currentUser?.id)) {
        new Notification(title, {
            body: content,
            icon: '/favicon.ico'
        });
    }
    
    return notification;
};

const setupAutomaticNotifications = () => {
    const checkUpcomingBookings = () => {
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        
        Object.entries(state.data.bookings).forEach(([date, bookings]) => {
            bookings.forEach(booking => {
                const bookingDateTime = new Date(`${date} ${booking.eta}`);
                
                if (bookingDateTime > now && bookingDateTime <= oneHourLater && !booking.checkInTime) {
                    const existingNotification = state.data.notifications?.find(n => 
                        n.type === 'reminder' && 
                        n.bookingId === booking.id && 
                        n.timestamp > new Date(now.getTime() - 60 * 60 * 1000).toISOString()
                    );
                    
                    if (!existingNotification) {
                        createNotification(
                            'reminder',
                            'แจ้งเตือนการจองคิว',
                            `คิวของคุณกำลังจะถึงในอีก 1 ชั่วโมง (${formatThaiDate(date)} ${formatTime24h(booking.eta)})`,
                            null,
                            booking.id
                        );
                    }
                }
            });
        });
    };
    
    setInterval(checkUpcomingBookings, 15 * 60 * 1000);
    checkUpcomingBookings();
};

const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('Notification permission granted');
            }
        });
    }
};

const renderModalBase = (content, attachListenersCallback) => {
    const modalHtml = `<div class="modal-backdrop fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">${content}</div>`;
    modalContainer.insertAdjacentHTML('beforeend', modalHtml);
    const modal = modalContainer.lastElementChild;
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                closeModal(modal);
            }
        });
        modal.querySelector('.close-modal-btn')?.addEventListener('click', () => closeModal(modal));
        modal.querySelector('#download-qr-btn')?.addEventListener('click', downloadQRCode);
        if (attachListenersCallback) attachListenersCallback(modal);
    }
};

const closeModal = (modalElement) => {
    const modalToClose = modalElement || modalContainer.lastElementChild;
    if (modalToClose) {
        modalToClose.remove();
    }
};

const showAlert = (message) => {
    const modalContent = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full">
            <p class="text-gray-800 mb-4">${message}</p>
            <button class="close-modal-btn bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full">ตกลง</button>
        </div>
    `;
    renderModalBase(modalContent);
};

const showConfirm = (message, onConfirm) => {
    const modalContent = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full">
            <p class="text-gray-800 mb-4">${message}</p>
            <div class="flex space-x-3">
                <button class="close-modal-btn bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 flex-1">ยกเลิก</button>
                <button id="confirm-ok" class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 flex-1">ยืนยัน</button>
            </div>
        </div>
    `;
    renderModalBase(modalContent, modal => {
        modal.querySelector('#confirm-ok').addEventListener('click', () => {
            onConfirm();
            closeModal(modal);
        });
    });
};

const showSuccessAnimation = (message, onComplete) => {
    const modalContent = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full text-center">
            <div class="mb-4">
                <svg class="w-16 h-16 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
            </div>
            <p class="text-gray-800 text-lg font-semibold">${message}</p>
        </div>
    `;
    renderModalBase(modalContent);
    setTimeout(() => {
        closeModal();
        if (onComplete) onComplete();
    }, 1800);
};

const render = () => {
    const header = `
        <header class="bg-white shadow-sm border-b">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <h1 class="text-xl font-bold text-gray-900">ระบบจัดการคิว</h1>
                            <p class="text-sm text-gray-500">${state.userRole === 'staff' ? 'มุมมองพนักงาน' : 'สำหรับซัพพลายเออร์'}</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-4">
                        ${state.isLoggedIn ? `<button id="logout-btn" class="text-gray-600 hover:text-gray-900">ออกจากระบบ</button>` : '<button id="staff-login-btn" class="text-blue-600 hover:text-blue-800">พนักงาน</button>'}
                        <button id="quick-scan-btn" class="flex items-center space-x-1 bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600">
                            ${icons.scanner} <span>สแกน QR</span>
                        </button>
                        ${state.isLoggedIn ? `
                        <button id="notifications-btn" class="relative flex items-center space-x-1 text-gray-600 hover:text-gray-900">
                            ${icons.notifications} <span>การแจ้งเตือน</span>
                            ${state.unreadNotifications > 0 ? `<span class="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">${state.unreadNotifications}</span>` : ''}
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </header>
    `;
    
    const manualSection = `
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                    <div class="text-blue-600">${icons.manual}</div>
                    <h3 class="text-lg font-semibold text-blue-800">คู่มือการใช้งานระบบจองคิว</h3>
                </div>
                <button id="toggle-manual-btn" class="text-blue-600 hover:text-blue-800 px-3 py-1 border border-blue-300 rounded">
                    <span id="manual-toggle-text">แสดง</span>
                </button>
            </div>
            <div id="manual-content" class="mt-4 space-y-4 hidden">
                <div class="bg-white p-4 rounded border">
                    <h4 class="font-semibold text-gray-800 mb-2">การเข้าสู่ระบบจัดการคิว</h4>
                    <p class="text-gray-600 text-sm">เข้าใช้งานเว็บไซต์ได้ที่ borneoship.netlify.app หรือสแกน QR Code เพื่อเข้าสู่หน้าเว็บไซต์ได้ทันที</p>
                </div>
                <div class="bg-white p-4 rounded border">
                    <h4 class="font-semibold text-gray-800 mb-2">การเลือกวันจัดส่งสินค้า</h4>
                    <p class="text-gray-600 text-sm">เมื่อเข้าสู่ระบบแล้ว จะพบหน้าปฏิทินของ "ระบบจัดการคิว" กรุณาเลือกวันที่ต้องการเข้าส่งสินค้า โดยวันที่สามารถจองได้จะแสดงเป็นปุ่มที่กดได้</p>
                    <div class="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <p class="text-yellow-800 text-xs">หมายเหตุ: หากวันใดขึ้นเป็นสีแดง แสดงว่าเป็นวันหยุดของบริษัท จะไม่สามารถจองคิวส่งสินค้าในวันดังกล่าวได้</p>
                    </div>
                </div>
                <div class="bg-white p-4 rounded border">
                    <h4 class="font-semibold text-gray-800 mb-2">การกรอกข้อมูลการจอง</h4>
                    <p class="text-gray-600 text-sm">หลังจากเลือกวันที่แล้ว ระบบจะนำไปสู่หน้าจอที่แสดงปุ่ม "จองคิวลงสินค้า" กดปุ่มเพื่อเข้าสู่แบบฟอร์มการจอง</p>
                    <p class="text-gray-600 text-sm">ในส่วนของ "บริษัท" ให้เลือกชื่อบริษัท หากไม่มีในรายการ กรุณาเลือก "-- เพิ่มบริษัทใหม่ --" เพื่อกรอกข้อมูล</p>
                    <div class="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <p class="text-yellow-800 text-xs">หมายเหตุ: หากเป็นการเพิ่มบริษัทใหม่กรุณาใช้ชื่อบริษัทแบบเต็มตามที่ระบุใน Invoice</p>
                    </div>
                </div>
                <div class="bg-white p-4 rounded border">
                    <h4 class="font-semibold text-gray-800 mb-2">การกรอกรายละเอียด</h4>
                    <p class="text-gray-600 text-sm">กรอกข้อมูลในแบบฟอร์มให้ครบถ้วน:</p>
                    <ul class="mt-2 text-xs text-gray-600 space-y-1">
                        <li>• ชื่อ-นามสกุล คนขับ: กรอกชื่อผู้ขับรถที่จะนำสินค้ามาส่ง</li>
                        <li>• ทะเบียนรถ: ระบุหมายเลขทะเบียนรถให้ถูกต้อง</li>
                        <li>• จำนวนบิล, จำนวนกล่อง, จำนวนชิ้น: กรอกข้อมูลตามความเป็นจริง โดยจำนวนชิ้นควรตรงกับข้อมูลในเอกสาร</li>
                        <li>• เวลาที่คาดว่าจะมาถึง: กดเพื่อเลือกช่วงเวลาที่คาดว่าจะเดินทางมาถึงคลังสินค้า</li>
                    </ul>
                </div>
                <div class="bg-white p-4 rounded border">
                    <h4 class="font-semibold text-gray-800 mb-2">การแนบเอกสารเพิ่มเติม (ถ้ามี)</h4>
                    <p class="text-gray-600 text-sm">สามารถแนบไฟล์ Invoice และ P.O. เพื่อเพิ่มความรวดเร็วในการตรวจสอบสินค้าของพนักงาน</p>
                    <p class="text-gray-600 text-sm">คลิกที่ช่องสำหรับแนบไฟล์ และเลือกไฟล์จากอุปกรณ์</p>
                    <p class="text-gray-600 text-sm">ไฟล์ที่รองรับ ได้แก่ PDF, JPG, PNG, DOC, และ DOCX โดยมีขนาดสูงสุดไม่เกิน 5 MB ต่อไฟล์</p>
                </div>
                <div class="bg-white p-4 rounded border">
                    <h4 class="font-semibold text-gray-800 mb-2">การยืนยันการจองและรับรหัสคิว</h4>
                    <p class="text-gray-600 text-sm">เมื่อกรอกข้อมูลครบถ้วนแล้ว ให้กดปุ่ม "ยืนยันการจอง"</p>
                    <div class="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <p class="text-yellow-800 text-xs">หมายเหตุ: หากเวลาที่เลือกมีผู้จองเต็มแล้ว ระบบจะทำการเลื่อนเวลาให้ 10 นาที โดยอัตโนมัติ</p>
                    </div>
                    <p class="text-gray-600 text-sm">เมื่อการจองสำเร็จ ระบบจะแสดง QR Code และรายละเอียดการจอง</p>
                    <div class="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                        <p class="text-green-800 text-xs">คำแนะนำสำคัญ: กรุณาบันทึกภาพ QR Code นี้ไว้เพื่อใช้แสดงแก่พนักงานคลังสินค้าเมื่อเดินทางมาถึง</p>
                    </div>
                </div>
                <div class="bg-white p-4 rounded border">
                    <h4 class="font-semibold text-gray-800 mb-2">ข้อควรทราบ</h4>
                    <ul class="text-gray-600 text-sm space-y-1">
                        <li>• สามารถเดินทางมาถึงคลังสินค้า ก่อนเวลาที่จองไว้ได้</li>
                        <li>• หากมาสายกว่าเวลาที่จองไว้ การจองดังกล่าวจะถือเป็นโมฆะ และจะต้องเข้าคิวแบบ Walk-in ตามปกติ</li>
                        <li>• กรุณาหลีกเลี่ยงการจองคิวโดยที่ยังไม่มีความแน่นอนในการนำส่งสินค้าโดยเด็ดขาด เนื่องจากอาจส่งผลต่อการพิจารณาให้ความช่วยเหลือในกรณีสินค้ามีปัญหาในครั้งต่อไป</li>
                        <li>• หากมีปัญหาเพิ่มเติม กรุณาติดต่อฝ่ายการตลาดเพื่อประสานงานกับทางคลังสินค้าทันที</li>
                    </ul>
                </div>
                <div class="bg-white p-4 rounded border">
                    <h4 class="font-semibold text-gray-800 mb-2">การเช็คอินเมื่อถึงคลังสินค้า</h4>
                    <p class="text-gray-600 text-sm">เมื่อเดินทางมาถึงคลังสินค้า ให้แสดง QR Code ที่ได้รับจากการจองคิวให้กับพนักงานเพื่อทำการสแกน</p>
                    <p class="text-gray-600 text-sm">พนักงานจะทำการสแกน QR Code และกดปุ่ม "เช็คอิน" เพื่อบันทึกเวลาที่คุณมาถึง</p>
                    <div class="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                        <p class="text-blue-800 text-xs">คำแนะนำ: หากพนักงานกดเช็คอินแล้วไม่มีอะไรเกิดขึ้น กรุณาแจ้งพนักงานให้ลองรีเฟรชหน้าจอแล้วทำการสแกนใหม่อีกครั้ง</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    let viewContent = '';
    switch(state.currentView) {
        case 'dashboard': viewContent = renderStaffNav() + renderDashboard(); break;
        case 'calendar': viewContent = (state.userRole === 'staff' ? renderStaffNav() : '') + manualSection + renderCalendar(); break;
        case 'holidays': viewContent = renderStaffNav() + renderHolidayManagement(); break;
        case 'dailyQueue': viewContent = renderDailyQueue(); break;
        case 'kpi': viewContent = renderStaffNav() + renderKpiView(); break;
        case 'bookingDetails': viewContent = renderBookingDetails(); break;
        case 'scanner': viewContent = renderScannerView(); break;
        case 'users': viewContent = renderStaffNav() + renderUsersView(); break;
        case 'notifications': viewContent = renderStaffNav() + renderNotificationsView(); break;
    }
    
    appContainer.innerHTML = header + `<main class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">${viewContent}</main>`;
    attachAllListeners();
};

const renderStaffNav = () => `
    <nav class="bg-gray-50 border-b mb-6">
        <div class="flex space-x-1 overflow-x-auto">
            <button class="staff-nav-btn px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 whitespace-nowrap" data-view="dashboard">${icons.dashboard} Dashboard</button>
            <button class="staff-nav-btn px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 whitespace-nowrap" data-view="calendar">${icons.calendar} ปฏิทิน</button>
            <button class="staff-nav-btn px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 whitespace-nowrap" data-view="holidays">${icons.booking} วันหยุด</button>
            <button class="staff-nav-btn px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 whitespace-nowrap" data-view="kpi">${icons.kpi} KPI</button>
            <button class="staff-nav-btn px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 whitespace-nowrap" data-view="bookingDetails">${icons.booking} รายละเอียด</button>
            <button class="staff-nav-btn px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 whitespace-nowrap" data-view="users">${icons.users} ผู้ใช้</button>
            <button class="staff-nav-btn px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 whitespace-nowrap" data-view="notifications">${icons.notifications} การแจ้งเตือน</button>
            <button class="staff-nav-btn px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 whitespace-nowrap" data-view="scanner">${icons.scanner} สแกน QR</button>
        </div>
    </nav>
`;

const renderDashboard = () => {
    const todayStr = formatDate(new Date());
    const todayBookings = state.data.bookings[todayStr] || [];
    let next7daysBookings = 0;
    for(let i=1; i<=7; i++) { 
        const date = new Date(); 
        date.setDate(date.getDate() + i); 
        next7daysBookings += (state.data.bookings[formatDate(date)] || []).length; 
    }
    
    const queueItemsHtml = todayBookings.length > 0
        ? todayBookings.map(b => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded border">
                <div class="flex-1">
                    <div class="font-medium text-gray-900">${formatTime24h(b.eta)} - ${b.companyName}</div>
                    <div class="text-sm text-gray-500">${b.licensePlate}</div>
                </div>
                <button class="text-blue-600 hover:text-blue-800 text-sm">ดูรายละเอียด</button>
            </div>
        `).join('')
        : `<div class="text-center py-8 text-gray-500">ไม่มีคิวสำหรับวันนี้</div>`;
    
    const stats = getAttendanceStats();
    
    return `
    <div class="mb-6">
        ${state.userRole === 'guest' ? '<button id="back-to-calendar-btn" class="mb-4 text-blue-600 hover:text-blue-800">← กลับไปยังปฏิทิน</button>' : ''}
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <div class="text-3xl font-bold text-green-600">${stats.onTime}</div>
            <div class="text-green-800">มาตรงเวลา</div>
        </div>
        <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div class="text-3xl font-bold text-red-600">${stats.late}</div>
            <div class="text-red-800">มาสาย</div>
        </div>
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <div class="text-3xl font-bold text-blue-600">${stats.total}</div>
            <div class="text-blue-800">รับสินค้าแล้ว</div>
        </div>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div class="dashboard-item bg-white border rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow" data-type="today">
            <div class="flex items-center mb-4">
                <div class="text-blue-600 mr-3">${icons.queue}</div>
                <div>
                    <h3 class="font-semibold text-gray-900">คิวสำหรับวันนี้</h3>
                    <p class="text-gray-600">${todayBookings.length}คิว</p>
                </div>
            </div>
            <button class="text-blue-600 hover:text-blue-800 text-sm">ดูทั้งหมด</button>
        </div>
        <div class="dashboard-item bg-white border rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow" data-type="next7days">
            <div class="flex items-center mb-4">
                <div class="text-green-600 mr-3">${icons.calendar}</div>
                <div>
                    <h3 class="font-semibold text-gray-900">คิวใน 7 วันข้างหน้า</h3>
                    <p class="text-gray-600">${next7daysBookings}คิว</p>
                </div>
            </div>
            <button class="text-blue-600 hover:text-blue-800 text-sm">ดูทั้งหมด</button>
        </div>
        <div class="dashboard-item bg-white border rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow" data-type="companies">
            <div class="flex items-center mb-4">
                <div class="text-purple-600 mr-3">${icons.company}</div>
                <div>
                    <h3 class="font-semibold text-gray-900">บริษัทซัพพลายเออร์</h3>
                    <p class="text-gray-600">${state.data.companies.length}บริษัท</p>
                </div>
            </div>
            <button class="text-blue-600 hover:text-blue-800 text-sm">ดูทั้งหมด</button>
        </div>
    </div>
    
    <div class="bg-white border rounded-lg">
        <div class="flex items-center justify-between p-6 border-b">
            <h3 class="text-lg font-semibold text-gray-900">รายการคิววันนี้ (${formatThaiDate(todayStr)})</h3>
            <button id="view-all-today-btn" class="text-blue-600 hover:text-blue-800 text-sm">ดูทั้งหมด</button>
        </div>
        <div class="p-6 space-y-3">${queueItemsHtml}</div>
    </div>
    `;
};

const renderCalendar = () => {
    const date = new Date(state.currentDate);
    const month = date.getMonth();
    const year = date.getFullYear();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set time to midnight for accurate date comparison
    
    let guestNoticeHtml = '';
    if (state.userRole === 'guest') {
        guestNoticeHtml = `
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p class="text-blue-800 text-sm">ข้อมูลการจองของคุณจะถูกบันทึกไว้ในเบราว์เซอร์นี้สำหรับการใช้งานครั้งถัดไป</p>
            </div>
        `;
    }
    
    let myBookingsHtml = '';
    if (state.userRole === 'guest' && state.guestBookingIds.length > 0) {
         const allMyBookings = [];
         Object.entries(state.data.bookings).forEach(([date, bookings]) => {
             bookings.forEach(b => {
                 if(state.guestBookingIds.includes(b.id)) {
                     allMyBookings.push({ ...b, date });
                 }
             });
         });
         allMyBookings.sort((a,b) => a.date.localeCompare(b.date) || b.eta.localeCompare(b.eta));
         if(allMyBookings.length > 0) {
              myBookingsHtml = `<div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h3 class="font-semibold text-green-800 mb-3">สรุปคิวของฉัน</h3>
                <div class="space-y-2">` +
              allMyBookings.map(b => `<div class="text-sm text-green-700">${new Date(b.date).toLocaleDateString('th-TH', {day: '2-digit', month: 'short'})} ${formatTime24h(b.eta)} - ${b.companyName}</div>`).join('') + `
                </div>
              </div>`;
         }
    }
    
    let daysHtml = Array(firstDay).fill('<div class="calendar-day-empty"></div>').join('');
    for (let day = 1; day <= daysInMonth; day++) {
        const currentDateObj = new Date(year, month, day);
        const dateStr = formatDate(currentDateObj);
        const hasBookings = state.data.bookings[dateStr]?.length > 0;
        const isToday = formatDate(currentDateObj) === formatDate(new Date());
        const isPast = currentDateObj < today;
        const isFull = checkDailyQueueLimit(dateStr);
        const holiday = isHoliday(currentDateObj);
        const dayOfWeek = currentDateObj.getDay();
        
        let dayClass = 'calendar-day p-2 border border-violet-100 flex flex-col rounded-md';
        let dayContent = `<div class="font-semibold">${day}</div>`;
        
        if (isPast) {
            dayClass += ' disabled bg-gray-100 text-gray-400';
        } else {
            dayClass += ' cursor-pointer hover:bg-blue-50';
        }
        
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            dayClass += ' weekend-day bg-red-50 border-red-200';
            dayContent += `<div class="text-xs text-red-600">วันหยุด</div>`;
        } else if (holiday) {
            dayClass += ' bg-red-50 border-red-200';
            const holidayName = holiday.name.length > 12 ? holiday.name.substring(0, 12) + '...' : holiday.name;
            dayContent += `<div class="text-xs text-red-600">${holidayName}</div>`;
        } else if (isToday) {
            dayClass += ' today bg-blue-100 border-blue-300';
        } else if (isFull) {
            dayClass += ' bg-red-50';
        }
        
        if (hasBookings && !holiday && dayOfWeek !== 0 && dayOfWeek !== 6) {
            dayClass += ' has-bookings';
            
            if (state.userRole === 'guest') {
                const bookings = state.data.bookings[dateStr];
                const myBookings = bookings.filter(b => state.guestBookingIds.includes(b.id));
                
                if (myBookings.length > 0) {
                    dayContent += `<div class="text-xs text-green-600">คิวของคุณ: ${myBookings.map(b => formatTime24h(b.eta)).join(', ')}</div>`;
                } else {
                    dayContent += `<div class="text-xs text-gray-600">${bookings.length} คิว</div>`;
                }
            } else {
                dayContent += `<div class="text-xs text-gray-600">${state.data.bookings[dateStr].length} คิว</div>`;
            }
        }
        
        if (isFull && !holiday && dayOfWeek !== 0 && dayOfWeek !== 6) {
            dayContent += '<div class="text-xs text-red-600">เต็ม</div>';
        }
        
        daysHtml += `<div class="${dayClass}" data-date="${dateStr}">${dayContent}</div>`;
    }
    
    return guestNoticeHtml + myBookingsHtml + `
        <div class="bg-white border rounded-lg p-6">
            <div class="flex items-center justify-between mb-6">
                <button id="prev-month-btn" class="p-2 hover:bg-gray-100 rounded">&lt;</button>
                <h2 class="text-xl font-semibold text-gray-900">${monthName}</h2>
                <button id="next-month-btn" class="p-2 hover:bg-gray-100 rounded">&gt;</button>
            </div>
            <div class="grid grid-cols-7 gap-1 mb-2">
                <div class="text-center font-medium text-gray-500 p-2">อา</div>
                <div class="text-center font-medium text-gray-500 p-2">จ</div>
                <div class="text-center font-medium text-gray-500 p-2">อ</div>
                <div class="text-center font-medium text-gray-500 p-2">พ</div>
                <div class="text-center font-medium text-gray-500 p-2">พฤ</div>
                <div class="text-center font-medium text-gray-500 p-2">ศ</div>
                <div class="text-center font-medium text-gray-500 p-2">ส</div>
            </div>
            <div class="grid grid-cols-7 gap-1">${daysHtml}</div>
            ${state.userRole === 'staff' ? `
            <div class="mt-6 pt-6 border-t">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                        <div class="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
                        <span class="text-sm text-gray-600">วันหยุด: ${(state.data.holidays || []).length} วัน</span>
                    </div>
                </div>
            </div>
            ` : ''}
        </div>
    `;
};

const renderDailyQueue = () => {
    const dateStr = state.selectedDate;
    const bookings = state.data.bookings[dateStr] || [];
    const isFull = checkDailyQueueLimit(dateStr);
    
    const queueItemsHtml = bookings.length > 0
        ? bookings.map((booking, index) => {
            const isGuestBooking = state.guestBookingIds.includes(booking.id);
            if(state.userRole === 'guest' && !isGuestBooking) return `<div class="p-4 bg-gray-50 rounded border text-center text-gray-500">คิวที่ ${index + 1}: จองแล้ว</div>`;
            
            let statusBadge = '';
            if (booking.checkInTime) {
                if (booking.status === 'completed') {
                    statusBadge = '<span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">เสร็จสิ้น</span>';
                } else if (checkIfLate(booking)) {
                    statusBadge = '<span class="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">มาสาย</span>';
                } else {
                    statusBadge = '<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">เช็คอินแล้ว</span>';
                }
            } else {
                statusBadge = '<span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">รอเช็คอิน</span>';
            }
            
            return `
            <div class="bg-white border rounded-lg p-4">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex-1">
                        <h3 class="font-semibold text-gray-900">${booking.companyName} ${isGuestBooking ? '(คิวของคุณ)' : ''}</h3>
                        <p class="text-gray-600">${booking.driverName} - ${booking.licensePlate}</p>
                        ${booking.referenceNumber ? `<p class="text-sm text-gray-500">เลขกำกับ: ${booking.referenceNumber}</p>` : ''}
                        ${statusBadge}
                    </div>
                    <div class="text-right">
                        <div class="text-lg font-semibold text-blue-600">${formatTime24h(booking.eta)}</div>
                        <div class="text-sm text-gray-500">${booking.boxCount} กล่อง / ${booking.itemCount} ชิ้น</div>
                        ${booking.checkInTime ? `<div class="text-xs text-gray-400">เช็คอิน: ${formatDateTime(booking.checkInTime)}</div>` : ''}
                    </div>
                </div>
                <div class="flex items-center justify-between">
                    <button class="view-details-btn text-blue-600 hover:text-blue-800 text-sm" data-booking-id="${booking.id}">ดูรายละเอียด</button>
                </div>
                ${state.userRole === 'staff' ? `
                    <div class="mt-3 pt-3 border-t flex space-x-2">
                        ${!booking.checkInTime ? `<button class="check-in-btn bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600" data-booking-id="${booking.id}">เช็คอิน</button>` : ''}
                        ${booking.checkInTime && booking.status !== 'completed' ? `<button class="complete-btn bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600" data-booking-id="${booking.id}">ยืนยันรับคิว</button>` : ''}
                        <button class="evaluate-btn bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600" data-booking-id="${booking.id}">ประเมิน KPI</button>
                        <button class="delete-booking-btn bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600" data-booking-id="${booking.id}">ลบ</button>
                    </div>
                ` : ''}
            </div>
            `;
        }).join('')
        : `<div class="text-center py-8 text-gray-500">ยังไม่มีการจองคิวในวันนี้</div>`;
    
    return `
        <div class="mb-6">
            <div class="flex items-center justify-between">
                <button id="back-to-calendar-btn" class="text-blue-600 hover:text-blue-800">< กลับไป</button>
                <h1 class="text-2xl font-bold text-gray-900">${formatThaiDate(dateStr)}</h1>
                <div>
                    ${state.userRole === 'guest' && !isFull ? '<button id="book-slot-btn" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">จองคิวลงสินค้า</button>' : ''}
                    ${isFull ? '<span class="text-red-600 font-medium">คิวเต็ม (20 คิว/วัน)</span>' : ''}
                </div>
            </div>
        </div>
        <div class="space-y-4">${queueItemsHtml}</div>
    `;
};

const renderBookingDetails = () => {
    const allBookings = [];
    Object.entries(state.data.bookings).forEach(([date, bookings]) => {
        bookings.forEach(booking => {
            allBookings.push({ ...booking, date });
        });
    });
    
    allBookings.sort((a, b) => new Date(b.date) - new Date(a.date) || b.eta.localeCompare(a.eta));
    
    const bookingsHtml = allBookings.length > 0
        ? allBookings.map(booking => {
            let statusBadge = '';
            if (booking.checkInTime) {
                if (booking.status === 'completed') {
                    statusBadge = '<span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">เสร็จสิ้น</span>';
                } else if (checkIfLate(booking)) {
                    statusBadge = '<span class="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">มาสาย</span>';
                } else {
                    statusBadge = '<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">เช็คอินแล้ว</span>';
                }
            } else {
                statusBadge = '<span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">รอเช็คอิน</span>';
            }
            
            return `
            <div class="bg-white border rounded-lg p-4">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex-1">
                        <h3 class="font-semibold text-gray-900">${booking.companyName}</h3>
                        <p class="text-gray-600">${booking.driverName} - ${booking.licensePlate}</p>
                        <p class="text-sm text-gray-500">${formatThaiDate(booking.date)} ${formatTime24h(booking.eta)}</p>
                        ${booking.referenceNumber ? `<p class="text-sm text-gray-500">เลขกำกับ: ${booking.referenceNumber}</p>` : ''}
                        ${statusBadge}
                    </div>
                    <div class="text-right">
                        <div class="text-sm text-gray-500">${booking.boxCount} กล่อง / ${booking.itemCount} ชิ้น</div>
                        ${booking.checkInTime ? `<div class="text-xs text-gray-400">เช็คอิน: ${formatDateTime(booking.checkInTime)}</div>` : ''}
                    </div>
                </div>
                <div class="flex items-center justify-between">
                    <button class="view-details-btn text-blue-600 hover:text-blue-800 text-sm" data-booking-id="${booking.id}">ดูรายละเอียด</button>
                </div>
            </div>
        `}).join('')
        : `<div class="text-center py-8 text-gray-500">ยังไม่มีการจองคิว</div>`;
    
    return `
    <div class="mb-6">
        <div class="flex items-center space-x-4">
            <button id="back-to-dashboard-btn" class="flex items-center space-x-1 text-blue-600 hover:text-blue-800">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                <span>กลับไปยัง Dashboard</span>
            </button>
        </div>
    </div>
    <div class="bg-white border rounded-lg">
        <div class="flex items-center justify-between p-6 border-b">
            <h1 class="text-xl font-bold text-gray-900">รายละเอียดการจองคิวทั้งหมด</h1>
            <div class="flex items-center space-x-2">
                <input type="text" id="reference-search" placeholder="ค้นหาเลขกำกับ" class="border rounded px-3 py-2 text-sm">
                <button id="search-reference-btn" class="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600">ค้นหา</button>
            </div>
        </div>
        <div class="p-6 space-y-4">${bookingsHtml}</div>
    </div>
    `;
};

const renderScannerView = () => {
    return `
    <div class="mb-6">
        <div class="flex items-center space-x-4">
            <button id="back-from-scanner-btn" class="flex items-center space-x-1 text-blue-600 hover:text-blue-800">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                <span>กลับไปยังหน้าก่อนหน้า</span>
            </button>
        </div>
    </div>
    <div class="bg-white border rounded-lg p-6">
        <h1 class="text-2xl font-bold text-gray-900 mb-6">สแกน QR Code</h1>
        <div class="max-w-md mx-auto">
            <div class="relative mb-6">
                <video id="video" class="w-full h-64 bg-gray-100 rounded border object-cover" autoplay muted playsinline></video>
                <div class="absolute inset-0 border-2 border-blue-500 rounded pointer-events-none">
                    <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white rounded"></div>
                </div>
            </div>
            <div class="text-center mb-6">
                <p class="text-gray-600 mb-4">วาง QR Code ให้อยู่ในกรอเพื่อทำการสแกน</p>
                <div class="space-x-3">
                    <button id="start-camera-btn" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">เปิดกล้อง</button>
                    <button id="stop-camera-btn" class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 hidden">ปิดกล้อง</button>
                    <button id="manual-input-btn" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">ป้อนเลขกำกับ</button>
                </div>
            </div>
        </div>
    </div>
    `;
};

const renderUsersView = () => {
    const users = state.data.users || [];
    
    const usersHtml = users.map(user => {
        const roleClass = user.role === 'admin' ? 'role-admin' : 
                         user.role === 'staff' ? 'role-staff' : 'role-viewer';
        
        return `
        <tr class="border-b">
            <td class="px-4 py-3">${user.name}</td>
            <td class="px-4 py-3">${user.email}</td>
            <td class="px-4 py-3"><span class="px-2 py-1 rounded text-xs ${roleClass}">${user.role === 'admin' ? 'ผู้ดูแลระบบ' : user.role === 'staff' ? 'พนักงาน' : 'ผู้ดู'}</span></td>
            <td class="px-4 py-3 text-sm text-gray-500">${user.lastLogin ? formatDateTime(user.lastLogin) : 'ไม่เคยเข้าสู่ระบบ'}</td>
            <td class="px-4 py-3">
                <button class="edit-user-btn text-blue-600 hover:text-blue-800 text-sm mr-2" data-user-id="${user.id}">แก้ไข</button>
                <button class="delete-user-btn text-red-600 hover:text-red-800 text-sm" data-user-id="${user.id}">ลบ</button>
            </td>
        </tr>
        `;
    }).join('');
    
    return `
    <div class="mb-6">
        <div class="flex items-center space-x-4">
            <button id="back-to-dashboard-btn" class="flex items-center space-x-1 text-blue-600 hover:text-blue-800">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                <span>กลับไปยัง Dashboard</span>
            </button>
        </div>
    </div>
    <div class="bg-white border rounded-lg">
        <div class="flex items-center justify-between p-6 border-b">
            <h1 class="text-xl font-bold text-gray-900">จัดการผู้ใช้</h1>
            <button id="add-user-btn" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">เพิ่มผู้ใช้</button>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">ชื่อ</th>
                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">อีเมล</th>
                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">บทบาท</th>
                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">เข้าสู่ระบบครั้งล่าสุด</th>
                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">การจัดการ</th>
                    </tr>
                </thead>
                <tbody>
                    ${usersHtml || '<tr><td colspan="5" class="px-4 py-8 text-center text-gray-500">ไม่มีผู้ใช้</td></tr>'}
                </tbody>
            </table>
        </div>
    </div>
    `;
};

const renderNotificationsView = () => {
    const notifications = state.data.notifications || [];
    
    // จัดเรียงการแจ้งเตือนตามเวลา (ล่าสุดขึ้นก่อน)
    const sortedNotifications = [...notifications].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    // แบ่งหน้า
    const startIndex = (state.notificationPage - 1) * state.notificationsPerPage;
    const endIndex = startIndex + state.notificationsPerPage;
    const paginatedNotifications = sortedNotifications.slice(startIndex, endIndex);
    
    // คำนวณจำนวนหน้า
    const totalPages = Math.ceil(sortedNotifications.length / state.notificationsPerPage);
    
    const notificationsHtml = paginatedNotifications.map(notification => {
        const typeClass = notification.type === 'reminder' ? 'notification-reminder' : 
                         notification.type === 'arrival' ? 'notification-arrival' : 
                         notification.type === 'booking' ? 'notification-booking' :
                         'notification-message';
        const typeLabel = notification.type === 'reminder' ? 'การแจ้งเตือน' : 
                         notification.type === 'arrival' ? 'การมาถึง' : 
                         notification.type === 'booking' ? 'การจองคิว' :
                         'ข้อความ';
        
        return `
        <div class="bg-white border rounded-lg p-4 ${!notification.read ? 'border-blue-200 bg-blue-50' : ''}">
            <div class="flex items-start justify-between mb-2">
                <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-1">
                        <span class="px-2 py-1 rounded text-xs ${typeClass}">${typeLabel}</span>
                        <h3 class="font-semibold text-gray-900">${notification.title}</h3>
                    </div>
                    <p class="text-sm text-gray-500">${formatDateTime(notification.timestamp)}</p>
                </div>
            </div>
            <p class="text-gray-700 mb-3">${notification.content}</p>
            <div class="flex items-center justify-between">
                ${!notification.read ? '<button class="mark-read-btn text-blue-600 hover:text-blue-800 text-sm">ทำเครื่องหมายว่าอ่านแล้ว</button>' : '<div></div>'}
                <button class="delete-notification-btn text-red-600 hover:text-red-800 text-sm flex items-center space-x-1" data-notification-id="${notification.id}">
                    ${icons.trash} <span>ลบ</span>
                </button>
            </div>
        </div>
        `;
    }).join('');
    
    // สร้างปุ่มสำหรับการแบ่งหน้า
    const paginationHtml = totalPages > 1 ? `
        <div class="flex items-center justify-center space-x-4 mt-6">
            <button id="prev-page-btn" class="px-4 py-2 border rounded hover:bg-gray-50 ${state.notificationPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}" ${state.notificationPage === 1 ? 'disabled' : ''}>
                ก่อนหน้า
            </button>
            <span class="text-gray-600">
                หน้า ${state.notificationPage} จาก ${totalPages}
            </span>
            <button id="next-page-btn" class="px-4 py-2 border rounded hover:bg-gray-50 ${state.notificationPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}" ${state.notificationPage === totalPages ? 'disabled' : ''}>
                ถัดไป
            </button>
        </div>
    ` : '';
    
    return `
    <div class="mb-6">
        <div class="flex items-center space-x-4">
            <button id="back-to-dashboard-btn" class="flex items-center space-x-1 text-blue-600 hover:text-blue-800">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                <span>กลับไปยัง Dashboard</span>
            </button>
        </div>
    </div>
    <div class="bg-white border rounded-lg">
        <div class="flex items-center justify-between p-6 border-b">
            <h1 class="text-xl font-bold text-gray-900">การแจ้งเตือน</h1>
            <div class="flex space-x-2">
                <button id="mark-all-read-btn" class="bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600">ทำเครื่องหมายว่าอ่านทั้งหมด</button>
                <button id="delete-read-btn" class="bg-yellow-500 text-white px-3 py-2 rounded text-sm hover:bg-yellow-600">ลบที่อ่านแล้ว</button>
                <button id="delete-all-btn" class="bg-red-500 text-white px-3 py-2 rounded text-sm hover:bg-red-600">ลบทั้งหมด</button>
            </div>
        </div>
        <div class="p-6">
            <div class="space-y-4">
                ${notificationsHtml || '<div class="text-center py-8 text-gray-500">ไม่มีการแจ้งเตือน</div>'}
            </div>
        </div>
        ${paginationHtml}
    </div>
    `;
};

const getKpiData = () => {
    const companyData = {};
    Object.values(state.data.bookings).flat().forEach(b => {
        if (!b.evaluation || !b.evaluation.scores) return;
        if (!companyData[b.companyName]) {
            companyData[b.companyName] = { 
                scores: [], 
                count: 0,
                bookings: []
            };
        }
        const evaluationScores = Object.values(b.evaluation.scores).filter(v => v > 0);
        if (evaluationScores.length === 0) return;
        const avgScore = evaluationScores.reduce((a, b) => a + b, 0) / evaluationScores.length;
        companyData[b.companyName].scores.push(avgScore);
        companyData[b.companyName].count++;
        
        companyData[b.companyName].bookings.push({
            date: b.date,
            eta: b.eta,
            score: avgScore,
            driverName: b.driverName,
            licensePlate: b.licensePlate,
            checkInTime: b.checkInTime,
            status: b.status
        });
    });
    
    Object.keys(companyData).forEach(company => {
        companyData[company].bookings.sort((a, b) => new Date(b.date) - new Date(a.date));
    });
    
    return Object.entries(companyData).map(([name, data]) => ({ 
        name, 
        averageScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
        bookings: data.bookings
    })).sort((a, b) => b.averageScore - a.averageScore);
};

const renderKpiView = () => {
    const kpiData = getKpiData();
    const filteredData = kpiData.filter(c => c.name.toLowerCase().includes(state.kpiSearchTerm.toLowerCase()));
    
    const supplierListHtml = filteredData.length > 0 ? filteredData.map((company, index) => `
        <div class="bg-white border rounded-lg p-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <div class="text-2xl font-bold text-gray-400">#${index + 1}</div>
                    <div>
                        <h3 class="font-semibold text-gray-900">${company.name}</h3>
                        <div class="text-lg font-bold text-blue-600">${company.averageScore.toFixed(2)}</div>
                    </div>
                </div>
            </div>
            <div class="mt-3">
                <button class="view-company-details-btn text-blue-600 hover:text-blue-800 text-sm" data-company="${company.name}">ดูประวัติการจัดส่ง</button>
            </div>
        </div>
    `).join('') : `<div class="text-center py-8 text-gray-500">ไม่พบข้อมูลซัพพลายเอร์</div>`;
    
    return `
    <div class="mb-6">
        <div class="flex items-center space-x-4">
            <button id="back-to-dashboard-btn" class="flex items-center space-x-1 text-blue-600 hover:text-blue-800">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                <span>กลับไปยัง Dashboard</span>
            </button>
        </div>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white border rounded-lg p-6">
             <h2 class="text-xl font-bold text-gray-900 mb-4">ผลการประเมิน KPI ซัพพลายเอร์</h2>
             <input type="text" id="kpi-search" placeholder="ค้นหาบริษัท..." class="w-full border rounded px-3 py-2 mb-4" value="${state.kpiSearchTerm}">
             <div class="space-y-3">
                <div class="grid grid-cols-3 gap-4 text-sm font-medium text-gray-500 border-b pb-2">
                    <div>อันดับ</div>
                    <div>ชื่อบริษัท</div>
                    <div>คะแนนเฉลี่ย</div>
                </div>
                ${supplierListHtml}
             </div>
        </div>
        <div class="bg-white border rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">5 อันดับคะแนนสูงสุด</h3>
            <canvas id="kpi-chart" width="400" height="300"></canvas>
        </div>
    </div>
    `;
};

const renderHolidayManagement = () => {
    const currentYear = new Date().getFullYear();
    const holidays = state.data.holidays || [];
    
    const holidayListHtml = holidays.map((holiday, index) => `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded border">
            <div class="flex-1">
                <div class="flex items-center space-x-3">
                    <div class="flex-1">
                        <h4 class="font-medium text-gray-900">${holiday.name}</h4>
                        <p class="text-sm text-gray-500">${formatThaiDate(holiday.date)} ${holiday.recurring ? '(ทุกปี)' : ''}</p>
                    </div>
                </div>
            </div>
            <div class="flex items-center space-x-2">
                <span class="px-2 py-1 rounded text-xs ${
                    holiday.type === 'company' ? 'bg-blue-100 text-blue-800' : 
                    holiday.type === 'public' ? 'bg-green-100 text-green-800' : 
                    'bg-purple-100 text-purple-800'
                }">
                    ${holiday.type === 'company' ? 'วันหยุดบริษัท' : 
                      holiday.type === 'public' ? 'วันหยุดราชการ' : 
                      'วันหยุดพิเศษ'}
                </span>
                <button onclick="deleteHoliday(${index})" class="text-red-600 hover:text-red-800 p-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
    
    return `
    <div class="mb-6">
        <div class="flex items-center space-x-4">
            <button id="back-to-dashboard-btn" class="flex items-center space-x-1 text-blue-600 hover:text-blue-800">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                <span>กลับไปยัง Dashboard</span>
            </button>
        </div>
    </div>
    <div class="bg-white border rounded-lg">
        <div class="flex items-center justify-between p-6 border-b">
            <h1 class="text-xl font-bold text-gray-900">จัดการวันหยุดบริษัท</h1>
            <div class="flex space-x-2">
                <button id="add-holiday-btn" class="flex items-center space-x-1 bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    <span>เพิ่มวันหยุด</span>
                </button>
                <button id="import-public-holidays-btn" class="flex items-center space-x-1 bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
                    </svg>
                    <span>นำเข้าวันหยุดราชการ</span>
                </button>
            </div>
        </div>
        <div class="p-6">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2">
                <div class="bg-white border rounded-lg">
                    <div class="p-4 border-b">
                        <h3 class="font-semibold text-gray-900">รายการวันหยุด (${holidays.length} วัน)</h3>
                    </div>
                    <div class="p-4 space-y-3">
                        ${holidays.length > 0 ? holidayListHtml : '<div class="text-center py-8 text-gray-500">ยังไม่มีวันหยุดที่กำหนด</div>'}
                    </div>
                </div>
            </div>
            <div class="space-y-6">
                <div class="bg-white border rounded-lg">
                    <div class="p-4 border-b">
                        <h3 class="font-semibold text-gray-900">สถิติวันหยุด</h3>
                    </div>
                    <div class="p-4 space-y-3">
                        <div class="flex items-center justify-between">
                            <span class="text-gray-600">วันหยุดบริษัท</span>
                            <span class="font-semibold">${holidays.filter(h => h.type === 'company').length}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-gray-600">วันหยุดราชการ</span>
                            <span class="font-semibold">${holidays.filter(h => h.type === 'public').length}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-gray-600">วันหยุดพิเศษ</span>
                            <span class="font-semibold">${holidays.filter(h => h.type === 'special').length}</span>
                        </div>
                    </div>
                </div>
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 class="font-semibold text-blue-800 mb-2">ข้อมูลเพิ่มเติม</h4>
                    <div class="text-sm text-blue-700 space-y-1">
                        <p>• วันหยุดบริษัท: วันหยุดที่บริษัทกำหนดเอง</p>
                        <p>• วันหยุดราชการ: วันหยุดตามประกาศราชการ</p>
                        <p>• วันหยุดพิเศษ: วันหยุดกรณีพิเศษ</p>
                        <p class="text-yellow-700">⚠️ ไม่สามารถจองคิวในวันหยุดได้</p>
                        <p class="text-yellow-700">⚠️ วันเสาร์และวันอาทิตย์เป็นวันหยุดสุดสัปดาห์ ไม่สามารถจองคิวได้</p>
                    </div>
                </div>
            </div>
        </div>
        </div>
    </div>
    `;
};

const attachAllListeners = () => {
    document.getElementById('staff-login-btn')?.addEventListener('click', () => renderModal('login'));
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
    document.getElementById('quick-scan-btn')?.addEventListener('click', () => {
        state.currentView = 'scanner';
        render();
    });
    document.getElementById('notifications-btn')?.addEventListener('click', () => {
        state.currentView = 'notifications';
        render();
    });
    document.querySelectorAll('.staff-nav-btn').forEach(btn => btn.addEventListener('click', e => { 
        state.currentView = e.currentTarget.dataset.view; 
        render(); 
    }));
    
    document.getElementById('back-to-calendar-btn')?.addEventListener('click', () => {
        state.currentView = 'calendar';
        render();
    });
    
    document.getElementById('back-to-dashboard-btn')?.addEventListener('click', () => {
        state.currentView = 'dashboard';
        render();
    });
    
    document.getElementById('back-from-scanner-btn')?.addEventListener('click', () => {
        state.currentView = state.userRole === 'staff' ? 'dashboard' : 'calendar';
        render();
    });
    
    document.getElementById('add-holiday-btn')?.addEventListener('click', () => renderAddHolidayModal());
    document.getElementById('import-public-holidays-btn')?.addEventListener('click', () => renderImportPublicHolidaysModal());
    
    document.getElementById('toggle-manual-btn')?.addEventListener('click', () => {
        const manualContent = document.getElementById('manual-content');
        const toggleText = document.getElementById('manual-toggle-text');
        
        if (manualContent.classList.contains('expanded')) {
            manualContent.classList.remove('expanded');
            toggleText.textContent = 'แสดง';
        } else {
            manualContent.classList.add('expanded');
            toggleText.textContent = 'ซ่อน';
        }
    });
    
    document.querySelectorAll('.view-company-details-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const companyName = e.currentTarget.dataset.company;
            renderCompanyKpiDetails(companyName);
        });
    });
    
    if (state.currentView === 'users') {
        document.getElementById('add-user-btn')?.addEventListener('click', () => renderAddUserModal());
        
        document.querySelectorAll('.edit-user-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.currentTarget.dataset.userId;
                renderEditUserModal(userId);
            });
        });
        
        document.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.currentTarget.dataset.userId;
                showConfirm('คุณต้องการลบผู้ใช้นี้ใช่หรือไม่?', () => {
                    handleDeleteUser(userId);
                });
            });
        });
    }
    
    if (state.currentView === 'notifications') {
        document.getElementById('mark-all-read-btn')?.addEventListener('click', () => {
            state.data.notifications.forEach(notification => {
                notification.read = true;
            });
            
            state.unreadNotifications = 0;
            setDoc(docRef, state.data);
            render();
        });
        
        document.getElementById('delete-read-btn')?.addEventListener('click', () => {
            showConfirm('คุณต้องการลบการแจ้งเตือนที่อ่านแล้วทั้งหมดใช่หรือไม่?', async () => {
                try {
                    state.data.notifications = state.data.notifications.filter(n => !n.read);
                    await setDoc(docRef, state.data);
                    showAlert('ลบการแจ้งเตือนที่อ่านแล้วสำเร็จแล้ว');
                    render();
                } catch (error) {
                    console.error('Error deleting read notifications:', error);
                    showAlert('เกิดข้อผิดพลาดในการลบการแจ้งเตือน');
                }
            });
        });
        
        document.getElementById('delete-all-btn')?.addEventListener('click', () => {
            showConfirm('คุณต้องการลบการแจ้งเตือนทั้งหมดใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้', async () => {
                try {
                    state.data.notifications = [];
                    state.unreadNotifications = 0;
                    await setDoc(docRef, state.data);
                    showAlert('ลบการแจ้งเตือนทั้งหมดสำเร็จแล้ว');
                    render();
                } catch (error) {
                    console.error('Error deleting all notifications:', error);
                    showAlert('เกิดข้อผิดพลาดในการลบการแจ้งเตือน');
                }
            });
        });
        
        document.querySelectorAll('.mark-read-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const notificationId = parseInt(e.currentTarget.parentElement.dataset.notificationId);
                const notification = state.data.notifications.find(n => n.id === notificationId);
                
                if (notification) {
                    notification.read = true;
                    updateUnreadNotifications();
                    setDoc(docRef, state.data);
                    render();
                }
            });
        });
        
        document.querySelectorAll('.delete-notification-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const notificationId = parseInt(e.currentTarget.dataset.notificationId);
                showConfirm('คุณต้องการลบการแจ้งเตือนนี้ใช่หรือไม่?', async () => {
                    try {
                        state.data.notifications = state.data.notifications.filter(n => n.id !== notificationId);
                        updateUnreadNotifications();
                        await setDoc(docRef, state.data);
                        showAlert('ลบการแจ้งเตือนสำเร็จแล้ว');
                        render();
                    } catch (error) {
                        console.error('Error deleting notification:', error);
                        showAlert('เกิดข้อผิดพลาดในการลบการแจ้งเตือน');
                    }
                });
            });
        });
        
        // Pagination
        document.getElementById('prev-page-btn')?.addEventListener('click', () => {
            if (state.notificationPage > 1) {
                state.notificationPage--;
                render();
            }
        });
        
        document.getElementById('next-page-btn')?.addEventListener('click', () => {
            const notifications = state.data.notifications || [];
            const totalPages = Math.ceil(notifications.length / state.notificationsPerPage);
            if (state.notificationPage < totalPages) {
                state.notificationPage++;
                render();
            }
        });
    }
    
    if (state.currentView === 'dashboard') {
        document.querySelectorAll('.dashboard-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                
                if (type === 'today') {
                    state.selectedDate = formatDate(new Date());
                    state.currentView = 'dailyQueue';
                    render();
                } else if (type === 'next7days') {
                    state.currentView = 'bookingDetails';
                    render();
                } else if (type === 'companies') {
                    state.currentView = 'kpi';
                    render();
                }
            });
        });
        
        document.getElementById('view-all-today-btn')?.addEventListener('click', () => {
            state.selectedDate = formatDate(new Date());
            state.currentView = 'dailyQueue';
            render();
        });
        
        document.querySelectorAll('.dashboard-item[data-booking-id]').forEach(item => {
            item.addEventListener('click', (e) => {
                const bookingId = e.currentTarget.dataset.bookingId;
                state.selectedBookingId = bookingId;
                renderModal('bookingDetails', { bookingId });
            });
        });
    }
    
    if (state.currentView === 'calendar') attachCalendarListeners();
    else if (state.currentView === 'dailyQueue') attachDailyQueueListeners();
    else if (state.currentView === 'kpi') attachKpiListeners();
    else if (state.currentView === 'bookingDetails') attachBookingDetailsListeners();
    else if (state.currentView === 'scanner') attachScannerListeners();
};

const findBookingByReferenceNumber = (referenceNumber) => {
    for (const date in state.data.bookings) {
        const booking = state.data.bookings[date].find(b => b.referenceNumber === referenceNumber);
        if (booking) {
            return { ...booking, date };
        }
    }
    return null;
};

const attachCalendarListeners = () => {
    document.getElementById('prev-month-btn')?.addEventListener('click', () => { 
        const newDate = new Date(state.currentDate);
        newDate.setMonth(newDate.getMonth() - 1);
        state.currentDate = newDate;
        render(); 
    });
    
    document.getElementById('next-month-btn')?.addEventListener('click', () => { 
        const newDate = new Date(state.currentDate);
        newDate.setMonth(newDate.getMonth() + 1);
        state.currentDate = newDate;
        render(); 
    });
    
    document.querySelectorAll('.calendar-day').forEach(day => {
        day.addEventListener('click', (e) => { 
            if (e.currentTarget.classList.contains('disabled')) {
                return; // Do nothing if the day is disabled (in the past)
            }
            const clickedDate = e.currentTarget.dataset.date;
            const dateObj = new Date(clickedDate);
            const dayOfWeek = dateObj.getDay();
            
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                showAlert(`วันที่ ${formatThaiDate(clickedDate)} เป็นวันหยุดสุดสัปดาห์\nไม่สามารถจองคิวได้`);
                return;
            }
            
            const holiday = isHoliday(dateObj);
            if (holiday && holiday.type !== 'weekend') {
                renderHolidayDetailsModal(holiday, clickedDate);
                return;
            }
            
            state.selectedDate = clickedDate;
            state.currentView = 'dailyQueue'; 
            render(); 
        });
    });
};

const attachKpiListeners = () => {
    document.getElementById('kpi-search').addEventListener('input', e => { 
        state.kpiSearchTerm = e.target.value; 
        render(); 
    });
    
    const kpiData = getKpiData().slice(0, 5);
    const ctx = document.getElementById('kpi-chart')?.getContext('2d');
    if (ctx && typeof Chart !== 'undefined') {
        new Chart(ctx, { 
            type: 'bar', 
            data: { 
                labels: kpiData.map(d => d.name), 
                datasets: [{ 
                    label: 'คะแนนเฉลี่ย', 
                    data: kpiData.map(d => d.averageScore), 
                    backgroundColor: ['#a78bfa', '#7dd3fc', '#6ee7b7', '#fde047', '#f87171'] 
                }] 
            }, 
            options: { 
                indexAxis: 'y', 
                responsive: true, 
                plugins: { 
                    legend: { display: false } 
                } 
            } 
        });
    }
};

const attachBookingDetailsListeners = () => {
    document.getElementById('search-reference-btn')?.addEventListener('click', handleSearchByReference);
    document.getElementById('reference-search')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearchByReference();
    });
    document.querySelectorAll('.view-details-btn').forEach(btn => btn.addEventListener('click', (e) => { 
        state.selectedBookingId = e.currentTarget.dataset.bookingId; 
        renderModal('bookingDetails', { bookingId: e.currentTarget.dataset.bookingId }); 
    }));
};

const attachScannerListeners = () => {
    document.getElementById('start-camera-btn')?.addEventListener('click', startCamera);
    document.getElementById('stop-camera-btn')?.addEventListener('click', stopCamera);
    document.getElementById('manual-input-btn')?.addEventListener('click', () => {
        renderModal('manualReferenceInput');
    });
};

let videoStream = null;
let scanInterval = null;

const startCamera = async () => {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showAlert('เบราว์เซอร์ของคุณไม่รองรับการใช้งานกล้อง');
            return;
        }
        
        const video = document.getElementById('video');
        const startBtn = document.getElementById('start-camera-btn');
        const stopBtn = document.getElementById('stop-camera-btn');
        videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        video.srcObject = videoStream;
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        scanInterval = setInterval(scanQRCode, 300);
    } catch (error) {
        console.error('Error accessing camera:', error);
        showAlert('ไม่สามารถเข้าถึงกล้องได้ กรุณาตรวจสอบการอนุญาตการใช้กล้อง');
    }
};

const stopCamera = () => {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
    }
    const video = document.getElementById('video');
    const startBtn = document.getElementById('start-camera-btn');
    const stopBtn = document.getElementById('stop-camera-btn');
    video.srcObject = null;
    startBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
};

const scanQRCode = () => {
    const video = document.getElementById('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        if (typeof jsQR !== 'undefined') {
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
                clearInterval(scanInterval);
                handleQRCodeScanned(code.data);
                setTimeout(() => {
                    stopCamera();
                }, 1000);
            }
        }
    }
};

const handleQRCodeScanned = (qrData) => {
    try {
        const data = JSON.parse(qrData);
        const booking = findBookingByReferenceNumber(data.referenceNumber);
        
        if (booking) {
            renderModal('bookingCard', { booking });
        } else {
            showAlert('ไม่พบข้อมูลการจองคิวที่ตรงกับ QR Code นี้');
        }
    } catch (error) {
        showAlert('QR Code ไม่ถูกต้อง กรุณาลองใหม่');
    }
};

const attachDailyQueueListeners = () => {
    document.getElementById('back-to-calendar-btn').addEventListener('click', () => { 
        state.currentView = 'calendar'; 
        state.selectedDate = null; 
        render(); 
    });
    document.getElementById('book-slot-btn')?.addEventListener('click', () => renderModal('booking'));
    document.querySelectorAll('.view-details-btn').forEach(btn => btn.addEventListener('click', (e) => { 
        state.selectedBookingId = e.currentTarget.dataset.bookingId; 
        renderModal('bookingDetails', { bookingId: e.currentTarget.dataset.bookingId }); 
    }));
    
    document.querySelectorAll('.check-in-btn').forEach(btn => btn.addEventListener('click', (e) => {
        const bookingId = e.currentTarget.dataset.bookingId;
        handleCheckIn(bookingId);
    }));
    
    document.querySelectorAll('.complete-btn').forEach(btn => btn.addEventListener('click', (e) => {
        const bookingId = e.currentTarget.dataset.bookingId;
        handleCompleteBooking(bookingId);
    }));
    
    document.querySelectorAll('.evaluate-btn').forEach(btn => btn.addEventListener('click', (e) => { 
        state.selectedBookingId = e.currentTarget.dataset.bookingId; 
        renderModal('evaluate'); 
    }));
    document.querySelectorAll('.delete-booking-btn').forEach(btn => btn.addEventListener('click', (e) => {
        const bookingId = e.currentTarget.dataset.bookingId;
        showConfirm('คุณต้องการลบคิวนี้ใช่หรือไม่?', () => handleDeleteBooking(bookingId));
    }));
};

const handleCheckIn = async (bookingId) => {
    try {
        let bookingToUpdate = null;
        let bookingDate = null;
        for (const date in state.data.bookings) {
            const bookingIndex = state.data.bookings[date].findIndex(b => b.id == bookingId);
            if (bookingIndex !== -1) {
                bookingToUpdate = state.data.bookings[date][bookingIndex];
                bookingDate = date;
                break;
            }
        }
        if (!bookingToUpdate) {
            showAlert('ไม่พบข้อมูลการจองคิว');
            return;
        }
        bookingToUpdate.checkInTime = new Date().toISOString();
        
        createNotification(
            'arrival',
            'ซัพพลายเออร์มาถึงแล้ว',
            `${bookingToUpdate.companyName} มาถึงคลังสินค้าแล้วเวลา ${formatDateTime(new Date())}`,
            null,
            bookingId
        );
        
        await setDoc(docRef, state.data);
        
        showSuccessAnimation('เช็คอินสำเร็จแล้ว');
        render();
        
    } catch (error) {
        console.error('Error checking in:', error);
        showAlert('เกิดข้อผิดพลาดในการเช็คอิน กรุณาลองใหม่');
    }
};

const handleCompleteBooking = async (bookingId) => {
    try {
        let bookingToUpdate = null;
        let bookingDate = null;
        for (const date in state.data.bookings) {
            const bookingIndex = state.data.bookings[date].findIndex(b => b.id == bookingId);
            if (bookingIndex !== -1) {
                bookingToUpdate = state.data.bookings[date][bookingIndex];
                bookingDate = date;
                break;
            }
        }
        if (!bookingToUpdate) {
            showAlert('ไม่พบข้อมูลการจองคิว');
            return;
        }
        bookingToUpdate.status = 'completed';
        bookingToUpdate.completedTime = new Date().toISOString();
        
        await setDoc(docRef, state.data);
        
        showSuccessAnimation('ยืนยันการรับคิวสำเร็จแล้ว');
        render();
        
    } catch (error) {
        console.error('Error completing booking:', error);
        showAlert('เกิดข้อผิดพลาดในการยืนยันการรับคิว กรุณาลองใหม่');
    }
};

const renderTimePickerModal = (bookingModal) => {
    const modalContent = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 class="text-lg font-semibold mb-4">เลือกเวลา</h3>
            <div class="text-center mb-4">
                <div class="text-2xl font-mono">
                    <span id="hour-preview" class="text-violet-500 cursor-pointer">--</span>
                    <span>:</span>
                    <span id="minute-preview" class="cursor-pointer">--</span>
                </div>
            </div>
            <div id="clock-container" class="mb-6"></div>
            <div class="flex space-x-3">
                <button class="close-modal-btn bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 flex-1">ยกเลิก</button>
                <button id="confirm-time-btn" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex-1" disabled>ยืนยัน</button>
            </div>
        </div>
    `;
    
    renderModalBase(modalContent, modal => {
        let selectedHour = null;
        let selectedMinute = null;
        let currentPickerView = 'hours';
        const hourPreview = modal.querySelector('#hour-preview');
        const minutePreview = modal.querySelector('#minute-preview');
        const confirmBtn = modal.querySelector('#confirm-time-btn');
        const clockContainer = modal.querySelector('#clock-container');
        
        const updatePreview = () => {
            hourPreview.textContent = selectedHour !== null ? selectedHour.toString().padStart(2, '0') : '--';
            minutePreview.textContent = selectedMinute !== null ? selectedMinute.toString().padStart(2, '0') : '--';
            confirmBtn.disabled = selectedHour === null || selectedMinute === null;
            
            if (selectedHour !== null && selectedMinute !== null) {
                const timeInMinutes = selectedHour * 60 + selectedMinute;
                const lunchStart = 11 * 60 + 30;
                const lunchEnd = 12 * 60 + 30;
                
                if (timeInMinutes >= lunchStart && timeInMinutes <= lunchEnd) {
                    confirmBtn.disabled = true;
                    confirmBtn.textContent = 'เวลาพักพนักงาน';
                    confirmBtn.classList.add('btn-disabled');
                } else {
                    confirmBtn.textContent = 'ยืนยัน';
                    confirmBtn.classList.remove('btn-disabled');
                }
            }
        };
        
        const attachClockListeners = () => {
            if (currentPickerView === 'hours') {
                clockContainer.querySelectorAll('.clock-number:not(.disabled)').forEach(btn => {
                    btn.addEventListener('click', () => {
                        selectedHour = parseInt(btn.dataset.hour);
                        currentPickerView = 'minutes';
                        hourPreview.classList.remove('text-violet-500');
                        minutePreview.classList.add('text-violet-500');
                        renderClock();
                    });
                });
            } else {
                clockContainer.querySelectorAll('.clock-number:not(.disabled)').forEach(btn => {
                    btn.addEventListener('click', () => {
                        selectedMinute = parseInt(btn.dataset.minute);
                        clockContainer.querySelectorAll('[data-minute]').forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                        updatePreview();
                    });
                });
            }
        };
        
        const renderClock = () => {
            clockContainer.innerHTML = ''; 
            const clockFace = document.createElement('div');
            clockFace.className = 'clock-face relative w-56 h-56 mx-auto border-2 border-gray-300 rounded-full';
            const clockCenter = document.createElement('div');
            clockCenter.className = 'clock-center absolute top-1/2 left-1/2 w-2 h-2 bg-gray-400 rounded-full transform -translate-x-1/2 -translate-y-1/2';
            clockFace.appendChild(clockCenter);
            
            if (currentPickerView === 'hours') {
                for (let i = 1; i <= 12; i++) {
                    const angle = (i / 12) * 360 - 90;
                    const x = 112 + 95 * Math.cos(angle * Math.PI / 180);
                    const y = 112 + 95 * Math.sin(angle * Math.PI / 180);
                    const numberEl = document.createElement('div');
                    numberEl.className = 'clock-number absolute w-8 h-8 flex items-center justify-center bg-blue-100 hover:bg-blue-200 rounded-full cursor-pointer text-sm font-medium transform -translate-x-1/2 -translate-y-1/2';
                    numberEl.textContent = i;
                    numberEl.style.left = `${x}px`;
                    numberEl.style.top = `${y}px`;
                    numberEl.dataset.hour = i;
                    clockFace.appendChild(numberEl);
                }
                 for (let i = 13; i <= 24; i++) {
                    const displayHour = i === 24 ? '00' : i;
                    const dataHour = i === 24 ? 0 : i;
                    const angle = ((i-12) / 12) * 360 - 90;
                    const x = 112 + 60 * Math.cos(angle * Math.PI / 180);
                    const y = 112 + 60 * Math.sin(angle * Math.PI / 180);
                    const numberEl = document.createElement('div');
                    numberEl.className = `clock-number absolute w-8 h-8 flex items-center justify-center rounded-full text-xs font-medium transform -translate-x-1/2 -translate-y-1/2 ${dataHour > 14 ? 'bg-gray-200 text-gray-400 cursor-not-allowed disabled' : 'bg-blue-100 hover:bg-blue-200 cursor-pointer'}`;
                    numberEl.textContent = displayHour;
                    numberEl.style.left = `${x}px`;
                    numberEl.style.top = `${y}px`;
                    numberEl.dataset.hour = dataHour;
                    clockFace.appendChild(numberEl);
                }
            } else {
                ['00', '10', '20', '30', '40', '50'].forEach((minute, index) => {
                    const angle = ((index * 2) / 12) * 360 - 90;
                    const x = 112 + 95 * Math.cos(angle * Math.PI / 180);
                    const y = 112 + 95 * Math.sin(angle * Math.PI / 180);
                    const numberEl = document.createElement('div');
                    numberEl.className = 'clock-number absolute w-8 h-8 flex items-center justify-center bg-blue-100 hover:bg-blue-200 rounded-full cursor-pointer text-sm font-medium transform -translate-x-1/2 -translate-y-1/2';
                    
                    if (selectedHour === 11 && minute === '30') {
                        numberEl.classList.add('disabled', 'bg-gray-200', 'text-gray-400', 'cursor-not-allowed');
                        numberEl.classList.remove('bg-blue-100', 'hover:bg-blue-200', 'cursor-pointer');
                        numberEl.title = 'เวลาพักพนักงาน (11:30-12:30)';
                    } else if (selectedHour === 12 && (minute === '00' || minute === '10' || minute === '20' || minute === '30')) {
                        numberEl.classList.add('disabled', 'bg-gray-200', 'text-gray-400', 'cursor-not-allowed');
                        numberEl.classList.remove('bg-blue-100', 'hover:bg-blue-200', 'cursor-pointer');
                        numberEl.title = 'เวลาพักพนักงาน (11:30-12:30)';
                    }
                    
                    numberEl.textContent = minute;
                    numberEl.style.left = `${x}px`;
                    numberEl.style.top = `${y}px`;
                    numberEl.dataset.minute = minute;
                    clockFace.appendChild(numberEl);
                });
            }
            clockContainer.appendChild(clockFace);
            updatePreview();
            attachClockListeners();
        };
        
        renderClock();
        
        hourPreview.addEventListener('click', () => {
            currentPickerView = 'hours';
            hourPreview.classList.add('text-violet-500');
            minutePreview.classList.remove('text-violet-500');
            renderClock();
        });
        
         minutePreview.addEventListener('click', () => {
            if (selectedHour === null) return;
            currentPickerView = 'minutes';
            hourPreview.classList.remove('text-violet-500');
            minutePreview.classList.add('text-violet-500');
            renderClock();
        });
        
        confirmBtn.addEventListener('click', () => {
            if (selectedHour !== null && selectedMinute !== null) {
                const timeInMinutes = selectedHour * 60 + selectedMinute;
                const lunchStart = 11 * 60 + 30;
                const lunchEnd = 12 * 60 + 30;
                
                if (timeInMinutes >= lunchStart && timeInMinutes <= lunchEnd) {
                    showAlert('ไม่สามารถเลือกเวลาในช่วงพักพนักงาน (11:30-12:30) ได้');
                    return;
                }
                
                const finalTime = `${selectedHour.toString().padStart(2,'0')}:${selectedMinute.toString().padStart(2,'0')}`;
                bookingModal.querySelector('#eta').value = finalTime;
                bookingModal.querySelector('#eta-display').textContent = finalTime;
                bookingModal.querySelector('#eta-display').classList.remove('text-slate-500');
                closeModal(modal);
            }
        });
    });
};

const renderAddHolidayModal = () => {
    const modalContent = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 class="text-lg font-semibold mb-4">เพิ่มวันหยุด</h3>
            <form id="holiday-form">
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">ชื่อวันหยุด</label>
                    <input type="text" id="holiday-name" required class="w-full border rounded px-3 py-2">
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">วันที่</label>
                    <input type="date" id="holiday-date" required class="w-full border rounded px-3 py-2">
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">ประเภทวันหยุด</label>
                    <select id="holiday-type" required class="w-full border rounded px-3 py-2">
                        <option value="company">วันหยุดบริษัท</option>
                        <option value="public">วันหยุดราชการ</option>
                        <option value="special">วันหยุดพิเศษ</option>
                    </select>
                </div>
                <div class="mb-4">
                    <label class="flex items-center">
                        <input type="checkbox" id="holiday-recurring" class="mr-2">
                        <span class="text-sm text-gray-700">วันหยุดทุกปี (ประจำปี)</span>
                    </label>
                </div>
                <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">รายละเอียดเพิ่มเติม (ไม่บังคับ)</label>
                    <textarea id="holiday-description" class="w-full border rounded px-3 py-2 h-20"></textarea>
                </div>
                <div class="flex space-x-3">
                    <button type="button" class="close-modal-btn bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 flex-1">ยกเลิก</button>
                    <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex-1">บันทึก</button>
                </div>
            </form>
        </div>
    `;
    
    renderModalBase(modalContent, modal => {
        modal.querySelector('#holiday-form').addEventListener('submit', handleAddHoliday);
    });
};

const renderImportPublicHolidaysModal = () => {
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear + 1, currentYear + 2];
    
    const modalContent = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 class="text-lg font-semibold mb-4">นำเข้าวันหยุดราชการ</h3>
            <form id="import-holidays-form">
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">เลือกปี</label>
                    <select id="holiday-year" required class="w-full border rounded px-3 py-2">
                        ${years.map(year => `<option value="${year}">ปี ${year + 543}</option>`).join('')}
                    </select>
                </div>
                <div class="mb-6">
                    <div class="bg-blue-50 border border-blue-200 rounded p-4">
                        <div class="flex items-start space-x-2">
                            <svg class="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <div>
                                <h4 class="font-medium text-blue-800">ข้อมูลวันหยุดราชการ</h4>
                                <p class="text-sm text-blue-700 mt-1">ระบบจะนำเข้าวันหยุดราชการตามประกาศสำนักนายกรัฐมนตรี ประกอบด้วย:</p>
                                <ul class="text-sm text-blue-700 mt-2 space-y-1">
                                    <li>• วันหยุดประจำปี</li>
                                    <li>• วันหยุดพระราชพิธี</li>
                                    <li>• วันหยุดตามศาสนา</li>
                                    <li>• วันหยุดชดเชย</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="flex space-x-3">
                    <button type="button" class="close-modal-btn bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 flex-1">ยกเลิก</button>
                    <button type="submit" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex-1">นำเข้าข้อมูล</button>
                </div>
            </form>
        </div>
    `;
    
    renderModalBase(modalContent, modal => {
        modal.querySelector('#import-holidays-form').addEventListener('submit', handleImportPublicHolidays);
    });
};

const renderAddUserModal = () => {
    const modalContent = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 class="text-lg font-semibold mb-4">เพิ่มผู้ใช้</h3>
            <form id="user-form">
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">ชื่อ</label>
                    <input type="text" id="user-name" required class="w-full border rounded px-3 py-2">
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">อีเมล</label>
                    <input type="email" id="user-email" required class="w-full border rounded px-3 py-2">
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">รหัสผ่าน</label>
                    <input type="password" id="user-password" required class="w-full border rounded px-3 py-2">
                </div>
                <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">บทบาท</label>
                    <select id="user-role" required class="w-full border rounded px-3 py-2">
                        <option value="viewer">ผู้ดู</option>
                        <option value="staff">พนักงาน</option>
                        <option value="admin">ผู้ดูแลระบบ</option>
                    </select>
                </div>
                <div class="flex space-x-3">
                    <button type="button" class="close-modal-btn bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 flex-1">ยกเลิก</button>
                    <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex-1">บันทึก</button>
                </div>
            </form>
        </div>
    `;
    
    renderModalBase(modalContent, modal => {
        modal.querySelector('#user-form').addEventListener('submit', handleAddUser);
    });
};

const renderEditUserModal = (userId) => {
    const user = state.data.users.find(u => u.id === userId);
    
    if (!user) {
        showAlert('ไม่พบข้อมูลผู้ใช้');
        return;
    }
    
    const modalContent = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 class="text-lg font-semibold mb-4">แก้ไขผู้ใช้</h3>
            <form id="user-form">
                <input type="hidden" id="user-id" value="${user.id}">
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">ชื่อ</label>
                    <input type="text" id="user-name" value="${user.name}" required class="w-full border rounded px-3 py-2">
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">อีเมล</label>
                    <input type="email" id="user-email" value="${user.email}" required class="w-full border rounded px-3 py-2">
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">รหัสผ่าน (ปล่อยว่างหากไม่ต้องการเปลี่ยน)</label>
                    <input type="password" id="user-password" class="w-full border rounded px-3 py-2">
                </div>
                <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">บทบาท</label>
                    <select id="user-role" required class="w-full border rounded px-3 py-2">
                        <option value="viewer" ${user.role === 'viewer' ? 'selected' : ''}>ผู้ดู</option>
                        <option value="staff" ${user.role === 'staff' ? 'selected' : ''}>พนักงาน</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>ผู้ดูแลระบบ</option>
                    </select>
                </div>
                <div class="flex space-x-3">
                    <button type="button" class="close-modal-btn bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 flex-1">ยกเลิก</button>
                    <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex-1">บันทึก</button>
                </div>
            </form>
        </div>
    `;
    
    renderModalBase(modalContent, modal => {
        modal.querySelector('#user-form').addEventListener('submit', handleEditUser);
    });
};

const handleAddUser = async (e) => {
    e.preventDefault();
    const form = e.target;
    
    const newUser = {
        id: Date.now().toString(),
        name: form.querySelector('#user-name').value,
        email: form.querySelector('#user-email').value,
        password: form.querySelector('#user-password').value,
        role: form.querySelector('#user-role').value,
        createdAt: new Date().toISOString(),
        lastLogin: null
    };
    
    if (!state.data.users) {
        state.data.users = [];
    }
    
    state.data.users.push(newUser);
    
    try {
        await setDoc(docRef, state.data);
        closeModal(form.closest('.modal-backdrop'));
        showSuccessAnimation('เพิ่มผู้ใช้สำเร็จแล้ว');
        render();
    } catch (error) {
        console.error('Error adding user:', error);
        showAlert('เกิดข้อผิดพลาดในการเพิ่มผู้ใช้ กรุณาลองใหม่');
    }
};

const handleEditUser = async (e) => {
    e.preventDefault();
    const form = e.target;
    const userId = form.querySelector('#user-id').value;
    
    const userIndex = state.data.users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
        showAlert('ไม่พบข้อมูลผู้ใช้');
        return;
    }
    
    const updatedUser = {
        ...state.data.users[userIndex],
        name: form.querySelector('#user-name').value,
        email: form.querySelector('#user-email').value,
        role: form.querySelector('#user-role').value
    };
    
    const newPassword = form.querySelector('#user-password').value;
    if (newPassword) {
        updatedUser.password = newPassword;
    }
    
    state.data.users[userIndex] = updatedUser;
    
    try {
        await setDoc(docRef, state.data);
        closeModal(form.closest('.modal-backdrop'));
        showSuccessAnimation('แก้ไขผู้ใช้สำเร็จแล้ว');
        render();
    } catch (error) {
        console.error('Error editing user:', error);
        showAlert('เกิดข้อผิดพลาดในการแก้ไขผู้ใช้ กรุณาลองใหม่');
    }
};

const handleDeleteUser = async (userId) => {
    try {
        const userIndex = state.data.users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
            showAlert('ไม่พบข้อมูลผู้ใช้');
            return;
        }
        
        state.data.users.splice(userIndex, 1);
        
        await setDoc(docRef, state.data);
        
        showAlert('ลบผู้ใช้สำเร็จแล้ว');
        render();
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showAlert('เกิดข้อผิดพลาดในการลบผู้ใช้ กรุณาลองใหม่');
    }
};

const updateUnreadNotifications = () => {
    state.unreadNotifications = state.data.notifications.filter(n => 
        !n.read && (!n.userId || n.userId === state.currentUser?.id)
    ).length;
};

const handleAddHoliday = async (e) => {
    e.preventDefault();
    const form = e.target;
    
    const holiday = {
        id: Date.now(),
        name: form.querySelector('#holiday-name').value,
        date: form.querySelector('#holiday-date').value,
        type: form.querySelector('#holiday-type').value,
        recurring: form.querySelector('#holiday-recurring').checked,
        description: form.querySelector('#holiday-description').value
    };
    
    if (!state.data.holidays) {
        state.data.holidays = [];
    }
    
    const existingHoliday = state.data.holidays.find(h => h.date === holiday.date);
    if (existingHoliday) {
        showAlert('มีวันหยุดในวันที่เลือกแล้ว');
        return;
    }
    
    state.data.holidays.push(holiday);
    state.data.holidays.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    try {
        await setDoc(docRef, state.data);
        closeModal(form.closest('.modal-backdrop'));
        showSuccessAnimation('เพิ่มวันหยุดสำเร็จแล้ว');
        render();
    } catch (error) {
        console.error('Error adding holiday:', error);
        showAlert('เกิดข้อผิดพลาดในการเพิ่มวันหยุด กรุณาลองใหม่');
    }
};

window.deleteHoliday = async (index) => {
    showConfirm('คุณต้องการลบวันหยุดนี้ใช่หรือไม่?', async () => {
        try {
            state.data.holidays.splice(index, 1);
            await setDoc(docRef, state.data);
            showAlert('ลบวันหยุดสำเร็จแล้ว');
            render();
        } catch (error) {
            console.error('Error deleting holiday:', error);
            showAlert('เกิดข้อผิดพลาดในการลบวันหยุด กรุณาลองใหม่');
        }
    });
};

const handleImportPublicHolidays = async (e) => {
    e.preventDefault();
    const form = e.target;
    const year = parseInt(form.querySelector('#holiday-year').value);
    
    const publicHolidays = [
        { name: 'วันขึ้นปีใหม่', date: `${year}-01-01`, type: 'public', recurring: true },
        { name: 'วันมาฆบูชา', date: `${year}-02-26`, type: 'public', recurring: true },
        { name: 'วันจักรี', date: `${year}-04-06`, type: 'public', recurring: true },
        { name: 'วันสงกรานต์', date: `${year}-04-13`, type: 'public', recurring: true },
        { name: 'วันสงกรานต์ (ชดเชย)', date: `${year}-04-16`, type: 'public', recurring: true },
        { name: 'วันพืชมงคล', date: `${year}-05-01`, type: 'public', recurring: true },
        { name: 'วันวิสาขบูชา', date: `${year}-05-22`, type: 'public', recurring: true },
        { name: 'วันเฉลิมพระชนมพรรษา สมเด็จพระเจ้าอยู่หัว', date: `${year}-07-28`, type: 'public', recurring: true },
        { name: 'วันแม่แห่งชาติ', date: `${year}-08-12`, type: 'public', recurring: true },
        { name: 'วันคล้ายราชวงศ์', date: `${year}-10-23`, type: 'public', recurring: true },
        { name: 'วันปิยมหาราช', date: `${year}-10-23`, type: 'public', recurring: true },
        { name: 'วันลอยกระทง', date: `${year}-11-15`, type: 'public', recurring: true },
        { name: 'วันรัฐธรรมนูญ', date: `${year}-12-10`, type: 'public', recurring: true },
        { name: 'วันคริสต์มาสต์', date: `${year}-12-25`, type: 'public', recurring: true }
    ];
    
    if (!state.data.holidays) {
        state.data.holidays = [];
    }
    
    let addedCount = 0;
    publicHolidays.forEach(holiday => {
        const exists = state.data.holidays.some(h => 
            h.date === holiday.date && h.type === 'public'
        );
        
        if (!exists) {
            state.data.holidays.push({
                ...holiday,
                id: Date.now() + Math.random()
            });
            addedCount++;
        }
    });
    
    state.data.holidays.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    try {
        await setDoc(docRef, state.data);
        closeModal(form.closest('.modal-backdrop'));
        showSuccessAnimation(`นำเข้าวันหยุดราชการสำเร็จ ${addedCount} วัน`);
        render();
    } catch (error) {
        console.error('Error importing holidays:', error);
        showAlert('เกิดข้อผิดพลาดในการนำเข้าวันหยุด กรุณาลองใหม่');
    }
};

const renderModal = (type, data = {}) => {
    let modalContent = '';
    if(type === 'login') {
        modalContent = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full">
                <h3 class="text-lg font-semibold mb-4">เข้าสู่ระบบพนักงาน</h3>
                <form id="login-form">
                    <div class="mb-4">
                        <input type="text" id="username" placeholder="ชื่อผู้ใช้" required class="w-full border rounded px-3 py-2">
                    </div>
                    <button type="submit" class="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600">เข้าสู่ระบบ</button>
                </form>
            </div>
        `;
        renderModalBase(modalContent, modal => modal.querySelector('#login-form').addEventListener('submit', handleLogin));
    } 
    else if(type === 'booking') {
        if (isHoliday(new Date(state.selectedDate))) {
            const holiday = isHoliday(new Date(state.selectedDate));
            
            modalContent = `
                <div class="bg-white rounded-lg p-6 max-w-md w-full text-center">
                    <div class="mb-4">
                        <svg class="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                        </svg>
                    </div>
                    <h3 class="text-lg font-semibold text-red-800 mb-2">ไม่สามารถจองคิวได้</h3>
                    <p class="text-red-600 mb-4">วันที่ ${formatThaiDate(state.selectedDate)} เป็นวันหยุด: ${holiday.name}</p>
                    <p class="text-gray-600 mb-6">กรุณาเลือกวันอื่นเพื่อจองคิว</p>
                    <div class="flex justify-center">
                        <button class="close-modal-btn bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">ปิด</button>
                    </div>
                </div>
            `;
            renderModalBase(modalContent);
            return;
        }
        
        if (checkDailyQueueLimit(state.selectedDate)) {
            modalContent = `
                <div class="bg-white rounded-lg p-6 max-w-md w-full text-center">
                    <div class="mb-4">
                        <svg class="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                        </svg>
                    </div>
                    <h3 class="text-lg font-semibold text-red-800 mb-2">คิวเต็ม</h3>
                    <p class="text-red-600 mb-4">วันที่ ${formatThaiDate(state.selectedDate)} มีการจองคิวครบ 20 คิวแล้ว</p>
                    <p class="text-gray-600 mb-6">กรุณาเลือกวันอื่นเพื่อจองคิว</p>
                    <div class="flex justify-center">
                        <button class="close-modal-btn bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">ปิด</button>
                    </div>
                </div>
            `;
            renderModalBase(modalContent);
            return;
        }
        
        const companyOptions = state.data.companies.map(c => `<option value="${c}">${c}</option>`).join('');
        modalContent = `
            <div class="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <h3 class="text-lg font-semibold mb-4">จองคิววันที่ ${formatThaiDate(state.selectedDate)}</h3>
                <form id="booking-form">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-2">บริษัท</label>
                            <select id="company-name" required class="w-full border rounded px-3 py-2">
                                <option value="">-- เลือกบริษัท --</option>
                                ${companyOptions}
                                <option value="add_new">-- เพิ่มบริษัทใหม่ --</option>
                            </select>
                            <input type="text" id="new-company-name" placeholder="ชื่อบริษัทใหม่" class="w-full border rounded px-3 py-2 mt-2 hidden">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">ชื่อ-นามสกุล คนขับ</label>
                            <input type="text" id="driver-name" required class="w-full border rounded px-3 py-2">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">ทะเบียนรถ</label>
                            <div class="flex space-x-2">
                                <input type="text" id="license-plate-prefix" placeholder="กก" maxlength="3" class="w-20 border rounded px-3 py-2 text-center">
                                <input type="text" id="license-plate-suffix" placeholder="1234" maxlength="4" class="flex-1 border rounded px-3 py-2">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">จำนวนบิล</label>
                            <input type="number" id="invoice-count" min="1" required class="w-full border rounded px-3 py-2">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">จำนวนกล่อง</label>
                            <input type="number" id="box-count" min="1" required class="w-full border rounded px-3 py-2">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">จำนวนชิ้น</label>
                            <input type="number" id="item-count" min="1" required class="w-full border rounded px-3 py-2">
                        </div>
                    </div>
                     <div class="mt-4">
                         <label class="block text-sm font-medium text-gray-700 mb-2">เวลาที่คาดว่าจะมาถึง</label>
                         <input type="hidden" id="eta" required>
                         <button type="button" id="eta-display" class="w-full border rounded px-3 py-2 text-left text-slate-500 hover:bg-gray-50">-- เลือกเวลา --</button>
                         <p class="text-xs text-gray-500 mt-1">เวลาทำการ: 08:00-14:15 (พักเที่ยง 11:30-12:30)</p>
                    </div>
                    <div class="mt-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">หมายเหตุ/เอกสารเพิ่มเติม</label>
                        <textarea id="notes" class="w-full border rounded px-3 py-2 h-20" placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)"></textarea>
                    </div>
                    <div class="mt-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">เอกสารเพิ่มเติม</label>
                        <input type="file" id="document-files" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" class="hidden">
                        <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer" onclick="document.getElementById('document-files').click()">
                            <div class="flex flex-col items-center">
                                <svg class="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                                </svg>
                                <p class="text-sm text-gray-600">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่</p>
                                <p class="text-xs text-gray-500 mt-1">รองรับไฟล์ PDF, JPG, PNG, DOC, DOCX (สูงสุด 5MB ต่อไฟล์)</p>
                            </div>
                        </div>
                        <p class="text-xs text-blue-600 mt-2">*หากแนบเอกสารมาด้วยจะเพิ่มความรวดเร็วในการรับสินค้าของพนักงาน</p>
                        <div id="file-list" class="mt-3 space-y-2"></div>
                    </div>
                    <div class="flex space-x-3 mt-6">
                        <button type="button" class="close-modal-btn bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 flex-1">ยกเลิก</button>
                        <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex-1">ยืนยันการจอง</button>
                    </div>
                </form>
            </div>
        `;
        
        renderModalBase(modalContent, modal => {
            modal.querySelector('#eta-display').addEventListener('click', () => renderTimePickerModal(modal));
            const companySelect = modal.querySelector('#company-name'), newCompanyInput = modal.querySelector('#new-company-name');
            companySelect.addEventListener('change', () => newCompanyInput.classList.toggle('hidden', companySelect.value !== 'add_new'));
            
            const fileInput = modal.querySelector('#document-files');
            const fileList = modal.querySelector('#file-list');
            let uploadedFiles = [];
            
            const displayFiles = () => {
                fileList.innerHTML = uploadedFiles.map((file, index) => `
                    <div class="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <div class="flex items-center space-x-2">
                            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            <div>
                                <p class="text-sm font-medium text-gray-900">${file.name}</p>
                                <p class="text-xs text-gray-500">${formatFileSize(file.size)}</p>
                            </div>
                        </div>
                        <button type="button" onclick="removeFile(${index})" class="text-red-600 hover:text-red-800 p-1">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                `).join('');
            };
            
            window.removeFile = (index) => {
                uploadedFiles.splice(index, 1);
                displayFiles();
            };
            
            fileInput.addEventListener('change', async (e) => {
                try {
                    const newFiles = await handleFileUpload({ files: e.target.files });
                    uploadedFiles = [...uploadedFiles, ...newFiles];
                    displayFiles();
                } catch (error) {
                    console.error('Error handling files:', error);
                }
            });
            
            const dropZone = modal.querySelector('.border-dashed').parentElement;
            
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('border-blue-500', 'bg-blue-50');
            });
            
            dropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropZone.classList.remove('border-blue-500', 'bg-blue-50');
            });
            
            dropZone.addEventListener('drop', async (e) => {
                e.preventDefault();
                dropZone.classList.remove('border-blue-500', 'bg-blue-50');
                
                try {
                    const newFiles = await handleFileUpload({ files: e.dataTransfer.files });
                    uploadedFiles = [...uploadedFiles, ...newFiles];
                    displayFiles();
                } catch (error) {
                    console.error('Error handling dropped files:', error);
                }
            });
            
            modal.querySelector('#booking-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const form = e.target;
                const companySelect = form.querySelector('#company-name');
                let companyName = companySelect.value === 'add_new' ? form.querySelector('#new-company-name').value.trim() : companySelect.value;
                
                if (!companyName) { 
                    showAlert('กรุณาระบุชื่อบริษัท'); 
                    return; 
                }
                
                const licensePlate = `${form.querySelector('#license-plate-prefix').value.trim()} ${form.querySelector('#license-plate-suffix').value.trim()}`.trim();
                if (!licensePlate) { 
                    showAlert('กรุณากรอกทะเบียนรถ'); 
                    return; 
                }
                
                let eta = form.querySelector('#eta').value;
                if (!eta) { 
                    showAlert('กรุณาเลือกเวลา'); 
                    return; 
                }
                
                let originalTime = eta;
                let attempts = 0;
                const maxAttempts = 10;
                
                while (checkTimeConflict(state.selectedDate, eta) >= 2 && attempts < maxAttempts) {
                    eta = calculateNewTime(eta, 10);
                    attempts++;
                }
                
                if (checkTimeConflict(state.selectedDate, eta) >= 2 && attempts < maxAttempts) {
                    eta = calculateNewTime(eta, 5);
                    attempts++;
                }
                
                const [hour, minute] = eta.split(':').map(Number);
                if (hour === 14 && minute > 15) {
                    showAlert(`ไม่สามารถจองคิวได้ เนื่องจากเวลา ${eta} เกินเวลารับสินค้า (14:15)`);
                    return;
                }
                
                if (checkTimeConflict(state.selectedDate, eta) >= 2) {
                    showAlert(`ไม่สามารถจองคิวได้ เนื่องจากมีคิวในช่วงเวลานั้นแล้ว`);
                    return;
                }
                
                if (eta !== originalTime) {
                    showAlert(`เวลา ${originalTime} มีการจองแล้ว ระบบได้เลื่อนเวลาของคุณเป็น ${eta} โดยอัตโนมัติ`);
                }
                
                const referenceNumber = generateReferenceNumber();
                const newBooking = { 
                    id: Date.now(), 
                    referenceNumber: referenceNumber,
                    companyName, 
                    driverName: form.querySelector('#driver-name').value, 
                    licensePlate, 
                    invoiceCount: form.querySelector('#invoice-count').value, 
                    boxCount: form.querySelector('#box-count').value, 
                    itemCount: form.querySelector('#item-count').value, 
                    eta, 
                    notes: form.querySelector('#notes').value,
                    documents: uploadedFiles,
                    evaluation: null 
                };
                
                const dateStr = state.selectedDate;
                if (!state.data.bookings[dateStr]) {
                    state.data.bookings[dateStr] = [];
                }
                state.data.bookings[dateStr].push(newBooking);
                state.data.bookings[dateStr].sort((a,b) => a.eta.localeCompare(b.eta));
                
                createNotification(
                    'booking',
                    'มีการจองคิวใหม่',
                    `${newBooking.companyName} ได้จองคิวสำหรับวันที่ ${formatThaiDate(dateStr)} เวลา ${formatTime24h(eta)}`,
                    null,
                    newBooking.id
                );
                
                try {
                    await setDoc(docRef, state.data);
                    state.guestBookingIds.push(newBooking.id);
                    
                    // Save to localStorage (Layer 1)
                    localStorage.setItem('guestBookingIds', JSON.stringify(state.guestBookingIds));
                    // Save to Firebase (Layer 2)
                    const guestDocRef = doc(db, "guestSessions", state.guestSessionId);
                    await setDoc(guestDocRef, { 
                        bookingIds: state.guestBookingIds,
                        lastActivity: serverTimestamp() 
                    }, { merge: true });
                    
                    closeModal(form.closest('.modal-backdrop')); 
                    renderModal('qrCode', { booking: newBooking });
                } catch (error) {
                    console.error('Error saving booking:', error);
                    showAlert('เกิดข้อผิดพลาดในการจองคิว กรุณาลองใหม่');
                }
            });
        });
    }
    else if(type === 'bookingDetails') {
        const booking = findBookingById(data.bookingId);
        if (!booking) {
            modalContent = `
                <div class="bg-white rounded-lg p-6 max-w-md w-full text-center">
                    <p class="text-gray-800 mb-4">ไม่พบข้อมูลการจองคิว</p>
                    <button class="close-modal-btn bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full">ตกลง</button>
                </div>
            `;
            renderModalBase(modalContent);
            return;
        }
        
        const isGuestBooking = state.guestBookingIds.includes(booking.id);
        const isEditable = state.userRole === 'staff' || (state.userRole === 'guest' && isGuestBooking);
        
        const documentsHtml = booking.documents && booking.documents.length > 0 
            ? `
            <div class="mt-4 p-4 bg-gray-50 rounded border">
                <h4 class="font-medium text-gray-900 mb-2">เอกสารที่แนบ:</h4>
                <div class="space-y-2">
                    ${booking.documents.map((doc, index) => `
                        <div class="flex items-center justify-between p-2 bg-white rounded border">
                            <div class="flex items-center space-x-2">
                                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                                <div>
                                    <p class="text-sm font-medium text-gray-900">${doc.name}</p>
                                    <p class="text-xs text-gray-500">${formatFileSize(doc.size)}</p>
                                </div>
                            </div>
                            <button onclick="downloadDocument('${doc.name}', '${doc.data}')" class="text-blue-600 hover:text-blue-800 text-sm">
                                ดาวน์โหลด
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
            `
            : '';
        
        let statusBadge = '';
        if (booking.checkInTime) {
            if (booking.status === 'completed') {
                statusBadge = '<span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">เสร็จสิ้น</span>';
            } else if (checkIfLate(booking)) {
                statusBadge = '<span class="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">มาสาย</span>';
            } else {
                statusBadge = '<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">เช็คอินแล้ว</span>';
            }
        } else {
            statusBadge = '<span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">รอเช็คอิน</span>';
        }
        
        modalContent = `
            <div class="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <h3 class="text-lg font-semibold mb-4">รายละเอียดการจองคิว</h3>
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-600">เลขกำกับ:</span>
                        <span class="font-medium">${booking.referenceNumber || '-'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">บริษัท:</span>
                        <span class="font-medium">${booking.companyName}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">วันที่:</span>
                        <span class="font-medium">${formatThaiDate(booking.date)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">เวลา:</span>
                        <span class="font-medium">${formatTime24h(booking.eta)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">ชื่อคนขับ:</span>
                        <span class="font-medium">${booking.driverName}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">ทะเบียนรถ:</span>
                        <span class="font-medium">${booking.licensePlate}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">จำนวนบิล:</span>
                        <span class="font-medium">${booking.invoiceCount}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">จำนวนกล่อง:</span>
                        <span class="font-medium">${booking.boxCount}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">จำนวนชิ้น:</span>
                        <span class="font-medium">${booking.itemCount}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">สถานะ:</span>
                        <span>${statusBadge}</span>
                    </div>
                    ${booking.checkInTime ? `
                    <div class="flex justify-between col-span-2">
                        <span class="text-gray-600">เวลาเช็คอิน:</span>
                        <span class="font-medium">${formatDateTime(booking.checkInTime)}</span>
                    </div>
                    ` : ''}
                    ${booking.notes ? `
                    <div class="col-span-2">
                        <span class="text-gray-600">เอกสารเพิ่มเติม:</span>
                        <p class="mt-1 text-gray-900">${booking.notes}</p>
                    </div>
                    ` : ''}
                </div>
                ${documentsHtml}
                <div class="flex justify-center mt-6">
                    <button class="close-modal-btn bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">ปิด</button>
                </div>
            </div>
        `;
        
        window.downloadDocument = (filename, dataUrl) => {
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = filename;
            link.click();
        };
        
        renderModalBase(modalContent);
    }
    else if(type === 'bookingCard') {
        const booking = data.booking;
        
        const documentsInfo = booking.documents && booking.documents.length > 0 
            ? `
            <div class="mt-3 text-sm text-gray-600">
                <span class="font-medium">เอกสารที่แนบ:</span>
                <span>${booking.documents.length} ไฟล์</span>
            </div>
            `
            : '';
        
        let statusBadge = '';
        if (booking.checkInTime) {
            if (booking.status === 'completed') {
                statusBadge = '<span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">เสร็จสิ้น</span>';
            } else if (checkIfLate(booking)) {
                statusBadge = '<span class="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">มาสาย</span>';
            } else {
                statusBadge = '<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">เช็คอินแล้ว</span>';
            }
        } else {
            statusBadge = '<span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">รอเช็คอิน</span>';
        }
        
        let checkInSection = '';
        if (state.userRole === 'staff' && !booking.checkInTime) {
            checkInSection = `
                <div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                    <h4 class="font-medium text-blue-800 mb-2">การเช็คอิน</h4>
                    <div class="text-sm text-blue-700 mb-3">
                        <span class="font-medium">เวลาปัจจุบัน:</span>
                        <span>${formatDateTime(new Date())}</span>
                    </div>
                    <button class="check-in-from-qr-btn bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 w-full flex items-center justify-center space-x-2" data-booking-id="${booking.id}">
                        ${icons.check} <span>เช็คอิน</span>
                    </button>
                </div>
            `;
        } else if (state.userRole === 'staff' && booking.checkInTime && booking.status !== 'completed') {
            checkInSection = `
                <div class="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                    <h4 class="font-medium text-green-800 mb-2">การรับสินค้า</h4>
                    <div class="text-sm text-green-700 mb-3">
                        <span class="font-medium">เวลาเช็คอิน:</span>
                        <span>${formatDateTime(booking.checkInTime)}</span>
                    </div>
                    <button class="complete-from-qr-btn bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full flex items-center justify-center space-x-2" data-booking-id="${booking.id}">
                        ${icons.check} <span>ยืนยันรับคิว</span>
                    </button>
                </div>
            `;
        }
        
        modalContent = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full">
                <div class="text-center mb-6">
                    <div class="mb-4">
                        <h3 class="text-xl font-bold text-gray-900">${booking.companyName}</h3>
                        <p class="text-gray-600">${booking.referenceNumber}</p>
                    </div>
                    <div class="grid grid-cols-2 gap-3 text-sm">
                        <div class="text-center">
                            <div class="text-gray-500">วันที่</div>
                            <div class="font-medium">${formatThaiDate(booking.date)}</div>
                        </div>
                        <div class="text-center">
                            <div class="text-gray-500">เวลา</div>
                            <div class="font-medium">${formatTime24h(booking.eta)}</div>
                        </div>
                        <div class="text-center">
                            <div class="text-gray-500">คนขับ</div>
                            <div class="font-medium">${booking.driverName}</div>
                        </div>
                        <div class="text-center">
                            <div class="text-gray-500">ทะเบียนรถ</div>
                            <div class="font-medium">${booking.licensePlate}</div>
                        </div>
                        <div class="text-center">
                            <div class="text-gray-500">จำนวนบิล</div>
                            <div class="font-medium">${booking.invoiceCount}</div>
                        </div>
                        <div class="text-center">
                            <div class="text-gray-500">จำนวนกล่อง</div>
                            <div class="font-medium">${booking.boxCount}</div>
                        </div>
                        <div class="text-center">
                            <div class="text-gray-500">จำนวนชิ้น</div>
                            <div class="font-medium">${booking.itemCount}</div>
                        </div>
                        <div class="text-center">
                            <div class="text-gray-500">สถานะ</div>
                            <div>${statusBadge}</div>
                        </div>
                        ${documentsInfo}
                    </div>
                    ${booking.notes ? `
                    <div class="mt-4 p-3 bg-gray-50 rounded border text-left">
                        <h4 class="font-medium text-gray-800 mb-1">เอกสารเพิ่มเติม</h4>
                        <p class="text-sm text-gray-600">${booking.notes}</p>
                    </div>
                    ` : ''}
                    ${booking.documents && booking.documents.length > 0 ? `
                    <div class="mt-4 p-3 bg-gray-50 rounded border text-left">
                        <h4 class="font-medium text-gray-800 mb-2">เอกสารที่แนบ</h4>
                        <div class="space-y-2">
                            ${booking.documents.map(doc => `
                                <div class="flex items-center justify-between text-sm">
                                    <span class="text-gray-600">${doc.name}</span>
                                    <button onclick="downloadDocument('${doc.name}', '${doc.data}')" class="text-blue-600 hover:text-blue-800">
                                        ดาวน์โหลด
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                    ${checkInSection}
                    <div class="mt-6 p-4 bg-gray-50 rounded border">
                        <div class="flex items-center justify-center space-x-2 text-sm text-gray-600 mb-3">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <span>${booking.status === 'completed' ? 'ดำเนินการเสร็จสิ้น' : booking.checkInTime ? 'กำลังดำเนินการ' : 'รอการดำเนินการ'}</span>
                        </div>
                        <div class="flex space-x-3">
                            ${state.userRole === 'staff' ? `<button class="evaluate-from-qr-btn bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 flex-1">ประเมิน KPI</button>` : ''}
                            <button class="close-modal-btn bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 flex-1">ปิด</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        renderModalBase(modalContent, modal => {
            if (state.userRole === 'staff') {
                modal.querySelector('.evaluate-from-qr-btn')?.addEventListener('click', () => {
                    closeModal(modal);
                    state.selectedDate = booking.date;
                    state.selectedBookingId = booking.id;
                    renderModal('evaluate');
                });
                
                modal.querySelector('.check-in-from-qr-btn')?.addEventListener('click', () => {
                    handleCheckIn(booking.id);
                    closeModal(modal);
                });
                
                modal.querySelector('.complete-from-qr-btn')?.addEventListener('click', () => {
                    handleCompleteBooking(booking.id);
                    closeModal(modal);
                });
            }
        });
    }
    else if(type === 'evaluate') {
        const booking = state.data.bookings[state.selectedDate]?.find(b => b.id == state.selectedBookingId);
        let kpiInputs = kpiDefinitions.map(kpi => `
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">${kpi.label}</label>
                <select class="kpi-select w-full border rounded px-3 py-2" data-kpi-id="${kpi.id}">
                    <option value="0">-- เลือก --</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                </select>
            </div>
        `).join('');
        
        modalContent = `
            <div class="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <h3 class="text-lg font-semibold mb-4">ประเมิน KPI</h3>
                <p class="text-gray-600 mb-6">${booking.companyName}</p>
                <form id="evaluation-form">
                    ${kpiInputs}
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">ความคิดเห็นเพิ่มเติม</label>
                        <textarea id="staff-comments" class="w-full border rounded px-3 py-2 h-20"></textarea>
                    </div>
                    <div class="mb-4">
                        <button type="button" id="generate-summary-btn" class="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 flex items-center space-x-2">
                            <span>✨</span> <span>สร้างสรุปผลด้วย AI</span>
                        </button>
                        <div id="gemini-loading" class="mt-2 text-blue-600 text-sm hidden">กำลังสร้างสรุป...</div>
                    </div>
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">สรุปผลการประเมิน</label>
                        <textarea id="gemini-summary" class="w-full border rounded px-3 py-2 h-32" readonly></textarea>
                    </div>
                    <div class="flex space-x-3">
                        <button type="button" class="close-modal-btn bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 flex-1">ยกเลิก</button>
                        <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex-1">บันทึกผล</button>
                    </div>
                </form>
            </div>
        `;
        
        renderModalBase(modalContent, modal => {
            modal.querySelector('#evaluation-form').addEventListener('submit', handleEvaluationSubmit);
            modal.querySelector('#generate-summary-btn').addEventListener('click', handleGenerateSummary);
        });
    } 
    else if(type === 'qrCode') {
        const booking = data.booking;
        const referenceNumber = booking.referenceNumber || generateReferenceNumber();
        
        if (!booking.referenceNumber) {
            booking.referenceNumber = referenceNumber;
            const dateStr = state.selectedDate;
            const bookingIndex = state.data.bookings[dateStr].findIndex(b => b.id === booking.id);
            if (bookingIndex !== -1) {
                state.data.bookings[dateStr][bookingIndex].referenceNumber = referenceNumber;
                setDoc(docRef, state.data);
            }
        }
        
        const qrData = JSON.stringify({
            id: booking.id,
            referenceNumber: referenceNumber,
            company: booking.companyName,
            date: state.selectedDate,
            time: booking.eta,
            driverName: booking.driverName,
            licensePlate: booking.licensePlate,
            invoiceCount: booking.invoiceCount,
            boxCount: booking.boxCount,
            itemCount: booking.itemCount,
            notes: booking.notes || ''
        });
        
        modalContent = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full text-center">
                <div class="mb-6">
                    <div class="mb-4">
                        <svg class="w-16 h-16 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-2">การจองคิวสำเร็จ!</h3>
                <p class="text-gray-600 mb-6">กรุณาแสดง QR Code นี้แก่เจ้าหน้าที่เมื่อมาถึง</p>
                <div class="mb-6">
                    <div id="qrcode-container" class="flex justify-center mb-4"></div>
                    <div class="text-sm text-gray-600 space-y-1">
                        <p><strong>เลขกำกับ:</strong> ${referenceNumber}</p>
                        <p><strong>บริษัท:</strong> ${booking.companyName}</p>
                        <p><strong>วันที่:</strong> ${formatThaiDate(state.selectedDate)}</p>
                        <p><strong>เวลา:</strong> ${formatTime24h(booking.eta)}</p>
                    </div>
                </div>
                <div class="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
                    <p class="text-yellow-800 text-sm font-medium">สำคัญ: กรุณาบันทึกภาพ QR Code นี้ไว้ในอัลบั้ม</p>
                </div>
                <div class="mb-6 text-xs text-gray-500 space-y-1">
                    <div class="p-3 bg-blue-50 border border-blue-200 rounded">
                        <p class="font-medium text-blue-800">หมายเหตุ: กรุณามาตามเวลาที่กำหนด</p> 
                        <p class="text-blue-700">หากมาช้าต้องไปต่อคิวตามปกติ</p>
                    </div>
                </div>
                <div class="flex space-x-3">
                    <button id="download-qr-btn" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex-1">ดาวน์โหลด QR Code</button>
                    <button id="qr-close-btn" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex-1">ยืนยัน</button>
                </div>
            </div>
        `;
        
        renderModalBase(modalContent, modal => {
            generateQRCode(qrData, modal.querySelector('#qrcode-container'));
            
            modal.querySelector('#qr-close-btn').addEventListener('click', () => {
                closeModal(modal);
                state.currentView = 'dailyQueue';
                render();
            });
        });
    } 
    else if(type === 'manualReferenceInput') {
        modalContent = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full">
                <h3 class="text-lg font-semibold mb-4">ป้อนเลขกำกับ</h3>
                <form id="manual-reference-form">
                    <div class="mb-4">
                        <input type="text" id="manual-reference-input" placeholder="กรอกเลขกำกับ" required class="w-full border rounded px-3 py-2">
                    </div>
                    <div class="flex space-x-3">
                        <button type="button" class="close-modal-btn bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 flex-1">ยกเลิก</button>
                        <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex-1">ค้นหา</button>
                    </div>
                </form>
            </div>
        `;
        
        renderModalBase(modalContent, modal => {
            modal.querySelector('#manual-reference-form').addEventListener('submit', (e) => {
                e.preventDefault();
                const referenceNumber = modal.querySelector('#manual-reference-input').value.trim();
                closeModal(modal);
                handleSearchByReferenceNumber(referenceNumber);
            });
        });
    }
};

const findBookingById = (bookingId) => {
    for (const date in state.data.bookings) {
        const booking = state.data.bookings[date].find(b => b.id == bookingId);
        if (booking) {
            return { ...booking, date };
        }
    }
    return null;
};

const handleSearchByReference = () => {
    const referenceNumber = document.getElementById('reference-search').value.trim();
    if (referenceNumber) {
        handleSearchByReferenceNumber(referenceNumber);
    }
};

const handleSearchByReferenceNumber = (referenceNumber) => {
    const booking = findBookingByReferenceNumber(referenceNumber);
    if (booking) {
        renderModal('bookingCard', { booking });
    } else {
        showAlert(`ไม่พบข้อมูลการจองคิวสำหรับเลขกำกับ: ${referenceNumber}`);
    }
};

async function callGemini(prompt) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;
    const payload = { contents: [{ parts: [{ text: prompt }] }] };
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }
        const result = await response.json();
        return result.candidates?.[0]?.content?.parts?.[0]?.text || "ไม่สามารถสร้างสรุปได้";
    } catch (error) {
        console.error("Gemini API call failed:", error);
        return "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI";
    }
}

const handleGenerateSummary = async (e) => {
    const modal = e.target.closest('.modal-backdrop');
    const loadingIndicator = modal.querySelector('#gemini-loading');
    const summaryTextarea = modal.querySelector('#gemini-summary');
    const booking = state.data.bookings[state.selectedDate]?.find(b => b.id == state.selectedBookingId);
    
    loadingIndicator.style.display = 'block';
    summaryTextarea.value = '';
    
    let kpiScoresText = "";
    kpiDefinitions.forEach(kpi => {
        const score = modal.querySelector(`.kpi-select[data-kpi-id="${kpi.id}"]`).value;
        if(score > 0) {
             kpiScoresText += `- ${kpi.label}: ${score}/5\n`;
        }
    });
    
    const staffComments = modal.querySelector('#staff-comments').value;
    const prompt = `
         กรุณาสร้างบทสรุปผลการประเมินการจัดส่งสินค้าสำหรับซัพพลายเออร์ในรูปแบบที่เป็นทางการและกระชับเป็นภาษาไทย โดยใช้ข้อมูลต่อไปนี้:
         - ชื่อซัพพลายเออร์: ${booking.companyName}
         - วันที่จัดส่ง: ${formatThaiDate(state.selectedDate)}
         - ผลการประเมิน KPI:
         ${kpiScoresText}
         - ความคิดเห็นเพิ่มเติมจากพนักงาน: ${staffComments || 'ไม่มี'}
         ให้สรุปภาพรวมของประสิทธิภาพ และอาจจะมีการกล่าวถึงข้อดีหรือสิ่งที่ควรปรับปรุงตามความเหมาะสมจากคะแนนและความคิดเห็น
    `;
    
    const summary = await callGemini(prompt);
    summaryTextarea.value = summary;
    loadingIndicator.style.display = 'none';
};

const handleLogin = (e) => { 
    e.preventDefault(); 
    const username = document.getElementById('username').value.trim();
    
    const user = state.data.users?.find(u => u.email === username || u.name === username);
    
    if (user) {
        user.lastLogin = new Date().toISOString();
        setDoc(docRef, state.data);
        
        state.isLoggedIn = true;
        state.userRole = user.role;
        state.currentUser = user;
        state.currentView = 'dashboard';
        closeModal();
        render();
    } else if (username === 'inboundlaksi') {
        state.isLoggedIn = true;
        state.userRole = 'staff';
        state.currentUser = {
            id: 'default',
            name: 'พนักงาน',
            email: 'inboundlaksi',
            role: 'staff'
        };
        state.currentView = 'dashboard';
        closeModal();
        render();
    } else {
        showAlert('ชื่อผู้ใช้ไม่ถูกต้อง');
    }
};

const handleLogout = () => { 
    state.isLoggedIn = false;
    state.userRole = 'guest';
    state.currentUser = null;
    state.currentView = 'calendar';
    render();
};

const handleEvaluationSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const booking = state.data.bookings[state.selectedDate].find(b => b.id == state.selectedBookingId);
    
    if(booking) {
        booking.evaluation = {
            scores: {},
            staffComments: form.querySelector('#staff-comments').value,
            geminiSummary: form.querySelector('#gemini-summary').value
        };
        
        form.querySelectorAll('.kpi-select').forEach(sel => {
            booking.evaluation.scores[sel.dataset.kpiId] = parseInt(sel.value, 10);
        });
        
        try {
            await setDoc(docRef, state.data);
            
            closeModal(form.closest('.modal-backdrop')); 
            showSuccessAnimation("บันทึกผลสำเร็จ!");
        } catch (error) {
            console.error('Error saving evaluation:', error);
            showAlert('เกิดข้อผิดพลาดในการบันทึกผลการประเมิน กรุณาลองใหม่');
        }
    }
};

const handleDeleteBooking = async (bookingId) => {
    try {
        let bookingToDelete = null;
        let bookingDate = null;
        
        for (const date in state.data.bookings) {
            const bookingIndex = state.data.bookings[date].findIndex(b => b.id == bookingId);
            if (bookingIndex !== -1) {
                bookingToDelete = state.data.bookings[date][bookingIndex];
                bookingDate = date;
                break;
            }
        }
        
        if (!bookingToDelete) {
            showAlert('ไม่พบข้อมูลการจองคิวที่ต้องการลบ');
            return;
        }
        
        state.data.bookings[bookingDate] = state.data.bookings[bookingDate].filter(b => b.id != bookingId);
        
        if (state.data.bookings[bookingDate].length === 0) {
            delete state.data.bookings[bookingDate];
        }
        
        await setDoc(docRef, state.data);
        
        showAlert('ลบคิวสำเร็จแล้ว');
        
        render();
        
    } catch (error) {
        console.error('Error deleting booking:', error);
        showAlert('เกิดข้อผิดพลาดในการลบคิว กรุณาลองใหม่');
    }
};

const renderHolidayDetailsModal = (holiday, date) => {
    const modalContent = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full text-center">
            <div class="mb-4">
                <svg class="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
            </div>
            <h3 class="text-lg font-semibold text-red-800 mb-2">วันหยุด</h3>
            <h4 class="text-xl font-bold text-gray-900 mb-2">${holiday.name}</h4>
            <p class="text-gray-600 mb-4">${formatThaiDate(date)}</p>
            <p class="text-sm text-gray-500 mb-6">ประเภท: ${
                holiday.type === 'company' ? 'วันหยุดบริษัท' : 
                holiday.type === 'public' ? 'วันหยุดราชการ' : 
                'วันหยุดพิเศษ'
            }</p>
            ${holiday.description ? `<p class="text-sm text-gray-600 mb-6">${holiday.description}</p>` : ''}
            <div class="flex justify-center">
                <button class="close-modal-btn bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">ปิด</button>
            </div>
        </div>
    `;
    
    renderModalBase(modalContent);
};

const renderCompanyKpiDetails = (companyName) => {
    const kpiData = getKpiData();
    const company = kpiData.find(c => c.name === companyName);
    
    if (!company) {
        showAlert('ไม่พบข้อมูลบริษัท');
        return;
    }
    
    const bookingHistoryHtml = company.bookings.map(booking => `
        <div class="bg-white border rounded p-3">
            <div class="flex items-center justify-between mb-2">
                <span class="font-medium">${formatThaiDate(booking.date)} ${formatTime24h(booking.eta)}</span>
                <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    คะแนน: ${booking.score.toFixed(2)}
                </span>
            </div>
            <div class="text-sm text-gray-600">
                คนขับ: ${booking.driverName} | ทะเบียน: ${booking.licensePlate}
            </div>
        </div>
    `).join('');
    
    const modalContent = `
        <div class="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 class="text-lg font-semibold mb-4">ประวัติการจัดส่ง - ${companyName}</h3>
            <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
                <h4 class="font-semibold text-blue-800">คะแนนเฉลี่ย: ${company.averageScore.toFixed(2)}</h4>
                <p class="text-blue-700">จากการจัดส่งทั้งหมด ${company.bookings.length} ครั้ง</p>
            </div>
            <div class="space-y-3 max-h-96 overflow-y-auto">
                ${bookingHistoryHtml}
            </div>
            <div class="flex justify-center mt-6">
                <button class="close-modal-btn bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">ปิด</button>
            </div>
        </div>
    `;
    
    renderModalBase(modalContent);
};

// ฟังก์ชัน init ที่แก้ไขแล้ว - ส่วนที่สำคัญที่สุด
const init = async () => {
    try {
        await signInAnonymously(auth);
        // 1. Get or create a persistent Guest Session ID from localStorage
        let sessionId = localStorage.getItem('guestSessionId');
        if (!sessionId) {
            sessionId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            localStorage.setItem('guestSessionId', sessionId);
        }
        state.guestSessionId = sessionId;
        
        onSnapshot(docRef, async (docSnap) => {
            if (docSnap.exists()) {
                state.data = docSnap.data();
                if (!state.data.companies || state.data.companies.length === 0) {
                    state.data.companies = initialCompanies;
                }
                if (!state.data.bookings) state.data.bookings = {};
                if (!state.data.holidays) state.data.holidays = [];
                if (!state.data.users) state.data.users = [];
                if (!state.data.notifications) state.data.notifications = [];
            } else {
                // แสดงข้อผิดพลาดแทนการสร้างเอกสารใหม่
                console.error('ไม่พบเอกสารข้อมูลหลัก (schedules/main)');
                showAlert('เกิดข้อผิดพลาด: ไม่พบข้อมูลระบบ กรุณาติดต่อผู้ดูแลระบบ');
                return;
            }
            
            // 2. Fetch guest's booking history from Firebase using the session ID
            if (state.guestSessionId && state.userRole === 'guest') {
                const guestDocRef = doc(db, "guestSessions", state.guestSessionId);
                const guestDocSnap = await getDoc(guestDocRef);
                if (guestDocSnap.exists()) {
                    const guestData = guestDocSnap.data();
                    state.guestBookingIds = guestData.bookingIds || [];
                    // Sync Firebase data back to localStorage to ensure it's up to date
                    localStorage.setItem('guestBookingIds', JSON.stringify(state.guestBookingIds));
                } else {
                    // If no session in Firebase, try to load from localStorage as a fallback
                    state.guestBookingIds = JSON.parse(localStorage.getItem('guestBookingIds')) || [];
                }
            }
            
            updateUnreadNotifications();
            setupAutomaticNotifications();
            requestNotificationPermission();
            
            render();
        });
        
        state.userRole = 'guest';
        state.isLoggedIn = false;
        state.currentView = 'calendar';
    } catch (error) {
        console.error('Error initializing app:', error);
        showAlert('เกิดข้อผิดพลาดในการเริ่มต้นระบบ กรุณารีเฟรชหน้าเว็บ');
    }
};

init();
