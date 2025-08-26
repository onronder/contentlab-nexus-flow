## Testing Guide

### Test Structure
- `src/test/` - Test utilities and setup
- `src/test/components/` - Component tests
- `src/test/hooks/` - Hook tests
- `src/test/pages/` - Page/integration tests

### Running Tests
```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run coverage

# Type checking
npm run type-check
```

### Testing Patterns

#### Component Testing
```tsx
import { render, screen } from '@/test/utils';
import { MyComponent } from '@/components/MyComponent';

test('renders component correctly', () => {
  render(<MyComponent />);
  expect(screen.getByText('Expected Text')).toBeInTheDocument();
});
```

#### Hook Testing
```tsx
import { renderHook } from '@testing-library/react';
import { useMyHook } from '@/hooks/useMyHook';

test('hook returns correct value', () => {
  const { result } = renderHook(() => useMyHook());
  expect(result.current.value).toBe('expected');
});
```

#### Integration Testing
```tsx
import { render, screen, fireEvent } from '@/test/utils';
import { MyPage } from '@/pages/MyPage';

test('page interaction works', () => {
  render(<MyPage />);
  fireEvent.click(screen.getByRole('button'));
  expect(screen.getByText('Updated')).toBeInTheDocument();
});
```

### Best Practices
1. Use descriptive test names
2. Test user behavior, not implementation
3. Mock external dependencies
4. Keep tests focused and atomic
5. Use the custom render function for components that need providers