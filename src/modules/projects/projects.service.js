const prisma = require('../../config/prisma');
const axios = require('axios');

/**
 * Get all projects where the user is either owner or member
 */
const getAllProjects = async (userId, userRole) => {
  // Admins see all projects
  if (userRole === 'ADMIN') {
    return prisma.project.findMany({
      include: {
        owner: { select: { id: true, username: true } },
        members: { include: { user: { select: { id: true, username: true } } } },
      },
    });
  }

  // Regular users see projects they own OR where they are a member
  return prisma.project.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId: userId } } },
      ],
    },
    include: {
      owner: { select: { id: true, username: true } },
      members: { include: { user: { select: { id: true, username: true } } } },
    },
  });
};

/**
 * Get a single project by ID with full details (members, tasks, etc.)
 */
const getProjectById = async (projectId, userId, userRole) => {
  const id = parseInt(projectId);
  
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, username: true } },
      members: { 
        include: { 
          user: { select: { id: true, username: true } },
          skills: true
        } 
      },
      tasks: {
        include: {
          assignedTo: { select: { id: true, username: true } },
          dependencies: {
            include: {
              dependency: true
            }
          },
          sprint: true
        }
      },
      sprints: true
    },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  // Security: Check if user has access to this project
  // Admin sees all, members see if they belong to it
  if (userRole !== 'ADMIN') {
    const isOwner = project.ownerId === userId;
    const isMember = project.members.some((m) => m.userId === userId);
    if (!isOwner && !isMember) {
      throw buildServiceError('Access denied', 403, { stage: 'check-access' });
    }
  }

  return project;
};

/**
 * Create a new project and add creator as the first ADMIN member
 */
const createProject = async (userId, projectData) => {
  const { name, description, methodology, status, complexity, durationMonths } = projectData;

  // Use a transaction to ensure both project and member are created
  return prisma.$transaction(async (tx) => {
    // 1. Create Project
    const project = await tx.project.create({
      data: {
        name,
        description,
        methodology,
        status: status || 'ACTIVE',
        complexity: complexity || 'MEDIUM',
        durationMonths,
        ownerId: userId,
      },
    });

    // 2. Add creator as the first ADMIN member
    await tx.projectMember.create({
      data: {
        userId: userId,
        projectId: project.id,
        role: 'ADMIN',
        // Default values for availability and experience can be handled by schema defaults
      },
    });

    return project;
  });
};

const buildServiceError = (message, statusCode, details = {}) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  Object.assign(error, details);
  return error;
};

const normalizeBaseUrl = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  return trimmedValue.endsWith('/') ? trimmedValue.slice(0, -1) : trimmedValue;
};

const safeLowercase = (value, fallback) => {
  if (typeof value === 'string' && value.trim()) {
    return value.toLowerCase();
  }

  return fallback;
};

const safeInteger = (value, fallback = null) => {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.trunc(parsedValue);
};

const safePositiveInteger = (value, fallback = null) => {
  const parsedValue = safeInteger(value, fallback);

  if (parsedValue === null || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
};

const parseOptionalDate = (value, label, taskIdentifier) => {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    console.warn(`[generateAIPlan] Ignoring invalid ${label} for task ${taskIdentifier}:`, value);
    return null;
  }

  return parsedDate;
};

const normalizeTaskPayload = (taskData, index, validMemberIds) => {
  const taskIdentifier = taskData?.tempId || taskData?.temp_id || `task-${index + 1}`;
  const rawTitle = typeof taskData?.title === 'string' ? taskData.title.trim() : '';
  const assignedToUserId = safeInteger(taskData?.assignedToUserId || taskData?.assigned_to_id, null);
  const normalizedAssignedToId = assignedToUserId && validMemberIds.has(assignedToUserId)
    ? assignedToUserId
    : null;

  console.log(`[normalizeTaskPayload] Task ${taskIdentifier}:`, {
    rawAssignedTo: taskData?.assignedToUserId || taskData?.assigned_to_id,
    parsedAssignedTo: assignedToUserId,
    isValidMember: assignedToUserId ? validMemberIds.has(assignedToUserId) : false,
    finalAssignedToId: normalizedAssignedToId
  });

  if (assignedToUserId && !normalizedAssignedToId) {
    console.warn(
      `[generateAIPlan] Task ${taskIdentifier} references non-member assignedToUserId ${assignedToUserId}; saving task without assignee.`
    );
  }

  return {
    tempId: taskIdentifier,
    title: rawTitle || `AI Task ${index + 1}`,
    description: typeof taskData?.description === 'string' ? taskData.description : null,
    assignedToId: normalizedAssignedToId,
    startDate: parseOptionalDate(taskData?.startDate || taskData?.start_date, 'startDate', taskIdentifier),
    dueDate: parseOptionalDate(taskData?.dueDate || taskData?.due_date, 'dueDate', taskIdentifier),
    estimatedHours: safePositiveInteger(taskData?.estimatedHours ?? taskData?.estimated_hours, null),
    dependencies: Array.isArray(taskData?.dependencies) ? taskData.dependencies.filter(Boolean) : [],
  };
};

