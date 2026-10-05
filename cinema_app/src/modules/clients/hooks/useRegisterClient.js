import { useMutation } from '@tanstack/react-query';
import { registerClient } from '../services/clientService';

export const useRegisterClient = (options = {}) => {
  const mutation = useMutation({
    mutationFn: registerClient,
    ...options
  });

  return {
    register: mutation.mutate,
    isRegistering: mutation.isPending
  };
};
