const projectsService = require('./projects.service');
const membersService = require('../members/members.service');

/**
 * Get projects for the logged-in user
 */
const getProjects = async (req, res) => {
  try {
    const projects = await projectsService.getAllProjects(req.user.id, req.user.role);
    res.status(200).json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get a single project by ID
 */
const getProject = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await projectsService.getProjectById(id, req.user.id, req.user.role);
    res.status(200).json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    if (error.message === 'Project not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Access denied') {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Create a new project (metadata only)
 */
const createProject = async (req, res) => {
  try {
    const project = await projectsService.createProject(req.user.id, req.body);
    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Trigger AI project planning (Tasks and Dependencies)
 */
const triggerAIPlan = async (req, res, next) => {
  const { id } = req.params;

  try {
    console.log('[triggerAIPlan] Request received:', {
      projectId: id,
      userId: req.user?.id,
      userRole: req.user?.role,
      method: req.method,
      originalUrl: req.originalUrl,
    });

    const result = await projectsService.generateAIPlan(id);

    console.log('[triggerAIPlan] Request completed successfully:', {
      projectId: id,
      taskCount: result?.taskCount || 0,
    });

    res.status(202).json({
      message: 'Project planning initiated and accepted',
      details: result
    });
  } catch (error) {
    error.requestContext = {
      projectId: id,
      userId: req.user?.id,
      userRole: req.user?.role,
      method: req.method,
      originalUrl: req.originalUrl,
    };

    console.error('[triggerAIPlan] Request failed:', {
      projectId: id,
      userId: req.user?.id,
      message: error.message,
      statusCode: error.statusCode || 500,
      stage: error.stage || 'unknown',
      stack: error.stack,
      details: error.responseData || error.details || null,
    });
    return next(error);
  }
};

/**
 * Delete a project
 */
const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    await projectsService.deleteProject(id);
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting project:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update project methodology
 */
const updateMethodology = async (req, res) => {
  try {
    const { id } = req.params;
    const { methodology } = req.body;
    
    if (!methodology) {
      return res.status(400).json({ message: 'Methodology is required' });
    }
    
    const updatedProject = await projectsService.updateProjectMethodology(id, methodology);
    res.status(200).json(updatedProject);
  } catch (error) {
    console.error('Error updating methodology:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Add a member to a project (Admin only)
 */
const addMember = async (req, res) => {
  try {
    const { id } = req.params;
    const memberData = req.body;

    const newMember = await membersService.addMemberToProject(parseInt(id), memberData);
    res.status(201).json(newMember);
  } catch (error) {
    console.error('Error adding member to project:', error);
    if (error.message.includes('not found') || error.message.includes('already a member')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getProjects,
  getProject,
  createProject,
  triggerAIPlan,
  deleteProject,
  updateMethodology,
  addMember,
};
