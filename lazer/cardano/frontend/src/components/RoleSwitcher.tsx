import type { Role } from '../types/payment';

interface RoleSwitcherProps {
  value: Role;
  onChange: (nextRole: Role) => void;
}

export function RoleSwitcher({ value, onChange }: RoleSwitcherProps): JSX.Element {
  return (
    <div className="role-switcher" role="tablist" aria-label="Role switcher">
      <button
        type="button"
        className={`chip ${value === 'user' ? 'chip--active' : ''}`}
        onClick={() => onChange('user')}
      >
        User
      </button>
      <button
        type="button"
        className={`chip ${value === 'sponsor' ? 'chip--active' : ''}`}
        onClick={() => onChange('sponsor')}
      >
        Sponsor
      </button>
    </div>
  );
}
