import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from '../../src/components/ui/card';

describe('Card component', () => {
  it('renders Card with default styles', () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('rounded-xl');
    expect(card).toHaveClass('border');
    expect(card).toHaveClass('shadow');
  });

  it('renders CardHeader with proper spacing', () => {
    render(<CardHeader data-testid="header">Header</CardHeader>);
    const header = screen.getByTestId('header');
    expect(header).toHaveClass('flex');
    expect(header).toHaveClass('flex-col');
    expect(header).toHaveClass('p-6');
  });

  it('renders CardTitle with proper typography', () => {
    render(<CardTitle>Test Title</CardTitle>);
    const title = screen.getByText('Test Title');
    expect(title).toHaveClass('font-semibold');
    expect(title).toHaveClass('leading-none');
  });

  it('renders CardDescription with muted foreground', () => {
    render(<CardDescription>Test description</CardDescription>);
    const description = screen.getByText('Test description');
    expect(description).toHaveClass('text-sm');
    expect(description).toHaveClass('text-muted-foreground');
  });

  it('renders CardContent with proper padding', () => {
    render(<CardContent data-testid="content">Content here</CardContent>);
    const content = screen.getByTestId('content');
    expect(content).toHaveClass('p-6');
    expect(content).toHaveClass('pt-0');
  });

  it('renders CardFooter with flex layout', () => {
    render(<CardFooter data-testid="footer">Footer</CardFooter>);
    const footer = screen.getByTestId('footer');
    expect(footer).toHaveClass('flex');
    expect(footer).toHaveClass('items-center');
    expect(footer).toHaveClass('p-6');
  });

  it('composes all Card subcomponents together', () => {
    render(
      <Card data-testid="full-card">
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
          <CardDescription>A test card description</CardDescription>
        </CardHeader>
        <CardContent>Main content area</CardContent>
        <CardFooter>Footer content</CardFooter>
      </Card>
    );

    expect(screen.getByTestId('full-card')).toBeInTheDocument();
    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('A test card description')).toBeInTheDocument();
    expect(screen.getByText('Main content area')).toBeInTheDocument();
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('merges custom className on Card', () => {
    render(
      <Card className="custom-card" data-testid="custom">
        Content
      </Card>
    );
    const card = screen.getByTestId('custom');
    expect(card).toHaveClass('custom-card');
    expect(card).toHaveClass('rounded-xl'); // default styles preserved
  });
});
