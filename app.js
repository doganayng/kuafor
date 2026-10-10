
const CONFIG = {
  PHONE: "905521640028",
  PHONE_DISPLAY: "0552 164 00 28",
  ADMIN_PIN: "0000",
  OPEN_HOUR: 9,
  CLOSE_HOUR: 21,
  SERVICES: [
    { id: "sac-sakal-yikama", name: "Saç Sakal Yıkama", type: "standard" },
    { id: "sac-sakal", name: "Saç Sakal", type: "standard" },
    { id: "sac", name: "Saç Kesimi", type: "standard" },
    { id: "sakal", name: "Sakal Kesimi", type: "standard" },
    { id: "cocuk", name: "Çocuk Tıraşı", type: "standard" },
    { id: "cilt", name: "Maske & Cilt Bakımı", type: "standard" },
    { id: "fon", name: "Fön Çekimi", type: "standard" },

    { id: "boyama", name: "Saç Sakal Boyama", type: "special" },
    { id: "perma", name: "Perma", type: "special" },
    { id: "damat", name: "Damat Tıraşı", type: "special" }
  ]
};

function localDateStr(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

const Store = {
  KEY: "berber_randevulari_v1",
  getAll() {
    try {
      const d = localStorage.getItem(this.KEY);
      return d ? JSON.parse(d) : {};
    } catch (e) {
      console.error("LocalStorage okuma hatası:", e);
      return {};
    }
  },
  save(data) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(data));
    } catch (e) {
      console.error("LocalStorage kaydetme hatası:", e);
    }
  },
  getDateSlots(dateStr) {
    return this.getAll()[dateStr] || {};
  },
  book(dateStr, timeStr, record) {
    const all = this.getAll();
    if (!all[dateStr]) all[dateStr] = {};
    if (all[dateStr][timeStr]) return false;
    all[dateStr][timeStr] = record;
    this.save(all);
    return true;
  },
  cancel(dateStr, timeStr) {
    const all = this.getAll();
    if (all[dateStr] && all[dateStr][timeStr]) {
      delete all[dateStr][timeStr];
      this.save(all);
      return true;
    }
    return false;
  },
  toggleManual(dateStr, timeStr) {
    const all = this.getAll();
    if (!all[dateStr]) all[dateStr] = {};
    if (all[dateStr][timeStr]) {
      delete all[dateStr][timeStr];
    } else {
      all[dateStr][timeStr] = { name: "Manuel Dolu (F.K. Kuaför)", phone: "-", service: "Telefon / Manuel" };
    }
    this.save(all);
  }
};

let selectedService = CONFIG.SERVICES[0];
let selectedSlot = null;
let isAdminAuthenticated = false;

function generateTimeSlots() {
  const slots = [];
  for (let h = CONFIG.OPEN_HOUR; h < CONFIG.CLOSE_HOUR; h++) {
    const hourStr = h.toString().padStart(2, '0');
    slots.push(`${hourStr}:00`);
    slots.push(`${hourStr}:30`);
  }
  return slots;
}

window.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.body.setAttribute('data-theme', 'light');
    document.getElementById('themeToggle').innerText = "☀️ Açık";
  }

  const today = localDateStr();
  document.getElementById('appointmentDate').value = today;
  document.getElementById('appointmentDate').min = today;
  document.getElementById('adminDate').value = today;

  renderServices();
  onDateChange();
});

function renderServices() {
  const container = document.getElementById('servicesGrid');
  container.innerHTML = '';
  CONFIG.SERVICES.forEach(s => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `service-card ${s.id === selectedService.id ? 'active' : ''}`;
    card.onclick = () => selectService(s);
    card.innerHTML = `
      <div class="title">${escapeHtml(s.name)}</div>
      <span class="badge">${s.type === 'special' ? 'Özel İşlem' : '30 Dk'}</span>
    `;
    container.appendChild(card);
  });
}

