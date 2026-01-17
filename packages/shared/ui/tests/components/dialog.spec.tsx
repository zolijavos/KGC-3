import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '../../src/components/ui/dialog';
import { Button } from '../../src/components/ui/button';

describe('Dialog components', () => {
  it('renders DialogTrigger', () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
      </Dialog>
    );
    expect(screen.getByRole('button', { name: 'Open Dialog' })).toBeInTheDocument();
  });

  it('opens dialog on trigger click', async () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    const trigger = screen.getByRole('button', { name: 'Open' });
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('renders dialog with full structure', async () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog description text</DialogDescription>
          </DialogHeader>
          <div>Main content</div>
          <DialogFooter>
            <Button>Cancel</Button>
            <Button>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Dialog Title')).toBeInTheDocument();
      expect(screen.getByText('Dialog description text')).toBeInTheDocument();
      expect(screen.getByText('Main content')).toBeInTheDocument();
    });
  });

  it('DialogHeader has proper layout styles', async () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader data-testid="header">
            <DialogTitle>Title</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );

    await waitFor(() => {
      const header = screen.getByTestId('header');
      expect(header).toHaveClass('flex');
      expect(header).toHaveClass('flex-col');
    });
  });

  it('DialogFooter has proper layout styles', async () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogFooter data-testid="footer">
            <Button>Action</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );

    await waitFor(() => {
      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('flex');
    });
  });

  it('DialogTitle has proper typography', async () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>My Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    await waitFor(() => {
      const title = screen.getByText('My Title');
      expect(title).toHaveClass('text-lg');
      expect(title).toHaveClass('font-semibold');
    });
  });

  it('DialogDescription has muted styles', async () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogDescription>Description text</DialogDescription>
        </DialogContent>
      </Dialog>
    );

    await waitFor(() => {
      const description = screen.getByText('Description text');
      expect(description).toHaveClass('text-sm');
      expect(description).toHaveClass('text-muted-foreground');
    });
  });

  it('closes dialog via DialogClose', async () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Closeable</DialogTitle>
          <DialogClose asChild>
            <Button data-testid="close-btn">Close</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('close-btn'));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('handles onOpenChange callback', async () => {
    const handleOpenChange = vi.fn();
    render(
      <Dialog onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button>Open</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Callback Test</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    await waitFor(() => {
      expect(handleOpenChange).toHaveBeenCalledWith(true);
    });
  });
});
