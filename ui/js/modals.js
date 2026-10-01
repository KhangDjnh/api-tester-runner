/**
 * Modal Dialogs Management (Globals, Auth Login, cURL Import, Failed Cases Inspector)
 */

/* ==========================================
   1. QUẢN LÝ BIẾN TOÀN CỤC (GLOBALS MODAL)
   ========================================== */
function openGlobalsModal() {
  renderGlobalsTable();
  const modal = document.getElementById('globalsModal');
  if (modal) modal.classList.add('active');
}

function closeGlobalsModal() {
  const modal = document.getElementById('globalsModal');
  if (modal) modal.classList.remove('active');
}

function renderGlobalsTable() {
  const tbody = document.querySelector('#globalsTable tbody');
  if (!tbody) return;
  tbody.innerHTML = "";
  for (const [k, v] of Object.entries(globalVariables)) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input class="kv-input g-key" value="${escapeHtml(k)}" /></td>
      <td><input class="kv-input g-val" value="${escapeHtml(v)}" /></td>
      <td><button class="btn-del" onclick="this.closest('tr').remove()">×</button></td>
    `;
    tbody.appendChild(tr);
  }
}

function addGlobalRow() {
  const tbody = document.querySelector('#globalsTable tbody');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="kv-input g-key" placeholder="Tên biến (VD: token)" /></td>
    <td><input class="kv-input g-val" placeholder="Giá trị" /></td>
    <td><button class="btn-del" onclick="this.closest('tr').remove()">×</button></td>
  `;
  tbody.appendChild(tr);
}

function saveGlobalsFromTable() {
  const newGlobals = {};
  document.querySelectorAll('#globalsTable tbody tr').forEach(tr => {
    const k = tr.querySelector('.g-key')?.value.trim();
    const v = tr.querySelector('.g-val')?.value || '';
    if (k) newGlobals[k] = v;
  });
  globalVariables = newGlobals;
  saveGlobals();
  closeGlobalsModal();
  showToast("💾 Đã lưu danh sách Biến Toàn Cục!");
}

/* ==========================================
   2. GET AUTHENTICATION (LOGIN CMS MODAL)
   ========================================== */
function openLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) modal.classList.add('active');
}

function closeLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) modal.classList.remove('active');
}

async function executeLogin() {
  const loginUrl = document.getElementById('loginApiUrl')?.value.trim() || '';
  const username = document.getElementById('loginUsername')?.value.trim() || '';
  const password = document.getElementById('loginPassword')?.value.trim() || '';
  const cookie = document.getElementById('loginCookie')?.value.trim() || '';
  const autoAttach = document.getElementById('autoAttachHeaders')?.checked || false;

  const btn = document.getElementById('btnLoginExec');
  const btnIcon = document.getElementById('loginBtnIcon');
  const btnText = document.getElementById('loginBtnText');

  if (btn) btn.disabled = true;
  if (btnIcon) btnIcon.innerHTML = `<span class="spinner"></span>`;
  if (btnText) btnText.innerText = "Đang đăng nhập...";

  try {
    const response = await fetch('/api/auth-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loginUrl,
        username,
        password,
        cookie
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || (data.response && JSON.stringify(data.response)) || "Đăng nhập thất bại");
    }

    if (data.csrf_token) {
      setGlobal("csrf_token", data.csrf_token);
    }
    if (data.cookie) {
      setGlobal("cookie", data.cookie);
    }

    if (autoAttach) {
      ensureHeader("x-csrf-token", "{{csrf_token}}");
      ensureHeader("Cookie", "{{cookie}}");
    }

    closeLoginModal();
    showToast("🎉 Đăng nhập thành công! Đã cập nhật csrf_token và Cookie vào Biến Toàn Cục.");

  } catch (err) {
    alert("Lỗi đăng nhập: " + err.message);
  } finally {
    if (btn) btn.disabled = false;
    if (btnIcon) btnIcon.innerHTML = "🚀";
    if (btnText) btnText.innerText = "Đăng Nhập & Lấy Token";
  }
}