function selectService(service) {
  selectedService = service;
  selectedSlot = null;
  renderServices();

  const specialNotice = document.getElementById('specialNotice');
  const standardForm = document.getElementById('standardForm');
  const customerCard = document.getElementById('customerDetailsCard');

  document.getElementById('successCard').classList.add('hidden');

  if (service.type === 'special') {
    specialNotice.classList.remove('hidden');
    standardForm.classList.add('hidden');
  } else {
    specialNotice.classList.add('hidden');
    standardForm.classList.remove('hidden');
    customerCard.classList.add('hidden');
    renderSlots();
  }
}

function onDateChange() {
  selectedSlot = null;
  document.getElementById('customerDetailsCard').classList.add('hidden');
  document.getElementById('successCard').classList.add('hidden');
  renderSlots();
}

function renderSlots() {
  const dateStr = document.getElementById('appointmentDate').value;
  const slotsGrid = document.getElementById('slotsGrid');
  const sundayAlert = document.getElementById('sundayAlert');
  const slotsContainer = document.getElementById('slotsContainer');

  if (!dateStr) return;

  const dateObj = new Date(dateStr + 'T00:00:00');
  if (dateObj.getDay() === 0) {
    sundayAlert.style.display = 'block';
    slotsContainer.classList.add('hidden');
    return;
  } else {
    sundayAlert.style.display = 'none';
    slotsContainer.classList.remove('hidden');
  }

  const bookedSlots = Store.getDateSlots(dateStr);
  const allSlots = generateTimeSlots();
  const now = new Date();
  const isToday = dateStr === localDateStr(now);

  slotsGrid.innerHTML = '';

  allSlots.forEach(time => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'slot-btn';
    btn.innerText = time;

    const isBooked = !!bookedSlots[time];
    let isPast = false;
    if (isToday) {
      const [h, m] = time.split(':').map(Number);
      const slotTime = new Date();
      slotTime.setHours(h, m, 0, 0);
      if (slotTime < now) isPast = true;
    }

    if (isBooked || isPast) {
      btn.disabled = true;
      btn.classList.add('disabled');
    } else {
      if (selectedSlot === time) btn.classList.add('selected');
      btn.onclick = () => {
        selectedSlot = time;
        document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        document.getElementById('customerDetailsCard').classList.remove('hidden');
        document.getElementById('successCard').classList.add('hidden');
      };
    }

    slotsGrid.appendChild(btn);
  });
}

function handleBooking(e) {
  e.preventDefault();
  const dateStr = document.getElementById('appointmentDate').value;
  const name = document.getElementById('custName').value.trim();
  const rawPhone = document.getElementById('custPhone').value.trim();

  // Telefon Doğrulaması (Türkiye 05XX Formatı)
  const phoneRegex = /^0?5\d{9}$/;
  if (!phoneRegex.test(rawPhone.replace(/\s+/g, ''))) {
    alert("Lütfen geçerli bir cep telefonu numarası giriniz (Örn: 05521640028).");
    return;
  }

  if (!selectedSlot) {
    alert("Lütfen bir saat dilimi seçiniz.");
    return;
  }

  const record = {
    name: name,
    phone: rawPhone,
    service: selectedService.name,
    created: new Date().toISOString()
  };

  const success = Store.book(dateStr, selectedSlot, record);

  if (success) {
    document.getElementById('customerDetailsCard').classList.add('hidden');
    const successCard = document.getElementById('successCard');
    const successDetails = document.getElementById('successDetails');
    const whatsappBtn = document.getElementById('whatsappBtn');

    successDetails.innerHTML = `<strong>Müşteri:</strong> ${escapeHtml(name)}<br><strong>Tarih & Saat:</strong> ${dateStr} - ${selectedSlot}<br><strong>Hizmet:</strong> ${escapeHtml(selectedService.name)}`;

    const waText = `Merhaba F.K. Kuaför, ${dateStr} tarihi saat ${selectedSlot} için ${selectedService.name} randevusu aldım. Adım: ${name}, Tel: ${rawPhone}`;
    whatsappBtn.href = `https://wa.me/${CONFIG.PHONE}?text=${encodeURIComponent(waText)}`;

    successCard.classList.remove('hidden');

    document.getElementById('custName').value = '';
    document.getElementById('custPhone').value = '';
    selectedSlot = null;

    renderSlots();
    if (isAdminAuthenticated) renderAdminSlots();
  } else {
    alert("Üzgünüz! Seçtiğiniz saat az önce doldu. Lütfen başka bir saat seçiniz.");
    renderSlots();
  }
}

