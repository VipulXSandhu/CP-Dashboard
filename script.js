/* ============================================
   CP Dashboard v2 - Multi-Platform Logic
   ============================================ */

// ─── Constants ──────────────────────────────────
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const CF_RANKS = [
  { max: 1199, name: 'Newbie', color: '#808080' },
  { max: 1399, name: 'Pupil', color: '#008000' },
  { max: 1599, name: 'Specialist', color: '#03a89e' },
  { max: 1899, name: 'Expert', color: '#0000ff' },
  { max: 2099, name: 'Candidate Master', color: '#aa00aa' },
  { max: 2299, name: 'Master', color: '#ff8c00' },
  { max: 2399, name: 'International Master', color: '#ff8c00' },
  { max: 2599, name: 'Grandmaster', color: '#ff0000' },
  { max: 2899, name: 'Intl. Grandmaster', color: '#ff0000' },
  { max: Infinity, name: 'Legendary GM', color: '#ff0000' },
];

// ─── Utility Functions ──────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(match) {
    const escape = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return escape[match];
  });
}

// ─── Theme & Profile Lock ───────────────────────
let profilesLocked = false;
let profilePassword = null;
let _themeManualOverride = false; // tracks if user manually toggled theme
let _themeOverridePeriod = null;  // 'day' or 'night' — the period when user overrode

function initTheme() {
  // Load persisted manual override state
  loadFromStorage('themeManualOverride', (saved) => {
    if (saved) {
      _themeManualOverride = saved.active || false;
      _themeOverridePeriod = saved.period || null;
    }
  });

  loadFromStorage('theme', (savedTheme) => {
    const theme = savedTheme || 'dark';
    document.body.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
  });
  
  document.getElementById('toggle-theme').addEventListener('click', () => {
    const currentTheme = document.body.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    updateThemeIcon(newTheme);
    saveToStorage('theme', newTheme);

    // Mark manual override and record which period we're in
    _themeManualOverride = true;
    _themeOverridePeriod = _getCurrentPeriod();
    saveToStorage('themeManualOverride', { active: true, period: _themeOverridePeriod });
  });
}

function _getCurrentPeriod() {
  const cached = window._cachedWeather;
  if (!cached || !cached.sunrise || !cached.sunset) return null;
  const now = new Date();
  const sunrise = new Date(cached.sunrise);
  const sunset = new Date(cached.sunset);
  return (now >= sunrise && now < sunset) ? 'day' : 'night';
}

function autoSwitchTheme() {
  // Auto-switch theme based on sunrise/sunset from cached weather data
  const cached = window._cachedWeather;
  if (!cached || !cached.sunrise || !cached.sunset) return;

  const now = new Date();
  const sunrise = new Date(cached.sunrise);
  const sunset = new Date(cached.sunset);

  // Determine the correct theme based on time of day
  const isNowDay = now >= sunrise && now < sunset;
  const currentPeriod = isNowDay ? 'day' : 'night';
  const shouldBeTheme = isNowDay ? 'light' : 'dark';
  const currentTheme = document.body.getAttribute('data-theme') || 'dark';

  // If user manually overrode, only reset when the period actually changes
  if (_themeManualOverride) {
    if (_themeOverridePeriod && _themeOverridePeriod !== currentPeriod) {
      // Period changed (e.g. day→night), clear the override
      _themeManualOverride = false;
      _themeOverridePeriod = null;
      saveToStorage('themeManualOverride', { active: false, period: null });
    } else {
      return; // still in the same period, respect manual override
    }
  }

  if (currentTheme !== shouldBeTheme) {
    document.body.setAttribute('data-theme', shouldBeTheme);
    updateThemeIcon(shouldBeTheme);
    saveToStorage('theme', shouldBeTheme);
  }
}

function updateThemeIcon(theme) {
  const moon = document.querySelector('.moon-icon');
  const sun = document.querySelector('.sun-icon');
  if (theme === 'light') {
    moon.style.display = 'none';
    sun.style.display = 'block';
  } else {
    moon.style.display = 'block';
    sun.style.display = 'none';
  }
  if (typeof applyWallpaper === 'function') applyWallpaper();
}

function initLock() {
  loadFromStorage('profilesLocked', (locked) => {
    profilesLocked = !!locked;
    updateLockUI();
  });
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['profilePassword'], (result) => {
      profilePassword = result.profilePassword || null;
    });
  } else {
    profilePassword = localStorage.getItem('profilePassword') || null;
  }

  document.getElementById('lock-btn').addEventListener('click', () => {
    const prompt = document.getElementById('unlock-prompt');
    const promptText = document.getElementById('unlock-prompt-text');
    const input = document.getElementById('unlock-input');
    
    prompt.classList.remove('hidden');
    input.value = '';
    
    if (!profilesLocked) {
      promptText.textContent = "Set a password to lock:";
    } else {
      promptText.textContent = "Enter password to unlock:";
    }
    setTimeout(() => input.focus(), 100);
  });

  document.getElementById('unlock-confirm-btn').addEventListener('click', () => {
    const input = document.getElementById('unlock-input');
    const val = input.value.trim();
    if (!val) return;

    if (!profilesLocked) {
      // Setting password and locking
      profilePassword = val;
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ profilePassword: val });
      } else {
        localStorage.setItem('profilePassword', val);
      }
      profilesLocked = true;
      saveToStorage('profilesLocked', true);
      input.value = '';
      document.getElementById('unlock-prompt').classList.add('hidden');
      updateLockUI();
    } else {
      // Unlocking
      if (val === profilePassword || !profilePassword) { // fallback if no pwd
        profilesLocked = false;
        saveToStorage('profilesLocked', false);
        input.value = '';
        document.getElementById('unlock-prompt').classList.add('hidden');
        updateLockUI();
      } else {
        input.style.border = '1px solid #ef4444';
        setTimeout(() => input.style.border = '', 1000);
      }
    }
  });
}

function updateLockUI() {
  const inputs = [document.getElementById('cf-handle'), document.getElementById('lc-handle'), document.getElementById('cc-handle')];
  const lockBtnText = document.getElementById('lock-btn-text');
  const lockStatus = document.getElementById('lock-status');
  const saveBtn = document.getElementById('save-profiles');
  const lockBtn = document.getElementById('lock-btn');
  const lockIcon = document.getElementById('lock-icon');
  
  if (profilesLocked) {
    inputs.forEach(input => { input.disabled = true; input.style.opacity = '0.6'; });
    lockBtnText.textContent = 'Unlock Profiles';
    lockStatus.textContent = 'Status: Locked';
    lockStatus.style.color = '#34d399';
    saveBtn.disabled = true;
    saveBtn.style.opacity = '0.5';
    lockBtn.style.color = '#34d399';
    lockBtn.style.borderColor = 'rgba(52, 211, 153, 0.3)';
    lockBtn.style.background = 'rgba(52, 211, 153, 0.1)';
    lockIcon.innerHTML = `<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path>`;
  } else {
    inputs.forEach(input => { input.disabled = false; input.style.opacity = '1'; });
    lockBtnText.textContent = 'Lock Profiles';
    lockStatus.textContent = 'Status: Unlocked';
    lockStatus.style.color = 'var(--text-secondary)';
    saveBtn.disabled = false;
    saveBtn.style.opacity = '1';
    lockBtn.style.color = '#ef4444';
    lockBtn.style.borderColor = 'rgba(239, 68, 68, 0.3)';
    lockBtn.style.background = 'rgba(239, 68, 68, 0.1)';
    lockIcon.innerHTML = `<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>`;
  }
}

// ─── Storage Helpers ────────────────────────────
function saveToStorage(key, value) {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const data = {};
      data[key] = value;
      chrome.storage.local.set(data);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (e) {
    console.warn('Storage save failed:', e);
  }
}

