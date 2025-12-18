// --- Configuration: コンテンツデータ ---
const DATA = {
  periodontal: {
    title: '歯周病リスク診断',
    questions: [
      { text: '歯磨きの時、出血しますか？', options: [{t:'よくある', s:20}, {t:'たまに', s:10}, {t:'なし', s:0}] },
      { text: '歯が浮くような感じがしますか？', options: [{t:'はい', s:20}, {t:'少し感じる', s:10}, {t:'いいえ', s:0}] },
      { text: '口臭を指摘されたことは？', options: [{t:'ある', s:20}, {t:'自分でも気なる', s:10}, {t:'ない', s:0}] },
      { text: 'タバコを吸いますか？', options: [{t:'はい', s:20}, {t:'過去に吸っていた', s:10}, {t:'いいえ', s:0}] },
      { text: '定期検診に行っていますか？', options: [{t:'行っていない', s:20}, {t:'時々', s:10}, {t:'定期的に', s:0}] }
    ],
    results: [
      { max: 20, level: '安全圏', color: '#00C6AB', msg: '素晴らしい状態です。この調子で定期検診を続けましょう。' },
      { max: 50, level: '注意', color: '#FF9800', msg: '初期の歯周病リスクがあります。歯科医院でのクリーニングを推奨します。' },
      { max: 100, level: '危険', color: '#FF5252', msg: '歯周病が進行している可能性があります。早急に受診してください。' }
    ]
  },
  aesthetic: {
    title: '審美歯科チェック',
    questions: [
      { text: '自分の歯の色は好きですか？', options: [{t:'嫌い', s:20}, {t:'普通', s:10}, {t:'好き', s:0}] },
      { text: '笑う時、口元を隠しますか？', options: [{t:'よく隠す', s:20}, {t:'たまに', s:10}, {t:'隠さない', s:0}] },
      { text: '写真の自分の歯が気になりますか？', options: [{t:'気になる', s:20}, {t:'少し', s:10}, {t:'気にならない', s:0}] }
    ],
    results: [
      { max: 10, level: 'Satisfaction', color: '#00C6AB', msg: 'ご自身の歯に自信をお持ちですね。' },
      { max: 40, level: 'Interest', color: '#FF9800', msg: 'ホワイトニング等でさらに魅力的にできる可能性があります。' },
      { max: 60, level: 'High Needs', color: '#FF5252', msg: '審美治療で印象が大きく変わる可能性があります。ご相談ください。' }
    ]
  }
};

// --- Config ---
// ★先ほどシークレットモードで成功したURLを入れてください
const GAS_URL = 'https://script.google.com/macros/s/AKfycby-TmXAoKsyyie_srkFnvX3xghsPO4QQuIlSnEn-0c31uEX8Up6M5dwhEGwhd7dzgoMZg/exec'; 
const LIFF_ID = '2008709251-eFKUYcgF'; 

