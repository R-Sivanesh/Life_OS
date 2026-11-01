import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  ExternalLink,
  Edit2,
  X,
  Plus,
  Trash2,
  Hammer,
  ChevronUp,
  ChevronDown,
  Check,
  Github,
  Globe,
  FileText,
  Palette,
  Link as LinkIcon,
  Bell,
  FlaskConical,
  BookOpen,
  Lightbulb,
  Layers,
  BarChart2,
  AlignLeft,
  RefreshCw,
} from 'lucide-react';
import { useProjects } from '../lib/useProjects';
import type {
  Project,
  ProjectNote,
  ProjectExperiment,
  ProjectBuiltFeature,
  ProjectIdea,
  ProjectLearning,
  ProjectReminder,
  ProjectLink,
  ProjectProCon,
} from '../lib/useProjects';
import { useDeleteModal } from '../contexts/DeleteModalContext';
import { cn } from '../lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function truncate(str?: string, lines = 3): string {
  if (!str) return '';
  const parts = str.split('\n').slice(0, lines);
  return parts.join('\n');
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  Idea:        'text-text-muted bg-surface-elevated border-border',
  Planning:    'text-primary bg-primary/10 border-primary/20',
  'In Progress':'text-cyan bg-cyan/10 border-cyan/20',
  'On Hold':   'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  Completed:   'text-green-400 bg-green-400/10 border-green-400/20',
  Archived:    'text-text-muted bg-surface border-border',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('text-[10px] uppercase font-bold px-2 py-0.5 rounded border', STATUS_COLORS[status] || 'text-text-muted bg-surface-elevated border-border')}>
      {status}
    </span>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-6 right-6 z-[200] bg-green-500/90 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-lg animate-fade-in">
      {message}
    </div>
  );
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface-elevated border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between p-5 border-b border-border">
      <h3 className="font-semibold text-text-primary text-lg">{title}</h3>
      <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-cyan/30 border-t-cyan rounded-full animate-spin" />
    </div>
  );
}

// ─── Input / Textarea / Select helpers ───────────────────────────────────────

const inputCls = 'w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cyan/50 transition-colors';
const labelCls = 'block text-xs font-medium text-text-muted mb-1';

// ─── Tabs definition ──────────────────────────────────────────────────────────

const TABS = [
  { key: 'overview',    label: 'Overview' },
  { key: 'notes',       label: 'Notes' },
  { key: 'experiments', label: 'Experiments' },
  { key: 'built',       label: 'Built' },
  { key: 'tobuild',     label: 'To Build' },
  { key: 'learning',    label: 'Learning' },
  { key: 'proscons',    label: 'Pros & Cons' },
  { key: 'reminders',   label: 'Reminders' },
  { key: 'links',       label: 'Links' },
] as const;

type TabKey = typeof TABS[number]['key'];

// ─── TAB 1: Overview ─────────────────────────────────────────────────────────

