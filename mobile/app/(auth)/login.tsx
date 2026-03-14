import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useLoginMutation } from '../../store/apiSlice';
import { useAuth } from '../../hooks/useAuth';
import { FormProvider, useForm } from '../../forms/FormProvider';
import { FormField } from '../../components/molecules/FormField';
import { loginFormConfig } from '../../forms/configs';
import { LocaleProvider, useTranslation } from '../../locales';
import { FormFieldName } from '../../store/enums';
import { Text } from '../../components/atoms/Text';

const LoginFormContent = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [login, { isLoading }] = useLoginMutation();
  const { login: setAuth } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);
  const { state, submit } = useForm();

  const handleSubmit = async () => {
    try {
      setApiError(null);
      const result = await login({
        username: state.values[FormFieldName.Username],
        password: state.values[FormFieldName.Password],
      }).unwrap();
      
      setAuth(result.access_token);
      router.replace('/(tabs)');
    } catch (error: any) {
      setApiError(error?.data?.detail || t('auth.login.form.errorOccurred'));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('auth.login.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.login.subtitle')}</Text>
        </View>

        {apiError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>{t('auth.login.failed')}</Text>
            <Text style={styles.errorMessage}>{apiError}</Text>
          </View>
        )}

        <View style={styles.form}>
          <FormField
            name={FormFieldName.Username}
            labelKey="form.fieldLabels.username"
            placeholderKey="auth.login.usernamePlaceholder"
            type="text"
            required
          />

          <FormField
            name={FormFieldName.Password}
            labelKey="form.fieldLabels.password"
            placeholderKey="auth.login.passwordPlaceholder"
            type="password"
            required
          />

          <TouchableOpacity
            style={[styles.submitButton, (!state.isValid || isLoading) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!state.isValid || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>{t('auth.login.signIn')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const LoginScreen = () => {
  return (
    <LocaleProvider>
      <FormProvider config={loginFormConfig}>
        <SafeAreaView style={styles.safeArea}>
          <LoginFormContent />
        </SafeAreaView>
      </FormProvider>
    </LocaleProvider>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 14,
    color: '#dc2626',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoginScreen;
