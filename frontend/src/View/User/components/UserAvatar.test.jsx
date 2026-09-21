import { fireEvent, render } from '@testing-library/react';
import UserAvatar from './UserAvatar';

test('shows the profile photo when the user has one', () => {
  const { container } = render(
    <UserAvatar user={{ fullName: 'Asha Rao', email: 'asha@example.com', avatarUrl: 'https://example.com/asha.png' }} />
  );

  expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/asha.png');
});

test('shows the first initial when there is no photo', () => {
  const { container } = render(<UserAvatar user={{ fullName: 'asha rao', email: 'asha@example.com', avatarUrl: '' }} />);

  expect(container.querySelector('img')).toBeNull();
  expect(container).toHaveTextContent('A');
});

test('falls back to the initial when the photo fails to load', () => {
  const { container } = render(
    <UserAvatar user={{ fullName: 'Asha Rao', email: 'asha@example.com', avatarUrl: 'https://example.com/broken.png' }} />
  );

  fireEvent.error(container.querySelector('img'));

  expect(container.querySelector('img')).toBeNull();
  expect(container).toHaveTextContent('A');
});