function loadFromStorage(key, callback) {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(key, (result) => {
        callback(result[key] || null);
      });
    } else {
      const item = localStorage.getItem(key);
      callback(item ? JSON.parse(item) : null);
    }
  } catch (e) {
    console.warn('Storage load failed:', e);
    callback(null);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ─── Clock & Date ───────────────────────────────
let isAnalogClock = false;
let digitalClockStyle = 'default';
let analogClockStyle = 'default';
let lightWallpaperStyle = 'dynamic-default';
let darkWallpaperStyle = 'dynamic-default';

loadFromStorage('isAnalogClock', (val) => {
  if (val !== null) isAnalogClock = val;
});
loadFromStorage('digitalClockStyle', (val) => {
  if (val) digitalClockStyle = val;
});
loadFromStorage('analogClockStyle', (val) => {
  if (val) analogClockStyle = val;
});
loadFromStorage('lightWallpaperStyle', (val) => {
  if (val) lightWallpaperStyle = val;
  if (typeof applyWallpaper === 'function') applyWallpaper();
});
loadFromStorage('darkWallpaperStyle', (val) => {
  if (val) darkWallpaperStyle = val;
  if (typeof applyWallpaper === 'function') applyWallpaper();
});

function applyWallpaper() {
  const isLight = document.body.getAttribute('data-theme') === 'light';
  const wallpaperSetting = isLight ? lightWallpaperStyle : darkWallpaperStyle;
  
  document.body.className = document.body.className.replace(/\bbg-static-\S+/g, '').trim();
  
  if (wallpaperSetting.startsWith('static-')) {
    document.body.classList.add('bg-' + wallpaperSetting);
  }
}

function updateLunarPhase(date) {
  const container = document.getElementById('moon-container');
  if (!container) return;
  
  const knownNewMoon = new Date(Date.UTC(2000, 0, 6, 18, 14, 0)).getTime();
  const lunarMonth = 29.53058770576 * 24 * 60 * 60 * 1000;
  let phase = ((date.getTime() - knownNewMoon) % lunarMonth) / lunarMonth;
  if (phase < 0) phase += 1;
  
  const isWaxing = phase <= 0.5;
  const terminatorPos = Math.cos(phase * 2 * Math.PI); 
  const rx = Math.max(Math.abs(terminatorPos) * 50, 0.1); 
  
  let sweep = 0;
  if (isWaxing) sweep = terminatorPos < 0 ? 1 : 0;
  else sweep = terminatorPos < 0 ? 1 : 0;

  const shadowPath = isWaxing 
    ? `M 50,0 A 50,50 0 0,0 50,100 A ${rx},50 0 0,${sweep} 50,0 Z`
    : `M 50,0 A 50,50 0 0,1 50,100 A ${rx},50 0 0,${sweep} 50,0 Z`;

  container.innerHTML = `
    <svg viewBox="0 0 100 100" width="100%" height="100%" style="border-radius: 50%;">
      <defs>
        <mask id="phaseMask">
          <rect x="0" y="0" width="100" height="100" fill="white" />
          <path d="${shadowPath}" fill="black" />
        </mask>
        <radialGradient id="moonGlow" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="30%" stop-color="#f8fafc" />
          <stop offset="60%" stop-color="#cbd5e1" />
          <stop offset="85%" stop-color="#64748b" />
          <stop offset="100%" stop-color="#334155" />
        </radialGradient>
        <radialGradient id="innerShadow" cx="50%" cy="50%" r="50%">
          <stop offset="70%" stop-color="rgba(0,0,0,0)" />
          <stop offset="100%" stop-color="rgba(0,0,0,0.8)" />
        </radialGradient>
        <radialGradient id="highlight" cx="20%" cy="20%" r="50%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.6)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      
      <g mask="url(#phaseMask)">
        <!-- Base moon -->
        <circle cx="50" cy="50" r="50" fill="url(#moonGlow)" />
        
        <!-- Lunar Maria (dark seas) for 3D realism -->
        <path d="M 15 40 Q 30 20 45 40 T 25 65 Z" fill="rgba(0,0,0,0.12)" />
        <path d="M 55 15 Q 75 5 85 25 T 65 45 Z" fill="rgba(0,0,0,0.15)" />
        <path d="M 45 60 Q 65 50 85 70 T 55 90 Z" fill="rgba(0,0,0,0.18)" />
        <path d="M 10 65 Q 25 50 40 70 T 15 85 Z" fill="rgba(0,0,0,0.1)" />
        <path d="M 70 45 Q 85 40 95 60 T 75 75 Z" fill="rgba(0,0,0,0.12)" />

        <!-- Craters -->
        <circle cx="30" cy="45" r="5" fill="rgba(0,0,0,0.15)" stroke="rgba(255,255,255,0.4)" stroke-width="0.5" />
        <circle cx="75" cy="55" r="7" fill="rgba(0,0,0,0.18)" stroke="rgba(255,255,255,0.3)" stroke-width="0.5" />
        <circle cx="50" cy="25" r="4" fill="rgba(0,0,0,0.12)" stroke="rgba(255,255,255,0.4)" stroke-width="0.3" />
        <circle cx="35" cy="75" r="6" fill="rgba(0,0,0,0.15)" stroke="rgba(255,255,255,0.3)" stroke-width="0.5" />
        <circle cx="60" cy="80" r="3" fill="rgba(0,0,0,0.2)" stroke="rgba(255,255,255,0.2)" stroke-width="0.2" />
        
        <!-- 3D Overlays -->
        <circle cx="50" cy="50" r="50" fill="url(#innerShadow)" />
        <circle cx="50" cy="50" r="50" fill="url(#highlight)" />
      </g>
    </svg>
  `;
}

function updateClock() {
  const now = new Date();
  
  // Toggle Visibility and Styles
  const digi = document.getElementById('digital-clock');
  const ana = document.getElementById('analog-clock');
  if (digi && ana) {
    // Reset style classes
    digi.className = 'clock digital-' + digitalClockStyle;
    ana.className = 'analog-clock analog-' + analogClockStyle;
    
    if (isAnalogClock) {
      digi.classList.add('hidden');
      ana.classList.remove('hidden');
    } else {
      digi.classList.remove('hidden');
      ana.classList.add('hidden');
    }
  }

  // Update Digital
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  if (digi) {
    digi.innerHTML = `
      <span class="clock-hour">${hours}</span><span class="clock-colon">:</span><span class="clock-minute">${minutes}</span><span class="clock-second">${seconds}</span>
    `;
  }
  
  // Update Analog
  const hh = document.getElementById('hour-hand');
  const mh = document.getElementById('minute-hand');
  const sh = document.getElementById('second-hand');
  
  if (hh && mh && sh) {
    const ms = now.getMilliseconds();
    const sDeg = ((now.getSeconds() + ms/1000) / 60) * 360;
    const mDeg = ((now.getMinutes() + now.getSeconds() / 60) / 60) * 360;
    const hDeg = ((now.getHours() % 12 + now.getMinutes() / 60) / 12) * 360;
    
    sh.style.transform = `rotate(${sDeg}deg)`;
    mh.style.transform = `rotate(${mDeg}deg)`;
    hh.style.transform = `rotate(${hDeg}deg)`;
  }

  // Lunar Phase Logic
  if (isAnalogClock && analogClockStyle === 'lunar') {
    updateLunarPhase(now);
    const ldt = document.getElementById('lunar-digital-time');
    if (ldt) ldt.textContent = `${hours}:${minutes}`;
  }

  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('date').textContent = now.toLocaleDateString('en-US', options);

  const hour = now.getHours();
  let greeting = 'Good Evening';
  if (hour >= 5 && hour < 12) greeting = 'Good Morning';
  else if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';
  else if (hour >= 17 && hour < 21) greeting = 'Good Evening';
  else greeting = 'Happy Late Night Coding';

  document.getElementById('greeting').textContent = greeting;

  // Update Weather Icon from cached weather data
  const weatherIconEl = document.getElementById('weather-icon');
  const weatherTempEl = document.getElementById('weather-temp');
  const weatherSmartTipEl = document.getElementById('weather-smart-tip');
  if (weatherIconEl && window._cachedWeather) {
    const w = window._cachedWeather;
    weatherIconEl.textContent = w.icon;
    if (weatherTempEl) {
      weatherTempEl.textContent = `${Math.round(w.temp)}°C`;
    }
    const weatherDisplay = document.getElementById('weather-display');
    if (weatherDisplay) {
      weatherDisplay.title = `${w.description} • ${Math.round(w.temp)}°C — ${w.location}${w.aqi ? ' • AQI: ' + w.aqi : ''}`;
    }
    if (weatherSmartTipEl) {
      weatherSmartTipEl.textContent = getWeatherSmartTip(w.weatherCode, w.temp, w.isDay, w.aqi);
    }
  }
}

// ─── Contests (Multi-Platform) ──────────────────
function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function getCountdown(startTime) {
  const now = Date.now();
  const diff = Math.floor((startTime - now) / 1000);
  if (diff <= 0) return 'Started';

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const mins = Math.floor((diff % 3600) / 60);

  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${mins}m`;
  return `in ${mins}m`;
}

// Contest fetching is now handled by background.js to bypass CORS issues.

function renderContests(contests) {
  const container = document.getElementById('contests-list');

  if (!contests || contests.length === 0) {
    container.innerHTML = `
      <div class="no-contests">
        <p>No upcoming contests found right now.</p>
        <p style="margin-top:6px; font-size: 0.75rem;">Check back later!</p>
      </div>`;
    return;
  }

  const upcoming = contests.slice(0, 8);

  container.innerHTML = upcoming.map(contest => {
    const startDate = new Date(contest.startTime);
    const day = startDate.getDate();
    const month = MONTHS_SHORT[startDate.getMonth()];
    const time = startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const duration = formatDuration(contest.duration);
    const countdown = getCountdown(contest.startTime);
    const platformClass = contest.platform === 'CF' ? 'cf-contest' :
                          contest.platform === 'LC' ? 'lc-contest' : 'cc-contest';
    const platformLogo = contest.platform === 'CF' ? 'icons/cf-logo.svg' :
                         contest.platform === 'LC' ? 'icons/lc-logo.svg' : 'icons/cc-logo.svg';

    return `
      <div class="contest-item">
        <div class="contest-platform-badge ${platformClass}">
          <img src="${platformLogo}" class="platform-logo" alt="${contest.platform}">
          <span class="day-tag">${month} ${day}</span>
        </div>
        <div class="contest-info">
          <div class="contest-name">
            <a href="${escapeHtml(contest.url)}" target="_blank" rel="noopener">${escapeHtml(contest.name)}</a>
            <button class="contest-reminder-btn" data-name="${escapeHtml(contest.name)}" data-platform="${contest.platform}" data-start="${contest.startTime}" title="Set reminder (15 mins before)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            </button>
          </div>
          <div class="contest-meta">
            <span class="contest-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${time}
            </span>
            <span class="contest-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              ${duration}
            </span>
            <span class="contest-countdown">${countdown}</span>
          </div>
        </div>
      </div>`;
  }).join('');

  // Attach reminder button logic
  const reminderBtns = container.querySelectorAll('.contest-reminder-btn');
  reminderBtns.forEach(btn => {
    const alarmName = `contest_reminder_${btn.dataset.name}`;
    chrome.storage.local.get('contestReminders', (result) => {
      const reminders = result.contestReminders || {};
      if (reminders[alarmName]) {
        btn.classList.add('active');
        btn.title = "Cancel reminder";
      }
    });

    btn.addEventListener('click', () => {
      const contestName = btn.dataset.name;
      const platform = btn.dataset.platform;
      const startTime = parseInt(btn.dataset.start, 10);
      const currentAlarmName = `contest_reminder_${contestName}`;

      chrome.storage.local.get('contestReminders', (result) => {
        const reminders = result.contestReminders || {};

        if (reminders[currentAlarmName]) {
          chrome.alarms.clear(currentAlarmName);
          delete reminders[currentAlarmName];
          chrome.storage.local.set({ contestReminders: reminders }, () => {
            btn.classList.remove('active');
            btn.title = "Set reminder (15 mins before)";
          });
        } else {
          const reminderTime = startTime - (15 * 60 * 1000); // 15 mins before
          if (reminderTime > Date.now()) {
            chrome.alarms.create(currentAlarmName, { when: reminderTime });
            reminders[currentAlarmName] = { name: contestName, platform: platform, startTime: startTime };
            chrome.storage.local.set({ contestReminders: reminders }, () => {
              btn.classList.add('active');
              btn.title = "Cancel reminder";
            });
          } else {
            alert("This contest is starting too soon to set a reminder!");
          }
        }
      });
    });
  });
}

async function fetchAllContests() {
  const container = document.getElementById('contests-list');
  const refreshBtn = document.getElementById('refresh-contests');

  container.innerHTML = `
    <div class="loading-skeleton">
      <div class="skeleton-row"></div>
      <div class="skeleton-row"></div>
      <div class="skeleton-row"></div>
    </div>`;

  refreshBtn.classList.add('spinning');

  try {
    const allContests = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'fetchContests' }, response => {
        if (chrome.runtime.lastError || !response) {
          reject(chrome.runtime.lastError || new Error("No response from background"));
        } else {
          resolve(response);
        }
      });
    });

    if (allContests.length === 0) {
      throw new Error('All contest APIs failed or returned empty');
    }

    allContests.sort((a, b) => a.startTime - b.startTime);

    // Keep only the next upcoming contest for each platform
    const seenPlatforms = new Set();
    const filteredContests = [];
    for (const contest of allContests) {
      if (!seenPlatforms.has(contest.platform)) {
        seenPlatforms.add(contest.platform);
        filteredContests.push(contest);
      }
    }

    renderContests(filteredContests);
    saveToStorage('cachedContests', filteredContests);
    saveToStorage('contestsCacheTime', Date.now());
  } catch (err) {
    console.error('Failed to fetch contests:', err);
    loadFromStorage('cachedContests', (cached) => {
      if (cached && cached.length > 0) {
        renderContests(cached);
      } else {
        container.innerHTML = `
          <div class="contests-error">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p>Could not load contests.</p>
            <p style="margin-top:4px; font-size: 0.75rem;">Check your internet and click refresh.</p>
          </div>`;
      }
    });
  } finally {
    refreshBtn.classList.remove('spinning');
  }
}

// ─── Past Unsolved (AI Upsolving) ──────────────────────────
async function fetchAndRenderPastUnsolved() {
  const container = document.getElementById('contests-list');
  container.innerHTML = `<div class="loading-skeleton"><div class="skeleton-row"></div><div class="skeleton-row"></div></div>`;
  
  loadFromStorage('userProfiles', async (profiles) => {
    if (!profiles || !profiles.cf) {
      container.innerHTML = `<div class="no-contests"><p>Connect your Codeforces account to see past unsolved problems.</p></div>`;
      return;
    }
    try {
      const resp = await fetch(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(profiles.cf)}&from=1&count=100`);
      const data = await resp.json();
      if (data.status !== 'OK') throw new Error('API failed');
      
      const unsolvedMap = new Map();
      const solvedSet = new Set();
      
      data.result.forEach(sub => {
        const pName = sub.problem.name;
        if (sub.verdict === 'OK') {
          solvedSet.add(pName);
        } else if (sub.verdict !== 'TESTING') {
          if (!unsolvedMap.has(pName)) unsolvedMap.set(pName, sub.problem);
        }
      });
      
      const unsolvedList = [];
      unsolvedMap.forEach((prob, name) => {
        if (!solvedSet.has(name)) unsolvedList.push(prob);
      });
      
      if (unsolvedList.length === 0) {
        container.innerHTML = `<div class="no-contests"><p>No recent unsolved problems found! 🎉</p></div>`;
        return;
      }
      
      container.innerHTML = unsolvedList.slice(0, 10).map(prob => {
        const url = `https://codeforces.com/problemset/problem/${prob.contestId}/${prob.index}`;
        return `
          <div class="contest-item">
            <div class="contest-platform-badge cf-contest">
              <img src="icons/cf-logo.svg" class="platform-logo" alt="CF">
            </div>
            <div class="contest-info">
              <div class="contest-name">
                <a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(prob.name)}</a>
                <button class="ask-ai-btn" data-name="${escapeHtml(prob.name)}" data-platform="Codeforces">Ask AI ✨</button>
              </div>
              <div class="contest-meta">
                <span class="contest-meta-item">Contest ${prob.contestId} - Problem ${prob.index}</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
      
      // Attach AI logic
      container.querySelectorAll('.ask-ai-btn').forEach(btn => {
        btn.addEventListener('click', () => openAIChat(btn.dataset.platform, btn.dataset.name));
      });
    } catch (e) {
      container.innerHTML = `<div class="no-contests"><p>Failed to load problems.</p></div>`;
    }
  });
}

// ─── AI Chat Modal ───────────────────────────────
function openAIChat(platform, problemName) {
  const overlay = document.getElementById('ai-chat-overlay');
  const chatMessages = document.getElementById('ai-chat-messages');
  overlay.classList.add('active');
  
  chatMessages.innerHTML = `
    <div class="chat-msg bot">
      Hi! I see you want a hint for <strong>${escapeHtml(problemName)}</strong> from ${escapeHtml(platform)}. 
      <br><br>What have you tried so far?
    </div>
  `;
  
  // Store context for the form submission
  overlay.dataset.problemContext = `Problem: ${problemName} (${platform})`;
}

document.getElementById('ai-chat-close').addEventListener('click', () => {
  document.getElementById('ai-chat-overlay').classList.remove('active');
});

document.getElementById('ai-chat-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('ai-chat-input');
  const text = input.value.trim();
  if (!text) return;
  
  const chatMessages = document.getElementById('ai-chat-messages');
  const context = document.getElementById('ai-chat-overlay').dataset.problemContext;
  
  // Add user message
  const userMsg = document.createElement('div');
  userMsg.className = 'chat-msg user';
  userMsg.textContent = text;
  chatMessages.appendChild(userMsg);
  input.value = '';
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  // Add loading bot message
  const botMsg = document.createElement('div');
  botMsg.className = 'chat-msg bot';
  botMsg.innerHTML = '<div class="spinner"></div>';
  chatMessages.appendChild(botMsg);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Send to background script
  chrome.runtime.sendMessage({ action: 'askAI', prompt: text, context: context }, response => {
    botMsg.innerHTML = '';
    if (chrome.runtime.lastError || !response || response.error) {
      botMsg.textContent = "Error: " + (chrome.runtime.lastError?.message || response?.error || "Unknown error");
    } else {
      botMsg.innerHTML = response.reply.replace(/\\n/g, '<br>');
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
});

// ─── User Ratings ───────────────────────────────
function getCFRankInfo(rating) {
  for (const rank of CF_RANKS) {
    if (rating <= rank.max) return rank;
  }
  return CF_RANKS[CF_RANKS.length - 1];
}

function showRatingLoading(platform) {
  const body = document.getElementById(`${platform}-rating-body`);
  const prompt = document.getElementById(`${platform}-prompt`);
  const info = document.getElementById(`${platform}-info`);
  if (prompt) prompt.classList.add('hidden');
  if (info) info.classList.add('hidden');
  // Insert a small loading spinner
  const existing = body.querySelector('.rating-loading');
  if (!existing) {
    const loader = document.createElement('div');
    loader.className = 'rating-loading';
    loader.innerHTML = '<div class="spinner"></div><div>Loading...</div>';
    body.appendChild(loader);
  }
}

function hideRatingLoading(platform) {
  const body = document.getElementById(`${platform}-rating-body`);
  const loader = body.querySelector('.rating-loading');
  if (loader) loader.remove();
}

function showRatingError(platform, message) {
  hideRatingLoading(platform);
  const body = document.getElementById(`${platform}-rating-body`);
  const prompt = document.getElementById(`${platform}-prompt`);
  const info = document.getElementById(`${platform}-info`);
  if (prompt) prompt.classList.add('hidden');
  if (info) info.classList.add('hidden');
  const existing = body.querySelector('.rating-error');
  if (existing) existing.remove();
  const errorDiv = document.createElement('div');
  errorDiv.className = 'rating-error';
  errorDiv.textContent = message;
  body.appendChild(errorDiv);
}

function showRatingPrompt(platform) {
  const prompt = document.getElementById(`${platform}-prompt`);
  const info = document.getElementById(`${platform}-info`);
  if (prompt) prompt.classList.remove('hidden');
  if (info) info.classList.add('hidden');
}

async function fetchCFRating(handle) {
  if (!handle) { showRatingPrompt('cf'); return; }
  showRatingLoading('cf');
  try {
    const resp = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`);
    const data = await resp.json();
    if (data.status === 'OK' && data.result && data.result.length > 0) {
      const user = data.result[0];
      const rating = user.rating || 0;
      const maxRating = user.maxRating || 0;
      const rankInfo = getCFRankInfo(rating);

      hideRatingLoading('cf');
      document.getElementById('cf-prompt').classList.add('hidden');
      document.getElementById('cf-info').classList.remove('hidden');
      document.getElementById('cf-rating').textContent = rating;
      document.getElementById('cf-rating').style.color = rankInfo.color;
      document.getElementById('cf-rank').textContent = rankInfo.name;
      document.getElementById('cf-rank').style.color = rankInfo.color;
      document.getElementById('cf-max-rating').textContent = maxRating;

      saveToStorage('cfRatingCache', { handle, rating, maxRating, rank: rankInfo.name, color: rankInfo.color, time: Date.now() });
      
      // Fetch solved stats async
      fetchWithTimeout(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}`, 8000)
        .then(r => r.json())
        .then(solvedData => {
          if (solvedData.status === 'OK') {
            const solvedCount = new Set(solvedData.result.filter(s => s.verdict === 'OK').map(s => s.problem.name)).size;
            document.getElementById('cf-solved').textContent = solvedCount;
            saveToStorage('cfSolvedCache', { handle, count: solvedCount });
          }
        }).catch(e => console.warn('CF solved fetch failed', e));

    } else {
      showRatingError('cf', `Handle "${handle}" not found`);
    }
  } catch (e) {
    console.warn('CF rating fetch failed:', e);
    // Try loading from cache
    loadFromStorage('cfRatingCache', (cached) => {
      if (cached && cached.handle === handle) {
        hideRatingLoading('cf');
        document.getElementById('cf-prompt').classList.add('hidden');
        document.getElementById('cf-info').classList.remove('hidden');
        document.getElementById('cf-rating').textContent = cached.rating;
        document.getElementById('cf-rating').style.color = cached.color;
        document.getElementById('cf-rank').textContent = cached.rank;
        document.getElementById('cf-rank').style.color = cached.color;
        document.getElementById('cf-max-rating').textContent = cached.maxRating;
        
        loadFromStorage('cfSolvedCache', c => {
          if (c && c.handle === handle && c.count !== undefined) {
            document.getElementById('cf-solved').textContent = c.count;
          }
        });
      } else {
        showRatingError('cf', 'Network error');
      }
    });
  }
}

async function fetchLeetCodeGraphQL(query, variables = {}) {
  const res = await fetchWithTimeout('https://leetcode.com/graphql', 10000, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  return await res.json();
}

async function fetchLCRating(handle) {
  if (!handle) { showRatingPrompt('lc'); return; }
  showRatingLoading('lc');
  try {
    const query = `query userContestRankingInfo($username: String!) {
      userContestRanking(username: $username) { attendedContestsCount rating globalRanking }
      matchedUser(username: $username) { submitStatsGlobal { acSubmissionNum { difficulty count } } }
    }`;
    const data = await fetchLeetCodeGraphQL(query, { username: handle });

    if (data && data.data && data.data.userContestRanking) {
      hideRatingLoading('lc');
      const contestData = data.data.userContestRanking;
      const rating = Math.round(contestData.rating);
      const attended = contestData.attendedContestsCount || 0;
      const ranking = contestData.globalRanking || '—';

      document.getElementById('lc-prompt').classList.add('hidden');
      document.getElementById('lc-info').classList.remove('hidden');
      document.getElementById('lc-rating').textContent = rating;
      document.getElementById('lc-rank').textContent = `Global Rank: ${ranking.toLocaleString()}`;
      document.getElementById('lc-attended').textContent = attended;

      saveToStorage('lcRatingCache', { handle, rating, attended, ranking, time: Date.now() });

      if (data.data.matchedUser && data.data.matchedUser.submitStatsGlobal) {
        const allSolved = data.data.matchedUser.submitStatsGlobal.acSubmissionNum.find(x => x.difficulty === 'All');
        if (allSolved) {
          document.getElementById('lc-solved').textContent = allSolved.count;
          saveToStorage('lcSolvedCache', { handle, count: allSolved.count });
        }
      }
    } else if (data && data.data && data.data.matchedUser) {
      // User exists but has no contest history
      hideRatingLoading('lc');
      document.getElementById('lc-prompt').classList.add('hidden');
      document.getElementById('lc-info').classList.remove('hidden');
      document.getElementById('lc-rating').textContent = '—';
      document.getElementById('lc-rank').textContent = 'Global Rank: —';
      document.getElementById('lc-attended').textContent = '0';
      
      saveToStorage('lcRatingCache', { handle, rating: '—', attended: 0, ranking: '—', time: Date.now() });
      
      if (data.data.matchedUser.submitStatsGlobal) {
        const allSolved = data.data.matchedUser.submitStatsGlobal.acSubmissionNum.find(x => x.difficulty === 'All');
        if (allSolved) {
          document.getElementById('lc-solved').textContent = allSolved.count;
          saveToStorage('lcSolvedCache', { handle, count: allSolved.count });
        }
      }
    } else {
      showRatingError('lc', `No data for "${handle}"`);
    }
  } catch (e) {
    console.warn('LC rating fetch failed:', e);
    loadFromStorage('lcRatingCache', (cached) => {
      if (cached && cached.handle === handle) {
        hideRatingLoading('lc');
        document.getElementById('lc-prompt').classList.add('hidden');
        document.getElementById('lc-info').classList.remove('hidden');
        document.getElementById('lc-rating').textContent = cached.rating;
        document.getElementById('lc-rank').textContent = `Global Rank: ${(cached.ranking || '—').toLocaleString()}`;
        document.getElementById('lc-attended').textContent = cached.attended;
        loadFromStorage('lcSolvedCache', c => {
          if (c && c.handle === handle && c.count !== undefined) {
            document.getElementById('lc-solved').textContent = c.count;
          }
        });
      } else {
        showRatingError('lc', 'Network error');
      }
    });
  }
}

// Helper: fetch with a timeout to avoid hanging
function fetchWithTimeout(url, timeoutMs = 8000, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function fetchCCRating(handle) {
  if (!handle) { showRatingPrompt('cc'); return; }
  showRatingLoading('cc');

  let result = null;

  // Method 1: Scrape CodeChef profile page directly (most reliable)
  try {
    const resp = await fetchWithTimeout(`https://www.codechef.com/users/${encodeURIComponent(handle)}`, 10000);
    const html = await resp.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract rating from the profile page
    const ratingEl = doc.querySelector('.rating-number');
    const starsEl = doc.querySelector('.rating-star span');

    if (ratingEl) {
      const rating = parseInt(ratingEl.textContent.trim()) || 0;

      // Extract highest rating
      let maxRating = rating;
      const ratingHeader = doc.querySelector('.rating-header');
      if (ratingHeader) {
        const headerText = ratingHeader.textContent;
        const maxMatch = headerText.match(/Highest Rating\s*(\d+)/i);
        if (maxMatch) maxRating = parseInt(maxMatch[1]);
      }

      // Extract stars
      let starsHtml = '';
      if (starsEl) {
        starsHtml = doc.querySelector('.rating-star').innerHTML;
      }
      
      // Extract solved count
      let solved = '—';
      const solvedMatch = html.match(/<h3>Total Problems Solved:\s*(\d+)<\/h3>/i);
      if (solvedMatch) solved = solvedMatch[1];

      result = { rating, maxRating, starsHtml, solved };
    }
  } catch (e) {
    console.warn('CC direct scrape failed:', e.message);
  }

  // Method 2: Fallback to third-party API
  if (!result) {
    try {
      const resp = await fetchWithTimeout(`https://codechef-api.vercel.app/handle/${encodeURIComponent(handle)}`, 8000);
      if (resp.ok) {
        const text = await resp.text();
        try {
          const data = JSON.parse(text);
          if (data && data.success !== false && data.currentRating !== undefined) {
            result = {
              rating: data.currentRating || 0,
              maxRating: data.highestRating || 0,
              starsHtml: `<span>${data.stars || '★'}</span>`,
              solved: '—'
            };
          }
        } catch (jsonErr) {
          console.warn('CC Vercel API returned non-JSON:', text.substring(0, 50));
        }
      }
    } catch (e) {
      console.warn('CC Vercel API failed:', e.message);
    }
  }

  hideRatingLoading('cc');

  if (result) {
    document.getElementById('cc-prompt').classList.add('hidden');
    document.getElementById('cc-info').classList.remove('hidden');
    document.getElementById('cc-rating').textContent = result.rating;
    document.getElementById('cc-rank').innerHTML = result.starsHtml;
    document.getElementById('cc-max-rating').textContent = result.maxRating;
    document.getElementById('cc-solved').textContent = result.solved;
    
    saveToStorage('ccRatingCache', { handle, ...result, time: Date.now() });
  } else {
    // Try loading from cache
    loadFromStorage('ccRatingCache', (cached) => {
      if (cached && cached.handle === handle) {
        document.getElementById('cc-prompt').classList.add('hidden');
        document.getElementById('cc-info').classList.remove('hidden');
        document.getElementById('cc-rating').textContent = cached.rating;
        document.getElementById('cc-rank').innerHTML = cached.starsHtml;
        document.getElementById('cc-max-rating').textContent = cached.maxRating;
        document.getElementById('cc-solved').textContent = cached.solved;
      } else {
        showRatingError('cc', `Could not fetch CodeChef data for "${handle}"`);
      }
    });
  }
}

function fetchAllRatings() {
  loadFromStorage('userProfiles', (profiles) => {
    if (!profiles) profiles = {};
    fetchCFRating(profiles.cf || '');
    fetchLCRating(profiles.lc || '');
    fetchCCRating(profiles.cc || '');
  });
}

// ─── To-Do List ─────────────────────────────────
let todos = [];

function saveTodos() { saveToStorage('todos', todos); }

function updateTodoCount() {
  const remaining = todos.filter(t => !t.completed).length;
  const total = todos.length;
  document.getElementById('todo-count').textContent =
    remaining === total ? `${total} task${total !== 1 ? 's' : ''}` : `${remaining}/${total} left`;
}

function renderTodos() {
  const list = document.getElementById('todo-list');
  const empty = document.getElementById('todo-empty');

  if (todos.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    updateTodoCount();
    return;
  }

  empty.classList.add('hidden');

  list.innerHTML = todos.map((todo, index) => `
    <li class="todo-item ${todo.completed ? 'completed' : ''}" data-index="${index}">
      <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} data-index="${index}">
      <span class="todo-text">${escapeHtml(todo.text)}${todo.completed ? '' : formatDeadline(todo.deadline)}</span>
      <button class="todo-delete-btn" data-index="${index}" title="Delete task">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </li>
  `).join('');

  updateTodoCount();
}

function formatDeadline(deadlineMs) {
  if (!deadlineMs) return '';
  const diff = deadlineMs - Date.now();
  if (diff < 0) return '<span class="todo-badge badge-expired">Expired!</span>';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  let timeString = [];
  if (days > 0) timeString.push(`${days}d`);
  if (hours > 0) timeString.push(`${hours}h`);
  if (mins > 0 || timeString.length === 0) timeString.push(`${mins}m`);
  
  let badgeClass = 'badge-safe';
  if (days === 0) {
    badgeClass = 'badge-soon';
  }
  
  return `<span class="todo-badge ${badgeClass}">Due in ${timeString.join(' ')}</span>`;
}

function addTodo(text, timerVal, timerUnit) {
  if (!text.trim()) return;
  
  let deadline = null;
  if (timerVal && timerVal > 0) {
    const multiplier = timerUnit === 'w' ? 7 * 24 * 60 * 60 * 1000 :
                       timerUnit === 'd' ? 24 * 60 * 60 * 1000 :
                       timerUnit === 'h' ? 60 * 60 * 1000 :
                       60 * 1000; // 'm' defaults to minute
    deadline = Date.now() + (timerVal * multiplier);
  }
  
  todos.unshift({ text: text.trim(), completed: false, id: Date.now(), deadline: deadline });
  saveTodos();
  renderTodos();
  
  if (deadline) {
    chrome.runtime.sendMessage({ action: 'setTodoAlarm', id: todos[0].id, text: todos[0].text, time: deadline });
  }
}

function toggleTodo(index) {
  if (index >= 0 && index < todos.length) {
    const todo = todos[index];
    todo.completed = !todo.completed;
    if (todo.completed && todo.deadline) {
      chrome.runtime.sendMessage({ action: 'cancelTodoAlarm', id: todo.id });
    }
    saveTodos();
    renderTodos();
    if (todo.completed) {
      showToast('Task accomplished');
    }
  }
}

function showToast(message) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  // Remove toast after animation finishes (3 seconds total)
  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, 3000);
}

