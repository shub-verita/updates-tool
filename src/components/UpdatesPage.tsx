"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, ChevronLeft, ChevronRight, ChevronDown, Trash2, Loader2, Check, X, Pencil, Calendar, Users, Layers, MoreHorizontal, UserPlus, MessageCircle, Send } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  color: string;
  slackUserId?: string | null;
}

interface Project {
  id: string;
  name: string;
  color: string;
}

interface Task {
  id: string;
  description: string;
  status: string;
  projectId: string;
  dueDate: string | null;
  user: TeamMember;
  project: Project;
  isCarriedOver?: boolean;
}

interface ParsedTask {
  description: string;
  project: string;
  status: string;
  mentioned_people: string[];
  due_date: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  done: { label: "Done", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
  in_progress: { label: "In Progress", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  todo: { label: "Todo", color: "text-slate-500", bg: "bg-slate-50 border-slate-200" },
  blocked: { label: "Blocked", color: "text-red-600", bg: "bg-red-50 border-red-200" },
};

const STATUS_OPTIONS = ["todo", "in_progress", "done", "blocked"];

const COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#78716c", "#64748b", "#475569",
];

function formatDateForAPI(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDisplayDate(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  const diff = Math.round((compareDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
}

function formatDueDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((new Date(date).setHours(0,0,0,0) - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 0) return `${Math.abs(diff)}d ago`;
  if (diff <= 7) return `${diff}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Task Row
function TaskRow({
  task, projects, onUpdate, onDelete, showUser,
}: {
  task: Task;
  projects: Project[];
  onUpdate: (id: string, data: Partial<Task> & { dueDate?: string | null }) => Promise<void>;
  onDelete: (id: string) => void;
  showUser: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(task.description);
  const [status, setStatus] = useState(task.status);
  const [projectId, setProjectId] = useState(task.projectId);
  const [dueDate, setDueDate] = useState(task.dueDate?.split("T")[0] || "");
  const [saving, setSaving] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;

  const save = async () => {
    setSaving(true);
    await onUpdate(task.id, { description: desc, status, projectId, dueDate: dueDate || null });
    setSaving(false);
    setEditing(false);
  };

  const cancel = () => {
    setDesc(task.description);
    setStatus(task.status);
    setProjectId(task.projectId);
    setDueDate(task.dueDate?.split("T")[0] || "");
    setEditing(false);
  };

  const cycleStatus = async () => {
    setStatusLoading(true);
    const next = STATUS_OPTIONS[(STATUS_OPTIONS.indexOf(task.status) + 1) % STATUS_OPTIONS.length];
    await onUpdate(task.id, { status: next });
    setStatusLoading(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(task.id);
  };

  if (editing) {
    return (
      <div className="px-2.5 py-2 bg-slate-50 space-y-1.5">
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full px-2 py-1 text-[12px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-slate-400"
          autoFocus
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-1.5 py-0.5 text-[11px] border border-slate-200 rounded bg-white">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
          </select>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="px-1.5 py-0.5 text-[11px] border border-slate-200 rounded bg-white">
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="px-1.5 py-0.5 text-[11px] border border-slate-200 rounded" />
          <div className="flex-1" />
          <button onClick={cancel} className="px-2 py-0.5 text-[11px] text-slate-500 hover:text-slate-700">Cancel</button>
          <button onClick={save} disabled={saving} className="px-2 py-0.5 text-[11px] bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50">
            {saving ? "..." : "Save"}
          </button>
        </div>
      </div>
    );
  }

  const due = formatDueDate(task.dueDate);

  return (
    <div className={`group flex items-start gap-2 px-2.5 py-1.5 hover:bg-slate-50 transition-all duration-150 ${deleting ? "opacity-50 scale-95" : ""}`}>
      {/* Status */}
      <button
        onClick={cycleStatus}
        disabled={statusLoading}
        className={`shrink-0 mt-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded ${statusConfig.bg} ${statusConfig.color} hover:opacity-80 active:scale-95 transition-all duration-150 disabled:opacity-50 flex items-center gap-0.5`}
      >
        {statusLoading && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
        {statusConfig.label}
      </button>

      {/* Description */}
      <p className="flex-1 text-[13px] text-slate-700 leading-snug min-w-0">{task.description}</p>

      {/* Meta + Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
        {task.isCarriedOver && (
          <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
            ↩ Yesterday
          </span>
        )}
        {showUser && <span className="text-[10px] text-slate-500 bg-slate-100 px-1 py-0.5 rounded">{task.user.name}</span>}
        <span className="text-[10px] text-slate-400">{task.project.name}</span>
        {due && <span className="text-[10px] text-orange-500">{due}</span>}
        <button onClick={() => setEditing(true)} className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-all">
          <Pencil className="w-3 h-3" />
        </button>
        <button onClick={handleDelete} disabled={deleting} className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 transition-all disabled:opacity-50">
          {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}

// Person/Project Card
function GroupCard({
  id, name, color, tasks, projects, onUpdate, onDelete, onAddTask, showUser, onTitleClick,
}: {
  id: string;
  name: string;
  color: string;
  tasks: Task[];
  projects: Project[];
  onUpdate: (id: string, data: Partial<Task> & { dueDate?: string | null }) => Promise<void>;
  onDelete: (id: string) => void;
  onAddTask: (userId: string, projectId: string, description: string) => Promise<void>;
  showUser: boolean;
  onTitleClick?: () => void;
}) {
  const [newTask, setNewTask] = useState("");
  const [selectedProject, setSelectedProject] = useState(projects[0]?.id || "");
  const [adding, setAdding] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const tasksRef = useRef<HTMLDivElement>(null);

  const done = tasks.filter((t) => t.status === "done").length;
  const progress = tasks.length > 0 ? (done / tasks.length) * 100 : 0;
  const hasOverflow = tasks.length > 5;

  // Check scroll position
  useEffect(() => {
    const el = tasksRef.current;
    if (!el) return;
    const checkScroll = () => {
      const isScrollable = el.scrollHeight > el.clientHeight;
      setShowScrollHint(isScrollable);
      setIsAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 2);
    };
    checkScroll();
    el.addEventListener("scroll", checkScroll);
    return () => el.removeEventListener("scroll", checkScroll);
  }, [tasks]);

  // In people view: id = userId, need to pick project
  // In projects view: id = projectId, need to pick user (use first task's user)
  const canAdd = !showUser || tasks.length > 0;

  const handleAdd = async () => {
    if (!newTask.trim() || !canAdd) return;
    setAdding(true);
    const userId = showUser ? tasks[0].user.id : id;
    const projectId = showUser ? id : selectedProject;
    await onAddTask(userId, projectId, newTask.trim());
    setNewTask("");
    setAdding(false);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
        <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: color }} />
        {onTitleClick ? (
          <button
            onClick={onTitleClick}
            className="flex-1 font-medium text-slate-900 text-[13px] truncate text-left hover:text-slate-600 transition-colors cursor-pointer"
          >
            {name}
          </button>
        ) : (
          <h3 className="flex-1 font-medium text-slate-900 text-[13px] truncate">{name}</h3>
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-[10px] text-slate-400 tabular-nums">{done}/{tasks.length}</span>
        </div>
      </div>

      {/* Tasks */}
      <div className="relative">
        <div ref={tasksRef} className={`divide-y divide-slate-50 overflow-y-auto ${hasOverflow ? "max-h-[180px]" : ""}`}>
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} projects={projects} onUpdate={onUpdate} onDelete={onDelete} showUser={showUser} />
          ))}
        </div>
        {/* Scroll hint gradient */}
        {showScrollHint && !isAtBottom && (
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none flex items-end justify-center pb-0.5">
            <ChevronDown className="w-3 h-3 text-slate-300 animate-bounce" />
          </div>
        )}
      </div>

      {/* Quick Add */}
      {canAdd && (
        <div className="border-t border-slate-100 px-2 py-1.5">
          <div className="flex items-center gap-1">
            {!showUser && (
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="px-1.5 py-1 text-[11px] bg-slate-50 border-0 rounded text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
              >
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Add task..."
              className="flex-1 min-w-0 px-2 py-1 text-[12px] bg-slate-50 border-0 rounded focus:outline-none focus:ring-1 focus:ring-slate-300 placeholder:text-slate-400"
            />
            <button
              onClick={handleAdd}
              disabled={!newTask.trim() || adding}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 transition-all"
            >
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function UpdatesPage() {
  const [view, setView] = useState<"people" | "projects">("people");
  const [date, setDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [carriedTasks, setCarriedTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const dateRef = useRef<HTMLInputElement>(null);

  // Modals
  const [showPost, setShowPost] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const [postStep, setPostStep] = useState<"input" | "review">("input");
  const [postUser, setPostUser] = useState("");
  const [postText, setPostText] = useState("");
  const [postDate, setPostDate] = useState(formatDateForAPI(new Date()));
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Team management
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [newSlackId, setNewSlackId] = useState("");

  // Project detail modal
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Chat bot
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "bot"; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMembers();
    fetch("/api/projects").then((r) => r.json()).then(setProjects);
  }, []);

  // Helper to check if a given date is tomorrow
  const checkIfTomorrow = (checkDate: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const selectedDate = new Date(checkDate);
    selectedDate.setHours(0, 0, 0, 0);
    return selectedDate.getTime() === tomorrow.getTime();
  };

  // For use outside useEffect (uses current date state)
  const isViewingTomorrow = () => checkIfTomorrow(date);

  // Fetch carried tasks (yesterday's incomplete tasks when viewing tomorrow)
  const fetchCarriedTasks = async () => {
    if (!isViewingTomorrow()) {
      setCarriedTasks([]);
      return;
    }
    const today = new Date();
    const todayStr = formatDateForAPI(today);
    try {
      const res = await fetch(`/api/tasks?date=${todayStr}`);
      const data = await res.json();
      const incomplete = (Array.isArray(data) ? data : []).filter(
        (t: Task) => t.status !== "done"
      );
      setCarriedTasks(incomplete);
    } catch {
      setCarriedTasks([]);
    }
  };

  useEffect(() => {
    const isTomorrow = checkIfTomorrow(date);
    setLoading(true);
    Promise.all([
      fetch(`/api/tasks?date=${formatDateForAPI(date)}`).then((r) => r.json()),
      isTomorrow
        ? fetch(`/api/tasks?date=${formatDateForAPI(new Date())}`).then((r) => r.json())
        : Promise.resolve([]),
    ])
      .then(([tasksData, carriedData]) => {
        setTasks(Array.isArray(tasksData) ? tasksData : []);
        if (isTomorrow) {
          const incomplete = (Array.isArray(carriedData) ? carriedData : []).filter(
            (t: Task) => t.status !== "done"
          );
          setCarriedTasks(incomplete);
        } else {
          setCarriedTasks([]);
        }
      })
      .finally(() => setLoading(false));
  }, [date]);

  const fetchMembers = () => fetch("/api/team-members").then((r) => r.json()).then(setMembers);

  const refreshTasks = () => fetch(`/api/tasks?date=${formatDateForAPI(date)}`).then((r) => r.json()).then((d) => setTasks(Array.isArray(d) ? d : []));

  const refreshCarriedTasks = async () => {
    if (!isViewingTomorrow()) {
      setCarriedTasks([]);
      return;
    }
    const today = new Date();
    const todayStr = formatDateForAPI(today);
    try {
      const res = await fetch(`/api/tasks?date=${todayStr}`);
      const data = await res.json();
      const incomplete = (Array.isArray(data) ? data : []).filter(
        (t: Task) => t.status !== "done"
      );
      setCarriedTasks(incomplete);
    } catch {
      setCarriedTasks([]);
    }
  };

  const updateTask = async (id: string, data: Partial<Task> & { dueDate?: string | null }) => {
    await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    // Refresh both current tasks and carried tasks for real-time sync
    await Promise.all([refreshTasks(), refreshCarriedTasks()]);
  };

  const deleteTask = async (id: string) => {
    if (!window.confirm("Delete this task?")) return;
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    setTasks((t) => t.filter((x) => x.id !== id));
    setCarriedTasks((t) => t.filter((x) => x.id !== id));
  };

  const addTask = async (userId: string, projectId: string, description: string) => {
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, projectId, description, date: formatDateForAPI(date) }),
    });
    await Promise.all([refreshTasks(), refreshCarriedTasks()]);
  };

  const parse = async () => {
    if (!postText.trim() || !postUser) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rawText: postText }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setParsedTasks(data.tasks);
      setPostStep("review");
    } catch {
      setError("Failed to parse");
    }
    setSubmitting(false);
  };

  const confirm = async () => {
    setSubmitting(true);
    try {
      await fetch("/api/updates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: postUser, rawText: postText, tasks: parsedTasks, date: postDate }) });
      // Update the view to show the posted date
      const [y, m, d] = postDate.split("-").map(Number);
      setDate(new Date(y, m - 1, d));
      refreshTasks();
      closePost();
    } catch {
      setError("Failed to save");
    }
    setSubmitting(false);
  };

  const closePost = () => {
    setShowPost(false);
    setPostStep("input");
    setPostUser("");
    setPostText("");
    setPostDate(formatDateForAPI(new Date()));
    setParsedTasks([]);
    setError("");
  };

  const addMember = async () => {
    if (!newName.trim()) return;
    await fetch("/api/team-members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName.trim(), color: newColor, slackUserId: newSlackId.trim() || null }) });
    setNewName("");
    setNewColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
    setNewSlackId("");
    fetchMembers();
  };

  const updateMember = async () => {
    if (!editingMember || !newName.trim()) return;
    await fetch(`/api/team-members/${editingMember.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName.trim(), color: newColor, slackUserId: newSlackId.trim() || null }) });
    setEditingMember(null);
    setNewName("");
    setNewSlackId("");
    fetchMembers();
  };

