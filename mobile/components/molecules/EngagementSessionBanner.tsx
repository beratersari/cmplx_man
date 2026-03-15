import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../atoms/Text';

interface EngagementSessionBannerProps {
  message: string;
}

export const EngagementSessionBanner = ({ message }: EngagementSessionBannerProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  text: {
    fontSize: 12,
    color: '#be123c',
  },
});

export default EngagementSessionBanner;
