export type User = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type AuthResponse = {
  accessToken: string;
  user: User;
};

export type ApiErrorBody = {
  statusCode: number;
  error: string;
  message: string | string[];
};
