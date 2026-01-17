import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '../../src/components/ui/table';

describe('Table components', () => {
  it('renders Table with default styles', () => {
    render(
      <Table data-testid="table">
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    const table = screen.getByRole('table');
    expect(table).toHaveClass('w-full');
    expect(table).toHaveClass('caption-bottom');
    expect(table).toHaveClass('text-sm');
  });

  it('renders TableHeader with border styles', () => {
    render(
      <Table>
        <TableHeader data-testid="header">
          <TableRow>
            <TableHead>Header</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    );
    const header = screen.getByTestId('header');
    expect(header).toHaveClass('[&_tr]:border-b');
  });

  it('renders TableBody with last row style', () => {
    render(
      <Table>
        <TableBody data-testid="body">
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    const body = screen.getByTestId('body');
    expect(body).toHaveClass('[&_tr:last-child]:border-0');
  });

  it('renders TableFooter with muted background', () => {
    render(
      <Table>
        <TableFooter data-testid="footer">
          <TableRow>
            <TableCell>Total</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    );
    const footer = screen.getByTestId('footer');
    expect(footer).toHaveClass('bg-muted/50');
    expect(footer).toHaveClass('font-medium');
  });

  it('renders TableHead with proper typography', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    );
    const head = screen.getByRole('columnheader');
    expect(head).toHaveClass('font-medium');
    expect(head).toHaveClass('text-muted-foreground');
  });

  it('renders TableRow with hover state', () => {
    render(
      <Table>
        <TableBody>
          <TableRow data-testid="row">
            <TableCell>Data</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    const row = screen.getByTestId('row');
    expect(row).toHaveClass('border-b');
    expect(row).toHaveClass('hover:bg-muted/50');
  });

  it('renders TableCell with proper padding', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell data-testid="cell">Data</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    const cell = screen.getByTestId('cell');
    expect(cell).toHaveClass('p-2');
    expect(cell).toHaveClass('align-middle');
  });

  it('renders TableCaption with muted text', () => {
    render(
      <Table>
        <TableCaption>Table caption</TableCaption>
      </Table>
    );
    const caption = screen.getByText('Table caption');
    expect(caption).toHaveClass('mt-4');
    expect(caption).toHaveClass('text-sm');
    expect(caption).toHaveClass('text-muted-foreground');
  });

  it('composes full table structure', () => {
    render(
      <Table>
        <TableCaption>User list</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>John</TableCell>
            <TableCell>john@example.com</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('User list')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('John')).toBeInTheDocument();
  });
});
