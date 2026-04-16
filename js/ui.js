// js/ui.js — UI screen management
export class UIManager {
  constructor() {
    const $ = id => document.getElementById(id);
    this.startScreen    = $('start-screen');
    this.hud            = $('hud');
    this.gameoverScreen = $('gameover-screen');
    this.trainWarning   = $('train-warning');
    this.scoreVal       = $('score-value');
    this.bestVal        = $('best-value');
    this.finalScore     = $('final-score');
    this.finalBest      = $('final-best');
    this._warnTimeout   = null;

    this.pauseScreen    = $('pause-screen');
    this.charScreen     = $('char-screen');
    this.gachaScreen    = $('gacha-screen');
    this.charGrid       = $('char-grid');
    this.menuCoins      = $('menu-coin-value');
    this.hudCoins       = $('hud-coin-value');
    this.gachaCoins     = $('gacha-coin-value');
    this.gachaPrize     = $('gacha-prize');
    this.prizeRoller    = $('prize-roller');
    this.gachaStatus    = $('gacha-status');
    this.soundBtn       = $('sound-btn');
    this.soundIcon      = $('sound-icon-wrap');
  }

  showStart() {
    this.startScreen.classList.remove('hidden');
    this.hud.classList.add('hidden');
    this.gameoverScreen.classList.add('hidden');
    this.gachaScreen.classList.add('hidden');
    this.pauseScreen.classList.add('hidden');
    this.charScreen.classList.add('hidden');
  }

  showGame(best) {
    this.startScreen.classList.add('hidden');
    this.hud.classList.remove('hidden');
    this.gameoverScreen.classList.add('hidden');
    this.gachaScreen.classList.add('hidden');
    this.pauseScreen.classList.add('hidden');
    this.charScreen.classList.add('hidden');
    this.scoreVal.textContent = '0';
    this.bestVal.textContent  = best;
  }

  showPause() {
    this.pauseScreen.classList.remove('hidden');
  }

  hidePause() {
    this.pauseScreen.classList.add('hidden');
  }

  showRoster() {
    this.startScreen.classList.add('hidden');
    this.charScreen.classList.remove('hidden');
  }

  hideRoster() {
    this.charScreen.classList.add('hidden');
    this.startScreen.classList.remove('hidden');
  }

  renderRoster(data, current, onSelect) {
    this.charGrid.innerHTML = '';
    const charIcons = { 'chicken': '🐔', 'penguin': '🐧', 'robot': '🤖', 'frog': '🐸', 'pigeon': '🐦', 'duck': '🦆' };
    const charNames = { 'chicken': 'CHICKEN', 'penguin': 'PENGUIN', 'robot': 'ROBOT', 'frog': 'FROG', 'pigeon': 'PIGEON', 'duck': 'DUCK' };
    
    ['chicken', 'penguin', 'robot', 'frog', 'pigeon', 'duck'].forEach(id => {
      const unlocked = data.unlockedChars.includes(id);
      const item = document.createElement('div');
      item.className = `char-item ${unlocked ? '' : 'locked'} ${id === current ? 'selected' : ''}`;
      
      item.innerHTML = `
        <div class="char-icon">${charIcons[id]}</div>
        <div class="char-name">${charNames[id]}</div>
        ${!unlocked ? '<div class="char-hint">LOCKED<br/>ROLL IN GACHA</div>' : ''}
      `;
      
      if (unlocked) {
        item.onclick = () => onSelect(id);
      }
      this.charGrid.appendChild(item);
    });
  }

  showGameOver(score, best, nearMisses) {
    this.hud.classList.add('hidden');
    this.pauseScreen.classList.add('hidden');
    this.finalScore.textContent = score;
    this.finalBest.textContent  = best;
    const missesEl = document.getElementById('final-misses');
    if (missesEl) missesEl.textContent = nearMisses;
    this.gameoverScreen.classList.remove('hidden');
  }

  updateScore(current, best) {
    this.scoreVal.textContent = current;
    this.bestVal.textContent  = best;
    // Pop animation
    this.scoreVal.classList.remove('score-pop');
    void this.scoreVal.offsetWidth; // reflow
    this.scoreVal.classList.add('score-pop');
  }

  updateCoins(coins) {
    this.menuCoins.textContent = coins;
    this.hudCoins.textContent = coins;
    if (this.gachaCoins) this.gachaCoins.textContent = coins;
  }

  setMutedToggle(muted) {
    if (muted) {
      this.soundBtn.classList.add('muted');
    } else {
      this.soundBtn.classList.remove('muted');
    }
  }

  showGacha() {
    this.startScreen.classList.add('hidden');
    this.gachaScreen.classList.remove('hidden');
    this.gachaPrize.textContent = '❓';
    this.gachaStatus.textContent = 'READY TO ROLL';
    this.gachaPrize.classList.remove('prize-win');
  }

  hideGacha() {
    this.gachaScreen.classList.add('hidden');
    this.startScreen.classList.remove('hidden');
  }

  setGachaPrize(emoji) {
    this.gachaPrize.textContent = emoji;
    this.gachaPrize.classList.add('prize-win');
  }

  startRolling() {
    this.prizeRoller.classList.add('rolling');
    this.gachaStatus.textContent = 'ROLLING...';
    this.gachaPrize.classList.remove('prize-win');
  }

  stopRolling() {
    this.prizeRoller.classList.remove('rolling');
  }

  updateGachaStatus(text) {
    this.gachaStatus.textContent = text;
  }

  flashTrainWarning() {
    this.trainWarning.classList.remove('hidden');
    clearTimeout(this._warnTimeout);
    this._warnTimeout = setTimeout(() => {
      this.trainWarning.classList.add('hidden');
    }, 1800);
  }

  onPlay(cb)    { document.getElementById('play-btn').addEventListener('click', cb); }
  onRestart(cb) { document.getElementById('restart-btn').addEventListener('click', cb); }
  onGachaOpen(cb) { document.getElementById('gacha-btn').addEventListener('click', cb); }
  onGachaClose(cb) { document.getElementById('gacha-close-btn').addEventListener('click', cb); }
  onGachaRoll(cb) { document.getElementById('gacha-roll-btn').addEventListener('click', cb); }
  onHome(cb) { document.getElementById('home-btn').addEventListener('click', cb); }
  onToggleSound(cb) { this.soundBtn.addEventListener('click', cb); }
  
  onPause(cb) { document.getElementById('pause-btn').addEventListener('click', cb); }
  onResume(cb) { document.getElementById('resume-btn').addEventListener('click', cb); }
  onPauseRestart(cb) { document.getElementById('pause-restart-btn').addEventListener('click', cb); }
  onPauseHome(cb) { document.getElementById('pause-home-btn').addEventListener('click', cb); }
  
  onRosterOpen(cb) { document.getElementById('roster-btn').addEventListener('click', cb); }
  onRosterClose(cb) { document.getElementById('char-back-btn').addEventListener('click', cb); }
}