function deleteTodo(index) {
  if (index >= 0 && index < todos.length) {
    const removed = todos.splice(index, 1)[0];
    if (removed.deadline) {
      chrome.runtime.sendMessage({ action: 'cancelTodoAlarm', id: removed.id });
    }
    saveTodos();
    renderTodos();
  }
}

// --- BIG TECH & QUANT PORTALS ---
function renderPortals() {
  const portalsRow = document.getElementById('portals-row');
  if (!portalsRow) return;

  const portals = [
    { name: "Google", url: "https://www.google.com/about/careers/applications/jobs/results/?q=intern", icon: "https://www.google.com/s2/favicons?domain=google.com&sz=64" },
    { name: "Microsoft", url: "https://careers.microsoft.com/v2/global/en/home.html", icon: "https://www.google.com/s2/favicons?domain=microsoft.com&sz=64" },
    { name: "Amazon", url: "https://www.amazon.jobs/en/", icon: "https://www.google.com/s2/favicons?domain=amazon.com&sz=64" },
    { name: "Oracle", url: "https://careers.oracle.com/", icon: "https://www.google.com/s2/favicons?domain=oracle.com&sz=64" },
    { name: "Goldman Sachs", url: "https://www.goldmansachs.com/careers/", icon: "https://www.google.com/s2/favicons?domain=goldmansachs.com&sz=64" },
    { name: "Tower Research", url: "https://www.tower-research.com/careers", icon: "https://www.google.com/s2/favicons?domain=tower-research.com&sz=64" },
    { name: "QuadEye", url: "https://quadeye.com/careers", icon: "https://www.google.com/s2/favicons?domain=quadeye.com&sz=64" }
  ];

  portalsRow.innerHTML = portals.map(p => `
    <a href="${p.url}" target="_blank" rel="noopener" class="portal-card" title="View internships at ${p.name}">
      <img src="${p.icon}" alt="${p.name} icon">
      ${p.name}
    </a>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  renderPortals();
});

// ─── Settings Modal ─────────────────────────────
function openSettings() {
  document.getElementById('settings-overlay').classList.add('active');
  loadFromStorage('userProfiles', (profiles) => {
    document.getElementById('cf-handle').value = profiles?.cf || '';
    document.getElementById('lc-handle').value = profiles?.lc || '';
    document.getElementById('cc-handle').value = profiles?.cc || '';
  });
  
  loadFromStorage('userProfessionalProfile', (prof) => {
    document.getElementById('profile-college').value = prof?.college || '';
    document.getElementById('profile-year').value = prof?.year || '';
    document.getElementById('profile-locations').value = prof?.locations || '';
  });

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['llmApiKey'], (result) => {
      document.getElementById('llm-api-key').value = result.llmApiKey || '';
    });
  } else {
    document.getElementById('llm-api-key').value = localStorage.getItem('llmApiKey') || '';
  }
  loadFromStorage('weatherLocation', (location) => {
    document.getElementById('weather-location').value = location || '';
  });
  
  const digiStyleEl = document.getElementById('digital-clock-style');
  const anaStyleEl = document.getElementById('analog-clock-style');
  const lightWallEl = document.getElementById('light-wallpaper-style');
  const darkWallEl = document.getElementById('dark-wallpaper-style');
  if (digiStyleEl) digiStyleEl.value = digitalClockStyle;
  if (anaStyleEl) anaStyleEl.value = analogClockStyle;
  if (lightWallEl) lightWallEl.value = lightWallpaperStyle;
  if (darkWallEl) darkWallEl.value = darkWallpaperStyle;
  
  if (typeof syncCustomSelects === 'function') syncCustomSelects();

  // Focus first input
  setTimeout(() => document.getElementById('cf-handle').focus(), 200);
}


function closeSettings() {
  document.getElementById('settings-overlay').classList.remove('active');
}

function evaluateDynamicProfiles(profiles) {
  const cfCard = document.querySelector('.cf-card');
  const lcCard = document.querySelector('.lc-card');
  const ccCard = document.querySelector('.cc-card');
  const emptyState = document.getElementById('empty-profiles-state');
  
  if (!cfCard || !lcCard || !ccCard || !emptyState) return;

  const hasAnyProfile = (profiles && (profiles.cf || profiles.lc || profiles.cc));

  if (!hasAnyProfile) {
    emptyState.classList.remove('hidden');
    cfCard.style.display = 'none';
    lcCard.style.display = 'none';
    ccCard.style.display = 'none';
  } else {
    emptyState.classList.add('hidden');
    cfCard.style.display = profiles.cf ? '' : 'none';
    lcCard.style.display = profiles.lc ? '' : 'none';
    ccCard.style.display = profiles.cc ? '' : 'none';
    
    const cfName = document.getElementById('cf-name-display');
    const lcName = document.getElementById('lc-name-display');
    const ccName = document.getElementById('cc-name-display');
    
    if (cfName) {
      cfName.textContent = profiles.cf || 'Codeforces';
      if (profiles.cf) cfName.href = `https://codeforces.com/profile/${encodeURIComponent(profiles.cf)}`;
      else cfName.removeAttribute('href');
    }
    if (lcName) {
      lcName.textContent = profiles.lc || 'LeetCode';
      if (profiles.lc) lcName.href = `https://leetcode.com/u/${encodeURIComponent(profiles.lc)}`;
      else lcName.removeAttribute('href');
    }
    if (ccName) {
      ccName.textContent = profiles.cc || 'CodeChef';
      if (profiles.cc) ccName.href = `https://www.codechef.com/users/${encodeURIComponent(profiles.cc)}`;
      else ccName.removeAttribute('href');
    }
  }
}

function saveProfiles() {
  const profiles = {
    cf: document.getElementById('cf-handle').value.trim(),
    lc: document.getElementById('lc-handle').value.trim(),
    cc: document.getElementById('cc-handle').value.trim(),
  };
  
  const profProfile = {
    college: document.getElementById('profile-college').value.trim(),
    year: document.getElementById('profile-year').value.trim(),
    locations: document.getElementById('profile-locations').value.trim(),
  };

  const apiKey = document.getElementById('llm-api-key').value.trim();
  const weatherLocation = document.getElementById('weather-location').value.trim();

  const digiStyleEl = document.getElementById('digital-clock-style');
  const anaStyleEl = document.getElementById('analog-clock-style');
  const lightWallEl = document.getElementById('light-wallpaper-style');
  const darkWallEl = document.getElementById('dark-wallpaper-style');
  if (digiStyleEl) {
    digitalClockStyle = digiStyleEl.value;
    saveToStorage('digitalClockStyle', digitalClockStyle);
  }
  if (anaStyleEl) {
    analogClockStyle = anaStyleEl.value;
    saveToStorage('analogClockStyle', analogClockStyle);
  }
  if (lightWallEl) {
    lightWallpaperStyle = lightWallEl.value;
    saveToStorage('lightWallpaperStyle', lightWallpaperStyle);
  }
  if (darkWallEl) {
    darkWallpaperStyle = darkWallEl.value;
    saveToStorage('darkWallpaperStyle', darkWallpaperStyle);
  }
  
  if (typeof applyWallpaper === 'function') applyWallpaper();
  updateClock();

  saveToStorage('userProfiles', profiles);
  saveToStorage('userProfessionalProfile', profProfile);
  saveToStorage('weatherLocation', weatherLocation);
  
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ llmApiKey: apiKey });
  } else {
    localStorage.setItem('llmApiKey', apiKey);
  }

  evaluateDynamicProfiles(profiles);
  closeSettings();
  
  // Re-fetch ratings with new profiles
  fetchAllRatings();

  // Re-fetch weather with new location
  fetchWeather(weatherLocation);
  
  // Clear internships cache and refresh if on Internships tab
  localStorage.removeItem('cp_internships_time'); 
  const tabInternships = document.getElementById('tab-internships');
  if (tabInternships && tabInternships.classList.contains('active')) {
    const refreshBtn = document.getElementById('refresh-internships-btn');
    if (refreshBtn) refreshBtn.click();
  }
}

// ─── Daily Question Reminder ──────────────────
function initDailyReminder() {
  const overlay = document.getElementById('daily-reminder-overlay');
  const closeBtn = document.getElementById('daily-reminder-close');
  const laterBtn = document.getElementById('daily-reminder-later');
  const doneBtn = document.getElementById('daily-reminder-done');
  
  if (!overlay || !closeBtn || !laterBtn || !doneBtn) return;
  
  // Use local date string (YYYY-MM-DD)
  const today = new Date().toLocaleDateString('en-CA');
  
  loadFromStorage('dailyQuestionDoneDate', (doneDate) => {
    if (doneDate !== today) {
      // Show reminder with a slight delay
      setTimeout(() => {
        overlay.classList.add('active');
      }, 800);
    }
  });
  
  const closeReminder = () => {
    overlay.classList.remove('active');
  };
  
  closeBtn.addEventListener('click', closeReminder);
  laterBtn.addEventListener('click', closeReminder);
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeReminder();
  });
  doneBtn.addEventListener('click', async () => {
    const originalText = doneBtn.textContent;
    doneBtn.textContent = "Verifying...";
    doneBtn.disabled = true;
    doneBtn.style.opacity = '0.7';

    try {
      let lcHandle = '';
      await new Promise(resolve => {
        loadFromStorage('userProfiles', (profiles) => {
          if (profiles && profiles.lc) lcHandle = profiles.lc;
          resolve();
        });
      });

      if (!lcHandle) {
        throw new Error("Please set your LeetCode handle in settings first!");
      }

      // Fetch daily question
      const dailyQuery = `query questionOfToday { activeDailyCodingChallengeQuestion { question { titleSlug } } }`;
      const dailyData = await fetchLeetCodeGraphQL(dailyQuery);
      const dailySlug = dailyData?.data?.activeDailyCodingChallengeQuestion?.question?.titleSlug;
      
      if (!dailySlug) {
        throw new Error("Could not fetch today's daily question.");
      }

      // Fetch recent submissions
      const subQuery = `query recentAcSubmissions($username: String!, $limit: Int!) {
        recentAcSubmissionList(username: $username, limit: $limit) { titleSlug timestamp }
      }`;
      const subData = await fetchLeetCodeGraphQL(subQuery, { username: lcHandle, limit: 15 });
      const submissions = subData?.data?.recentAcSubmissionList;
      
      if (!submissions || submissions.length === 0) {
        throw new Error("No recent accepted submissions found on LeetCode.");
      }

      // Check if solved today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayUnix = Math.floor(todayStart.getTime() / 1000);

      const solvedToday = submissions.some(sub => {
        const subTime = parseInt(sub.timestamp);
        return sub.titleSlug === dailySlug && subTime >= todayUnix;
      });

      if (!solvedToday) {
        throw new Error("We couldn't find your submission for the Daily Question today!");
      }

      // Success
      saveToStorage('dailyQuestionDoneDate', today);
      doneBtn.textContent = "Verified! 🎉";
      doneBtn.style.background = "var(--accent-green)";
      
      const existingError = document.querySelector('.daily-error-msg');
      if (existingError) existingError.remove();
      
      setTimeout(closeReminder, 1200);

    } catch (err) {
      doneBtn.textContent = originalText;
      doneBtn.disabled = false;
      doneBtn.style.opacity = '1';
      
      const errorMsg = document.createElement('div');
      errorMsg.textContent = err.message || "Verification failed.";
      errorMsg.style.color = "var(--accent-red)";
      errorMsg.style.fontSize = "0.8rem";
      errorMsg.style.marginTop = "12px";
      errorMsg.className = "daily-error-msg";
      
      const existing = document.querySelector('.daily-error-msg');
      if (existing) existing.remove();
      
      doneBtn.parentElement.parentElement.appendChild(errorMsg);
      setTimeout(() => {
        if (errorMsg.parentNode) errorMsg.remove();
      }, 5000);
    }
  });
}

