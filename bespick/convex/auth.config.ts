import type { AuthConfig } from 'convex/server';

const authConfig: AuthConfig = {
  providers: [
    {
      domain: 'https://warm-kiwi-77.clerk.accounts.dev',
      applicationID: 'convex',
    },
  ],
};

export default authConfig;