const app = {
  state: {
    user: null, 
    history: [],
    radarData: [0,0,0,0,0],
    
    type: null,
    score: 0,
    qIndex: 0,
    answers: {}
  },

  // --- A. Initialize ---
  init: async () => {
    // ローディング強制解除 (5秒)
    const timer = setTimeout(() => {
      document.getElementById('global-loading').classList.add('hidden');
    }, 5000);

    try {
      await liff.init({ liffId: LIFF_ID });
      if (!liff.isLoggedIn()) { liff.login(); return; }
      
      const profile = await liff.getProfile();
      app.state.user = profile;
      document.getElementById('user-name').innerText = profile.displayName;
      if(profile.pictureUrl) document.getElementById('user-icon').src = profile.pictureUrl;

      // マイページデータ取得
      await app.fetchUserData();

    } catch (err) {
      console.error('Init Error:', err);
      // デモデータ
      app.state.user = { userId: 'dummy', displayName: 'Demo User' };
      app.drawRadarChart([50, 50, 50, 50, 50]);
    } finally {
      clearTimeout(timer);
      const loader = document.getElementById('global-loading');
      if(loader) loader.classList.add('hidden');
    }
  },

  // --- B. Data Fetching ---
  fetchUserData: async () => {
    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'get_user_data', userId: app.state.user.userId })
      });
      if(!res.ok) throw new Error("Network Error");
      const data = await res.json();

      if (data.status === 'success') {
        app.state.history = data.history;
        app.state.radarData = data.radar;
        app.renderHistory();
        app.drawRadarChart(data.radar);
      }
    } catch (e) {
      console.error('Fetch Error:', e);
      app.renderHistory();
      app.drawRadarChart([0,0,0,0,0]);
    }
  },

  renderHistory: () => {
    const list = document.getElementById('history-list');
    if(!list) return;
    list.innerHTML = '';
    if (!app.state.history || app.state.history.length === 0) {
      list.innerHTML = '<div class="empty-state" style="text-align:center; padding:20px; color:#aaa;">履歴なし</div>';
      return;
    }
    app.state.history.forEach(h => {
      let title = (DATA[h.type]) ? DATA[h.type].title : h.type;
      const d = document.createElement('div');
      d.className = 'history-item';
      d.innerHTML = `<div><span class="h-date">${h.date}</span><span class="h-title">${title}</span></div><div class="h-score">${h.score}pt</div>`;
      list.appendChild(d);
    });
  },

  // --- C. Diagnosis Flow (Original Style Logic) ---
  startDiagnosis: (type) => {
    app.state.type = type;
    app.state.score = 0;
    app.state.qIndex = 0;
    app.state.answers = {};
    app.renderQuestion();
    app.switchView('view-question');
    // 診断中はナビを隠す
    document.querySelector('.bottom-nav').style.display = 'none';
  },

  renderQuestion: () => {
    const qData = DATA[app.state.type].questions[app.state.qIndex];
    const total = DATA[app.state.type].questions.length;
    
    // プログレスバー
    const pct = ((app.state.qIndex) / total) * 100;
    document.getElementById('progress-bar').style.width = `${pct}%`;

    document.getElementById('q-current').innerText = app.state.qIndex + 1;
    document.getElementById('q-text').innerText = qData.text;

    const div = document.getElementById('q-options');
    div.innerHTML = '';
    qData.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'btn-option';
      btn.innerText = opt.t;
      btn.onclick = () => app.handleAnswer(opt.s, opt.t);
      div.appendChild(btn);
    });
  },

  handleAnswer: (score, text) => {
    app.state.score += score;
    app.state.answers[`q${app.state.qIndex}`] = text;
    const maxQ = DATA[app.state.type].questions.length;
    if (app.state.qIndex < maxQ - 1) {
      app.state.qIndex++;
      app.renderQuestion();
    } else {
      app.showResultCalc();
    }
  },

  showResultCalc: () => {
    document.getElementById('global-loading').classList.remove('hidden');
    document.getElementById('progress-bar').style.width = '100%';

    const payload = {
      action: 'save_diagnosis',
      userId: app.state.user.userId,
      displayName: app.state.user.displayName,
      type: app.state.type,
      score: app.state.score,
      answers: app.state.answers
    };

    fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
      app.renderResultScreen(data.resultLevel); 
      document.getElementById('global-loading').classList.add('hidden');
      app.switchView('view-result');
    })
    .catch(err => {
      console.error(err);
      document.getElementById('global-loading').classList.add('hidden');
      app.renderResultScreen(); 
      app.switchView('view-result');
    });
  },

  renderResultScreen: () => {
    const score = app.state.score;
    const settings = DATA[app.state.type].results;
    const result = settings.find(r => score <= r.max) || settings[settings.length - 1];

    document.getElementById('result-date').innerText = new Date().toLocaleDateString();
    document.getElementById('result-score').innerText = score;
    const badge = document.getElementById('result-level');
    badge.innerText = result.level;
    badge.style.backgroundColor = result.color;
    document.getElementById('result-summary').innerText = result.msg;
    document.getElementById('result-advice').innerText = "あなたのリスクレベルに基づき、専門家による早期のカウンセリングをお勧めします。";

    // グラフ描画 (棒グラフ)
    app.drawResultBarChart(score);
  },

  // --- D. Navigation ---
  switchTab: (tabName) => {
    document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
    document.querySelector('.bottom-nav').style.display = 'flex';
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`nav-${tabName}`).classList.add('active');

    if (tabName === 'mypage') {
      document.getElementById('view-mypage').classList.remove('hidden');
      if (app.state.user && app.state.user.userId !== 'dummy') {
         app.fetchUserData(); // 静かに再取得
      }
    } else {
      document.getElementById('view-menu').classList.remove('hidden');
    }
    window.scrollTo(0,0);
  },

  switchView: (viewId) => {
    document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    window.scrollTo(0,0);
  },

  finishAndReturn: () => {
    app.switchTab('mypage');
  },

  // --- E. Charts ---
  // 1. 診断結果用 棒グラフ (頂いたファイルの仕様に合わせる)
  drawResultBarChart: (userScore) => {
    const ctx = document.getElementById('scoreChart');
    if (!ctx) return;
    
    const existing = Chart.getChart(ctx);
    if (existing) existing.destroy();

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['あなた', '30代平均', '理想値'],
        datasets: [{
          label: 'リスクスコア',
          data: [userScore, 45, 10], 
          backgroundColor: ['#0056D2', '#E0E0E0', '#00C6AB'],
          borderRadius: 8, barThickness: 40
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, max: 100, grid: { display:true, drawBorder:false, color:'#f0f0f0' } },
          x: { grid: { display: false } }
        }
      }
    });
  },

  // 2. マイページ用 レーダーチャート
  drawRadarChart: (dataValues) => {
    const ctx = document.getElementById('radarChart');
    if (!ctx) return;

    const existing = Chart.getChart(ctx);
    if (existing) existing.destroy();
    
    const isNoData = dataValues.every(v => v === 0);
    const displayData = isNoData ? [50,50,50,50,50] : dataValues;

    new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['歯茎', '清潔', '口臭', '習慣', '知識'],
        datasets: [{
          data: displayData,
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          borderColor: '#FFFFFF',
          pointBackgroundColor: '#00C6AB',
          borderWidth: 1.5, pointRadius: 3
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          r: {
            angleLines: { color: 'rgba(255, 255, 255, 0.2)' },
            grid: { color: 'rgba(255, 255, 255, 0.2)' },
            pointLabels: { color: '#FFFFFF', font: { size: 10 } },
            ticks: { display: false, max: 100, min: 0 }
          }
        }
      }
    });
  }
};

app.init();
