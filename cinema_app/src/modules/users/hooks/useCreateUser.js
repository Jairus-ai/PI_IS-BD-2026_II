import { useState } from 'react';
import { createUser } from '../services/userService.js';

export function useCreateUser() {
  const [creatingUser, setCreatingUser] = useState(false);

  async function create(userData) {
    try {
      setCreatingUser(true);

      return await createUser(userData);
    } finally {
      setCreatingUser(false);
    }
  }

  return {
    createUser: create,
    creatingUser,
  };
}