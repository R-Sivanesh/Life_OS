// Life OS Markdown Notes Engine

class NotesManager {
  static currentNoteId = null;
  static autosaveTimer = null;

  static async init() {
    let notes = await window.LifeOSStore.select('notes');
    if (!notes || notes.length === 0) {
      const sampleNotes = [
        { id: 'nt_1', title: '💡 Life OS Architecture Blueprint', content: '# Life OS Core Architecture\n\n- **Database**: Supabase PostgreSQL\n- **UI/UX**: Glassmorphism & Neon Glow\n- **AI**: Google Gemini API Integration', tags: '#architecture #lifeos', updated_at: new Date().toISOString() },
        { id: 'nt_2', title: '📚 Next.js & React 19 Best Practices', content: '### Key Highlights\n1. Server Components\n2. Optimistic UI Updates\n3. Streaming SSR', tags: '#react #learning', updated_at: new Date().toISOString() }
      ];
      for (const n of sampleNotes) await window.LifeOSStore.insert('notes', n);
      notes = await window.LifeOSStore.select('notes');
    }

    this.renderNotesList(notes);
    if (notes.length > 0) this.selectNote(notes[0].id);
    this.bindEvents();
  }

  static renderNotesList(notes) {
    const list = document.getElementById('notesList');
    if (!list) return;

    list.innerHTML = notes.map(n => `
      <div class="note-item-card ${n.id === this.currentNoteId ? 'active' : ''}" data-id="${n.id}" style="background:${n.id === this.currentNoteId ? 'rgba(134,82,255,0.2)' : 'rgba(255,255,255,0.05)'}; padding:14px; border-radius:14px; cursor:pointer;">
        <h4 style="margin:0 0 4px; font-size:0.95rem; font-weight:600;">${n.title || 'Untitled Note'}</h4>
        <span style="font-size:0.75rem; color:#9aa3ff;">${n.tags || '#note'}</span>
      </div>
    `).join('');
  }

  static async selectNote(id) {
    this.currentNoteId = id;
    const notes = await window.LifeOSStore.select('notes');
    const note = notes.find(n => n.id === id);
    if (!note) return;

    document.getElementById('noteTitleInput').value = note.title || '';
    document.getElementById('noteTagsInput').value = note.tags || '';
    document.getElementById('noteEditor').value = note.content || '';
    this.renderPreview();
    this.renderNotesList(notes);
  }

  static renderPreview() {
    const editorVal = document.getElementById('noteEditor').value;
    const previewEl = document.getElementById('notePreview');
    if (!previewEl) return;
    if (typeof marked !== 'undefined') {
      previewEl.innerHTML = marked.parse(editorVal || '*No content yet.*');
    } else {
      previewEl.textContent = editorVal;
    }
  }

  static triggerAutosave() {
    const statusEl = document.getElementById('noteAutosaveStatus');
    if (statusEl) statusEl.textContent = 'Saving...';

    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(async () => {
      if (!this.currentNoteId) return;
      const title = document.getElementById('noteTitleInput').value || 'Untitled Note';
      const tags = document.getElementById('noteTagsInput').value || '#note';
      const content = document.getElementById('noteEditor').value || '';

      await window.LifeOSStore.update('notes', this.currentNoteId, { title, tags, content });
      if (statusEl) statusEl.textContent = 'Autosaved';

      const notes = await window.LifeOSStore.select('notes');
      this.renderNotesList(notes);
    }, 800);
  }

  static bindEvents() {
    const titleInput = document.getElementById('noteTitleInput');
    const tagsInput = document.getElementById('noteTagsInput');
    const editor = document.getElementById('noteEditor');
    const list = document.getElementById('notesList');
    const newBtn = document.getElementById('newNoteBtn');
    const deleteBtn = document.getElementById('deleteNoteBtn');

    const searchInput = document.getElementById('notesSearch');
    const togglePreviewBtn = document.getElementById('togglePreviewBtn');

    if (searchInput) {
      searchInput.oninput = async () => {
        const query = searchInput.value.toLowerCase().trim();
        const allNotes = await window.LifeOSStore.select('notes');
        const filtered = allNotes.filter(n =>
          (n.title && n.title.toLowerCase().includes(query)) ||
          (n.tags && n.tags.toLowerCase().includes(query)) ||
          (n.content && n.content.toLowerCase().includes(query))
        );
        this.renderNotesList(filtered);
      };
    }

    if (togglePreviewBtn) {
      let isPreviewOnly = false;
      togglePreviewBtn.onclick = () => {
        const editor = document.getElementById('noteEditor');
        const preview = document.getElementById('notePreview');
        if (!editor || !preview) return;

        isPreviewOnly = !isPreviewOnly;
        if (isPreviewOnly) {
          editor.style.display = 'none';
          preview.parentElement.style.gridTemplateColumns = '1fr';
          togglePreviewBtn.textContent = 'Edit Mode';
          togglePreviewBtn.style.background = 'rgba(139,92,246,0.3)';
        } else {
          editor.style.display = 'block';
          preview.parentElement.style.gridTemplateColumns = '1fr 1fr';
          togglePreviewBtn.textContent = 'Preview';
          togglePreviewBtn.style.background = 'rgba(255,255,255,0.08)';
        }
      };
    }

    if (editor) editor.oninput = () => {
      this.renderPreview();
      this.triggerAutosave();
    };
    if (titleInput) titleInput.oninput = () => this.triggerAutosave();
    if (tagsInput) tagsInput.oninput = () => this.triggerAutosave();

    if (list) list.onclick = (e) => {
      const card = e.target.closest('.note-item-card');
      if (card) this.selectNote(card.dataset.id);
    };

    if (newBtn) newBtn.onclick = async () => {
      const newNote = await window.LifeOSStore.insert('notes', {
        title: 'New Note',
        content: '# New Note\n\nStart typing here...',
        tags: '#ideas',
      });
      const notes = await window.LifeOSStore.select('notes');
      this.renderNotesList(notes);
      this.selectNote(newNote.id);
    };

    if (deleteBtn) deleteBtn.onclick = async () => {
      if (this.currentNoteId && confirm('Delete this note?')) {
        await window.LifeOSStore.delete('notes', this.currentNoteId);
        this.currentNoteId = null;
        NotesManager.init();
      }
    };
  }
}

document.addEventListener('DOMContentLoaded', () => {
  NotesManager.init();
});
