/**
 * Test Execution Engine (Batch Run, Single Rerun, Results Rendering, Inline Payload Editing)
 */

async function runBatchTest() {
  const btn = document.getElementById('btnSend');
  const btnText = document.getElementById('btnText');
  const btnIcon = document.getElementById('btnIcon');
  const resultsContainer = document.getElementById('resultsList');

  const method = document.getElementById('httpMethod')?.value || 'POST';
  const rawUrl = document.getElementById('apiUrl')?.value.trim() || '';
  const url = substituteVariables(rawUrl);

  const authType = document.getElementById('authType')?.value || 'none';
  const rawAuthToken = document.getElementById('authToken')?.value.trim() || '';
  const authToken = substituteVariables(rawAuthToken);

  const params = collectTableData('paramTable');
  const headers = collectTableData('headerTable');

  if (!url) {
    alert("Vui lòng nhập URL API cần test hoặc dán cURL!");
    return;
  }

  let payloads = [];
  try {
    const rawBody = document.getElementById('bodyPayloads')?.value.trim() || '[]';
    const replacedBody = substituteVariables(rawBody);
    payloads = JSON.parse(replacedBody);
    if (!Array.isArray(payloads)) payloads = [payloads];
  } catch (err) {
    alert("Lỗi cú pháp JSON trong tab Body: " + err.message);
    return;
  }

  if (btnText) btnText.innerText = "Đang chạy test...";
  if (btnIcon) btnIcon.innerHTML = `<span class="spinner"></span>`;
  if (btn) btn.disabled = true;

  try {
    const response = await fetch('/api/run-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method,
        url,
        params,
        headers,
        authType,
        authToken,
        payloads
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Lỗi server khi chạy kiểm thử");
    }

    renderResults(data);

    // Chạy Script (Post-Response)
    runPostResponseScript(data.results);

  } catch (err) {
    if (resultsContainer) {
      resultsContainer.innerHTML = `
        <div class="empty-state" style="color:var(--danger)">
          ❌ Có lỗi xảy ra: ${escapeHtml(err.message)}
        </div>
      `;
    }
  } finally {
    if (btnText) btnText.innerText = "Send & Test";
    if (btnIcon) btnIcon.innerHTML = "▶";
    if (btn) btn.disabled = false;
  }
}

