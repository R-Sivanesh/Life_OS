// Life OS Google Gemini AI Assistant Module

class AIAssistant {
  static chatHistory = [];

  static async init() {
    if (!window.AuthManager || !window.AuthManager.requireAuth()) return;

    const saved = localStorage.getItem('lifeos_ai_chat');
    if (saved) {
      try { this.chatHistory = JSON.parse(saved); } catch (e) { this.chatHistory = []; }
    }

    if (this.chatHistory.length === 0) {
      this.chatHistory.push({
        sender: 'ai',
        text: 'Hello! I am your Life OS AI Assistant powered by Google Gemini. How can I help optimize your schedule, summarize notes, or boost your productivity today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }

    this.renderChat();
    this.bindEvents();
  }

  static renderChat() {
    const container = document.getElementById('aiChatContainer');
    if (!container) return;

    container.innerHTML = this.chatHistory.map(msg => `
      <div style="display:flex; justify-content:${msg.sender === 'user' ? 'flex-end' : 'flex-start'};">
        <div class="glass-card" style="max-width:75%; padding:14px 18px; border-radius:${msg.sender === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px'}; background:${msg.sender === 'user' ? 'linear-gradient(135deg, rgba(134,82,255,0.4), rgba(58,164,255,0.4))' : 'rgba(255,255,255,0.06)'};">
          <div style="font-size:0.75rem; color:#9aa3ff; margin-bottom:4px; font-weight:600;">${msg.sender === 'user' ? 'You' : '🤖 Gemini AI'} • ${msg.timestamp}</div>
          <div style="font-size:0.95rem; line-height:1.5; color:#fff; white-space:pre-wrap;">${msg.text}</div>
        </div>
      </div>
    `).join('');

    container.scrollTop = container.scrollHeight;
  }

  static async sendMessage(userPrompt) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.chatHistory.push({ sender: 'user', text: userPrompt, timestamp: time });
    this.renderChat();

    const apiKey = localStorage.getItem('lifeos_gemini_api_key');
    let aiResponseText = '';

    const tasks = await window.LifeOSStore.select('tasks');
    const routines = await window.LifeOSStore.select('daily_routines');
    const completed = tasks.filter(t => t.status === 'completed');
    const pending = tasks.filter(t => t.status !== 'completed');

    if (apiKey) {
      try {
        const systemContext = `You are Life OS AI, a personal productivity assistant. Current workspace state: Total tasks: ${tasks.length}, Completed today: ${completed.length}, Pending: ${pending.length}. Pending titles: ${pending.map(p => `${p.title} (Priority: ${p.priority})`).join(', ')}. Active routines: ${routines.filter(r => r.enabled).map(r => r.title).join(', ')}. Answer the user concisely with actionable guidance.`;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: `${systemContext}\nUser Question: ${userPrompt}` }] }] })
        });
        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts[0].text) {
          aiResponseText = data.candidates[0].content.parts[0].text;
        }
      } catch (e) {
        console.warn('Gemini API call error, fallback:', e);
      }
    }

    if (!aiResponseText) {
      aiResponseText = await this.generateContextualFallbackResponse(userPrompt, tasks, routines, completed, pending);
    }

    this.chatHistory.push({ sender: 'ai', text: aiResponseText, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    localStorage.setItem('lifeos_ai_chat', JSON.stringify(this.chatHistory));
    this.renderChat();
  }

  static async generateContextualFallbackResponse(prompt, tasks, routines, completed, pending) {
    const activeRoutines = routines.filter(r => r.enabled);
    const lower = prompt.toLowerCase();

    if (lower.includes('next') || lower.includes('best') || lower.includes('prioritize') || lower.includes('task')) {
      if (pending.length === 0) return '🎉 All tasks are currently completed! Excellent job. Take a break or start a Focus session to prepare tomorrow\'s goals.';
      const highPri = pending.filter(t => t.priority === 'high');
      const bestTask = highPri.length > 0 ? highPri[0] : pending[0];
      return `🎯 **Best Next Task Recommendation**:\n\n- **Focus Objective**: ${bestTask.title}\n- **Priority**: ${(bestTask.priority || 'medium').toUpperCase()}\n- **Estimated Duration**: ${bestTask.estimated_time || 30} mins\n- **Deadline**: ${bestTask.scheduled_time || 'Today'}\n\n*Action*: Click "Start Focus Mode" on your dashboard to complete this with zero distractions!`;
    }

    if (lower.includes('schedule') || lower.includes('optimize')) {
      return `⚡ **Schedule Optimization Plan**:\n\n- **Morning**: Complete morning routine items (${activeRoutines[0] ? activeRoutines[0].title : 'Exercise'}).\n- **Deep Work Block**: Allocate 90 minutes to high-impact pending tasks (${pending[0] ? pending[0].title : 'Core Goal'}).\n- **Evening Reflection**: Log your achievements in your daily journal before 10:00 PM.`;
    }

    if (lower.includes('study') || lower.includes('learn')) {
      const learningTask = pending.find(t => (t.category || '').toLowerCase() === 'learning') || pending[0];
      return `📚 **Study & Learning Recommendation**:\n\n- **Target Topic**: ${learningTask ? learningTask.title : 'Backend Architecture & TypeScript'}\n- **Recommended Strategy**: 25-minute Pomodoro focus block + 5-minute reflection note in Markdown Notes.`;
    }

    if (lower.includes('sleep') || lower.includes('rest')) {
      return `🌙 **Sleep & Recovery Recommendation**:\n\n- Target Bedtime: **10:30 PM**\n- Consistency Score: High\n- *Tip*: Wind down 30 minutes before sleep by reviewing your completed task streak and muting notifications.`;
    }

    if (lower.includes('focus')) {
      return `⏱️ **Focus Mode Recommendation**:\n\n- Selected Session: 25-minute Pomodoro\n- Ambient Track: Rain / Ocean Waves synthesizer enabled\n- Target Task: ${pending[0] ? pending[0].title : 'General Focus'}`;
    }

    return `🤖 **Gemini AI Analysis**:\nYou have completed **${completed.length} of ${tasks.length}** objectives today (${tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0}% completion).\nNext recommended task: **${pending[0] ? pending[0].title : 'Queue clear!'}**.`;
  }

  static bindEvents() {
    const form = document.getElementById('aiChatForm');
    const input = document.getElementById('aiInput');
    const clearBtn = document.getElementById('clearAIChatBtn');

    if (form) form.onsubmit = (e) => {
      e.preventDefault();
      const val = input.value.trim();
      if (val) {
        input.value = '';
        this.sendMessage(val);
      }
    };

    document.querySelectorAll('.quick-ai-prompt').forEach(btn => {
      btn.onclick = () => {
        const p = btn.dataset.prompt;
        if (p) this.sendMessage(p);
      };
    });

    if (clearBtn) clearBtn.onclick = () => {
      if (confirm('Clear AI chat history?')) {
        this.chatHistory = [];
        localStorage.removeItem('lifeos_ai_chat');
        this.init();
      }
    };
  }
}

document.addEventListener('DOMContentLoaded', () => {
  AIAssistant.init();
});