// ─── Heat Map Fetching ───────────────────────────
let heatmapDataCache = { cf: {}, lc: {}, cc: {} };

async function fetchCFHeatmap(handle) {
  if (!handle) return {};
  try {
    const res = await fetchWithTimeout(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}`, 10000);
    const data = await res.json();
    if (data.status === 'OK') {
      const map = {};
      data.result.forEach(sub => {
        const d = new Date(sub.creationTimeSeconds * 1000);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const key = `${y}-${m}-${day}`;
        map[key] = (map[key] || 0) + 1;
      });
      return map;
    }
  } catch (e) { console.warn('CF heatmap fetch failed', e); }
  return null;
}

async function fetchLCHeatmap(handle) {
  if (!handle) return {};
  try {
    const query = `query userProfileCalendar($username: String!) {
      matchedUser(username: $username) { userCalendar { submissionCalendar } }
    }`;
    const data = await fetchLeetCodeGraphQL(query, { username: handle });
    
    if (data && data.data && data.data.matchedUser && data.data.matchedUser.userCalendar) {
      const parsed = JSON.parse(data.data.matchedUser.userCalendar.submissionCalendar);
      const map = {};
      for (const [timestamp, count] of Object.entries(parsed)) {
        const d = new Date(parseInt(timestamp) * 1000);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const key = `${y}-${m}-${day}`;
        map[key] = (map[key] || 0) + count;
      }
      return map;
    }
  } catch (e) { console.warn('LC heatmap fetch failed', e); }
  return null;
}

async function fetchCCHeatmap(handle) {
  if (!handle) return {};
  try {
    const res = await fetchWithTimeout(`https://www.codechef.com/users/${encodeURIComponent(handle)}`, 10000);
    const html = await res.text();
    const match = html.match(/var userDailySubmissionsStats = (\[.*?\]);/);
    if (match && match[1]) {
      const arr = JSON.parse(match[1]);
      const map = {};
      arr.forEach(item => {
        const parts = item.date.split('-');
        if (parts.length === 3) {
          const y = parts[0];
          const m = parts[1].padStart(2, '0');
          const day = parts[2].padStart(2, '0');
          map[`${y}-${m}-${day}`] = item.value;
        }
      });
      return map;
    }
  } catch (e) { console.warn('CC heatmap fetch failed', e); }
  return null;
}

window.renderHeatmapGrid = null; // Global reference for updating

async function fetchAllHeatmaps() {
  loadFromStorage('userProfiles', async (profiles) => {
    if (!profiles) profiles = {};
    const [cf, lc, cc] = await Promise.all([
      fetchCFHeatmap(profiles.cf),
      fetchLCHeatmap(profiles.lc),
      fetchCCHeatmap(profiles.cc)
    ]);
    if (cf) heatmapDataCache.cf = cf;
    if (lc) heatmapDataCache.lc = lc;
    if (cc) heatmapDataCache.cc = cc;
    saveToStorage('heatmapData', heatmapDataCache);
    
    if (window.renderHeatmapGrid) {
      const activeTab = document.querySelector('.heatmap-tab.active');
      if (activeTab) window.renderHeatmapGrid(activeTab.dataset.platform);
    }
  });
}

// ─── Heat Map ───────────────────────────────────
function initHeatmap() {
  const grid = document.getElementById('heatmap-grid');
  if (!grid) return;

  const tabs = document.querySelectorAll('.heatmap-tab');
  
  let tooltip = document.getElementById('heatmap-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'heatmap-tooltip';
    tooltip.className = 'heatmap-tooltip';
    document.body.appendChild(tooltip);
  }

  window.renderHeatmapGrid = (platform, selectedYear = 'last_365') => {
    const gridMonths = document.getElementById('heatmap-grid');
    const yearSelect = document.getElementById('heatmap-year-select');
    if (!gridMonths) return;
    
    gridMonths.innerHTML = '';
    gridMonths.className = `heatmap-grid-months ${platform}-heatmap`;
    
    const dataMap = heatmapDataCache[platform] || {};
    
    // Populate year selector
    if (yearSelect) {
      const years = new Set();
      Object.keys(dataMap).forEach(key => years.add(key.split('-')[0]));
      const sortedYears = Array.from(years).sort().reverse();
      
      let optionsHtml = `<option value="last_365">Current</option>`;
      sortedYears.forEach(y => { optionsHtml += `<option value="${y}">${y}</option>`; });
      
      if (yearSelect.innerHTML !== optionsHtml) {
        yearSelect.innerHTML = optionsHtml;
        if (selectedYear === 'last_365' || years.has(selectedYear)) {
          yearSelect.value = selectedYear;
        } else {
          selectedYear = 'last_365';
          yearSelect.value = 'last_365';
        }
        if (typeof rebuildCustomSelect === 'function') rebuildCustomSelect(yearSelect);
      }
    }
    
    let startDate, totalDays;
    if (selectedYear === 'last_365') {
      const today = new Date();
      today.setHours(0,0,0,0);
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 364);
      totalDays = 365;
    } else {
      startDate = new Date(`${selectedYear}-01-01T00:00:00`);
      const endDate = new Date(`${selectedYear}-12-31T00:00:00`);
      totalDays = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    }
    
    // Group days by month
    const monthsData = [];
    let currentMonthObj = null;
    let totalSubs = 0;
    let activeDaysCount = 0;
    let maxStreak = 0;
    let currentStreak = 0;

    for (let i = 0; i < totalDays; i++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + i);
      
      const y = cellDate.getFullYear();
      const mNum = cellDate.getMonth();
      const m = String(mNum + 1).padStart(2, '0');
      const dStr = String(cellDate.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${dStr}`;
      
      if (!currentMonthObj || currentMonthObj.monthNum !== mNum) {
        currentMonthObj = { monthNum: mNum, name: MONTHS_SHORT[mNum], days: [] };
        monthsData.push(currentMonthObj);
      }
      
      const subs = dataMap[key] || 0;
      totalSubs += subs;
      if (subs > 0) {
        activeDaysCount++;
        currentStreak++;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
      
      let activityLevel = 0;
      if (subs > 0) {
        if (subs <= 1) activityLevel = 1;
        else if (subs <= 3) activityLevel = 2;
        else if (subs <= 6) activityLevel = 3;
        else activityLevel = 4;
      }
      
      currentMonthObj.days.push({ 
        date: cellDate, 
        dateString: cellDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), 
        subs, 
        activityLevel 
      });
    }
    
    // Update Stats Header
    const hmTotal = document.getElementById('hm-total');
    const hmActive = document.getElementById('hm-active');
    const hmStreak = document.getElementById('hm-streak');
    if (hmTotal) hmTotal.textContent = totalSubs;
    if (hmActive) hmActive.textContent = activeDaysCount;
    if (hmStreak) hmStreak.textContent = maxStreak;
    
    // Render Month Blocks
    monthsData.forEach(month => {
      const monthBlock = document.createElement('div');
      monthBlock.className = 'heatmap-month-block';
      
      const monthGrid = document.createElement('div');
      monthGrid.className = 'heatmap-month-grid';
      
      // Pad beginning of month
      const firstDayOfWeek = month.days[0].date.getDay();
      for (let i = 0; i < firstDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'heatmap-cell empty-padding';
        monthGrid.appendChild(emptyCell);
      }
      
      month.days.forEach(dayInfo => {
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        cell.setAttribute('data-level', dayInfo.activityLevel);
        
        const displaySubs = dayInfo.subs === 0 ? 'No' : dayInfo.subs;
        
        cell.addEventListener('mouseenter', (e) => {
          tooltip.textContent = `${displaySubs} submissions on ${dayInfo.dateString}`;
          tooltip.style.opacity = '1';
          const rect = cell.getBoundingClientRect();
          tooltip.style.left = `${rect.left + window.scrollX - (tooltip.offsetWidth / 2) + 5}px`;
          tooltip.style.top = `${rect.top + window.scrollY - 30}px`;
        });
        
        cell.addEventListener('mouseleave', () => {
          tooltip.style.opacity = '0';
        });
        
        monthGrid.appendChild(cell);
      });
      
      const monthLabel = document.createElement('div');
      monthLabel.className = 'heatmap-month-label';
      monthLabel.textContent = month.name;
      
      monthBlock.appendChild(monthGrid);
      monthBlock.appendChild(monthLabel);
      gridMonths.appendChild(monthBlock);
    });
  };

  // Load from cache first for fast display
  loadFromStorage('heatmapData', (cached) => {
    if (cached) heatmapDataCache = cached;
    window.renderHeatmapGrid('cf');
  });

  // Start background fetch for latest data
  fetchAllHeatmaps();

  const yearSelect = document.getElementById('heatmap-year-select');
  if (yearSelect) {
    yearSelect.addEventListener('change', (e) => {
      const activeTab = document.querySelector('.heatmap-tab.active');
      if (activeTab) window.renderHeatmapGrid(activeTab.dataset.platform, e.target.value);
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      tabs.forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      const currentYear = yearSelect ? yearSelect.value : 'last_365';
      window.renderHeatmapGrid(e.target.dataset.platform, currentYear);
    });
  });
}

// ─── Weather ────────────────────────────────────
window._cachedWeather = null;

function getWeatherIcon(weatherCode, isDay) {
  // WMO Weather interpretation codes → emoji
  // https://open-meteo.com/en/docs
  const codeMap = {
    0:  isDay ? '☀️' : '🌙',    // Clear sky
    1:  isDay ? '🌤️' : '🌙',    // Mainly clear
    2:  isDay ? '⛅' : '☁️',     // Partly cloudy
    3:  '☁️',                     // Overcast
    45: '🌫️',                    // Fog
    48: '🌫️',                    // Depositing rime fog
    51: '🌦️',                    // Light drizzle
    53: '🌦️',                    // Moderate drizzle
    55: '💧',                    // Dense drizzle
    56: '💧',                    // Light freezing drizzle
    57: '💧',                    // Dense freezing drizzle
    61: '☔',                    // Slight rain
    63: '☔',                    // Moderate rain
    65: '☔',                    // Heavy rain
    66: '☔',                    // Light freezing rain
    67: '☔',                    // Heavy freezing rain
    71: '🌨️',                    // Slight snow
    73: '🌨️',                    // Moderate snow
    75: '❄️',                     // Heavy snow
    77: '❄️',                     // Snow grains
    80: '🌦️',                    // Slight rain showers
    81: '☔',                    // Moderate rain showers
    82: '☔',                    // Violent rain showers
    85: '🌨️',                    // Slight snow showers
    86: '❄️',                     // Heavy snow showers
    95: '⛈️',                     // Thunderstorm
    96: '⛈️',                     // Thunderstorm with slight hail
    99: '⛈️',                     // Thunderstorm with heavy hail
  };
  return codeMap[weatherCode] || (isDay ? '☀️' : '🌙');
}

function getWeatherDescription(weatherCode) {
  const descMap = {
    0: 'Clear Sky', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Rime Fog', 51: 'Light Drizzle', 53: 'Drizzle',
    55: 'Heavy Drizzle', 56: 'Freezing Drizzle', 57: 'Heavy Freezing Drizzle',
    61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain',
    66: 'Freezing Rain', 67: 'Heavy Freezing Rain',
    71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow', 77: 'Snow Grains',
    80: 'Light Showers', 81: 'Showers', 82: 'Heavy Showers',
    85: 'Light Snow Showers', 86: 'Heavy Snow Showers',
    95: 'Thunderstorm', 96: 'Thunderstorm (Hail)', 99: 'Severe Thunderstorm',
  };
  return descMap[weatherCode] || 'Unknown';
}

function getWeatherSmartTip(weatherCode, temp, isDay, aqi) {
  // AQI Warnings override standard tips if severe
  if (aqi && aqi > 150) return `😷 Unhealthy air (AQI ${aqi}), wear a mask`;
  if (aqi && aqi > 100) return `🌫️ Poor air quality (AQI ${aqi})`;

  // Rain / Snow / Drizzle / Thunder
  if (weatherCode >= 51 && weatherCode <= 67) return '☂️ Don\'t forget your umbrella';
  if (weatherCode >= 71 && weatherCode <= 86) return '🧣 Wrap up warm, it\'s snowing';
  if (weatherCode >= 95 && weatherCode <= 99) return '⚡ Thunderstorms, stay indoors';
  
  // Clear and Hot/Cold
  if (weatherCode === 0 || weatherCode === 1) {
    if (temp >= 30 && isDay) return '🧴 High UV expected, use sunscreen';
    if (temp >= 25 && isDay) return '🕶️ Perfect day for sunglasses';
    if (temp <= 5) return '🧤 Very cold out, wear gloves';
  }
  
  // Cloudy / Fog
  if (weatherCode === 2 || weatherCode === 3) {
    if (temp <= 12) return '🧥 Chilly and cloudy, bring a jacket';
    if (temp >= 35) return '💧 Stay hydrated, it\'s extremely hot';
    return '☁️ Nice and cloudy';
  }
  if (weatherCode === 45 || weatherCode === 48) return '🚗 Foggy, drive safely';
  
  // Default fallbacks based purely on temp
  if (temp >= 35) return '💧 Stay hydrated, it\'s extremely hot';
  if (temp <= 0) return '🧊 Freezing temperatures outside';
  if (temp > 18 && temp < 25 && weatherCode < 50) return '🌿 Perfect weather for a walk';
  
  return '';
}

async function fetchWeather(location) {
  if (!location) {
    // No location set — show a placeholder
    window._cachedWeather = null;
    const weatherIconEl = document.getElementById('weather-icon');
    const weatherTempEl = document.getElementById('weather-temp');
    if (weatherIconEl) weatherIconEl.textContent = '🌤️';
    if (weatherTempEl) weatherTempEl.textContent = '';
    return;
  }

  try {
    let latitude, longitude, name;
    
    // Check if location is already precise coordinates with an optional display name (e.g., "25.43, 81.84|Jhalwa")
    const coordMatch = location.match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)(?:\|(.+))?$/);
    if (coordMatch) {
      latitude = parseFloat(coordMatch[1]);
      longitude = parseFloat(coordMatch[2]);
      name = coordMatch[3] ? coordMatch[3] : "Auto-detected Location";
    } else {
      // Step 1: Geocode using Nominatim API (OpenStreetMap) which is highly versatile for exact addresses/landmarks
      try {
        const geoResp = await fetchWithTimeout(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
          5000
        );
        const geoData = await geoResp.json();
        
        if (geoData && geoData.length > 0) {
          latitude = parseFloat(geoData[0].lat);
          longitude = parseFloat(geoData[0].lon);
          // Preserve the exact name the user typed, just capitalized nicely, so they get their exact hometown name on screen
          name = location.charAt(0).toUpperCase() + location.slice(1);
        }
      } catch (e) {
        console.warn("Nominatim geocoding failed, falling back to Open-Meteo", e);
      }

      // Fallback to Open-Meteo city-level geocoding if Nominatim didn't find it or failed
      if (latitude === undefined) {
        const fallbackResp = await fetchWithTimeout(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`,
          8000
        );
        const fallbackData = await fallbackResp.json();

        if (!fallbackData.results || fallbackData.results.length === 0) {
          console.warn('Weather: Location not found:', location);
          window._cachedWeather = { icon: '❓', temp: 0, description: 'Location not found', location };
          return;
        }
        latitude = fallbackData.results[0].latitude;
        longitude = fallbackData.results[0].longitude;
        name = fallbackData.results[0].name;
      }
    }

    // Step 2: Fetch current weather and AQI concurrently
    const [weatherResp, aqiResp] = await Promise.all([
      fetchWithTimeout(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day&daily=sunrise,sunset&temperature_unit=celsius&timezone=auto&forecast_days=1`,
        8000
      ),
      fetchWithTimeout(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi`,
        8000
      ).catch(() => null)
    ]);
    
    const weatherData = await weatherResp.json();
    let aqi = null;
    if (aqiResp && aqiResp.ok) {
      try {
        const aqiData = await aqiResp.json();
        if (aqiData && aqiData.current && aqiData.current.us_aqi !== undefined) {
          aqi = Math.round(aqiData.current.us_aqi);
        }
      } catch (e) {
        console.warn("AQI fetch failed", e);
      }
    }

    if (weatherData.current) {
      const { temperature_2m, weather_code, is_day } = weatherData.current;
      const icon = getWeatherIcon(weather_code, is_day === 1);
      const description = getWeatherDescription(weather_code);

      // Extract sunrise/sunset from daily data
      const sunrise = weatherData.daily && weatherData.daily.sunrise ? weatherData.daily.sunrise[0] : null;
      const sunset = weatherData.daily && weatherData.daily.sunset ? weatherData.daily.sunset[0] : null;

      window._cachedWeather = {
        icon,
        temp: temperature_2m,
        description,
        location: name,
        weatherCode: weather_code,
        isDay: is_day === 1,
        sunrise,
        sunset,
        aqi,
        fetchedAt: Date.now(),
      };

      // Save to cache
      saveToStorage('weatherCache', window._cachedWeather);

      // Immediately update the UI
      const weatherIconEl = document.getElementById('weather-icon');
      const weatherTempEl = document.getElementById('weather-temp');
      if (weatherIconEl) weatherIconEl.textContent = icon;
      if (weatherTempEl) weatherTempEl.textContent = `${Math.round(temperature_2m)}°C`;
      const weatherDisplay = document.getElementById('weather-display');
      if (weatherDisplay) weatherDisplay.title = `${description} • ${Math.round(temperature_2m)}°C — ${name}`;

      // Auto-switch theme based on sunrise/sunset
      autoSwitchTheme();
    }
  } catch (e) {
    console.warn('Weather fetch failed:', e);
    // Try loading from cache
    loadFromStorage('weatherCache', (cached) => {
      if (cached) {
        window._cachedWeather = cached;
      }
    });
  }
}