function renderResults(data) {
  const totalStat = document.getElementById('totalStat');
  const successStat = document.getElementById('successStat');
  const failStatEl = document.getElementById('failStat');

  if (totalStat) totalStat.innerText = `Tổng: ${data.total}`;
  const passedCount = data.passed_count !== undefined ? data.passed_count : data.success_count;
  if (successStat) successStat.innerText = `PASSED: ${passedCount}`;
  
  if (failStatEl) {
    if (data.failed_count > 0) {
      failStatEl.innerHTML = `🚨 FAILED: ${data.failed_count} <span style="font-size:0.75rem; text-decoration:underline; opacity:0.85;">(Xem chi tiết)</span>`;
    } else {
      failStatEl.innerText = `FAILED: 0`;
    }
  }

  // Lưu kết quả vào window để truy xuất an toàn theo index
  window.lastBatchResults = data.results || [];

  const list = document.getElementById('resultsList');
  if (!list) return;
  list.innerHTML = "";

  data.results.forEach((res, index) => {
    let badgeClass = "status-2xx";
    if (res.status_code >= 400 && res.status_code < 500) badgeClass = "status-4xx";
    if (res.status_code >= 500 || res.status_code === 0) badgeClass = "status-5xx";

    const payloadId = `payload-tree-${index}`;
    const respId = `resp-tree-${index}`;

    const payloadTreeHtml = buildJsonTree(res.payload);
    const respTreeHtml = buildJsonTree(res.response);

    let assertionHtml = "";
    if (res.expected_status !== undefined && res.expected_status !== null) {
      const passClass = res.passed ? "badge-pass" : "badge-fail";
      const passIcon = res.passed ? "✓ PASSED" : "✗ FAILED";
      assertionHtml = `
        <span class="assertion-badge ${passClass}">${passIcon}</span>
        <span class="expected-tag" title="HTTP Status kỳ vọng">Kỳ vọng: ${res.expected_status}</span>
      `;
    }

    const tcTag = `<span class="tc-tag" title="Mã Test Case">${escapeHtml(res.test_case_id || `TC${index + 1}`)}</span>`;

    const item = document.createElement('div');
    item.className = `result-item ${res.passed === false ? 'item-failed' : ''}`;
    item.setAttribute('data-tc-id', res.test_case_id || `TC${index + 1}`);

    item.innerHTML = `
      <div class="result-item-header">
        <div class="result-header-left">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            ${tcTag}
            ${assertionHtml}
            <span class="status-badge ${badgeClass}">${res.status_code || 'ERR'} ${escapeHtml(res.status_text || '')}</span>
            <span style="font-size:0.8rem; color:var(--text-muted);">${res.elapsed_ms} ms</span>
          </div>
          <div class="tc-header-desc">
            📌 <strong>Mô tả:</strong> ${escapeHtml(res.description || 'Không có mô tả')}
          </div>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <button class="curl-btn" onclick="copyCurlByIndex(${index}, this)">Copy cURL</button>
          <button class="btn-send-single" onclick="sendSingleRequest(${index}, this)" title="Gửi lại riêng lẻ request này">▶ Send</button>
        </div>
      </div>
      <div class="result-body-grid">
        <!-- CỘT REQUEST PAYLOAD -->
        <div class="grid-col">
          <div class="grid-col-title">
            <span>Payload Gửi Đi (${escapeHtml(res.test_case_id || '')})</span>
            <div class="viewer-tools">
              <button class="btn-tool" id="btn-edit-${index}" title="Chỉnh sửa Payload" onclick="toggleEditPayload(${index})">✏️ Sửa</button>
              <button class="btn-tool" title="Mở rộng tất cả" onclick="expandAllInContainer('${payloadId}')">+ Mở hết</button>
              <button class="btn-tool" title="Thu gọn tất cả" onclick="collapseAllInContainer('${payloadId}')">- Thu gọn</button>
              <button class="btn-tool" title="Copy JSON" onclick="copyResultJsonByIndex(${index}, 'payload', this)">📋 Copy</button>
            </div>
          </div>
          <div id="${payloadId}" class="json-tree-container">
            ${payloadTreeHtml}
          </div>
          <div id="payload-edit-box-${index}" class="payload-edit-wrapper" style="display:none;">
            <textarea id="payload-editor-${index}" class="payload-inline-textarea" spellcheck="false" placeholder="Nhập JSON payload tại đây..."></textarea>
            <div class="payload-edit-actions">
              <button class="btn-save-payload" onclick="savePayloadEdit(${index})">💾 Lưu thay đổi</button>
              <button class="btn-cancel-payload" onclick="cancelPayloadEdit(${index})">✕ Hủy</button>
            </div>
          </div>
        </div>

        <!-- CỘT RESPONSE NHẬN ĐƯỢC -->
        <div class="grid-col">
          <div class="grid-col-title">
            <span>Response Nhận Được (${escapeHtml(res.test_case_id || '')})</span>
            <div class="viewer-tools">
              <button class="btn-tool" title="Mở rộng tất cả" onclick="expandAllInContainer('${respId}')">+ Mở hết</button>
              <button class="btn-tool" title="Thu gọn tất cả" onclick="collapseAllInContainer('${respId}')">- Thu gọn</button>
              <button class="btn-tool" title="Copy JSON" onclick="copyResultJsonByIndex(${index}, 'response', this)">📋 Copy</button>
            </div>
          </div>
          <div id="${respId}" class="json-tree-container">
            ${respTreeHtml}
          </div>
        </div>
      </div>
    `;
    list.appendChild(item);
  });
}

function toggleEditPayload(index) {
  const editBox = document.getElementById(`payload-edit-box-${index}`);
  const treeContainer = document.getElementById(`payload-tree-${index}`);
  const btnEdit = document.getElementById(`btn-edit-${index}`);
  const textarea = document.getElementById(`payload-editor-${index}`);

  if (!editBox || !treeContainer) return;

  const isEditing = editBox.style.display !== 'none';
  if (isEditing) {
    editBox.style.display = 'none';
    treeContainer.style.display = 'block';
    if (btnEdit) {
      btnEdit.innerHTML = "✏️ Sửa";
      btnEdit.classList.remove('editing-active');
    }
  } else {
    const item = window.lastBatchResults && window.lastBatchResults[index];
    if (item && textarea) {
      textarea.value = JSON.stringify(item.payload || {}, null, 2);
    }
    treeContainer.style.display = 'none';
    editBox.style.display = 'flex';
    if (btnEdit) {
      btnEdit.innerHTML = "👁️ Hủy sửa";
      btnEdit.classList.add('editing-active');
    }
    if (textarea) textarea.focus();
  }
}

