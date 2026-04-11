const projectsService = require('./projects.service');

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
const triggerAIPlan = async (req, res) => {
  try {
    const { id } = req.params;
    
    // We respond with 202 Accepted immediately to indicate processing has started
    // But since the service call is currently synchronous (await), we wait for it.
    // In a production app, this might be offloaded to a background worker.
    const result = await projectsService.generateAIPlan(id);
    
    res.status(202).json({
      message: 'Project planning initiated and accepted',
      details: result
    });
  } catch (error) {
    console.error('Error triggering AI plan:', error);
    
    if (error.message === 'Project not found') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Internal server error' });
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

module.exports = {
  getProjects,
  createProject,
  triggerAIPlan,
  deleteProject,
  updateMethodology,
};
