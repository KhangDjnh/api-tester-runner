/**
 * Post-Response Script Engine
 * Chạy JavaScript sandbox tự động sau khi nhận Response từ API
 */

function insertScriptSnippet(type) {
  const editor = document.getElementById('postScript');
  if (!editor) return;

  if (type === 'auth') {
    editor.value = `// Tự động lưu csrf_token và cookie vào Biến Toàn Cục
results.forEach(res => {
  if (res.response && res.response.content && res.response.content.csrf_token) {
    setGlobal("csrf_token", res.response.content.csrf_token);
  }
  if (res.headers && res.headers["set-cookie"]) {
    const setCookie = res.headers["set-cookie"].split(";")[0];
    setGlobal("cookie", setCookie);
  }
});`;
  } else {
    editor.value = "";
  }
  showToast("✨ Đã cập nhật Script!");
}

function runPostResponseScript(results) {
  const scriptEl = document.getElementById('postScript');
  if (!scriptEl) return;
  const scriptCode = scriptEl.value.trim();
  if (!scriptCode) return;

  try {
    const runFn = new Function('results', 'setGlobal', 'getGlobal', 'showToast', scriptCode);
    runFn(results, setGlobal, getGlobal, showToast);
  } catch (err) {
    console.error("Lỗi thực thi Script:", err);
    showToast("⚠️ Lỗi chạy Script: " + err.message);
  }
}

// Gắn vào window
window.insertScriptSnippet = insertScriptSnippet;
window.runPostResponseScript = runPostResponseScript;
