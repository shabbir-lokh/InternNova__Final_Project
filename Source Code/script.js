"use strict";

// ========================================
// TaskFlow - Task Management System
// ========================================

const STORAGE_KEY = "taskflow-tasks-v1";

const taskList = document.getElementById("taskList");
const taskDialog = document.getElementById("taskDialog");
const taskForm = document.getElementById("taskForm");
const taskTitle = document.getElementById("taskTitle");
const taskDescription = document.getElementById("taskDescription");
const taskPriority = document.getElementById("taskPriority");
const taskDueDate = document.getElementById("taskDueDate");
const taskId = document.getElementById("taskId");
const searchInput = document.getElementById("searchInput");
const priorityFilter = document.getElementById("priorityFilter");
const emptyState = document.getElementById("emptyState");
const toast = document.getElementById("toast");

let tasks = loadTasks();
let currentFilter = "all";
let toastTimer;

// Format today's date for the workspace header.
document.getElementById("todayLabel").textContent =
  new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(new Date()).toUpperCase();

// Read saved tasks safely from localStorage.
function loadTasks() {
  try {
    const savedTasks = localStorage.getItem(STORAGE_KEY);
    const parsedTasks = savedTasks ? JSON.parse(savedTasks) : [];

    if (!Array.isArray(parsedTasks)) return [];

    return parsedTasks.filter(task =>
      task &&
      typeof task.id === "string" &&
      typeof task.title === "string" &&
      ["low", "medium", "high"].includes(task.priority) &&
      typeof task.completed === "boolean"
    );
  } catch (error) {
    console.error("Could not load saved tasks:", error);
    return [];
  }
}

// Save task data in the browser.
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error("Could not save tasks:", error);
    showToast("Could not save data. Check browser storage.");
    return false;
  }
}

// Create a unique identifier for each task.
function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return Date.now().toString(36) +
    Math.random().toString(36).slice(2);
}

// Display a short notification.
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

// Format a date without timezone shifting.
function formatDate(dateString) {
  if (!dateString) return "";

  const parts = dateString.split("-").map(Number);

  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return "Invalid date";
  }

  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

// Compare date strings using local calendar dates.
function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Calculate dashboard statistics.
function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter(task => task.completed).length;
  const pending = total - completed;
  const progress = total === 0
    ? 0
    : Math.round((completed / total) * 100);

  document.getElementById("totalTasks").textContent = total;
  document.getElementById("allCount").textContent = total;
  document.getElementById("completedTasks").textContent = completed;
  document.getElementById("pendingTasks").textContent = pending;
  document.getElementById("progressPercent").textContent = `${progress}%`;
  document.getElementById("progressFill").style.width = `${progress}%`;
}

// Return tasks matching the current search and filters.
function getVisibleTasks() {
  const query = searchInput.value.trim().toLowerCase();
  const priority = priorityFilter.value;
  const today = getTodayString();

  return tasks
    .filter(task => {
      const matchesSearch =
        task.title.toLowerCase().includes(query) ||
        (task.description || "").toLowerCase().includes(query);

      const matchesPriority =
        priority === "all" || task.priority === priority;

      let matchesStatus = true;

      if (currentFilter === "pending") {
        matchesStatus = !task.completed;
      } else if (currentFilter === "completed") {
        matchesStatus = task.completed;
      } else if (currentFilter === "today") {
        matchesStatus = !task.completed && task.dueDate === today;
      }

      return matchesSearch && matchesPriority && matchesStatus;
    })
    .sort((a, b) => {
      // Incomplete tasks appear before completed tasks.
      if (a.completed !== b.completed) {
        return Number(a.completed) - Number(b.completed);
      }

      // Earlier due dates appear first.
      const dateA = a.dueDate || "9999-12-31";
      const dateB = b.dueDate || "9999-12-31";

      if (dateA !== dateB) return dateA.localeCompare(dateB);

      // Higher-priority tasks appear first when dates match.
      const rank = { high: 0, medium: 1, low: 2 };
      return rank[a.priority] - rank[b.priority];
    });
}

