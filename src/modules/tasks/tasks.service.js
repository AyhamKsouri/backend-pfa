const prisma = require('../../config/prisma');

/**
 * Get all tasks for a specific project
 */
const getTasksByProject = async (projectId) => {
  return prisma.task.findMany({
    where: { projectId: parseInt(projectId) },
    include: {
      assignedTo: { select: { id: true, username: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Create a new task in a project
 */
const createTask = async (projectId, taskData) => {
  const { title, description, status, assignedToId, estimatedHours, dueDate } = taskData;

  return prisma.task.create({
    data: {
      title,
      description,
      status: status || 'TODO',
      estimatedHours,
      dueDate: dueDate ? new Date(dueDate) : null,
      projectId: parseInt(projectId),
      assignedToId: assignedToId ? parseInt(assignedToId) : null,
    },
    include: {
      assignedTo: { select: { id: true, username: true } },
    },
  });
};

/**
 * Update an existing task
 */
const updateTask = async (taskId, updateData) => {
  const { title, description, status, progressPercent, assignedToId, estimatedHours, dueDate } = updateData;

  return prisma.task.update({
    where: { id: parseInt(taskId) },
    data: {
      title,
      description,
      status,
      progressPercent,
      estimatedHours,
      dueDate: dueDate ? new Date(dueDate) : null,
      assignedToId: assignedToId ? parseInt(assignedToId) : null,
    },
    include: {
      assignedTo: { select: { id: true, username: true } },
    },
  });
};

/**
 * Delete a task
 */
const deleteTask = async (taskId) => {
  return prisma.task.delete({
    where: { id: parseInt(taskId) },
  });
};

/**
 * Get all tasks assigned to a specific user
 * Includes project name and dependency IDs
 */
const getTasksByUser = async (userId) => {
  const numericUserId = parseInt(userId);
  console.log(`[getTasksByUser] Querying tasks for userId: ${numericUserId}`);

  const tasks = await prisma.task.findMany({
    where: { assignedToId: numericUserId },
    include: {
      project: { select: { id: true, name: true } },
      sprint: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, username: true, email: true } },
      dependencies: true,
    },
    orderBy: { dueDate: 'asc' },
  });

  console.log(`[getTasksByUser] Found ${tasks.length} tasks for userId: ${numericUserId}`);

  return tasks.map((task) => ({
    id: String(task.id),
    title: task.title,
    description: task.description ?? '',
    status: (task.status ?? 'TODO').toLowerCase().replace(/_/g, '-'),
    priority: (task.priority ?? 'MEDIUM').toLowerCase(),
    projectId: String(task.projectId),
    projectName: task.project?.name ?? '',
    assignedToUserId: task.assignedToId ? String(task.assignedToId) : '',
    assignedTo: task.assignedTo ?? null,
    sprintId: task.sprintId ? String(task.sprintId) : null,
    sprintName: task.sprint?.name ?? null,
    startDate: task.startDate ? new Date(task.startDate).toISOString() : null,
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
    duration: task.estimatedHours ?? 0,
    progress: task.progressPercent ?? 0,
    dependencies: (task.dependencies ?? []).map((d) => String(d.dependencyId ?? d.id ?? '')),
  }));
};

/**
 * Update task status with security check
 * Only the assigned user can update the status
 */
const updateTaskStatus = async (taskId, status, userId) => {
  const task = await prisma.task.findUnique({
    where: { id: parseInt(taskId) },
  });

  if (!task) {
    throw new Error('Task not found');
  }

  // Security check: only the assigned user can update the status
  if (task.assignedToId !== parseInt(userId)) {
    throw new Error('Unauthorized: You are not assigned to this task');
  }

  return prisma.task.update({
    where: { id: parseInt(taskId) },
    data: { status },
  });
};

/**
 * Update task progress with security check
 * Only the assigned user can update the progress
 */
const updateTaskProgress = async (taskId, progressPercent, userId) => {
  const task = await prisma.task.findUnique({
    where: { id: parseInt(taskId) },
  });

  if (!task) {
    throw new Error('Task not found');
  }

  // Security check: only the assigned user can update the progress
  if (task.assignedToId !== parseInt(userId)) {
    throw new Error('Unauthorized: You are not assigned to this task');
  }

  return prisma.task.update({
    where: { id: parseInt(taskId) },
    data: { progressPercent: parseInt(progressPercent) },
  });
};

module.exports = {
  getTasksByProject,
  createTask,
  updateTask,
  deleteTask,
  getTasksByUser,
  updateTaskStatus,
  updateTaskProgress,
};