function savePayloadEdit(index) {
  const textarea = document.getElementById(`payload-editor-${index}`);
  const editBox = document.getElementById(`payload-edit-box-${index}`);
  const treeContainer = document.getElementById(`payload-tree-${index}`);
  const btnEdit = document.getElementById(`btn-edit-${index}`);

  if (!textarea) return;

  try {
    const parsed = JSON.parse(textarea.value.trim() || '{}');
    if (window.lastBatchResults && window.lastBatchResults[index]) {
      window.lastBatchResults[index].payload = parsed;
      
      const method = document.getElementById('httpMethod')?.value || 'POST';
      const url = substituteVariables(document.getElementById('apiUrl')?.value.trim() || '');
      const headers = collectTableData('headerTable');
      
      window.lastBatchResults[index].curl = generateClientCurl(method, url, headers, parsed);
    }

    if (treeContainer) {
      treeContainer.innerHTML = buildJsonTree(parsed);
      treeContainer.style.display = 'block';
    }
    if (editBox) editBox.style.display = 'none';
    if (btnEdit) {
      btnEdit.innerHTML = "✏️ Sửa";
      btnEdit.classList.remove('editing-active');
    }

    syncPayloadToBodyEditor(index, parsed);
    showToast("💾 Đã lưu & đồng bộ Payload vào Tab Body! Nhấn [▶ Send] để test lại.");
  } catch (err) {
    alert("Lỗi cú pháp JSON trong Payload: " + err.message);
  }
}

function syncPayloadToBodyEditor(index, newPayload) {
  const bodyEditor = document.getElementById('bodyPayloads');
  if (!bodyEditor) return;

  const rawText = bodyEditor.value.trim();
  if (!rawText) return;

  try {
    let bodyArray = JSON.parse(rawText);
    if (!Array.isArray(bodyArray)) return;

    const currentItem = window.lastBatchResults && window.lastBatchResults[index];
    const targetTcId = currentItem ? currentItem.test_case_id : null;

    let targetIndex = -1;
    if (targetTcId) {
      targetIndex = bodyArray.findIndex(item => item && (item.testCaseId === targetTcId || item.test_case_id === targetTcId));
    }

    if (targetIndex === -1 && index >= 0 && index < bodyArray.length) {
      targetIndex = index;
    }

    if (targetIndex !== -1) {
      const itemInBody = bodyArray[targetIndex];
      if (itemInBody && typeof itemInBody === 'object' && ('payload' in itemInBody || 'testCaseId' in itemInBody || 'expectedStatus' in itemInBody)) {
        bodyArray[targetIndex].payload = newPayload;
      } else {
        bodyArray[targetIndex] = newPayload;
      }

      bodyEditor.value = JSON.stringify(bodyArray, null, 2);
      updatePayloadCount();
    }
  } catch (e) {
    console.warn("Không thể đồng bộ vào tab Body do cú pháp JSON hiện tại trong tab Body bị lỗi:", e);
  }
}

function cancelPayloadEdit(index) {
  const editBox = document.getElementById(`payload-edit-box-${index}`);
  const treeContainer = document.getElementById(`payload-tree-${index}`);
  const btnEdit = document.getElementById(`btn-edit-${index}`);

  if (editBox && treeContainer) {
    editBox.style.display = 'none';
    treeContainer.style.display = 'block';
  }
  if (btnEdit) {
    btnEdit.innerHTML = "✏️ Sửa";
    btnEdit.classList.remove('editing-active');
  }
}

