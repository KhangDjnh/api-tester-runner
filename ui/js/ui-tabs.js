/**
 * UI Tabs, Key-Value Tables, and Height Adjustments
 */

function openTab(tabId, btn) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  const targetTab = document.getElementById(tabId);
  if (targetTab) targetTab.classList.add('active');
  if (btn) btn.classList.add('active');
}

function setTabHeight(val) {
  document.querySelectorAll('.tab-content').forEach(el => {
    if (val === 'auto') {
      el.style.height = 'auto';
      el.style.maxHeight = 'none';
    } else {
      el.style.height = val + 'px';
      el.style.maxHeight = '85vh';
    }
  });
  showToast(val === 'auto' ? '↕ Chiều cao Tab: Tự động' : `↕ Chiều cao Tab: ${val}px`);
}

function setResultsHeight(val) {
  const card = document.getElementById('resultsCard');
  if (!card) return;
  if (val === 'auto') {
    card.style.height = 'auto';
    card.style.maxHeight = 'none';
    showToast('↕ Chiều cao Kết quả: Tự động co giãn theo nội dung');
  } else {
    card.style.height = val + 'px';
    card.style.maxHeight = 'none';
    showToast(`↕ Chiều cao Kết quả: ${val}px`);
  }
}

function addRow(tableId, type) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  if (!tbody) return;
  const tr = document.createElement('tr');
  const isParam = (type === 'param');
  tr.innerHTML = `
    <td style="text-align:center;"><input type="checkbox" checked ${isParam ? 'onchange="syncParamsToUrl()"' : ''} /></td>
    <td><input class="kv-input key-input" placeholder="${isParam ? 'Parameter key' : 'Header name'}" oninput="${isParam ? 'syncParamsToUrl()' : 'updateCounts()'}" /></td>
    <td><input class="kv-input val-input" placeholder="Value (hỗ trợ {{bien}})" ${isParam ? 'oninput="syncParamsToUrl()"' : ''} /></td>
    <td><button class="btn-del" onclick="deleteRow(this, '${type}')">×</button></td>
  `;
  tbody.appendChild(tr);
  if (isParam) {
    syncParamsToUrl();
  } else {
    updateCounts();
  }
}

function deleteRow(btn, type) {
  const tbody = btn.closest('tbody');
  btn.closest('tr').remove();
  if (type === 'param') {
    if (tbody.querySelectorAll('tr').length === 0) {
      addRow('paramTable', 'param');
    }
    syncParamsToUrl();
  } else {
    updateCounts();
  }
}

function updateCounts() {
  updateHeaderCount();
  updateParamCount();
}

function updateHeaderCount() {
  const rows = document.querySelectorAll('#headerTable tbody tr');
  let count = 0;
  rows.forEach(r => {
    if (r.querySelector('.key-input')?.value.trim()) count++;
  });
  const headerCountEl = document.getElementById('headerCount');
  if (headerCountEl) headerCountEl.innerText = count;
}

function updateParamCount() {
  const rows = document.querySelectorAll('#paramTable tbody tr');
  let count = 0;
  rows.forEach(r => {
    if (r.querySelector('.key-input')?.value.trim()) count++;
  });
  const paramCountEl = document.getElementById('paramCount');
  if (paramCountEl) paramCountEl.innerText = count;
}

function onAuthTypeChange() {
  const type = document.getElementById('authType')?.value;
  const tokenGroup = document.getElementById('tokenGroup');
  if (tokenGroup) {
    tokenGroup.style.display = (type === 'none') ? 'none' : 'block';
  }
}

function updatePayloadCount() {
  const editor = document.getElementById('bodyPayloads');
  const countEl = document.getElementById('payloadCount');
  const detectedEl = document.getElementById('detectedCountText');
  if (!editor || !countEl || !detectedEl) return;

  try {
    const text = editor.value.trim();
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      countEl.innerText = parsed.length;
      const isTestCase = parsed.length > 0 && typeof parsed[0] === 'object' && ('testCaseId' in parsed[0] || 'expectedStatus' in parsed[0] || 'payload' in parsed[0]);
      detectedEl.innerText = isTestCase
        ? `Phát hiện: ${parsed.length} test case(s)`
        : `Phát hiện: ${parsed.length} payload(s)`;
      detectedEl.style.color = 'var(--accent)';
    } else {
      detectedEl.innerText = 'Cảnh báo: Dữ liệu chưa phải là 1 Array [...]';
      detectedEl.style.color = 'var(--warning)';
    }
  } catch (e) {
    detectedEl.innerText = 'JSON chưa đúng cú pháp';
    detectedEl.style.color = 'var(--danger)';
  }
}

function formatJSON() {
  const editor = document.getElementById('bodyPayloads');
  if (!editor) return;
  try {
    const text = editor.value.trim();
    const obj = JSON.parse(text);
    editor.value = JSON.stringify(obj, null, 2);
    updatePayloadCount();
    showToast("✨ Đã định dạng JSON đẹp mắt!");
  } catch (e) {
    alert("Lỗi cú pháp JSON: " + e.message);
  }
}

function collectTableData(tableId) {
  const result = {};
  document.querySelectorAll(`#${tableId} tbody tr`).forEach(tr => {
    const checked = tr.querySelector('input[type="checkbox"]')?.checked;
    const key = tr.querySelector('.key-input')?.value.trim();
    const rawVal = tr.querySelector('.val-input')?.value.trim() || '';
    if (checked && key) {
      result[key] = substituteVariables(rawVal);
    }
  });
  return result;
}

// Gắn vào window
window.openTab = openTab;
window.setTabHeight = setTabHeight;
window.setResultsHeight = setResultsHeight;
window.addRow = addRow;
window.deleteRow = deleteRow;
window.updateCounts = updateCounts;
window.updateHeaderCount = updateHeaderCount;
window.updateParamCount = updateParamCount;
window.onAuthTypeChange = onAuthTypeChange;
window.updatePayloadCount = updatePayloadCount;
window.formatJSON = formatJSON;
window.collectTableData = collectTableData;
