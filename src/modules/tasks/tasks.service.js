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
  return prisma.task.findMany({
    where: { assignedToId: parseInt(userId) },
    include: {
      project: {
        select: {
          name: true,
        },
      },
      dependencies: {
        select: {
          dependencyId: true,
        },
      },
    },
    orderBy: {
      dueDate: 'asc',
    },
  });
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
