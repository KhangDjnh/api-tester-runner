/**
 * cURL Parser and Generator Utilities
 */

function parseCurlCommand(raw) {
  if (!raw || !raw.trim()) throw new Error("Lệnh cURL không được để trống!");
  let text = raw.trim().replace(/\\\s*\n/g, ' ').replace(/\\\s*\r\n/g, ' ');

  const tokens = [];
  const regex = /[^\s"']+|"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[1] !== undefined) tokens.push(match[1].replace(/\\"/g, '"'));
    else if (match[2] !== undefined) tokens.push(match[2].replace(/\\'/g, "'"));
    else tokens.push(match[0]);
  }

  if (tokens.length === 0 || tokens[0].toLowerCase() !== 'curl') {
    throw new Error("Câu lệnh phải bắt đầu bằng lệnh 'curl'");
  }

  let method = null;
  let url = null;
  const headers = [];
  let data = null;

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === '-X' || token === '--request') method = tokens[++i]?.toUpperCase();
    else if (token === '-H' || token === '--header') {
      const h = tokens[++i];
      if (h) headers.push(h);
    } else if (token === '-d' || token === '--data' || token === '--data-raw' || token === '--data-binary' || token === '--json') {
      data = tokens[++i];
      if (!method) method = 'POST';
    } else if (token === '-L' || token === '--location') continue;
    else if (token.startsWith('http://') || token.startsWith('https://')) url = token;
    else if (!token.startsWith('-') && !url) url = token;
  }

  if (!method) method = data ? 'POST' : 'GET';
  return { method, url, headers, data };
}

function generateClientCurl(method, url, headers, json_data) {
  const parts = [`curl -X ${method} '${url}'`];
  for (const [k, v] of Object.entries(headers)) {
    parts.push(`-H '${k}: ${v}'`);
  }
  if (json_data !== null && json_data !== undefined && method !== "GET") {
    parts.push(`-d '${JSON.stringify(json_data)}'`);
  }
  return parts.join(" \\\n    ");
}

function copyCurlByIndex(index, btn) {
  const item = window.lastBatchResults && window.lastBatchResults[index];
  if (!item || !item.curl) {
    showToast("⚠️ Không tìm thấy lệnh cURL để sao chép!");
    return;
  }
  const curl = item.curl;
  copyToClipboard(curl).then(() => {
    showToast("📋 Đã sao chép câu lệnh cURL thành công!");
    if (btn) {
      const origText = btn.innerHTML;
      btn.classList.add('copied');
      btn.innerHTML = "✓ Đã copy cURL!";
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = origText;
      }, 2000);
    }
  }).catch((err) => {
    console.error("Lỗi sao chép cURL:", err);
    prompt("Sao chép câu lệnh cURL thủ công bên dưới:", curl);
  });
}

function copyCurl(encodedCurl, btn) {
  let curl = encodedCurl;
  try {
    if (typeof encodedCurl === 'string' && encodedCurl.includes('%')) {
      curl = decodeURIComponent(encodedCurl);
    }
  } catch (e) {}
  copyToClipboard(curl).then(() => {
    showToast("📋 Đã sao chép câu lệnh cURL thành công!");
    if (btn) {
      const origText = btn.innerHTML;
      btn.classList.add('copied');
      btn.innerHTML = "✓ Đã copy cURL!";
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = origText;
      }, 2000);
    }
  }).catch(() => {
    prompt("Sao chép câu lệnh cURL thủ công bên dưới:", curl);
  });
}

// Gắn vào window
window.parseCurlCommand = parseCurlCommand;
window.generateClientCurl = generateClientCurl;
window.copyCurlByIndex = copyCurlByIndex;
window.copyCurl = copyCurl;
