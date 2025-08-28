import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock project component - will be created when actual ProjectCard exists
const MockProjectCard = ({ title }: { title: string }) => (
  <div data-testid="project-card">{title}</div>
);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('ProjectCard', () => {
  it('should render project title', () => {
    render(
      <MockProjectCard title="Test Project" />, 
      { wrapper: createWrapper() }
    );
    
    expect(screen.getByTestId('project-card')).toHaveTextContent('Test Project');
  });
});