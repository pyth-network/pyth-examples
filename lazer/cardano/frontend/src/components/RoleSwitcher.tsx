import type { Role } from '../types/payment';

interface RoleSwitcherProps {
  value: Role;
  onChange: (nextRole: Role) => void;
}

export function RoleSwitcher({ value, onChange }: RoleSwitcherProps): JSX.Element {
  return (
    <div className="role-switcher-block">
      <p className="role-switcher-label">Who am I?</p>
      <div className="role-switcher" role="tablist" aria-label="Role switcher">
        <button
          type="button"
          className={`chip ${value === 'applicant' ? 'chip--active' : ''}`}
          onClick={() => onChange('applicant')}
        >
          Applicant
        </button>
        <button
          type="button"
          className={`chip ${value === 'sponsor' ? 'chip--active' : ''}`}
          onClick={() => onChange('sponsor')}
        >
          Sponsor
        </button>
      </div>
    </div>
  );
}
