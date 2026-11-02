import { api } from '../../../services/api';

const WITH_SESSION_COOKIE = { withCredentials: true };

export const logIn = async (credentials) => {
  const { data } = await api.post('/auth/login', credentials, WITH_SESSION_COOKIE);
  return data;
};

export const logOut = async () => {
  const { data } = await api.post('/auth/logout', {}, WITH_SESSION_COOKIE);
  return data;
};

export const getCurrentUser = async () => {
  const { data } = await api.get('/auth/me', WITH_SESSION_COOKIE);
  return data;
};

export const changePassword = async (passwords) => {
  const { data } = await api.patch('/auth/change-password', passwords, WITH_SESSION_COOKIE);
  return data;
};

export const requestPasswordRecovery = async (email) => {
  const { data } = await api.post('/auth/password-recovery/request',{ email });
  return data;
};

export const verifyPasswordRecoveryCode = async ({email, code,}) => {
  const { data } = await api.post('/auth/password-recovery/verify',{ email, code});
  return data;
};

export const resetPassword = async ({email, code, newPassword, confirmPassword}) => {
  const { data } = await api.patch('/auth/password-recovery/reset',{
    email, code, newPassword, confirmPassword,
    },
    WITH_SESSION_COOKIE
  );
  return data;
};