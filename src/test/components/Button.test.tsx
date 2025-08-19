import { expect, test, vi } from 'vitest';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { Button } from '@/components/ui/button';

test('Button renders correctly', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByRole('button')).toBeInTheDocument();
  expect(screen.getByText('Click me')).toBeInTheDocument();
});

test('Button handles click events', () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>Click me</Button>);
  
  const button = screen.getByRole('button');
  button.click();
  
  expect(handleClick).toHaveBeenCalledOnce();
});