'use client';

import { useState } from 'react';
import { Modal, Spinner, Button } from '../atoms';
import { Announcement, Complex, AnnouncementEmotion, Comment, User } from '../../types';

interface AnnouncementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: Announcement | null;
  complex?: Complex;
  emotions: AnnouncementEmotion[];
  comments: Comment[];
  isLoading: boolean;
  currentUser?: User | null;
  onAddEmotion?: (emoji: string) => void;
  onAddComment?: (content: string, parentId?: number) => void;
}

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

const AnnouncementDetailModal: React.FC<AnnouncementDetailModalProps> = ({
  isOpen,
  onClose,
  announcement,
  complex,
  emotions,
  comments,
  isLoading,
  currentUser,
  onAddEmotion,
  onAddComment,
}) => {
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);

  if (!announcement) return null;

  const handleAddComment = () => {
    if (commentText.trim() && onAddComment) {
      onAddComment(commentText, replyTo?.id);
      setCommentText('');
      setReplyTo(null);
    }
  };

  const emotionCounts = emotions.reduce((acc, emotion) => {
    acc[emotion.emoji] = (acc[emotion.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const renderComment = (comment: Comment, isReply: boolean = false) => (
    <div
      key={comment.id}
      className={`${isReply ? 'ml-8 mt-2' : 'border-b border-gray-100'} py-3`}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
          {comment.user?.username?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{comment.user?.username || 'Unknown'}</span>
            <span className="text-xs text-gray-500">
              {new Date(comment.created_date).toLocaleDateString()}
            </span>
          </div>
          <p className="text-gray-700 mt-1">{comment.content}</p>
          
          {announcement.comments_enabled && (
            <button
              onClick={() => setReplyTo(comment)}
              className="text-sm text-blue-600 hover:text-blue-800 mt-2"
            >
              Reply
            </button>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2">
              {comment.replies.map((reply) => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={announcement.title}
      size="xl"
    >
      <div className="space-y-6 max-h-[80vh] overflow-y-auto">
        {/* Announcement Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <span>{complex?.name || 'Unknown Complex'}</span>
            <span>•</span>
            <span>{new Date(announcement.created_date).toLocaleDateString()}</span>
          </div>
          
          {announcement.img_path && (
            <img
              src={announcement.img_path}
              alt={announcement.title}
              className="w-full h-48 object-cover rounded-lg mb-4"
            />
          )}
          
          <p className="text-gray-700 whitespace-pre-wrap">{announcement.description}</p>
        </div>

        {/* Reactions */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">Reactions</h4>
          <div className="flex items-center gap-2 flex-wrap">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onAddEmotion?.(emoji)}
                className={`flex items-center gap-1 px-3 py-1 rounded-full border transition-colors ${
                  emotions.some(e => e.user_id === currentUser?.id && e.emoji === emoji)
                    ? 'bg-blue-100 border-blue-300'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span>{emoji}</span>
                {emotionCounts[emoji] > 0 && (
                  <span className="text-sm text-gray-600">{emotionCounts[emoji]}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Comments */}
        {announcement.comments_enabled && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-3">
              Comments ({comments.length})
            </h4>

            {/* Add Comment */}
            <div className="mb-4">
              {replyTo && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <span>Replying to {replyTo.user?.username}</span>
                  <button
                    onClick={() => setReplyTo(null)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={replyTo ? 'Write a reply...' : 'Write a comment...'}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Button
                  onClick={handleAddComment}
                  disabled={!commentText.trim()}
                  variant="primary"
                >
                  Post
                </Button>
              </div>
            </div>

            {/* Comments List */}
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner size="md" />
              </div>
            ) : comments.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {comments.filter(c => !c.parent_id).map((comment) => renderComment(comment))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                No comments yet. Be the first to comment!
              </div>
            )}
          </div>
        )}

        {!announcement.comments_enabled && (
          <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
            Comments are disabled for this announcement
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AnnouncementDetailModal;
