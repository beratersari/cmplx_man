'use client';

import LoginForm from '../../components/organisms/LoginForm';
import LoginTemplate from '../../components/templates/LoginTemplate';

export default function LoginPage() {
  return (
    <LoginTemplate>
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            Sign in to your account
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            Enter your credentials to access the admin panel
          </p>
        </div>
        <LoginForm />
      </div>
    </LoginTemplate>
  );
}
