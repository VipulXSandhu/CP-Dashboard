chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith('contest_reminder_')) {
    chrome.storage.local.get('contestReminders', (result) => {
      const reminders = result.contestReminders || {};
      const contest = reminders[alarm.name];
      if (contest) {
        chrome.notifications.create(alarm.name, {
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'Contest Reminder 🚀',
          message: `${contest.name} is starting soon on ${contest.platform}!`,
          priority: 2,
          requireInteraction: true
        });
        // Remove from storage since it fired
        delete reminders[alarm.name];
        chrome.storage.local.set({ contestReminders: reminders });
      }
    });
  } else if (alarm.name.startsWith('todo_')) {
    const todoId = alarm.name.replace('todo_', '');
    chrome.storage.local.get({ todoAlarms: {} }, (res) => {
      const alarmInfo = res.todoAlarms[todoId];
      if (alarmInfo) {
        chrome.notifications.create(alarm.name, {
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'Todo Reminder ⏰',
          message: `Task "${alarmInfo.text}" is due today!`,
          priority: 2,
          requireInteraction: true
        });
        const updated = res.todoAlarms;
        delete updated[todoId];
        chrome.storage.local.set({ todoAlarms: updated });
      }
    });
  }
});

// Helper for fetching
function fetchWithTimeout(url, timeoutMs = 8000, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function fetchCodeforcesContests() {
  try {
    const response = await fetchWithTimeout('https://codeforces.com/api/contest.list?gym=false', 5000);
    const data = await response.json();
    if (data.status === 'OK') {
      return data.result
        .filter(c => c.phase === 'BEFORE')
        .map(c => ({
          name: c.name,
          platform: 'CF',
          startTime: c.startTimeSeconds * 1000,
          duration: c.durationSeconds,
          url: `https://codeforces.com/contest/${c.id}`,
        }));
    }
  } catch (e) {
    console.warn('CF contests fetch failed:', e);
  }
  return [];
}

async function fetchLeetCodeContests() {
  try {
    const query = `{ topTwoContests { title titleSlug startTime duration } }`;
    const response = await fetchWithTimeout('https://leetcode.com/graphql', 5000, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const data = await response.json();
    if (data && data.data && data.data.topTwoContests) {
      return data.data.topTwoContests.map(c => ({
        name: c.title,
        platform: 'LC',
        startTime: c.startTime * 1000,
        duration: c.duration,
        url: `https://leetcode.com/contest/${c.titleSlug}`
      })).filter(c => c.startTime > Date.now());
    }
  } catch (e) {
    console.warn('LC contests fetch failed:', e);
  }
  return [];
}

async function fetchCodeChefContests() {
  try {
    const response = await fetchWithTimeout('https://www.codechef.com/api/list/contests/all', 5000);
    const data = await response.json();
    if (data && data.future_contests) {
      return data.future_contests.map(c => ({
        name: c.contest_name,
        platform: 'CC',
        startTime: new Date(c.contest_start_date_iso).getTime(),
        duration: parseInt(c.contest_duration, 10) * 60,
        url: `https://www.codechef.com/${c.contest_code}`
      }));
    }
  } catch (e) {
    console.warn('CC contests fetch failed:', e);
  }
  return [];
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchContests') {
    Promise.allSettled([
      fetchCodeforcesContests(),
      fetchLeetCodeContests(),
      fetchCodeChefContests()
    ]).then(results => {
      const allContests = [];
      results.forEach(res => {
        if (res.status === 'fulfilled' && res.value) {
          allContests.push(...res.value);
        }
      });
      sendResponse(allContests);
    });
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === 'askAI') {
    chrome.storage.local.get(['llmApiKey'], async (result) => {
      const apiKey = result.llmApiKey;
      if (!apiKey) {
        sendResponse({ error: 'Please enter your Gemini API Key in Settings.' });
        return;
      }
      
      const prompt = `Context: ${request.context}\nUser: ${request.prompt}\n\nPlease provide a helpful hint for this competitive programming problem. Do not give the full code solution, just guide the user towards the right approach or data structures to use.`;
      
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });
        
        const data = await response.json();
        
        if (data.error) {
          sendResponse({ error: data.error.message || 'API Error' });
        } else if (data.candidates && data.candidates.length > 0) {
          const reply = data.candidates[0].content.parts[0].text;
          sendResponse({ reply: reply });
        } else {
          sendResponse({ error: 'No response from Gemini.' });
        }
      } catch (e) {
        sendResponse({ error: e.toString() });
      }
    });
    
    return true; // async
  }
  
  if (request.action === 'fetchExtraInternships') {
    const page = request.page || 1;
    let fetches = [
      fetchWithTimeout(`https://unstop.com/api/public/opportunity/search-result?opportunity=internships&page=${page}`, 8000).then(r => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      }),
      fetchWithTimeout(`https://internshala.com/internships/page-${page}/`, 8000).then(r => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
    ];
    
    if (page === 1) {
      fetches.push(
        fetchWithTimeout(`https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/dev/README.md`, 8000).then(r => {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.text();
        })
      );
    }
    
    Promise.allSettled(fetches).then(results => {
      const unstop = results[0].status === 'fulfilled' ? results[0].value : { error: results[0].reason ? results[0].reason.toString() : "Unknown Error" };
      const internshala = results[1].status === 'fulfilled' ? results[1].value : { error: results[1].reason ? results[1].reason.toString() : "Unknown Error" };
      const simplify = page === 1 && results[2] && results[2].status === 'fulfilled' ? results[2].value : (page === 1 ? { error: results[2]?.reason?.toString() || "Unknown" } : null);
      
      sendResponse({ unstop, internshala, simplify });
    }).catch(e => {
      sendResponse({ error: e.toString() });
    });
    return true; // async
  }
  
  if (request.action === 'fetchETNews') {
    fetchWithTimeout('https://economictimes.indiatimes.com/tech/rssfeeds/13357270.cms', 8000)
      .then(r => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then(text => sendResponse({ data: text }))
      .catch(e => sendResponse({ error: e.toString() }));
    return true; // async
  }
  
  if (request.action === 'fetchHinduNews') {
    fetchWithTimeout('https://www.thehindu.com/sci-tech/technology/feeder/default.rss', 8000)
      .then(r => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then(text => sendResponse({ data: text }))
      .catch(e => sendResponse({ error: e.toString() }));
    return true; // async
  }

  if (request.action === 'fetchHackathons') {
    const page = request.page || 1;
    let fetches = [
      fetchWithTimeout(`https://unstop.com/api/public/opportunity/search-result?opportunity=hackathons&page=${page}`, 8000).then(r => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
    ];
    
    if (page === 1) {
      fetches.push(
        fetchWithTimeout(`https://devpost.com/api/hackathons?status[]=upcoming&status[]=open`, 8000).then(r => {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
      );
    }

    Promise.allSettled(fetches).then(results => {
      const unstop = results[0].status === 'fulfilled' ? results[0].value : { error: results[0].reason ? results[0].reason.toString() : "Unknown Error" };
      let devpost = page === 1 && results[1] && results[1].status === 'fulfilled' ? results[1].value : (page === 1 ? { error: results[1]?.reason?.toString() || "Unknown" } : null);
      
      if (devpost && devpost.hackathons) {
        devpost.hackathons = devpost.hackathons.filter(h => {
          let prize = 0;
          if (h.prize_amount) {
            prize = parseInt(h.prize_amount.replace(/[^0-9]/g, ''), 10) || 0;
          }
          const isHighPrize = prize > 5000;
          const isMLH = h.themes && h.themes.some(t => t.name.toLowerCase().includes('mlh'));
          const isMajor = h.title && h.title.toLowerCase().includes('mlh');
          return isHighPrize || isMLH || isMajor;
        });
      }

      sendResponse({ unstop, devpost });
    }).catch(e => {
      sendResponse({ error: e.toString() });
    });
    return true; // async
  }
});