function initWeather() {
  // Load cached weather first for instant display
  loadFromStorage('weatherCache', (cached) => {
    if (cached) {
      window._cachedWeather = cached;
      const weatherIconEl = document.getElementById('weather-icon');
      const weatherTempEl = document.getElementById('weather-temp');
      if (weatherIconEl) weatherIconEl.textContent = cached.icon;
      if (weatherTempEl) weatherTempEl.textContent = `${Math.round(cached.temp)}°C`;
      const weatherDisplay = document.getElementById('weather-display');
      if (weatherDisplay) weatherDisplay.title = `${cached.description} • ${Math.round(cached.temp)}°C — ${cached.location}`;
      // Auto-switch theme from cache on load
      autoSwitchTheme();
    }
  });

  // Fetch fresh weather data
  loadFromStorage('weatherLocation', (location) => {
    if (location) {
      fetchWeather(location);
    } else {
      // Zero-click automatic IP-based geolocation on first run!
      fetchWithTimeout('https://api.bigdatacloud.net/data/reverse-geocode-client', 3000)
        .then(res => res.json())
        .then(data => {
          if (data && data.latitude && data.longitude) {
            // We got their exact IP-based coordinates automatically
            let locationStr = data.city || data.locality || data.principalSubdivision || "Auto-detected Location";
            const locStr = `${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}|${locationStr}`;
            
            saveToStorage('weatherLocation', locStr);
            const locationInput = document.getElementById('weather-location');
            if (locationInput) locationInput.value = locStr;
            
            fetchWeather(locStr);
          }
        })
        .catch(err => console.warn('Automatic IP geolocate failed', err));
    }
  });

  // Refresh weather every 30 minutes
  setInterval(() => {
    loadFromStorage('weatherLocation', (location) => {
      if (location) fetchWeather(location);
    });
  }, 30 * 60 * 1000);

  // Check theme auto-switch every minute (catches sunrise/sunset transitions)
  setInterval(() => {
    autoSwitchTheme();
  }, 60 * 1000);
}

// ─── Search Bar ─────────────────────────────────
function initSearch() {
  const form = document.getElementById('search-form');
  const input = document.getElementById('search-input');
  if (!form || !input) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;

    // If it looks like a URL, navigate directly
    if (/^(https?:\/\/|www\.)/.test(query) || /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(query)) {
      const url = query.startsWith('http') ? query : `https://${query}`;
      window.location.href = url;
    } else {
      // Google search
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }
  });
}

// ─── Quick Shortcuts ────────────────────────────
let shortcuts = [];
let editingShortcutIndex = -1; // -1 = adding, >= 0 = editing

function getFaviconUrl(url) {
  try {
    // Use Chrome's built-in favicon API which handles all sites properly
    const faviconUrl = new URL(chrome.runtime.getURL('/_favicon/'));
    faviconUrl.searchParams.set('pageUrl', url);
    faviconUrl.searchParams.set('size', '64');
    return faviconUrl.toString();
  } catch {
    return '';
  }
}

function renderShortcuts() {
  const container = document.getElementById('shortcuts-row');
  if (!container) return;

  // Remove all existing shortcut items (not the add button)
  container.querySelectorAll('.shortcut-item').forEach(el => el.remove());

  const addBtn = document.getElementById('add-shortcut-btn');

  // Insert shortcuts before the add button
  shortcuts.forEach((shortcut, index) => {
    const item = document.createElement('a');
    item.className = 'shortcut-item';
    item.href = shortcut.url;
    item.title = shortcut.name;
    item.draggable = false;

    const faviconUrl = getFaviconUrl(shortcut.url);
    
    let isGithub = false;
    try {
      isGithub = new URL(shortcut.url).hostname.includes('github.com');
    } catch {}

    const imgClass = isGithub ? 'class="invert-in-light"' : '';

    item.innerHTML = `
      <div class="shortcut-icon-circle">
        <img src="${faviconUrl}" ${imgClass} alt="" onerror="this.style.display='none'; this.parentElement.innerHTML='<span style=\\'font-size:1.2rem;\\'>${escapeHtml(shortcut.name.charAt(0).toUpperCase())}</span>';">
      </div>
      <span class="shortcut-label">${escapeHtml(shortcut.name)}</span>
      <div class="shortcut-edit-badge" data-index="${index}" title="Edit shortcut">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="1"></circle>
          <circle cx="12" cy="5" r="1"></circle>
          <circle cx="12" cy="19" r="1"></circle>
        </svg>
      </div>
    `;

    // Edit badge click (prevent navigation)
    const editBadge = item.querySelector('.shortcut-edit-badge');
    editBadge.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openShortcutModal(index);
    });

    container.insertBefore(item, addBtn);
  });
}

function openShortcutModal(index = -1) {
  editingShortcutIndex = index;
  const overlay = document.getElementById('shortcut-modal-overlay');
  const title = document.getElementById('shortcut-modal-title');
  const nameInput = document.getElementById('shortcut-name');
  const urlInput = document.getElementById('shortcut-url');
  const deleteBtn = document.getElementById('shortcut-delete-btn');

  if (index >= 0 && index < shortcuts.length) {
    // Edit mode
    title.textContent = 'Edit Shortcut';
    nameInput.value = shortcuts[index].name;
    urlInput.value = shortcuts[index].url;
    deleteBtn.classList.remove('hidden');
  } else {
    // Add mode
    title.textContent = 'Add Shortcut';
    nameInput.value = '';
    urlInput.value = '';
    deleteBtn.classList.add('hidden');
  }

  overlay.classList.add('active');
  setTimeout(() => nameInput.focus(), 200);
}

function closeShortcutModal() {
  document.getElementById('shortcut-modal-overlay').classList.remove('active');
  editingShortcutIndex = -1;
}

function saveShortcut(name, url) {
  // Ensure URL has protocol
  if (!/^https?:\/\//.test(url)) {
    url = 'https://' + url;
  }

  if (editingShortcutIndex >= 0 && editingShortcutIndex < shortcuts.length) {
    // Update existing
    shortcuts[editingShortcutIndex] = { name, url };
  } else {
    // Add new
    shortcuts.push({ name, url });
  }

  saveToStorage('quickShortcuts', shortcuts);
  renderShortcuts();
  closeShortcutModal();
}

function deleteShortcut(index) {
  if (index >= 0 && index < shortcuts.length) {
    shortcuts.splice(index, 1);
    saveToStorage('quickShortcuts', shortcuts);
    renderShortcuts();
    closeShortcutModal();
  }
}

function initShortcuts() {
  // Load saved shortcuts
  loadFromStorage('quickShortcuts', (saved) => {
    if (saved && Array.isArray(saved)) {
      shortcuts = saved;
    }
    renderShortcuts();
  });

  // Add button
  document.getElementById('add-shortcut-btn').addEventListener('click', () => {
    openShortcutModal(-1);
  });

  // Modal close
  document.getElementById('shortcut-modal-close').addEventListener('click', closeShortcutModal);
  document.getElementById('shortcut-modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeShortcutModal();
  });

  // Form submit
  document.getElementById('shortcut-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('shortcut-name').value.trim();
    const url = document.getElementById('shortcut-url').value.trim();
    if (name && url) {
      saveShortcut(name, url);
    }
  });

  // Delete button
  document.getElementById('shortcut-delete-btn').addEventListener('click', () => {
    deleteShortcut(editingShortcutIndex);
  });
}

// ─── Initialization ─────────────────────────────
function init() {
  initTheme();
  initLock();
  initDailyReminder();
  initHeatmap();
  initParticles();
  initWeather();
  initSearch();
  initShortcuts();
  initExplore();
  initInternships();
  initPlacements();
  initHackathons();

  // Evaluate dynamic profiles on load
  loadFromStorage('userProfiles', (profiles) => {
    evaluateDynamicProfiles(profiles || {});
    const hasAnyProfile = (profiles && (profiles.cf || profiles.lc || profiles.cc));
    if (!hasAnyProfile) {
      setTimeout(() => openSettings(), 500); // slight delay for smooth entrance
    }
  });

  document.getElementById('empty-state-connect-btn').addEventListener('click', openSettings);

  // Clock
  const clockContainer = document.getElementById('clock-container');
  if (clockContainer) {
    clockContainer.addEventListener('click', () => {
      isAnalogClock = !isAnalogClock;
      saveToStorage('isAnalogClock', isAnalogClock);
      updateClock();
    });
  }
  updateClock();
  setInterval(updateClock, 1000);

  // Contests
  fetchAllContests();

  // Refresh countdowns every minute
  setInterval(() => {
    loadFromStorage('cachedContests', (cached) => {
      if (cached && cached.length > 0) renderContests(cached);
    });
  }, 60000);

  // Ratings
  fetchAllRatings();

  // To-do
  loadFromStorage('todos', (savedTodos) => {
    if (savedTodos && Array.isArray(savedTodos)) todos = savedTodos;
    renderTodos();
  });

  // To-Do form
  const form = document.getElementById('todo-form');
  const input = document.getElementById('todo-input');
  const timerValInput = document.getElementById('todo-timer-val');
  const timerUnitInput = document.getElementById('todo-timer-unit');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = parseFloat(timerValInput.value) || null;
    addTodo(input.value, val, timerUnitInput.value);
    input.value = '';
    timerValInput.value = '';
    input.focus();
  });

  // Automatically refresh deadlines every minute
  setInterval(() => {
    if (todos.some(t => t.deadline && !t.completed)) {
      renderTodos();
    }
  }, 60000);

  // To-Do click delegation
  document.getElementById('todo-list').addEventListener('click', (e) => {
    const checkbox = e.target.closest('.todo-checkbox');
    if (checkbox) {
      toggleTodo(parseInt(checkbox.dataset.index, 10));
      return;
    }
    const deleteBtn = e.target.closest('.todo-delete-btn');
    if (deleteBtn) {
      const index = parseInt(deleteBtn.dataset.index, 10);
      const item = deleteBtn.closest('.todo-item');
      item.style.animation = 'fadeOut 0.25s ease-out forwards';
      setTimeout(() => deleteTodo(index), 250);
    }
  });

  // Contests Tabs Logic
  const tabUpcoming = document.getElementById('tab-upcoming');
  const tabPast = document.getElementById('tab-past');
  if (tabUpcoming && tabPast) {
    tabUpcoming.addEventListener('click', () => {
      tabUpcoming.classList.add('active');
      tabPast.classList.remove('active');
      loadFromStorage('cachedContests', (cached) => {
        if (cached && cached.length > 0) renderContests(cached);
        else fetchAllContests();
      });
    });
    tabPast.addEventListener('click', () => {
      tabPast.classList.add('active');
      tabUpcoming.classList.remove('active');
      fetchAndRenderPastUnsolved();
    });
  }

  // Refresh contests button
  document.getElementById('refresh-contests').addEventListener('click', fetchAllContests);

  // Settings modal
  document.getElementById('open-settings').addEventListener('click', openSettings);
  document.getElementById('settings-close').addEventListener('click', closeSettings);
  document.getElementById('settings-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeSettings();
  });
  document.getElementById('settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveProfiles();
    fetchAllHeatmaps();
  });

  // Auto-detect Location Button
  const autoDetectBtn = document.getElementById('auto-detect-location-btn');
  if (autoDetectBtn) {
    autoDetectBtn.addEventListener('click', () => {
      if (!navigator.geolocation) {
        showToast("Geolocation is not supported by your browser");
        return;
      }
      
      const originalHtml = autoDetectBtn.innerHTML;
      autoDetectBtn.innerHTML = `<div class="spinner" style="width:16px;height:16px;border-width:2px;margin:auto;"></div>`;
      autoDetectBtn.disabled = true;

      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Free reverse geocoding API to get city name
          const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
          const data = await res.json();
          
          let locationStr = data.city || data.locality || data.principalSubdivision || "Auto-detected Location";
          
          // Pass the EXACT GPS coordinates to the weather engine but append the nice display name!
          const preciseLocationStr = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}|${locationStr}`;
          document.getElementById('weather-location').value = preciseLocationStr;
          
          showToast(`Location found: ${locationStr}`);
        } catch (err) {
          console.warn("Reverse geocode failed", err);
          document.getElementById('weather-location').value = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          showToast("Location found via Coordinates");
        } finally {
          autoDetectBtn.innerHTML = originalHtml;
          autoDetectBtn.disabled = false;
        }
      }, (error) => {
        showToast("Failed to get location. Please allow permissions.");
        autoDetectBtn.innerHTML = originalHtml;
        autoDetectBtn.disabled = false;
      });
    });
  }

  // "Set handle" buttons on rating cards
  document.querySelectorAll('.set-handle-btn').forEach(btn => {
    btn.addEventListener('click', openSettings);
  });

  // Keyboard shortcut: Escape to close modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSettings();
      closeShortcutModal();
    }
  });
}

// ─── Explore Tab & News Feed ────────────────────
let exploreLoaded = false;
let currentNewsPage = 1;

function initExplore() {
  const tabExplore = document.getElementById('tab-explore');
  const tabExploreText = document.getElementById('tab-explore-text');
  const homeSection = document.getElementById('home-section');
  const exploreSection = document.getElementById('explore-section');
  const refreshBtn = document.getElementById('refresh-news-btn');
  const loadMoreBtn = document.getElementById('load-more-news-btn');
  const seeLessBtn = document.getElementById('see-less-news-btn');
  
  if (!tabExplore || !homeSection || !exploreSection) return;

  tabExplore.addEventListener('click', () => {
    const isExploreActive = tabExplore.classList.contains('active');
    
    if (isExploreActive) {
      // Switch back to Home
      tabExplore.classList.remove('active');
      tabExploreText.textContent = "Explore";
      exploreSection.classList.add('hidden');
      homeSection.classList.remove('hidden');
      homeSection.style.animation = 'fadeInUp 0.3s ease-out';
    } else {
      // Switch to Explore
      tabExplore.classList.add('active');
      tabExploreText.textContent = "Home";
      homeSection.classList.add('hidden');
      exploreSection.classList.remove('hidden');
      exploreSection.style.animation = 'fadeInUp 0.3s ease-out';
      
      if (!exploreLoaded) {
        currentNewsPage = 1;
        fetchDevNews(false, false, 1);
      }
    }
  });

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      // Pick a random page to ensure the user gets a fresh feed
      currentNewsPage = Math.floor(Math.random() * 10) + 1;
      fetchDevNews(true, false, currentNewsPage);
    });
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      currentNewsPage++;
      fetchDevNews(true, true, currentNewsPage); // Force refresh bypasses cache for page > 1
    });
  }

  if (seeLessBtn) {
    seeLessBtn.addEventListener('click', () => {
      currentNewsPage = 1;
      fetchDevNews(false, false, 1); // Uses cache for page 1
      exploreSection.scrollIntoView({ behavior: 'smooth' });
    });
  }
}

async function fetchDevNews(forceRefresh = false, append = false, page = 1) {
  const grid = document.getElementById('news-grid');
  const loader = document.getElementById('news-loading');
  const refreshBtn = document.getElementById('refresh-news-btn');
  const exploreControls = document.getElementById('explore-controls');
  const loadMoreBtn = document.getElementById('load-more-news-btn');
  
  if (!append) {
    if (forceRefresh) grid.innerHTML = '';
    loader.classList.remove('hidden');
    if (exploreControls) exploreControls.classList.add('hidden');
    if (forceRefresh && refreshBtn) refreshBtn.classList.add('spinning');
  } else {
    if (loadMoreBtn) {
      loadMoreBtn.disabled = true;
      loadMoreBtn.textContent = 'Loading...';
    }
  }

  try {
    // Only use cache for page 1
    if (!forceRefresh && page === 1) {
      const cachedData = localStorage.getItem('cp_news_v5');
      const cachedTime = localStorage.getItem('cp_news_v5_time');
      
      if (cachedData && cachedTime && (Date.now() - parseInt(cachedTime)) < 60 * 60 * 1000) {
        renderNews(JSON.parse(cachedData), false);
        return;
      }
    }

    // Fetch Dev.to (12 items per page for a good mix)
    const devPromise = fetch(`https://dev.to/api/articles?tag=programming&top=7&per_page=12&page=${page}`)
      .then(r => r.ok ? r.json() : []);
      
    // Fetch ET Tech (RSS) via background script to bypass CORS
    const etPromise = new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'fetchETNews' }, response => {
        if (chrome.runtime.lastError || !response || response.error || !response.data) resolve('');
        else resolve(response.data);
      });
    });

    // Fetch The Hindu (RSS) via background script
    const hinduPromise = new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'fetchHinduNews' }, response => {
        if (chrome.runtime.lastError || !response || response.error || !response.data) resolve('');
        else resolve(response.data);
      });
    });

    const [devData, etRss, hinduRss] = await Promise.all([devPromise, etPromise, hinduPromise]);
    
    // Parse ET Tech
    let etNews = [];
    if (etRss) {
      const parser = new DOMParser();
      const xml = parser.parseFromString(etRss, "text/xml");
      const items = Array.from(xml.querySelectorAll("item"));
      etNews = items.map((item, index) => {
        const title = item.querySelector("title")?.textContent || "";
        const link = item.querySelector("link")?.textContent || "";
        const pubDate = item.querySelector("pubDate")?.textContent || "";
        let description = item.querySelector("description")?.textContent || "";
        const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
        description = description.replace(/<[^>]*>?/gm, '').trim();
        return {
          id: 'et' + index + '_' + Date.now(),
          title: title,
          description: description.length > 100 ? description.substring(0, 100) + '...' : description,
          url: link,
          published_at: pubDate,
          cover_image: (imgMatch ? imgMatch[1] : null) || "https://picsum.photos/seed/et" + index + "/400/200",
          user: { name: "ET Tech", profile_image_90: "https://economictimes.indiatimes.com/favicon.ico" }
        };
      });
    }

    // Parse The Hindu
    let hinduNews = [];
    if (hinduRss) {
      const parser = new DOMParser();
      const xml = parser.parseFromString(hinduRss, "text/xml");
      const items = Array.from(xml.querySelectorAll("item"));
      hinduNews = items.map((item, index) => {
        const title = item.querySelector("title")?.textContent || "";
        const link = item.querySelector("link")?.textContent || "";
        const pubDate = item.querySelector("pubDate")?.textContent || "";
        let description = item.querySelector("description")?.textContent || "";
        description = description.replace(/<[^>]*>?/gm, '').trim();
        return {
          id: 'hindu' + index + '_' + Date.now(),
          title: title,
          description: description.length > 100 ? description.substring(0, 100) + '...' : description,
          url: link,
          published_at: pubDate,
          cover_image: "https://picsum.photos/seed/hindu" + index + "/400/200",
          user: { name: "The Hindu Tech", profile_image_90: "https://www.thehindu.com/favicon.ico" }
        };
      });
    }

    // Paginate RSS News (4 items each per page, wrapping around if page is too high)
    const etStartIdx = ((page - 1) * 4) % Math.max(1, etNews.length);
    let pagedEtNews = etNews.slice(etStartIdx, etStartIdx + 4);
    if (pagedEtNews.length < 4 && etNews.length > 0) {
      pagedEtNews = pagedEtNews.concat(etNews.slice(0, 4 - pagedEtNews.length));
    }

    const hinduStartIdx = ((page - 1) * 4) % Math.max(1, hinduNews.length);
    let pagedHinduNews = hinduNews.slice(hinduStartIdx, hinduStartIdx + 4);
    if (pagedHinduNews.length < 4 && hinduNews.length > 0) {
      pagedHinduNews = pagedHinduNews.concat(hinduNews.slice(0, 4 - pagedHinduNews.length));
    }
    
    // Interleave
    const combinedData = [];
    const maxLen = Math.max(devData.length, pagedEtNews.length, pagedHinduNews.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < pagedEtNews.length) combinedData.push(pagedEtNews[i]);
      if (i < pagedHinduNews.length) combinedData.push(pagedHinduNews[i]);
      if (i < devData.length) combinedData.push(devData[i]);
    }
    
    // Only cache the first page
    if (page === 1) {
      localStorage.setItem('cp_news_v5', JSON.stringify(combinedData));
      localStorage.setItem('cp_news_v5_time', Date.now().toString());
    }
    
    renderNews(combinedData, append);
  } catch (err) {
    console.warn("Dev.to API fetch failed:", err);
    if (!append) loader.innerHTML = `<p style="color:var(--accent-red);">Failed to load news. Please try again later.</p>`;
  } finally {
    if (refreshBtn) refreshBtn.classList.remove('spinning');
    if (loadMoreBtn) {
      loadMoreBtn.disabled = false;
      loadMoreBtn.textContent = 'Load More';
    }
  }
}

