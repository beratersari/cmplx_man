import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../atoms/Text';
import { EngagementOptionButton } from '../atoms/EngagementOptionButton';
import { EngagementSurveyQuestion } from '../molecules/EngagementSurveyQuestion';
import { useGetEngagementResultsQuery } from '../../store/apiSlice';

interface EngagementBlockCardProps {
  block: any;
  sessionId: string | null;
  isSessionActive: boolean;
  onVote: (blockId: string, optionId: string) => void;
  selectedOptions: string[];
  t: (key: string) => string;
}

export const EngagementBlockCard = ({ block, sessionId, isSessionActive, onVote, selectedOptions, t }: EngagementBlockCardProps) => {
  const { data: results } = useGetEngagementResultsQuery(
    { blockId: block.id, sessionId: sessionId || '' },
    { skip: !sessionId, refetchOnMountOrArgChange: true, refetchOnFocus: true, refetchOnReconnect: true }
  );
  const totals = results?.totals || {};

  return (
    <View style={styles.blockCard}>
      <View style={styles.blockHeader}>
        <Text style={styles.blockTitle}>{block.title}</Text>
        {!!block.metadata?.subtitle && <Text style={styles.blockSubtitle}>{block.metadata.subtitle}</Text>}
      </View>
      {block.description && <Text style={styles.blockDescription}>{block.description}</Text>}

      {block.block_type === 'survey' && (
        <View style={styles.surveyContainer}>
          {block.options.map((question: any) => (
            <EngagementSurveyQuestion
              key={question.id}
              question={question}
              totals={totals}
              selectedOptions={selectedOptions}
              onVote={(optionId) => onVote(block.id, optionId)}
              disabled={!isSessionActive}
            />
          ))}
        </View>
      )}

      {block.block_type === 'poll' && (
        <View style={styles.optionRow}>
          {block.options.map((option: any) => (
            <EngagementOptionButton
              key={option.id}
              label={option.label}
              count={totals[option.id] || 0}
              onPress={() => onVote(block.id, option.id)}
              disabled={!isSessionActive || selectedOptions.length > 0}
              selected={selectedOptions.includes(option.id)}
            />
          ))}
        </View>
      )}

      {block.block_type === 'counter' && (
        <View style={styles.counterRow}>
          <EngagementOptionButton
            label={block.options[0]?.label}
            count={totals[block.options[0]?.id] || 0}
            onPress={() => onVote(block.id, block.options[0]?.id)}
            disabled={!isSessionActive || selectedOptions.length > 0}
            selected={selectedOptions.includes(block.options[0]?.id)}
          />
          <View style={styles.counterValue}>
            <Text style={styles.counterNumber}>{totals[block.options[0]?.id] || 0}</Text>
            <Text style={styles.counterUnit}>{block.metadata?.unit || t('engagement.votes')}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  blockCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  blockHeader: {
    marginBottom: 8,
  },
  blockTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  blockSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  blockDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  surveyContainer: {
    gap: 12,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  counterValue: {
    alignItems: 'flex-end',
  },
  counterNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  counterUnit: {
    fontSize: 11,
    color: '#6b7280',
  },
});

export default EngagementBlockCard;
