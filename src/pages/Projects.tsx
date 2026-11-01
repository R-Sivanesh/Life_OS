import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  FolderKanban,
  FolderOpen,
  MoreVertical,
  Edit2,
  Trash2,
  ExternalLink,
  Bell,
  X,
  ChevronRight,
  Lightbulb,
} from 'lucide-react';
import { useProjects } from '../lib/useProjects';
import type { Project, ProjectStatus, ProjectReminder } from '../lib/useProjects';
import { useDeleteModal } from '../contexts/DeleteModalContext';
import { cn } from '../lib/utils';
import { format, isPast, parseISO } from 'date-fns';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: ProjectStatus[] = ['Idea', 'Planning', 'In Progress', 'On Hold', 'Completed', 'Archived'];

const PRESET_COLORS = ['#1683FF', '#00B8FF', '#10B981', '#F59E0B', '#8B5CF6', '#F43F5E', '#06B6D4', '#64748B'];

const STATUS_STYLES: Record<string, string> = {
  Idea: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  Planning: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'In Progress': 'bg-cyan/20 text-cyan border-cyan/30',
  'On Hold': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  Completed: 'bg-green-500/20 text-green-300 border-green-500/30',
  Archived: 'bg-surface-elevated text-text-muted border-border',
};

const STATUS_ACCENT_COLOR: Record<string, string> = {
  Idea: '#8B5CF6',
  Planning: '#3B82F6',
  'In Progress': '#00B8FF',
  'On Hold': '#F59E0B',
  Completed: '#10B981',
  Archived: '#64748B',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', STATUS_STYLES[status] || STATUS_STYLES.Archived)}>
      {status}
    </span>
  );
}

// ─── Project Modal ────────────────────────────────────────────────────────────

interface ProjectModalProps {
  project?: Project;
  onClose: () => void;
  onSave: (data: Partial<Project>) => Promise<void>;
}

