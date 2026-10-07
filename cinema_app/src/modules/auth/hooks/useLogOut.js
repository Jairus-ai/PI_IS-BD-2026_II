import { useMutation } from '@tanstack/react-query';
import { logOut } from '../services/authService';

export const useLogOut = () => {
  const mutation = useMutation({ mutationFn: logOut });

  return {
    logOut: mutation.mutate,
    isLoggingOut: mutation.isPending
  };
};
