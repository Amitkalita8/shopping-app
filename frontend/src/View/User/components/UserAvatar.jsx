import { useState } from 'react';

function UserAvatar({ user }) {
  const [imageFailed, setImageFailed] = useState(false);
  const initial = (user.fullName || user.email || '?').trim().charAt(0).toUpperCase();

  return (
    <span aria-hidden="true" className="user-avatar">
      {user.avatarUrl && !imageFailed ? (
        <img alt="" onError={() => setImageFailed(true)} referrerPolicy="no-referrer" src={user.avatarUrl} />
      ) : (
        initial
      )}
    </span>
  );
}

export default UserAvatar;
