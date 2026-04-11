const commentsService = require('./comments.service');

/**
 * Get all comments for a task
 */
const getTaskComments = async (req, res) => {
  try {
    const { taskId } = req.params;
    const comments = await commentsService.getCommentsByTask(taskId);
    res.status(200).json(comments);
  } catch (error) {
    console.error('Error fetching task comments:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Create a new comment on a task
 */
const createComment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const comment = await commentsService.createComment(taskId, req.user.id, req.body);
    res.status(201).json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Add a comment with mentions detection
 */
const postComment = async (req, res) => {
  try {
    const { id } = req.params; // taskId
    const { text } = req.body;
    
    const { comment, mentionedUsernames } = await commentsService.addComment(id, text, req.user.id);
    
    res.status(201).json({
      comment,
      mentions_detected: mentionedUsernames
    });
  } catch (error) {
    console.error('Error posting comment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update an existing comment
 */
const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const updatedComment = await commentsService.updateComment(commentId, req.user.id, req.body);
    res.status(200).json(updatedComment);
  } catch (error) {
    console.error('Error updating comment:', error);
    
    if (error.message === 'Comment not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.startsWith('Unauthorized')) {
      return res.status(403).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Delete a comment
 */
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    await commentsService.deleteComment(commentId, req.user.id);
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting comment:', error);
    
    if (error.message === 'Comment not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.startsWith('Unauthorized')) {
      return res.status(403).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getTaskComments,
  createComment,
  postComment,
  updateComment,
  deleteComment,
};
