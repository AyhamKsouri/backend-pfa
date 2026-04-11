const tasksService = require('./tasks.service');

/**
 * Get tasks by project ID
 */
const getTasks = async (req, res) => {
  try {
    const { projectId } = req.params;
    const tasks = await tasksService.getTasksByProject(projectId);
    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Create a new task in a project
 */
const createTask = async (req, res) => {
  try {
    const { projectId } = req.params;
    const task = await tasksService.createTask(projectId, req.body);
    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update an existing task
 */
const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const updatedTask = await tasksService.updateTask(taskId, req.body);
    res.status(200).json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Delete a task
 */
const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    await tasksService.deleteTask(taskId);
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get tasks assigned to the current user
 */
const getMyTasks = async (req, res) => {
  try {
    const tasks = await tasksService.getTasksByUser(req.user.id);
    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error fetching user tasks:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update task status
 */
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const updatedTask = await tasksService.updateTaskStatus(id, status, req.user.id);
    res.status(200).json(updatedTask);
  } catch (error) {
    console.error('Error updating task status:', error);
    
    if (error.message === 'Task not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.startsWith('Unauthorized')) {
      return res.status(403).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update task progress
 */
const updateProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { progress } = req.body;
    
    const updatedTask = await tasksService.updateTaskProgress(id, progress, req.user.id);
    res.status(200).json(updatedTask);
  } catch (error) {
    console.error('Error updating task progress:', error);
    
    if (error.message === 'Task not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.startsWith('Unauthorized')) {
      return res.status(403).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getMyTasks,
  updateStatus,
  updateProgress,
};
