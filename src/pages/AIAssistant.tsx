import React, { useState } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { cn } from '../lib/utils';

const AIAssistant = () => {
  const [messages, setMessages] = useState([
    { id: '1', role: 'ai', content: "Hello! I'm your Life OS AI Assistant. How can I help you manage your tasks and routines today?" }
  ]);
  const [input, setInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Mock AI response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'ai', 
        content: "I've noted that down! While I'm just a mock interface right now, in the future I'll be able to automatically schedule tasks and organize your Life OS based on your input." 
      }]);
    }, 1000);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto min-h-[500px] md:h-[calc(100vh-8rem)] pb-6">
      <div className="flex items-center gap-3 border-b border-border/50 pb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-cyan flex items-center justify-center shadow-glow">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">AI Assistant</h1>
          <p className="text-xs text-primary">Online</p>
        </div>
      </div>

      <div className="glass-card flex-1 flex flex-col overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-4 max-w-2xl", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1", msg.role === 'user' ? "bg-surface-elevated" : "bg-primary/20 text-primary")}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-text-cyan" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={cn("p-4 rounded-2xl", msg.role === 'user' ? "bg-primary/20 border border-primary/30 text-text-primary" : "bg-surface-elevated border border-border/50 text-text-cyan")}>
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} className="p-4 bg-surface-elevated/30 border-t border-border/50 flex gap-3">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
          />
          <button type="submit" className="btn-primary flex items-center justify-center w-12 h-12 rounded-xl shrink-0 p-0">
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIAssistant;
