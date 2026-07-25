// analyzer.js

function initAnalyzer(cfHandle) {
  const container = document.getElementById('coach-modal');
  const loader = document.getElementById('coach-loading');
  const content = document.getElementById('coach-content');
  const strengthSpan = document.getElementById('coach-strength');
  const weaknessSpan = document.getElementById('coach-weakness');
  const taskDesc = document.getElementById('coach-task');
  const practiceBtn = document.getElementById('coach-practice-btn');

  if (!container || !cfHandle) {
    return;
  }

  async function fetchAndAnalyze() {
    try {
      const res = await fetch(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(cfHandle)}&from=1&count=2000`);
      const data = await res.json();
      if (data.status !== 'OK') throw new Error('API failed');

      const submissions = data.result;
      analyzePerformance(submissions);
    } catch (e) {
      console.error("Analyzer Error:", e);
      if(loader) loader.innerHTML = `<p style="color:var(--text-muted);">Failed to load analyzer data.</p>`;
    }
  }

  function analyzePerformance(submissions) {
    // Process tags
    const tagStats = {};
    let recentSolvedRatings = [];

    // Only consider the most recent unique problems for accurate current skill
    const processedProblems = new Set();
    
    for (const sub of submissions) {
      if (!sub.problem || !sub.problem.tags || processedProblems.has(sub.problem.name)) continue;
      
      const tags = sub.problem.tags;
      const isOk = sub.verdict === "OK";
      const rating = sub.problem.rating || 0;

      if (isOk) {
        processedProblems.add(sub.problem.name);
        if (rating > 0 && recentSolvedRatings.length < 50) {
          recentSolvedRatings.push(rating);
        }
      }

      for (const tag of tags) {
        if (!tagStats[tag]) {
          tagStats[tag] = { attempts: 0, solved: 0 };
        }
        tagStats[tag].attempts++;
        if (isOk) {
          tagStats[tag].solved++;
        }
      }
    }

    // Determine target rating
    let avgRecentRating = 1200;
    if (recentSolvedRatings.length > 0) {
      const sum = recentSolvedRatings.reduce((a, b) => a + b, 0);
      avgRecentRating = sum / recentSolvedRatings.length;
    }
    const targetRating = Math.max(800, Math.round((avgRecentRating + 100) / 100) * 100);

    // Find strengths and weaknesses
    let bestTag = "implementation";
    let worstTag = "math";
    let bestScore = -1;
    let worstScore = 999;

    for (const tag in tagStats) {
      const stat = tagStats[tag];
      if (stat.attempts < 5) continue; // Need minimum data
      
      const successRate = stat.solved / stat.attempts;
      
      // We consider tags with many solves but low success rate, or very few solves compared to average
      const score = successRate + (stat.solved * 0.01);
      
      if (score > bestScore) {
        bestScore = score;
        bestTag = tag;
      }
      
      // For worst tag, we look at things they have attempted at least 5 times but failed often
      const failScore = successRate; 
      if (failScore < worstScore) {
        worstScore = failScore;
        worstTag = tag;
      }
    }

    // Update UI
    if (loader) loader.style.display = 'none';
    if (content) content.style.display = 'flex';

    if (strengthSpan) {
      strengthSpan.innerText = bestTag.charAt(0).toUpperCase() + bestTag.slice(1);
    }
    if (weaknessSpan) {
      weaknessSpan.innerText = worstTag.charAt(0).toUpperCase() + worstTag.slice(1);
    }
    if (taskDesc) {
      taskDesc.innerHTML = `Your success rate drops heavily on <strong>${worstTag}</strong> problems. Spend your next session solving three <strong>${targetRating}-rated</strong> ${worstTag} problems to raise your ceiling!`;
    }
    if (practiceBtn) {
      practiceBtn.href = `https://codeforces.com/problemset?tags=${worstTag},${targetRating}-${targetRating + 100}`;
    }
  }

  fetchAndAnalyze();
}