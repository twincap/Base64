const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const statusText = document.getElementById('statusText');
const transformBtn = document.getElementById('transformBtn');
const copyBtn = document.getElementById('copyBtn');
const clearBtn = document.getElementById('clearBtn');
const pasteBtn = document.getElementById('pasteBtn');
const liveMode = document.getElementById('liveMode');
const splitLines = document.getElementById('splitLines');
const charset = document.getElementById('charset');
const fileInput = document.getElementById('fileInput');
const decodeFileBtn = document.getElementById('decodeFileBtn');
const modeButtons = Array.from(document.querySelectorAll('.mode-btn'));

let currentMode = 'decode';
const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder();
let clipboardPermissionState = 'unknown';
let clipboardPromptAttempted = false;
let clipboardReadSucceeded = false;

async function refreshClipboardPermission() {
  if (!navigator.permissions || !navigator.permissions.query) {
    return clipboardPermissionState;
  }

  try {
    const status = await navigator.permissions.query({ name: 'clipboard-read' });
    clipboardPermissionState = status.state;
    status.onchange = () => {
      clipboardPermissionState = status.state;
    };
    return clipboardPermissionState;
  } catch (error) {
    clipboardPermissionState = 'unknown';
    return clipboardPermissionState;
  }
}

function canAutoPasteFromContextMenu(permissionState) {
  if (permissionState === 'granted') {
    return true;
  }
  if (permissionState === 'denied') {
    return false;
  }
  if (clipboardReadSucceeded) {
    return true;
  }
  return !clipboardPromptAttempted;
}

function noteClipboardDenied(error) {
  if (error && error.name === 'NotAllowedError') {
    clipboardPermissionState = 'denied';
    clipboardPromptAttempted = true;
    clipboardReadSucceeded = false;
  }
}

function setStatus(message, type = 'info') {
  statusText.textContent = message || '';
  statusText.dataset.type = type;
}

function normalizeBase64(value) {
  return value.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
}

function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToLatin1(bytes) {
  let output = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    output += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return output;
}

function encodeToBase64(text, encoding) {
  if (encoding === 'latin1') {
    for (let i = 0; i < text.length; i += 1) {
      if (text.charCodeAt(i) > 255) {
        throw new Error('Latin-1 only');
      }
    }
    return btoa(text);
  }
  return bytesToBase64(utf8Encoder.encode(text));
}

function decodeFromBase64(value, encoding) {
  const normalized = normalizeBase64(value);
  try {
    const bytes = base64ToBytes(normalized);
    if (encoding === 'latin1') {
      return bytesToLatin1(bytes);
    }
    return utf8Decoder.decode(bytes);
  } catch (error) {
    // Base64가 아닌 일반 텍스트면 그대로 반환
    return value;
  }
}

function processLines(value, transformFn) {
  return value
    .split(/\r?\n/)
    .map((line) => (line.trim() ? transformFn(line) : ''))
    .join('\n');
}

function transform() {
  const source = inputText.value;
  if (!source.trim()) {
    outputText.value = '';
    setStatus('입력 필요', 'warning');
    return;
  }

  try {
    let result;
    if (currentMode === 'decode') {
      if (splitLines.checked) {
        result = processLines(source, (line) => decodeFromBase64(line, charset.value));
      } else {
        result = decodeFromBase64(source, charset.value);
      }
      transformBtn.textContent = '디코딩';
      setStatus('완료', 'success');
    } else {
      if (splitLines.checked) {
        result = processLines(source, (line) => encodeToBase64(line, charset.value));
      } else {
        result = encodeToBase64(source, charset.value);
      }
      transformBtn.textContent = '인코딩';
      setStatus('완료', 'success');
    }
    outputText.value = result;
  } catch (error) {
    outputText.value = '';
    setStatus('오류', 'error');
  }
}

function setMode(mode) {
  currentMode = mode;
  modeButtons.forEach((button) => {
    const isActive = button.dataset.mode === mode;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });
  transformBtn.textContent = mode === 'decode' ? '디코딩' : '인코딩';
  if (liveMode.checked) {
    transform();
  }
}

modeButtons.forEach((button) => {
  button.addEventListener('click', () => setMode(button.dataset.mode));
});

inputText.addEventListener('input', () => {
  if (liveMode.checked) {
    transform();
  }
});

[liveMode, splitLines, charset].forEach((control) => {
  control.addEventListener('change', () => {
    if (liveMode.checked || control === splitLines || control === charset) {
      transform();
    }
  });
});

transformBtn.addEventListener('click', transform);

copyBtn.addEventListener('click', async () => {
  if (!outputText.value) {
    setStatus('결과 없음', 'warning');
    return;
  }

  try {
    await navigator.clipboard.writeText(outputText.value);
    setStatus('복사됨', 'success');
  } catch (error) {
    setStatus('복사 실패', 'error');
  }
});

clearBtn.addEventListener('click', () => {
  inputText.value = '';
  outputText.value = '';
  setStatus('지움', 'info');
  inputText.focus();
});

pasteBtn.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    inputText.value = text;
    if (liveMode.checked) {
      transform();
    }
    setStatus('붙여넣음', 'success');
    clipboardReadSucceeded = true;
    const permissionState = await refreshClipboardPermission();
    if (permissionState !== 'granted') {
      clipboardPromptAttempted = true;
    }
  } catch (error) {
    noteClipboardDenied(error);
    setStatus('붙여넣기 실패', 'error');
  }
});

function decodeSelectedFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const decoded = decodeFromBase64(text, charset.value);
        resolve(decoded);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error || new Error('파일을 읽을 수 없습니다.'));
    reader.readAsText(file);
  });
}

function downloadDecodedFile(decodedText, originalFileName) {
  const blob = new Blob([decodedText], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = originalFileName.replace(/\.[^.]+$/, '') + '-decoded.bin';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

decodeFileBtn.addEventListener('click', async () => {
  const file = fileInput.files && fileInput.files[0];
  if (!file) {
    setStatus('파일 필요', 'warning');
    return;
  }

  try {
    const decoded = await decodeSelectedFile(file);
    downloadDecodedFile(decoded, file.name);
    setStatus('파일 완료', 'success');
  } catch (error) {
    setStatus('파일 오류', 'error');
  }
});

inputText.addEventListener('contextmenu', async (e) => {
  const permissionState = await refreshClipboardPermission();
  if (!canAutoPasteFromContextMenu(permissionState)) {
    return;
  }

  e.preventDefault();
  clipboardPromptAttempted = true;
  try {
    const text = await navigator.clipboard.readText();
    inputText.value = text;
    if (liveMode.checked) {
      transform();
    }
    setStatus('붙여넣음', 'success');
    clipboardReadSucceeded = true;
    const nextPermissionState = await refreshClipboardPermission();
    if (nextPermissionState !== 'granted') {
      clipboardPromptAttempted = true;
    }
  } catch (error) {
    noteClipboardDenied(error);
    setStatus('붙여넣기 실패', 'error');
  }
});

outputText.addEventListener('click', async () => {
  if (!outputText.value) {
    setStatus('결과 없음', 'warning');
    return;
  }

  try {
    await navigator.clipboard.writeText(outputText.value);
    setStatus('복사됨', 'success');
  } catch (error) {
    setStatus('복사 실패', 'error');
  }
});

document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    transform();
  }
});

setMode('decode');
setStatus('');
refreshClipboardPermission();
inputText.focus();
