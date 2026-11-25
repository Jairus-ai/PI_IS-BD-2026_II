import { describe, expect, it } from '@jest/globals';

import { validateGoogleSignUp } from '../validators/google_auth_validator.js';

const GOOGLE_PROFILE = {
  providerUserId: 'sub-123',
  email: 'ana@gmail.com',
  emailVerified: true,
  firstName: 'Ana',
  middleName: '',
  firstSurname: 'Mora',
  lastSurname: ''
};

const VALID_BODY = {
  identificationType: 'C',
  identificationNumber: '123456789',
  birthdate: '1995-05-10',
  phoneNumber: '88888888'
};

describe('validateGoogleSignUp', () => {
  it('accepts valid data and uses the Google profile as default', () => {
    const { errors, client } = validateGoogleSignUp(GOOGLE_PROFILE, VALID_BODY);

    expect(errors).toEqual({});
    expect(client).toMatchObject({
      email: 'ana@gmail.com',
      firstName: 'Ana',
      firstSurname: 'Mora',
      identificationType: 'C',
      identificationNumber: '123456789'
    });
  });

  it('ignores an email sent in the body and keeps the Google one', () => {
    const { client } = validateGoogleSignUp(GOOGLE_PROFILE, {
      ...VALID_BODY,
      email: 'otro@correo.com'
    });

    expect(client.email).toBe('ana@gmail.com');
  });

  it('lets the body override the names that come from Google', () => {
    const { client } = validateGoogleSignUp(GOOGLE_PROFILE, {
      ...VALID_BODY,
      firstName: 'Luis'
    });

    expect(client.firstName).toBe('Luis');
  });

  it('requires the fields Google does not provide', () => {
    const { errors } = validateGoogleSignUp(GOOGLE_PROFILE, {});

    expect(errors).toMatchObject({
      identificationType: 'Campo obligatorio',
      identificationNumber: 'Campo obligatorio',
      birthdate: 'Campo obligatorio',
      phoneNumber: 'Campo obligatorio'
    });
  });

  it('rejects an invalid identification number', () => {
    const { errors } = validateGoogleSignUp(GOOGLE_PROFILE, {
      ...VALID_BODY,
      identificationNumber: '123'
    });

    expect(errors.identificationNumber).toBe('La cédula debe tener 9 dígitos, sin guiones');
  });

  it('rejects underage users', () => {
    const tenYearsAgo = `${new Date().getFullYear() - 10}-01-01`;

    const { errors } = validateGoogleSignUp(GOOGLE_PROFILE, {
      ...VALID_BODY,
      birthdate: tenYearsAgo
    });

    expect(errors.birthdate).toBe('Debes ser mayor de edad para registrarte');
  });

  it('asks for the first surname when Google does not send one', () => {
    const profile = { ...GOOGLE_PROFILE, firstSurname: '' };

    expect(validateGoogleSignUp(profile, VALID_BODY).errors.firstSurname).toBe('Campo obligatorio');
    expect(
      validateGoogleSignUp(profile, { ...VALID_BODY, firstSurname: 'Mora' }).errors
    ).toEqual({});
  });
});