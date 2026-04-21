const scheduleService = require('./schedule.service');

/**
 * Get schedule for a project
 */
const getSchedule = async (req, res) => {
  try {
    const { projectId } = req.query;
    const schedule = await scheduleService.getProjectSchedule(projectId);

    if (!schedule) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.status(200).json({ tasks: schedule });
  } catch (error) {
    console.error('Error fetching project schedule:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getSchedule,
};
