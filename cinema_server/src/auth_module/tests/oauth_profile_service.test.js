import { describe, expect, it } from '@jest/globals';

import { buildOAuthProfile } from '../services/oauth_profile_service.js';

const BASE = { providerUserId: 42, email: ' Ana@Gmail.com ', emailVerified: true };

describe('buildOAuthProfile', () => {
  it('normalizes the id and the email', () => {
    const profile = buildOAuthProfile({ ...BASE, givenName: 'Ana', familyName: 'Mora' });

    expect(profile).toMatchObject({ providerUserId: '42', email: 'ana@gmail.com', emailVerified: true });
  });

  it('splits compound given names and surnames', () => {
    const profile = buildOAuthProfile({ ...BASE, givenName: 'Juan Carlos', familyName: 'Pérez Mora' });

    expect(profile).toMatchObject({
      firstName: 'Juan',
      middleName: 'Carlos',
      firstSurname: 'Pérez',
      lastSurname: 'Mora'
    });
  });

  it('prefers an explicit middle name over the one split from the given name', () => {
    const profile = buildOAuthProfile({
      ...BASE,
      givenName: 'Juan Carlos',
      middleName: 'Andrés',
      familyName: 'Mora'
    });

    expect(profile.middleName).toBe('Andrés');
  });

  it('returns empty strings when names are missing', () => {
    const profile = buildOAuthProfile({ ...BASE });

    expect(profile).toMatchObject({ firstName: '', middleName: '', firstSurname: '', lastSurname: '' });
  });

  it('returns an empty email when the provider sends none', () => {
    expect(buildOAuthProfile({ providerUserId: 'x', emailVerified: false }).email).toBe('');
  });
});