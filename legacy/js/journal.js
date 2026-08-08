// Life OS Journal & Voice Recording Engine

class JournalManager {
  static selectedMood = '😊';
  static mediaRecorder = null;
  static audioChunks = [];
  static voiceAudioUrl = '';

  static async init() {
    if (!window.AuthManager || !window.AuthManager.requireAuth()) return;

    const entries = await window.LifeOSStore.select('journal');
    this.populateMonthFilter(entries);
    this.renderEntries(entries);
    this.bindEvents();
  }

  static populateMonthFilter(entries) {
    const select = document.getElementById('journalMonthFilter');
    if (!select) return;
    const months = new Set(entries.map(e => (e.date ? e.date.slice(0, 7) : '')));
    months.delete('');

    select.innerHTML = '<option value="all">All Months</option>' +
      Array.from(months).sort().reverse().map(m => `<option value="${m}">${m}</option>`).join('');
  }

  static renderEntries(entries) {
    const container = document.getElementById('journalEntriesList');
    if (!container) return;

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="glass-card" style="padding:32px; text-align:center; color:#9aa3ff;">
          <div style="font-size:2.5rem; margin-bottom:12px;">📖</div>
          <h3 style="margin:0 0 8px; color:#fff; font-weight:700;">No journal entries written yet</h3>
          <p style="margin:0 0 18px; font-size:0.92rem;">Capture your daily reflections, mood, and voice thoughts to track growth.</p>
          <button onclick="document.getElementById('addJournalBtn')?.click()" class="btn-primary" style="width:auto; padding:10px 24px;">✍️ Write Today's Journal</button>
        </div>
      `;
      return;
    }

    container.innerHTML = entries.map(e => `
      <div class="glass-card" style="padding:22px; display:flex; flex-direction:column; gap:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:1.6rem;">${e.mood || '😊'}</span>
            <div>
              <h4 style="margin:0; font-size:1rem;">Entry for ${e.date || 'Today'}</h4>
              <span style="font-size:0.75rem; color:#9aa3ff;">${new Date(e.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          <button class="delete-jrn-btn" data-id="${e.id}" style="background:rgba(255,91,121,0.15); color:#ff5b79; padding:6px 12px; border-radius:10px;">Delete</button>
        </div>
        <p style="margin:0; line-height:1.6; font-size:0.95rem; color:#e8ecff;">${e.content}</p>
        ${e.voice_url ? `<audio src="${e.voice_url}" controls style="margin-top:8px; width:100%; height:40px;"></audio>` : ''}
      </div>
    `).join('');
  }

  static bindEvents() {
    const addBtn = document.getElementById('addJournalBtn');
    const modal = document.getElementById('journalModal');
    const backdrop = document.getElementById('journalModalBackdrop');
    const closeBtn = document.getElementById('closeJournalModal');
    const form = document.getElementById('journalForm');

    const searchInput = document.getElementById('journalSearch');
    const monthSelect = document.getElementById('journalMonthFilter');

    const filterEntries = async () => {
      let entries = await window.LifeOSStore.select('journal');
      const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
      const month = monthSelect ? monthSelect.value : 'all';

      if (month !== 'all') {
        entries = entries.filter(e => e.date && e.date.startsWith(month));
      }
      if (q) {
        entries = entries.filter(e => (e.content && e.content.toLowerCase().includes(q)) || (e.mood && e.mood.includes(q)));
      }
      JournalManager.renderEntries(entries);
    };

    if (searchInput) searchInput.oninput = filterEntries;
    if (monthSelect) monthSelect.onchange = filterEntries;

    if (addBtn) addBtn.onclick = () => {
      form.reset();
      this.voiceAudioUrl = '';
      const playback = document.getElementById('voicePlayback');
      if (playback) playback.classList.add('hidden');
      backdrop.classList.remove('hidden');
      modal.classList.remove('hidden');
    };

    if (closeBtn) closeBtn.onclick = () => {
      backdrop.classList.add('hidden');
      modal.classList.add('hidden');
    };

    document.querySelectorAll('.mood-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.mood-btn').forEach(b => {
          b.classList.remove('active');
          b.style.background = 'rgba(255,255,255,0.06)';
        });
        btn.classList.add('active');
        btn.style.background = 'rgba(134,82,255,0.3)';
        JournalManager.selectedMood = btn.dataset.mood;
      };
    });

    const recordBtn = document.getElementById('recordVoiceBtn');
    const recordingStatus = document.getElementById('recordingStatus');
    const voicePlayback = document.getElementById('voicePlayback');

    if (recordBtn) recordBtn.onclick = async () => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          this.mediaRecorder = new MediaRecorder(stream);
          this.audioChunks = [];

          this.mediaRecorder.ondataavailable = (event) => this.audioChunks.push(event.data);
          this.mediaRecorder.onstop = () => {
            const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
            this.voiceAudioUrl = URL.createObjectURL(blob);
            if (voicePlayback) {
              voicePlayback.src = this.voiceAudioUrl;
              voicePlayback.classList.remove('hidden');
            }
          };

          this.mediaRecorder.start();
          recordBtn.textContent = '⏹️ Stop Recording';
          recordBtn.style.background = 'rgba(255,91,121,0.5)';
          if (recordingStatus) recordingStatus.textContent = 'Recording in progress...';
        } catch (e) {
          alert('Microphone access denied or unavailable.');
        }
      } else {
        this.mediaRecorder.stop();
        recordBtn.textContent = '🎙️ Start Recording';
        recordBtn.style.background = 'rgba(255,91,121,0.2)';
        if (recordingStatus) recordingStatus.textContent = 'Recording saved!';
      }
    };

    if (form) form.onsubmit = async (e) => {
      e.preventDefault();
      const content = document.getElementById('journalText').value;
      const today = new Date().toISOString().slice(0, 10);

      await window.LifeOSStore.insert('journal', {
        date: today,
        mood: JournalManager.selectedMood,
        content,
        voice_url: JournalManager.voiceAudioUrl,
      });

      backdrop.classList.add('hidden');
      modal.classList.add('hidden');
      JournalManager.init();
    };

    const container = document.getElementById('journalEntriesList');
    if (container) {
      container.onclick = async (e) => {
        const del = e.target.closest('.delete-jrn-btn');
        if (del) {
          const id = del.dataset.id;
          if (confirm('Delete this entry?')) {
            await window.LifeOSStore.delete('journal', id);
            JournalManager.init();
          }
        }
      };
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  JournalManager.init();
});
