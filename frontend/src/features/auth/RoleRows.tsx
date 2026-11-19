import { NameRow } from "@/components/NameRow";
import { roles, type Role } from "./roles";

interface RoleRowsProps {
  chosen: Role;
  onPick: (role: Role) => void;
}

/** The three roles as name rows in a sheet, the chosen one checked. */
export function RoleRows({ chosen, onPick }: RoleRowsProps) {
  return (
    <ul aria-label="Role">
      {roles.map(({ role, word }) => (
        <NameRow key={role} name={word} chosen={role === chosen} onPick={() => onPick(role)} />
      ))}
    </ul>
  );
}