// Build a task card using safe DOM methods.
function createTaskCard(task) {
  const card = document.createElement("article");
  card.className = "task-card";
  card.dataset.id = task.id;

  if (task.completed) card.classList.add("is-completed");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-checkbox";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", `Complete ${task.title}`);
  checkbox.dataset.action = "toggle";

  const details = document.createElement("div");
  details.className = "task-details";

  const title = document.createElement("h4");
  title.className = "task-title";
  title.textContent = task.title;

  details.appendChild(title);

  if (task.description) {
    const description = document.createElement("p");
    description.className = "task-description";
    description.textContent = task.description;
    details.appendChild(description);
  }

  const meta = document.createElement("div");
  meta.className = "task-meta";

  const priority = document.createElement("span");
  priority.className = `priority priority-${task.priority}`;
  priority.textContent =
    `${task.priority === "high" ? "↑" : task.priority === "medium" ? "↗" : "↓"} ${task.priority} priority`;

  meta.appendChild(priority);

  if (task.dueDate) {
    const date = document.createElement("span");
    date.className = "task-date";
    date.textContent = `Due ${formatDate(task.dueDate)}`;

    if (!task.completed && task.dueDate < getTodayString()) {
      date.classList.add("overdue");
      date.textContent += " · Overdue";
    }

    meta.appendChild(date);
  }

  if (task.completed) {
    const status = document.createElement("span");
    status.className = "status-tag";
    status.style.background = "#e9f8f0";
    status.style.color = "#198a63";
    status.textContent = "Completed";
    meta.appendChild(status);
  }

  details.appendChild(meta);

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "icon-button";
  editButton.textContent = "✎";
  editButton.title = "Edit task";
  editButton.setAttribute("aria-label", `Edit ${task.title}`);
  editButton.dataset.action = "edit";

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "icon-button delete";
  deleteButton.textContent = "×";
  deleteButton.title = "Delete task";
  deleteButton.setAttribute("aria-label", `Delete ${task.title}`);
  deleteButton.dataset.action = "delete";

  actions.append(editButton, deleteButton);
  card.append(checkbox, details, actions);

  return card;
}

// Render the task list and update the dashboard.
function renderTasks() {
  updateStats();

  const visibleTasks = getVisibleTasks();
  taskList.replaceChildren();

  visibleTasks.forEach(task => {
    taskList.appendChild(createTaskCard(task));
  });

  emptyState.classList.toggle("visible", visibleTasks.length === 0);
  taskList.hidden = visibleTasks.length === 0;

  document.getElementById("visibleCount").textContent =
    `${visibleTasks.length} ${visibleTasks.length === 1 ? "task" : "tasks"}`;

  const titles = {
    all: "All Tasks",
    today: "Due Today",
    pending: "Pending Tasks",
    completed: "Completed Tasks"
  };

  document.getElementById("listTitle").textContent =
    titles[currentFilter];
}

// Open the dialog for a new task.
function openNewTaskDialog() {
  taskForm.reset();
  taskId.value = "";
  document.getElementById("dialogTitle").textContent = "Create a task";
  document.getElementById("saveTaskBtn").textContent = "Save Task";
  taskPriority.value = "medium";
  taskDialog.showModal();
  taskTitle.focus();
}

// Open the dialog and populate an existing task.
function editTask(id) {
  const task = tasks.find(item => item.id === id);

  if (!task) return;

  taskId.value = task.id;
  taskTitle.value = task.title;
  taskDescription.value = task.description || "";
  taskPriority.value = task.priority;
  taskDueDate.value = task.dueDate || "";

  document.getElementById("dialogTitle").textContent = "Edit task";
  document.getElementById("saveTaskBtn").textContent = "Update Task";

  taskDialog.showModal();
  taskTitle.focus();
}

