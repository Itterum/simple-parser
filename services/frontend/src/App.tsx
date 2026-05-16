import React, { useState, useEffect } from 'react';
import { 
  Play, RefreshCcw, Undo2, Trash2, 
  Eye, List, Clock, CheckCircle2, AlertTriangle, 
  Sun, Moon, X, Loader2
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Task, DashboardData } from './types';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('theme') as any) || 'light'
  );
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDashboard = async () => {
    try {
      const resp = await fetch('/api/dashboard');
      if (resp.status === 401) {
        window.location.href = '/login';
        return;
      }
      const json = await resp.json();
      setData(json);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const apiAction = async (path: string, method = 'POST', body?: any) => {
    setLoading(true);
    try {
      const resp = await fetch(path, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = await resp.json();
      if (resp.ok) {
        toast.success(result.message || 'Action completed');
        fetchDashboard();
      } else {
        toast.error(result.error || 'Action failed');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (!data) return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Toaster position="bottom-center" />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-medium tracking-tight">Parser Dashboard</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Material 3 React Edition</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="w-px h-6 bg-slate-300 dark:bg-slate-700" />
            <div className="flex items-center gap-4">
              <span className="font-medium text-sm">{data.username}</span>
              <button 
                onClick={() => apiAction('/api/logout')}
                className="text-red-500 hover:text-red-600 font-bold text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard label="Total" value={data.metrics.total_tasks} icon={<List size={18}/>} />
          <MetricCard 
            label="Pending" 
            value={data.metrics.pending_tasks} 
            icon={<Clock size={18}/>} 
            className="bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100"
          />
          <MetricCard 
            label="Success" 
            value={data.metrics.completed_tasks} 
            icon={<CheckCircle2 size={18}/>} 
            className="bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100"
          />
          <MetricCard 
            label="Failed" 
            value={data.metrics.failed_tasks} 
            icon={<AlertTriangle size={18}/>} 
            className="bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button variant="primary" onClick={() => apiAction('/api/run')} disabled={loading}>
            <Play size={18} /> Run Tasks
          </Button>
          <Button variant="tonal" onClick={() => apiAction('/api/sync')} disabled={loading}>
            <RefreshCcw size={18} /> Sync Config
          </Button>
          <Button variant="tonal" onClick={() => apiAction('/api/reset-failed')} disabled={loading}>
            <Undo2 size={18} /> Reset Errors
          </Button>
        </div>

        {/* Table */}
        <div className="bg-slate-100 dark:bg-slate-900 rounded-[28px] overflow-hidden border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-6 py-4">Task</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Updated</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {data.tasks.map(task => (
                <tr key={task.id} className="hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold">{task.task_key}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{task.extractor_name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={task.status} />
                  </td>
                  <td className="px-6 py-4">
                    {task.result ? (
                      <button 
                        onClick={() => setSelectedTask(task)}
                        className="text-blue-600 dark:text-blue-400 font-semibold text-sm hover:underline flex items-center gap-1"
                      >
                        <Eye size={14}/> View JSON
                      </button>
                    ) : <span className="italic text-slate-400 text-sm">No data</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                    {new Date(task.updated_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setDeleteTask(task)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {data.tasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                    No tasks found. Sync config or add tasks manually.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Panel */}
      <SidePanel 
        open={!!selectedTask} 
        onClose={() => setSelectedTask(null)} 
        title={selectedTask?.task_key || ''}
      >
        {selectedTask && (
          <pre className="bg-slate-100 dark:bg-slate-800 p-5 rounded-2xl font-mono text-xs overflow-auto h-full border border-slate-200 dark:border-slate-700">
            {JSON.stringify(selectedTask.result, null, 2)}
          </pre>
        )}
      </SidePanel>

      {/* Delete Modal */}
      {deleteTask && (
        <Dialog 
          onClose={() => setDeleteTask(null)}
          onConfirm={() => {
            apiAction(`/api/delete?id=${deleteTask.id}`, 'POST');
            setDeleteTask(null);
          }}
          title="Delete Task?"
          description={`Are you sure you want to delete ${deleteTask.task_key}? This cannot be undone.`}
        />
      )}
    </div>
  );
}

// Sub-components
function MetricCard({ label, value, icon, className }: { label: string, value: number, icon: React.ReactNode, className?: string }) {
  return (
    <div className={cn("bg-slate-100 dark:bg-slate-900 p-6 rounded-[28px] flex flex-col gap-1", className)}>
      <div className="flex items-center gap-2 text-sm font-medium opacity-80">
        {icon} {label}
      </div>
      <div className="text-4xl font-light leading-none mt-1">{value}</div>
    </div>
  );
}

function Button({ children, variant = 'tonal', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'tonal' }) {
  return (
    <button 
      {...props}
      className={cn(
        "px-6 h-10 rounded-full font-medium text-sm flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50",
        variant === 'primary' ? "bg-blue-600 text-white shadow-sm hover:brightness-110" : "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-700",
        props.className
      )}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800",
    processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 border-blue-200 dark:border-blue-800",
    completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 border-green-200 dark:border-green-800",
    failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 border-red-200 dark:border-red-800",
  }[status] || "";

  return (
    <span className={cn("px-3 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 w-fit uppercase tracking-tight", styles)}>
      {status === 'processing' && <Loader2 size={12} className="animate-spin" />}
      {status}
    </span>
  );
}

function SidePanel({ open, onClose, title, children }: { open: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  return (
    <>
      <div 
        className={cn("fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000] transition-opacity duration-300", open ? "opacity-100" : "opacity-0 pointer-events-none")}
        onClick={onClose}
      />
      <div className={cn(
        "fixed top-0 right-0 bottom-0 w-full max-w-xl bg-slate-50 dark:bg-slate-900 z-[1100] shadow-2xl transition-transform duration-300 ease-in-out border-l border-slate-200 dark:border-slate-800 flex flex-col",
        open ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 flex-1 overflow-hidden">{children}</div>
      </div>
    </>
  );
}

function Dialog({ onClose, onConfirm, title, description }: { onClose: () => void, onConfirm: () => void, title: string, description: string }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
      <div className="bg-slate-100 dark:bg-slate-900 p-8 rounded-[32px] w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 text-center md:text-left">
        <h2 className="text-2xl font-semibold mb-2">{title}</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8">{description}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 font-bold hover:underline">Cancel</button>
          <button 
            onClick={onConfirm}
            className="px-6 py-2 bg-red-600 text-white rounded-full font-bold hover:bg-red-700 active:scale-95 transition-all"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
