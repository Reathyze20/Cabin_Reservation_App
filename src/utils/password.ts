import bcrypt from "bcrypt";

/** bcrypt cost factor for new password hashes. Existing cost-10 hashes still verify. */
export const BCRYPT_ROUNDS = 12;

/** Valid bcrypt hash used to keep login timing constant when the user does not exist. */
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("timing-equalization-dummy", BCRYPT_ROUNDS);

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/** Compares against the user's hash, or a dummy hash when there is no user. */
export async function verifyPassword(password: string, passwordHash: string | null | undefined): Promise<boolean> {
  if (!passwordHash) {
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    return false;
  }
  return bcrypt.compare(password, passwordHash);
}
