import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert, AlertTitle, AlertDescription } from '../../src/components/ui/alert';

describe('Alert component', () => {
  it('renders with default variant', () => {
    render(<Alert data-testid="alert">Alert content</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-background');
    expect(alert).toHaveClass('text-foreground');
  });

  it('renders with destructive variant', () => {
    render(<Alert variant="destructive" data-testid="destructive">Error!</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('border-destructive/50');
    expect(alert).toHaveClass('text-destructive');
  });

  it('has proper base styles', () => {
    render(<Alert>Content</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('relative');
    expect(alert).toHaveClass('w-full');
    expect(alert).toHaveClass('rounded-lg');
    expect(alert).toHaveClass('border');
  });

  it('renders AlertTitle with proper styles', () => {
    render(<AlertTitle>Title</AlertTitle>);
    const title = screen.getByText('Title');
    expect(title).toHaveClass('font-medium');
    expect(title).toHaveClass('leading-none');
  });

  it('renders AlertDescription with proper styles', () => {
    render(<AlertDescription>Description text</AlertDescription>);
    const description = screen.getByText('Description text');
    expect(description).toHaveClass('text-sm');
  });

  it('composes all Alert subcomponents', () => {
    render(
      <Alert>
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>This is a warning message.</AlertDescription>
      </Alert>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('This is a warning message.')).toBeInTheDocument();
  });

  it('merges custom className', () => {
    render(<Alert className="custom-alert">Content</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('custom-alert');
    expect(alert).toHaveClass('rounded-lg'); // default styles preserved
  });
});
