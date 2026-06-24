export interface AuthUser {
  uid: string;
  email: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

