import React, { useState, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from '../../../locales';
import { Text } from '../../../components/atoms/Text';
import { HtmlRenderer } from '../../../components/atoms/HtmlRenderer';
import { Ionicons } from '@expo/vector-icons';
import { useCreateAnnouncementCommentMutation, useAddAnnouncementCommentReactionMutation } from '../../../store/apiSlice';

// Allowed emotions mapping - backend expects format like :happy:, :sad:, etc.
const ALLOWED_EMOTIONS = [
  { code: ':happy:', display: '😊', label: 'Happy' },
  { code: ':sad:', display: '😢', label: 'Sad' },
  { code: ':surprised:', display: '😲', label: 'Surprised' },
  { code: ':angry:', display: '😠', label: 'Angry' },
  { code: ':heart:', display: '❤️', label: 'Heart' },
] as const;

// Helper to convert backend code to display emoji
const getDisplayEmoji = (code: string): string => {
  const emotion = ALLOWED_EMOTIONS.find(e => e.code === code);
  return emotion?.display || code;
};

interface RelatedResource {
  id: number;
  title: string;
  url: string;
  type: 'file' | 'link';
}

interface DiscussionComment {
  id: number;
  author: string;
  content: string;
  createdAt: string;
  reactions: { emoji: string; count: number; userReacted: boolean }[];
}

const AnnouncementDetailScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const announcementId = Number(id);
  const [resourcesExpanded, setResourcesExpanded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [comments, setComments] = useState<DiscussionComment[]>([]);

  const [createComment, { isLoading: isCreating }] = useCreateAnnouncementCommentMutation();
  const [addReaction] = useAddAnnouncementCommentReactionMutation();

  // Mock data - in real app, fetch from API
  const announcement = {
    id: id,
    title: 'Community Pool Renovation Update',
    content: '<p>We are excited to announce that the <strong>community pool renovation</strong> is now complete!</p><p>The pool will reopen on <b>January 20, 2024</b> with the following improvements:</p><ul><li>New heating system for year-round use</li><li>Updated safety features</li><li>Extended hours: <i>6 AM - 10 PM</i></li></ul><p>For more information, visit <a href="https://example.com/pool">our website</a>.</p>',
    createdAt: '2024-01-10',
    author: 'Community Management',
    relatedResources: [
      { id: 1, title: 'Pool Renovation Plans.pdf', url: '#', type: 'file' as const },
      { id: 2, title: 'New Pool Hours Schedule', url: '#', type: 'file' as const },
      { id: 3, title: 'Safety Guidelines', url: 'https://example.com/safety', type: 'link' as const },
    ] as RelatedResource[],
  };

  const handleToggleResource = useCallback(() => {
    setResourcesExpanded(prev => !prev);
  }, []);

  const handleAddReaction = useCallback(async (commentId: number, emoji: string) => {
    try {
      await addReaction({ commentId, emoji }).unwrap();
      setComments(prev =>
        prev.map(comment => {
          if (comment.id === commentId) {
            const existingReaction = comment.reactions.find(r => r.emoji === emoji);
            if (existingReaction) {
              return {
                ...comment,
                reactions: comment.reactions.map(r =>
                  r.emoji === emoji
                    ? { ...r, count: r.userReacted ? r.count - 1 : r.count + 1, userReacted: !r.userReacted }
                    : r
                ),
              };
            } else {
              return {
                ...comment,
                reactions: [...comment.reactions, { emoji, count: 1, userReacted: true }],
              };
            }
          }
          return comment;
        })
      );
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  }, [addReaction]);

  // Convert markdown-like syntax to HTML for preview and storage
  const convertToHtml = useCallback((text: string): string => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/__(.+?)__/g, '<u>$1</u>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/• (.+)/g, '<li>$1</li>')
      .replace(/(<li>.+<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n/g, '<br/>');
  }, []);

  const handleAddComment = useCallback(async () => {
    if (newComment.trim()) {
      try {
        // Convert markdown to HTML before sending to backend
        const htmlContent = convertToHtml(newComment.trim());
        const result = await createComment({ announcementId, content: htmlContent }).unwrap();
        const newCommentObj: DiscussionComment = {
          id: result?.id || comments.length + 1,
          author: 'You',
          content: htmlContent,
          createdAt: new Date().toISOString().split('T')[0],
          reactions: [],
        };
        setComments(prev => [...prev, newCommentObj]);
        setNewComment('');
        setShowPreview(false);
      } catch (error) {
        console.error('Failed to add comment:', error);
      }
    }
  }, [createComment, announcementId, newComment, comments.length, convertToHtml]);

  const applyRichTextFormat = useCallback((format: string) => {
    // Apply markdown-like formatting that gets converted to HTML
    setNewComment(prev => {
      const formats: Record<string, (text: string) => string> = {
        bold: (text) => `**${text || 'bold text'}**`,
        italic: (text) => `*${text || 'italic text'}*`,
        underline: (text) => `__${text || 'underlined text'}__`,
        list: (text) => `\n• ${text || 'list item'}`,
        link: (text) => `[${text || 'link text'}](url)`,
      };
      
      const formatter = formats[format];
      if (formatter) {
        return prev + formatter('');
      }
      return prev;
    });
  }, []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      keyboardVerticalOffset={100}
    >
      <SafeAreaView style={styles.safeArea}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
          <Text style={styles.backText}>{t('common.back')}</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{announcement.title}</Text>
            <View style={styles.meta}>
              <Text style={styles.author}>{announcement.author}</Text>
              <Text style={styles.date}>{announcement.createdAt}</Text>
            </View>
          </View>

          {/* Content with HTML renderer */}
          <View style={styles.contentSection}>
            <HtmlRenderer html={announcement.content} style={styles.content} />
          </View>

          {/* Related Resources Collapsible */}
          <TouchableOpacity style={styles.collapsibleHeader} onPress={handleToggleResource}>
            <Text style={styles.collapsibleTitle}>{t('announcements.relatedResources')}</Text>
            <Ionicons
              name={resourcesExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#6b7280"
            />
          </TouchableOpacity>

          {resourcesExpanded && (
            <View style={styles.resourcesList}>
              {announcement.relatedResources.map(resource => (
                <TouchableOpacity key={resource.id} style={styles.resourceItem}>
                  <Ionicons
                    name={resource.type === 'file' ? 'document-outline' : 'link-outline'}
                    size={20}
                    color="#3b82f6"
                  />
                  <Text style={styles.resourceTitle}>{resource.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Discussion Section */}
          <View style={styles.discussionSection}>
            <Text style={styles.discussionTitle}>{t('announcements.discussion')}</Text>

            {/* Comments List */}
            {comments.map(comment => (
              <View key={comment.id} style={styles.commentCard}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor}>{comment.author}</Text>
                  <Text style={styles.commentDate}>{comment.createdAt}</Text>
                </View>
                <HtmlRenderer html={comment.content} style={styles.commentContent} />
                <View style={styles.reactions}>
                  {comment.reactions.map((reaction, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.reaction, reaction.userReacted && styles.reactionActive]}
                      onPress={() => handleAddReaction(comment.id, reaction.emoji)}
                    >
                      <Text style={styles.reactionEmoji}>{getDisplayEmoji(reaction.emoji)}</Text>
                      <Text style={styles.reactionCount}>{reaction.count}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            {/* Add Comment with Slack-like Rich Text */}
            <View style={styles.addCommentSection}>
              {/* Formatting Toolbar */}
              <View style={styles.richTextToolbar}>
                <TouchableOpacity style={styles.formatButton} onPress={() => applyRichTextFormat('bold')}>
                  <Text style={styles.formatButtonText}>B</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formatButton} onPress={() => applyRichTextFormat('italic')}>
                  <Text style={[styles.formatButtonText, styles.italicText]}>I</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formatButton} onPress={() => applyRichTextFormat('underline')}>
                  <Text style={[styles.formatButtonText, styles.underlineText]}>U</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formatButton} onPress={() => applyRichTextFormat('list')}>
                  <Ionicons name="list" size={18} color="#6b7280" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.formatButton} onPress={() => applyRichTextFormat('link')}>
                  <Ionicons name="link" size={18} color="#6b7280" />
                </TouchableOpacity>
                <View style={styles.toolbarDivider} />
                <TouchableOpacity 
                  style={[styles.previewToggle, showPreview && styles.previewToggleActive]} 
                  onPress={() => setShowPreview(!showPreview)}
                >
                  <Ionicons name="eye" size={16} color={showPreview ? '#3b82f6' : '#6b7280'} />
                  <Text style={[styles.previewToggleText, showPreview && styles.previewToggleTextActive]}>
                    {t('common.preview')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Input Area - Slack style: either show input OR preview */}
              <View style={styles.inputContainer}>
                {showPreview ? (
                  /* Preview Mode - Shows formatted rich text */
                  <View style={styles.previewBox}>
                    {newComment.trim() ? (
                      <HtmlRenderer html={convertToHtml(newComment)} style={styles.previewContent} />
                    ) : (
                      <Text style={styles.previewPlaceholder}>{t('announcements.nothingToPreview')}</Text>
                    )}
                  </View>
                ) : (
                  /* Write Mode - Shows simple markdown syntax */
                  <TextInput
                    style={styles.commentInput}
                    value={newComment}
                    onChangeText={setNewComment}
                    placeholder={t('announcements.writeCommentPlaceholder')}
                    placeholderTextColor="#9ca3af"
                    multiline
                    textAlignVertical="top"
                  />
                )}
              </View>

              {/* Send Button Row */}
              <View style={styles.sendButtonRow}>
                <Text style={styles.formatHint}>
                  {showPreview ? t('announcements.previewModeHint') : t('announcements.formatHint')}
                </Text>
                <TouchableOpacity
                  style={[styles.sendButton, (!newComment.trim() || isCreating) && styles.sendButtonDisabled]}
                  onPress={handleAddComment}
                  disabled={!newComment.trim() || isCreating}
                >
                  <Ionicons name="send" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  safeArea: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#111827',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  author: {
    fontSize: 14,
    color: '#6b7280',
  },
  date: {
    fontSize: 14,
    color: '#9ca3af',
  },
  contentSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  content: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  collapsibleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  resourcesList: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  resourceTitle: {
    marginLeft: 12,
    fontSize: 14,
    color: '#3b82f6',
  },
  discussionSection: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 16,
  },
  discussionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  commentCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  commentDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  commentContent: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  reactions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reaction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  reactionActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    marginLeft: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  addCommentSection: {
    marginTop: 16,
    gap: 8,
  },
  richTextToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  formatButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  italicText: {
    fontStyle: 'italic',
    fontWeight: '400',
  },
  underlineText: {
    textDecorationLine: 'underline',
  },
  toolbarDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#d1d5db',
    marginHorizontal: 4,
  },
  previewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  previewToggleActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  previewToggleText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  previewToggleTextActive: {
    color: '#3b82f6',
  },
  inputContainer: {
    minHeight: 80,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    maxHeight: 120,
    backgroundColor: '#fff',
    color: '#111827',
  },
  previewBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    backgroundColor: '#fff',
  },
  previewPlaceholder: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  sendButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formatHint: {
    fontSize: 11,
    color: '#9ca3af',
    flex: 1,
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  previewContent: {
    fontSize: 14,
    color: '#374151',
  },
});

export default AnnouncementDetailScreen;
