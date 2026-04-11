const prisma = require('../../config/prisma');
const { parseMentions } = require('../../utils/mentions');

/**
 * Get all comments for a specific task
 */
const getCommentsByTask = async (taskId) => {
  return prisma.comment.findMany({
    where: { taskId: parseInt(taskId) },
    include: {
      author: {
        select: {
          id: true,
          username: true,
        },
      },
      mentions: {
        include: {
          mentioned: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
};

/**
 * Add a comment with mentions and notifications using a transaction
 */
const addComment = async (taskId, text, authorId) => {
  return prisma.$transaction(async (tx) => {
    // 1. Create the Comment
    const comment = await tx.comment.create({
      data: {
        text,
        taskId: parseInt(taskId),
        authorId: parseInt(authorId),
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
          },
        },
        task: {
          select: {
            title: true,
          },
        },
      },
    });

    // 2. Parse mentions
    const usernames = parseMentions(text);
    const mentionedUsernames = [];

    if (usernames.length > 0) {
      // 3. Find users by username
      const mentionedUsers = await tx.user.findMany({
        where: {
          username: { in: usernames },
        },
        select: {
          id: true,
          username: true,
        },
      });

      // 4. Create Mention and Notification records
      for (const user of mentionedUsers) {
        // Create Mention
        const mention = await tx.mention.create({
          data: {
            commentId: comment.id,
            mentionedId: user.id,
          },
        });

        // Create Notification
        await tx.notification.create({
          data: {
            type: 'MENTION',
            message: `${comment.author.username} mentioned you in a comment on task "${comment.task.title}"`,
            recipientId: user.id,
            mentionId: mention.id,
          },
        });

        mentionedUsernames.push(user.username);
      }
    }

    return {
      comment,
      mentionedUsernames,
    };
  });
};

/**
 * Create a new comment on a task (Legacy - replaced by addComment)
 */
const createComment = async (taskId, authorId, commentData) => {
  const { text } = commentData;
  const result = await addComment(taskId, text, authorId);
  return result.comment;
};

/**
 * Update a comment
 */
const updateComment = async (commentId, authorId, updateData) => {
  const { text } = updateData;

  const comment = await prisma.comment.findUnique({
    where: { id: parseInt(commentId) },
  });

  if (!comment) {
    throw new Error('Comment not found');
  }

  if (comment.authorId !== parseInt(authorId)) {
    throw new Error('Unauthorized: You can only update your own comments');
  }

  return prisma.comment.update({
    where: { id: parseInt(commentId) },
    data: { text },
    include: {
      author: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });
};

/**
 * Delete a comment
 */
const deleteComment = async (commentId, authorId) => {
  const comment = await prisma.comment.findUnique({
    where: { id: parseInt(commentId) },
  });

  if (!comment) {
    throw new Error('Comment not found');
  }

  if (comment.authorId !== parseInt(authorId)) {
    throw new Error('Unauthorized: You can only delete your own comments');
  }

  return prisma.comment.delete({
    where: { id: parseInt(commentId) },
  });
};

module.exports = {
  getCommentsByTask,
  addComment,
  createComment,
  updateComment,
  deleteComment,
};
