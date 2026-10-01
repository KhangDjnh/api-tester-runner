/**
 * Collapsible JSON Tree Viewer and Copy Actions
 */

function buildJsonTree(val) {
  if (val === null) return `<span class="json-null">null</span>`;
  if (typeof val === 'boolean') return `<span class="json-bool">${val}</span>`;
  if (typeof val === 'number') return `<span class="json-num">${val}</span>`;
  if (typeof val === 'string') return `<span class="json-str">"${escapeHtml(val)}"</span>`;

  if (Array.isArray(val)) {
    if (val.length === 0) return `<span class="json-bracket">[]</span>`;
    let html = `<span class="json-collapsible">`;
    html += `<span class="json-toggle" onclick="toggleJson(this)">▼</span>`;
    html += `<span class="json-bracket">[</span>`;
    html += `<span class="json-collapsed-text" onclick="toggleJsonText(this)">[ ${val.length} items ]</span>`;
    html += `<div class="json-block">`;
    val.forEach((item, i) => {
      html += `<div class="json-line"><span class="json-index">${i}: </span>${buildJsonTree(item)}${i < val.length - 1 ? ',' : ''}</div>`;
    });
    html += `</div><span class="json-bracket">]</span></span>`;
    return html;
  }

  if (typeof val === 'object') {
    const keys = Object.keys(val);
    if (keys.length === 0) return `<span class="json-bracket">{}</span>`;
    let html = `<span class="json-collapsible">`;
    html += `<span class="json-toggle" onclick="toggleJson(this)">▼</span>`;
    html += `<span class="json-bracket">{</span>`;
    html += `<span class="json-collapsed-text" onclick="toggleJsonText(this)">{ ${keys.length} keys }</span>`;
    html += `<div class="json-block">`;
    keys.forEach((k, i) => {
      html += `<div class="json-line"><span class="json-key">"${escapeHtml(k)}"</span>: ${buildJsonTree(val[k])}${i < keys.length - 1 ? ',' : ''}</div>`;
    });
    html += `</div><span class="json-bracket">}</span></span>`;
    return html;
  }

  return `<span>${escapeHtml(String(val))}</span>`;
}

function toggleJson(btn) {
  const parent = btn.closest('.json-collapsible');
  if (parent) {
    const isClosed = parent.classList.toggle('closed');
    btn.innerText = isClosed ? '▶' : '▼';
  }
}

function toggleJsonText(textSpan) {
  const parent = textSpan.closest('.json-collapsible');
  if (parent) {
    parent.classList.remove('closed');
    const toggle = parent.querySelector(':scope > .json-toggle');
    if (toggle) toggle.innerText = '▼';
  }
}

function expandAllInContainer(containerId) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.querySelectorAll('.json-collapsible').forEach(el => {
    el.classList.remove('closed');
    const toggle = el.querySelector(':scope > .json-toggle');
    if (toggle) toggle.innerText = '▼';
  });
  showToast("📂 Đã mở rộng toàn bộ object!");
}

function collapseAllInContainer(containerId) {
  const c = document.getElementById(containerId);
  if (!c) return;
  const collapsibles = c.querySelectorAll('.json-collapsible');
  collapsibles.forEach((el, idx) => {
    // Thu gọn các node con (hoặc tất cả trừ node gốc)
    if (idx > 0) {
      el.classList.add('closed');
      const toggle = el.querySelector(':scope > .json-toggle');
      if (toggle) toggle.innerText = '▶';
    }
  });
  showToast("📁 Đã thu gọn các object!");
}

function copyResultJsonByIndex(index, type, btn) {
  const item = window.lastBatchResults && window.lastBatchResults[index];
  if (!item) return;
  const dataObj = type === 'payload' ? item.payload : item.response;
  const jsonStr = typeof dataObj === 'string' ? dataObj : JSON.stringify(dataObj, null, 2);
  copyToClipboard(jsonStr).then(() => {
    showToast(`📋 Đã sao chép JSON ${type === 'payload' ? 'Payload' : 'Response'} thành công!`);
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = "✓ Đã copy!";
      btn.style.color = "#34d399";
      setTimeout(() => {
        btn.innerHTML = orig;
        btn.style.color = "";
      }, 2000);
    }
  }).catch(() => {
    showToast("⚠️ Không thể tự động copy, vui lòng thử lại!");
  });
}

function copyContainerJson(dataStr, btn) {
  const json = decodeURIComponent(dataStr);
  copyToClipboard(json).then(() => {
    showToast("📋 Đã sao chép JSON thành công!");
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = "✓ Đã copy!";
      btn.style.color = "#34d399";
      setTimeout(() => {
        btn.innerHTML = orig;
        btn.style.color = "";
      }, 2000);
    }
  }).catch(() => {
    showToast("⚠️ Không thể tự động copy, vui lòng thử lại!");
  });
}

// Gắn vào window
window.buildJsonTree = buildJsonTree;
window.toggleJson = toggleJson;
window.toggleJsonText = toggleJsonText;
window.expandAllInContainer = expandAllInContainer;
window.collapseAllInContainer = collapseAllInContainer;
window.copyResultJsonByIndex = copyResultJsonByIndex;
window.copyContainerJson = copyContainerJson;