let renderedNewsIds = new Set();

function renderNews(articles, append = false) {
  const grid = document.getElementById('news-grid');
  const loader = document.getElementById('news-loading');
  const exploreControls = document.getElementById('explore-controls');
  const seeLessBtn = document.getElementById('see-less-news-btn');
  
  if (!append) {
    grid.innerHTML = '';
    renderedNewsIds.clear();
  }
  loader.classList.add('hidden');
  
  // Manage pagination controls visibility
  if (exploreControls) {
    if (articles.length > 0 || append) {
      exploreControls.classList.remove('hidden');
    } else {
      exploreControls.classList.add('hidden');
    }
  }
  
  if (seeLessBtn) {
    if (currentNewsPage > 1) {
      seeLessBtn.classList.remove('hidden');
    } else {
      seeLessBtn.classList.add('hidden');
    }
  }
  
  exploreLoaded = true;

  function getRelativeTime(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const diffMs = Date.now() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins <= 0 ? 'now' : diffMins + 'm';
    }
    if (diffHours < 24) return diffHours + 'h';
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return diffDays + 'd';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  let articlesToGrid = articles;

  if (!append && articles.length >= 4) {
    const sliderArticles = articles.slice(0, 4);
    articlesToGrid = articles.slice(4);
    
    const slider = document.createElement('div');
    slider.className = 'news-slider';
    
    let trackHtml = '<div class="slider-track" id="news-slider-track">';
    let indicatorsHtml = '<div class="slider-indicators">';
    
    sliderArticles.forEach((article, index) => {
      renderedNewsIds.add(article.url);
      const fallbackImage = 'https://picsum.photos/seed/' + article.id + '/400/200';
      const coverUrl = article.cover_image || fallbackImage;
      const relTime = getRelativeTime(article.published_at);
      const authorName = article.user ? article.user.name : (article.source || 'News');
      const authorImage = article.user && article.user.profile_image_90 ? article.user.profile_image_90 : (article.favicon || 'icons/icon48.png');
      
      trackHtml += `
        <a href="${article.url}" target="_blank" rel="noopener" class="slider-slide">
          <div class="news-cover-wrapper">
            <img src="${coverUrl}" alt="Cover" class="news-cover" loading="lazy">
          </div>
          <div class="news-content">
            <h3 class="news-title">${article.title}</h3>
            <div class="news-meta">
              <img src="${authorImage}" alt="Favicon" onerror="this.src='icons/icon48.png'">
              <span>${authorName} &middot; ${relTime}</span>
            </div>
          </div>
        </a>
      `;
      indicatorsHtml += `<div class="slider-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>`;
    });
    
    trackHtml += '</div>';
    indicatorsHtml += '</div>';
    
    const controlsHtml = `
      <div class="slider-controls">
        <button class="slider-btn" id="slider-prev" title="Previous">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <button class="slider-btn" id="slider-next" title="Next">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
    `;
    
    slider.innerHTML = trackHtml + indicatorsHtml + controlsHtml;
    grid.appendChild(slider);
    
    setupNewsSlider(slider, sliderArticles.length);
  }

  articlesToGrid.forEach(article => {
    if (renderedNewsIds.has(article.url)) return; // Prevent duplicate articles
    renderedNewsIds.add(article.url);

    const fallbackImage = 'https://picsum.photos/seed/' + article.id + '/400/200';
    // Use cover_image if available, otherwise fallback. Avoid social_image as it contains duplicate text.
    const coverUrl = article.cover_image || fallbackImage;
    
    const card = document.createElement('a');
    card.href = article.url;
    card.target = '_blank';
    card.rel = 'noopener';
    card.className = 'news-card';
    
    const relTime = getRelativeTime(article.published_at);
    const authorName = article.user ? article.user.name : (article.source || 'News');
    const authorImage = article.user && article.user.profile_image_90 ? article.user.profile_image_90 : (article.favicon || 'icons/icon48.png');

    card.innerHTML = `
      <div class="news-cover-wrapper">
        <img src="${coverUrl}" alt="Cover" class="news-cover" loading="lazy">
      </div>
      <div class="news-content">
        <h3 class="news-title">${article.title}</h3>
        <div class="news-meta">
          <img src="${authorImage}" alt="Favicon" onerror="this.src='icons/icon48.png'">
          <span>${authorName} &middot; ${relTime}</span>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function setupNewsSlider(sliderEl, totalSlides) {
  let currentIndex = 0;
  const track = sliderEl.querySelector('#news-slider-track');
  const dots = sliderEl.querySelectorAll('.slider-dot');
  let autoPlayTimer = null;

  function goToSlide(index) {
    if (index < 0) index = totalSlides - 1;
    if (index >= totalSlides) index = 0;
    currentIndex = index;
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    dots.forEach((dot, i) => dot.classList.toggle('active', i === currentIndex));
    resetAutoPlay();
  }

  function nextSlide() { goToSlide(currentIndex + 1); }
  function prevSlide() { goToSlide(currentIndex - 1); }

  sliderEl.querySelector('#slider-prev').addEventListener('click', (e) => { e.preventDefault(); prevSlide(); });
  sliderEl.querySelector('#slider-next').addEventListener('click', (e) => { e.preventDefault(); nextSlide(); });

  dots.forEach((dot, i) => {
    dot.addEventListener('click', (e) => {
      e.preventDefault();
      goToSlide(i);
    });
  });

  function resetAutoPlay() {
    clearInterval(autoPlayTimer);
    autoPlayTimer = setInterval(nextSlide, 5000);
  }
  
  resetAutoPlay();
}

// ─── Internships Tab ────────────────────────────
let internshipsLoaded = false;
let currentInternshipsPage = 1;

function initInternships() {
  const tabInternships = document.getElementById('tab-internships');
  const tabInternshipsText = document.getElementById('tab-internships-text');
  const homeSection = document.getElementById('home-section');
  const exploreSection = document.getElementById('explore-section');
  const internshipsSection = document.getElementById('internships-section');
  const tabExplore = document.getElementById('tab-explore');
  const tabExploreText = document.getElementById('tab-explore-text');
  
  const refreshBtn = document.getElementById('refresh-internships-btn');
  const loadMoreBtn = document.getElementById('load-more-internships-btn');
  const seeLessBtn = document.getElementById('see-less-internships-btn');

  if (!tabInternships || !internshipsSection) return;

  tabInternships.addEventListener('click', () => {
    const isInternshipsActive = tabInternships.classList.contains('active');
    
    // Reset Explore tab if active
    if (tabExplore && tabExplore.classList.contains('active')) {
      tabExplore.classList.remove('active');
      tabExploreText.textContent = "Explore";
      exploreSection.classList.add('hidden');
    }
    
    if (isInternshipsActive) {
      // Switch back to Home
      tabInternships.classList.remove('active');
      tabInternshipsText.textContent = "Internships";
      internshipsSection.classList.add('hidden');
      homeSection.classList.remove('hidden');
      homeSection.style.animation = 'fadeInUp 0.3s ease-out';
    } else {
      // Switch to Internships
      tabInternships.classList.add('active');
      tabInternshipsText.textContent = "Home";
      homeSection.classList.add('hidden');
      internshipsSection.classList.remove('hidden');
      internshipsSection.style.animation = 'fadeInUp 0.3s ease-out';
      
      if (!internshipsLoaded) {
        currentInternshipsPage = 1;
        fetchInternships(false, false, 1);
      }
    }
  });

  // Also update Explore tab click to close Internships
  if (tabExplore) {
    tabExplore.addEventListener('click', () => {
       if (tabInternships.classList.contains('active')) {
         tabInternships.classList.remove('active');
         tabInternshipsText.textContent = "Internships";
         internshipsSection.classList.add('hidden');
       }
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      // Pick a random page to ensure a fresh set of internships
      currentInternshipsPage = Math.floor(Math.random() * 5) + 1;
      fetchInternships(true, false, currentInternshipsPage);
    });
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      currentInternshipsPage++;
      fetchInternships(true, true, currentInternshipsPage);
    });
  }

  if (seeLessBtn) {
    seeLessBtn.addEventListener('click', () => {
      currentInternshipsPage = 1;
      fetchInternships(false, false, 1);
      internshipsSection.scrollIntoView({ behavior: 'smooth' });
    });
  }
}

async function fetchInternships(forceRefresh = false, append = false, page = 1) {
  const grid = document.getElementById('internships-grid');
  const loader = document.getElementById('internships-loading');
  const refreshBtn = document.getElementById('refresh-internships-btn');
  const exploreControls = document.getElementById('internships-controls');
  const loadMoreBtn = document.getElementById('load-more-internships-btn');
  
  // Get user location filters asynchronously using the helper
  let userLocations = [];
  try {
    const prof = await new Promise(resolve => loadFromStorage('userProfessionalProfile', resolve));
    if (prof && prof.locations) {
      userLocations = prof.locations.split(',').map(l => l.trim().toLowerCase()).filter(l => l.length > 0);
    }
  } catch (e) {
    console.warn("Failed to load user profile for filtering", e);
  }

  const indicator = document.getElementById('internships-filter-indicator');
  const indicatorText = document.getElementById('internships-filter-text');
  if (userLocations.length > 0) {
    if (indicator) indicator.style.display = 'flex';
    if (indicatorText) indicatorText.textContent = `Filtered by: ${userLocations.join(', ')}`;
  } else {
    if (indicator) indicator.style.display = 'none';
  }

  if (!append) {
    if (forceRefresh) grid.innerHTML = '';
    loader.classList.remove('hidden');
    if (exploreControls) exploreControls.classList.add('hidden');
    if (forceRefresh && refreshBtn) refreshBtn.classList.add('spinning');
  } else {
    if (loadMoreBtn) {
      loadMoreBtn.disabled = true;
      loadMoreBtn.textContent = 'Loading...';
    }
  }

  try {
    // Only use cache for page 1 if NO filters are active
    if (!forceRefresh && page === 1 && userLocations.length === 0) {
      const cachedData = localStorage.getItem('cp_internships');
      const cachedTime = localStorage.getItem('cp_internships_time');
      if (cachedData && cachedTime && (Date.now() - parseInt(cachedTime)) < 2 * 60 * 60 * 1000) {
        renderInternships(JSON.parse(cachedData), false);
        return;
      }
    }

    let allResults = [];
    let currentPage = page;
    let pagesFetched = 0;
    const MAX_FETCH_DEPTH = 3; // Reduced to 3 to prevent long hanging times if region is unsupported
    const MIN_RESULTS = 6;
    
    if (userLocations.length > 0 && !append) {
      loader.innerHTML = `<div class="spinner"></div><p>Scanning global board for internships in your locations...</p>`;
      loader.classList.remove('hidden');
    }

    while (pagesFetched < MAX_FETCH_DEPTH && allResults.length < MIN_RESULTS) {
      const musePromise = fetch(`https://www.themuse.com/api/public/jobs?category=Software%20Engineering&category=Computer%20and%20IT&level=Internship&page=${currentPage}&descending=true`)
        .then(r => r.ok ? r.json() : {results: []}).catch(() => ({results: []}));
      
      const extraPromise = new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'fetchExtraInternships', page: currentPage }, response => {
          if (chrome.runtime.lastError) {
            resolve({ unstop: null, internshala: null, backgroundFailed: true });
          } else {
            resolve(response || { unstop: null, internshala: null });
          }
        });
      });

      const [museData, extraData] = await Promise.all([musePromise, extraPromise]);
      
      let pageResults = [];

      if (extraData && extraData.backgroundFailed && currentPage === 1 && !append) {
        window.internshipsDebugMessage = `<div style="grid-column: 1/-1; padding: 10px; background: rgba(255, 0, 0, 0.1); border: 1px solid red; border-radius: 8px; text-align: center; color: #ffcccc; margin-bottom: 10px;"><b>Action Required:</b> Please go to <code>chrome://extensions</code> and click the <b>Reload (circular arrow)</b> button for the CP Dashboard extension to enable Unstop & Internshala!</div>`;
      } else if (extraData && (extraData.unstop?.error || extraData.internshala?.error) && currentPage === 1 && !append) {
        window.internshipsDebugMessage = `<div style="grid-column: 1/-1; padding: 10px; background: rgba(255, 165, 0, 0.1); border: 1px solid orange; border-radius: 8px; text-align: left; color: orange; margin-bottom: 10px;"><b>Debug Info:</b><br/>Unstop: ${extraData.unstop?.error || 'OK'}<br/>Internshala: ${extraData.internshala?.error || 'OK'}</div>`;
      }

      // Process Muse
      if (museData && museData.results) {
        museData.results.forEach(job => {
          job.source = 'The Muse';
          pageResults.push(job);
        });
      }

      // Process Unstop
      if (extraData && extraData.unstop && extraData.unstop.data && extraData.unstop.data.data) {
        const unstopJobs = extraData.unstop.data.data.map(job => ({
          name: job.title,
          company: { name: job.organisation ? job.organisation.name : 'Unknown' },
          publication_date: job.updated_at || new Date().toISOString(),
          locations: job.jobDetail && job.jobDetail.locations ? job.jobDetail.locations.map(l => ({name: l})) : [],
          refs: { landing_page: job.seo_url || `https://unstop.com/${job.public_url}` },
          source: 'Unstop'
        }));
        pageResults = pageResults.concat(unstopJobs);
      }

      // Process Internshala
      if (extraData && extraData.internshala) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(extraData.internshala, 'text/html');
        const internshalaNodes = doc.querySelectorAll('.individual_internship');
        const internshalaJobs = Array.from(internshalaNodes).map(node => {
          const titleEl = node.querySelector('.job-title-href');
          const companyEl = node.querySelector('.company-name');
          const locEls = node.querySelectorAll('.locations a');
          const locs = Array.from(locEls).map(el => el.textContent.trim());
          return {
            name: titleEl ? titleEl.textContent.trim() : 'Internship',
            company: { name: companyEl ? companyEl.textContent.trim() : 'Unknown' },
            publication_date: new Date().toISOString(),
            locations: locs.map(l => ({name: l})),
            refs: { landing_page: titleEl ? `https://internshala.com${titleEl.getAttribute('href')}` : 'https://internshala.com' },
            source: 'Internshala'
          };
        });
        pageResults = pageResults.concat(internshalaJobs);
      }
      
      // Process Simplify
      if (extraData && extraData.simplify) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(extraData.simplify, 'text/html');
        const rows = doc.querySelectorAll('tbody tr');
        let currentCompany = 'Unknown';
        
        const simplifyJobs = [];
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 4) {
            const companyText = cells[0].textContent.trim();
            if (companyText && companyText !== '↳') {
              currentCompany = companyText;
            }
            
            const role = cells[1].textContent.trim();
            const locationText = cells[2].textContent.trim();
            const applyLinkEl = cells[3].querySelector('a');
            const applyLink = applyLinkEl ? applyLinkEl.getAttribute('href') : '';
            
            if (role && applyLink) {
               const locs = locationText.split(',').map(l => l.trim()).filter(l => l);
               simplifyJobs.push({
                 name: role,
                 company: { name: currentCompany },
                 publication_date: new Date().toISOString(),
                 locations: locs.map(l => ({name: l})),
                 refs: { landing_page: applyLink },
                 source: 'Simplify'
               });
            }
          }
        });
        pageResults = pageResults.concat(simplifyJobs);
      }
      
      if (pageResults.length === 0) break;
      
      let filtered = pageResults;
      if (userLocations.length > 0) {
        const cityAliases = {
          'bengaluru': 'bangalore',
          'bangalore': 'bengaluru',
          'gurgaon': 'gurugram',
          'gurugram': 'gurgaon',
          'mumbai': 'bombay',
          'chennai': 'madras',
          'kolkata': 'calcutta',
          'pune': 'poona'
        };

        filtered = pageResults.filter(job => {
          if (!job.locations || job.locations.length === 0) return false;
          return job.locations.some(loc => {
            const locName = loc.name.toLowerCase();
            return userLocations.some(ul => {
              if (locName.includes(ul)) return true;
              if (cityAliases[ul] && locName.includes(cityAliases[ul])) return true;
              return false;
            });
          });
        });
      }

      allResults = allResults.concat(filtered);
      
      if (userLocations.length === 0) {
        // shuffle to interleave platforms
        allResults.sort(() => Math.random() - 0.5);
        break; 
      }
      
      if (allResults.length < MIN_RESULTS) {
        currentPage++;
        currentInternshipsPage = currentPage; // update global state so Load More picks up correctly
        pagesFetched++;
      }
    }
    
    // Only cache if NO filters are active
    if (page === 1 && userLocations.length === 0) {
      localStorage.setItem('cp_internships', JSON.stringify(allResults));
      localStorage.setItem('cp_internships_time', Date.now().toString());
    }
    
    renderInternships(allResults, append);
  } catch (err) {
    console.warn("Internships fetch failed:", err);
    if (!append) loader.innerHTML = `<p style="color:var(--accent-red);">Failed to load internships. Please try again later.</p>`;
  } finally {
    if (refreshBtn) refreshBtn.classList.remove('spinning');
    if (loadMoreBtn) {
      loadMoreBtn.disabled = false;
      loadMoreBtn.textContent = 'Load More';
    }
  }
}
let renderedInternshipIds = new Set();

