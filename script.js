// ---------------------------
// CONFIG / STATE
// ---------------------------
const STORAGE_KEY = "todoTasks_v1";
let state = []; // single source of truth: array of task objects
let saveTimer = null;
const SAVE_DEBOUNCE_MS = 400;

// ---------------------------
// DOM CACHE
// ---------------------------
const taskInput = document.getElementById("inputField");
const addBtn = document.getElementById("addButton");
const taskList = document.getElementById("taskContainer"); // <ul> or <ol>
const clearAllBtn = document.getElementById("clearAllButton"); // optional

// ---------------------------
// UTIL
// ---------------------------
function uid() {  // simply Generates a unique ID for each task later.
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
}

function now() { return Date.now(); }

// Safe localStorage wrapper
function loadFromStorage() { // loading the already stored tasks if any.
  try {
    const raw = localStorage.getItem(STORAGE_KEY); // Returns an array of task objects linked with a Key if available
    if (!raw) return []; // If the key do not exisit (null) return an empty Array.
    const parsed = JSON.parse(raw); // if key exisits parse the raw values into a Array of objects
    if (!Array.isArray(parsed)) return []; // if the raw parsed value is not a Array return an empty Array
    return parsed; // if the raw parsed value is a Array return it.
  } catch (err) {
    console.error("Failed to read tasks from storage:", err);
    return [];
  }
}

function saveToStorageDebounced() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      // optionally show a small UI toast: "Saved"
    } catch (err) {
      console.error("Failed to save tasks:", err);
    }
  }, SAVE_DEBOUNCE_MS);
}

// ---------------------------
// RENDER (always from state)
// ---------------------------
function render() {
  // Clear list
  taskList.innerHTML = "";

  // If no tasks, optionally show a placeholder
  if (state.length === 0) {
    const p = document.createElement("p");
    p.className = "no-tasks";
    p.textContent = "No tasks added yet.";
    taskList.appendChild(p);
    return;
  }

  // Build items (fragment for performance)
  const frag = document.createDocumentFragment();

  state.forEach(task => {
    const li = document.createElement("li");
    li.className = "taskItem";
    li.dataset.id = task.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = !!task.completed;
    checkbox.setAttribute("aria-label", "Mark task complete");

    const span = document.createElement("span");
    span.className = "task-text";
    span.textContent = task.text;

    const desc = document.createElement("textarea");
    desc.className = "task-desc";
    desc.value = task.description || "";
    desc.placeholder = "Optional description";

    const removeBtn = document.createElement("button");
    removeBtn.className = "task-remove";
    removeBtn.textContent = "Delete";
    removeBtn.setAttribute("aria-label", "Delete task");

    if (task.completed) {
      li.classList.add("completed");
    }

    // Order: checkbox, text, desc, delete
    li.append(checkbox, span, desc, removeBtn);
    frag.appendChild(li);
  });

  taskList.appendChild(frag);
}

// ---------------------------
// STATE MUTATORS (update state -> render -> save) mututors-> Modifiers
// ---------------------------
function addTask(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) return;

  const t = {
    id: uid(),
    text: trimmed,
    description: "",
    completed: false,
    createdAt: now(),
    updatedAt: now()
  };

  state.unshift(t); // newest at top
  render();
  saveToStorageDebounced();
}

function updateTask(id, patch = {}) {
  const idx = state.findIndex(t => t.id === id);
  if (idx === -1) return;
  state[idx] = { ...state[idx], ...patch, updatedAt: now() };
  render();
  saveToStorageDebounced();
}

function removeTask(id) {
  state = state.filter(t => t.id !== id);
  render();
  saveToStorageDebounced();
}

function clearAllTasks() {
  state = [];
  render();
  saveToStorageDebounced();
}

// ---------------------------
// EVENT HANDLERS / DELEGATION
// ---------------------------

// Add task (click or Enter)
addBtn.addEventListener("click", () => {
  addTask(taskInput.value);
  taskInput.value = "";
  taskInput.focus();
});
taskInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    addTask(taskInput.value);
    taskInput.value = "";
  }
});

// event delegation for checkbox, description input, delete
taskList.addEventListener("click", (e) => {  // Delete button click
  const btn = e.target.closest(".task-remove");
  if (btn) {
    const li = btn.closest("li");
    const id = li && li.dataset.id;
    if (id) removeTask(id);
  }
});

taskList.addEventListener("change", (e) => {   // CheckBox changes
  if (e.target.classList.contains("task-checkbox")) {
    const li = e.target.closest("li");
    const id = li && li.dataset.id;
    updateTask(id, { completed: e.target.checked });
  }
});

// description edits (debounced save per textarea)
const descTimers = new Map();
taskList.addEventListener("input", (e) => {
  if (e.target.classList.contains("task-desc")) {
    const li = e.target.closest("li");
    const id = li && li.dataset.id;
    const newVal = e.target.value;

    // debounce per description field
    if (descTimers.has(id)) clearTimeout(descTimers.get(id));
    const t = setTimeout(() => {
      updateTask(id, { description: newVal });
      descTimers.delete(id);
    }, 1200);
    descTimers.set(id, t);
  }
});

// clear all if you have the button
if (clearAllBtn) {
  clearAllBtn.addEventListener("click", () => {
    if (confirm("Clear all tasks?")) clearAllTasks();
  });
}

// cross-tab sync
window.addEventListener("storage", (e) => {
  if (e.key === STORAGE_KEY) {
    state = loadFromStorage();
    render();
  }
});

// ---------------------------
// INIT
// ---------------------------
function init() {
  state = loadFromStorage();
  render();
}
init();
