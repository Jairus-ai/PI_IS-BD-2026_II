function splitWords(text) {
  const [first = '', ...rest] = String(text ?? '').trim().split(/\s+/);
  return [first, rest.join(' ')];
}

export function buildOAuthProfile({
  providerUserId,
  email,
  emailVerified,
  givenName,
  middleName,
  familyName
}) {
  const [firstName, extraGivenName] = splitWords(givenName);
  const [firstSurname, lastSurname] = splitWords(familyName);

  return {
    providerUserId: String(providerUserId),
    email: String(email ?? '').trim().toLowerCase(),
    emailVerified,
    firstName,
    middleName: String(middleName ?? '').trim() || extraGivenName,
    firstSurname,
    lastSurname
  };
}