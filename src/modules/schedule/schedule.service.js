const prisma = require('../../config/prisma');

/**
 * Get project schedule formatted for ngx-gantt
 * Returns tasks with start/end dates and dependencies, optionally grouped by sprint
 */
const getProjectSchedule = async (projectId) => {
  const numericProjectId = parseInt(projectId);
  const tasks = await prisma.task.findMany({
    where: { projectId: numericProjectId },
    include: {
      assignedTo: { select: { id: true, username: true, email: true } },
      dependencies: true,
      sprint: true,
    },
  });

  const toUnix = (val) => {
    if (!val) return null;
    const d = val instanceof Date ? val : new Date(val);
    return isNaN(d.getTime()) ? null : Math.floor(d.getTime() / 1000);
  };

  const formatted = tasks.map((task) => ({
    id: String(task.id),
    title: task.title,
    description: task.description ?? '',
    status: (task.status ?? 'TODO').toLowerCase().replace('_', '-'), // normalize to lowercase
    priority: task.priority ?? 'MEDIUM',
    projectId: String(task.projectId),
    assignedToId: task.assignedToId ? String(task.assignedToId) : null,
    assignedTo: task.assignedTo ?? null,
    sprintId: task.sprintId ? String(task.sprintId) : null,
    startDate: task.startDate ? new Date(task.startDate).toISOString() : null,
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
    start: toUnix(task.startDate),
    end: toUnix(task.dueDate),
    dependencies: task.dependencies.map((d) => String(d.dependencyId ?? d.id ?? '')),
    progress: task.progressPercent ?? 0,
  }));

  console.log('[ScheduleService] Final formatted response:', JSON.stringify(formatted, null, 2));

  return formatted;
};

module.exports = {
  getProjectSchedule,
};
