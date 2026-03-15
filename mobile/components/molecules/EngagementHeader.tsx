import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../atoms/Text';

interface EngagementHeaderProps {
  title: string;
  subtitle: string;
}

export const EngagementHeader = ({ title, subtitle }: EngagementHeaderProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#6b7280',
  },
});

export default EngagementHeader;
