import crypto from 'node:crypto';

const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijkmnopqrstuvwxyz';
const NUMBERS = '23456789';
const SYMBOLS = '!@#$%&*';
const ALL_CHARACTERS =
  UPPERCASE + LOWERCASE + NUMBERS + SYMBOLS;

function randomCharacter(characters) {
  const index = crypto.randomInt(0, characters.length);
  return characters[index];
}

function shuffle(text) {
  const characters = [...text];

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const randomIndex = crypto.randomInt(0, index + 1);

    [characters[index], characters[randomIndex]] = [
      characters[randomIndex],
      characters[index],
    ];
  }

  return characters.join('');
}

export function generateTemporaryPassword() {
  const password = [
    randomCharacter(UPPERCASE),
    randomCharacter(LOWERCASE),
    randomCharacter(NUMBERS),
    randomCharacter(SYMBOLS),
  ];

  while (password.length < 12) {
    password.push(randomCharacter(ALL_CHARACTERS));
  }

  return shuffle(password.join(''));
}