function renderInternships(jobs, append = false) {
  const grid = document.getElementById('internships-grid');
  const loader = document.getElementById('internships-loading');
  const exploreControls = document.getElementById('internships-controls');
  const seeLessBtn = document.getElementById('see-less-internships-btn');
  
  if (!append) {
    grid.innerHTML = window.internshipsDebugMessage || '';
    renderedInternshipIds.clear();
  }
  loader.classList.add('hidden');
  
  if (exploreControls) {
    if (jobs && jobs.length > 0 || append) {
      exploreControls.classList.remove('hidden');
    } else {
      exploreControls.classList.add('hidden');
    }
  }
  
  if (seeLessBtn) {
    if (currentInternshipsPage > 1) {
      seeLessBtn.classList.remove('hidden');
    } else {
      seeLessBtn.classList.add('hidden');
    }
  }
  
  internshipsLoaded = true;

  if (!jobs || jobs.length === 0) {
    if (!append) {
      let fallbackHtml = window.internshipsDebugMessage || '';
      fallbackHtml += `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); margin-bottom: 20px;">We couldn't find any internships right now. Please check back later.</p>`;
      grid.innerHTML = fallbackHtml;
    }
    return;
  }

  jobs.forEach(job => {
    const jobId = job.id || job.refs.landing_page;
    if (renderedInternshipIds.has(jobId)) return;
    renderedInternshipIds.add(jobId);

    const card = document.createElement('div');
    card.className = 'internship-card';
    
    const companyName = job.company.name;
    const dateOpts = { month: 'short', day: 'numeric', year: 'numeric' };
    const pubDate = new Date(job.publication_date).toLocaleDateString(undefined, dateOpts);
    
    // Generate a fallback placeholder logo based on company name
    let fallbackLogo = `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&background=random&color=fff&size=128`;
    let logoStyle = '';
    
    if (job.source) {
      if (job.source === 'Unstop') fallbackLogo = 'https://www.google.com/s2/favicons?domain=unstop.com&sz=128';
      else if (job.source === 'Internshala') fallbackLogo = 'https://internshala.com/favicon.ico';
      else if (job.source === 'The Muse') fallbackLogo = 'https://www.themuse.com/favicon.ico';
      else if (job.source === 'Simplify') fallbackLogo = 'https://simplify.jobs/favicon.ico';
      
      logoStyle = 'object-fit: contain; background: white; padding: 4px;';
    }
    
    const locations = job.locations && job.locations.length > 0 
      ? job.locations.slice(0, 2).map(l => l.name).join(' • ') + (job.locations.length > 2 ? ' ...' : '')
      : 'Remote / Unknown';

    card.innerHTML = `
      <div class="internship-header">
        <img src="${fallbackLogo}" alt="${job.source}" class="company-logo" style="${logoStyle}">
        <div class="internship-title-area">
          <h3 class="internship-title">${job.name}</h3>
          <div class="internship-company">${companyName}</div>
        </div>
      </div>
      <div class="internship-meta">
        <div class="internship-meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          <span>${locations}</span>
        </div>
        <div class="internship-meta-item" style="color: var(--text-muted);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <span>Posted: ${pubDate}</span>
        </div>
      </div>
      <a href="${job.refs.landing_page}" target="_blank" rel="noopener" class="apply-btn">Apply Now</a>
    `;
    grid.appendChild(card);
  });
}

let hackathonsLoaded = false;
let currentHackathonsPage = 1;

function initHackathons() {
  const tabHackathons = document.getElementById('tab-hackathons');
  const tabHackathonsText = document.getElementById('tab-hackathons-text');
  const homeSection = document.getElementById('home-section');
  const exploreSection = document.getElementById('explore-section');
  const internshipsSection = document.getElementById('internships-section');
  const hackathonsSection = document.getElementById('hackathons-section');
  
  const tabExplore = document.getElementById('tab-explore');
  const tabInternships = document.getElementById('tab-internships');
  const tabInternshipsText = document.getElementById('tab-internships-text');
  const tabExploreText = document.getElementById('tab-explore-text');
  
  const refreshBtn = document.getElementById('refresh-hackathons-btn');

  if (!tabHackathons || !hackathonsSection) return;

  tabHackathons.addEventListener('click', () => {
    const isHackathonsActive = tabHackathons.classList.contains('active');
    
    if (tabExplore && tabExplore.classList.contains('active')) {
      tabExplore.classList.remove('active');
      tabExploreText.textContent = "Explore";
      exploreSection.classList.add('hidden');
    }
    if (tabInternships && tabInternships.classList.contains('active')) {
      tabInternships.classList.remove('active');
      tabInternshipsText.textContent = "Internships";
      internshipsSection.classList.add('hidden');
    }
    
    if (isHackathonsActive) {
      tabHackathons.classList.remove('active');
      tabHackathonsText.textContent = "Hackathons";
      hackathonsSection.classList.add('hidden');
      homeSection.classList.remove('hidden');
      homeSection.style.animation = 'fadeInUp 0.3s ease-out';
    } else {
      tabHackathons.classList.add('active');
      tabHackathonsText.textContent = "Home";
      homeSection.classList.add('hidden');
      hackathonsSection.classList.remove('hidden');
      hackathonsSection.style.animation = 'fadeInUp 0.3s ease-out';
      
      if (!hackathonsLoaded) {
        currentHackathonsPage = 1;
        fetchHackathons(false, false, 1);
      }
    }
  });

  if (tabExplore) {
    tabExplore.addEventListener('click', () => {
       if (tabHackathons.classList.contains('active')) {
         tabHackathons.classList.remove('active');
         tabHackathonsText.textContent = "Hackathons";
         hackathonsSection.classList.add('hidden');
       }
    });
  }
  if (tabInternships) {
    tabInternships.addEventListener('click', () => {
       if (tabHackathons.classList.contains('active')) {
         tabHackathons.classList.remove('active');
         tabHackathonsText.textContent = "Hackathons";
         hackathonsSection.classList.add('hidden');
       }
    });
  }

  const loadMoreBtn = document.getElementById('load-more-hackathons-btn');
  const seeLessBtn = document.getElementById('see-less-hackathons-btn');

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      currentHackathonsPage = Math.floor(Math.random() * 5) + 1;
      fetchHackathons(true, false, currentHackathonsPage);
    });
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      currentHackathonsPage++;
      fetchHackathons(true, true, currentHackathonsPage);
    });
  }

  if (seeLessBtn) {
    seeLessBtn.addEventListener('click', () => {
      currentHackathonsPage = 1;
      fetchHackathons(false, false, 1);
      hackathonsSection.scrollIntoView({ behavior: 'smooth' });
    });
  }
}

async function fetchHackathons(forceRefresh = false, append = false, page = 1) {
  const grid = document.getElementById('hackathons-grid');
  const loader = document.getElementById('hackathons-loading');
  const refreshBtn = document.getElementById('refresh-hackathons-btn');
  const exploreControls = document.getElementById('hackathons-controls');
  const loadMoreBtn = document.getElementById('load-more-hackathons-btn');
  
  if (!append) {
    if (forceRefresh) grid.innerHTML = '';
    loader.classList.remove('hidden');
    if (exploreControls) exploreControls.classList.add('hidden');
    if (forceRefresh && refreshBtn) refreshBtn.classList.add('spinning');
  } else {
    if (loadMoreBtn) {
      loadMoreBtn.disabled = true;
      loadMoreBtn.textContent = 'Loading...';
    }
  }

  try {
    if (!forceRefresh && page === 1) {
      const cachedData = localStorage.getItem('cp_hackathons');
      const cachedTime = localStorage.getItem('cp_hackathons_time');
      if (cachedData && cachedTime && (Date.now() - parseInt(cachedTime)) < 2 * 60 * 60 * 1000) {
        renderHackathons(JSON.parse(cachedData), false);
        return;
      }
    }

    const data = await new Promise(resolve => {
      chrome.runtime.sendMessage({ action: 'fetchHackathons', page: page }, response => {
        if (chrome.runtime.lastError) resolve(null);
        else resolve(response);
      });
    });

    let results = [];
    
    if (!data) {
      grid.innerHTML = `<div style="grid-column: 1/-1; padding: 15px; background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: 8px; text-align: center; color: var(--accent-red); margin-bottom: 20px;"><b>Action Required:</b> Background services updated. Please go to <code>chrome://extensions</code> and click the <b>Reload (circular arrow)</b> button for this extension!</div>`;
      loader.classList.add('hidden');
      return;
    }

    if (data && data.unstop && data.unstop.data && data.unstop.data.data) {
      data.unstop.data.data.forEach(h => {
        results.push({
          title: h.title,
          url: h.seo_url || `https://unstop.com/${h.public_url}`,
          platform: 'Unstop',
          thumbnail: h.logoUrl2 || h.logoUrl || 'https://www.google.com/s2/favicons?domain=unstop.com&sz=128',
          status: h.regnRequirements ? h.regnRequirements.remain_days : h.status,
          company: h.organisation ? h.organisation.name : 'Unknown'
        });
      });
    }

    if (data && data.devpost && data.devpost.hackathons) {
      data.devpost.hackathons.forEach(h => {
        results.push({
          title: h.title,
          url: h.url,
          platform: 'Devpost',
          thumbnail: h.thumbnail_url || 'https://www.google.com/s2/favicons?domain=devpost.com&sz=128',
          status: h.time_left_to_submit || h.displayed_location || h.status,
          company: h.organization_name || 'Devpost'
        });
      });
    }
    
    // Sort slightly randomly to mix unstop and devpost
    results.sort(() => Math.random() - 0.5);

    if (page === 1) {
      if (results.length > 0) {
        localStorage.setItem('cp_hackathons', JSON.stringify(results));
        localStorage.setItem('cp_hackathons_time', Date.now().toString());
      } else {
        localStorage.removeItem('cp_hackathons_time');
      }
    }

    renderHackathons(results, append);
  } catch (err) {
    console.warn("Hackathons fetch failed:", err);
    if (!append) loader.innerHTML = `<p style="color:var(--accent-red);">Failed to load hackathons. Please try again later.</p>`;
  } finally {
    if (refreshBtn) refreshBtn.classList.remove('spinning');
    if (loadMoreBtn) {
      loadMoreBtn.disabled = false;
      loadMoreBtn.textContent = 'Load More';
    }
  }
}

let renderedHackathonIds = new Set();

