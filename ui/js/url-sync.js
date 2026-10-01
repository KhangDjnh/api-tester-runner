/**
 * URL and Query Parameters Two-Way Synchronization
 */

let isSyncingUrlAndParams = false;

function safeDecodeUriComponent(str) {
  if (!str) return '';
  try {
    return decodeURIComponent(str.replace(/\+/g, ' '));
  } catch (e) {
    return str;
  }
}

function createParamRowHtml(key = '', val = '', checked = true) {
  return `
    <td style="text-align:center;"><input type="checkbox" ${checked ? 'checked' : ''} onchange="syncParamsToUrl()" /></td>
    <td><input class="kv-input key-input" placeholder="Parameter key" value="${escapeHtml(key)}" oninput="syncParamsToUrl()" /></td>
    <td><input class="kv-input val-input" placeholder="Value (hỗ trợ {{bien}})" value="${escapeHtml(val)}" oninput="syncParamsToUrl()" /></td>
    <td><button class="btn-del" onclick="deleteRow(this, 'param')">×</button></td>
  `;
}

// Khi người dùng sửa ở tab Param -> cập nhật URL trên thanh apiUrl
function syncParamsToUrl() {
  if (isSyncingUrlAndParams) return;
  isSyncingUrlAndParams = true;
  try {
    const urlInput = document.getElementById('apiUrl');
    if (!urlInput) return;
    let currentUrl = urlInput.value;
    
    let hash = '';
    const hashIdx = currentUrl.indexOf('#');
    if (hashIdx !== -1) {
      hash = currentUrl.substring(hashIdx);
      currentUrl = currentUrl.substring(0, hashIdx);
    }

    const qIdx = currentUrl.indexOf('?');
    const baseUrl = (qIdx !== -1) ? currentUrl.substring(0, qIdx) : currentUrl;

    const rows = document.querySelectorAll('#paramTable tbody tr');
    const pairs = [];
    let count = 0;

    rows.forEach(tr => {
      const chk = tr.querySelector('input[type="checkbox"]');
      const kInput = tr.querySelector('.key-input');
      const vInput = tr.querySelector('.val-input');
      const k = kInput ? kInput.value : '';
      const v = vInput ? vInput.value : '';

      if (k.trim()) count++;
      if (chk && chk.checked && k.trim()) {
        if (v !== '') {
          pairs.push(`${k}=${v}`);
        } else {
          pairs.push(`${k}=`);
        }
      }
    });

    let newUrl = baseUrl;
    if (pairs.length > 0) {
      newUrl += '?' + pairs.join('&');
    }
    newUrl += hash;

    urlInput.value = newUrl;
    const paramCountEl = document.getElementById('paramCount');
    if (paramCountEl) paramCountEl.innerText = count;
  } finally {
    isSyncingUrlAndParams = false;
  }
}

// Khi người dùng sửa URL trên thanh apiUrl -> cập nhật bảng paramTable
function syncUrlToParams() {
  if (isSyncingUrlAndParams) return;
  isSyncingUrlAndParams = true;
  try {
    const urlInput = document.getElementById('apiUrl');
    if (!urlInput) return;
    let urlStr = urlInput.value;

    // Bỏ hash nếu có
    const hashIdx = urlStr.indexOf('#');
    if (hashIdx !== -1) {
      urlStr = urlStr.substring(0, hashIdx);
    }

    const qIdx = urlStr.indexOf('?');
    const queryStr = (qIdx !== -1) ? urlStr.substring(qIdx + 1) : '';

    // Giữ lại các hàng unchecked đang có trong bảng param
    const uncheckedRows = [];
    document.querySelectorAll('#paramTable tbody tr').forEach(tr => {
      const chk = tr.querySelector('input[type="checkbox"]');
      const k = tr.querySelector('.key-input')?.value || '';
      const v = tr.querySelector('.val-input')?.value || '';
      if (chk && !chk.checked && (k.trim() || v.trim())) {
        uncheckedRows.push({ key: k, val: v });
      }
    });

    const activeParams = [];
    if (queryStr.trim()) {
      const pairs = queryStr.split('&');
      for (const pair of pairs) {
        if (!pair) continue;
        const eqIdx = pair.indexOf('=');
        let rawK = '';
        let rawV = '';
        if (eqIdx !== -1) {
          rawK = pair.substring(0, eqIdx);
          rawV = pair.substring(eqIdx + 1);
        } else {
          rawK = pair;
          rawV = '';
        }
        activeParams.push({
          key: safeDecodeUriComponent(rawK),
          val: safeDecodeUriComponent(rawV)
        });
      }
    }

    const tbody = document.querySelector('#paramTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    activeParams.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = createParamRowHtml(p.key, p.val, true);
      tbody.appendChild(tr);
    });

    uncheckedRows.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = createParamRowHtml(p.key, p.val, false);
      tbody.appendChild(tr);
    });

    // Nếu không có param nào, tạo 1 dòng trống mặc định
    if (tbody.querySelectorAll('tr').length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = createParamRowHtml('', '', true);
      tbody.appendChild(tr);
    }

    let count = 0;
    document.querySelectorAll('#paramTable tbody tr').forEach(r => {
      const k = r.querySelector('.key-input')?.value.trim();
      if (k) count++;
    });
    const paramCountEl = document.getElementById('paramCount');
    if (paramCountEl) paramCountEl.innerText = count;
  } finally {
    isSyncingUrlAndParams = false;
  }
}

// Gắn vào window
window.safeDecodeUriComponent = safeDecodeUriComponent;
window.createParamRowHtml = createParamRowHtml;
window.syncParamsToUrl = syncParamsToUrl;
window.syncUrlToParams = syncUrlToParams;
