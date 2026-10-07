import { useCallback, useEffect, useState } from 'react';
import { getUsers } from '../services/userService.js';

export function useUsers(filters = {}) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getUsers(filters);
      setUsers(data);
    } catch (error) {
      setError(error.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [
    filters.role,
    filters.status,
    filters.locationId,
    filters.name,
  ]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return {
    users,
    loading,
    error,
    refetchUsers: loadUsers,
  };
}