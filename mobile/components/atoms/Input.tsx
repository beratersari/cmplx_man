import React from 'react';
import { TextInput, ViewStyle, StyleSheet } from 'react-native';

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle | ViewStyle[];
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  onBlur?: () => void;
}

export const Input = ({
  value,
  onChangeText,
  placeholder,
  style,
  secureTextEntry = false,
  keyboardType = 'default',
  editable = true,
  multiline = false,
  numberOfLines = 1,
  onBlur,
}: InputProps) => {
  return (
    <TextInput
      style={[styles.input, style]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#999"
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      editable={editable}
      multiline={multiline}
      numberOfLines={numberOfLines}
      onBlur={onBlur}
      textAlignVertical={multiline ? 'top' : 'center'}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
});

export default Input;
