import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnSpanishPackage from '@zxcvbn-ts/language-es-es';

const MINIMUM_PASSWORD_SCORE = 3;
const MAX_PASSWORD_BYTES = 72;

const passwordStrengthChecker = new ZxcvbnFactory({
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnSpanishPackage.dictionary
  },
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  translations: zxcvbnSpanishPackage.translations
});

export function validatePasswordStrength(password, userInputs = []) {
  if (!password) {
    return {
      error: null,
      suggestions: []
    };
  }
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    return {
      error: `La contraseña no puede superar ${MAX_PASSWORD_BYTES} caracteres`,
      suggestions: []
    };
  }
  const strength = passwordStrengthChecker.check(
    password,
    userInputs.filter(Boolean)
  );
  if (strength.score >= MINIMUM_PASSWORD_SCORE) {
    return {
      error: null,
      suggestions: []
    };
  }
  return {
    error: 'La contraseña es débil',
    suggestions: [
      strength.feedback.warning,
      ...strength.feedback.suggestions
    ].filter(Boolean)
  };
}