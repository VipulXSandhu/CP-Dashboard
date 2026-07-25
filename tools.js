// tools.js

document.addEventListener('DOMContentLoaded', () => {
  initToolsSidebar();
  initTypingWarmup();
  initBaseConverter();
  initTemplateManager();
  initJsonFormatter();
  initSmartCoachModal();
});

//  SIDEBAR TOGGLE 
function initToolsSidebar() {
  const toggleBtn = document.getElementById('toggle-tools');
  const sidebar = document.getElementById('tools-sidebar');
  const closeBtn = document.getElementById('close-tools');

  if (!toggleBtn || !sidebar || !closeBtn) return;

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.add('open');
  });

  closeBtn.addEventListener('click', () => {
    sidebar.classList.remove('open');
  });
}

//  1. TYPING WARMUP 
function initTypingWarmup() {
  const snippets = [
    "for(int i = 0; i < n; i++) { cin >> a[i]; }",
    "vector<int> adj[N];",
    "while(q--) { solve(); }",
    "void dfs(int u, int p) {",
    "const int MOD = 1e9 + 7;",
    "priority_queue<int, vector<int>, greater<int>> pq;"
  ];
  
  const textDisplay = document.getElementById('typing-text');
  const inputField = document.getElementById('typing-input');
  const wpmDisplay = document.getElementById('wpm-display');
  const resetBtn = document.getElementById('reset-typing');
  
  if (!textDisplay || !inputField) return;

  let currentSnippet = "";
  let startTime = null;
  let timerInterval = null;

  function loadSnippet() {
    currentSnippet = snippets[Math.floor(Math.random() * snippets.length)];
    
    textDisplay.innerHTML = "";
    for(let i=0; i<currentSnippet.length; i++) {
      const span = document.createElement('span');
      span.innerText = currentSnippet[i];
      textDisplay.appendChild(span);
    }
    inputField.value = "";
    inputField.disabled = false;
    wpmDisplay.innerText = "0 WPM";
    startTime = null;
    if (timerInterval) clearInterval(timerInterval);
  }

  // Auto-focus when clicking anywhere in the typing container
  const typingContainer = document.querySelector('.typing-container');
  if (typingContainer) {
    typingContainer.addEventListener('click', () => {
      inputField.focus();
    });
  }

  inputField.addEventListener('input', () => {
    if (!startTime && inputField.value.length > 0) {
      startTime = new Date();
      timerInterval = setInterval(updateWPM, 500);
    }

    const typed = inputField.value;
    const spans = textDisplay.querySelectorAll('span');
    
    let correctChars = 0;

    for (let i = 0; i < spans.length; i++) {
      if (i < typed.length) {
        if (typed[i] === currentSnippet[i]) {
          spans[i].style.color = "var(--accent-blue)";
          correctChars++;
        } else {
          spans[i].style.color = "#ff4d4f"; // error red
          spans[i].style.background = "rgba(255, 77, 79, 0.2)";
        }
      } else {
        spans[i].style.color = "var(--text-muted)";
        spans[i].style.background = "transparent";
      }
    }

    if (typed === currentSnippet) {
      clearInterval(timerInterval);
      inputField.disabled = true;
      setTimeout(() => {
        loadSnippet();
        inputField.focus();
      }, 1500);
    }
  });

  function updateWPM() {
    if (!startTime) return;
    const timeElapsed = (new Date() - startTime) / 60000; // in minutes
    const typed = inputField.value;
    const words = typed.length / 5;
    const wpm = Math.round(words / timeElapsed);
    wpmDisplay.innerText = `${wpm > 0 ? wpm : 0} WPM`;
  }

  resetBtn.addEventListener('click', () => {
    loadSnippet();
    inputField.focus();
  });

  // Initialize
  loadSnippet();
}