async function sendSingleRequest(index, btn) {
  const item = window.lastBatchResults && window.lastBatchResults[index];
  if (!item) {
    showToast("⚠️ Không tìm thấy dữ liệu kịch bản để gửi!");
    return;
  }

  const url = substituteVariables(document.getElementById('apiUrl')?.value.trim() || '');
  if (!url) {
    alert("Vui lòng nhập URL API cần test hoặc dán cURL!");
    return;
  }

  const method = document.getElementById('httpMethod')?.value || 'POST';
  const headers = collectTableData('headerTable');
  const params = collectTableData('paramTable');
  const authType = document.getElementById('authType')?.value || 'none';
  const authToken = substituteVariables(document.getElementById('authToken')?.value.trim() || '');

  const origHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner" style="width:11px; height:11px; border-width:2px; display:inline-block; margin-right:4px;"></span> Gửi...`;

  try {
    const payloadToSend = {
      testCaseId: item.test_case_id,
      description: item.description,
      expectedStatus: item.expected_status,
      payload: item.payload
    };

    const response = await fetch('/api/run-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method,
        url,
        params,
        headers,
        authType,
        authToken,
        payloads: [payloadToSend]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Lỗi server khi gửi request");
    }

    if (data.results && data.results.length > 0) {
      const newRes = data.results[0];
      newRes.stt = item.stt;
      
      window.lastBatchResults[index] = newRes;
      updateSingleResultDOM(index, newRes);
      updateStatsSummary();
      runPostResponseScript([newRes]);

      const statusText = newRes.passed ? "PASSED" : "FAILED";
      showToast(`🚀 Đã gửi [${newRes.test_case_id || 'TC'}]: HTTP ${newRes.status_code} (${statusText})`);
    }
  } catch (err) {
    showToast("❌ Lỗi khi gửi request: " + err.message);
  } finally {
    btn.innerHTML = origHtml;
    btn.disabled = false;
  }
}

function updateSingleResultDOM(index, res) {
  const card = document.querySelector(`[data-tc-id="${CSS.escape(res.test_case_id || `TC${index+1}`)}"]`);
  if (!card) return;

  if (res.passed === false) {
    card.classList.add('item-failed');
  } else {
    card.classList.remove('item-failed');
  }

  let badgeClass = "status-2xx";
  if (res.status_code >= 400 && res.status_code < 500) badgeClass = "status-4xx";
  if (res.status_code >= 500 || res.status_code === 0) badgeClass = "status-5xx";

  const headerBadges = card.querySelector('.result-header-left > div');
  if (headerBadges) {
    let assertionHtml = "";
    if (res.expected_status !== undefined && res.expected_status !== null) {
      const passClass = res.passed ? "badge-pass" : "badge-fail";
      const passIcon = res.passed ? "✓ PASSED" : "✗ FAILED";
      assertionHtml = `
        <span class="assertion-badge ${passClass}">${passIcon}</span>
        <span class="expected-tag" title="HTTP Status kỳ vọng">Kỳ vọng: ${res.expected_status}</span>
      `;
    }
    const tcTag = `<span class="tc-tag" title="Mã Test Case">${escapeHtml(res.test_case_id || `TC${index + 1}`)}</span>`;

    headerBadges.innerHTML = `
      ${tcTag}
      ${assertionHtml}
      <span class="status-badge ${badgeClass}">${res.status_code || 'ERR'} ${escapeHtml(res.status_text || '')}</span>
      <span style="font-size:0.8rem; color:var(--text-muted);">${res.elapsed_ms} ms</span>
    `;
  }

  const respContainer = document.getElementById(`resp-tree-${index}`);
  if (respContainer) {
    respContainer.innerHTML = buildJsonTree(res.response);
  }
}

function updateStatsSummary() {
  const results = window.lastBatchResults || [];
  const total = results.length;
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = total - passedCount;

  const totalStat = document.getElementById('totalStat');
  const successStat = document.getElementById('successStat');
  const failStatEl = document.getElementById('failStat');

  if (totalStat) totalStat.innerText = `Tổng: ${total}`;
  if (successStat) successStat.innerText = `PASSED: ${passedCount}`;
  if (failStatEl) {
    if (failedCount > 0) {
      failStatEl.innerHTML = `🚨 FAILED: ${failedCount} <span style="font-size:0.75rem; text-decoration:underline; opacity:0.85;">(Xem chi tiết)</span>`;
    } else {
      failStatEl.innerText = `FAILED: 0`;
    }
  }
}

// Gắn vào window
window.runBatchTest = runBatchTest;
window.renderResults = renderResults;
window.toggleEditPayload = toggleEditPayload;
window.savePayloadEdit = savePayloadEdit;
window.syncPayloadToBodyEditor = syncPayloadToBodyEditor;
window.cancelPayloadEdit = cancelPayloadEdit;
window.sendSingleRequest = sendSingleRequest;
window.updateSingleResultDOM = updateSingleResultDOM;
window.updateStatsSummary = updateStatsSummary;