function OverviewTab({
  project,
  onSave,
  onToast,
}: {
  project: Project;
  onSave: (updates: Partial<Project>) => Promise<boolean>;
  onToast: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: project.name,
    description: project.description ?? '',
    status: project.status,
    repo_url: project.repo_url ?? '',
    demo_url: project.demo_url ?? '',
    doc_url: project.doc_url ?? '',
    notes: project.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  // Sync form when project changes
  useEffect(() => {
    setForm({
      name: project.name,
      description: project.description ?? '',
      status: project.status,
      repo_url: project.repo_url ?? '',
      demo_url: project.demo_url ?? '',
      doc_url: project.doc_url ?? '',
      notes: project.notes ?? '',
    });
  }, [project]);

  const handleSave = async () => {
    setSaving(true);
    const ok = await onSave(form);
    setSaving(false);
    if (ok) {
      onToast('Saved!');
      setEditing(false);
    }
  };

  const LinkRow = ({ label, url }: { label: string; url?: string }) => {
    if (!url || !isValidUrl(url)) return null;
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm text-cyan hover:text-primary transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
        <span className="font-medium">{label}:</span>
        <span className="truncate text-text-muted hover:text-cyan">{url}</span>
      </a>
    );
  };

  const STATUSES = ['Idea', 'Planning', 'In Progress', 'On Hold', 'Completed', 'Archived'];

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-text-primary">Edit Overview</h3>
          <button onClick={() => setEditing(false)} className="text-text-muted hover:text-text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div>
          <label className={labelCls}>Name</label>
          <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <textarea className={inputCls} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select className={inputCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Project['status'] }))}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Repo URL</label>
          <input className={inputCls} type="url" value={form.repo_url} onChange={e => setForm(f => ({ ...f, repo_url: e.target.value }))} placeholder="https://github.com/..." />
        </div>
        <div>
          <label className={labelCls}>Demo URL</label>
          <input className={inputCls} type="url" value={form.demo_url} onChange={e => setForm(f => ({ ...f, demo_url: e.target.value }))} placeholder="https://..." />
        </div>
        <div>
          <label className={labelCls}>Doc URL</label>
          <input className={inputCls} type="url" value={form.doc_url} onChange={e => setForm(f => ({ ...f, doc_url: e.target.value }))} placeholder="https://..." />
        </div>
        <div>
          <label className={labelCls}>Goals / Notes</label>
          <textarea className={inputCls} rows={5} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-cyan text-background font-semibold text-sm rounded-lg hover:bg-cyan/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-text-muted hover:text-text-primary border border-border rounded-lg transition-colors">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-text-primary text-lg">{project.name}</h3>
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-cyan transition-colors px-3 py-1.5 border border-border rounded-lg hover:border-cyan/50"
        >
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </button>
      </div>

      {project.description && (
        <div>
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">Description</p>
          <p className="text-sm text-text-primary leading-relaxed">{project.description}</p>
        </div>
      )}

      {project.notes && (
        <div>
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">Goals / Notes</p>
          <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{project.notes}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface rounded-xl p-3 border border-border">
          <p className="text-xs text-text-muted mb-1">Status</p>
          <StatusBadge status={project.status} />
        </div>
        <div className="bg-surface rounded-xl p-3 border border-border">
          <p className="text-xs text-text-muted mb-1">Created</p>
          <p className="text-xs text-text-primary">{formatDate(project.created_at)}</p>
        </div>
        <div className="bg-surface rounded-xl p-3 border border-border col-span-2">
          <p className="text-xs text-text-muted mb-1">Last Updated</p>
          <p className="text-xs text-text-primary">{formatDate(project.updated_at)}</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Links</p>
        <div className="space-y-1.5">
          <LinkRow label="Repository" url={project.repo_url} />
          <LinkRow label="Demo" url={project.demo_url} />
          <LinkRow label="Docs" url={project.doc_url} />
          {!project.repo_url && !project.demo_url && !project.doc_url && (
            <p className="text-xs text-text-muted">No links added. Click Edit to add URLs.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TAB 2: Notes ─────────────────────────────────────────────────────────────

const NOTE_CATEGORIES = ['All', 'Technical', 'Bugs', 'Solutions', 'Decisions', 'Setup', 'General'] as const;
type NoteCategory = typeof NOTE_CATEGORIES[number];

const NOTE_BADGE: Record<string, string> = {
  Technical:  'text-blue-400 bg-blue-400/10 border-blue-400/20',
  Bugs:       'text-red-400 bg-red-400/10 border-red-400/20',
  Solutions:  'text-green-400 bg-green-400/10 border-green-400/20',
  Decisions:  'text-purple-400 bg-purple-400/10 border-purple-400/20',
  Setup:      'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  General:    'text-text-muted bg-surface-elevated border-border',
};

function NotesTab({
  projectId,
  notes,
  onReload,
  hook,
  onToast,
}: {
  projectId: string;
  notes: ProjectNote[];
  onReload: () => void;
  hook: ReturnType<typeof useProjects>;
  onToast: (msg: string) => void;
}) {
  const { confirmDelete } = useDeleteModal();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<NoteCategory>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectNote | null>(null);
  const [form, setForm] = useState({ title: '', category: 'General', content: '' });
  const [saving, setSaving] = useState(false);

  const filtered = notes.filter(n => {
    const matchCat = category === 'All' || n.category === category;
    const q = search.toLowerCase();
    const matchSearch = !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const openAdd = () => { setEditing(null); setForm({ title: '', category: 'General', content: '' }); setModalOpen(true); };
  const openEdit = (note: ProjectNote) => { setEditing(note); setForm({ title: note.title, category: note.category, content: note.content }); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    if (editing) {
      await hook.updateNote(editing.id, { ...form, updated_at: new Date().toISOString() });
    } else {
      await hook.addNote({ ...form, project_id: projectId });
    }
    setSaving(false);
    onReload();
    onToast('Saved!');
    closeModal();
  };

  const handleDelete = (note: ProjectNote) => {
    confirmDelete(note.title, async () => {
      await hook.deleteNote(note.id);
      onReload();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className={cn(inputCls, 'flex-1')}
          placeholder="Search notes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-cyan text-background font-semibold text-sm rounded-lg hover:bg-cyan/90 transition-colors shrink-0">
          <Plus className="w-4 h-4" /> Add Note
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {NOTE_CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn('px-3 py-1 text-xs rounded-full border transition-colors', category === c ? 'bg-cyan text-background border-cyan' : 'text-text-muted border-border hover:border-cyan/50 hover:text-text-primary')}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-text-muted gap-3">
          <AlignLeft className="w-10 h-10 opacity-30" />
          <p className="text-sm">No notes yet. Start documenting your project.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(note => (
            <div key={note.id} className="bg-surface border border-border rounded-xl p-4 hover:border-border/80 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm text-text-primary">{note.title}</p>
                  <span className={cn('text-[10px] uppercase font-bold px-2 py-0.5 rounded border', NOTE_BADGE[note.category] || NOTE_BADGE['General'])}>
                    {note.category}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(note)} className="p-1.5 text-text-muted hover:text-cyan transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(note)} className="p-1.5 text-text-muted hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <p className="text-xs text-text-muted whitespace-pre-wrap line-clamp-3 font-mono leading-relaxed">{note.content}</p>
              <p className="text-[10px] text-text-muted mt-2">{formatDate(note.created_at)}</p>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal onClose={closeModal}>
          <ModalHeader title={editing ? 'Edit Note' : 'Add Note'} onClose={closeModal} />
          <div className="p-5 space-y-4">
            <div>
              <label className={labelCls}>Title <span className="text-red-400">*</span></label>
              <input className={inputCls} required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Note title" />
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <select className={inputCls} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {['Technical', 'Bugs', 'Solutions', 'Decisions', 'Setup', 'General'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Content</label>
              <textarea className={cn(inputCls, 'font-mono text-xs')} rows={10} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Write your note here…" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleSave} disabled={saving || !form.title.trim()} className="px-4 py-2 bg-cyan text-background font-semibold text-sm rounded-lg hover:bg-cyan/90 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={closeModal} className="px-4 py-2 text-sm text-text-muted hover:text-text-primary border border-border rounded-lg transition-colors">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── TAB 3: Experiments ───────────────────────────────────────────────────────

const EXP_STATUS_BADGE: Record<string, string> = {
  Pass:         'text-green-400 bg-green-400/10 border-green-400/20',
  Fail:         'text-red-400 bg-red-400/10 border-red-400/20',
  Inconclusive: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  Pending:      'text-text-muted bg-surface-elevated border-border',
};

function ExperimentsTab({
  projectId,
  experiments,
  onReload,
  hook,
  onToast,
}: {
  projectId: string;
  experiments: ProjectExperiment[];
  onReload: () => void;
  hook: ReturnType<typeof useProjects>;
  onToast: (msg: string) => void;
}) {
  const { confirmDelete } = useDeleteModal();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectExperiment | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const emptyForm = { title: '', objective: '', hypothesis: '', steps: '', result: '', status: 'Pending', errors: '', conclusion: '' };
  const [form, setForm] = useState(emptyForm);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (exp: ProjectExperiment) => {
    setEditing(exp);
    setForm({ title: exp.title, objective: exp.objective ?? '', hypothesis: exp.hypothesis ?? '', steps: exp.steps ?? '', result: exp.result ?? '', status: exp.status, errors: exp.errors ?? '', conclusion: exp.conclusion ?? '' });
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    if (editing) {
      await hook.updateExperiment(editing.id, form);
    } else {
      await hook.addExperiment({ ...form, project_id: projectId });
    }
    setSaving(false);
    onReload();
    onToast('Saved!');
    closeModal();
  };

  const handleDelete = (exp: ProjectExperiment) => {
    confirmDelete(exp.title, async () => { await hook.deleteExperiment(exp.id); onReload(); });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-cyan text-background font-semibold text-sm rounded-lg hover:bg-cyan/90 transition-colors">
          <Plus className="w-4 h-4" /> Add Experiment
        </button>
      </div>

      {experiments.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-text-muted gap-3">
          <FlaskConical className="w-10 h-10 opacity-30" />
          <p className="text-sm">No experiments yet.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {experiments.map(exp => {
            const isExpanded = expanded === exp.id;
            return (
              <div key={exp.id} className="bg-surface border border-border rounded-xl overflow-hidden">
                <div
                  className="flex items-start justify-between gap-3 p-4 cursor-pointer hover:bg-surface-elevated transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : exp.id)}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-text-primary">{exp.title}</p>
                    <span className={cn('text-[10px] uppercase font-bold px-2 py-0.5 rounded border', EXP_STATUS_BADGE[exp.status] || EXP_STATUS_BADGE['Pending'])}>
                      {exp.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={e => { e.stopPropagation(); openEdit(exp); }} className="p-1.5 text-text-muted hover:text-cyan transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={e => { e.stopPropagation(); handleDelete(exp); }} className="p-1.5 text-text-muted hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                  </div>
                </div>

                {!isExpanded && exp.objective && (
                  <p className="text-xs text-text-muted px-4 pb-3 line-clamp-1">{exp.objective}</p>
                )}

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                    {[
                      { label: 'Objective', val: exp.objective },
                      { label: 'Hypothesis', val: exp.hypothesis },
                      { label: 'Steps', val: exp.steps },
                      { label: 'Result', val: exp.result },
                      { label: 'Errors', val: exp.errors },
                      { label: 'Conclusion', val: exp.conclusion },
                    ].map(({ label, val }) => val ? (
                      <div key={label}>
                        <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-0.5">{label}</p>
                        <p className="text-xs text-text-primary whitespace-pre-wrap">{val}</p>
                      </div>
                    ) : null)}
                    <p className="text-[10px] text-text-muted">{formatDate(exp.created_at)}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <Modal onClose={closeModal}>
          <ModalHeader title={editing ? 'Edit Experiment' : 'Add Experiment'} onClose={closeModal} />
          <div className="p-5 space-y-4">
            {[
              { label: 'Title *', key: 'title', type: 'input', placeholder: 'Experiment title' },
              { label: 'Objective', key: 'objective', type: 'textarea', placeholder: 'What are you trying to find out?' },
              { label: 'Hypothesis', key: 'hypothesis', type: 'textarea', placeholder: 'What do you expect to happen?' },
              { label: 'Steps', key: 'steps', type: 'textarea', placeholder: 'Steps to reproduce…' },
              { label: 'Result', key: 'result', type: 'textarea', placeholder: 'What happened?' },
              { label: 'Errors', key: 'errors', type: 'textarea', placeholder: 'Any errors encountered?' },
              { label: 'Conclusion', key: 'conclusion', type: 'textarea', placeholder: 'What did you learn?' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className={labelCls}>{label}</label>
                {type === 'input' ? (
                  <input className={inputCls} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
                ) : (
                  <textarea className={inputCls} rows={3} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
                )}
              </div>
            ))}
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {['Pending', 'Pass', 'Fail', 'Inconclusive'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleSave} disabled={saving || !form.title.trim()} className="px-4 py-2 bg-cyan text-background font-semibold text-sm rounded-lg hover:bg-cyan/90 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={closeModal} className="px-4 py-2 text-sm text-text-muted hover:text-text-primary border border-border rounded-lg transition-colors">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── TAB 4: Built Features ────────────────────────────────────────────────────

function BuiltTab({
  projectId,
  features,
  onReload,
  hook,
  onToast,
}: {
  projectId: string;
  features: ProjectBuiltFeature[];
  onReload: () => void;
  hook: ReturnType<typeof useProjects>;
  onToast: (msg: string) => void;
}) {
  const { confirmDelete } = useDeleteModal();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectBuiltFeature | null>(null);
  const [saving, setSaving] = useState(false);
  const emptyForm = { name: '', description: '', completion_date: '', implementation_notes: '' };
  const [form, setForm] = useState(emptyForm);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (f: ProjectBuiltFeature) => {
    setEditing(f);
    setForm({ name: f.name, description: f.description ?? '', completion_date: f.completion_date ?? '', implementation_notes: f.implementation_notes ?? '' });
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editing) {
      await hook.updateBuiltFeature(editing.id, form);
    } else {
      await hook.addBuiltFeature({ ...form, project_id: projectId });
    }
    setSaving(false);
    onReload();
    onToast('Saved!');
    closeModal();
  };

  const handleDelete = (feat: ProjectBuiltFeature) => {
    confirmDelete(feat.name, async () => { await hook.deleteBuiltFeature(feat.id); onReload(); });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-cyan text-background font-semibold text-sm rounded-lg hover:bg-cyan/90 transition-colors">
          <Plus className="w-4 h-4" /> Add Feature
        </button>
      </div>

      {features.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-text-muted gap-3">
          <Hammer className="w-10 h-10 opacity-30" />
          <p className="text-sm">No built features yet. Start adding what you've implemented.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {features.map(feat => (
            <div key={feat.id} className="bg-surface border border-border rounded-xl p-4 hover:border-border/80 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-1">
                <p className="font-semibold text-sm text-text-primary">{feat.name}</p>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(feat)} className="p-1.5 text-text-muted hover:text-cyan transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(feat)} className="p-1.5 text-text-muted hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {feat.description && <p className="text-xs text-text-muted line-clamp-2 mb-2">{feat.description}</p>}
              {feat.completion_date && <p className="text-[10px] text-green-400">Completed: {formatDate(feat.completion_date)}</p>}
              {feat.implementation_notes && (
                <div className="mt-2 bg-surface-elevated rounded-lg p-2">
                  <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-0.5">Implementation Notes</p>
                  <p className="text-xs text-text-primary whitespace-pre-wrap font-mono">{feat.implementation_notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal onClose={closeModal}>
          <ModalHeader title={editing ? 'Edit Feature' : 'Add Built Feature'} onClose={closeModal} />
          <div className="p-5 space-y-4">
            <div>
              <label className={labelCls}>Feature Name <span className="text-red-400">*</span></label>
              <input className={inputCls} required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. User Authentication" />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea className={inputCls} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Completion Date</label>
              <input className={inputCls} type="date" value={form.completion_date} onChange={e => setForm(f => ({ ...f, completion_date: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Implementation Notes</label>
              <textarea className={cn(inputCls, 'font-mono text-xs')} rows={5} value={form.implementation_notes} onChange={e => setForm(f => ({ ...f, implementation_notes: e.target.value }))} placeholder="Code snippets, patterns used, gotchas…" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleSave} disabled={saving || !form.name.trim()} className="px-4 py-2 bg-cyan text-background font-semibold text-sm rounded-lg hover:bg-cyan/90 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={closeModal} className="px-4 py-2 text-sm text-text-muted hover:text-text-primary border border-border rounded-lg transition-colors">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── TAB 5: To Build (Ideas) ──────────────────────────────────────────────────

const IDEA_STATUS_ORDER = ['Idea', 'Planned', 'In Progress', 'Done'] as const;

const IDEA_STATUS_BADGE: Record<string, string> = {
  Idea:        'text-text-muted bg-surface-elevated border-border',
  Planned:     'text-primary bg-primary/10 border-primary/20',
  'In Progress':'text-cyan bg-cyan/10 border-cyan/20',
  Done:        'text-green-400 bg-green-400/10 border-green-400/20',
};

const IDEA_PRIORITY_BADGE: Record<string, string> = {
  High:   'text-red-400 bg-red-400/10 border-red-400/20',
  Medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  Low:    'text-green-400 bg-green-400/10 border-green-400/20',
};

function ToBuildTab({
  projectId,
  ideas,
  onReload,
  hook,
  onToast,
}: {
  projectId: string;
  ideas: ProjectIdea[];
  onReload: () => void;
  hook: ReturnType<typeof useProjects>;
  onToast: (msg: string) => void;
}) {
  const { confirmDelete } = useDeleteModal();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectIdea | null>(null);
  const [saving, setSaving] = useState(false);
  const [taskMsg, setTaskMsg] = useState<string | null>(null);
  const emptyForm = { title: '', description: '', why_useful: '', priority: 'Medium', dependencies: '', status: 'Idea' };
  const [form, setForm] = useState(emptyForm);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (idea: ProjectIdea) => {
    setEditing(idea);
    setForm({ title: idea.title, description: idea.description ?? '', why_useful: idea.why_useful ?? '', priority: idea.priority, dependencies: idea.dependencies ?? '', status: idea.status });
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    if (editing) {
      await hook.updateIdea(editing.id, form);
    } else {
      const newIdx = ideas.length > 0 ? Math.max(...ideas.map(i => i.order_index)) + 1 : 0;
      await hook.addIdea({ ...form, project_id: projectId, order_index: newIdx });
    }
    setSaving(false);
    onReload();
    onToast('Saved!');
    closeModal();
  };

  const handleDelete = (idea: ProjectIdea) => {
    confirmDelete(idea.title, async () => { await hook.deleteIdea(idea.id); onReload(); });
  };

  const handlePromote = async (idea: ProjectIdea) => {
    const idx = IDEA_STATUS_ORDER.indexOf(idea.status as any);
    if (idx < 0 || idx >= IDEA_STATUS_ORDER.length - 1) return;
    await hook.updateIdea(idea.id, { status: IDEA_STATUS_ORDER[idx + 1] });
    onReload();
  };

  const handleMove = async (idea: ProjectIdea, direction: 'up' | 'down') => {
    const sorted = [...ideas].sort((a, b) => a.order_index - b.order_index);
    const idx = sorted.findIndex(i => i.id === idea.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const swap = sorted[swapIdx];
    await Promise.all([
      hook.updateIdea(idea.id, { order_index: swap.order_index }),
      hook.updateIdea(swap.id, { order_index: idea.order_index }),
    ]);
    onReload();
  };

  const handleCreateTask = () => {
    setTaskMsg('Go to Tasks page to create a task from this idea.');
    setTimeout(() => setTaskMsg(null), 3000);
  };

  const sorted = [...ideas].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-cyan text-background font-semibold text-sm rounded-lg hover:bg-cyan/90 transition-colors">
          <Plus className="w-4 h-4" /> Add Idea
        </button>
      </div>

      {taskMsg && (
        <div className="bg-primary/10 border border-primary/30 rounded-lg px-4 py-3 text-sm text-primary flex items-center justify-between gap-2">
          <span>{taskMsg}</span>
          <button onClick={() => navigate('/tasks')} className="text-cyan underline text-xs shrink-0">Go to Tasks →</button>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-text-muted gap-3">
          <Lightbulb className="w-10 h-10 opacity-30" />
          <p className="text-sm">No ideas yet. Plan what you want to build.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {sorted.map((idea, i) => (
            <div key={idea.id} className="bg-surface border border-border rounded-xl p-4 hover:border-border/80 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm text-text-primary">{idea.title}</p>
                  <span className={cn('text-[10px] uppercase font-bold px-2 py-0.5 rounded border', IDEA_PRIORITY_BADGE[idea.priority] || '')}>
                    {idea.priority}
                  </span>
                  <span className={cn('text-[10px] uppercase font-bold px-2 py-0.5 rounded border', IDEA_STATUS_BADGE[idea.status] || '')}>
                    {idea.status}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleMove(idea, 'up')} disabled={i === 0} className="p-1 text-text-muted hover:text-cyan disabled:opacity-30 transition-colors"><ChevronUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleMove(idea, 'down')} disabled={i === sorted.length - 1} className="p-1 text-text-muted hover:text-cyan disabled:opacity-30 transition-colors"><ChevronDown className="w-3.5 h-3.5" /></button>
                  <button onClick={() => openEdit(idea)} className="p-1.5 text-text-muted hover:text-cyan transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(idea)} className="p-1.5 text-text-muted hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              {idea.description && <p className="text-xs text-text-muted line-clamp-2 mb-2">{idea.description}</p>}

              {idea.why_useful && (
                <div className="mb-2">
                  <span className="text-[10px] font-semibold text-text-muted uppercase">Why useful: </span>
                  <span className="text-xs text-text-muted">{idea.why_useful}</span>
                </div>
              )}
              {idea.dependencies && (
                <div className="mb-2">
                  <span className="text-[10px] font-semibold text-text-muted uppercase">Dependencies: </span>
                  <span className="text-xs text-text-muted">{idea.dependencies}</span>
                </div>
              )}

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {idea.status !== 'Done' && (
                  <button
                    onClick={() => handlePromote(idea)}
                    className="flex items-center gap-1 text-[11px] font-medium text-cyan border border-cyan/30 rounded-lg px-2.5 py-1 hover:bg-cyan/10 transition-colors"
                  >
                    <ChevronUp className="w-3 h-3" />
                    Promote to {IDEA_STATUS_ORDER[IDEA_STATUS_ORDER.indexOf(idea.status as any) + 1] ?? ''}
                  </button>
                )}
                <button
                  onClick={handleCreateTask}
                  className="flex items-center gap-1 text-[11px] font-medium text-text-muted border border-border rounded-lg px-2.5 py-1 hover:border-primary/50 hover:text-primary transition-colors"
                >
                  + Create Task
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal onClose={closeModal}>
          <ModalHeader title={editing ? 'Edit Idea' : 'Add Idea'} onClose={closeModal} />
          <div className="p-5 space-y-4">
            <div>
              <label className={labelCls}>Title <span className="text-red-400">*</span></label>
              <input className={inputCls} required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Feature name" />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea className={inputCls} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Why Useful</label>
              <textarea className={inputCls} rows={2} value={form.why_useful} onChange={e => setForm(f => ({ ...f, why_useful: e.target.value }))} placeholder="Why is this feature valuable?" />
            </div>
            <div>
              <label className={labelCls}>Priority</label>
              <select className={inputCls} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {['High', 'Medium', 'Low'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Dependencies</label>
              <input className={inputCls} value={form.dependencies} onChange={e => setForm(f => ({ ...f, dependencies: e.target.value }))} placeholder="What does this depend on?" />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {IDEA_STATUS_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleSave} disabled={saving || !form.title.trim()} className="px-4 py-2 bg-cyan text-background font-semibold text-sm rounded-lg hover:bg-cyan/90 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={closeModal} className="px-4 py-2 text-sm text-text-muted hover:text-text-primary border border-border rounded-lg transition-colors">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── TAB 6: Learning ──────────────────────────────────────────────────────────

const LEARNING_STATUS_BADGE: Record<string, string> = {
  'Not Started': 'text-text-muted bg-surface-elevated border-border',
  'Learning':    'text-primary bg-primary/10 border-primary/20',
  'Practising':  'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  'Mastered':    'text-green-400 bg-green-400/10 border-green-400/20',
};

function LearningTab({
  projectId,
  learningItems,
  onReload,
  hook,
  onToast,
}: {
  projectId: string;
  learningItems: ProjectLearning[];
  onReload: () => void;
  hook: ReturnType<typeof useProjects>;
  onToast: (msg: string) => void;
}) {
  const { confirmDelete } = useDeleteModal();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectLearning | null>(null);
  const [saving, setSaving] = useState(false);
  const [defaultListType, setDefaultListType] = useState<'learned' | 'to_learn'>('to_learn');
  const emptyForm = { title: '', notes: '', resources: '', status: 'Not Started', next_task: '', list_type: 'to_learn' };
  const [form, setForm] = useState(emptyForm);

  const learned = learningItems.filter(l => l.list_type === 'learned');
  const toLearn = learningItems.filter(l => l.list_type === 'to_learn');

  const openAdd = (listType: 'learned' | 'to_learn') => {
    setEditing(null);
    setDefaultListType(listType);
    setForm({ ...emptyForm, list_type: listType });
    setModalOpen(true);
  };
  const openEdit = (item: ProjectLearning) => {
    setEditing(item);
    setForm({ title: item.title, notes: item.notes ?? '', resources: item.resources ?? '', status: item.status, next_task: item.next_task ?? '', list_type: item.list_type });
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    if (editing) {
      await hook.updateLearningItem(editing.id, form);
    } else {
      await hook.addLearningItem({ ...form, project_id: projectId });
    }
    setSaving(false);
    onReload();
    onToast('Saved!');
    closeModal();
  };

  const handleDelete = (item: ProjectLearning) => {
    confirmDelete(item.title, async () => { await hook.deleteLearningItem(item.id); onReload(); });
  };

  const LearningSection = ({ items, listType, title, accent }: { items: ProjectLearning[]; listType: 'learned' | 'to_learn'; title: string; accent: string }) => (
    <div className={cn('flex-1 min-w-0 border rounded-xl p-4 space-y-3', accent)}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm text-text-primary">{title}</h4>
        <button onClick={() => openAdd(listType)} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 border border-border rounded-lg text-text-muted hover:text-cyan hover:border-cyan/50 transition-colors">
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-text-muted py-4 text-center">No items yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="bg-surface border border-border rounded-lg p-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-xs text-text-primary">{item.title}</p>
                  <span className={cn('text-[10px] uppercase font-bold px-2 py-0.5 rounded border', LEARNING_STATUS_BADGE[item.status] || LEARNING_STATUS_BADGE['Not Started'])}>
                    {item.status}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(item)} className="p-1 text-text-muted hover:text-cyan transition-colors"><Edit2 className="w-3 h-3" /></button>
                  <button onClick={() => handleDelete(item)} className="p-1 text-text-muted hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
              {item.notes && <p className="text-[11px] text-text-muted line-clamp-2 mb-1">{item.notes}</p>}
              {item.resources && <p className="text-[11px] text-text-muted line-clamp-1"><span className="font-semibold">Resources:</span> {item.resources}</p>}
              {item.next_task && <p className="text-[11px] text-cyan mt-1">→ {item.next_task}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <LearningSection items={learned} listType="learned" title="✅ Learned" accent="border-green-400/20 bg-green-400/5" />
        <LearningSection items={toLearn} listType="to_learn" title="📘 Still Learning / To Learn" accent="border-primary/20 bg-primary/5" />
      </div>

      {modalOpen && (
        <Modal onClose={closeModal}>
          <ModalHeader title={editing ? 'Edit Learning Item' : 'Add Learning Item'} onClose={closeModal} />
          <div className="p-5 space-y-4">
            <div>
              <label className={labelCls}>Title <span className="text-red-400">*</span></label>
              <input className={inputCls} required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Topic or skill" />
            </div>
            <div>
              <label className={labelCls}>Notes</label>
              <textarea className={inputCls} rows={4} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="What you know / are learning…" />
            </div>
            <div>
              <label className={labelCls}>Resources</label>
              <textarea className={inputCls} rows={2} value={form.resources} onChange={e => setForm(f => ({ ...f, resources: e.target.value }))} placeholder="Links, books, courses…" />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {['Not Started', 'Learning', 'Practising', 'Mastered'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Next Task</label>
              <input className={inputCls} value={form.next_task} onChange={e => setForm(f => ({ ...f, next_task: e.target.value }))} placeholder="What to do next to progress" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleSave} disabled={saving || !form.title.trim()} className="px-4 py-2 bg-cyan text-background font-semibold text-sm rounded-lg hover:bg-cyan/90 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={closeModal} className="px-4 py-2 text-sm text-text-muted hover:text-text-primary border border-border rounded-lg transition-colors">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── TAB 7: Pros & Cons ───────────────────────────────────────────────────────

type EntryType = 'pro' | 'con' | 'risk' | 'tradeoff';

const PC_CONFIG: Record<EntryType, { label: string; accent: string; textAccent: string }> = {
  pro:      { label: 'Pros',       accent: 'border-green-400/20 bg-green-400/5',  textAccent: 'text-green-400' },
  con:      { label: 'Cons',       accent: 'border-red-400/20 bg-red-400/5',      textAccent: 'text-red-400'   },
  risk:     { label: 'Risks',      accent: 'border-yellow-400/20 bg-yellow-400/5', textAccent: 'text-yellow-400' },
  tradeoff: { label: 'Trade-offs', accent: 'border-primary/20 bg-primary/5',      textAccent: 'text-primary'   },
};

function ProsConsTab({
  projectId,
  prosCons,
  onReload,
  hook,
  onToast,
}: {
  projectId: string;
  prosCons: ProjectProCon[];
  onReload: () => void;
  hook: ReturnType<typeof useProjects>;
  onToast: (msg: string) => void;
}) {
  const { confirmDelete } = useDeleteModal();
  const [addingFor, setAddingFor] = useState<EntryType | null>(null);
  const [addForm, setAddForm] = useState({ title: '', explanation: '' });
  const [saving, setSaving] = useState(false);

  const handleAdd = async (type: EntryType) => {
    if (!addForm.title.trim()) return;
    setSaving(true);
    await hook.addProCon({ title: addForm.title, explanation: addForm.explanation, entry_type: type, project_id: projectId });
    setSaving(false);
    onReload();
    onToast('Added!');
    setAddingFor(null);
    setAddForm({ title: '', explanation: '' });
  };

  const handleDelete = (item: ProjectProCon) => {
    confirmDelete(item.title, async () => { await hook.deleteProCon(item.id); onReload(); });
  };

  const PCSection = ({ type }: { type: EntryType }) => {
    const cfg = PC_CONFIG[type];
    const items = prosCons.filter(p => p.entry_type === type);
    const isAdding = addingFor === type;

    return (
      <div className={cn('rounded-xl border p-4 space-y-3', cfg.accent)}>
        <div className="flex items-center justify-between">
          <h4 className={cn('font-semibold text-sm', cfg.textAccent)}>{cfg.label}</h4>
          <button
            onClick={() => { setAddingFor(isAdding ? null : type); setAddForm({ title: '', explanation: '' }); }}
            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 border border-border rounded-lg text-text-muted hover:text-cyan hover:border-cyan/50 transition-colors"
          >
            {isAdding ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {isAdding ? 'Cancel' : 'Add'}
          </button>
        </div>

        {isAdding && (
          <div className="space-y-2 bg-surface rounded-lg p-3 border border-border">
            <input
              className={inputCls}
              placeholder="Title *"
              value={addForm.title}
              onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
            />
            <input
              className={inputCls}
              placeholder="Explanation (optional)"
              value={addForm.explanation}
              onChange={e => setAddForm(f => ({ ...f, explanation: e.target.value }))}
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleAdd(type)}
                disabled={saving || !addForm.title.trim()}
                className="px-3 py-1.5 bg-cyan text-background font-semibold text-xs rounded-lg hover:bg-cyan/90 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {items.length === 0 && !isAdding && (
          <p className="text-xs text-text-muted py-2 text-center">No {cfg.label.toLowerCase()} yet.</p>
        )}

        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="bg-surface rounded-lg border border-border p-3 flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-text-primary">{item.title}</p>
                {item.explanation && <p className="text-[11px] text-text-muted mt-0.5">{item.explanation}</p>}
              </div>
              <button onClick={() => handleDelete(item)} className="p-1 text-text-muted hover:text-red-400 transition-colors shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <PCSection type="pro" />
      <PCSection type="con" />
      <PCSection type="risk" />
      <PCSection type="tradeoff" />
    </div>
  );
}

// ─── TAB 8: Reminders ────────────────────────────────────────────────────────

function RemindersTab({
  projectId,
  reminders,
  onReload,
  hook,
  onToast,
}: {
  projectId: string;
  reminders: ProjectReminder[];
  onReload: () => void;
  hook: ReturnType<typeof useProjects>;
  onToast: (msg: string) => void;
}) {
  const { confirmDelete } = useDeleteModal();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectReminder | null>(null);
  const [saving, setSaving] = useState(false);
  const emptyForm = { title: '', description: '', date: '', time: '', recurring: 'None' };
  const [form, setForm] = useState(emptyForm);

  const today = new Date().toISOString().split('T')[0];

  const isOverdue = (r: ProjectReminder) => !r.completed && r.date < today;

  const sorted = [...reminders].sort((a, b) => {
    const aOver = isOverdue(a) ? 0 : 1;
    const bOver = isOverdue(b) ? 0 : 1;
    if (aOver !== bOver) return aOver - bOver;
    return a.date.localeCompare(b.date);
  });

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (r: ProjectReminder) => {
    setEditing(r);
    setForm({ title: r.title, description: r.description ?? '', date: r.date, time: r.time ?? '', recurring: r.recurring ?? 'None' });
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const handleSave = async () => {
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    if (editing) {
      await hook.updateProjectReminder(editing.id, form);
    } else {
      await hook.addProjectReminder({ ...form, project_id: projectId, completed: false });
    }
    setSaving(false);
    onReload();
    onToast('Saved!');
    closeModal();
  };

  const handleToggle = async (r: ProjectReminder) => {
    await hook.updateProjectReminder(r.id, { completed: !r.completed });
    onReload();
  };

  const handleDelete = (r: ProjectReminder) => {
    confirmDelete(r.title, async () => { await hook.deleteProjectReminder(r.id); onReload(); });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-text-muted">In-app reminders are tracked here. Mobile push notifications require additional OS permissions and are not yet enabled.</p>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-cyan text-background font-semibold text-sm rounded-lg hover:bg-cyan/90 transition-colors shrink-0">
          <Plus className="w-4 h-4" /> Add Reminder
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-text-muted gap-3">
          <Bell className="w-10 h-10 opacity-30" />
          <p className="text-sm">No reminders for this project.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(r => {
            const overdue = isOverdue(r);
            return (
              <div key={r.id} className={cn('flex items-start gap-3 p-4 rounded-xl border transition-colors', overdue ? 'border-red-400/40 bg-red-400/5' : r.completed ? 'border-border bg-surface opacity-60' : 'border-border bg-surface hover:border-border/80')}>
                <button
                  onClick={() => handleToggle(r)}
                  className={cn('mt-0.5 w-5 h-5 rounded flex items-center justify-center border shrink-0 transition-colors', r.completed ? 'bg-green-500 border-green-500 text-white' : 'border-border hover:border-green-400')}
                >
                  {r.completed && <Check className="w-3 h-3" strokeWidth={3} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn('font-medium text-sm', r.completed ? 'text-text-muted line-through' : overdue ? 'text-red-400' : 'text-text-primary')}>
                      {r.title}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEdit(r)} className="p-1 text-text-muted hover:text-cyan transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(r)} className="p-1 text-text-muted hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  {r.description && <p className="text-xs text-text-muted mt-0.5">{r.description}</p>}
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className={cn('text-[11px] font-medium', overdue ? 'text-red-400' : 'text-text-muted')}>
                      📅 {formatDate(r.date)}{r.time ? ` at ${r.time}` : ''}
                      {overdue && ' — Overdue'}
                    </span>
                    {r.recurring && r.recurring !== 'None' && (
                      <span className="flex items-center gap-1 text-[11px] text-primary">
                        <RefreshCw className="w-3 h-3" /> {r.recurring}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <Modal onClose={closeModal}>
          <ModalHeader title={editing ? 'Edit Reminder' : 'Add Reminder'} onClose={closeModal} />
          <div className="p-5 space-y-4">
            <div>
              <label className={labelCls}>Title <span className="text-red-400">*</span></label>
              <input className={inputCls} required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Reminder title" />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea className={inputCls} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Date <span className="text-red-400">*</span></label>
                <input className={inputCls} type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Time</label>
                <input className={inputCls} type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Recurring</label>
              <select className={inputCls} value={form.recurring} onChange={e => setForm(f => ({ ...f, recurring: e.target.value }))}>
                {['None', 'Daily', 'Weekly', 'Monthly'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleSave} disabled={saving || !form.title.trim() || !form.date} className="px-4 py-2 bg-cyan text-background font-semibold text-sm rounded-lg hover:bg-cyan/90 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={closeModal} className="px-4 py-2 text-sm text-text-muted hover:text-text-primary border border-border rounded-lg transition-colors">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── TAB 9: Links ────────────────────────────────────────────────────────────

const LINK_TYPE_ICON: Record<string, React.ReactNode> = {
  github:      <Github className="w-4 h-4" />,
  deployment:  <Globe className="w-4 h-4" />,
  documentation: <FileText className="w-4 h-4" />,
  design:      <Palette className="w-4 h-4" />,
  other:       <LinkIcon className="w-4 h-4" />,
};

const LINK_TYPE_BADGE: Record<string, string> = {
  github:        'text-text-muted bg-surface-elevated border-border',
  deployment:    'text-cyan bg-cyan/10 border-cyan/20',
  documentation: 'text-primary bg-primary/10 border-primary/20',
  design:        'text-purple-400 bg-purple-400/10 border-purple-400/20',
  other:         'text-text-muted bg-surface-elevated border-border',
};

function LinksTab({
  projectId,
  links,
  onReload,
  hook,
  onToast,
}: {
  projectId: string;
  links: ProjectLink[];
  onReload: () => void;
  hook: ReturnType<typeof useProjects>;
  onToast: (msg: string) => void;
}) {
  const { confirmDelete } = useDeleteModal();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectLink | null>(null);
  const [saving, setSaving] = useState(false);
  const [urlError, setUrlError] = useState('');
  const emptyForm = { label: '', url: '', link_type: 'other' };
  const [form, setForm] = useState(emptyForm);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setUrlError(''); setModalOpen(true); };
  const openEdit = (link: ProjectLink) => {
    setEditing(link);
    setForm({ label: link.label, url: link.url, link_type: link.link_type });
    setUrlError('');
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditing(null); setUrlError(''); };

  const handleSave = async () => {
    if (!form.label.trim() || !form.url.trim()) return;
    if (!isValidUrl(form.url)) { setUrlError('Invalid URL. Please enter a valid URL starting with http:// or https://'); return; }
    setSaving(true);
    if (editing) {
      await hook.updateLink(editing.id, form);
    } else {
      await hook.addLink({ ...form, project_id: projectId });
    }
    setSaving(false);
    onReload();
    onToast('Saved!');
    closeModal();
  };

  const handleDelete = (link: ProjectLink) => {
    confirmDelete(link.label, async () => { await hook.deleteLink(link.id); onReload(); });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-cyan text-background font-semibold text-sm rounded-lg hover:bg-cyan/90 transition-colors">
          <Plus className="w-4 h-4" /> Add Link
        </button>
      </div>

      {links.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-text-muted gap-3">
          <LinkIcon className="w-10 h-10 opacity-30" />
          <p className="text-sm">No links saved for this project.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {links.map(link => (
            <div key={link.id} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
              <div className={cn('p-2 rounded-lg shrink-0', LINK_TYPE_BADGE[link.link_type] || LINK_TYPE_BADGE['other'])}>
                {LINK_TYPE_ICON[link.link_type] || LINK_TYPE_ICON['other']}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-text-primary">{link.label}</p>
                <p className="text-xs text-text-muted truncate">{link.url}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => window.open(link.url, '_blank', 'noopener noreferrer')}
                  className="flex items-center gap-1 text-xs font-medium text-cyan border border-cyan/30 rounded-lg px-2.5 py-1 hover:bg-cyan/10 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> Open
                </button>
                <button onClick={() => openEdit(link)} className="p-1.5 text-text-muted hover:text-cyan transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(link)} className="p-1.5 text-text-muted hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal onClose={closeModal}>
          <ModalHeader title={editing ? 'Edit Link' : 'Add Link'} onClose={closeModal} />
          <div className="p-5 space-y-4">
            <div>
              <label className={labelCls}>Label <span className="text-red-400">*</span></label>
              <input className={inputCls} required value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. GitHub Repository" />
            </div>
            <div>
              <label className={labelCls}>URL <span className="text-red-400">*</span></label>
              <input
                className={cn(inputCls, urlError ? 'border-red-400/50' : '')}
                required
                type="url"
                value={form.url}
                onChange={e => { setForm(f => ({ ...f, url: e.target.value })); setUrlError(''); }}
                placeholder="https://..."
              />
              {urlError && <p className="text-xs text-red-400 mt-1">{urlError}</p>}
            </div>
            <div>
              <label className={labelCls}>Link Type</label>
              <select className={inputCls} value={form.link_type} onChange={e => setForm(f => ({ ...f, link_type: e.target.value }))}>
                {[
                  { value: 'github', label: 'GitHub' },
                  { value: 'deployment', label: 'Deployment' },
                  { value: 'documentation', label: 'Documentation' },
                  { value: 'design', label: 'Design' },
                  { value: 'other', label: 'Other' },
                ].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleSave} disabled={saving || !form.label.trim() || !form.url.trim()} className="px-4 py-2 bg-cyan text-background font-semibold text-sm rounded-lg hover:bg-cyan/90 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={closeModal} className="px-4 py-2 text-sm text-text-muted hover:text-text-primary border border-border rounded-lg transition-colors">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProjectWorkspace() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const hook = useProjects();
  const { projects } = hook;

  const [project, setProject] = useState<Project | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  // Sub-resource state
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [experiments, setExperiments] = useState<ProjectExperiment[]>([]);
  const [builtFeatures, setBuiltFeatures] = useState<ProjectBuiltFeature[]>([]);
  const [ideas, setIdeas] = useState<ProjectIdea[]>([]);
  const [learningItems, setLearningItems] = useState<ProjectLearning[]>([]);
  const [reminders, setReminders] = useState<ProjectReminder[]>([]);
  const [links, setLinks] = useState<ProjectLink[]>([]);
  const [prosCons, setProsCons] = useState<ProjectProCon[]>([]);

  // Per-tab loading
  const [tabLoading, setTabLoading] = useState<Record<string, boolean>>({});

  // Active tab + lazy-loaded tab tracking
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [loadedTabs, setLoadedTabs] = useState<Set<TabKey>>(new Set(['overview']));

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => setToast(msg), []);

  // Load project
  useEffect(() => {
    if (!projectId || hook.loading) return;
    const found = projects.find(p => p.id === projectId);
    setProject(found ?? null);
    setPageLoading(false);
  }, [projectId, projects, hook.loading]);

  // Load data for a tab
  const loadTab = useCallback(async (tab: TabKey) => {
    if (!projectId) return;
    setTabLoading(prev => ({ ...prev, [tab]: true }));
    switch (tab) {
      case 'notes':       setNotes(await hook.getNotes(projectId)); break;
      case 'experiments': setExperiments(await hook.getExperiments(projectId)); break;
      case 'built':       setBuiltFeatures(await hook.getBuiltFeatures(projectId)); break;
      case 'tobuild':     setIdeas(await hook.getIdeas(projectId)); break;
      case 'learning':    setLearningItems(await hook.getLearningItems(projectId)); break;
      case 'proscons':    setProsCons(await hook.getProsCons(projectId)); break;
      case 'reminders':   setReminders(await hook.getProjectReminders(projectId)); break;
      case 'links':       setLinks(await hook.getLinks(projectId)); break;
    }
    setTabLoading(prev => ({ ...prev, [tab]: false }));
  }, [projectId, hook]);

  const handleTabSelect = (tab: TabKey) => {
    setActiveTab(tab);
    if (!loadedTabs.has(tab)) {
      setLoadedTabs(prev => new Set([...prev, tab]));
      loadTab(tab);
    }
  };

  // Reload helpers
  const reloadNotes       = useCallback(() => loadTab('notes'), [loadTab]);
  const reloadExperiments = useCallback(() => loadTab('experiments'), [loadTab]);
  const reloadBuilt       = useCallback(() => loadTab('built'), [loadTab]);
  const reloadIdeas       = useCallback(() => loadTab('tobuild'), [loadTab]);
  const reloadLearning    = useCallback(() => loadTab('learning'), [loadTab]);
  const reloadProsCons    = useCallback(() => loadTab('proscons'), [loadTab]);
  const reloadReminders   = useCallback(() => loadTab('reminders'), [loadTab]);
  const reloadLinks       = useCallback(() => loadTab('links'), [loadTab]);

  const handleProjectSave = async (updates: Partial<Project>) => {
    if (!projectId) return false;
    const ok = await hook.updateProject(projectId, updates);
    if (ok) {
      setProject(prev => prev ? { ...prev, ...updates } : prev);
    }
    return ok;
  };

  // ── Render guards ──────────────────────────────────────────────────────────

  if (pageLoading || hook.loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-cyan/30 border-t-cyan rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-text-muted text-sm">Project not found.</p>
        <button onClick={() => navigate('/projects')} className="text-cyan text-sm hover:underline">← Back to Projects</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-primary">
      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/projects')}
            className="flex items-center gap-1 text-text-muted hover:text-text-primary transition-colors shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm hidden sm:inline">Projects</span>
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            {project.icon && <span className="text-xl shrink-0">{project.icon}</span>}
            <h1 className="font-bold text-base sm:text-lg text-text-primary truncate">{project.name}</h1>
            <StatusBadge status={project.status} />
          </div>
        </div>

        {/* Tab navigation */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto pb-px scrollbar-none">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => handleTabSelect(tab.key)}
                className={cn(
                  'shrink-0 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  activeTab === tab.key
                    ? 'border-cyan text-cyan'
                    : 'border-transparent text-text-muted hover:text-text-primary hover:border-border'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'overview' && (
          <OverviewTab project={project} onSave={handleProjectSave} onToast={showToast} />
        )}

        {activeTab === 'notes' && (
          tabLoading['notes'] ? <Spinner /> : (
            <NotesTab projectId={project.id} notes={notes} onReload={reloadNotes} hook={hook} onToast={showToast} />
          )
        )}

        {activeTab === 'experiments' && (
          tabLoading['experiments'] ? <Spinner /> : (
            <ExperimentsTab projectId={project.id} experiments={experiments} onReload={reloadExperiments} hook={hook} onToast={showToast} />
          )
        )}

        {activeTab === 'built' && (
          tabLoading['built'] ? <Spinner /> : (
            <BuiltTab projectId={project.id} features={builtFeatures} onReload={reloadBuilt} hook={hook} onToast={showToast} />
          )
        )}

        {activeTab === 'tobuild' && (
          tabLoading['tobuild'] ? <Spinner /> : (
            <ToBuildTab projectId={project.id} ideas={ideas} onReload={reloadIdeas} hook={hook} onToast={showToast} />
          )
        )}

        {activeTab === 'learning' && (
          tabLoading['learning'] ? <Spinner /> : (
            <LearningTab projectId={project.id} learningItems={learningItems} onReload={reloadLearning} hook={hook} onToast={showToast} />
          )
        )}

        {activeTab === 'proscons' && (
          tabLoading['proscons'] ? <Spinner /> : (
            <ProsConsTab projectId={project.id} prosCons={prosCons} onReload={reloadProsCons} hook={hook} onToast={showToast} />
          )
        )}

        {activeTab === 'reminders' && (
          tabLoading['reminders'] ? <Spinner /> : (
            <RemindersTab projectId={project.id} reminders={reminders} onReload={reloadReminders} hook={hook} onToast={showToast} />
          )
        )}

        {activeTab === 'links' && (
          tabLoading['links'] ? <Spinner /> : (
            <LinksTab projectId={project.id} links={links} onReload={reloadLinks} hook={hook} onToast={showToast} />
          )
        )}
      </div>
    </div>
  );
}

