import React, { useState, useEffect } from 'react';
import { Target, Plus, Check } from 'lucide-react';
import { cn } from '../lib/utils';

const Goals = () => {
  const [goals, setGoals] = useState<{id: string, title: string, completed: boolean}[]>([]);
  const [newGoal, setNewGoal] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('lifeos_goals');
    if (saved) setGoals(JSON.parse(saved));
  }, []);

  const saveGoals = (newGoals: any) => {
    setGoals(newGoals);
    localStorage.setItem('lifeos_goals', JSON.stringify(newGoals));
  };

  const addGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.trim()) return;
    saveGoals([...goals, { id: Date.now().toString(), title: newGoal, completed: false }]);
    setNewGoal('');
  };

  const toggleGoal = (id: string) => {
    saveGoals(goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-12">
      <h1 className="text-2xl font-bold text-gray-100">Goals & Habits</h1>
      
      <div className="glass-card p-6 flex flex-col gap-6 max-w-2xl">
        <form onSubmit={addGoal} className="flex gap-3">
          <input 
            type="text" 
            value={newGoal} 
            onChange={e => setNewGoal(e.target.value)} 
            placeholder="What is your new goal?"
            className="flex-1 bg-surfaceHighlight border border-border rounded-xl px-4 py-2 text-sm text-gray-100 focus:outline-none focus:border-primary"
          />
          <button type="submit" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Goal
          </button>
        </form>

        <div className="space-y-2">
          {goals.map(goal => (
            <div key={goal.id} className="flex items-center gap-3 p-3 bg-surfaceHighlight/50 border border-border/50 rounded-xl">
              <button 
                onClick={() => toggleGoal(goal.id)}
                className={cn("w-5 h-5 rounded-full border flex items-center justify-center transition-colors", goal.completed ? "bg-accent border-accent text-background" : "border-gray-500")}
              >
                {goal.completed && <Check className="w-3 h-3" strokeWidth={3} />}
              </button>
              <span className={cn("text-sm font-medium", goal.completed ? "text-gray-500 line-through" : "text-gray-100")}>
                {goal.title}
              </span>
            </div>
          ))}
          {goals.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">No goals added yet. Set your sights high!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Goals;
