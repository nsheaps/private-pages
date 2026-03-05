/**
 * isomorphic-git onAuth callback.
 * Provides GitHub token as HTTP basic auth credentials.
 */
export function createAuthHelper(token: string) {
  return {
    onAuth: () => ({
      username: 'x-access-token',
      password: token,
    }),
  };
}