const serializeError = (error) => ({
  message: error?.message,
  name: error?.name,
  code: error?.code,
  statusCode: error?.statusCode,
  stage: error?.stage,
  meta: error?.meta,
  details: error?.details,
  responseStatus: error?.response?.status || error?.responseStatus,
  responseData: error?.response?.data || error?.responseData,
  stack: error?.stack,
});

/**
 * Generate AI Project Plan (Tasks and Dependencies)
 */
const generateAIPlan = async (projectId) => {
  const numericProjectId = Number.parseInt(projectId, 10);
  const logContext = { projectId, numericProjectId };

  console.log('[generateAIPlan] Starting AI plan generation:', logContext);

  if (Number.isNaN(numericProjectId)) {
    throw buildServiceError('Invalid project id', 400, { stage: 'validate-project-id' });
  }

  try {
    console.log('[generateAIPlan] Fetching project and members from database:', logContext);
    const project = await prisma.project.findUnique({
      where: { id: numericProjectId },
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true } },
            skills: true,
          },
        },
      },
    });

    if (!project) {
      throw buildServiceError('Project not found', 404, { stage: 'fetch-project' });
    }

    const configuredAiServiceUrl = process.env.AI_SERVICE_URL;
    const aiServiceUrl = normalizeBaseUrl(configuredAiServiceUrl || 'http://localhost:8000');

    console.log('[generateAIPlan] AI service configuration:', {
      rawEnvValue: configuredAiServiceUrl,
      normalizedBaseUrl: aiServiceUrl,
    });

    if (!aiServiceUrl) {
      throw buildServiceError('AI_SERVICE_URL is missing or invalid', 500, { stage: 'resolve-ai-url' });
    }

    const fullUrl = `${aiServiceUrl}/generate`;
    const payload = {
      project: {
        name: project.name,
        duration_days: Math.max(1, safePositiveInteger(project.durationMonths, 1) * 30),
        complexity: safeLowercase(project.complexity, 'medium'),
        methodology: safeLowercase(project.methodology, 'agile'),
      },
      team_members: project.members.map((member) => ({
        id: member.userId,
        name: member.user?.username || `User ${member.userId}`,
        skills: Array.isArray(member.skills) ? member.skills.map((skill) => skill.name).filter(Boolean) : [],
        experience_level: safeLowercase(member.experienceLevel, 'mid'),
        weekly_availability_hours: safePositiveInteger(member.weeklyAvailability, 40),
      })),
    };

    console.log('[generateAIPlan] Team member payload validation:', payload.team_members.map((member) => ({
      id: member.id,
      hasName: Boolean(member.name),
      skillCount: Array.isArray(member.skills) ? member.skills.length : 0,
      experience_level: member.experience_level,
      weekly_availability_hours: member.weekly_availability_hours,
    })));

    console.log('[generateAIPlan] Calling AI service:', {
      url: fullUrl,
      projectId: project.id,
      memberCount: payload.team_members.length,
    });
    console.log('[generateAIPlan] AI request payload:', JSON.stringify(payload, null, 2));

    let aiResponse;
    try {
      aiResponse = await axios.post(fullUrl, payload, { timeout: 30000 });
      console.log('[generateAIPlan] AI service response received:', {
        status: aiResponse.status,
        hasTasksArray: Array.isArray(aiResponse.data?.tasks),
        warningCount: aiResponse.data?.warnings?.length || 0,
        aiError: aiResponse.data?.error || null,
      });
      console.log('[generateAIPlan] AI service raw response:', JSON.stringify(aiResponse.data, null, 2));
    } catch (error) {
      console.error('[generateAIPlan] AI service request failed:', {
        message: error.message,
        code: error.code,
        url: fullUrl,
        status: error.response?.status,
        responseData: error.response?.data,
      });

      if (error.code === 'ECONNREFUSED') {
        throw buildServiceError('Failed to connect to AI planning service: Connection refused', 502, {
          stage: 'call-ai-service',
        });
      }

      if (error.code === 'ECONNABORTED') {
        throw buildServiceError('Failed to connect to AI planning service: Request timed out', 502, {
          stage: 'call-ai-service',
        });
      }

      if (error.response) {
        throw buildServiceError(
          `AI Service Error (${error.response.status}): ${JSON.stringify(error.response.data)}`,
          502,
          {
            stage: 'call-ai-service',
            responseStatus: error.response.status,
            responseData: error.response.data,
          }
        );
      }

      throw buildServiceError(`AI Service Error: ${error.message}`, 502, { stage: 'call-ai-service' });
    }

    if (aiResponse.data?.error) {
      throw buildServiceError(`AI planning service returned an error: ${aiResponse.data.error}`, 502, {
        stage: 'validate-ai-response',
        responseData: aiResponse.data,
      });
    }

    if (!Array.isArray(aiResponse.data?.tasks)) {
      throw buildServiceError('Invalid response from AI planning service: tasks array is missing', 502, {
        stage: 'validate-ai-response',
        responseData: aiResponse.data,
      });
    }

    const tasks = aiResponse.data.tasks;
    console.log('[generateAIPlan] Raw AI tasks data:', JSON.stringify(tasks, null, 2));

    const validMemberIds = new Set(project.members.map((member) => member.userId));
    console.log('[generateAIPlan] Valid project member user IDs:', Array.from(validMemberIds));

    try {
      return await prisma.$transaction(async (tx) => {
        console.log('[generateAIPlan] Replacing existing AI tasks in transaction:', {
          projectId: project.id,
          incomingTaskCount: tasks.length,
        });

        await tx.task.deleteMany({
          where: { projectId: project.id },
        });

        const tempIdToRealId = {};
        const createdTasks = [];

        for (const [index, taskData] of tasks.entries()) {
          const normalizedTask = normalizeTaskPayload(taskData, index, validMemberIds);

          console.log(`[generateAIPlan] Task ${index + 1}: Resolving assignment:`, {
            title: normalizedTask.title,
            rawAIUserId: taskData.assignedToUserId || taskData.assigned_to_id,
            finalAssignedToId: normalizedTask.assignedToId,
          });

          const createdTask = await tx.task.create({
            data: {
              title: normalizedTask.title,
              description: normalizedTask.description,
              status: 'TODO',
              aiGenerated: true,
              projectId: project.id,
              assignedToId: normalizedTask.assignedToId, // Ensure this is not undefined
              startDate: normalizedTask.startDate,
              dueDate: normalizedTask.dueDate,
              estimatedHours: normalizedTask.estimatedHours,
            },
          });

          tempIdToRealId[normalizedTask.tempId] = createdTask.id;
          createdTasks.push({
            ...createdTask,
            tempId: normalizedTask.tempId,
            tempDependencies: normalizedTask.dependencies,
          });
        }

        for (const task of createdTasks) {
          for (const depTempId of task.tempDependencies) {
            const dependencyId = tempIdToRealId[depTempId];

            if (!dependencyId) {
              console.warn(
                `[generateAIPlan] Skipping missing dependency mapping for task ${task.tempId}. Unknown dependency tempId: ${depTempId}`
              );
              continue;
            }

            if (dependencyId === task.id) {
              console.warn(
                `[generateAIPlan] Skipping self-dependency for task ${task.tempId}.`
              );
              continue;
            }

            await tx.taskDependency.create({
              data: {
                dependentId: task.id,
                dependencyId,
              },
            });
          }
        }

        await tx.project.update({
          where: { id: project.id },
          data: {
            status: 'ACTIVE',
            generated: true,
          },
        });

        console.log('[generateAIPlan] AI plan saved successfully:', {
          projectId: project.id,
          createdTaskCount: createdTasks.length,
        });

        return {
          message: 'AI Plan generated successfully',
          taskCount: createdTasks.length,
          warnings: aiResponse.data?.warnings || [],
        };
      });
    } catch (transactionError) {
      console.error('[generateAIPlan] Prisma transaction failed:', {
        projectId: project.id,
        taskCount: tasks.length,
        validMemberIds: Array.from(validMemberIds),
        error: serializeError(transactionError),
      });

      if (transactionError.statusCode) {
        throw transactionError;
      }

      if (transactionError.code === 'P2003') {
        throw buildServiceError('Failed to save AI plan: invalid relation reference in generated tasks', 500, {
          stage: 'save-ai-plan',
          code: transactionError.code,
          details: transactionError.meta || null,
        });
      }

      throw buildServiceError('Failed to save AI plan to database', 500, {
        stage: 'save-ai-plan',
        code: transactionError.code,
        details: transactionError.meta || serializeError(transactionError),
      });
    }
  } catch (error) {
    console.error('[generateAIPlan] Failed:', {
      projectId: numericProjectId,
      error: serializeError(error),
    });
    throw error;
  }
};

/**
 * Delete a project (Admin only)
 */
const deleteProject = async (projectId) => {
  return prisma.project.delete({
    where: { id: parseInt(projectId) },
  });
};

/**
 * Update project methodology (Admin only)
 */
const updateProjectMethodology = async (projectId, methodology) => {
  return prisma.project.update({
    where: { id: parseInt(projectId) },
    data: { methodology },
  });
};

module.exports = {
  getAllProjects,
  getProjectById,
  createProject,
  generateAIPlan,
  deleteProject,
  updateProjectMethodology,
};