function ensureHeader(keyName, valPattern) {
  let found = false;
  document.querySelectorAll('#headerTable tbody tr').forEach(tr => {
    const k = tr.querySelector('.key-input')?.value.trim() || '';
    if (k.toLowerCase() === keyName.toLowerCase()) {
      const valInput = tr.querySelector('.val-input');
      const chk = tr.querySelector('input[type="checkbox"]');
      if (valInput) valInput.value = valPattern;
      if (chk) chk.checked = true;
      found = true;
    }
  });
  if (!found) {
    const tbody = document.querySelector('#headerTable tbody');
    if (!tbody) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align:center;"><input type="checkbox" checked /></td>
      <td><input class="kv-input key-input" value="${escapeHtml(keyName)}" oninput="updateHeaderCount()" /></td>
      <td><input class="kv-input val-input" value="${escapeHtml(valPattern)}" /></td>
      <td><button class="btn-del" onclick="deleteRow(this, 'header')">×</button></td>
    `;
    tbody.appendChild(tr);
    updateHeaderCount();
  }
}

/* ==========================================
   3. MODAL IMPORT LỆNH cURL
   ========================================== */
function openCurlModal() {
  const modal = document.getElementById('curlModal');
  if (modal) modal.classList.add('active');
  const input = document.getElementById('curlInput');
  if (input) input.focus();
}

function closeCurlModal() {
  const modal = document.getElementById('curlModal');
  if (modal) modal.classList.remove('active');
}

function handleImportCurl() {
  const curlInput = document.getElementById('curlInput');
  if (!curlInput) return;
  const curlText = curlInput.value;

  try {
    const parsed = parseCurlCommand(curlText);
    if (!parsed.url) {
      alert("Không tìm thấy URL hợp lệ trong lệnh cURL!");
      return;
    }

    const methodEl = document.getElementById('httpMethod');
    const urlEl = document.getElementById('apiUrl');
    if (methodEl) methodEl.value = parsed.method || 'POST';
    if (urlEl) urlEl.value = parsed.url;

    // Tự động phân tích và đồng bộ query params vào bảng Param
    syncUrlToParams();

    // Headers
    const headerTbody = document.querySelector('#headerTable tbody');
    if (headerTbody) {
      headerTbody.innerHTML = "";
      let hCount = 0;

      parsed.headers.forEach(hStr => {
        const colonIdx = hStr.indexOf(':');
        if (colonIdx > -1) {
          const key = hStr.substring(0, colonIdx).trim();
          const val = hStr.substring(colonIdx + 1).trim();

          if (key.toLowerCase() === 'authorization' && val.toLowerCase().startsWith('bearer ')) {
            const authTypeEl = document.getElementById('authType');
            const authTokenEl = document.getElementById('authToken');
            if (authTypeEl) authTypeEl.value = 'bearer';
            if (authTokenEl) authTokenEl.value = val.substring(7).trim();
            onAuthTypeChange();
          }

          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td style="text-align:center;"><input type="checkbox" checked /></td>
            <td><input class="kv-input key-input" value="${escapeHtml(key)}" oninput="updateCounts()" /></td>
            <td><input class="kv-input val-input" value="${escapeHtml(val)}" /></td>
            <td><button class="btn-del" onclick="deleteRow(this, 'header')">×</button></td>
          `;
          headerTbody.appendChild(tr);
          hCount++;
        }
      });

      if (hCount === 0) addRow('headerTable', 'header');
    }

    // Body
    const bodyPayloads = document.getElementById('bodyPayloads');
    if (bodyPayloads && parsed.data) {
      try {
        let dataObj = JSON.parse(parsed.data);
        if (!Array.isArray(dataObj)) dataObj = [dataObj];
        bodyPayloads.value = JSON.stringify(dataObj, null, 2);
      } catch (e) {
        bodyPayloads.value = `[\n  ${parsed.data}\n]`;
      }
    }

    updateCounts();
    updatePayloadCount();
    openTab('tab-body', document.getElementById('btn-tab-body'));
    closeCurlModal();
    showToast("🎉 Đã Import cURL thành công vào giao diện!");

  } catch (err) {
    alert("Lỗi khi phân tích lệnh cURL: " + err.message);
  }
}

/* ==========================================
   4. MODAL DANH SÁCH TEST CASE THẤT BẠI
   ========================================== */
