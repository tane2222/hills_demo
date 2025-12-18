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
      // 必要に応じて追加してください
      { text: '自分の歯の色は好きですか？', options: [{t:'嫌い', s:20}, {t:'普通', s:10}, {t:'好き', s:0}] }
    ],
    results: [ /* ... */ ] 
  }
};

// --- Application Logic ---
const app = {
  state: {
    type: null,
    score: 0,
    qIndex: 0,
    answers: []
  },

  // 初期化
  init: async () => {
    // LIFF初期化が必要ならここに記述
    // await liff.init({ liffId: "YOUR_LIFF_ID" });
  },

  // 診断開始
  startDiagnosis: (type) => {
    app.state.type = type;
    app.state.score = 0;
    app.state.qIndex = 0;
    app.state.answers = [];
    app.renderQuestion();
    app.switchView('view-question');
  },

  // 質問描画
  renderQuestion: () => {
    const qData = DATA[app.state.type].questions[app.state.qIndex];
    const totalQ = DATA[app.state.type].questions.length;

    // プログレスバー更新
    const progress = ((app.state.qIndex) / totalQ) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;

    // テキスト更新
    document.getElementById('q-current').innerText = app.state.qIndex + 1;
    document.getElementById('q-text').innerText = qData.text;

    // 選択肢生成
    const optionsDiv = document.getElementById('q-options');
    optionsDiv.innerHTML = '';
    qData.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'btn-option';
      btn.innerText = opt.t;
      btn.onclick = () => app.handleAnswer(opt.s);
      optionsDiv.appendChild(btn);
    });
  },

  // 回答処理
  handleAnswer: (score) => {
    app.state.score += score;
    const questions = DATA[app.state.type].questions;
    
    if (app.state.qIndex < questions.length - 1) {
      app.state.qIndex++;
      app.renderQuestion();
    } else {
      app.finishDiagnosis();
    }
  },

  // 診断終了・ローディング
  finishDiagnosis: () => {
    app.switchView('view-loading');
    // プログレスバー100%
    document.getElementById('progress-bar').style.width = '100%';
    
    // 計算演出用に少し待機
    setTimeout(() => {
      app.showResult();
    }, 1500);
  },

  // 結果表示
  showResult: () => {
    const score = app.state.score;
    // 日付設定
    const today = new Date();
    document.getElementById('result-date').innerText = `${today.getFullYear()}.${today.getMonth()+1}.${today.getDate()}`;

    // 判定ロジック
    const resultSettings = DATA[app.state.type].results;
    // スコアに基づいて判定 (簡易ロジック)
    let result = resultSettings.find(r => score <= r.max) || resultSettings[resultSettings.length - 1];

    // UI更新
    document.getElementById('result-score').innerText = score;
    const levelBadge = document.getElementById('result-level');
    levelBadge.innerText = result.level;
    levelBadge.style.backgroundColor = result.color;
    document.getElementById('result-summary').innerText = result.msg;
    document.getElementById('result-advice').innerText = "あなたのリスクレベルに基づき、専門家による早期のカウンセリングをお勧めします。";

    // グラフ描画
    app.drawChart(score);

    // GASへの送信処理などが必要ならここで fetch

    app.switchView('view-result');
  },

  // Chart.jsによるグラフ描画 (ここが今回の肝です)
  drawChart: (userScore) => {
    const ctx = document.getElementById('scoreChart').getContext('2d');
    
    // 既存のチャートがあれば破棄 (再描画対策)
    if (window.myChart) window.myChart.destroy();

    window.myChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['あなた', '30代平均', '理想値'],
        datasets: [{
          label: 'リスクスコア (低いほど良い)',
          data: [userScore, 45, 10], // 平均値は仮定
          backgroundColor: [
            '#0056D2', // あなた (Primary)
            '#E0E0E0', // 平均 (Gray)
            '#00C6AB'  // 理想 (Teal)
          ],
          borderRadius: 8,
          barThickness: 40
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            grid: { display: true, drawBorder: false, color: '#f0f0f0' }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  },

  // 画面切り替えユーティリティ
  switchView: (viewId) => {
    document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    window.scrollTo(0,0);
  },

  // 閉じるボタン
  closeLiff: () => {
    if (liff.isInClient()) {
      liff.closeWindow();
    } else {
      alert('LINEブラウザ以外では閉じられません');
    }
  }
};

// アプリ起動
app.init();
