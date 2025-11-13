import type { AuthConfig } from 'convex/server';

const authConfig: AuthConfig = {
  providers: [
    {
      domain: 'famous-stallion-48.clerk.accounts.dev',
      applicationID: 'convex',
    },
  ],
};

export default authConfig;
