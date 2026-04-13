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
          assignee: { select: { id: true, username: true } },
          dependencies: {
            include: {
              dependency: true
            }
          }
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
  if (userRole !== 'ADMIN' && project.ownerId !== userId) {
    const isMember = project.members.some(m => m.userId === userId);
    if (!isMember) {
      throw new Error('Access denied');
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

/**
 * Generate AI Project Plan (Tasks and Dependencies)
 */
const generateAIPlan = async (projectId) => {
  // 1. Fetch project with members and their skills
  const project = await prisma.project.findUnique({
    where: { id: parseInt(projectId) },
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
    throw new Error('Project not found');
  }

  // 2. Make a POST request to AI service
  let aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  
  // Ensure the base URL doesn't have a trailing slash before appending /generate
  if (aiServiceUrl.endsWith('/')) {
    aiServiceUrl = aiServiceUrl.slice(0, -1);
  }
  
  const fullUrl = `${aiServiceUrl}/generate`;
  console.log(`Calling AI Service at: ${fullUrl}`);
  
  let aiResponse;
  try {
    aiResponse = await axios.post(fullUrl, {
      project: {
        name: project.name,
        duration_days: project.durationMonths * 30, // approximate conversion
        complexity: project.complexity,
        methodology: project.methodology
      },
      team_members: project.members.map(m => ({
        id: m.userId,
        name: m.user.username,
        skills: m.skills.map(s => s.name),
        experience_level: m.experienceLevel.toLowerCase(), // AI module expects lowercase
        weekly_availability_hours: m.weeklyAvailability || 40 // default 40 hours
      }))
    });
    console.log(`AI Service Response Status: ${aiResponse.status}`);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error(`AI Service Connection Refused at ${fullUrl}`);
      throw new Error('Failed to connect to AI planning service: Connection refused');
    }
    
    if (error.response) {
      console.error(`AI Service responded with status ${error.response.status}:`, error.response.data);
      throw new Error(`AI Service Error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
    }
    
    console.error('AI Service Error:', error.message);
    throw new Error(`AI Service Error: ${error.message}`);
  }

  if (!aiResponse.data || !aiResponse.data.tasks) {
    throw new Error('Invalid response from AI planning service');
  }

  const { tasks } = aiResponse.data; // Expecting { tasks: [ { title, description, dependencies: [tempId], tempId }, ... ] }

  // 4. Use a Prisma transaction to delete existing tasks and create new ones
  return prisma.$transaction(async (tx) => {
    // a. Delete existing tasks (and their dependencies due to Cascade)
    await tx.task.deleteMany({
      where: { projectId: project.id },
    });

    // b. Create new tasks
    // We need a mapping from AI temp IDs to real DB IDs to handle dependencies
    const tempIdToRealId = {};
    const createdTasks = [];

    for (const taskData of tasks) {
      const createdTask = await tx.task.create({
        data: {
          title: taskData.title,
          description: taskData.description,
          status: 'TODO',
          aiGenerated: true,
          projectId: project.id,
          // AI might suggest assignments, but we keep it simple for now
        },
      });
      
      if (taskData.tempId) {
        tempIdToRealId[taskData.tempId] = createdTask.id;
      }
      createdTasks.push({ ...createdTask, tempDependencies: taskData.dependencies || [] });
    }

    // c. Create dependencies
    for (const task of createdTasks) {
      if (task.tempDependencies && task.tempDependencies.length > 0) {
        for (const depTempId of task.tempDependencies) {
          const dependencyId = tempIdToRealId[depTempId];
          if (dependencyId) {
            await tx.taskDependency.create({
              data: {
                dependentId: task.id,
                dependencyId: dependencyId,
              },
            });
          }
        }
      }
    }

    // 5. Update project status to 'planned'
    await tx.project.update({
      where: { id: project.id },
      data: { status: 'ACTIVE' }, // Status planned is not in enum, using ACTIVE as per schema
    });

    return {
      message: 'AI Plan generated successfully',
      taskCount: createdTasks.length
    };
  });
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
