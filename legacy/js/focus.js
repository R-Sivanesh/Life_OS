// Life OS Focus & Task-Connected Pomodoro Engine

class FocusEngine {
  static duration = 25 * 60; // 25 minutes
  static timeLeft = 25 * 60;
  static timerId = null;
  static isRunning = false;
  static activeTaskId = null;
  static audioCtx = null;
  static activeNoiseNode = null;
  static activeSound = null;

  static async init() {
    if (!window.AuthManager || !window.AuthManager.requireAuth()) return;

    const urlParams = new URLSearchParams(window.location.search);
    this.activeTaskId = urlParams.get('taskId');

    await this.populateTasks();
    this.updateDisplay();
    this.bindEvents();
  }

  static async populateTasks() {
    const select = document.getElementById('focusTaskSelect');
    if (!select) return;
    const tasks = await window.LifeOSStore.select('tasks', { status: 'pending' });

    if (tasks.length === 0) {
      select.innerHTML = '<option value="">No pending tasks available for focus</option>';
      return;
    }

    select.innerHTML = '<option value="">Select task to focus on...</option>' +
      tasks.map(t => `<option value="${t.id}" ${t.id === this.activeTaskId ? 'selected' : ''}>${t.title} (${t.priority.toUpperCase()})</option>`).join('');

    if (this.activeTaskId) {
      select.value = this.activeTaskId;
    }
  }

  static updateDisplay() {
    const display = document.getElementById('pomodoroDisplay');
    if (!display) return;
    const mins = Math.floor(this.timeLeft / 60).toString().padStart(2, '0');
    const secs = (this.timeLeft % 60).toString().padStart(2, '0');
    display.textContent = `${mins}:${secs}`;
  }

  static startTimer() {
    if (this.isRunning) return;
    this.isRunning = true;

    const startBtn = document.getElementById('startFocusBtn');
    if (startBtn) startBtn.textContent = 'Focusing... ⏳';

    this.timerId = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
        this.updateDisplay();
      } else {
        this.completeFocusSession();
      }
    }, 1000);
  }

  static pauseTimer() {
    this.isRunning = false;
    if (this.timerId) clearInterval(this.timerId);

    const startBtn = document.getElementById('startFocusBtn');
    if (startBtn) startBtn.textContent = 'Resume Focus 🚀';
  }

  static resetTimer() {
    this.pauseTimer();
    this.timeLeft = this.duration;
    this.updateDisplay();

    const startBtn = document.getElementById('startFocusBtn');
    if (startBtn) startBtn.textContent = 'Start Focus 🚀';
  }

  static async completeFocusSession() {
    this.pauseTimer();
    this.stopAmbientSound();

    const select = document.getElementById('focusTaskSelect');
    const selectedTaskId = select ? select.value : null;

    if (selectedTaskId) {
      await window.LifeOSStore.update('tasks', selectedTaskId, { status: 'completed' });
    }

    await window.LifeOSStore.insert('focus_sessions', {
      task_id: selectedTaskId || 'general',
      duration_minutes: 25,
      completed_at: new Date().toISOString(),
    });

    await window.LifeOSStore.insert('xp', {
      amount: 50,
      source: 'Focus Session Completed',
      timestamp: new Date().toISOString(),
    });

    alert('🎉 Focus Session Completed! Task marked complete & +50 XP awarded.');
    this.resetTimer();
    window.location.href = 'index.html';
  }

  static toggleAmbientSound(type) {
    if (this.activeSound === type) {
      this.stopAmbientSound();
      return;
    }
    this.stopAmbientSound();

    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const bufferSize = this.audioCtx.sampleRate * 2;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = this.audioCtx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const mainGain = this.audioCtx.createGain();

      if (type === 'rain') {
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1000;
        mainGain.gain.setValueAtTime(0.07, this.audioCtx.currentTime);
        noise.connect(filter);
        filter.connect(mainGain);
      } else if (type === 'waves') {
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;

        const lfo = this.audioCtx.createOscillator();
        lfo.frequency.value = 0.2; // 0.2Hz wave cycle
        const lfoGain = this.audioCtx.createGain();
        lfoGain.gain.value = 300;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();

        mainGain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
        noise.connect(filter);
        filter.connect(mainGain);
      } else {
        mainGain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
        noise.connect(mainGain);
      }

      mainGain.connect(this.audioCtx.destination);
      noise.start();

      this.activeNoiseNode = noise;
      this.activeSound = type;

      document.querySelectorAll('.ambient-sound-btn').forEach(btn => {
        if (btn.dataset.sound === type) {
          btn.style.background = 'rgba(139,92,246,0.3)';
          btn.style.borderColor = 'rgba(139,92,246,0.6)';
        } else {
          btn.style.background = 'rgba(255,255,255,0.06)';
          btn.style.borderColor = 'transparent';
        }
      });
    } catch (e) {
      console.warn('Web Audio synthesis error:', e);
    }
  }

  static stopAmbientSound() {
    if (this.activeNoiseNode) {
      try { this.activeNoiseNode.stop(); } catch (e) {}
      this.activeNoiseNode = null;
    }
    this.activeSound = null;
    document.querySelectorAll('.ambient-sound-btn').forEach(btn => {
      btn.style.background = 'rgba(255,255,255,0.06)';
      btn.style.borderColor = 'transparent';
    });
  }

  static bindEvents() {
    const startBtn = document.getElementById('startFocusBtn');
    const pauseBtn = document.getElementById('pauseFocusBtn');
    const resetBtn = document.getElementById('resetFocusBtn');

    if (startBtn) startBtn.onclick = () => this.startTimer();
    if (pauseBtn) pauseBtn.onclick = () => this.pauseTimer();
    if (resetBtn) resetBtn.onclick = () => this.resetTimer();

    document.querySelectorAll('.ambient-sound-btn').forEach(btn => {
      btn.onclick = () => {
        const sound = btn.dataset.sound;
        this.toggleAmbientSound(sound);
      };
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  FocusEngine.init();
});
