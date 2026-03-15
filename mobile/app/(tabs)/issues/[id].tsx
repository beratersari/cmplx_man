import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from '../../../locales';
import { Text } from '../../../components/atoms/Text';
import { HtmlRenderer } from '../../../components/atoms/HtmlRenderer';
import { useCreateIssueCommentMutation, useGetIssueByIdQuery, useGetIssueCommentsQuery } from '../../../store/apiSlice';

const IssueDetailScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const issueId = Number(id);
  const skipIssue = Number.isNaN(issueId);

  const { data: issue, isLoading: isIssueLoading } = useGetIssueByIdQuery(issueId, { skip: skipIssue });
  const {
    data: comments = [],
    isFetching: isCommentsLoading,
    refetch,
  } = useGetIssueCommentsQuery(issueId, { skip: skipIssue });
  const [createIssueComment, { isLoading: isCreating }] = useCreateIssueCommentMutation();

  const [newComment, setNewComment] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const priorityLabel = useMemo(() => {
    if (!issue?.priority) return '';
    const key = issue.priority.toLowerCase();
    const labels: Record<string, string> = {
      low: t('issues.priority.low'),
      medium: t('issues.priority.medium'),
      high: t('issues.priority.high'),
      urgent: t('issues.priority.urgent'),
    };
    return labels[key] || issue.priority;
  }, [issue?.priority, t]);

  const statusLabel = useMemo(() => {
    if (!issue?.status) return '';
    return t(`issues.status.${issue.status}`) || issue.status;
  }, [issue?.status, t]);

  const formatDate = useCallback((value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }, []);

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

  const applyRichTextFormat = useCallback((format: string) => {
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

  const handleAddComment = useCallback(async () => {
    if (!newComment.trim() || skipIssue) return;
    try {
      const htmlContent = convertToHtml(newComment.trim());
      await createIssueComment({ issueId, content: htmlContent }).unwrap();
      setNewComment('');
      setShowPreview(false);
      refetch();
    } catch (error) {
      console.error('Failed to add issue comment:', error);
    }
  }, [convertToHtml, createIssueComment, issueId, newComment, refetch, skipIssue]);

  const renderComment = useCallback((comment: any, depth = 0) => {
    return (
      <View key={comment.id} style={[styles.commentCard, depth > 0 && styles.commentReply]}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentAuthor}>{comment.username || 'User'}</Text>
          <Text style={styles.commentDate}>{formatDate(comment.created_date)}</Text>
        </View>
        <HtmlRenderer html={comment.content || ''} style={styles.commentContent} />
        {comment.replies?.length > 0 && (
          <View style={styles.replyList}>
            {comment.replies.map((reply: any) => renderComment(reply, depth + 1))}
          </View>
        )}
      </View>
    );
  }, [formatDate]);

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
          <View style={styles.issueCard}>
            <Text style={styles.issueHeader}>{t('issues.detailsTitle')}</Text>
            {isIssueLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text style={styles.loadingText}>{t('common.loading')}</Text>
              </View>
            ) : issue ? (
              <>
                <Text style={styles.issueTitle}>{issue.title}</Text>
                <Text style={styles.issueMeta}>{t('issues.issueTitle')} #{issue.id}</Text>
                <View style={styles.badgeRow}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{statusLabel}</Text>
                  </View>
                  <View style={[styles.badge, styles.badgeSecondary]}>
                    <Text style={styles.badgeText}>{priorityLabel}</Text>
                  </View>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>{t('common.created')}:</Text>
                  <Text style={styles.metaValue}>{formatDate(issue.created_date)}</Text>
                </View>
                {issue.updated_date && (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>{t('issues.lastUpdated')}:</Text>
                    <Text style={styles.metaValue}>{formatDate(issue.updated_date)}</Text>
                  </View>
                )}
                <Text style={styles.descriptionLabel}>{t('issues.form.description')}</Text>
                <Text style={styles.descriptionText}>{issue.description}</Text>
              </>
            ) : (
              <Text style={styles.errorText}>{t('errors.notFound')}</Text>
            )}
          </View>

          <View style={styles.discussionSection}>
            <Text style={styles.discussionTitle}>{t('issues.discussion')}</Text>
            {isCommentsLoading ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : comments.length === 0 ? (
              <Text style={styles.emptyComments}>{t('issues.commentsEmpty')}</Text>
            ) : (
              comments.map((comment: any) => renderComment(comment))
            )}

            <View style={styles.addCommentSection}>
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

              <View style={styles.inputContainer}>
                {showPreview ? (
                  <View style={styles.previewBox}>
                    {newComment.trim() ? (
                      <HtmlRenderer html={convertToHtml(newComment)} style={styles.previewContent} />
                    ) : (
                      <Text style={styles.previewPlaceholder}>{t('issues.nothingToPreview')}</Text>
                    )}
                  </View>
                ) : (
                  <TextInput
                    style={styles.commentInput}
                    value={newComment}
                    onChangeText={setNewComment}
                    placeholder={t('issues.writeCommentPlaceholder')}
                    placeholderTextColor="#9ca3af"
                    multiline
                    textAlignVertical="top"
                  />
                )}
              </View>

              <View style={styles.sendButtonRow}>
                <Text style={styles.formatHint}>
                  {showPreview ? t('issues.previewModeHint') : t('issues.formatHint')}
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
  issueCard: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  issueHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  issueTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  issueMeta: {
    marginTop: 6,
    fontSize: 12,
    color: '#9ca3af',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
  },
  badgeSecondary: {
    backgroundColor: '#f3f4f6',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  metaRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  metaValue: {
    fontSize: 12,
    color: '#111827',
  },
  descriptionLabel: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  descriptionText: {
    marginTop: 8,
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
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
  emptyComments: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 12,
  },
  commentCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  commentReply: {
    marginLeft: 16,
    backgroundColor: '#f3f4f6',
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
  },
  replyList: {
    marginTop: 8,
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
    maxHeight: 140,
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

export default IssueDetailScreen;
