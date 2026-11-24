/** A person's name stored as separate parts (users and invites). */
export interface PersonName {
  firstName: string | null;
  lastName: string | null;
}

/** Join name parts for display ("Ann Smith"); empty string when both parts are empty. */
export const formatFullName = ({ firstName, lastName }: Partial<PersonName>): string =>
  [firstName?.trim(), lastName?.trim()].filter(Boolean).join(' ');

/** Normalise user input: trim, and store empty strings as null. */
export const normalizeNamePart = (value: string | null | undefined): string | null =>
  value?.trim() || null;
