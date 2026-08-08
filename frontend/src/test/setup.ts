import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

// jsdom does not implement scrollTo. Silence the warning.
if (typeof window !== 'undefined' && !window.scrollTo) {
  window.scrollTo = () => undefined;
}
