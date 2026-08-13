import { useState, useMemo } from 'react';
import { useLearning } from '../lib/useLearning';
import type { LearningTopic } from '../lib/useLearning';
import { useDeleteModal } from '../contexts/DeleteModalContext';
import { LearningModal } from '../components/LearningModal';
import { useTasks } from '../lib/useTasks';
import { BookOpen, Plus, Search, CheckCircle, Clock, Book, AlertCircle, ArrowRight, Play, MoreVertical, Trash2, Edit2, Zap, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

const Learning = () => {
  const { topics, loading, addTopic, updateTopic, deleteTopic } = useLearning();
  const { addTask } = useTasks();
  const { confirmDelete } = useDeleteModal();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'All' | 'Learning Now' | 'Up Next' | 'Explore' | 'Completed'>('All');
  const [sortBy, setSortBy] = useState<'Default' | 'Priority' | 'Progress' | 'Recently Studied' | 'Alphabetical'>('Default');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<LearningTopic | null>(null);
  
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const handleOpenAddModal = () => {
    setEditingTopic(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (topic: LearningTopic) => {
    setEditingTopic(topic);
    setIsModalOpen(true);
    setMenuOpenId(null);
  };

  const handleDelete = (topic: LearningTopic) => {
    setMenuOpenId(null);
    confirmDelete(`learning topic "${topic.title}"`, () => {
      deleteTopic(topic.id);
    });
  };

  const handleCreateTask = async (topic: LearningTopic) => {
    setMenuOpenId(null);
    await addTask({
      title: `Study ${topic.title}`,
      description: topic.current_module ? `Focus on: ${topic.current_module}` : '',
      category: 'Learning',
      priority: topic.priority,
      estimated_minutes: 60,
      date: format(new Date(), 'yyyy-MM-dd')
    });
    alert(`Task created: Study ${topic.title}`);
  };

  const handleContinueLearning = async (topic: LearningTopic) => {
    await updateTopic(topic.id, { 
      status: 'Learning',
      last_studied_at: new Date().toISOString() 
    });
    if (topic.status !== 'Learning') {
      // Just visually open edit modal if they want to update progress immediately
      handleOpenEditModal(topic);
    } else {
       handleOpenEditModal(topic);
    }
  };

  const filteredAndSortedTopics = useMemo(() => {
    let result = topics.filter(t => 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filter !== 'All') {
      if (filter === 'Learning Now') result = result.filter(t => t.status === 'Learning');
      else if (filter === 'Completed') result = result.filter(t => t.status === 'Completed');
      else if (filter === 'Up Next') result = result.filter(t => t.status === 'Not Started' && t.priority !== 'Low');
      else if (filter === 'Explore') result = result.filter(t => t.status === 'Not Started' && t.priority === 'Low');
    }

    result.sort((a, b) => {
      if (sortBy === 'Priority') {
        const priorityOrder: Record<string, number> = { high: 1, medium: 2, low: 3 };
        return (priorityOrder[a.priority?.toLowerCase() || 'medium'] || 2) - (priorityOrder[b.priority?.toLowerCase() || 'medium'] || 2);
      }
      if (sortBy === 'Progress') return b.progress - a.progress;
      if (sortBy === 'Alphabetical') return a.title.localeCompare(b.title);
      if (sortBy === 'Recently Studied') {
        return new Date(b.last_studied_at || 0).getTime() - new Date(a.last_studied_at || 0).getTime();
      }
      // Default sorting: Learning -> Not Started -> Paused -> Completed
      const statusOrder: Record<string, number> = { 'Learning': 1, 'Not Started': 2, 'Paused': 3, 'Completed': 4 };
      const sA = statusOrder[a.status] || 5;
      const sB = statusOrder[b.status] || 5;
      if (sA !== sB) return sA - sB;
      return b.progress - a.progress;
    });

    return result;
  }, [topics, searchQuery, filter, sortBy]);

  const learningNow = filteredAndSortedTopics.filter(t => t.status === 'Learning');
  const upNext = filteredAndSortedTopics.filter(t => t.status === 'Not Started' && t.priority !== 'Low');
  const explore = filteredAndSortedTopics.filter(t => t.status === 'Not Started' && t.priority === 'Low');
  const completed = filteredAndSortedTopics.filter(t => t.status === 'Completed');
  const paused = filteredAndSortedTopics.filter(t => t.status === 'Paused');

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-error/20 text-error border-error/30';
      case 'medium': return 'bg-warning/20 text-warning border-warning/30';
      case 'low': return 'bg-success/20 text-success border-success/30';
      default: return 'bg-surface border-border text-text-muted';
    }
  };

  const TopicCard = ({ topic }: { topic: LearningTopic }) => (
    <div className="glass-card p-5 relative group flex flex-col h-full border border-border/50 hover:border-primary/50 transition-all duration-300">
      <div className="absolute top-4 right-4">
        <button 
          onClick={() => setMenuOpenId(menuOpenId === topic.id ? null : topic.id)}
          className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-surface transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        
        {menuOpenId === topic.id && (
          <div className="absolute right-0 mt-1 w-48 bg-surface-elevated border border-border rounded-xl shadow-xl z-20 py-1 animate-in fade-in zoom-in-95 duration-100">
            <button 
              onClick={() => handleOpenEditModal(topic)}
              className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-surface flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" /> Edit Topic
            </button>
            <button 
              onClick={() => handleCreateTask(topic)}
              className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-surface flex items-center gap-2"
            >
              <Zap className="w-4 h-4" /> Create Study Task
            </button>
            <button 
              onClick={() => handleDelete(topic)}
              className="w-full px-4 py-2 text-left text-sm text-error hover:bg-surface flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Delete Topic
            </button>
          </div>
        )}
      </div>

      <div className="mb-4 pr-8">
        <div className="flex flex-wrap gap-2 mb-2">
          {topic.category && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">
              {topic.category}
            </span>
          )}
          <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border", getPriorityColor(topic.priority))}>
            {topic.priority} Priority
          </span>
        </div>
        <h3 className="text-lg font-bold text-text-primary line-clamp-1">{topic.title}</h3>
        {topic.description && (
          <p className="text-sm text-text-muted mt-1 line-clamp-2">{topic.description}</p>
        )}
      </div>

      <div className="mt-auto space-y-4">
        {topic.status !== 'Completed' && (
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-text-muted font-medium">Progress</span>
              <span className="text-primary font-bold">{topic.progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-surface-elevated rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-cyan transition-all duration-500"
                style={{ width: `${topic.progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 text-xs text-text-muted">
          {topic.current_module && (
            <div className="flex items-start gap-2 bg-surface-elevated/30 p-2 rounded-lg border border-border">
              <Play className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-primary font-bold mb-0.5">Currently Learning</span>
                <span className="text-text-primary line-clamp-1">{topic.current_module}</span>
              </div>
            </div>
          )}
          
          {topic.next_module && !topic.current_module && (
            <div className="flex items-start gap-2 bg-surface-elevated/30 p-2 rounded-lg border border-border">
              <ArrowRight className="w-3.5 h-3.5 text-cyan mt-0.5 flex-shrink-0" />
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-cyan font-bold mb-0.5">Next Up</span>
                <span className="text-text-primary line-clamp-1">{topic.next_module}</span>
              </div>
            </div>
          )}
        </div>

        {topic.status !== 'Completed' && (
          <div className="flex gap-2">
            {topic.resources && topic.resources.length > 0 && topic.resources[0].url && (
              <a 
                href={topic.resources[0].url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="py-2 px-3 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5 text-primary flex-shrink-0"
              >
                Source <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button 
              onClick={() => handleContinueLearning(topic)}
              className="flex-1 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {topic.status === 'Learning' ? 'Update Progress' : 'Start Learning'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderSection = (title: string, icon: any, data: LearningTopic[], emptyMessage: string) => {
    if (data.length === 0 && filter === 'All') return null;
    if (data.length === 0 && filter !== 'All') return (
      <div className="text-center py-12">
        <p className="text-text-muted">{emptyMessage}</p>
      </div>
    );

    const Icon = icon;

    return (
      <div className="space-y-4 mb-8">
        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary" /> {title}
          <span className="text-xs font-medium bg-surface px-2 py-0.5 rounded-full border border-border text-text-muted">
            {data.length}
          </span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map(topic => <TopicCard key={topic.id} topic={topic} />)}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-12">
        <div className="max-w-6xl mx-auto space-y-6">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-primary" />
                Learning Hub
              </h1>
              <p className="text-text-muted mt-1">Track what you're learning, prioritize topics, and save resources.</p>
            </div>
            
            <button 
              onClick={handleOpenAddModal}
              className="w-full sm:w-auto px-4 py-2.5 bg-primary text-white rounded-xl font-semibold shadow-glow hover:bg-primary-hover transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> Add Topic
            </button>
          </div>

          <div className="glass-card p-4 flex flex-col md:flex-row gap-4 items-center justify-between border border-border/50">
            <div className="relative w-full md:w-1/3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input 
                type="text" 
                placeholder="Search topics..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl py-2 pl-9 pr-4 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            
            <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
              <div className="flex bg-surface rounded-xl p-1 border border-border overflow-x-auto">
                {['All', 'Learning Now', 'Up Next', 'Explore', 'Completed'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f as any)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap",
                      filter === f ? "bg-primary text-white shadow-glow" : "text-text-muted hover:text-text-primary"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
              
              <select 
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-surface border border-border rounded-xl py-1.5 px-3 text-xs font-medium text-text-primary focus:outline-none focus:border-primary"
              >
                <option value="Default">Default Sort</option>
                <option value="Priority">By Priority</option>
                <option value="Progress">By Progress</option>
                <option value="Recently Studied">Recently Studied</option>
                <option value="Alphabetical">Alphabetical</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2 pb-12">
              {renderSection('Learning Now', Play, learningNow, "You aren't currently learning any topics.")}
              {renderSection('Up Next', Clock, upNext, "No high/medium priority topics waiting.")}
              {renderSection('Explore', Book, explore, "No low priority topics to explore.")}
              {renderSection('Paused', AlertCircle, paused, "No paused topics.")}
              {renderSection('Completed', CheckCircle, completed, "No completed topics yet.")}
              
              {topics.length === 0 && !searchQuery && filter === 'All' && (
                <div className="text-center py-16 px-4 glass-card border-dashed border-border/50">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary mb-2">Your Learning Hub is empty</h3>
                  <p className="text-text-muted max-w-md mx-auto mb-6">
                    Start tracking your educational journey. Add skills, languages, or tools you want to master.
                  </p>
                  <button 
                    onClick={handleOpenAddModal}
                    className="px-6 py-2.5 bg-primary text-white rounded-xl font-semibold shadow-glow hover:bg-primary-hover transition-all inline-flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" /> Add Your First Topic
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      <LearningModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialTopic={editingTopic}
        onSave={addTopic}
        onUpdate={updateTopic}
      />
    </div>
  );
};

export default Learning;
