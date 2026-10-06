import { useMutation } from '@tanstack/react-query';
import { logIn } from '../services/authService';

export const useLogIn = () => {
  const mutation = useMutation({ mutationFn: logIn });

  return {
    logIn: mutation.mutate,
    isLoggingIn: mutation.isPending
  };
};
