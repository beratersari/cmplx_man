'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import Input from '../atoms/Input';
import Label from '../atoms/Label';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  required?: boolean;
}

const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, required, id, ...props }, ref) => {
    const fieldId = id || label.toLowerCase().replace(/\s+/g, '-');
    
    return (
      <div className="mb-4">
        <Label htmlFor={fieldId} required={required}>
          {label}
        </Label>
        <Input
          ref={ref}
          id={fieldId}
          error={error}
          required={required}
          {...props}
        />
      </div>
    );
  }
);

FormField.displayName = 'FormField';

export default FormField;
