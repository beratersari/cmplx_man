'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Alert } from '../atoms';
import { FormField } from '../molecules';
import { Issue, Complex, IssueCategory, IssueStatus } from '../../types';
import { useState, useEffect } from 'react';

const issueSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be less than 100 characters'),
  description: z
    .string()
    .min(5, 'Description must be at least 5 characters'),
  categoryId: z
    .string()
    .min(1, 'Please select a category'),
  complexId: z
    .string()
    .min(1, 'Please select a complex'),
  status: z
    .enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
    .optional(),
});

type IssueFormData = z.infer<typeof issueSchema>;

interface IssueFormProps {
  complexes: Complex[];
  categories: IssueCategory[];
  initialData?: Issue | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  isEdit?: boolean;
}

const IssueForm: React.FC<IssueFormProps> = ({
  complexes,
  categories,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  isEdit = false,
}) => {
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<IssueFormData>({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      categoryId: initialData?.category_id?.toString() || '',
      complexId: initialData?.complex_id?.toString() || '',
      status: initialData?.status || 'OPEN',
    },
  });

  const selectedComplexId = watch('complexId');

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title,
        description: initialData.description,
        categoryId: initialData.category_id.toString(),
        complexId: initialData.complex_id.toString(),
        status: initialData.status,
      });
    }
  }, [initialData, reset]);

  const handleFormSubmit = async (data: IssueFormData) => {
    try {
      setError(null);
      const submitData: any = {};

      if (isEdit) {
        // For edit, only include changed fields
        if (data.title !== initialData?.title) submitData.title = data.title;
        if (data.description !== initialData?.description) submitData.description = data.description;
        if (data.status !== initialData?.status) submitData.status = data.status;
      } else {
        // For create, include all required fields
        submitData.title = data.title;
        submitData.description = data.description;
        submitData.category_id = Number(data.categoryId);
        submitData.complex_id = Number(data.complexId);
        submitData.img_paths = [];
      }

      await onSubmit(submitData);
    } catch (err: any) {
      setError(err?.data?.detail || 'An error occurred. Please try again.');
    }
  };

  // Filter categories by selected complex
  const filteredCategories = selectedComplexId
    ? categories.filter(c => c.complex_id.toString() === selectedComplexId)
    : categories;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
      {error && (
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      )}

      <FormField
        label="Title"
        type="text"
        placeholder="Enter issue title"
        error={errors.title?.message}
        required
        {...register('title')}
      />

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
          <span className="text-red-500 ml-1">*</span>
        </label>
        <textarea
          {...register('description')}
          rows={4}
          className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter issue description"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">
            {errors.description.message}
          </p>
        )}
      </div>

      {!isEdit && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Complex
              <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              {...register('complexId')}
              className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.complexId ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select a complex</option>
              {complexes.map((complex) => (
                <option key={complex.id} value={complex.id}>
                  {complex.name}
                </option>
              ))}
            </select>
            {errors.complexId && (
              <p className="mt-1 text-sm text-red-600">
                {errors.complexId.message}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
              <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              {...register('categoryId')}
              className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.categoryId ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select a category</option>
              {filteredCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <p className="mt-1 text-sm text-red-600">
                {errors.categoryId.message}
              </p>
            )}
            {selectedComplexId && filteredCategories.length === 0 && (
              <p className="mt-1 text-sm text-yellow-600">
                No categories available for this complex
              </p>
            )}
          </div>
        </>
      )}

      {isEdit && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            {...register('status')}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.status ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
          {errors.status && (
            <p className="mt-1 text-sm text-red-600">
              {errors.status.message}
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading || isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading || isSubmitting}
        >
          {isEdit ? 'Update Issue' : 'Create Issue'}
        </Button>
      </div>
    </form>
  );
};

export default IssueForm;