function handleQueryAppointment(e) {
  e.preventDefault();
  const inputPhone = document.getElementById('queryPhoneInput').value.trim();
  const resultsCard = document.getElementById('queryResultsCard');
  const resultsList = document.getElementById('queryResultsList');

  const norm = p => (p || '').replace(/\D/g, '').slice(-10);
  const searchNorm = norm(inputPhone);

  if (searchNorm.length !== 10) {
    alert("Lütfen geçerli bir telefon numarası giriniz.");
    return;
  }

  const allData = Store.getAll();
  const foundAppointments = [];

  Object.keys(allData).forEach(dateStr => {
    Object.keys(allData[dateStr]).forEach(timeStr => {
      const item = allData[dateStr][timeStr];
      if (norm(item.phone) === searchNorm) {
        foundAppointments.push({ date: dateStr, time: timeStr, ...item });
      }
    });
  });

  resultsList.innerHTML = '';

  if (foundAppointments.length === 0) {
    resultsList.innerHTML = `<p style="color:var(--text-muted); text-align:center;">Bu telefon numarasına ait aktif randevu bulunamadı.</p>`;
  } else {
    foundAppointments.forEach(app => {
      const item = document.createElement('div');
      item.className = 'admin-item';
      item.innerHTML = `
        <div>
          <strong>${app.date} - ${app.time}</strong><br>
          <span style="font-size:0.85rem; color:var(--text-muted);">${escapeHtml(app.service)} (${escapeHtml(app.name)})</span>
        </div>
        <button type="button" class="btn-danger" onclick="cancelCustomerAppointment('${app.date}', '${app.time}')">
          İptal Et
        </button>
      `;
      resultsList.appendChild(item);
    });
  }

  resultsCard.classList.remove('hidden');
}

function cancelCustomerAppointment(dateStr, timeStr) {
  if (confirm(`${dateStr} - ${timeStr} randevunuzu iptal etmek istediğinize emin misiniz?`)) {
    Store.cancel(dateStr, timeStr);
    alert("Randevunuz başarıyla iptal edildi.");
    handleQueryAppointment(new Event('submit'));
    renderSlots();
    if (isAdminAuthenticated) renderAdminSlots();
  }
}

function verifyAdminPin(e) {
  e.preventDefault();
  const input = document.getElementById('adminPinInput').value;
  const pinError = document.getElementById('pinError');

  if (input === CONFIG.ADMIN_PIN) {
    isAdminAuthenticated = true;
    pinError.classList.add('hidden');
    document.getElementById('adminAuthCard').classList.add('hidden');
    document.getElementById('adminContentCard').classList.remove('hidden');
    document.getElementById('adminPinInput').value = '';
    renderAdminSlots();
  } else {
    pinError.classList.remove('hidden');
    document.getElementById('adminPinInput').value = '';
  }
}

function logoutAdmin() {
  isAdminAuthenticated = false;
  document.getElementById('adminAuthCard').classList.remove('hidden');
  document.getElementById('adminContentCard').classList.add('hidden');
}

