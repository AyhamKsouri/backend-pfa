const membersService = require('./members.service');

/**
 * Update a member's skills in a project
 */
const updateSkills = async (req, res) => {
  try {
    const { projectId, userId } = req.params;
    const { skills } = req.body;

    if (!skills || !Array.isArray(skills)) {
      return res.status(400).json({ message: 'Skills array is required' });
    }

    // Security check: Only the user themselves or an admin can update skills
    if (req.user.role !== 'ADMIN' && req.user.id !== parseInt(userId)) {
      return res.status(403).json({ 
        message: 'Forbidden: You can only update your own skills unless you are an admin' 
      });
    }

    const updatedMember = await membersService.updateMemberSkills(
      parseInt(projectId), 
      parseInt(userId), 
      skills
    );
    res.status(200).json(updatedMember);
  } catch (error) {
    console.error('Error updating skills:', error);
    if (error.message === 'Member not found in this project') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  updateSkills,
};
