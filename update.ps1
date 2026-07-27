$content = Get-Content index.html -Raw

$newModal = @"
    <div class="modal settings-modal-wide" id="settings-modal" style="width: 850px; max-width: 95%; height: 500px; display: flex; flex-direction: column; padding: 0;">
      <div class="modal-header" style="border-bottom: 1px solid var(--border-subtle); padding: 16px 24px; display: flex; justify-content: space-between; align-items: center;">
        <h2 class="modal-title" style="font-size: 1.2rem; margin: 0;">Settings</h2>
        <button type="button" class="modal-close" id="settings-close" title="Close" style="background: transparent; border: none; color: var(--text-muted); cursor: pointer;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <form class="settings-layout" id="settings-form" style="display: flex; flex: 1; overflow: hidden; margin: 0;">
        <div class="settings-sidebar" style="width: 220px; border-right: 1px solid var(--border-subtle); padding: 16px 8px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;">
          <button type="button" class="settings-tab active" data-pane="pane-profiles" style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: var(--bg-card-hover); border: none; color: var(--text-primary); text-align: left; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            Profiles
          </button>
          <button type="button" class="settings-tab" data-pane="pane-appearance" style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: transparent; border: none; color: var(--text-secondary); text-align: left; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="2.5"></circle><path d="M19 21S16 16.6 16 12a3.5 3.5 0 1 0-7 0c0 4.6-3 9-3 9"></path><circle cx="4.5" cy="6.5" r="2.5"></circle></svg>
            Appearance
          </button>
          <button type="button" class="settings-tab" data-pane="pane-weather" style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: transparent; border: none; color: var(--text-secondary); text-align: left; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            Weather
          </button>
          <button type="button" class="settings-tab" data-pane="pane-ai" style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: transparent; border: none; color: var(--text-secondary); text-align: left; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            Copilot and AI
          </button>
        </div>

        <div class="settings-content" style="flex: 1; padding: 24px; overflow-y: auto; position: relative;">
          <!-- Profiles Pane -->
          <div class="settings-pane active" id="pane-profiles">
            <h3 style="font-size: 1.1rem; margin-bottom: 20px; margin-top: 0;">Profiles</h3>
            
            <h4 style="font-size: 0.9rem; margin-bottom: 12px; color: var(--text-secondary); font-weight: 500;">Competitive Programming</h4>
            <div class="form-group">
              <label class="form-label" for="cf-handle">
                <img src="icons/cf-logo.svg" class="form-label-icon" alt="CF">
                Codeforces Handle
              </label>
              <input type="text" class="form-input" id="cf-handle" placeholder="e.g. tourist" autocomplete="off">
            </div>
            <div class="form-group">
              <label class="form-label" for="lc-handle">
                <img src="icons/lc-logo.svg" class="form-label-icon" alt="LC">
                LeetCode Username
              </label>
              <input type="text" class="form-input" id="lc-handle" placeholder="e.g. your_username" autocomplete="off">
            </div>
            <div class="form-group">
              <label class="form-label" for="cc-handle">
                <img src="icons/cc-logo.svg" class="form-label-icon" alt="CC">
                CodeChef Username
              </label>
              <input type="text" class="form-input" id="cc-handle" placeholder="e.g. your_username" autocomplete="off">
            </div>

            <hr style="border: 0; border-top: 1px solid var(--border-subtle); margin: 24px 0;">
            <h4 style="font-size: 0.9rem; margin-bottom: 12px; color: var(--text-secondary); font-weight: 500;">Professional Profile</h4>
            <div class="form-group">
              <label class="form-label" for="profile-college">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="form-label-icon"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
                College / University Name
              </label>
              <input type="text" class="form-input" id="profile-college" placeholder="e.g. MIT, IIT Delhi" autocomplete="off">
            </div>
            <div class="form-group">
              <label class="form-label" for="profile-year">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="form-label-icon"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                Year of Study
              </label>
              <input type="text" class="form-input" id="profile-year" placeholder="e.g. 3rd Year B.Tech" autocomplete="off">
            </div>
            <div class="form-group">
              <label class="form-label" for="profile-locations">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="form-label-icon"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                Preferred Locations (comma separated)
              </label>
              <input type="text" class="form-input" id="profile-locations" placeholder="e.g. Bengaluru, Gurgaon, London" autocomplete="off">
              <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 6px;">We'll filter the Internships board based on these locations.</p>
            </div>

            <hr style="border: 0; border-top: 1px solid var(--border-subtle); margin: 24px 0;">
            <h4 style="font-size: 0.9rem; margin-bottom: 12px; color: var(--text-secondary); font-weight: 500;">Security</h4>
            <div class="form-group lock-section">
              <div class="lock-controls">
                <button type="button" class="lock-btn" id="lock-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="lock-icon">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <span id="lock-btn-text">Lock Profiles</span>
                </button>
                <span class="lock-status" id="lock-status">Status: Unlocked</span>
              </div>
              <div class="unlock-prompt hidden" id="unlock-prompt">
                <p id="unlock-prompt-text" style="margin-bottom: 8px; font-size: 0.85rem; color: var(--text-secondary);">Enter password:</p>
                <div style="display: flex; gap: 10px;">
                  <input type="password" class="form-input" id="unlock-input" placeholder="Password" autocomplete="off" style="margin-bottom: 0;">
                  <button type="button" class="unlock-confirm-btn" id="unlock-confirm-btn">Confirm</button>
                </div>
              </div>
            </div>
            
            <div style="height: 60px;"></div>
          </div>

          <!-- Appearance Pane -->
          <div class="settings-pane" id="pane-appearance" style="display: none;">
            <h3 style="font-size: 1.1rem; margin-bottom: 20px; margin-top: 0;">Appearance</h3>

            <h4 style="font-size: 0.9rem; margin-bottom: 12px; color: var(--text-secondary); font-weight: 500;">Theme</h4>
            <div class="form-group" style="margin-bottom: 16px;">
              <label class="form-label" for="theme-select">Color Theme</label>
              <select class="form-input" id="theme-select" style="margin-bottom: 0;">
                <option value="dark">?? Midnight (Default Dark)</option>
                <option value="light">?? Daylight (Light)</option>
                <option disabled>-- Editor Themes --</option>
                <option value="dracula">?? Dracula</option>
                <option value="nord">?? Nord</option>
                <option value="monokai">?? Monokai</option>
                <option value="solarized">?? Solarized Dark</option>
                <option value="gruvbox">?? Gruvbox</option>
                <option value="catppuccin">?? Catppuccin Mocha</option>
                <option value="neon">? Neon Cyberpunk</option>
              </select>
            </div>

            <hr style="border: 0; border-top: 1px solid var(--border-subtle); margin: 24px 0;">
            <h4 style="font-size: 0.9rem; margin-bottom: 12px; color: var(--text-secondary); font-weight: 500;">Clock Settings</h4>
            <div class="form-group" style="display: flex; gap: 12px; margin-bottom: 16px;">
              <div style="flex: 1;">
                <label class="form-label" for="digital-clock-style">Digital Style</label>
                <select class="form-input" id="digital-clock-style" style="margin-bottom: 0;">
                  <option value="default">3D Blue (Default)</option>
                  <option value="minimal">Minimal Flat</option>
                  <option value="neon">Cyberpunk Neon</option>
                  <option value="glass">Glassmorphism</option>
                  <option value="arcade">Retro Arcade</option>
                  <option value="sunset">Sunset Gradient</option>
                  <option value="outline">Monochrome Outline</option>
                  <option disabled>-- Layouts --</option>
                  <option value="flip">Flip Clock Card</option>
                  <option value="stacked">Vertical Stacked</option>
                  <option value="tech">Tech Dashboard Grid</option>
                  <option disabled>-- Unique --</option>
                  <option value="lcd">Retro LCD Device</option>
                  <option value="cyber">Cyber Hacker Matrix</option>
                  <option value="led">LED Panel Display</option>
                </select>
              </div>
              <div style="flex: 1;">
                <label class="form-label" for="analog-clock-style">Analog Style</label>
                <select class="form-input" id="analog-clock-style" style="margin-bottom: 0;">
                  <option value="default">Realistic 3D (Default)</option>
                  <option value="minimal">Modern Minimal</option>
                  <option value="neon">Hologram Neon</option>
                  <option value="glass">Frosted Glass</option>
                  <option value="luxury">Gold Luxury</option>
                  <option value="stealth">Stealth Dark</option>
                  <option value="radar">Retro Radar</option>
                  <option value="snake">Serpent</option>
                  <option disabled>-- Layouts --</option>
                  <option value="square">Square Card</option>
                  <option value="ring">Orbiting Dots</option>
                  <option value="hollow">Wireframe Hollow</option>
                  <option value="pendulum">Classic Pendulum</option>
                  <option disabled>-- Unique --</option>
                  <option value="speedometer">Dashboard Speedometer</option>
                  <option value="skeleton">Exposed Gear Skeleton</option>
                  <option value="circuit">Circuit Board</option>
                  <option value="nautical">Nautical Anchor</option>
                  <option value="serpent">Serpent Roman</option>
                  <option value="cubes">3D Floating Cubes</option>
                  <option value="lunar">Celestial Lunar</option>
                  <option value="lunar-crescent">3D Crescent Moon</option>
                </select>
              </div>
            </div>

            <hr style="border: 0; border-top: 1px solid var(--border-subtle); margin: 24px 0;">
            <h4 style="font-size: 0.9rem; margin-bottom: 12px; color: var(--text-secondary); font-weight: 500;">Wallpaper Settings</h4>
            <div class="form-group" style="display: flex; gap: 12px; margin-bottom: 16px;">
              <div style="flex: 1;">
                <label class="form-label" for="light-wallpaper-style">Light Mode</label>
                <select class="form-input" id="light-wallpaper-style" style="margin-bottom: 0;">
                  <option value="dynamic-default">Hacker Blue Symbols (Dynamic)</option>
                  <option value="dynamic-nodes">Floating Nodes (Dynamic)</option>
                  <option value="dynamic-bubbles">Rising Bubbles (Dynamic)</option>
                  <option value="dynamic-waves">Flowing Waves (Dynamic)</option>
                  <option value="static-gradient">Soft Gradient (Static)</option>
                  <option value="static-topography">Abstract Topography (Static)</option>
                </select>
              </div>
              <div style="flex: 1;">
                <label class="form-label" for="dark-wallpaper-style">Dark Mode</label>
                <select class="form-input" id="dark-wallpaper-style" style="margin-bottom: 0;">
                  <option value="dynamic-default">Constellations (Dynamic)</option>
                  <option value="dynamic-matrix">Matrix Rain (Dynamic)</option>
                  <option value="dynamic-warp">Warp Speed (Dynamic)</option>
                  <option value="dynamic-snow">Falling Snow (Dynamic)</option>
                  <option value="static-space">Deep Space (Static)</option>
                  <option value="static-cyberpunk">Neon Cyberpunk City (Static)</option>
                </select>
              </div>
            </div>
            
            <div style="height: 60px;"></div>
          </div>

          <!-- Weather Pane -->
          <div class="settings-pane" id="pane-weather" style="display: none;">
            <h3 style="font-size: 1.1rem; margin-bottom: 20px; margin-top: 0;">Weather</h3>
            <div class="form-group">
              <label class="form-label" for="weather-location">
                Location (City Name)
              </label>
              <div style="display: flex; gap: 8px;">
                <input type="text" class="form-input" id="weather-location" placeholder="e.g. New Delhi, London, Tokyo" autocomplete="off" style="margin-bottom: 0;">
                <button type="button" class="save-btn" id="auto-detect-location-btn" style="width: auto; padding: 0 12px; font-size: 0.85rem;" title="Use my exact location">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <circle cx="12" cy="12" r="3"></circle>
                    <line x1="12" y1="2" x2="12" y2="5"></line>
                    <line x1="12" y1="19" x2="12" y2="22"></line>
                    <line x1="2" y1="12" x2="5" y2="12"></line>
                    <line x1="19" y1="12" x2="22" y2="12"></line>
                  </svg>
                </button>
              </div>
              <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 8px;" id="weather-location-hint">Used to display current weather & temperature next to the clock. Click the icon to auto-detect.</p>
            </div>
            
            <div style="height: 60px;"></div>
          </div>

          <!-- AI Assistant Pane -->
          <div class="settings-pane" id="pane-ai" style="display: none;">
            <h3 style="font-size: 1.1rem; margin-bottom: 20px; margin-top: 0;">Copilot and AI</h3>
            <div class="form-group">
              <label class="form-label" for="llm-api-key">
                Gemini API Key
              </label>
              <input type="password" class="form-input" id="llm-api-key" placeholder="AIzaSy..." autocomplete="off">
              <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 6px;">Stored securely in local storage.</p>
            </div>
            
            <div style="height: 60px;"></div>
          </div>
          
          <div style="position: absolute; bottom: 24px; right: 24px;">
            <button type="submit" class="save-btn" id="save-profiles" style="display: flex; align-items: center; gap: 8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Save Settings
            </button>
          </div>
        </div>
      </form>
    </div>
"@

$content = $content -replace '(?s)<div class="modal" id="settings-modal">.*?</form>\s*</div>', $newModal
Set-Content index.html -Value $content
