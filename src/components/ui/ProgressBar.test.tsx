import { render, screen } from '@testing-library/react-native';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('exposes the rounded percentage as its accessibility value', () => {
    render(<ProgressBar progress={0.42} />);

    expect(screen.getByRole('progressbar').props.accessibilityValue).toEqual({ min: 0, max: 100, now: 42 });
  });

  it('clamps below 0 and above 1', () => {
    render(<ProgressBar progress={-0.5} />);
    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(0);
  });

  it('clamps above 1', () => {
    render(<ProgressBar progress={1.5} />);
    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(100);
  });
});
