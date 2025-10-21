// [ --- วางโค้ด scripts.js   
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc, getDoc, collection, query, orderBy, limit, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInAnonymously, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
const GEMINI_API_KEY = "AIzaSyD_d2g0XgVxkClULTmh6dfl_eKIkRuVo7E";

// Global mapping for quick booking lookup by ID
let allBookingsById = {};

// Global listeners variables (ข้อกำหนดที่ 3)
let usersListener = null;
let notificationsListener = null;

let state = {
    isLoggedIn: false,
    userRole: 'guest',
    currentView: 'calendar',
    currentDate: new Date(),
    selectedDate: null,
    selectedBookingId: null,
    guestSessionId: null,
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
    dashboard: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path></svg>`,
    calendar: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v16a2 2 0 002 2z"></path></svg>`,
    kpi: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>`,
    queue: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
    company: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>`,
    booking: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>`,
    scanner: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>`,
    manual: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>`,
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

// Utility functions
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
    return new Date(dateStr).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });
};

const formatTime24h = (timeStr) => {
    if (!timeStr) return '-';
    const [hour, minute] = timeStr.split(':');
    return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
};

const formatDateTime = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    return `${formatDate(d)} ${formatTime24h(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`)}`;
};

// Helper function for calculating time (ข้อกำหนดที่ 3)
const addMinutesToISODate = (isoDate, minutes) => {
    if (!isoDate) return 'N/A';
    const date = new Date(isoDate);
    date.setMinutes(date.getMinutes() + minutes);
    const hours = date.getHours().toString().padStart(2, '0');
    const mins = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${mins}`;
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
            newWindow.document.write(`<img src="${img.src}" />`);
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
        <div class="text-center p-6 bg-red-50 rounded-lg border border-red-200">
            <div class="text-red-600 text-6xl mb-4">⚠️</div>
            <h3 class="text-lg font-semibold text-red-800 mb-2">ไม่สามารถสร้าง QR Code ได้</h3>
            <p class="text-red-600 mb-4">กรุณาบันทึกข้อมูลการจองคิว</p>
            <div class="bg-white p-4 rounded border text-left">
                <p><strong>รหัสจอง:</strong> ${parsedData.id}</p>
                <p><strong>เลขกำกับ:</strong> ${parsedData.referenceNumber}</p>
                <p><strong>บริษัท:</strong> ${parsedData.company}</p>
                <p><strong>วันที่:</strong> ${parsedData.date}</p>
                <p><strong>เวลา:</strong> ${parsedData.time}</p>
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

const createNotification = async (type, title, content, userId = null, bookingId = null) => {
    const notification = {
        type,
        title,
        content,
        userId,
        bookingId,
        timestamp: new Date().toISOString(),
        read: false
    };

    try {
        await addDoc(collection(db, "notifications"), notification);
        if (!userId || userId === state.currentUser?.id) {
            state.unreadNotifications++;
        }

        if (Notification.permission === 'granted' && (!userId || userId === state.currentUser?.id)) {
            new Notification(title, {
                body: content,
                icon: '/favicon.ico'
            });
        }

        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
    }
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

// Export Excel function (ข้อกำหนดที่ 3)
const handleExportExcel = async () => {
    try {
        const allBookings = Object.values(state.data.bookings).flat();
        
        const excelData = allBookings.map(booking => ({
            'ว/ด/ป': formatThaiDate(booking.date),
            'บริษัท': booking.companyName,
            'บิล': booking.invoiceCount,
            'กล่อง': booking.boxCount,
            'ชิ้น': booking.itemCount,
            'เวลาเข้า': booking.checkInTime ? formatDateTime(booking.checkInTime) : 'N/A',
            'เวลาออก': booking.checkInTime ? addMinutesToISODate(booking.checkInTime, 30) : 'N/A',
            'ผู้ขับรถ': booking.driverName,
            'ทะเบียนรถ': booking.licensePlate,
            'เบอร์โทร': booking.phoneNumber || 'N/A'
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Bookings');
        
        const fileName = `booking_data_${formatDate(new Date())}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        
        showAlert('ส่งออกข้อมูลเป็น Excel สำเร็จแล้ว');
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        showAlert('เกิดข้อผิดพลาดในการส่งออกข้อมูล');
    }
};

// Modal functions
const renderModalBase = (content, attachListenersCallback) => {
    const modalHtml = `
        <div class="modal-backdrop fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div class="modal-content bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                ${content}
            </div>
        </div>
    `;

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
        <div class="p-6 text-center">
            <h3 class="text-lg font-semibold mb-4">${message}</h3>
            <button class="close-modal-btn bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">ตกลง</button>
        </div>
    `;
    renderModalBase(modalContent);
};

const showConfirm = (message, onConfirm) => {
    const modalContent = `
        <div class="p-6 text-center">
            <h3 class="text-lg font-semibold mb-4">${message}</h3>
            <div class="flex gap-2 justify-center">
                <button class="close-modal-btn bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">ยกเลิก</button>
                <button id="confirm-ok" class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">ยืนยัน</button>
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
        <div class="p-6 text-center">
            <svg class="checkmark w-16 h-16 mx-auto mb-4 text-green-500" viewBox="0 0 52 52">
                <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                <path class="checkmark__check" fill="none" d="m14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
            <h3 class="text-lg font-semibold text-green-600">${message}</h3>
        </div>
    `;

    renderModalBase(modalContent);

    setTimeout(() => {
        closeModal();
        if (onComplete) onComplete();
    }, 1800);
};

// Render functions
const render = () => {
    const header = `
        <header class="bg-white shadow-sm border-b">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <h1 class="text-xl font-bold text-gray-900">ระบบจัดการคิว</h1>
                            <p class="text-sm text-gray-500">${(state.userRole === 'staff' || state.userRole === 'admin') ? 'มุมมองพนักงาน' : 'สำหรับซัพพลายเออร์'}</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-4">
                        ${state.isLoggedIn ? 
                            `<button id="logout-btn" class="text-gray-500 hover:text-gray-700">ออกจากระบบ</button>` : 
                            '<button id="staff-login-btn" class="text-blue-600 hover:text-blue-800">พนักงาน</button>'
                        }
                        <button id="quick-scan-btn" class="flex items-center space-x-1 text-gray-500 hover:text-gray-700">
                            ${icons.scanner}
                            <span>สแกน QR</span>
                        </button>
                        ${state.isLoggedIn ? `
                            <button id="notifications-btn" class="relative flex items-center space-x-1 text-gray-500 hover:text-gray-700">
                                ${icons.notifications}
                                <span>การแจ้งเตือน</span>
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
                    ${icons.manual}
                    <span class="font-medium text-blue-800">คู่มือการใช้งานระบบจองคิว</span>
                </div>
                <button id="toggle-manual-btn" class="text-blue-600 hover:text-blue-800">
                    <span id="manual-toggle-text">แสดง</span>
                </button>
            </div>
            <div id="manual-content" class="manual-content mt-4 space-y-6">
                <div class="bg-white rounded-lg p-4 shadow-sm">
                    <div class="flex items-start space-x-3">
                        <div class="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">1</div>
                        <div>
                            <h4 class="font-semibold text-gray-900 mb-2">การเข้าสู่ระบบจัดการคิว</h4>
                            <p class="text-gray-600 mb-2">เข้าใช้งานเว็บไซต์ได้ที่ borneoship.netlify.app หรือสแกน QR Code เพื่อเข้าสู่หน้าเว็บไซต์ได้ทันที</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-lg p-4 shadow-sm">
                    <div class="flex items-start space-x-3">
                        <div class="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">2</div>
                        <div>
                            <h4 class="font-semibold text-gray-900 mb-2">การเลือกวันจัดส่งสินค้า</h4>
                            <p class="text-gray-600 mb-2">เมื่อเข้าสู่ระบบแล้ว จะพบหน้าปฏิทินของ "ระบบจัดการคิว" กรุณาเลือกวันที่ต้องการเข้าส่งสินค้า โดยวันที่สามารถจองได้จะแสดงเป็นปุ่มที่กดได้</p>
                            <div class="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
                                <p class="text-sm text-yellow-800"><strong>หมายเหตุ:</strong> หากวันใดขึ้นเป็นสีแดง แสดงว่าเป็นวันหยุดของบริษัท จะไม่สามารถจองคิวส่งสินค้าในวันดังกล่าวได้</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-lg p-4 shadow-sm">
                    <div class="flex items-start space-x-3">
                        <div class="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">3</div>
                        <div>
                            <h4 class="font-semibold text-gray-900 mb-2">การกรอกข้อมูลการจอง</h4>
                            <p class="text-gray-600 mb-2">หลังจากเลือกวันที่แล้ว ระบบจะนำไปสู่หน้าจอที่แสดงปุ่ม "จองคิวลงสินค้า" กดปุ่มเพื่อเข้าสู่แบบฟอร์มการจอง</p>
                            <p class="text-gray-600 mb-2">ในส่วนของ "บริษัท" ให้เลือกชื่อบริษัท หากไม่มีในรายการ กรุณาเลือก "-- เพิ่มบริษัทใหม่ --" เพื่อกรอกข้อมูล</p>
                            <div class="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
                                <p class="text-sm text-yellow-800"><strong>หมายเหตุ:</strong> หากเป็นการเพิ่มบริษัทใหม่กรุณาใช้ชื่อบริษัทแบบเต็มตามที่ระบุใน Invoice</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-lg p-4 shadow-sm">
                    <div class="flex items-start space-x-3">
                        <div class="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">4</div>
                        <div>
                            <h4 class="font-semibold text-gray-900 mb-2">การกรอกรายละเอียด</h4>
                            <p class="text-gray-600 mb-2">กรอกข้อมูลในแบบฟอร์มให้ครบถ้วน:</p>
                            <ul class="list-disc list-inside text-gray-600 space-y-1 ml-4">
                                <li><strong>ชื่อ-นามสกุล คนขับ:</strong> กรอกชื่อผู้ขับรถที่จะนำสินค้ามาส่ง</li>
                                <li><strong>ทะเบียนรถ:</strong> ระบุหมายเลขทะเบียนรถให้ถูกต้อง</li>
                                <li><strong>เบอร์โทร:</strong> กรอกหมายเลขโทรศัพท์ที่สามารถติดต่อได้</li>
                                <li><strong>จำนวนบิล, จำนวนกล่อง, จำนวนชิ้น:</strong> กรอกข้อมูลตามความเป็นจริง โดยจำนวนชิ้นควรตรงกับข้อมูลในเอกสาร</li>
                                <li><strong>เวลาที่คาดว่าจะมาถึง:</strong> กดเพื่อเลือกช่วงเวลาที่คาดว่าจะเดินทางมาถึงคลังสินค้า</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-lg p-4 shadow-sm">
                    <div class="flex items-start space-x-3">
                        <div class="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">5</div>
                        <div>
                            <h4 class="font-semibold text-gray-900 mb-2">การแนบเอกสารเพิ่มเติม (ถ้ามี)</h4>
                            <p class="text-gray-600 mb-2">สามารถแนบไฟล์ Invoice และ P.O. เพื่อเพิ่มความรวดเร็วในการตรวจสอบสินค้าของพนักงาน</p>
                            <p class="text-gray-600 mb-2">คลิกที่ช่องสำหรับแนบไฟล์ และเลือกไฟล์จากอุปกรณ์</p>
                            <p class="text-gray-600">ไฟล์ที่รองรับ ได้แก่ PDF, JPG, PNG, DOC, และ DOCX โดยมีขนาดสูงสุดไม่เกิน 5 MB ต่อไฟล์</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-lg p-4 shadow-sm">
                    <div class="flex items-start space-x-3">
                        <div class="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">6</div>
                        <div>
                            <h4 class="font-semibold text-gray-900 mb-2">การยืนยันการจองและรับรหัสคิว</h4>
                            <p class="text-gray-600 mb-2">เมื่อกรอกข้อมูลครบถ้วนแล้ว ให้กดปุ่ม "ยืนยันการจอง"</p>
                            <div class="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
                                <p class="text-sm text-yellow-800"><strong>หมายเหตุ:</strong> หากเวลาที่เลือกมีผู้จองเต็มแล้ว ระบบจะทำการเลื่อนเวลาให้ 10 นาที โดยอัตโนมัติ</p>
                            </div>
                            <p class="text-gray-600 mt-2">เมื่อการจองสำเร็จ ระบบจะแสดง QR Code และรายละเอียดการจอง</p>
                            <div class="bg-red-50 border border-red-200 rounded p-2 mt-2">
                                <p class="text-sm text-red-800"><strong>คำแนะนำสำคัญ:</strong> กรุณาบันทึกภาพ QR Code นี้ไว้เพื่อใช้แสดงแก่พนักงานคลังสินค้าเมื่อเดินทางมาถึง</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-lg p-4 shadow-sm">
                    <div class="flex items-start space-x-3">
                        <div class="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">7</div>
                        <div>
                            <h4 class="font-semibold text-gray-900 mb-2">ข้อควรทราบ</h4>
                            <ul class="list-disc list-inside text-gray-600 space-y-1 ml-4">
                                <li>สามารถเดินทางมาถึงคลังสินค้า ก่อนเวลาที่จองไว้ได้</li>
                                <li>หากมาสายกว่าเวลาที่จองไว้ การจองดังกล่าวจะถือเป็นโมฆะ และจะต้องเข้าคิวแบบ Walk-in ตามปกติ</li>
                                <li>กรุณาหลีกเลี่ยงการจองคิวโดยที่ยังไม่มีความแน่นอนในการนำส่งสินค้าโดยเด็ดขาด เนื่องจากอาจส่งผลต่อการพิจารณาให้ความช่วยเหลือในกรณีสินค้ามีปัญหาในครั้งต่อไป</li>
                                <li>หากมีปัญหาเพิ่มเติม กรุณาติดต่อฝ่ายการตลาดเพื่อประสานงานกับทางคลังสินค้าทันที</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-lg p-4 shadow-sm">
                    <div class="flex items-start space-x-3">
                        <div class="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">8</div>
                        <div>
                            <h4 class="font-semibold text-gray-900 mb-2">การเช็คอินเมื่อถึงคลังสินค้า</h4>
                            <p class="text-gray-600 mb-2">เมื่อเดินทางมาถึงคลังสินค้า ให้แสดง QR Code ที่ได้รับจากการจองคิวให้กับพนักงานเพื่อทำการสแกน</p>
                            <p class="text-gray-600 mb-2">พนักงานจะทำการสแกน QR Code และกดปุ่ม "เช็คอิน" เพื่อบันทึกเวลาที่คุณมาถึง</p>
                            <div class="bg-blue-50 border border-blue-200 rounded p-2 mt-2">
                                <p class="text-sm text-blue-800"><strong>คำแนะนำ:</strong> หากพนักงานกดเช็คอินแล้วไม่มีอะไรเกิดขึ้น กรุณาแจ้งพนักงานให้ลองรีเฟรชหน้าจอแล้วทำการสแกนใหม่อีกครั้ง</p>
                            </div>
                        </div>
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

    appContainer.innerHTML = header + `<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">${viewContent}</main>`;
    attachAllListeners();
};

const renderStaffNav = () => `
    <nav class="bg-white rounded-lg shadow-sm border mb-6">
        <div class="flex space-x-1 p-1">
            <button class="staff-nav-btn flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium ${state.currentView === 'dashboard' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}" data-view="dashboard">
                ${icons.dashboard}
                <span>Dashboard</span>
            </button>
            <button class="staff-nav-btn flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium ${state.currentView === 'calendar' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}" data-view="calendar">
                ${icons.calendar}
                <span>ปฏิทิน</span>
            </button>
            <button class="staff-nav-btn flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium ${state.currentView === 'holidays' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}" data-view="holidays">
                ${icons.booking}
                <span>วันหยุด</span>
            </button>
            <button class="staff-nav-btn flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium ${state.currentView === 'kpi' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}" data-view="kpi">
                ${icons.kpi}
                <span>KPI</span>
            </button>
            <button class="staff-nav-btn flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium ${state.currentView === 'bookingDetails' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}" data-view="bookingDetails">
                ${icons.booking}
                <span>รายละเอียด</span>
            </button>
            <button class="staff-nav-btn flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium ${state.currentView === 'users' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}" data-view="users">
                ${icons.users}
                <span>ผู้ใช้</span>
            </button>
            <button class="staff-nav-btn flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium ${state.currentView === 'notifications' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}" data-view="notifications">
                ${icons.notifications}
                <span>การแจ้งเตือน</span>
            </button>
            <button class="staff-nav-btn flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium ${state.currentView === 'scanner' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}" data-view="scanner">
                ${icons.scanner}
                <span>สแกน QR</span>
            </button>
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
            <div class="dashboard-item bg-white p-4 rounded-lg border hover:shadow-md transition-shadow cursor-pointer" data-booking-id="${b.id}">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="font-medium">${formatTime24h(b.eta)} - ${b.companyName}</p>
                        <p class="text-sm text-gray-500">${b.licensePlate}</p>
                    </div>
                    <button class="text-blue-600 hover:text-blue-800 text-sm">ดูรายละเอียด</button>
                </div>
            </div>
        `).join('')
        : `<div class="text-center py-8 text-gray-500">ไม่มีคิวสำหรับวันนี้</div>`;

    const stats = getAttendanceStats();

    return `
        <div class="space-y-6">
            ${state.userRole === 'guest' ? '<button id="back-to-calendar-btn" class="mb-4 text-blue-600 hover:text-blue-800">← กลับไปยังปฏิทิน</button>' : ''}
            
            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-white p-6 rounded-lg shadow-sm border">
                    <div class="text-2xl font-bold text-green-600">${stats.onTime}</div>
                    <div class="text-sm text-gray-500">มาตรงเวลา</div>
                </div>
                <div class="bg-white p-6 rounded-lg shadow-sm border">
                    <div class="text-2xl font-bold text-red-600">${stats.late}</div>
                    <div class="text-sm text-gray-500">มาสาย</div>
                </div>
                <div class="bg-white p-6 rounded-lg shadow-sm border">
                    <div class="text-2xl font-bold text-blue-600">${stats.total}</div>
                    <div class="text-sm text-gray-500">รับสินค้าแล้ว</div>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="dashboard-item bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer" data-type="today">
                    <div class="flex items-center space-x-3">
                        <div class="p-3 bg-blue-100 rounded-lg">${icons.queue}</div>
                        <div>
                            <h3 class="font-semibold">คิวสำหรับวันนี้</h3>
                            <p class="text-2xl font-bold text-blue-600">${todayBookings.length}<span class="text-sm font-normal">คิว</span></p>
                        </div>
                    </div>
                    <button class="mt-4 text-blue-600 hover:text-blue-800 text-sm">ดูทั้งหมด</button>
                </div>

                <div class="dashboard-item bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer" data-type="next7days">
                    <div class="flex items-center space-x-3">
                        <div class="p-3 bg-green-100 rounded-lg">${icons.calendar}</div>
                        <div>
                            <h3 class="font-semibold">คิวใน 7 วันข้างหน้า</h3>
                            <p class="text-2xl font-bold text-green-600">${next7daysBookings}<span class="text-sm font-normal">คิว</span></p>
                        </div>
                    </div>
                    <button class="mt-4 text-green-600 hover:text-green-800 text-sm">ดูทั้งหมด</button>
                </div>

                <div class="dashboard-item bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer" data-type="companies">
                    <div class="flex items-center space-x-3">
                        <div class="p-3 bg-purple-100 rounded-lg">${icons.company}</div>
                        <div>
                            <h3 class="font-semibold">บริษัทซัพพลายเออร์</h3>
                            <p class="text-2xl font-bold text-purple-600">${state.data.companies.length}<span class="text-sm font-normal">บริษัท</span></p>
                        </div>
                    </div>
                    <button class="mt-4 text-purple-600 hover:text-purple-800 text-sm">ดูทั้งหมด</button>
                </div>
            </div>

            <!-- Today's Queue -->
            <div class="bg-white rounded-lg shadow-sm border">
                <div class="p-6 border-b">
                    <div class="flex justify-between items-center">
                        <h2 class="text-lg font-semibold">รายการคิววันนี้ (${formatThaiDate(todayStr)})</h2>
                        <button id="view-all-today-btn" class="text-blue-600 hover:text-blue-800 text-sm">ดูทั้งหมด</button>
                    </div>
                </div>
                <div class="p-6">
                    ${queueItemsHtml}
                </div>
            </div>
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
                <p class="text-blue-800">ข้อมูลการจองของคุณจะถูกบันทึกไว้ในเบราว์เซอร์นี้สำหรับการใช้งานครั้งถัดไป</p>
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
            myBookingsHtml = `
                <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <h3 class="font-semibold text-green-800 mb-2">สรุปคิวของฉัน</h3>
                    ${allMyBookings.map(b => `<div class="text-sm text-green-700">${new Date(b.date).toLocaleDateString('th-TH', {day: '2-digit', month: 'short'})} ${formatTime24h(b.eta)} - ${b.companyName}</div>`).join('')}
                </div>
            `;
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

        let dayClass = 'calendar-day p-2 border border-violet-100 flex flex-col rounded-md min-h-[80px]';
        let dayContent = `<div class="font-semibold">${day}</div>`;

        if (isPast) {
            dayClass += ' disabled bg-gray-50 text-gray-400';
        } else {
            dayClass += ' cursor-pointer hover:bg-blue-50';
        }

        if (dayOfWeek === 0 || dayOfWeek === 6) {
            dayClass += ' weekend-day bg-red-50 border-red-200';
            dayContent += `<div class="text-xs text-red-600 mt-1">วันหยุด</div>`;
        } else if (holiday) {
            dayClass += ' bg-red-50 border-red-200';
            const holidayName = holiday.name.length > 12 ? holiday.name.substring(0, 12) + '...' : holiday.name;
            dayContent += `<div class="text-xs text-red-600 mt-1">${holidayName}</div>`;
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
                    dayContent += `<div class="text-xs text-green-600 mt-1">คิวของคุณ: ${myBookings.map(b => formatTime24h(b.eta)).join(', ')}</div>`;
                } else {
                    dayContent += `<div class="text-xs text-gray-600 mt-1">${bookings.length} คิว</div>`;
                }
            } else {
                dayContent += `<div class="text-xs text-blue-600 mt-1">${state.data.bookings[dateStr].length} คิว</div>`;
            }
        }

        if (isFull && !holiday && dayOfWeek !== 0 && dayOfWeek !== 6) {
            dayContent += '<div class="text-xs text-red-600 mt-1">เต็ม</div>';
        }

        daysHtml += `<div class="${dayClass}" data-date="${dateStr}">${dayContent}</div>`;
    }

    return guestNoticeHtml + myBookingsHtml + `
        <div class="bg-white rounded-lg shadow-sm border">
            <div class="p-6 border-b">
                <div class="flex items-center justify-between">
                    <button id="prev-month-btn" class="p-2 hover:bg-gray-100 rounded">&lt;</button>
                    <h2 class="text-xl font-semibold">${monthName}</h2>
                    <button id="next-month-btn" class="p-2 hover:bg-gray-100 rounded">&gt;</button>
                </div>
            </div>
            <div class="p-6">
                <div class="grid grid-cols-7 gap-1 mb-4">
                    <div class="text-center font-semibold text-red-600 py-2">อา</div>
                    <div class="text-center font-semibold py-2">จ</div>
                    <div class="text-center font-semibold py-2">อ</div>
                    <div class="text-center font-semibold py-2">พ</div>
                    <div class="text-center font-semibold py-2">พฤ</div>
                    <div class="text-center font-semibold py-2">ศ</div>
                    <div class="text-center font-semibold text-red-600 py-2">ส</div>
                </div>
                <div class="grid grid-cols-7 gap-1">
                    ${daysHtml}
                </div>
                ${(state.userRole === 'staff' || state.userRole === 'admin') ? `
                    <div class="mt-6 pt-6 border-t">
                        <div class="flex items-center justify-between text-sm text-gray-600">
                            <div class="flex items-center space-x-4">
                                <div class="flex items-center space-x-1">
                                    <div class="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
                                    <span>วันหยุด: ${(state.data.holidays || []).length} วัน</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
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
            
            // แก้ไขข้อกำหนดที่ 1: แสดงเวลาที่จองแล้วให้ Guest
            if(state.userRole === 'guest' && !isGuestBooking) return `<div class="bg-gray-50 p-4 rounded-lg border">คิวที่ ${index + 1}: จองแล้ว (เวลา ${formatTime24h(booking.eta)})</div>`;

            let statusBadge = '';
            if (booking.checkInTime) {
                if (booking.status === 'completed') {
                    statusBadge = '<span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">เสร็จสิ้น</span>';
                } else if (checkIfLate(booking)) {
                    statusBadge = '<span class="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">มาสาย</span>';
                } else {
                    statusBadge = '<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">เช็คอินแล้ว</span>';
                }
            } else {
                statusBadge = '<span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">รอเช็คอิน</span>';
            }

            return `
                <div class="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <div class="flex items-center space-x-2 mb-2">
                                <h3 class="font-semibold">${booking.companyName}${isGuestBooking ? ' (คิวของคุณ)' : ''}</h3>
                                <div class="text-sm text-gray-500">${booking.driverName} - ${booking.licensePlate}</div>
                                ${booking.phoneNumber ? `<div class="text-xs text-gray-400">เบอร์โทร: ${booking.phoneNumber}</div>` : ''}
                                ${booking.referenceNumber ? `<div class="text-xs text-gray-400">เลขกำกับ: ${booking.referenceNumber}</div>` : ''}
                                ${statusBadge}
                            </div>
                            <div class="text-sm text-gray-600">
                                <div class="font-medium text-lg">${formatTime24h(booking.eta)}</div>
                                <div>${booking.boxCount} กล่อง / ${booking.itemCount} ชิ้น</div>
                                ${booking.checkInTime ? `<div class="text-xs text-gray-500">เช็คอิน: ${formatDateTime(booking.checkInTime)}</div>` : ''}
                            </div>
                        </div>
                        <div class="flex flex-col space-y-2">
                            <button class="view-details-btn text-blue-600 hover:text-blue-800 text-sm" data-booking-id="${booking.id}">ดูรายละเอียด</button>
                            ${(state.userRole === 'staff' || state.userRole === 'admin') ? `
                                <div class="flex flex-col space-y-1">
                                    ${!booking.checkInTime ? `<button class="check-in-btn bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600" data-booking-id="${booking.id}">เช็คอิน</button>` : ''}
                                    ${booking.checkInTime && booking.status !== 'completed' ? `<button class="complete-btn bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600" data-booking-id="${booking.id}">ยืนยันรับคิว</button>` : ''}
                                    <button class="evaluate-btn bg-purple-500 text-white px-3 py-1 rounded text-xs hover:bg-purple-600" data-booking-id="${booking.id}">ประเมิน KPI</button>
                                    <button class="delete-booking-btn bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600" data-booking-id="${booking.id}">ลบ</button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('')
        : `<div class="text-center py-8 text-gray-500">ยังไม่มีการจองคิวในวันนี้</div>`;

    return `
        <div class="space-y-6">
            <div class="flex items-center justify-between">
                <button id="back-to-calendar-btn" class="text-blue-600 hover:text-blue-800">&lt; กลับไป</button>
                <h1 class="text-2xl font-bold">${formatThaiDate(dateStr)}</h1>
                <div class="flex space-x-2">
                    ${state.userRole === 'guest' && !isFull ? '<button id="book-slot-btn" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">จองคิวลงสินค้า</button>' : ''}
                    ${isFull ? '<span class="bg-red-100 text-red-800 px-3 py-1 rounded">คิวเต็ม (20 คิว/วัน)</span>' : ''}
                </div>
            </div>
            <div class="space-y-4">
                ${queueItemsHtml}
            </div>
        </div>
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
                    statusBadge = '<span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">เสร็จสิ้น</span>';
                } else if (checkIfLate(booking)) {
                    statusBadge = '<span class="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">มาสาย</span>';
                } else {
                    statusBadge = '<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">เช็คอินแล้ว</span>';
                }
            } else {
                statusBadge = '<span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">รอเช็คอิน</span>';
            }

            return `
                <div class="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <div class="flex items-center space-x-2 mb-2">
                                <h3 class="font-semibold">${booking.companyName}</h3>
                                <div class="text-sm text-gray-500">${booking.driverName} - ${booking.licensePlate}</div>
                                <div class="text-sm text-gray-500">${formatThaiDate(booking.date)} ${formatTime24h(booking.eta)}</div>
                                ${booking.phoneNumber ? `<div class="text-xs text-gray-400">เบอร์โทร: ${booking.phoneNumber}</div>` : ''}
                                ${booking.referenceNumber ? `<div class="text-xs text-gray-400">เลขกำกับ: ${booking.referenceNumber}</div>` : ''}
                                ${statusBadge}
                            </div>
                            <div class="text-sm text-gray-600">
                                <div>${booking.boxCount} กล่อง / ${booking.itemCount} ชิ้น</div>
                                ${booking.checkInTime ? `<div class="text-xs text-gray-500">เช็คอิน: ${formatDateTime(booking.checkInTime)}</div>` : ''}
                            </div>
                        </div>
                        <div class="flex space-x-2">
                            <button class="view-details-btn text-blue-600 hover:text-blue-800 text-sm" data-booking-id="${booking.id}">ดูรายละเอียด</button>
                            ${(state.userRole === 'staff' || state.userRole === 'admin') ? `
                                <div class="flex flex-col space-y-1">
                                    ${!booking.checkInTime ? `<button class="check-in-btn bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600" data-booking-id="${booking.id}">เช็คอิน</button>` : ''}
                                    ${booking.checkInTime && booking.status !== 'completed' ? `<button class="complete-btn bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600" data-booking-id="${booking.id}">ยืนยันรับคิว</button>` : ''}
                                    <button class="evaluate-btn bg-purple-500 text-white px-3 py-1 rounded text-xs hover:bg-purple-600" data-booking-id="${booking.id}">ประเมิน KPI</button>
                                    <button class="delete-booking-btn bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600" data-booking-id="${booking.id}">ลบ</button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('')
        : `<div class="text-center py-8 text-gray-500">ยังไม่มีการจองคิว</div>`;

    return `
        <div class="space-y-6">
            <div class="flex items-center justify-between">
                <button id="back-to-dashboard-btn" class="text-blue-600 hover:text-blue-800">&lt; กลับไปยัง Dashboard</button>
            </div>
            <div class="bg-white rounded-lg shadow-sm border">
                <div class="p-6 border-b">
                    <h2 class="text-lg font-semibold">รายละเอียดการจองคิวทั้งหมด</h2>
                    <div class="mt-4 flex space-x-2">
                        <input type="text" id="reference-search" placeholder="ค้นหาด้วยเลขกำกับ" class="flex-1 px-3 py-2 border rounded-md">
                        <button id="search-reference-btn" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">ค้นหา</button>
                        ${(state.userRole === 'staff' || state.userRole === 'admin') ? `
                            <button id="export-excel-btn" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">Export to Excel</button>
                        ` : ''}
                    </div>
                </div>
                <div class="p-6 space-y-4">
                    ${bookingsHtml}
                </div>
            </div>
        </div>
    `;
};

