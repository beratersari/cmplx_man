import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../atoms/Text';
import { EngagementOptionButton } from '../atoms/EngagementOptionButton';

interface EngagementSurveyQuestionProps {
  question: any;
  totals: Record<string, number>;
  selectedOptions: string[];
  onVote: (optionId: string) => void;
  disabled?: boolean;
}

export const EngagementSurveyQuestion = ({ question, totals, selectedOptions, onVote, disabled }: EngagementSurveyQuestionProps) => {
  const questionSelections = selectedOptions.filter((option) => option.startsWith(`${question.id}:`));
  return (
    <View style={styles.container}>
      <Text style={styles.question}>{question.label}</Text>
      <View style={styles.options}>
        {question.choices.map((choice: string) => {
          const optionId = `${question.id}:${choice}`;
          return (
            <EngagementOptionButton
              key={choice}
              label={choice}
              count={totals[optionId] || 0}
              onPress={() => onVote(optionId)}
              disabled={disabled || questionSelections.length > 0}
              selected={selectedOptions.includes(optionId)}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 10,
  },
  question: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});

export default EngagementSurveyQuestion;