function renderHackathons(hackathons, append = false) {
  const grid = document.getElementById('hackathons-grid');
  const loader = document.getElementById('hackathons-loading');
  const exploreControls = document.getElementById('hackathons-controls');
  const seeLessBtn = document.getElementById('see-less-hackathons-btn');
  
  if (!append) {
    grid.innerHTML = '';
    renderedHackathonIds.clear();
  }
  loader.classList.add('hidden');
  
  if (exploreControls) {
    if (hackathons && hackathons.length > 0 || append) {
      exploreControls.classList.remove('hidden');
    } else {
      exploreControls.classList.add('hidden');
    }
  }
  
  if (seeLessBtn) {
    if (currentHackathonsPage > 1) {
      seeLessBtn.classList.remove('hidden');
    } else {
      seeLessBtn.classList.add('hidden');
    }
  }
  
  hackathonsLoaded = true;

  if (!hackathons || hackathons.length === 0) {
    if (!append) {
      grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); margin-bottom: 20px;">We couldn't find any hackathons right now. Please check back later.</p>`;
    }
    return;
  }

  hackathons.forEach(h => {
    const hashId = h.url || h.title;
    if (renderedHackathonIds.has(hashId)) return;
    renderedHackathonIds.add(hashId);

    const card = document.createElement('div');
    card.className = 'internship-card'; 
    card.innerHTML = `
      <div class="internship-header">
        <img src="${h.thumbnail}" alt="${h.platform}" class="company-logo" style="object-fit: cover; background: white;">
        <div class="internship-title-area">
          <h3 class="internship-title">${h.title}</h3>
          <div class="internship-company">${h.company}</div>
        </div>
      </div>
      <div class="internship-meta">
        <div class="internship-meta-item" style="color: var(--accent-cyan); font-weight: 500;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          <span>${h.status || 'Open'}</span>
        </div>
        <div class="internship-meta-item" style="color: var(--text-muted);">
          <span>Platform: ${h.platform}</span>
        </div>
      </div>
      <a href="${h.url}" target="_blank" rel="noopener" class="apply-btn">View Hackathon</a>
    `;
    grid.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', init);

// ─── Particle Background ────────────────────────
function initParticles() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  let width, height;
  let particles = [];
  
  // Symbols for light mode
  const symbols = ['{', '}', '<', '>', '/', ';', '0', '1', '()', '=>'];
  
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  }
  window.addEventListener('resize', resize);
  resize();
  
  const mouse = { x: -1000, y: -1000 };
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  window.addEventListener('mouseout', () => {
    mouse.x = -1000;
    mouse.y = -1000;
  });
  
  class Particle {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5;
      this.radius = Math.random() * 1.5 + 0.5;
      this.symbol = symbols[Math.floor(Math.random() * symbols.length)];
      this.fontSize = Math.random() * 14 + 10; // 10px to 24px
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > width) this.vx = -this.vx;
      if (this.y < 0 || this.y > height) this.vy = -this.vy;
    }
    draw(isLight) {} // Draw logic moved to animate function
  }
  
  const particleCount = Math.min(Math.floor((width * height) / 12000), 120);
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  let matrixCols = 0;
  let matrixDrops = [];
  function initMatrix() {
    matrixCols = Math.floor(width / 20);
    matrixDrops = Array(matrixCols).fill(1);
  }
  initMatrix();
  window.addEventListener('resize', initMatrix);
  
  function animate() {
    requestAnimationFrame(animate);
    const isLight = document.body.getAttribute('data-theme') === 'light';
    const wp = isLight ? lightWallpaperStyle : darkWallpaperStyle;
    
    if (wp.startsWith('static-')) {
      ctx.clearRect(0, 0, width, height);
      return;
    }
    
    if (wp === 'dynamic-matrix') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#0F0';
      ctx.font = '15px "JetBrains Mono", monospace';
      for (let i = 0; i < matrixDrops.length; i++) {
        const text = String.fromCharCode(Math.floor(Math.random() * 94) + 33);
        ctx.fillText(text, i * 20, matrixDrops[i] * 20);
        if (matrixDrops[i] * 20 > height && Math.random() > 0.975) {
          matrixDrops[i] = 0;
        }
        matrixDrops[i]++;
      }
      return;
    }

    ctx.clearRect(0, 0, width, height);
    
    // --- New Dynamic: Waves ---
    if (wp === 'dynamic-waves') {
      const time = Date.now() * 0.001;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 10) {
        const y = height/2 + Math.sin(x * 0.003 + time) * 120 + Math.sin(x * 0.007 - time * 0.6) * 60;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = isLight ? 'rgba(108, 140, 255, 0.35)' : 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      for (let x = 0; x <= width; x += 10) {
        const y = height/2 + Math.cos(x * 0.002 - time * 0.8) * 150 + Math.sin(x * 0.005 + time * 1.2) * 80;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = isLight ? 'rgba(108, 140, 255, 0.15)' : 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 2;
      ctx.stroke();
      return;
    }

    // --- Particles Base Array ---
    for (let i = 0; i < particles.length; i++) {
      // --- New Dynamic: Snow ---
      if (wp === 'dynamic-snow') {
        particles[i].y += particles[i].radius * 0.8;
        particles[i].x += Math.sin(particles[i].y * 0.01 + particles[i].vx * 10) * 0.5;
        if (particles[i].y > height) {
           particles[i].y = -10;
           particles[i].x = Math.random() * width;
        }
        ctx.beginPath();
        ctx.arc(particles[i].x, particles[i].y, particles[i].radius * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();
        continue;
      }

      // --- New Dynamic: Bubbles ---
      if (wp === 'dynamic-bubbles') {
        particles[i].y -= particles[i].radius * 0.6;
        particles[i].x += Math.cos(particles[i].y * 0.015 + particles[i].vx * 5) * 0.4;
        if (particles[i].y < -10) {
           particles[i].y = height + 10;
           particles[i].x = Math.random() * width;
        }
        ctx.beginPath();
        ctx.arc(particles[i].x, particles[i].y, particles[i].radius * 3, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(108, 140, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
        continue;
      }

      // --- New Dynamic: Warp Speed ---
      if (wp === 'dynamic-warp') {
        if (!particles[i].z) {
          particles[i].z = Math.random() * width;
          particles[i].wx = (Math.random() - 0.5) * width;
          particles[i].wy = (Math.random() - 0.5) * height;
        }
        particles[i].z -= 8;
        if (particles[i].z <= 0) {
          particles[i].z = width;
          particles[i].wx = (Math.random() - 0.5) * width;
          particles[i].wy = (Math.random() - 0.5) * height;
        }
        const k = 128.0 / particles[i].z;
        const px = particles[i].wx * k + width / 2;
        const py = particles[i].wy * k + height / 2;
        if (px >= 0 && px <= width && py >= 0 && py <= height) {
          const r = (1 - particles[i].z / width) * 2.5;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${1 - particles[i].z / width})`;
          ctx.fill();
        }
        continue;
      }

      // --- Default logic (Symbols / Nodes) ---
      particles[i].update();
      
      const isSymbols = (isLight && wp === 'dynamic-default');
      
      // Draw particle
      if (isSymbols) {
        ctx.font = `${particles[i].fontSize}px "JetBrains Mono", monospace`;
        ctx.fillStyle = 'rgba(108, 140, 255, 0.25)';
        ctx.fillText(particles[i].symbol, particles[i].x, particles[i].y);
      } else {
        ctx.beginPath();
        ctx.arc(particles[i].x, particles[i].y, particles[i].radius, 0, Math.PI * 2);
        ctx.fillStyle = isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)';
        ctx.fill();
      }
      
      // Draw lines between particles (nodes/constellations)
      if (!isSymbols) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = isLight 
              ? `rgba(0, 0, 0, ${0.1 * (1 - dist/120)})` 
              : `rgba(255, 255, 255, ${0.15 * (1 - dist/120)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      
      // Mouse interaction
      const dxm = particles[i].x - mouse.x;
      const dym = particles[i].y - mouse.y;
      const distm = Math.sqrt(dxm * dxm + dym * dym);
      if (distm < 150) {
        ctx.beginPath();
        ctx.strokeStyle = isLight
          ? `rgba(0, 0, 0, ${0.2 * (1 - distm/150)})`
          : `rgba(108, 140, 255, ${0.4 * (1 - distm/150)})`; 
        ctx.lineWidth = 1;
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.stroke();
        
        particles[i].x -= dxm * 0.003;
        particles[i].y -= dym * 0.003;
      }
    }
  }
  animate();
}

// Global Infinite Scroll Listener
window.addEventListener('scroll', () => {
  // Infinite scroll for News
  const exploreSection = document.getElementById('explore-section');
  const loadMoreNewsBtn = document.getElementById('load-more-news-btn');
  if (exploreSection && !exploreSection.classList.contains('hidden') && typeof exploreLoaded !== 'undefined' && exploreLoaded && loadMoreNewsBtn && !loadMoreNewsBtn.disabled) {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
      loadMoreNewsBtn.click();
    }
  }

  // Infinite scroll for Internships
  const internshipsSection = document.getElementById('internships-section');
  const loadMoreInternshipsBtn = document.getElementById('load-more-internships-btn');
  if (internshipsSection && !internshipsSection.classList.contains('hidden') && typeof internshipsLoaded !== 'undefined' && internshipsLoaded && loadMoreInternshipsBtn && !loadMoreInternshipsBtn.disabled) {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
      loadMoreInternshipsBtn.click();
    }
  }

  // Infinite scroll for Hackathons
  const hackathonsSection = document.getElementById('hackathons-section');
  const loadMoreHackathonsBtn = document.getElementById('load-more-hackathons-btn');
  if (hackathonsSection && !hackathonsSection.classList.contains('hidden') && typeof hackathonsLoaded !== 'undefined' && hackathonsLoaded && loadMoreHackathonsBtn && !loadMoreHackathonsBtn.disabled) {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
      loadMoreHackathonsBtn.click();
    }
  }
});

// --- Premium Custom Dropdowns Logic ---
function initCustomSelects() {
  const selects = document.querySelectorAll('select.form-input, select.heatmap-year-select, select.todo-timer-unit');
  
  selects.forEach(select => {
    if (select.parentElement.classList.contains('custom-select-wrapper')) return;

    const wrapper = document.createElement('div');
    wrapper.classList.add('custom-select-wrapper');
    if (select.classList.contains('todo-timer-unit')) {
      wrapper.classList.add('todo-timer-select-wrapper');
    }
    if (select.style.marginBottom) wrapper.style.marginBottom = select.style.marginBottom;
    
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);

    const trigger = document.createElement('div');
    trigger.classList.add('custom-select-trigger');
    const selectedText = document.createElement('span');
    selectedText.textContent = select.options[select.selectedIndex]?.text || 'Select...';
    trigger.appendChild(selectedText);
    
    const arrow = document.createElement('span');
    arrow.classList.add('arrow');
    trigger.appendChild(arrow);
    
    wrapper.appendChild(trigger);

    const optionsContainer = document.createElement('div');
    optionsContainer.classList.add('custom-options');
    wrapper.appendChild(optionsContainer);

    Array.from(select.options).forEach(option => {
      const optionEl = document.createElement('span');
      optionEl.classList.add('custom-option');
      optionEl.textContent = option.text;
      optionEl.dataset.value = option.value;
      
      if (option.disabled) {
        optionEl.classList.add('disabled');
      } else {
        if (option.selected) {
          optionEl.classList.add('selected');
        }
        
        optionEl.addEventListener('click', (e) => {
          e.stopPropagation();
          wrapper.querySelectorAll('.custom-option').forEach(el => el.classList.remove('selected'));
          optionEl.classList.add('selected');
          
          select.value = option.value;
          selectedText.textContent = option.text;
          wrapper.classList.remove('open');
          
          select.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }
      
      optionsContainer.appendChild(optionEl);
    });

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.custom-select-wrapper').forEach(w => {
        if (w !== wrapper) w.classList.remove('open');
      });
      wrapper.classList.toggle('open');
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select-wrapper.open').forEach(w => w.classList.remove('open'));
  });
}

function syncCustomSelects() {
  document.querySelectorAll('.custom-select-wrapper').forEach(wrapper => {
    const select = wrapper.querySelector('select');
    if (!select) return;
    
    const triggerText = wrapper.querySelector('.custom-select-trigger span:not(.arrow)');
    const selectedOption = select.options[select.selectedIndex];
    if (triggerText && selectedOption) {
      triggerText.textContent = selectedOption.text;
    }
    
    wrapper.querySelectorAll('.custom-option').forEach(opt => {
      if (opt.dataset.value === select.value) {
        opt.classList.add('selected');
      } else {
        opt.classList.remove('selected');
      }
    });
  });
}

function rebuildCustomSelect(select) {
  if (select.parentElement && select.parentElement.classList.contains('custom-select-wrapper')) {
    const wrapper = select.parentElement;
    wrapper.parentNode.insertBefore(select, wrapper);
    wrapper.remove();
  }
  initCustomSelects();
}

let placementsLoaded = false;
let currentPlacementsPage = 1;

function initPlacements() {
  const tabPlacements = document.getElementById('tab-placements');
  const tabPlacementsText = document.getElementById('tab-placements-text');
  const homeSection = document.getElementById('home-section');
  const exploreSection = document.getElementById('explore-section');
  const internshipsSection = document.getElementById('internships-section');
  const hackathonsSection = document.getElementById('hackathons-section');
  const placementsSection = document.getElementById('placements-section');
  
  const tabExplore = document.getElementById('tab-explore');
  const tabInternships = document.getElementById('tab-internships');
  const tabHackathons = document.getElementById('tab-hackathons');
  
  const refreshBtn = document.getElementById('refresh-placements-btn');

  if (!tabPlacements || !placementsSection) return;

  tabPlacements.addEventListener('click', () => {
    const isPlacementsActive = tabPlacements.classList.contains('active');
    
    if (tabExplore && tabExplore.classList.contains('active')) {
      tabExplore.classList.remove('active');
      document.getElementById('tab-explore-text').textContent = "Explore";
      exploreSection.classList.add('hidden');
    }
    if (tabInternships && tabInternships.classList.contains('active')) {
      tabInternships.classList.remove('active');
      document.getElementById('tab-internships-text').textContent = "Internships";
      internshipsSection.classList.add('hidden');
    }
    if (tabHackathons && tabHackathons.classList.contains('active')) {
      tabHackathons.classList.remove('active');
      document.getElementById('tab-hackathons-text').textContent = "Hackathons";
      hackathonsSection.classList.add('hidden');
    }
    
    if (isPlacementsActive) {
      tabPlacements.classList.remove('active');
      tabPlacementsText.textContent = "Placements";
      placementsSection.classList.add('hidden');
      homeSection.classList.remove('hidden');
      homeSection.style.animation = 'fadeInUp 0.3s ease-out';
    } else {
      tabPlacements.classList.add('active');
      tabPlacementsText.textContent = "Home";
      homeSection.classList.add('hidden');
      placementsSection.classList.remove('hidden');
      placementsSection.style.animation = 'fadeInUp 0.3s ease-out';
      
      if (!placementsLoaded) {
        currentPlacementsPage = 1;
        fetchPlacements(false, false, 1);
      }
    }
  });

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      currentPlacementsPage = 1;
      fetchPlacements(true, false, 1);
    });
  }

  const loadMoreBtn = document.getElementById('load-more-placements-btn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      currentPlacementsPage++;
      fetchPlacements(false, true, currentPlacementsPage);
    });
  }

  const seeLessBtn = document.getElementById('see-less-placements-btn');
  if (seeLessBtn) {
    seeLessBtn.addEventListener('click', () => {
      currentPlacementsPage = 1;
      const grid = document.getElementById('placements-grid');
      const allCards = Array.from(grid.children);
      const toKeep = allCards.slice(0, 15);
      grid.innerHTML = '';
      toKeep.forEach(c => grid.appendChild(c));
      seeLessBtn.classList.add('hidden');
      placementsSection.scrollIntoView({ behavior: 'smooth' });
    });
  }
}

async function fetchPlacements(forceRefresh = false, append = false, page = 1) {
  const loading = document.getElementById('placements-loading');
  const grid = document.getElementById('placements-grid');
  const controls = document.getElementById('placements-controls');
  const loadMoreBtn = document.getElementById('load-more-placements-btn');
  const seeLessBtn = document.getElementById('see-less-placements-btn');
  
  if (!append) {
    loading.style.display = 'flex';
    grid.innerHTML = '';
    controls.classList.add('hidden');
  } else {
    loadMoreBtn.textContent = 'Loading...';
    loadMoreBtn.disabled = true;
  }

  try {
    const data = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'fetchPlacements', page: page }, response => {
        resolve(response || { unstop: null, internshala: null, simplify: null });
      });
    });

    let pageResults = [];

    // Process Unstop
    if (data && data.unstop && data.unstop.data && data.unstop.data.data) {
      const unstopJobs = data.unstop.data.data.map(job => ({
        name: job.title,
        company: { name: job.organisation ? job.organisation.name : 'Unknown' },
        publication_date: job.updated_at || new Date().toISOString(),
        locations: job.jobDetail && job.jobDetail.locations ? job.jobDetail.locations.map(l => ({name: l})) : [],
        refs: { landing_page: job.seo_url || `https://unstop.com/${job.public_url}` },
        source: 'Unstop'
      }));
      pageResults = pageResults.concat(unstopJobs);
    }

    // Process Internshala
    if (data && data.internshala) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(data.internshala, 'text/html');
      const internshalaNodes = doc.querySelectorAll('.individual_internship');
      const internshalaJobs = Array.from(internshalaNodes).map(node => {
        const titleEl = node.querySelector('.job-title-href');
        const companyEl = node.querySelector('.company-name');
        const locEls = node.querySelectorAll('.locations a');
        const locs = Array.from(locEls).map(el => el.textContent.trim());
        return {
          name: titleEl ? titleEl.textContent.trim() : 'Placement',
          company: { name: companyEl ? companyEl.textContent.trim() : 'Unknown' },
          publication_date: new Date().toISOString(),
          locations: locs.map(l => ({name: l})),
          refs: { landing_page: titleEl ? `https://internshala.com${titleEl.getAttribute('href')}` : 'https://internshala.com' },
          source: 'Internshala'
        };
      });
      pageResults = pageResults.concat(internshalaJobs);
    }
    
    // Process Simplify New Grad
    if (data && data.simplify) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(data.simplify, 'text/html');
      const rows = doc.querySelectorAll('tbody tr');
      let currentCompany = 'Unknown';
      
      const simplifyJobs = [];
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 4) {
          const companyText = cells[0].textContent.trim();
          if (companyText && companyText !== '↳') {
            currentCompany = companyText;
          }
          
          const role = cells[1].textContent.trim();
          const locationText = cells[2].textContent.trim();
          const linkNode = cells[3].querySelector('a');
          
          if (linkNode && linkNode.href) {
            simplifyJobs.push({
              name: role,
              company: { name: currentCompany },
              publication_date: new Date().toISOString(),
              locations: [{ name: locationText }],
              refs: { landing_page: linkNode.href },
              source: 'Simplify'
            });
          }
        }
      });
      
      pageResults = pageResults.concat(simplifyJobs);
    }

    pageResults.sort(() => Math.random() - 0.5);

    if (!append) grid.innerHTML = '';

    if (pageResults.length === 0 && !append) {
      grid.innerHTML = '<p style="color: var(--text-muted); text-align: center; grid-column: 1/-1;">No placements found.</p>';
    } else {
      pageResults.forEach(job => {
        const card = document.createElement('div');
        card.className = 'internship-card';

        const companyName = job.company && job.company.name ? job.company.name : 'Unknown Company';
        
        let fallbackLogo = 'icons/icon48.png';
        let logoStyle = 'object-fit: cover;';
        
        if (job.source) {
          if (job.source === 'Unstop') fallbackLogo = 'https://www.google.com/s2/favicons?domain=unstop.com&sz=128';
          else if (job.source === 'Internshala') fallbackLogo = 'https://internshala.com/favicon.ico';
          else if (job.source === 'Simplify') fallbackLogo = 'https://simplify.jobs/favicon.ico';
          logoStyle = 'object-fit: contain; background: white; padding: 4px;';
        }
        
        const locations = job.locations && job.locations.length > 0 
          ? job.locations.slice(0, 2).map(l => l.name).join(' • ') + (job.locations.length > 2 ? ' ...' : '')
          : 'Remote / Unknown';

        card.innerHTML = `
          <div class="internship-header">
            <img src="${fallbackLogo}" alt="${job.source}" class="company-logo" style="${logoStyle}">
            <div class="internship-title-area">
              <h3 class="internship-title">${job.name}</h3>
              <div class="internship-company">${companyName}</div>
            </div>
          </div>
          <div class="internship-meta">
            <div class="internship-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              <span>${locations}</span>
            </div>
            <div class="internship-meta-item">
              <span>Source: ${job.source || 'Aggregator'}</span>
            </div>
          </div>
          <a href="${job.refs.landing_page}" target="_blank" rel="noopener" class="apply-btn">View Job</a>
        `;
        grid.appendChild(card);
      });
    }

    placementsLoaded = true;
    controls.classList.remove('hidden');
    
    if (page > 1) {
      seeLessBtn.classList.remove('hidden');
    }

  } catch (err) {
    console.error('Error fetching placements:', err);
    if (!append) {
      grid.innerHTML = '<p style="color: var(--text-muted); text-align: center; grid-column: 1/-1;">Failed to load placements.</p>';
    }
  } finally {
    if (!append) loading.style.display = 'none';
    else {
      loadMoreBtn.textContent = 'Load More';
      loadMoreBtn.disabled = false;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initCustomSelects, 100);
});
initCustomSelects();