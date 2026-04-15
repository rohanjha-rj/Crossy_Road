// js/save.js — LocalStorage manager
const SAVE_KEY = 'crossy_save_data';

export const SaveManager = {
  data: {
    bestScore: 0,
    coins: 0,
    unlockedChars: ['chicken'],
    currentChar: 'chicken',
    muted: false
  },

  load() {
    try {
      const stored = localStorage.getItem(SAVE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.data = { ...this.data, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load save data:', e);
    }
  },

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Failed to save data:', e);
    }
  },

  addCoins(amount) {
    this.data.coins += amount;
    this.save();
  },

  spendCoins(amount) {
    if (this.data.coins >= amount) {
      this.data.coins -= amount;
      this.save();
      return true;
    }
    return false;
  },

  unlockChar(charId) {
    if (!this.data.unlockedChars.includes(charId)) {
      this.data.unlockedChars.push(charId);
      this.save();
    }
  },

  setMuted(muted) {
    this.data.muted = muted;
    this.save();
  }
};

// Initialize on load
SaveManager.load();