function ProjectModal({ project, onClose, onSave }: ProjectModalProps) {
  const [name, setName] = useState(project?.name || '');
  const [description, setDescription] = useState(project?.description || '');
  const [icon, setIcon] = useState(project?.icon || '');
  const [coverColor, setCoverColor] = useState(project?.cover_color || PRESET_COLORS[0]);
  const [status, setStatus] = useState<ProjectStatus>(project?.status || 'Idea');
  const [repoUrl, setRepoUrl] = useState(project?.repo_url || '');
  const [demoUrl, setDemoUrl] = useState(project?.demo_url || '');
  const [docUrl, setDocUrl] = useState(project?.doc_url || '');
  const [notes, setNotes] = useState(project?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Project name is required'); return; }
    setSaving(true);
    await onSave({ name: name.trim(), description, icon, cover_color: coverColor, status, repo_url: repoUrl, demo_url: demoUrl, doc_url: docUrl, notes });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-sidebar border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <h2 className="text-lg font-bold text-text-primary">{project ? 'Edit Project' : 'New Project'}</h2>
          <button onClick={onClose} className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
          {error && <p className="text-danger text-sm bg-danger/10 px-3 py-2 rounded-lg">{error}</p>}

          {/* Name + Icon row */}
          <div className="flex gap-3">
            <div className="w-14">
              <label className="block text-xs text-text-muted mb-1">Icon</label>
              <input value={icon} onChange={e => setIcon(e.target.value)} placeholder="🚀" maxLength={4}
                className="w-full h-10 text-center text-xl bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:border-primary" />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-text-muted mb-1">Project Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} required placeholder="My Awesome Project"
                className="w-full h-10 px-3 bg-surface border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary text-sm" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-text-muted mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="What is this project about?"
              className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary text-sm resize-none" />
          </div>

          {/* Color swatches */}
          <div>
            <label className="block text-xs text-text-muted mb-2">Accent Color</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setCoverColor(c)}
                  className={cn('w-7 h-7 rounded-full border-2 transition-transform', coverColor === c ? 'border-white scale-110' : 'border-transparent')}
                  style={{ backgroundColor: c }} />
              ))}
              <input type="color" value={coverColor} onChange={e => setCoverColor(e.target.value)}
                className="w-7 h-7 rounded-full border-2 border-border bg-transparent cursor-pointer" title="Custom color" />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs text-text-muted mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as ProjectStatus)}
              className="w-full h-10 px-3 bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:border-primary text-sm">
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* URLs */}
          <div className="space-y-3">
            <label className="block text-xs text-text-muted">Links (optional)</label>
            {[
              { label: 'Repository URL', val: repoUrl, set: setRepoUrl, ph: 'https://github.com/...' },
              { label: 'Live Demo URL', val: demoUrl, set: setDemoUrl, ph: 'https://...' },
              { label: 'Documentation URL', val: docUrl, set: setDocUrl, ph: 'https://docs.example.com' },
            ].map(({ label, val, set, ph }) => (
              <div key={label}>
                <label className="block text-[11px] text-text-muted mb-0.5">{label}</label>
                <input value={val} onChange={e => set(e.target.value)} placeholder={ph} type="url"
                  className="w-full h-9 px-3 bg-surface border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary text-sm" />
              </div>
            ))}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-text-muted mb-1">Overview Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Goals, context, important details..."
              className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary text-sm resize-none" />
          </div>

          <button type="submit" disabled={saving}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-cyan text-white font-semibold text-sm disabled:opacity-50 shadow-glow transition-opacity hover:opacity-90">
            {saving ? 'Saving...' : project ? 'Save Changes' : 'Create Project'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────

interface ProjectCardProps {
  project: Project;
  onEdit: (p: Project) => void;
  onDelete: (p: Project) => void;
  onClick: (p: Project) => void;
}

function ProjectCard({ project, onEdit, onDelete, onClick }: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const accentColor = project.cover_color || STATUS_ACCENT_COLOR[project.status] || '#1683FF';

  return (
    <div
      className="bg-surface border border-border rounded-2xl overflow-hidden cursor-pointer hover:border-primary/40 transition-all duration-200 hover:shadow-[0_0_20px_rgba(22,131,255,0.1)] relative group"
      onClick={() => onClick(project)}
    >
      {/* Accent bar */}
      <div className="h-1 w-full" style={{ backgroundColor: accentColor }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            {project.icon ? (
              <span className="text-xl shrink-0">{project.icon}</span>
            ) : (
              <FolderKanban className="w-5 h-5 shrink-0" style={{ color: accentColor }} />
            )}
            <h3 className="font-semibold text-text-primary text-sm truncate">{project.name}</h3>
          </div>

          {/* Three-dot menu */}
          <div className="relative shrink-0">
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
              className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-7 z-20 w-36 bg-sidebar border border-border rounded-xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <button onClick={() => { setMenuOpen(false); onEdit(project); }}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-text-primary hover:bg-surface-elevated transition-colors">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => { setMenuOpen(false); onDelete(project); }}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-danger hover:bg-danger/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-xs text-text-muted line-clamp-2 mb-3">{project.description}</p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <StatusBadge status={project.status} />
          <span className="text-[10px] text-text-muted">
            {format(new Date(project.updated_at), 'MMM d')}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden animate-pulse">
      <div className="h-1 bg-surface-elevated" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-surface-elevated rounded w-3/4" />
        <div className="h-3 bg-surface-elevated rounded w-full" />
        <div className="h-3 bg-surface-elevated rounded w-2/3" />
        <div className="flex justify-between mt-2">
          <div className="h-4 w-20 bg-surface-elevated rounded-full" />
          <div className="h-3 w-12 bg-surface-elevated rounded" />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const FILTER_OPTIONS = ['All', ...STATUS_OPTIONS] as const;

export default function Projects() {
  const navigate = useNavigate();
  const { projects, loading, addProject, updateProject, deleteProject, refresh, getAllUpcomingReminders } = useProjects();
  const { confirmDelete } = useDeleteModal();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [upcomingReminders, setUpcomingReminders] = useState<(ProjectReminder & { project_name: string })[]>([]);

  // Load upcoming reminders
  useEffect(() => {
    getAllUpcomingReminders().then(setUpcomingReminders);
  }, [projects]); // refresh when projects list changes

  // Stats
  const activeCount = useMemo(() =>
    projects.filter(p => p.status === 'In Progress' || p.status === 'Planning').length
  , [projects]);

  const ideasCount = useMemo(() =>
    projects.filter(p => p.status === 'Idea').length
  , [projects]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    let list = projects;
    if (statusFilter !== 'All') list = list.filter(p => p.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [projects, statusFilter, search]);

  const mainProjects = useMemo(() =>
    filteredProjects.filter(p => p.status !== 'Idea')
  , [filteredProjects]);

  const ideaProjects = useMemo(() =>
    filteredProjects.filter(p => p.status === 'Idea')
  , [filteredProjects]);

  const handleSave = async (data: Partial<Project>) => {
    if (editingProject) {
      await updateProject(editingProject.id, data);
    } else {
      await addProject(data);
    }
    await refresh();
  };

  const handleDelete = (project: Project) => {
    confirmDelete(`project "${project.name}"`, async () => {
      await deleteProject(project.id);
    });
  };

  const openAdd = () => { setEditingProject(undefined); setIsModalOpen(true); };
  const openEdit = (p: Project) => { setEditingProject(p); setIsModalOpen(true); };

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <FolderKanban className="w-7 h-7 text-cyan" /> Projects
          </h1>
          <p className="text-xs text-text-muted mt-0.5">Knowledge hub & workspace</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-1.5 text-sm px-3 py-2">
          <Plus className="w-4 h-4" /> New
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Active', value: activeCount, color: 'text-cyan' },
          { label: 'Ideas', value: ideasCount, color: 'text-purple-300' },
          { label: 'Reminders', value: upcomingReminders.length, color: 'text-yellow-300' },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-border rounded-xl p-3 text-center">
            <div className={cn('text-2xl font-bold', s.color)}>{s.value}</div>
            <div className="text-[10px] text-text-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="w-full pl-9 pr-4 h-10 bg-surface border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary text-sm"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
        {FILTER_OPTIONS.map(f => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border',
              statusFilter === f
                ? 'bg-primary text-white border-primary'
                : 'bg-surface border-border text-text-muted hover:text-text-primary hover:border-primary/40'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Loading skeletons */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : filteredProjects.length === 0 ? (
        // Empty state
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderOpen className="w-14 h-14 text-text-muted mb-4 opacity-50" />
          {projects.length === 0 ? (
            <>
              <h3 className="text-lg font-semibold text-text-primary mb-2">No projects yet</h3>
              <p className="text-sm text-text-muted mb-6 max-w-xs">Create your first project to start tracking your work, ideas, and experiments.</p>
              <button onClick={openAdd} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" /> Create first project
              </button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-text-primary mb-2">No results</h3>
              <p className="text-sm text-text-muted">No projects match your search or filter.</p>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Main projects grid */}
          {mainProjects.length > 0 && (
            <section className="mb-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {mainProjects.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onClick={p => navigate(`/projects/${p.id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Ideas section */}
          {ideaProjects.length > 0 && (
            <section className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-purple-300" />
                <h2 className="text-sm font-semibold text-text-primary">Ideas</h2>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-full">{ideaProjects.length}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {ideaProjects.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onClick={p => navigate(`/projects/${p.id}`)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Upcoming Reminders section */}
      {upcomingReminders.length > 0 && (
        <section className="mt-2">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-yellow-300" />
            <h2 className="text-sm font-semibold text-text-primary">Upcoming Project Reminders</h2>
          </div>
          <div className="space-y-2">
            {upcomingReminders.slice(0, 5).map(r => {
              const overdue = r.date < new Date().toISOString().split('T')[0];
              return (
                <div
                  key={r.id}
                  className={cn(
                    'flex items-center gap-3 bg-surface border rounded-xl px-4 py-3 cursor-pointer hover:border-primary/40 transition-colors',
                    overdue ? 'border-danger/40' : 'border-border'
                  )}
                  onClick={() => navigate(`/projects/${r.project_id}`)}
                >
                  <Bell className={cn('w-4 h-4 shrink-0', overdue ? 'text-danger' : 'text-yellow-300')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{r.title}</p>
                    <p className="text-[10px] text-text-muted truncate">{r.project_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn('text-xs font-medium', overdue ? 'text-danger' : 'text-text-muted')}>
                      {overdue ? 'Overdue' : format(parseISO(r.date), 'MMM d')}
                    </p>
                    {r.time && <p className="text-[10px] text-text-muted">{r.time.slice(0, 5)}</p>}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0" />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Modal */}
      {isModalOpen && (
        <ProjectModal
          project={editingProject}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