//  2. BASE CONVERTER 
function initBaseConverter() {
  const decInput = document.getElementById('base-dec');
  const binInput = document.getElementById('base-bin');
  const hexInput = document.getElementById('base-hex');

  if (!decInput || !binInput || !hexInput) return;

  function updateFromDec(val) {
    if (val === "" || isNaN(val)) {
      binInput.value = "";
      hexInput.value = "";
      return;
    }
    const num = parseInt(val, 10);
    binInput.value = num.toString(2);
    hexInput.value = num.toString(16).toUpperCase();
  }

  function updateFromBin(val) {
    if (val === "" || !/^[01]+$/.test(val)) {
      decInput.value = "";
      hexInput.value = "";
      return;
    }
    const num = parseInt(val, 2);
    decInput.value = num.toString(10);
    hexInput.value = num.toString(16).toUpperCase();
  }

  function updateFromHex(val) {
    if (val === "" || !/^[0-9A-Fa-f]+$/.test(val)) {
      decInput.value = "";
      binInput.value = "";
      return;
    }
    const num = parseInt(val, 16);
    decInput.value = num.toString(10);
    binInput.value = num.toString(2);
  }

  decInput.addEventListener('input', (e) => updateFromDec(e.target.value));
  binInput.addEventListener('input', (e) => updateFromBin(e.target.value));
  hexInput.addEventListener('input', (e) => updateFromHex(e.target.value));
}

//  3. TEMPLATE MANAGER 
function initTemplateManager() {
  const select = document.getElementById('snippet-select');
  const textarea = document.getElementById('snippet-code');
  const copyBtn = document.getElementById('copy-snippet');

  if (!select || !textarea || !copyBtn) return;

  const defaultSnippets = {
    'cpp-fastio': `ios_base::sync_with_stdio(false);\ncin.tie(NULL);`,
    'cpp-segtree': `// Basic Segment Tree structure\nstruct SegTree {\n  int n;\n  vector<int> tree;\n  SegTree(int n) : n(n), tree(4*n, 0) {}\n};`,
    'py-sys': `import sys\ninput = sys.stdin.read\nprint = sys.stdout.write`
  };

  function updateSnippet() {
    textarea.value = defaultSnippets[select.value] || "";
  }

  select.addEventListener('change', updateSnippet);
  updateSnippet();

  copyBtn.addEventListener('click', () => {
    textarea.select();
    document.execCommand('copy');
    const originalText = copyBtn.innerText;
    copyBtn.innerText = "Copied!";
    setTimeout(() => {
      copyBtn.innerText = originalText;
    }, 1500);
  });
}

//  4. JSON FORMATTER 
function initJsonFormatter() {
  const input = document.getElementById('json-input');
  const output = document.getElementById('json-output');
  const formatBtn = document.getElementById('format-json');
  const minifyBtn = document.getElementById('minify-json');

  if (!input || !output || !formatBtn || !minifyBtn) return;

  formatBtn.addEventListener('click', () => {
    try {
      const parsed = JSON.parse(input.value);
      output.value = JSON.stringify(parsed, null, 2);
    } catch (e) {
      output.value = "Error: Invalid JSON\n" + e.message;
    }
  });

  minifyBtn.addEventListener('click', () => {
    try {
      const parsed = JSON.parse(input.value);
      output.value = JSON.stringify(parsed);
    } catch (e) {
      output.value = "Error: Invalid JSON\n" + e.message;
    }
  });
}


// SMART COACH MODAL
function initSmartCoachModal() {
  const openBtn = document.getElementById('open-coach-modal-btn');
  const closeBtn = document.getElementById('coach-close');
  const overlay = document.getElementById('coach-overlay');
  
  if(openBtn) {
    openBtn.addEventListener('click', () => {
      if(overlay) {
        overlay.classList.add('active');
        // Initialize analyzer if not done yet
        if(typeof initAnalyzer === 'function') {
          if(typeof loadFromStorage === 'function') {
            loadFromStorage('userProfiles', (profiles) => {
              initAnalyzer(profiles?.cf);
            });
          }
        }
      }
    });
  }
  
  if(closeBtn) {
    closeBtn.addEventListener('click', () => {
      if(overlay) overlay.classList.remove('active');
    });
  }
  
  if(overlay) {
    overlay.addEventListener('click', (e) => {
      if(e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  }
}

