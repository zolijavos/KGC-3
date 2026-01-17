import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  useFormField,
} from '../../src/components/ui/form';
import { Input } from '../../src/components/ui/input';
import { Button } from '../../src/components/ui/button';

// Test schema
const testSchema = z.object({
  name: z.string().min(2, 'Minimum 2 karakter'),
  email: z.string().email('Érvénytelen email cím'),
});

type TestFormValues = z.infer<typeof testSchema>;

// Test form wrapper
function TestForm({
  onSubmit,
  defaultValues = { name: '', email: '' },
}: {
  onSubmit?: (values: TestFormValues) => void;
  defaultValues?: TestFormValues;
}) {
  const form = useForm<TestFormValues>({
    resolver: zodResolver(testSchema),
    defaultValues,
    mode: 'all',
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit ?? vi.fn())} data-testid="form">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Név</FormLabel>
              <FormControl>
                <Input placeholder="Írd be a neved" {...field} />
              </FormControl>
              <FormDescription>A teljes neved.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="pelda@email.hu" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Küldés</Button>
      </form>
    </Form>
  );
}

describe('Form components', () => {
  describe('Form rendering', () => {
    it('should render form with fields', () => {
      render(<TestForm />);
      expect(screen.getByTestId('form')).toBeInTheDocument();
      expect(screen.getByLabelText('Név')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    it('should render FormLabel', () => {
      render(<TestForm />);
      expect(screen.getByText('Név')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    it('should render FormDescription', () => {
      render(<TestForm />);
      expect(screen.getByText('A teljes neved.')).toBeInTheDocument();
    });

    it('should render submit button', () => {
      render(<TestForm />);
      expect(screen.getByRole('button', { name: 'Küldés' })).toBeInTheDocument();
    });
  });

  describe('Form validation', () => {
    it('should show error message for invalid name', async () => {
      const user = userEvent.setup();
      render(<TestForm />);

      const nameInput = screen.getByLabelText('Név');
      await user.clear(nameInput);
      await user.type(nameInput, 'A');

      const submitButton = screen.getByRole('button', { name: 'Küldés' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Minimum 2 karakter')).toBeInTheDocument();
      });
    });

    it('should show error message for invalid email', async () => {
      const user = userEvent.setup();
      render(<TestForm />);

      const nameInput = screen.getByLabelText('Név');
      const emailInput = screen.getByLabelText('Email');

      await user.type(nameInput, 'Test User');
      await user.type(emailInput, 'invalid');

      const submitButton = screen.getByRole('button', { name: 'Küldés' });
      await user.click(submitButton);

      await waitFor(
        () => {
          expect(screen.getByText('Érvénytelen email cím')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('should not show error for valid input', async () => {
      const user = userEvent.setup();
      render(<TestForm />);

      const nameInput = screen.getByLabelText('Név');
      const emailInput = screen.getByLabelText('Email');

      await user.type(nameInput, 'Test User');
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: 'Küldés' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText('Minimum 2 karakter')).not.toBeInTheDocument();
        expect(screen.queryByText('Érvénytelen email cím')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form submission', () => {
    it('should call onSubmit with valid data', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<TestForm onSubmit={onSubmit} />);

      const nameInput = screen.getByLabelText('Név');
      const emailInput = screen.getByLabelText('Email');

      await user.type(nameInput, 'Test User');
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: 'Küldés' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          { name: 'Test User', email: 'test@example.com' },
          expect.anything()
        );
      });
    });

    it('should not call onSubmit with invalid data', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<TestForm onSubmit={onSubmit} />);

      const submitButton = screen.getByRole('button', { name: 'Küldés' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).not.toHaveBeenCalled();
      });
    });
  });

  describe('Form default values', () => {
    it('should render with default values', () => {
      render(
        <TestForm
          defaultValues={{ name: 'John Doe', email: 'john@example.com' }}
        />
      );

      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    });
  });

  describe('FormItem styling', () => {
    it('should have error styling when invalid', async () => {
      const user = userEvent.setup();
      render(<TestForm />);

      const nameInput = screen.getByLabelText('Név');
      await user.clear(nameInput);
      await user.type(nameInput, 'A');

      const submitButton = screen.getByRole('button', { name: 'Küldés' });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText('Minimum 2 karakter');
        expect(errorMessage).toHaveClass('text-destructive');
      });
    });
  });
});
