import React, { useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { FormFieldName } from '../../store/enums';
import { useForm } from '../../forms/FormProvider';
import { useTranslation } from '../../locales';
import { Text } from '../atoms/Text';
import { Input } from '../atoms/Input';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

interface FormFieldProps {
  name: FormFieldName | string;
  labelKey?: string;
  placeholderKey?: string;
  type?: 'text' | 'password' | 'email' | 'number' | 'date' | 'time' | 'select' | 'textarea' | 'checkbox' | 'radio';
  required?: boolean;
  options?: Array<{ value: any; labelKey: string }>;
  style?: ViewStyle;
  disabled?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  onPress?: () => void; // for select fields
}

export const FormField = ({
  name,
  labelKey,
  placeholderKey,
  type = 'text',
  required = false,
  options = [],
  style,
  disabled = false,
  multiline = false,
  numberOfLines = 4,
  onPress,
}: FormFieldProps) => {
  const { t } = useTranslation();
  const { state, setValue, setTouched, validateField } = useForm();
  const [showPassword, setShowPassword] = useState(false);

  const fieldValue = state.values[name] ?? '';
  const displayValue = typeof fieldValue === 'string' ? fieldValue : String(fieldValue ?? '');
  const error = state.errors[name];
  const touched = state.touched[name];

  const handleChange = (text: string) => {
    setValue(name, text);
  };

  const handleBlur = () => {
    setTouched(name);
    validateField(name);
  };

  const label = labelKey ? t(labelKey) : t(`form.fieldLabels.${name}`, { field: name });
  const placeholder = placeholderKey ? t(placeholderKey) : '';

  const renderInput = () => {
    const selectedOption = options.find(option => option.value === fieldValue);
    const resolvedValue =
      type === 'select'
        ? (selectedOption
          ? (selectedOption.labelKey.includes('.')
            ? t(selectedOption.labelKey)
            : selectedOption.labelKey)
          : '')
        : displayValue;

    const inputValue = type === 'select' ? resolvedValue : displayValue;

    switch (type) {
      case 'password':
        return (
          <View style={styles.passwordContainer}>
            <Input
              value={inputValue}
              onChangeText={handleChange}
              placeholder={placeholder}
              secureTextEntry={!showPassword}
              editable={!disabled}
              onBlur={handleBlur}
              style={[styles.input, error && touched && styles.inputError]}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#6b7280"
              />
            </TouchableOpacity>
          </View>
        );

      case 'textarea':
        return (
          <Input
            value={inputValue}
            onChangeText={handleChange}
            placeholder={placeholder}
            multiline
            numberOfLines={numberOfLines}
            editable={!disabled}
            onBlur={handleBlur}
            style={[styles.input, styles.textarea, error && touched && styles.inputError]}
          />
        );

      case 'select':
        return (
          <TouchableOpacity onPress={onPress} disabled={disabled}>
            <Input
              value={inputValue}
              onChangeText={handleChange}
              placeholder={placeholder}
              editable={false}
              onBlur={handleBlur}
              style={[styles.input, error && touched && styles.inputError]}
            />
          </TouchableOpacity>
        );

      case 'number':
        return (
          <Input
            value={displayValue}
            onChangeText={handleChange}
            placeholder={placeholder}
            keyboardType="numeric"
            editable={!disabled}
            onBlur={handleBlur}
            style={[styles.input, error && touched && styles.inputError]}
          />
        );

      case 'date':
        return (
          <Input
            value={displayValue}
            onChangeText={handleChange}
            placeholder="YYYY-MM-DD"
            keyboardType="numeric"
            editable={!disabled}
            onBlur={handleBlur}
            style={[styles.input, error && touched && styles.inputError]}
          />
        );

      case 'time':
        return (
          <Input
            value={displayValue}
            onChangeText={handleChange}
            placeholder="HH:MM"
            keyboardType="numeric"
            editable={!disabled}
            onBlur={handleBlur}
            style={[styles.input, error && touched && styles.inputError]}
          />
        );

      default:
        return (
          <Input
            value={displayValue}
            onChangeText={handleChange}
            placeholder={placeholder}
            keyboardType={type === 'email' ? 'email-address' : 'default'}
            editable={!disabled}
            onBlur={handleBlur}
            style={[styles.input, error && touched && styles.inputError]}
          />
        );
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        {required && <Text style={styles.required}>*</Text>}
      </View>
      {renderInput()}
      {error && touched && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  required: {
    color: '#ef4444',
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  passwordContainer: {
    position: 'relative',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  error: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
});

export default FormField;
