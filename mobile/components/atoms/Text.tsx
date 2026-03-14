import React from 'react';
import { Text as RNText, TextStyle } from 'react-native';

interface TextProps {
  children: React.ReactNode;
  style?: TextStyle | TextStyle[];
  numberOfLines?: number;
}

export const Text = ({ children, style, numberOfLines }: TextProps) => {
  return (
    <RNText style={style} numberOfLines={numberOfLines}>
      {children}
    </RNText>
  );
};

export default Text;
