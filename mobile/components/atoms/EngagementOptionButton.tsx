import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from './Text';

interface EngagementOptionButtonProps {
  label: string;
  count: number;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
}

export const EngagementOptionButton = ({ label, count, onPress, disabled, selected }: EngagementOptionButtonProps) => {
  return (
    <TouchableOpacity
      style={[styles.button, selected && styles.selected, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
      <Text style={[styles.count, selected && styles.selectedCount]}>{count}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selected: {
    backgroundColor: '#dbeafe',
    borderColor: '#2563eb',
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    fontSize: 12,
    color: '#374151',
  },
  selectedLabel: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  count: {
    marginTop: 4,
    fontSize: 11,
    color: '#6b7280',
  },
  selectedCount: {
    color: '#1d4ed8',
  },
});

export default EngagementOptionButton;
