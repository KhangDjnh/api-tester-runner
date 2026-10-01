/**
 * State Management & Global Variables ({{variable}})
 */

const DEFAULT_GLOBALS = {
  "cookie": "cms_session=XP7pJZRdvbTwxf2_bwpMiCYXfPC85KOOwoK6uv6sQQk",
  "csrf_token": ""
};

let globalVariables = {};

function initGlobals() {
  try {
    const stored = localStorage.getItem("api_tester_globals");
    if (stored) {
      globalVariables = JSON.parse(stored);
    } else {
      globalVariables = { ...DEFAULT_GLOBALS };
      saveGlobals();
    }
  } catch (e) {
    globalVariables = { ...DEFAULT_GLOBALS };
  }
  updateGlobalBadge();
}

function saveGlobals() {
  localStorage.setItem("api_tester_globals", JSON.stringify(globalVariables));
  updateGlobalBadge();
}

function setGlobal(key, val) {
  if (!key) return;
  globalVariables[key.trim()] = String(val !== undefined && val !== null ? val : "");
  saveGlobals();
}

function getGlobal(key) {
  return globalVariables[key] !== undefined ? globalVariables[key] : "";
}

function updateGlobalBadge() {
  const badge = document.getElementById('globalVarCount');
  if (!badge) return;
  const keys = Object.keys(globalVariables);
  badge.innerText = keys.length;
}

function substituteVariables(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/\{\{\s*([a-zA-Z0-9_\-\.]+)\s*\}\}/g, (match, key) => {
    return globalVariables[key] !== undefined ? globalVariables[key] : match;
  });
}

// Gắn vào window
window.DEFAULT_GLOBALS = DEFAULT_GLOBALS;
window.globalVariables = globalVariables;
window.initGlobals = initGlobals;
window.saveGlobals = saveGlobals;
window.setGlobal = setGlobal;
window.getGlobal = getGlobal;
window.updateGlobalBadge = updateGlobalBadge;
window.substituteVariables = substituteVariables;