function renderAdminSlots() {
  const dateStr = document.getElementById('adminDate').value;
  const container = document.getElementById('adminSlotsList');
  if (!dateStr) return;

  const dateObj = new Date(dateStr + 'T00:00:00');
  if (dateObj.getDay() === 0) {
    container.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding: 20px;">Pazar günleri dükkan kapalıdır.</p>`;
    calculateAdminStats();
    return;
  }

  const bookedSlots = Store.getDateSlots(dateStr);
  const allSlots = generateTimeSlots();

  container.innerHTML = '';

  allSlots.forEach(time => {
    const item = document.createElement('div');
    item.className = 'admin-item';

    const isBooked = !!bookedSlots[time];
    const record = bookedSlots[time];

    let detailsText = isBooked 
      ? `<strong>${escapeHtml(record.name)}</strong> (${escapeHtml(record.service)}) - 📞 ${escapeHtml(record.phone)}`
      : `<span style="color:var(--text-muted)">Boş</span>`;

    item.innerHTML = `
      <div>
        <span style="font-weight:700; margin-right:12px;">${time}</span>
        <span>${detailsText}</span>
      </div>
      <div class="admin-actions">
        <button type="button" class="${isBooked ? 'btn-danger' : 'btn-success'}" onclick="toggleAdminSlot('${dateStr}', '${time}')">
          ${isBooked ? 'Boşa Çıkar' : 'Manuel Dolu Yap'}
        </button>
      </div>
    `;
    container.appendChild(item);
  });

  calculateAdminStats();
}

function toggleAdminSlot(dateStr, timeStr) {
  const rec = Store.getDateSlots(dateStr)[timeStr];
  if (rec && rec.service !== 'Telefon / Manuel') {
    if (!confirm(`${rec.name} isimli müşterinin randevusunu iptal etmek istediğinize emin misiniz?`)) {
      return;
    }
  }
  Store.toggleManual(dateStr, timeStr);
  renderSlots();
  renderAdminSlots();
}

function calculateAdminStats() {
  const todayStr = localDateStr();
  const todaySlots = Store.getDateSlots(todayStr);
  const bookedCount = Object.keys(todaySlots).length;
  const totalSlots = generateTimeSlots().length;

  document.getElementById('statTodayBooked').innerText = `${bookedCount} / ${totalSlots}`;
  
  const fillRate = Math.round((bookedCount / totalSlots) * 100);
  document.getElementById('statTodayRate').innerText = `%${fillRate}`;

  const allData = Store.getAll();
  const serviceCounts = {};

  Object.keys(allData).forEach(d => {
    Object.keys(allData[d]).forEach(t => {
      const sName = allData[d][t].service;
      if (sName && sName !== 'Telefon / Manuel') {
        serviceCounts[sName] = (serviceCounts[sName] || 0) + 1;
      }
    });
  });

  let topService = "-";
  let maxCount = 0;
  Object.keys(serviceCounts).forEach(s => {
    if (serviceCounts[s] > maxCount) {
      maxCount = serviceCounts[s];
      topService = s;
    }
  });

  document.getElementById('statTopService').innerText = topService;
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('clientTab').classList.add('hidden');
  document.getElementById('queryTab').classList.add('hidden');
  document.getElementById('adminTab').classList.add('hidden');

  if (tab === 'client') {
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
    document.getElementById('clientTab').classList.remove('hidden');
  } else if (tab === 'query') {
    document.querySelectorAll('.tab-btn')[1].classList.add('active');
    document.getElementById('queryTab').classList.remove('hidden');
  } else {
    document.querySelectorAll('.tab-btn')[2].classList.add('active');
    document.getElementById('adminTab').classList.remove('hidden');

    if (isAdminAuthenticated) {
      document.getElementById('adminAuthCard').classList.add('hidden');
      document.getElementById('adminContentCard').classList.remove('hidden');
      renderAdminSlots();
    } else {
      document.getElementById('adminAuthCard').classList.remove('hidden');
      document.getElementById('adminContentCard').classList.add('hidden');
    }
  }
}

function toggleTheme() {
  const current = document.body.getAttribute('data-theme');
  const themeBtn = document.getElementById('themeToggle');
  if (current === 'light') {
    document.body.removeAttribute('data-theme');
    themeBtn.innerText = "🌙 Koyu";
    localStorage.setItem('theme', 'dark');
  } else {
    document.body.setAttribute('data-theme', 'light');
    themeBtn.innerText = "☀️ Açık";
    localStorage.setItem('theme', 'light');
  }
}