function openFailedModal() {
  const results = window.lastBatchResults || [];
  const failed = results.filter(r => !r.passed);

  if (failed.length === 0) {
    showToast("🎉 Tuyệt vời! Tất cả các test case đều ĐẠT (Passed), không có lỗi nào.");
    return;
  }

  const countEl = document.getElementById('failedModalCount');
  if (countEl) countEl.innerText = failed.length;

  const listContainer = document.getElementById('failedModalList');
  if (!listContainer) return;
  listContainer.innerHTML = "";

  failed.forEach(res => {
    let badgeClass = "status-5xx";
    if (res.status_code >= 400 && res.status_code < 500) badgeClass = "status-4xx";
    if (res.status_code >= 200 && res.status_code < 300) badgeClass = "status-2xx";

    const reason = getFailureReason(res);
    const card = document.createElement('div');
    card.className = "failed-card";
    card.onclick = () => jumpToTestCase(res.test_case_id);

    card.innerHTML = `
      <div class="failed-card-top">
        <span class="tc-tag">${escapeHtml(res.test_case_id || 'TC')}</span>
        <span class="assertion-badge badge-fail">✗ FAILED</span>
        <span class="status-badge ${badgeClass}">${res.status_code || 'ERR'} ${escapeHtml(res.status_text || '')}</span>
        ${res.expected_status ? `<span class="expected-tag">Kỳ vọng: ${res.expected_status}</span>` : ''}
        <span class="jump-hint">👉 Bấm để xem chi tiết</span>
      </div>
      <div class="failed-card-desc">
        📝 <strong>Kịch bản:</strong> ${escapeHtml(res.description || 'Không có mô tả')}
      </div>
      <div class="failed-card-reason">
        ⚠️ <strong>Lý do thất bại:</strong> ${escapeHtml(reason)}
      </div>
    `;
    listContainer.appendChild(card);
  });

  const modal = document.getElementById('failedModal');
  if (modal) modal.classList.add('active');
}

function closeFailedModal() {
  const modal = document.getElementById('failedModal');
  if (modal) modal.classList.remove('active');
}

function getFailureReason(res) {
  if (res.status_code === 0) {
    const errMsg = (res.response && res.response.error) ? res.response.error : (res.status_text || 'Mất kết nối');
    return `Lỗi kết nối tới máy chủ: ${errMsg}`;
  }
  let reason = "";
  if (res.expected_status !== undefined && res.expected_status !== null) {
    reason = `Kỳ vọng HTTP ${res.expected_status} nhưng API trả về ${res.status_code} (${res.status_text})`;
  } else {
    reason = `API trả về mã lỗi HTTP ${res.status_code} (${res.status_text})`;
  }

  // Trích xuất error message từ response nếu có
  if (res.response && typeof res.response === 'object') {
    const resp = res.response;
    const msg = resp.message || resp.error || resp.detail || (resp.base && resp.base.message);
    if (msg) {
      reason += ` — Nội dung phản hồi: "${msg}"`;
    }
  } else if (typeof res.response === 'string' && res.response.length > 0) {
    const shortText = res.response.length > 120 ? res.response.substring(0, 120) + '...' : res.response;
    reason += ` — Phản hồi: "${shortText}"`;
  }
  return reason;
}

function jumpToTestCase(tcId) {
  closeFailedModal();
  if (!tcId) return;

  const target = document.querySelector(`[data-tc-id="${CSS.escape(tcId)}"]`);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.remove('highlight-pulse');
    void target.offsetWidth; // trigger reflow
    target.classList.add('highlight-pulse');
    setTimeout(() => {
      target.classList.remove('highlight-pulse');
    }, 3600);
    showToast(`🎯 Đã chuyển đến test case: ${tcId}`);
  } else {
    showToast(`⚠️ Không tìm thấy test case ${tcId}`);
  }
}

// Gắn vào window
window.openGlobalsModal = openGlobalsModal;
window.closeGlobalsModal = closeGlobalsModal;
window.renderGlobalsTable = renderGlobalsTable;
window.addGlobalRow = addGlobalRow;
window.saveGlobalsFromTable = saveGlobalsFromTable;

window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.executeLogin = executeLogin;
window.ensureHeader = ensureHeader;

window.openCurlModal = openCurlModal;
window.closeCurlModal = closeCurlModal;
window.handleImportCurl = handleImportCurl;

window.openFailedModal = openFailedModal;
window.closeFailedModal = closeFailedModal;
window.getFailureReason = getFailureReason;
window.jumpToTestCase = jumpToTestCase;
