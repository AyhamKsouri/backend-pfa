const prisma = require('../../config/prisma');

/**
 * Get project schedule formatted for ngx-gantt
 * Returns tasks with start/end dates and dependencies, optionally grouped by sprint
 */
const getProjectSchedule = async (projectId) => {
  const project = await prisma.project.findUnique({
    where: { id: parseInt(projectId) },
    include: {
      tasks: {
        include: {
          dependencies: {
            select: {
              dependencyId: true,
            },
          },
        },
        orderBy: {
          startDate: 'asc',
        },
      },
      sprints: {
        orderBy: {
          startDate: 'asc',
        },
      },
    },
  });

  if (!project) return null;

  // Format tasks for ngx-gantt: { id, title, start, end, dependencies }
  const formattedTasks = project.tasks.map(task => ({
    id: task.id.toString(),
    title: task.title,
    // Convert dates to Unix timestamps (seconds) as expected by many Gantt libraries, 
    // or ISO strings. ngx-gantt usually works with Unix timestamps (ms) or Date objects.
    // We'll provide Unix timestamps in milliseconds.
    start: task.startDate ? new Date(task.startDate).getTime() : null,
    end: task.dueDate ? new Date(task.dueDate).getTime() : null,
    // dependencies should be an array of task IDs
    links: task.dependencies.map(dep => dep.dependencyId.toString()),
    progress: task.progressPercent,
    status: task.status,
    sprintId: task.sprintId
  }));

  // If sprints exist, group tasks by sprint for the Gantt view
  if (project.sprints.length > 0) {
    const ganttData = project.sprints.map(sprint => ({
      id: `sprint-${sprint.id}`,
      title: sprint.name,
      start: new Date(sprint.startDate).getTime(),
      end: new Date(sprint.endDate).getTime(),
      children: formattedTasks.filter(t => t.sprintId === sprint.id)
    }));

    // Add tasks not assigned to any sprint
    const unscheduledTasks = formattedTasks.filter(t => !t.sprintId);
    if (unscheduledTasks.length > 0) {
      ganttData.push({
        id: 'unscheduled',
        title: 'Unscheduled Tasks',
        children: unscheduledTasks
      });
    }

    return ganttData;
  }

  return formattedTasks;
};

module.exports = {
  getProjectSchedule,
};
