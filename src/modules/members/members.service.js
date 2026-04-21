const prisma = require('../../config/prisma');

/**
 * Add a member to a project
 */
const addMemberToProject = async (projectId, memberData) => {
  const { userId, username, skills = [], experienceLevel, weeklyAvailability, role } = memberData;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new Error('Project not found');
  }

  let targetUserId = userId;

  // Resolve username to userId if provided
  if (!targetUserId && username) {
    console.log(`[addMemberToProject] Resolving username: ${username}`);
    const resolvedUser = await prisma.user.findFirst({
      where: {
        username: {
          equals: username,
          mode: 'insensitive',
        },
      },
    });

    if (!resolvedUser) {
      throw new Error(`User with username "${username}" not found`);
    }
    targetUserId = resolvedUser.id;
    console.log(`[addMemberToProject] Resolved username "${username}" to userId: ${targetUserId}`);
  }

  if (!targetUserId) {
    throw new Error('Either userId or username is required');
  }

  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) {
    throw new Error('User not found');
  }

  const existing = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: targetUserId, projectId } },
  });
  if (existing) {
    throw new Error('User is already a member of this project');
  }

  return prisma.projectMember.create({
    data: {
      userId: targetUserId,
      projectId,
      role: role || 'MEMBER',
      experienceLevel: experienceLevel || 'MID',
      weeklyAvailability: weeklyAvailability || 40,
      skills: {
        create: skills.map((name) => ({ name })),
      },
    },
    include: {
      user: { select: { id: true, username: true, email: true } },
      skills: { select: { id: true, name: true } },
    },
  });
};

/**
 * Update a member's skills in a project
 */
const updateMemberSkills = async (projectId, userId, skills) => {
  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });

  if (!member) {
    throw new Error('Member not found in this project');
  }

  // Delete old skills and add new ones
  await prisma.$transaction([
    prisma.skill.deleteMany({ where: { memberId: member.id } }),
    prisma.projectMember.update({
      where: { id: member.id },
      data: {
        skills: {
          create: skills.map((name) => ({ name })),
        },
      },
    }),
  ]);

  return prisma.projectMember.findUnique({
    where: { id: member.id },
    include: { skills: { select: { id: true, name: true } } },
  });
};

module.exports = {
  addMemberToProject,
  updateMemberSkills,
};
