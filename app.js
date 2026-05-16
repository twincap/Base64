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

function setStatus(message, type = 'info') {
  statusText.textContent = message;
  statusText.dataset.type = type;
}

function normalizeBase64(value) {
  return value.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
}

function encodeToBase64(text, encoding) {
  if (encoding === 'latin1') {
    return btoa(unescape(encodeURIComponent(text)));
  }
  return btoa(unescape(encodeURIComponent(text)));
}

function decodeFromBase64(value, encoding) {
  const normalized = normalizeBase64(value);
  try {
    const decoded = atob(normalized);
    if (encoding === 'latin1') {
      return decodeURIComponent(escape(decoded));
    }
    return decodeURIComponent(escape(decoded));
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
    setStatus('입력값을 먼저 넣어주세요.', 'warning');
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
      setStatus('디코딩이 완료되었습니다.', 'success');
    } else {
      if (splitLines.checked) {
        result = processLines(source, (line) => encodeToBase64(line, charset.value));
      } else {
        result = encodeToBase64(source, charset.value);
      }
      transformBtn.textContent = '인코딩';
      setStatus('에 실패했습니다ss');
    }
    outputText.value = result;
  } catch (error) {
    outputText.value = '';
    setStatus('변환할 수 없습니다. 입력 형식을 확인하세요.', 'error');
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
    setStatus('복사할 결과가 없습니다.', 'warning');
    return;
  }

  try {
    await navigator.clipboard.writeText(outputText.value);
    setStatus('결과를 클립보드에 복사했습니다.', 'success');
  } catch (error) {
    setStatus('클립보드 복사에 실패했습니다.', 'error');
  }
});

clearBtn.addEventListener('click', () => {
  inputText.value = '';
  outputText.value = '';
  setStatus('입력과 결과를 지웠습니다.', 'info');
  inputText.focus();
});

pasteBtn.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    inputText.value = text;
    if (liveMode.checked) {
      transform();
    }
    setStatus('클립보드에서 붙여넣었습니다.', 'success');
  } catch (error) {
    setStatus('클립보드에서 읽을 수 없습니다.', 'error');
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
inputText.addEventListener('contextmenu', async (e) => {
  e.preventDefault();
  try {
    const text = await navigator.clipboard.readText();
    inputText.value = text;
    if (liveMode.checked) {
      transform();
    }
  } catch (error) {
    setStatus('클립보드에서 읽을 수 없습니다.', 'error');
  }
});

outputText.addEventListener('click', async () => {
  if (!outputText.value) {
    setStatus('복사할 결과가 없습니다.', 'warning');
    return;
  }

  try {
    await navigator.clipboard.writeText(outputText.value);
    setStatus('결과를 클립보드에 복사했습니다.', 'success');
  } catch (error) {
    setStatus('클립보드 복사에 실패했습니다.', 'error');
  }
});

setMode('decode');
setStatus('Base64 변환 도구가 준비되었습니다.', 'info');