  const deleteMember = async (id: string) => {
    if (!window.confirm("Delete this teammate? Their tasks will remain.")) return;
    await fetch(`/api/team-members/${id}`, { method: "DELETE" });
    fetchMembers();
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const question = chatInput.trim();
    setChatInput("");
    setChatMessages((m) => [...m, { role: "user", text: question }]);
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setChatMessages((m) => [...m, { role: "bot", text: data.answer || "Sorry, I couldn't process that." }]);
    } catch {
      setChatMessages((m) => [...m, { role: "bot", text: "Sorry, something went wrong." }]);
    }
    setChatLoading(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  // Merge current tasks with carried tasks (marking carried ones)
  const allTasks: Task[] = [
    ...tasks.map((t) => ({ ...t, isCarriedOver: false })),
    // Only add carried tasks that don't already exist on the current day (by id)
    ...carriedTasks
      .filter((ct) => !tasks.some((t) => t.id === ct.id))
      .map((t) => ({ ...t, isCarriedOver: true })),
  ];

  const grouped = allTasks.reduce((acc, t) => {
    const key = view === "people" ? t.user.id : t.project.id;
    const name = view === "people" ? t.user.name : t.project.name;
    const color = view === "people" ? t.user.color : t.project.color;
    if (!acc[key]) acc[key] = { name, color, tasks: [] };
    acc[key].tasks.push(t);
    return acc;
  }, {} as Record<string, { name: string; color: string; tasks: Task[] }>);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="font-semibold text-slate-900">Verita Updates</h1>
            <nav className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              <button
                onClick={() => setView("people")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all duration-150 active:scale-95 ${view === "people" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
              >
                <Users className="w-4 h-4" /> People
              </button>
              <button
                onClick={() => setView("projects")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all duration-150 active:scale-95 ${view === "projects" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
              >
                <Layers className="w-4 h-4" /> Projects
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Date */}
            <div className="flex items-center bg-slate-100 rounded-lg">
              <button
                onClick={() => setDate((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; })}
                className="p-2 hover:bg-slate-200 active:bg-slate-300 rounded-l-lg transition-all duration-150 active:scale-95"
              >
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </button>
              <button
                onClick={() => dateRef.current?.showPicker()}
                className="px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200 active:bg-slate-300 flex items-center gap-1.5 min-w-[100px] justify-center transition-all duration-150"
              >
                <Calendar className="w-3.5 h-3.5" /> {formatDisplayDate(date)}
              </button>
              <input ref={dateRef} type="date" value={formatDateForAPI(date)} onChange={(e) => { const [y, m, d] = e.target.value.split("-").map(Number); setDate(new Date(y, m - 1, d)); }} className="sr-only" />
              <button
                onClick={() => setDate((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; })}
                className="p-2 hover:bg-slate-200 active:bg-slate-300 rounded-r-lg transition-all duration-150 active:scale-95"
              >
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Team */}
            <button
              onClick={() => setShowTeam(true)}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-all duration-150 active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
            </button>

            {/* New */}
            <button
              onClick={() => setShowPost(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 active:bg-slate-700 transition-all duration-150 active:scale-95"
            >
              <Plus className="w-4 h-4" /> New Update
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Plus className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-500 text-sm">No updates for {formatDisplayDate(date).toLowerCase()}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(grouped)
              .filter(([_, { name }]) => view !== "projects" || name !== "Internal/Individual")
              .map(([k, { name, color, tasks }]) => (
              <GroupCard
                key={k}
                id={k}
                name={name}
                color={color}
                tasks={tasks}
                projects={projects}
                onUpdate={updateTask}
                onDelete={deleteTask}
                onAddTask={addTask}
                showUser={view === "projects"}
                onTitleClick={view === "projects" ? () => setSelectedProjectId(k) : undefined}
              />
            ))}
          </div>
        )}
      </main>

      {/* Team Modal */}
      {showTeam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-150" onClick={() => setShowTeam(false)}>
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl animate-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Manage Team</h2>
              <button onClick={() => setShowTeam(false)} className="p-1.5 hover:bg-slate-100 active:bg-slate-200 rounded-md transition-all duration-150 active:scale-95">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Add/Edit Form */}
              <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={editingMember ? "Edit name..." : "Add teammate..."}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all duration-150"
                  onKeyDown={(e) => e.key === "Enter" && (editingMember ? updateMember() : addMember())}
                />

                {/* Slack User ID */}
                <div>
                  <p className="text-xs text-slate-500 mb-1">Slack User ID (optional)</p>
                  <input
                    value={newSlackId}
                    onChange={(e) => setNewSlackId(e.target.value)}
                    placeholder="U01ABC123DE"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all duration-150"
                  />
                </div>

                {/* Color Grid */}
                <div>
                  <p className="text-xs text-slate-500 mb-2">Select color</p>
                  <div className="grid grid-cols-10 gap-1.5">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewColor(c)}
                        className={`w-7 h-7 rounded-md transition-all duration-150 hover:scale-110 active:scale-95 ${newColor === c ? "ring-2 ring-offset-2 ring-slate-900 scale-110" : "hover:ring-1 hover:ring-slate-300"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2">
                  {editingMember ? (
                    <>
                      <button
                        onClick={updateMember}
                        disabled={!newName.trim()}
                        className="flex-1 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 active:bg-slate-700 disabled:opacity-50 transition-all duration-150 active:scale-[0.98]"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => { setEditingMember(null); setNewName(""); setNewSlackId(""); }}
                        className="px-3 py-2 text-slate-600 text-sm hover:bg-slate-200 active:bg-slate-300 rounded-lg transition-all duration-150"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={addMember}
                      disabled={!newName.trim()}
                      className="flex-1 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 active:bg-slate-700 disabled:opacity-50 transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Add Teammate
                    </button>
                  )}
                </div>
              </div>

              {/* Team List */}
              {members.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 px-1">Team members ({members.length})</p>
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors duration-150">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-medium shadow-sm" style={{ backgroundColor: m.color }}>
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="flex-1 text-sm text-slate-700">{m.name}</span>
                        <button
                          onClick={() => { setEditingMember(m); setNewName(m.name); setNewColor(m.color); setNewSlackId(m.slackUserId || ""); }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:bg-slate-200 rounded-md transition-all duration-150 active:scale-95"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteMember(m.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 active:bg-red-100 rounded-md transition-all duration-150 active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Post Modal */}
      {showPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-150" onClick={closePost}>
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-xl animate-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
              <h2 className="font-semibold text-slate-900">{postStep === "input" ? "Post Update" : "Review Tasks"}</h2>
              <button onClick={closePost} className="p-1.5 hover:bg-slate-100 active:bg-slate-200 rounded-md transition-all duration-150 active:scale-95">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {error && (
                <div className="mb-3 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 animate-in slide-in-from-top duration-150">
                  {error}
                </div>
              )}

              {postStep === "input" ? (
                <div className="space-y-4">
                  {/* Date Selection */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Date</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={postDate}
                        onChange={(e) => setPostDate(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all duration-150"
                      />
                      <button
                        onClick={() => setPostDate(formatDateForAPI(new Date()))}
                        className={`px-3 py-2 text-sm rounded-lg border transition-all duration-150 active:scale-95 ${postDate === formatDateForAPI(new Date()) ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                      >
                        Today
                      </button>
                    </div>
                  </div>

                  {/* Team Member Selection */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Team member</label>
                    <div className="flex flex-wrap gap-2">
                      {members.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setPostUser(m.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all duration-150 active:scale-95 ${postUser === m.id ? "border-slate-900 bg-slate-50 shadow-sm" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                        >
                          <div className="w-5 h-5 rounded flex items-center justify-center text-white text-xs shadow-sm" style={{ backgroundColor: m.color }}>{m.name.charAt(0)}</div>
                          {m.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Update Text */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Update</label>
                    <textarea
                      value={postText}
                      onChange={(e) => setPostText(e.target.value)}
                      placeholder="What did you work on?"
                      rows={4}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none transition-all duration-150"
                    />
                  </div>

                  <button
                    onClick={parse}
                    disabled={!postText.trim() || !postUser || submitting}
                    className="w-full py-2.5 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 active:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98]"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {submitting ? "Parsing..." : "Parse with AI"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setPostStep("input")}
                      className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 hover:bg-slate-100 active:bg-slate-200 px-2 py-1 -ml-2 rounded-md transition-all duration-150"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(postDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                    {parsedTasks.map((t, i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-lg space-y-2 border border-slate-100">
                        <input
                          value={t.description}
                          onChange={(e) => setParsedTasks((p) => p.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
                          className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all duration-150"
                        />
                        <div className="flex flex-wrap gap-2">
                          <select
                            value={t.status}
                            onChange={(e) => setParsedTasks((p) => p.map((x, j) => j === i ? { ...x, status: e.target.value } : x))}
                            className="px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all duration-150"
                          >
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                          </select>
                          <select
                            value={t.project}
                            onChange={(e) => setParsedTasks((p) => p.map((x, j) => j === i ? { ...x, project: e.target.value } : x))}
                            className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all duration-150"
                          >
                            {projects.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={confirm}
                    disabled={!parsedTasks.length || submitting}
                    className="w-full py-2.5 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 active:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98]"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {submitting ? "Posting..." : "Confirm & Post"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Project Detail Modal */}
      {selectedProjectId && grouped[selectedProjectId] && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-150" onClick={() => setSelectedProjectId(null)}>
          <div className="bg-white rounded-xl w-[calc(100%-2rem)] h-[calc(100vh-4rem)] flex flex-col shadow-xl animate-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-5 rounded-full" style={{ backgroundColor: grouped[selectedProjectId].color }} />
                <h2 className="font-semibold text-slate-900">{grouped[selectedProjectId].name}</h2>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {grouped[selectedProjectId].tasks.filter((t) => t.status === "done").length}/{grouped[selectedProjectId].tasks.length} done
                </span>
              </div>
              <button onClick={() => setSelectedProjectId(null)} className="p-1.5 hover:bg-slate-100 active:bg-slate-200 rounded-md transition-all duration-150 active:scale-95">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Tasks */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
              {grouped[selectedProjectId].tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  projects={projects}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                  showUser={true}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chat Bubble */}
      <div className="fixed bottom-4 right-4 z-50">
        {showChat && (
          <div className="absolute bottom-14 right-0 w-80 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
            {/* Chat Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-900 text-white">
              <span className="text-sm font-medium">Ask anything</span>
              <button onClick={() => setShowChat(false)} className="p-1 hover:bg-white/10 rounded transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="h-64 overflow-y-auto p-3 space-y-2 bg-slate-50">
              {chatMessages.length === 0 && (
                <div className="text-center text-slate-400 text-xs py-8">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Ask me about tasks, team progress, or deadlines!</p>
                  <p className="mt-2 text-[10px]">e.g., "What are John's todos?" or "How many tasks were completed yesterday?"</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] px-3 py-1.5 rounded-lg text-[13px] ${msg.role === "user" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-700"}`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-2 border-t border-slate-200 bg-white">
              <div className="flex items-center gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                  placeholder="Ask a question..."
                  className="flex-1 px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                <button
                  onClick={sendChat}
                  disabled={!chatInput.trim() || chatLoading}
                  className="p-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chat Toggle Button */}
        <button
          onClick={() => setShowChat(!showChat)}
          className={`shadow-lg flex items-center justify-center transition-all duration-200 ${showChat ? "w-12 h-12 rounded-full bg-slate-200 text-slate-600" : "h-12 px-5 gap-2 rounded-full bg-slate-900 text-white hover:bg-slate-800"}`}
        >
          {showChat ? <X className="w-5 h-5" /> : <><MessageCircle className="w-5 h-5" /><span className="text-sm font-medium">Ask AI</span></>}
        </button>
      </div>
    </div>
  );
}
