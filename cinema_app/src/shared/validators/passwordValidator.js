import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnSpanishPackage from '@zxcvbn-ts/language-es-es';

export const MINIMUM_PASSWORD_SCORE = 3;

const passwordStrengthChecker = new ZxcvbnFactory({
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnSpanishPackage.dictionary
  },
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  translations: zxcvbnSpanishPackage.translations
});

export function checkPasswordStrength(password, values = {}) {
  if (!password) {
    return { score: 0, suggestions: [] };
  }
  const userInputs = [values.email, values.firstName, values.firstSurname, values.lastSurname]
    .filter(Boolean);
  const result = passwordStrengthChecker.check(password, userInputs);
  return {
    score: result.score,
    suggestions: [result.feedback.warning, ...result.feedback.suggestions].filter(Boolean)
  };
}

