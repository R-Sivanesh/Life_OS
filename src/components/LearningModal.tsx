import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Link as LinkIcon, FileText } from 'lucide-react';
import type { LearningTopic, LearningResource } from '../lib/useLearning';

interface LearningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (topic: Partial<LearningTopic>) => void;
  onUpdate?: (id: string, topic: Partial<LearningTopic>) => void;
  initialTopic?: LearningTopic | null;
}

export const LearningModal: React.FC<LearningModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onUpdate,
  initialTopic
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Not Started');
  const [currentModule, setCurrentModule] = useState('');
  const [nextModule, setNextModule] = useState('');
  const [notes, setNotes] = useState('');
  const [resources, setResources] = useState<LearningResource[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (initialTopic) {
        setTitle(initialTopic.title || '');
        setDescription(initialTopic.description || '');
        setCategory(initialTopic.category || '');
        setPriority(initialTopic.priority || 'Medium');
        setProgress(initialTopic.progress || 0);
        setStatus(initialTopic.status || 'Not Started');
        setCurrentModule(initialTopic.current_module || '');
        setNextModule(initialTopic.next_module || '');
        setNotes(initialTopic.notes || '');
        setResources(initialTopic.resources || []);
      } else {
        setTitle('');
        setDescription('');
        setCategory('');
        setPriority('Medium');
        setProgress(0);
        setStatus('Not Started');
        setCurrentModule('');
        setNextModule('');
        setNotes('');
        setResources([]);
      }
    }
  }, [isOpen, initialTopic]);

  if (!isOpen) return null;

  const handleAddResource = () => {
    setResources([...resources, { title: '', url: '' }]);
  };

  const handleUpdateResource = (index: number, field: keyof LearningResource, value: string) => {
    const newResources = [...resources];
    newResources[index] = { ...newResources[index], [field]: value };
    setResources(newResources);
  };

  const handleRemoveResource = (index: number) => {
    setResources(resources.filter((_, i) => i !== index));
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setProgress(val);
    
    // Auto-update status based on progress
    if (val === 100) setStatus('Completed');
    else if (val === 0) setStatus('Not Started');
    else if (status === 'Not Started' || status === 'Completed') setStatus('Learning');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Filter out empty resources, ensure title falls back to "Resource" if empty
    const validResources = resources.filter(r => r.url.trim()).map(r => ({
      ...r,
      title: r.title.trim() || 'Resource'
    }));

    const topicData: Partial<LearningTopic> = {
      title,
      description,
      category,
      priority,
      progress,
      status,
      current_module: currentModule,
      next_module: nextModule,
      notes,
      resources: validResources,
    };

    if (initialTopic && onUpdate) {
      onUpdate(initialTopic.id, topicData);
    } else if (onSave) {
      onSave(topicData);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-border bg-surface-elevated/50 flex-shrink-0">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            {initialTopic ? 'Edit Learning Topic' : 'Add Learning Topic'}
          </h2>
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-cyan mb-1">Topic Name</label>
              <input 
                type="text" value={title} onChange={e => setTitle(e.target.value)} required
                placeholder="e.g. Machine Learning, React, Go..." 
                className="w-full bg-surface border border-border rounded-xl py-2 px-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-text-cyan mb-1">Description</label>
              <textarea 
                value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Briefly describe what you want to learn..." rows={2}
                className="w-full bg-surface border border-border rounded-xl py-2 px-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-cyan mb-1">Category (Optional)</label>
                <input 
                  type="text" value={category} onChange={e => setCategory(e.target.value)}
                  placeholder="e.g. Programming" 
                  className="w-full bg-surface border border-border rounded-xl py-2 px-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-cyan mb-1">Priority</label>
                <select 
                  value={priority} onChange={e => setPriority(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl py-2 px-3 text-sm text-text-primary focus:outline-none focus:border-primary"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
          </div>

          {/* Progress & Status */}
          <div className="p-4 rounded-xl border border-border bg-surface-elevated/30 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              Progress & Status
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-text-cyan mb-2">
                  Progress: {progress}%
                </label>
                <input 
                  type="range" min="0" max="100" step="5"
                  value={progress} onChange={handleProgressChange}
                  className="w-full accent-primary h-2 bg-surface border border-border rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-text-cyan mb-1">Status</label>
                <select 
                  value={status} onChange={e => setStatus(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl py-2 px-3 text-sm text-text-primary focus:outline-none focus:border-primary"
                >
                  <option value="Not Started">Not Started</option>
                  <option value="Learning">Learning Now</option>
                  <option value="Paused">Paused</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Modules */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-cyan mb-1">Current Module/Topic</label>
              <input 
                type="text" value={currentModule} onChange={e => setCurrentModule(e.target.value)}
                placeholder="e.g. Hooks in React" 
                className="w-full bg-surface border border-border rounded-xl py-2 px-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-cyan mb-1">Next Module/Topic</label>
              <input 
                type="text" value={nextModule} onChange={e => setNextModule(e.target.value)}
                placeholder="e.g. Context API" 
                className="w-full bg-surface border border-border rounded-xl py-2 px-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          
          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-text-cyan mb-1 flex items-center gap-1"><FileText className="w-3 h-3" /> Notes</label>
            <textarea 
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Jot down important concepts or ideas..." rows={3}
              className="w-full bg-surface border border-border rounded-xl py-2 px-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          {/* Resources */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-medium text-text-cyan flex items-center gap-1"><LinkIcon className="w-3 h-3" /> Resources</label>
              <button 
                type="button" onClick={handleAddResource}
                className="text-xs text-primary hover:text-primary-hover flex items-center gap-1 font-medium transition-colors"
              >
                <Plus className="w-3 h-3" /> Add Resource
              </button>
            </div>
            
            {resources.length === 0 ? (
              <div className="text-center py-4 border border-dashed border-border rounded-xl bg-surface-elevated/20">
                <p className="text-xs text-text-muted">No resources added. Add links to courses, docs, or books.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {resources.map((res, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input 
                        type="text" value={res.title} onChange={e => handleUpdateResource(index, 'title', e.target.value)}
                        placeholder="Resource Title" 
                        className="w-full bg-surface border border-border rounded-lg py-1.5 px-3 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-primary"
                      />
                      <input 
                        type="url" value={res.url} onChange={e => handleUpdateResource(index, 'url', e.target.value)}
                        placeholder="https://..." 
                        className="w-full bg-surface border border-border rounded-lg py-1.5 px-3 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-primary"
                      />
                    </div>
                    <button 
                      type="button" onClick={() => handleRemoveResource(index)}
                      className="p-1.5 text-text-muted hover:text-error transition-colors mt-0.5 bg-surface border border-border rounded-lg hover:border-error/50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-3 flex-shrink-0">
            <button 
              type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-xl shadow-glow hover:bg-primary-hover transition-all"
            >
              {initialTopic ? 'Save Changes' : 'Add Topic'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
