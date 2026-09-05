export interface AssignableRole {
  key: string;
  label: string;
}

export interface SchoolMemberRow {
  schoolMemberId: string;
  authUserId: string;
  displayName: string;
  email: string | null;
  phone: string;
  isActive: boolean;
  /** Keys of assignable (P1) roles this member currently holds -- roles outside that set (future phases) aren't managed by this screen and aren't reflected here. */
  roleKeys: string[];
}