const renderScannerView = () => {
    return `
        <div class="space-y-6">
            <div class="flex items-center justify-between">
                <button id="back-from-scanner-btn" class="text-blue-600 hover:text-blue-800">&lt; กลับไปยังหน้าก่อนหน้า</button>
            </div>
            <div class="bg-white rounded-lg shadow-sm border p-6">
                <h2 class="text-xl font-semibold mb-6 text-center">สแกน QR Code</h2>
                <div class="max-w-md mx-auto">
                    <div class="relative bg-black rounded-lg overflow-hidden mb-4" style="aspect-ratio: 1;">
                        <video id="video" class="w-full h-full object-cover" autoplay muted playsinline></video>
                        <div class="absolute inset-0 border-2 border-white opacity-50 m-8"></div>
                    </div>
                    <div class="text-center space-y-4">
                        <p class="text-gray-600">วาง QR Code ให้อยู่ในกรอเพื่อทำการสแกน</p>
                        <div class="flex justify-center space-x-2">
                            <button id="start-camera-btn" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">เปิดกล้อง</button>
                            <button id="stop-camera-btn" class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 hidden">ปิดกล้อง</button>
                            <button id="manual-input-btn" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">ป้อนเลขกำกับ</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
};

const renderUsersView = () => {
    const users = state.data.users || [];

    const usersHtml = users.map(user => {
        const roleClass = user.role === 'admin' ? 'role-admin' : user.role === 'staff' ? 'role-staff' : 'role-viewer';
        return `
            <tr class="border-b">
                <td class="py-3 px-4">${user.name}</td>
                <td class="py-3 px-4">${user.email}</td>
                <td class="py-3 px-4"><span class="${roleClass} px-2 py-1 rounded text-xs">${user.role === 'admin' ? 'ผู้ดูแลระบบ' : user.role === 'staff' ? 'พนักงาน' : 'ผู้ดู'}</span></td>
                <td class="py-3 px-4">${user.lastLogin ? formatDateTime(user.lastLogin) : 'ไม่เคยเข้าสู่ระบบ'}</td>
                <td class="py-3 px-4">
                    <div class="flex space-x-2">
                        <button class="edit-user-btn text-blue-600 hover:text-blue-800 text-sm" data-user-id="${user.id}">แก้ไข</button>
                        <button class="delete-user-btn text-red-600 hover:text-red-800 text-sm" data-user-id="${user.id}">ลบ</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <div class="space-y-6">
            <div class="flex items-center justify-between">
                <button id="back-to-dashboard-btn" class="text-blue-600 hover:text-blue-800">&lt; กลับไปยัง Dashboard</button>
            </div>
            <div class="bg-white rounded-lg shadow-sm border">
                <div class="p-6 border-b">
                    <div class="flex justify-between items-center">
                        <h2 class="text-lg font-semibold">จัดการผู้ใช้</h2>
                        <button id="add-user-btn" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">เพิ่มผู้ใช้</button>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="py-3 px-4 text-left">ชื่อ</th>
                                <th class="py-3 px-4 text-left">อีเมล</th>
                                <th class="py-3 px-4 text-left">บทบาท</th>
                                <th class="py-3 px-4 text-left">เข้าสู่ระบบครั้งล่าสุด</th>
                                <th class="py-3 px-4 text-left">การจัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${usersHtml || '<tr><td colspan="5" class="py-8 text-center text-gray-500">ไม่มีผู้ใช้</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
};

const renderNotificationsView = () => {
    const notifications = state.data.notifications || [];
    
    // จัดเรียงการแจ้งเตือนตามเวลา (ล่าสุดขึ้นก่อน)
    const sortedNotifications = [...notifications].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // แบ่งหน้า
    const startIndex = (state.notificationPage - 1) * state.notificationsPerPage;
    const endIndex = startIndex + state.notificationsPerPage;
    const paginatedNotifications = sortedNotifications.slice(startIndex, endIndex);
    
    // คำนวณจำนวนหน้า
    const totalPages = Math.ceil(sortedNotifications.length / state.notificationsPerPage);

    const notificationsHtml = paginatedNotifications.map(notification => {
        const typeClass = notification.type === 'reminder' ? 'notification-reminder' : 
                         notification.type === 'arrival' ? 'notification-arrival' : 
                         notification.type === 'booking' ? 'notification-booking' : 'notification-message';
        const typeLabel = notification.type === 'reminder' ? 'การแจ้งเตือน' : 
                         notification.type === 'arrival' ? 'การมาถึง' : 
                         notification.type === 'booking' ? 'การจองคิว' : 'ข้อความ';

        return `
            <div class="bg-white p-4 rounded-lg border ${!notification.read ? 'border-blue-200 bg-blue-50' : ''}">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center space-x-2">
                        <span class="${typeClass} px-2 py-1 rounded text-xs">${typeLabel}</span>
                        <h3 class="font-semibold">${notification.title}</h3>
                    </div>
                    <div class="text-sm text-gray-500">${formatDateTime(notification.timestamp)}</div>
                </div>
                <p class="text-gray-600 mb-2">${notification.content}</p>
                <div class="flex justify-between items-center" data-notification-id="${notification.id}">
                    ${!notification.read ? '<button class="mark-read-btn text-blue-600 hover:text-blue-800 text-sm">ทำเครื่องหมายว่าอ่านแล้ว</button>' : ''}
                    <button class="delete-notification-btn text-red-600 hover:text-red-800 text-sm" data-notification-id="${notification.id}">
                        ${icons.trash} ลบ
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // สร้างปุ่มสำหรับการแบ่งหน้า
    const paginationHtml = totalPages > 1 ? `
        <div class="flex justify-center items-center space-x-4 mt-6">
            <button id="prev-page-btn" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 ${state.notificationPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}" ${state.notificationPage === 1 ? 'disabled' : ''}>ก่อนหน้า</button>
            <span class="text-gray-600">หน้า ${state.notificationPage} จาก ${totalPages}</span>
            <button id="next-page-btn" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 ${state.notificationPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}" ${state.notificationPage === totalPages ? 'disabled' : ''}>ถัดไป</button>
        </div>
    ` : '';

    return `
        <div class="space-y-6">
            <div class="flex items-center justify-between">
                <button id="back-to-dashboard-btn" class="text-blue-600 hover:text-blue-800">&lt; กลับไปยัง Dashboard</button>
            </div>
            <div class="bg-white rounded-lg shadow-sm border">
                <div class="p-6 border-b">
                    <div class="flex justify-between items-center">
                        <h2 class="text-lg font-semibold">การแจ้งเตือน</h2>
                        <div class="flex space-x-2">
                            <button id="mark-all-read-btn" class="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">ทำเครื่องหมายว่าอ่านทั้งหมด</button>
                            <button id="delete-read-btn" class="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600">ลบที่อ่านแล้ว</button>
                            <button id="delete-all-btn" class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">ลบทั้งหมด</button>
                        </div>
                    </div>
                </div>
                <div class="p-6 space-y-4">
                    ${notificationsHtml || '<div class="text-center py-8 text-gray-500">ไม่มีการแจ้งเตือน</div>'}
                </div>
                ${paginationHtml}
            </div>
        </div>
    `;
};

// แก้ไขฟังก์ชัน getKpiData เพื่อเพิ่ม evaluation field (ข้อกำหนดที่ 2)
const getKpiData = () => {
    const companyData = {};

    Object.values(state.data.bookings).flat().forEach(b => {
        if (!b.evaluation || !b.evaluation.scores) return;

        if (!companyData[b.companyName]) {
            companyData[b.companyName] = { scores: [], count: 0, bookings: [] };
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
            status: b.status,
            evaluation: b.evaluation // เพิ่ม field evaluation (ข้อกำหนดที่ 2)
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

    const supplierListHtml = filteredData.length > 0
        ? filteredData.map((company, index) => `
            <div class="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow">
                <div class="flex justify-between items-center">
                    <div class="flex items-center space-x-4">
                        <div class="text-2xl font-bold text-gray-400">#${index + 1}</div>
                        <div>
                            <h3 class="font-semibold">${company.name}</h3>
                            <div class="text-2xl font-bold text-blue-600">${company.averageScore.toFixed(2)}</div>
                        </div>
                    </div>
                    <button class="view-company-details-btn bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600" data-company="${company.name}">ดูประวัติการจัดส่ง</button>
                </div>
            </div>
        `).join('')
        : `<div class="text-center py-8 text-gray-500">ไม่พบข้อมูลซัพพลายเอร์</div>`;

    return `
        <div class="space-y-6">
            <div class="flex items-center justify-between">
                <button id="back-to-dashboard-btn" class="text-blue-600 hover:text-blue-800">&lt; กลับไปยัง Dashboard</button>
            </div>
            <div class="bg-white rounded-lg shadow-sm border">
                <div class="p-6 border-b">
                    <h2 class="text-lg font-semibold">ผลการประเมิน KPI ซัพพลายเอร์</h2>
                    <div class="mt-4">
                        <input type="text" id="kpi-search" placeholder="ค้นหาบริษัท..." value="${state.kpiSearchTerm}" class="w-full px-3 py-2 border rounded-md">
                    </div>
                </div>
                <div class="p-6">
                    <div class="grid grid-cols-1 gap-4 mb-6">
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <div class="grid grid-cols-3 gap-4 text-center font-semibold text-gray-600 mb-4">
                                <div>อันดับ</div>
                                <div>ชื่อบริษัท</div>
                                <div>คะแนนเฉลี่ย</div>
                            </div>
                        </div>
                        ${supplierListHtml}
                    </div>
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h3 class="font-semibold mb-4">5 อันดับคะแนนสูงสุด</h3>
                        <canvas id="kpi-chart" width="400" height="200"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;
};

const renderHolidayManagement = () => {
    const currentYear = new Date().getFullYear();
    const holidays = state.data.holidays || [];

    const holidayListHtml = holidays.map((holiday, index) => `
        <div class="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-2">
                        <h3 class="font-semibold">${holiday.name}</h3>
                        <div class="text-sm text-gray-500">${formatThaiDate(holiday.date)} ${holiday.recurring ? '(ทุกปี)' : ''}</div>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="px-2 py-1 rounded text-xs ${
                        holiday.type === 'company' ? 'bg-blue-100 text-blue-800' :
                        holiday.type === 'public' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                    }">${
                        holiday.type === 'company' ? 'วันหยุดบริษัท' :
                        holiday.type === 'public' ? 'วันหยุดราชการ' :
                        'วันหยุดพิเศษ'
                    }</span>
                    <button onclick="deleteHoliday(${index})" class="text-red-600 hover:text-red-800 text-sm">${icons.trash}</button>
                </div>
            </div>
        </div>
    `).join('');

    return `
        <div class="space-y-6">
            <div class="flex items-center justify-between">
                <button id="back-to-dashboard-btn" class="text-blue-600 hover:text-blue-800">&lt; กลับไปยัง Dashboard</button>
            </div>
            <div class="bg-white rounded-lg shadow-sm border">
                <div class="p-6 border-b">
                    <div class="flex justify-between items-center">
                        <h2 class="text-lg font-semibold">จัดการวันหยุดบริษัท</h2>
                        <div class="flex space-x-2">
                            <button id="add-holiday-btn" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">เพิ่มวันหยุด</button>
                            <button id="import-public-holidays-btn" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">นำเข้าวันหยุดราชการ</button>
                        </div>
                    </div>
                </div>
                <div class="p-6">
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div class="lg:col-span-2">
                            <div class="space-y-4">
                                <h3 class="font-semibold">รายการวันหยุด (${holidays.length} วัน)</h3>
                                <div class="space-y-3">
                                    ${holidays.length > 0 ? holidayListHtml : '<div class="text-center py-8 text-gray-500">ยังไม่มีวันหยุดที่กำหนด</div>'}
                                </div>
                            </div>
                        </div>
                        <div class="space-y-6">
                            <div class="bg-gray-50 p-4 rounded-lg">
                                <h3 class="font-semibold mb-4">สถิติวันหยุด</h3>
                                <div class="space-y-3">
                                    <div class="flex justify-between">
                                        <span>วันหยุดบริษัท</span>
                                        <span class="font-semibold">${holidays.filter(h => h.type === 'company').length}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>วันหยุดราชการ</span>
                                        <span class="font-semibold">${holidays.filter(h => h.type === 'public').length}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>วันหยุดพิเศษ</span>
                                        <span class="font-semibold">${holidays.filter(h => h.type === 'special').length}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-blue-50 p-4 rounded-lg">
                                <h3 class="font-semibold mb-2">ข้อมูลเพิ่มเติม</h3>
                                <div class="text-sm text-blue-800 space-y-1">
                                    <p>• วันหยุดบริษัท: วันหยุดที่บริษัทกำหนดเอง</p>
                                    <p>• วันหยุดราชการ: วันหยุดตามประกาศราชการ</p>
                                    <p>• วันหยุดพิเศษ: วันหยุดกรณีพิเศษ</p>
                                    <p class="text-red-600">⚠️ ไม่สามารถจองคิวในวันหยุดได้</p>
                                    <p class="text-red-600">⚠️ วันเสาร์และวันอาทิตย์เป็นวันหยุดสุดสัปดาห์ ไม่สามารถจองคิวได้</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
};

// Event listeners and handlers
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
        document.getElementById('mark-all-read-btn')?.addEventListener('click', async () => {
            try {
                const notificationsSnapshot = await getDocs(collection(db, "notifications"));
                const updatePromises = [];
                notificationsSnapshot.forEach((doc) => {
                    updatePromises.push(updateDoc(doc.ref, { read: true }));
                });
                await Promise.all(updatePromises);
                state.unreadNotifications = 0;
                render();
            } catch (error) {
                console.error('Error marking all notifications as read:', error);
                showAlert('เกิดข้อผิดพลาดในการอัปเดตการแจ้งเตือน');
            }
        });

        document.getElementById('delete-read-btn')?.addEventListener('click', () => {
            showConfirm('คุณต้องการลบการแจ้งเตือนที่อ่านแล้วทั้งหมดใช่หรือไม่?', async () => {
                try {
                    const notificationsSnapshot = await getDocs(collection(db, "notifications"));
                    const deletePromises = [];
                    notificationsSnapshot.forEach((doc) => {
                        if (doc.data().read) {
                            deletePromises.push(deleteDoc(doc.ref));
                        }
                    });
                    await Promise.all(deletePromises);
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
                    const notificationsSnapshot = await getDocs(collection(db, "notifications"));
                    const deletePromises = [];
                    notificationsSnapshot.forEach((doc) => {
                        deletePromises.push(deleteDoc(doc.ref));
                    });
                    await Promise.all(deletePromises);
                    state.unreadNotifications = 0;
                    showAlert('ลบการแจ้งเตือนทั้งหมดสำเร็จแล้ว');
                    render();
                } catch (error) {
                    console.error('Error deleting all notifications:', error);
                    showAlert('เกิดข้อผิดพลาดในการลบการแจ้งเตือน');
                }
            });
        });

        document.querySelectorAll('.mark-read-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const notificationId = parseInt(e.currentTarget.parentElement.dataset.notificationId);
                try {
                    const notificationsSnapshot = await getDocs(collection(db, "notifications"));
                    notificationsSnapshot.forEach(async (doc) => {
                        if (doc.id === notificationId.toString()) {
                            await updateDoc(doc.ref, { read: true });
                        }
                    });
                    updateUnreadNotifications();
                    render();
                } catch (error) {
                    console.error('Error marking notification as read:', error);
                    showAlert('เกิดข้อผิดพลาดในการอัปเดตการแจ้งเตือน');
                }
            });
        });

        document.querySelectorAll('.delete-notification-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const notificationId = parseInt(e.currentTarget.dataset.notificationId);
                showConfirm('คุณต้องการลบการแจ้งเตือนนี้ใช่หรือไม่?', async () => {
                    try {
                        const notificationsSnapshot = await getDocs(collection(db, "notifications"));
                        notificationsSnapshot.forEach(async (doc) => {
                            if (doc.id === notificationId.toString()) {
                                await deleteDoc(doc.ref);
                            }
                        });
                        updateUnreadNotifications();
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
    if (ctx) {
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

    // เพิ่ม Event Listener สำหรับปุ่ม Export Excel (ข้อกำหนดที่ 3)
    document.getElementById('export-excel-btn')?.addEventListener('click', handleExportExcel);

    document.querySelectorAll('.view-details-btn').forEach(btn => btn.addEventListener('click', (e) => {
        state.selectedBookingId = e.currentTarget.dataset.bookingId;
        renderModal('bookingDetails', { bookingId: e.currentTarget.dataset.bookingId });
    }));

    // เพิ่ม Event Listeners สำหรับปุ่ม Admin ในหน้า bookingDetails
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
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
            clearInterval(scanInterval);
            handleQRCodeScanned(code.data);
            setTimeout(() => {
                stopCamera();
            }, 1000);
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
        const bookingRef = doc(db, "bookings", bookingId);
        await updateDoc(bookingRef, {
            checkInTime: new Date().toISOString()
        });

        // Find booking in local state for notification
        const booking = allBookingsById[bookingId];
        if (booking) {
            createNotification(
                'arrival',
                'ซัพพลายเออร์มาถึงแล้ว',
                `${booking.companyName} มาถึงคลังสินค้าแล้วเวลา ${formatDateTime(new Date())}`,
                null,
                bookingId
            );
        }

        showSuccessAnimation('เช็คอินสำเร็จแล้ว');
        render();
    } catch (error) {
        console.error('Error checking in:', error);
        showAlert('เกิดข้อผิดพลาดในการเช็คอิน กรุณาลองใหม่');
    }
};

const handleCompleteBooking = async (bookingId) => {
    try {
        const bookingRef = doc(db, "bookings", bookingId);
        await updateDoc(bookingRef, {
            status: 'completed',
            completedTime: new Date().toISOString()
        });

        showSuccessAnimation('ยืนยันการรับคิวสำเร็จแล้ว');
        render();
    } catch (error) {
        console.error('Error completing booking:', error);
        showAlert('เกิดข้อผิดพลาดในการยืนยันการรับคิว กรุณาลองใหม่');
    }
};

const renderTimePickerModal = (bookingModal) => {
    const modalContent = `
        <div class="p-6">
            <h3 class="text-lg font-semibold mb-4 text-center">เลือกเวลา</h3>
            <div class="text-center mb-4">
                <div class="inline-flex items-center space-x-2 text-2xl font-mono">
                    <span id="hour-preview" class="text-violet-500 cursor-pointer">--</span>
                    <span>:</span>
                    <span id="minute-preview" class="cursor-pointer">--</span>
                </div>
            </div>
            <div id="clock-container" class="relative w-64 h-64 mx-auto mb-6"></div>
            <div class="flex justify-center space-x-2">
                <button class="close-modal-btn bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">ยกเลิก</button>
                <button id="confirm-time-btn" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600" disabled>ยืนยัน</button>
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
            clockFace.className = 'clock-face relative w-full h-full border-2 border-gray-300 rounded-full';

            const clockCenter = document.createElement('div');
            clockCenter.className = 'clock-center absolute top-1/2 left-1/2 w-2 h-2 bg-blue-500 rounded-full transform -translate-x-1/2 -translate-y-1/2';
            clockFace.appendChild(clockCenter);

            if (currentPickerView === 'hours') {
                for (let i = 1; i <= 12; i++) {
                    const angle = (i / 12) * 360 - 90;
                    const x = 112 + 95 * Math.cos(angle * Math.PI / 180);
                    const y = 112 + 95 * Math.sin(angle * Math.PI / 180);

                    const numberEl = document.createElement('div');
                    numberEl.className = 'clock-number absolute w-8 h-8 flex items-center justify-center bg-blue-100 rounded-full cursor-pointer hover:bg-blue-200 transform -translate-x-1/2 -translate-y-1/2';
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
                    numberEl.className = `clock-number absolute w-8 h-8 flex items-center justify-center rounded-full cursor-pointer transform -translate-x-1/2 -translate-y-1/2 ${dataHour > 14 ? 'bg-gray-200 text-gray-400 cursor-not-allowed disabled' : 'bg-blue-100 hover:bg-blue-200'}`;
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
                    numberEl.className = 'clock-number absolute w-8 h-8 flex items-center justify-center bg-blue-100 rounded-full cursor-pointer hover:bg-blue-200 transform -translate-x-1/2 -translate-y-1/2';

                    if (selectedHour === 11 && minute === '30') {
                        numberEl.classList.add('disabled', 'bg-gray-200', 'text-gray-400', 'cursor-not-allowed');
                        numberEl.title = 'เวลาพักพนักงาน (11:30-12:30)';
                    } else if (selectedHour === 12 && (minute === '00' || minute === '10' || minute === '20' || minute === '30')) {
                        numberEl.classList.add('disabled', 'bg-gray-200', 'text-gray-400', 'cursor-not-allowed');
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

                const finalTime = `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
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
        <div class="p-6">
            <h3 class="text-lg font-semibold mb-4">เพิ่มวันหยุด</h3>
            <form id="holiday-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1">ชื่อวันหยุด</label>
                    <input type="text" id="holiday-name" required class="w-full px-3 py-2 border rounded-md">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">วันที่</label>
                    <input type="date" id="holiday-date" required class="w-full px-3 py-2 border rounded-md">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">ประเภทวันหยุด</label>
                    <select id="holiday-type" required class="w-full px-3 py-2 border rounded-md">
                        <option value="company">วันหยุดบริษัท</option>
                        <option value="public">วันหยุดราชการ</option>
                        <option value="special">วันหยุดพิเศษ</option>
                    </select>
                </div>
                <div>
                    <label class="flex items-center space-x-2">
                        <input type="checkbox" id="holiday-recurring">
                        <span class="text-sm">วันหยุดทุกปี (ประจำปี)</span>
                    </label>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">รายละเอียดเพิ่มเติม (ไม่บังคับ)</label>
                    <textarea id="holiday-description" class="w-full px-3 py-2 border rounded-md" rows="3"></textarea>
                </div>
                <div class="flex justify-end space-x-2">
                    <button type="button" class="close-modal-btn bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">ยกเลิก</button>
                    <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">บันทึก</button>
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
        <div class="p-6">
            <h3 class="text-lg font-semibold mb-4">นำเข้าวันหยุดราชการ</h3>
            <form id="import-holidays-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1">เลือกปี</label>
                    <select id="holiday-year" required class="w-full px-3 py-2 border rounded-md">
                        ${years.map(year => `<option value="${year}">ปี ${year + 543}</option>`).join('')}
                    </select>
                </div>
                <div class="bg-blue-50 p-4 rounded-lg">
                    <div class="flex items-start space-x-2">
                        <div class="text-blue-600 mt-1">ℹ️</div>
                        <div>
                            <h4 class="font-semibold text-blue-800">ข้อมูลวันหยุดราชการ</h4>
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
                <div class="flex justify-end space-x-2">
                    <button type="button" class="close-modal-btn bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">ยกเลิก</button>
                    <button type="submit" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">นำเข้าข้อมูล</button>
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
        <div class="p-6">
            <h3 class="text-lg font-semibold mb-4">เพิ่มผู้ใช้</h3>
            <form id="user-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1">ชื่อ</label>
                    <input type="text" id="user-name" required class="w-full px-3 py-2 border rounded-md">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">อีเมล</label>
                    <input type="email" id="user-email" required class="w-full px-3 py-2 border rounded-md">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">รหัสผ่าน</label>
                    <input type="password" id="user-password" required class="w-full px-3 py-2 border rounded-md">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">บทบาท</label>
                    <select id="user-role" required class="w-full px-3 py-2 border rounded-md">
                        <option value="viewer">ผู้ดู</option>
                        <option value="staff">พนักงาน</option>
                        <option value="admin">ผู้ดูแลระบบ</option>
                    </select>
                </div>
                <div class="flex justify-end space-x-2">
                    <button type="button" class="close-modal-btn bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">ยกเลิก</button>
                    <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">บันทึก</button>
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
        <div class="p-6">
            <h3 class="text-lg font-semibold mb-4">แก้ไขผู้ใช้</h3>
            <form id="user-form" class="space-y-4">
                <input type="hidden" id="user-id" value="${user.id}">
                <div>
                    <label class="block text-sm font-medium mb-1">ชื่อ</label>
                    <input type="text" id="user-name" value="${user.name}" required class="w-full px-3 py-2 border rounded-md">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">อีเมล</label>
                    <input type="email" id="user-email" value="${user.email}" required class="w-full px-3 py-2 border rounded-md">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">รหัสผ่าน (ปล่อยว่างหากไม่ต้องการเปลี่ยน)</label>
                    <input type="password" id="user-password" class="w-full px-3 py-2 border rounded-md">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">บทบาท</label>
                    <select id="user-role" required class="w-full px-3 py-2 border rounded-md">
                        <option value="viewer" ${user.role === 'viewer' ? 'selected' : ''}>ผู้ดู</option>
                        <option value="staff" ${user.role === 'staff' ? 'selected' : ''}>พนักงาน</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>ผู้ดูแลระบบ</option>
                    </select>
                </div>
                <div class="flex justify-end space-x-2">
                    <button type="button" class="close-modal-btn bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">ยกเลิก</button>
                    <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">บันทึก</button>
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
        name: form.querySelector('#user-name').value,
        email: form.querySelector('#user-email').value,
        password: form.querySelector('#user-password').value,
        role: form.querySelector('#user-role').value,
        createdAt: new Date().toISOString(),
        lastLogin: null
    };

    try {
        await addDoc(collection(db, "users"), newUser);
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

    const updatedUser = {
        name: form.querySelector('#user-name').value,
        email: form.querySelector('#user-email').value,
        role: form.querySelector('#user-role').value
    };

    const newPassword = form.querySelector('#user-password').value;
    if (newPassword) {
        updatedUser.password = newPassword;
    }

    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, updatedUser);
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
        await deleteDoc(doc(db, "users", userId));
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
        name: form.querySelector('#holiday-name').value,
        date: form.querySelector('#holiday-date').value,
        type: form.querySelector('#holiday-type').value,
        recurring: form.querySelector('#holiday-recurring').checked,
        description: form.querySelector('#holiday-description').value
    };

    // Check if holiday already exists
    const existingHoliday = state.data.holidays.find(h => h.date === holiday.date);
    if (existingHoliday) {
        showAlert('มีวันหยุดในวันที่เลือกแล้ว');
        return;
    }

    try {
        await addDoc(collection(db, "holidays"), holiday);
        closeModal(form.closest('.modal-backdrop'));
        showSuccessAnimation('เพิ่มวันหยุดสำเร็จแล้ว');
        render();
    } catch (error) {
        console.error('Error adding holiday:', error);
        showAlert('เกิดข้อผิดพลาดในการเพิ่มวันหยุด กรุณาลองใหม่');
    }
};

window.deleteHoliday = async (holidayId) => {
    showConfirm('คุณต้องการลบวันหยุดนี้ใช่หรือไม่?', async () => {
        try {
            await deleteDoc(doc(db, "holidays", holidayId));
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

    let addedCount = 0;
    const addPromises = [];

    for (const holiday of publicHolidays) {
        const exists = state.data.holidays.some(h =>
            h.date === holiday.date && h.type === 'public'
        );

        if (!exists) {
            addPromises.push(addDoc(collection(db, "holidays"), holiday));
            addedCount++;
        }
    }

    try {
        await Promise.all(addPromises);
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
            <div class="p-6">
                <h3 class="text-lg font-semibold mb-4">เข้าสู่ระบบพนักงาน</h3>
                <form id="login-form" class="space-y-4">
                    <input type="email" id="email" placeholder="อีเมล" required class="w-full px-3 py-2 border rounded-md">
                    <input type="password" id="password" placeholder="รหัสผ่าน" required class="w-full px-3 py-2 border rounded-md">
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
                <div class="p-6 text-center">
                    <div class="text-red-600 text-6xl mb-4">🚫</div>
                    <h3 class="text-lg font-semibold text-red-800 mb-2">ไม่สามารถจองคิวได้</h3>
                    <p class="text-red-600 mb-4">วันที่ ${formatThaiDate(state.selectedDate)} เป็นวันหยุด: ${holiday.name}</p>
                    <p class="text-gray-600 mb-4">กรุณาเลือกวันอื่นเพื่อจองคิว</p>
                    <div class="flex justify-center">
                        <button class="close-modal-btn bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">ปิด</button>
                    </div>
                </div>
            `;

            renderModalBase(modalContent);
            return;
        }

        if (checkDailyQueueLimit(state.selectedDate)) {
            modalContent = `
                <div class="p-6 text-center">
                    <div class="text-red-600 text-6xl mb-4">⚠️</div>
                    <h3 class="text-lg font-semibold text-red-800 mb-2">คิวเต็ม</h3>
                    <p class="text-red-600 mb-4">วันที่ ${formatThaiDate(state.selectedDate)} มีการจองคิวครบ 20 คิวแล้ว</p>
                    <p class="text-gray-600 mb-4">กรุณาเลือกวันอื่นเพื่อจองคิว</p>
                    <div class="flex justify-center">
                        <button class="close-modal-btn bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">ปิด</button>
                    </div>
                </div>
            `;

            renderModalBase(modalContent);
            return;
        }

        const companyOptions = state.data.companies.map(c => `<option value="${c}">${c}</option>`).join('');

        modalContent = `
            <div class="p-6">
                <h3 class="text-lg font-semibold mb-4">จองคิววันที่ ${formatThaiDate(state.selectedDate)}</h3>
                <form id="booking-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-1">บริษัท</label>
                        <select id="company-name" required class="w-full px-3 py-2 border rounded-md">
                            <option value="">-- เลือกบริษัท --</option>
                            ${companyOptions}
                            <option value="add_new">-- เพิ่มบริษัทใหม่ --</option>
                        </select>
                        <input type="text" id="new-company-name" placeholder="ชื่อบริษัทใหม่" class="w-full px-3 py-2 border rounded-md mt-2 hidden">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium mb-1">ชื่อ-นามสกุล คนขับ</label>
                            <input type="text" id="driver-name" required class="w-full px-3 py-2 border rounded-md">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">ทะเบียนรถ</label>
                            <div class="flex space-x-2">
                                <input type="text" id="license-plate-prefix" placeholder="กข" class="w-1/3 px-3 py-2 border rounded-md">
                                <input type="text" id="license-plate-suffix" placeholder="1234" class="w-2/3 px-3 py-2 border rounded-md">
                            </div>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">เบอร์โทร</label>
                        <input type="tel" id="phone-number" placeholder="หมายเลขโทรศัพท์" class="w-full px-3 py-2 border rounded-md">
                    </div>
                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            <label class="block text-sm font-medium mb-1">จำนวนบิล</label>
                            <input type="number" id="invoice-count" min="1" required class="w-full px-3 py-2 border rounded-md">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">จำนวนกล่อง</label>
                            <input type="number" id="box-count" min="1" required class="w-full px-3 py-2 border rounded-md">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">จำนวนชิ้น</label>
                            <input type="number" id="item-count" min="1" required class="w-full px-3 py-2 border rounded-md">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">เวลาที่คาดว่าจะมาถึง</label>
                        <input type="hidden" id="eta" required>
                        <div id="eta-display" class="w-full px-3 py-2 border rounded-md cursor-pointer bg-gray-50 text-slate-500">-- เลือกเวลา --</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">เอกสารเพิ่มเติม</label>
                        <textarea id="notes" placeholder="หมายเหตุเพิ่มเติม (ไม่บังคับ)" class="w-full px-3 py-2 border rounded-md" rows="3"></textarea>
                    </div>
                    <div>
                        <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                            <input type="file" id="document-files" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" class="hidden">
                            <label for="document-files" class="cursor-pointer">
                                <div class="text-gray-600 mb-2">📎 แนบเอกสาร (INVOICE และ PO)</div>
                                <p class="text-sm text-gray-500 mb-2">*หากแนบเอกสารมาด้วยจะเพิ่มความรวดเร็วในการรับสินค้าของพนักงาน</p>
                                <div class="bg-blue-50 border border-blue-200 rounded p-4">
                                    <div class="text-blue-600 text-4xl mb-2">📁</div>
                                    <p class="text-blue-800 font-medium">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่</p>
                                    <p class="text-sm text-blue-600 mt-1">รองรับไฟล์ PDF, JPG, PNG, DOC, DOCX (สูงสุด 5MB ต่อไฟล์)</p>
                                </div>
                            </label>
                        </div>
                        <div id="file-list" class="mt-4 space-y-2"></div>
                    </div>
                    <div class="flex justify-end space-x-2">
                        <button type="button" class="close-modal-btn bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">ยกเลิก</button>
                        <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">ยืนยันการจอง</button>
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
                    <div class="flex items-center justify-between bg-gray-50 p-3 rounded border">
                        <div class="flex items-center space-x-3">
                            <div class="text-blue-600">📄</div>
                            <div>
                                <div class="font-medium">${file.name}</div>
                                <div class="text-sm text-gray-500">${formatFileSize(file.size)}</div>
                            </div>
                        </div>
                        <button type="button" onclick="removeFile(${index})" class="text-red-600 hover:text-red-800">🗑️</button>
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
                    referenceNumber: referenceNumber,
                    companyName,
                    driverName: form.querySelector('#driver-name').value,
                    licensePlate,
                    phoneNumber: form.querySelector('#phone-number').value, // เพิ่มเบอร์โทร (ข้อกำหนดที่ 2)
                    invoiceCount: form.querySelector('#invoice-count').value,
                    boxCount: form.querySelector('#box-count').value,
                    itemCount: form.querySelector('#item-count').value,
                    eta,
                    notes: form.querySelector('#notes').value,
                    documents: uploadedFiles,
                    evaluation: null,
                    date: state.selectedDate // Add date field for Firestore
                };

                try {
                    // Add booking to Firestore
                    const docRef = await addDoc(collection(db, "bookings"), newBooking);
                    const bookingId = docRef.id;

                    // Add to guest session
                    state.guestBookingIds.push(bookingId);

                    // Save to localStorage (Layer 1)
                    localStorage.setItem('guestBookingIds', JSON.stringify(state.guestBookingIds));

                    // Save to Firebase (Layer 2)
                    const guestDocRef = doc(db, "guestSessions", state.guestSessionId);
                    await setDoc(guestDocRef, {
                        bookingIds: state.guestBookingIds,
                        lastActivity: serverTimestamp()
                    }, { merge: true });

                    createNotification(
                        'booking',
                        'มีการจองคิวใหม่',
                        `${newBooking.companyName} ได้จองคิวสำหรับวันที่ ${formatThaiDate(state.selectedDate)} เวลา ${formatTime24h(eta)}`,
                        null,
                        bookingId
                    );

                    closeModal(form.closest('.modal-backdrop'));
                    renderModal('qrCode', { booking: { ...newBooking, id: bookingId } });
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
            modalContent = `<div class="p-6 text-center"><h3 class="text-lg font-semibold">ไม่พบข้อมูลการจองคิว</h3></div>`;
            renderModalBase(modalContent);
            return;
        }

        const isGuestBooking = state.guestBookingIds.includes(booking.id);
        const isEditable = state.userRole === 'staff' || (state.userRole === 'guest' && isGuestBooking);

        const documentsHtml = booking.documents && booking.documents.length > 0
            ? `<div class="mt-4">
                <h4 class="font-semibold mb-2">เอกสารที่แนบ:</h4>
                <div class="space-y-2">
                    ${booking.documents.map((doc, index) => `
                        <div class="flex items-center justify-between bg-gray-50 p-3 rounded border">
                            <div class="flex items-center space-x-3">
                                <div class="text-blue-600">📄</div>
                                <div>
                                    <div class="font-medium">${doc.name}</div>
                                    <div class="text-sm text-gray-500">${formatFileSize(doc.size)}</div>
                                </div>
                            </div>
                            <button onclick="downloadDocument('${doc.name}', '${doc.data}')" class="text-blue-600 hover:text-blue-800 text-sm">ดาวน์โหลด</button>
                        </div>
                    `).join('')}
                </div>
            </div>`
            : '';

        let statusBadge = '';
        if (booking.checkInTime) {
            if (booking.status === 'completed') {
                statusBadge = '<span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">เสร็จสิ้น</span>';
            } else if (checkIfLate(booking)) {
                statusBadge = '<span class="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">มาสาย</span>';
            } else {
                statusBadge = '<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">เช็คอินแล้ว</span>';
            }
        } else {
            statusBadge = '<span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">รอเช็คอิน</span>';
        }

        modalContent = `
            <div class="p-6">
                <div class="flex justify-between items-start mb-4">
                    <h3 class="text-lg font-semibold">รายละเอียดการจองคิว</h3>
                    <div class="space-y-2">
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
                        ${booking.phoneNumber ? `
                            <div class="flex justify-between">
                                <span class="text-gray-600">เบอร์โทร:</span>
                                <span class="font-medium">${booking.phoneNumber}</span>
                            </div>
                        ` : ''}
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
                            ${statusBadge}
                        </div>
                        ${booking.checkInTime ? `
                            <div class="flex justify-between">
                                <span class="text-gray-600">เวลาเช็คอิน:</span>
                                <span class="font-medium">${formatDateTime(booking.checkInTime)}</span>
                            </div>
                        ` : ''}
                        ${booking.notes ? `
                            <div class="flex justify-between">
                                <span class="text-gray-600">เอกสารเพิ่มเติม:</span>
                                <span class="font-medium">${booking.notes}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                ${documentsHtml}
                <div class="flex justify-center mt-6">
                    <button class="close-modal-btn bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">ปิด</button>
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
            ? `<div class="text-sm text-gray-600 mt-2">
                เอกสารที่แนบ: <span class="font-medium">${booking.documents.length} ไฟล์</span>
            </div>`
            : '';

        let statusBadge = '';
        if (booking.checkInTime) {
            if (booking.status === 'completed') {
                statusBadge = '<span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">เสร็จสิ้น</span>';
            } else if (checkIfLate(booking)) {
                statusBadge = '<span class="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">มาสาย</span>';
            } else {
                statusBadge = '<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">เช็คอินแล้ว</span>';
            }
        } else {
            statusBadge = '<span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">รอเช็คอิน</span>';
        }

        let checkInSection = '';
        if (state.userRole === 'staff' && !booking.checkInTime) {
            checkInSection = `
                <div class="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 class="font-semibold text-green-800 mb-2">การเช็คอิน</h4>
                    <div class="flex justify-between text-sm text-green-700 mb-3">
                        <span>เวลาปัจจุบัน:</span>
                        <span>${formatDateTime(new Date())}</span>
                    </div>
                    <button class="check-in-from-qr-btn w-full bg-green-500 text-white py-2 rounded hover:bg-green-600" data-booking-id="${booking.id}">
                        ${icons.check} เช็คอิน
                    </button>
                </div>
            `;
        } else if (state.userRole === 'staff' && booking.checkInTime && booking.status !== 'completed') {
            checkInSection = `
                <div class="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 class="font-semibold text-blue-800 mb-2">การรับสินค้า</h4>
                    <div class="flex justify-between text-sm text-blue-700 mb-3">
                        <span>เวลาเช็คอิน:</span>
                        <span>${formatDateTime(booking.checkInTime)}</span>
                    </div>
                    <button class="complete-from-qr-btn w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600" data-booking-id="${booking.id}">
                        ${icons.check} ยืนยันรับคิว
                    </button>
                </div>
            `;
        }

        modalContent = `
            <div class="p-6">
                <div class="bg-white rounded-lg">
                    <div class="border-b pb-4 mb-4">
                        <div class="flex justify-between items-start">
                            <h3 class="text-lg font-semibold">${booking.companyName}</h3>
                            <span class="text-sm text-gray-500">${booking.referenceNumber}</span>
                        </div>
                        <div class="grid grid-cols-2 gap-4 mt-4 text-sm">
                            <div>
                                <span class="text-gray-600">วันที่</span>
                                <div class="font-medium">${formatThaiDate(booking.date)}</div>
                            </div>
                            <div>
                                <span class="text-gray-600">เวลา</span>
                                <div class="font-medium">${formatTime24h(booking.eta)}</div>
                            </div>
                            <div>
                                <span class="text-gray-600">คนขับ</span>
                                <div class="font-medium">${booking.driverName}</div>
                            </div>
                            <div>
                                <span class="text-gray-600">ทะเบียนรถ</span>
                                <div class="font-medium">${booking.licensePlate}</div>
                            </div>
                            ${booking.phoneNumber ? `
                                <div>
                                    <span class="text-gray-600">เบอร์โทร</span>
                                    <div class="font-medium">${booking.phoneNumber}</div>
                                </div>
                            ` : ''}
                            <div>
                                <span class="text-gray-600">จำนวนบิล</span>
                                <div class="font-medium">${booking.invoiceCount}</div>
                            </div>
                            <div>
                                <span class="text-gray-600">จำนวนกล่อง</span>
                                <div class="font-medium">${booking.boxCount}</div>
                            </div>
                            <div>
                                <span class="text-gray-600">จำนวนชิ้น</span>
                                <div class="font-medium">${booking.itemCount}</div>
                            </div>
                            <div>
                                <span class="text-gray-600">สถานะ</span>
                                ${statusBadge}
                            </div>
                            ${documentsInfo}
                        </div>
                        ${booking.notes ? `
                            <div class="mt-4 p-3 bg-gray-50 rounded">
                                <span class="text-gray-600 text-sm">เอกสารเพิ่มเติม</span>
                                <div class="text-sm mt-1">${booking.notes}</div>
                            </div>
                        ` : ''}
                        ${booking.documents && booking.documents.length > 0 ? `
                            <div class="mt-4">
                                <span class="text-gray-600 text-sm">เอกสารที่แนบ</span>
                                <div class="mt-2 space-y-2">
                                    ${booking.documents.map(doc => `
                                        <div class="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                                            <span>${doc.name}</span>
                                            <button onclick="downloadDocument('${doc.name}', '${doc.data}')" class="text-blue-600 hover:text-blue-800">ดาวน์โหลด</button>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        ${checkInSection}
                        <div class="mt-4 p-3 bg-gray-50 rounded text-center">
                            <div class="text-sm text-gray-600 mb-2">
                                ${booking.status === 'completed' ? 'ดำเนินการเสร็จสิ้น' : booking.checkInTime ? 'กำลังดำเนินการ' : 'รอการดำเนินการ'}
                            </div>
                            <div class="flex justify-center space-x-2">
                                ${(state.userRole === 'staff' || state.userRole === 'admin') ? `<button class="evaluate-from-qr-btn bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600" data-booking-id="${booking.id}">ประเมิน KPI</button>` : ''}
                                <button class="close-modal-btn bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600">ปิด</button>
                            </div>
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
        const booking = allBookingsById[state.selectedBookingId];

        let kpiInputs = kpiDefinitions.map(kpi => `
            <div>
                <label class="block text-sm font-medium mb-1">${kpi.label}</label>
                <select class="kpi-select w-full px-3 py-2 border rounded-md" data-kpi-id="${kpi.id}">
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
            <div class="p-6">
                <h3 class="text-lg font-semibold mb-2">ประเมิน KPI</h3>
                <p class="text-gray-600 mb-4">${booking?.companyName}</p>
                <form id="evaluation-form" class="space-y-4">
                    ${kpiInputs}
                    <div>
                        <label class="block text-sm font-medium mb-1">ความคิดเห็นเพิ่มเติม</label>
                        <textarea id="staff-comments" class="w-full px-3 py-2 border rounded-md" rows="3"></textarea>
                    </div>
                    <div>
                        <button type="button" id="generate-summary-btn" class="w-full bg-purple-500 text-white py-2 rounded hover:bg-purple-600 mb-2">✨ สร้างสรุปผลด้วย AI</button>
                        <div id="gemini-loading" class="text-center text-gray-500 hidden">กำลังสร้างสรุป...</div>
                        <textarea id="gemini-summary" class="w-full px-3 py-2 border rounded-md" rows="4" placeholder="สรุปผลการประเมินจะแสดงที่นี่"></textarea>
                    </div>
                    <div class="flex justify-end space-x-2">
                        <button type="button" class="close-modal-btn bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">ยกเลิก</button>
                        <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">บันทึกผล</button>
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
            // Update in Firestore
            const bookingRef = doc(db, "bookings", booking.id);
            updateDoc(bookingRef, { referenceNumber: referenceNumber });
        }

        const qrData = JSON.stringify({
            id: booking.id,
            referenceNumber: referenceNumber,
            company: booking.companyName,
            date: state.selectedDate,
            time: booking.eta,
            driverName: booking.driverName,
            licensePlate: booking.licensePlate,
            phoneNumber: booking.phoneNumber || '', // เพิ่มเบอร์โทรใน QR Code (ข้อกำหนดที่ 2)
            invoiceCount: booking.invoiceCount,
            boxCount: booking.boxCount,
            itemCount: booking.itemCount,
            notes: booking.notes || ''
        });

        modalContent = `
            <div class="p-6 text-center">
                <div class="text-green-600 text-6xl mb-4">✅</div>
                <h3 class="text-lg font-semibold text-green-800 mb-2">การจองคิวสำเร็จ!</h3>
                <p class="text-gray-600 mb-4">กรุณาแสดง QR Code นี้แก่เจ้าหน้าที่เมื่อมาถึง</p>
                <div class="bg-gray-50 p-4 rounded-lg mb-4">
                    <div class="text-sm text-gray-600 space-y-1">
                        <p><strong>เลขกำกับ:</strong> ${referenceNumber}</p>
                        <p><strong>บริษัท:</strong> ${booking.companyName}</p>
                        <p><strong>วันที่:</strong> ${formatThaiDate(state.selectedDate)}</p>
                        <p><strong>เวลา:</strong> ${formatTime24h(booking.eta)}</p>
                        ${booking.phoneNumber ? `<p><strong>เบอร์โทร:</strong> ${booking.phoneNumber}</p>` : ''}
                    </div>
                </div>
                <div id="qrcode-container" class="flex justify-center mb-4"></div>
                <div class="bg-red-50 border border-red-200 rounded p-3 mb-4">
                    <p class="text-sm text-red-800"><strong>สำคัญ:</strong> กรุณาบันทึกภาพ QR Code นี้ไว้ในอัลบั้ม</p>
                </div>
                <div class="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                    <div class="text-sm text-yellow-800 space-y-1">
                        <p><strong>หมายเหตุ:</strong> กรุณามาตามเวลาที่กำหนด</p>
                        <p>หากมาช้าต้องไปต่อคิวตามปกติ</p>
                    </div>
                </div>
                <div class="flex justify-center space-x-2">
                    <button id="download-qr-btn" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">ดาวน์โหลด QR Code</button>
                    <button id="qr-close-btn" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">ยืนยัน</button>
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
            <div class="p-6">
                <h3 class="text-lg font-semibold mb-4">ป้อนเลขกำกับ</h3>
                <form id="manual-reference-form" class="space-y-4">
                    <input type="text" id="manual-reference-input" placeholder="เลขกำกับ" required class="w-full px-3 py-2 border rounded-md">
                    <div class="flex justify-end space-x-2">
                        <button type="button" class="close-modal-btn bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">ยกเลิก</button>
                        <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">ค้นหา</button>
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
    return allBookingsById[bookingId] || null;
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
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

    const payload = {
        contents: [{
            parts: [{ text: prompt }]
        }]
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
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
    const booking = allBookingsById[state.selectedBookingId];

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

        - ชื่อซัพพลายเออร์: ${booking?.companyName}
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

// แก้ไขฟังก์ชัน handleLogin ให้ใช้ Firebase Authentication และย้าย Listeners (ข้อกำหนดที่ 3)
const handleLogin = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    try {
        // ล็อกอินด้วย Firebase Authentication
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // ดึงข้อมูลผู้ใช้จาก Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            
            // ตรวจสอบ Role
            if (userData.role === 'staff' || userData.role === 'admin') {
                // อัปเดต lastLogin
                await updateDoc(userDocRef, {
                    lastLogin: new Date().toISOString()
                });

                // ตั้งค่า state
                state.isLoggedIn = true;
                state.userRole = userData.role;
                state.currentUser = { id: user.uid, ...userData };
                state.currentView = 'dashboard';

                // ย้าย Listeners มาที่นี่ (ข้อกำหนดที่ 3)
                usersListener = onSnapshot(collection(db, "users"), (usersSnapshot) => {
                    state.data.users = [];
                    usersSnapshot.forEach((doc) => {
                        state.data.users.push({ id: doc.id, ...doc.data() });
                    });
                    render();
                });

                notificationsListener = onSnapshot(collection(db, "notifications"), (notificationsSnapshot) => {
                    state.data.notifications = [];
                    notificationsSnapshot.forEach((doc) => {
                        state.data.notifications.push({ id: doc.id, ...doc.data() });
                    });
                    updateUnreadNotifications();
                    render();
                });

                closeModal();
                render();
            } else {
                // Role ไม่ใช่ Staff/Admin
                showAlert('คุณไม่มีสิทธิ์เข้าใช้งานส่วนนี้');
                await signOut(auth);
            }
        } else {
            // ไม่พบเอกสารใน Firestore
            showAlert('ไม่พบข้อมูลผู้ใช้ในระบบ หรือยังไม่ได้กำหนดสิทธิ์');
            await signOut(auth);
        }
    } catch (error) {
        console.error('Login error:', error);
        
        // จัดการ Error ตาม error.code
        let errorMessage = 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
        
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                errorMessage = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
                break;
            case 'auth/invalid-email':
                errorMessage = 'รูปแบบอีเมลไม่ถูกต้อง';
                break;
            case 'auth/user-disabled':
                errorMessage = 'บัญชีผู้ใช้ถูกปิดใช้งาน';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'มีการพยายามเข้าสู่ระบบมากเกินไป กรุณาลองใหม่ภายหลัง';
                break;
            default:
                errorMessage = 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่';
        }
        
        showAlert(errorMessage);
    }
};

// แก้ไขฟังก์ชัน handleLogout ให้ลบ Listeners (ข้อกำหนดที่ 3)
const handleLogout = async () => {
    try {
        // ลบ Listeners ตอน Logout (ข้อกำหนดที่ 3)
        if (usersListener) {
            usersListener(); // Detach the listener
            usersListener = null;
        }
        if (notificationsListener) {
            notificationsListener(); // Detach the listener
            notificationsListener = null;
        }

        // ออกจาก Firebase Authentication
        await signOut(auth);
        
        // ตั้งค่า state
        state.isLoggedIn = false;
        state.userRole = 'guest';
        state.currentUser = null;
        state.currentView = 'calendar';
        
        render();
    } catch (error) {
        console.error('Logout error:', error);
        showAlert('เกิดข้อผิดพลาดในการออกจากระบบ');
    }
};

const handleEvaluationSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const bookingId = state.selectedBookingId;

    const evaluation = {
        scores: {},
        staffComments: form.querySelector('#staff-comments').value,
        geminiSummary: form.querySelector('#gemini-summary').value
    };

    form.querySelectorAll('.kpi-select').forEach(sel => {
        evaluation.scores[sel.dataset.kpiId] = parseInt(sel.value, 10);
    });

    try {
        const bookingRef = doc(db, "bookings", bookingId);
        await updateDoc(bookingRef, {
            evaluation: evaluation
        });

        closeModal(form.closest('.modal-backdrop'));
        showSuccessAnimation("บันทึกผลสำเร็จ!");
    } catch (error) {
        console.error('Error saving evaluation:', error);
        showAlert('เกิดข้อผิดพลาดในการบันทึกผลการประเมิน กรุณาลองใหม่');
    }
};

const handleDeleteBooking = async (bookingId) => {
    try {
        await deleteDoc(doc(db, "bookings", bookingId));
        showAlert('ลบคิวสำเร็จแล้ว');
        render();
    } catch (error) {
        console.error('Error deleting booking:', error);
        showAlert('เกิดข้อผิดพลาดในการลบคิว กรุณาลองใหม่');
    }
};

const renderHolidayDetailsModal = (holiday, date) => {
    const modalContent = `
        <div class="p-6 text-center">
            <div class="text-red-600 text-6xl mb-4">🚫</div>
            <h3 class="text-lg font-semibold text-red-800 mb-2">วันหยุด</h3>
            <p class="text-red-600 mb-2">${holiday.name}</p>
            <p class="text-gray-600 mb-2">${formatThaiDate(date)}</p>
            <p class="text-sm text-gray-500 mb-4">ประเภท: ${
                holiday.type === 'company' ? 'วันหยุดบริษัท' :
                holiday.type === 'public' ? 'วันหยุดราชการ' :
                'วันหยุดพิเศษ'
            }</p>
            ${holiday.description ? `<p class="text-sm text-gray-600 mb-4">${holiday.description}</p>` : ''}
            <div class="flex justify-center">
                <button class="close-modal-btn bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">ปิด</button>
            </div>
        </div>
    `;

    renderModalBase(modalContent);
};

// แก้ไขฟังก์ชัน renderCompanyKpiDetails เพื่อเพิ่มรายละเอียด KPI (ข้อกำหนดที่ 2)
const renderCompanyKpiDetails = (companyName) => {
    const kpiData = getKpiData();
    const company = kpiData.find(c => c.name === companyName);

    if (!company) {
        showAlert('ไม่พบข้อมูลบริษัท');
        return;
    }

    const bookingHistoryHtml = company.bookings.map(booking => {
        let kpiDetailsHtml = '';
        
        // เพิ่มรายละเอียด KPI (ข้อกำหนดที่ 2)
        if (booking.evaluation && booking.evaluation.scores) {
            kpiDetailsHtml = `
                <div class="mt-2 p-2 bg-gray-50 rounded text-xs">
                    <div class="font-medium mb-1">รายละเอียด KPI:</div>
                    ${kpiDefinitions.map(kpi => {
                        const score = booking.evaluation.scores[kpi.id];
                        return score > 0 ? `<div>${kpi.label}: ${score}/5</div>` : '';
                    }).join('')}
                    ${booking.evaluation.staffComments ? `<div class="mt-1"><strong>หมายเหตุ:</strong> ${booking.evaluation.staffComments}</div>` : ''}
                </div>
            `;
        }

        return `
            <div class="bg-white p-4 rounded-lg border">
                <div class="flex justify-between items-start mb-2">
                    <div class="text-sm font-medium">${formatThaiDate(booking.date)} ${formatTime24h(booking.eta)}</div>
                    <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">คะแนน: ${booking.score.toFixed(2)}</span>
                </div>
                <div class="text-sm text-gray-600">
                    คนขับ: ${booking.driverName} | ทะเบียน: ${booking.licensePlate}
                </div>
                ${kpiDetailsHtml}
            </div>
        `;
    }).join('');

    const modalContent = `
        <div class="p-6">
            <h3 class="text-lg font-semibold mb-4">ประวัติการจัดส่ง - ${companyName}</h3>
            <div class="bg-blue-50 p-4 rounded-lg mb-4">
                <div class="text-center">
                    <div class="text-2xl font-bold text-blue-600">คะแนนเฉลี่ย: ${company.averageScore.toFixed(2)}</div>
                    <div class="text-sm text-blue-700">จากการจัดส่งทั้งหมด ${company.bookings.length} ครั้ง</div>
                </div>
            </div>
            <div class="space-y-3 max-h-96 overflow-y-auto">
                ${bookingHistoryHtml}
            </div>
            <div class="flex justify-center mt-6">
                <button class="close-modal-btn bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">ปิด</button>
            </div>
        </div>
    `;

    renderModalBase(modalContent);
};

// REFACTORED INITIALIZATION FUNCTION (ลบ Listeners ออกจาก init - ข้อกำหนดที่ 3)
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

        // 2. Setup config collection listener
        const configRef = doc(db, "config", "main");
        onSnapshot(configRef, async (configSnap) => {
            if (configSnap.exists()) {
                const configData = configSnap.data();
                state.data.companies = configData.companies || [];
            } else {
                // First run setup - create config document with initial companies
                const initialConfigData = {
                    companies: initialCompanies
                };
                await setDoc(configRef, initialConfigData);
                state.data.companies = initialCompanies;
            }
        });

        // 3. Setup holidays collection listener
        onSnapshot(collection(db, "holidays"), (holidaysSnapshot) => {
            state.data.holidays = [];
            holidaysSnapshot.forEach((doc) => {
                state.data.holidays.push({ id: doc.id, ...doc.data() });
            });
            state.data.holidays.sort((a, b) => new Date(a.date) - new Date(b.date));
            render();
        });

        // หมายเหตุ: ลบ users และ notifications listeners ออกจาก init() แล้ว (ข้อกำหนดที่ 3)
        // จะถูกเรียกใน handleLogin แทน

        // 4. Setup bookings collection listener (most complex)
        onSnapshot(collection(db, "bookings"), (bookingsSnapshot) => {
            // Clear existing data
            state.data.bookings = {};
            allBookingsById = {};

            // Process each booking document
            bookingsSnapshot.forEach((doc) => {
                const booking = { id: doc.id, ...doc.data() };
                const date = booking.date;

                // Add to allBookingsById for quick lookup
                allBookingsById[doc.id] = booking;

                // Group by date for calendar display
                if (!state.data.bookings[date]) {
                    state.data.bookings[date] = [];
                }
                state.data.bookings[date].push(booking);
            });

            // Sort bookings by time within each date
            Object.keys(state.data.bookings).forEach(date => {
                state.data.bookings[date].sort((a, b) => a.eta.localeCompare(b.eta));
            });

            render();
        });

        // 5. Fetch guest's booking history from Firebase using the session ID
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

        setupAutomaticNotifications();
        requestNotificationPermission();

        state.userRole = 'guest';
        state.isLoggedIn = false;
        state.currentView = 'calendar';
        render();
    } catch (error) {
        console.error('Error initializing app:', error);
        showAlert('เกิดข้อผิดพลาดในการเริ่มต้นระบบ กรุณารีเฟรชหน้าเว็บ');
    }
};

init();