// Add a new task or update an existing task.
function handleTaskSubmit(event) {
  event.preventDefault();

  if (!taskForm.reportValidity()) return;

  const title = taskTitle.value.trim();

  if (!title) {
    taskTitle.setCustomValidity("Please enter a task title.");
    taskTitle.reportValidity();
    taskTitle.setCustomValidity("");
    return;
  }

  const existingId = taskId.value;

  if (existingId) {
    const index = tasks.findIndex(task => task.id === existingId);

    if (index === -1) {
      showToast("Task not found.");
      taskDialog.close();
      return;
    }

    const updatedTask = {
      ...tasks[index],
      title,
      description: taskDescription.value.trim(),
      priority: taskPriority.value,
      dueDate: taskDueDate.value
    };

    tasks[index] = updatedTask;

    if (!saveTasks()) {
      tasks[index] = tasks[index];
      return;
    }

    taskDialog.close();
    renderTasks();
    showToast("Task updated successfully!");
  } else {
    const newTask = {
      id: createId(),
      title,
      description: taskDescription.value.trim(),
      priority: taskPriority.value,
      dueDate: taskDueDate.value,
      completed: false,
      createdAt: new Date().toISOString()
    };

    tasks.unshift(newTask);

    if (!saveTasks()) {
      tasks = tasks.filter(task => task.id !== newTask.id);
      return;
    }

    taskDialog.close();
    renderTasks();
    showToast("New task added successfully!");
  }
}

// Toggle completion status.
function toggleTask(id) {
  const index = tasks.findIndex(task => task.id === id);

  if (index === -1) return;

  const previous = tasks[index].completed;
  tasks[index].completed = !previous;

  if (!saveTasks()) {
    tasks[index].completed = previous;
    return;
  }

  renderTasks();
  showToast(tasks[index].completed
    ? "Great job! Task completed."
    : "Task marked as pending.");
}

// Delete a task after confirmation.
function deleteTask(id) {
  const task = tasks.find(item => item.id === id);

  if (!task) return;

  const confirmed = window.confirm(
    `Are you sure you want to delete "${task.title}"?`
  );

  if (!confirmed) return;

  const previousTasks = tasks;
  tasks = tasks.filter(item => item.id !== id);

  if (!saveTasks()) {
    tasks = previousTasks;
    return;
  }

  renderTasks();
  showToast("Task deleted successfully.");
}

// Update the active sidebar filter.
function setFilter(filter) {
  currentFilter = filter;

  document.querySelectorAll(".nav-link").forEach(button => {
    const active = button.dataset.filter === filter;

    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });

  renderTasks();
}

// ========================================
// Event listeners
// ========================================

document.getElementById("addTaskBtn")
  .addEventListener("click", openNewTaskDialog);

document.getElementById("emptyAddBtn")
  .addEventListener("click", openNewTaskDialog);

document.getElementById("closeDialog")
  .addEventListener("click", () => taskDialog.close());

document.getElementById("cancelDialog")
  .addEventListener("click", () => taskDialog.close());

taskForm.addEventListener("submit", handleTaskSubmit);

taskTitle.addEventListener("input", () => {
  taskTitle.setCustomValidity("");
});

searchInput.addEventListener("input", renderTasks);

priorityFilter.addEventListener("change", renderTasks);

// Event delegation handles checkbox, edit, and delete clicks.
taskList.addEventListener("change", event => {
  if (!event.target.matches('[data-action="toggle"]')) return;

  const card = event.target.closest(".task-card");
  if (card) toggleTask(card.dataset.id);
});

taskList.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const card = button.closest(".task-card");
  if (!card) return;

  const id = card.dataset.id;

  if (button.dataset.action === "edit") {
    editTask(id);
  } else if (button.dataset.action === "delete") {
    deleteTask(id);
  }
});

document.querySelectorAll(".nav-link").forEach(button => {
  button.addEventListener("click", () => {
    setFilter(button.dataset.filter);
  });
});

// Set minimum due date to today for new tasks.
document.getElementById("addTaskBtn").addEventListener("click", () => {
  taskDueDate.min = getTodayString();
});

document.getElementById("emptyAddBtn").addEventListener("click", () => {
  taskDueDate.min = getTodayString();
});

// Initial application render.
renderTasks();
