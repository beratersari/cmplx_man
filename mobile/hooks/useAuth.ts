import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setCredentials, logout } from '../store/slices/authSlice';

export const useAuth = () => {
  const dispatch = useDispatch();
  const { token, isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  const login = useCallback(
    (token: string, user?: { username: string; role: string; id: number }) => {
      dispatch(setCredentials({ token, user }));
    },
    [dispatch]
  );

  const logoutUser = useCallback(() => {
    dispatch(logout());
  }, [dispatch]);

  return {
    token,
    isAuthenticated,
    user,
    login,
    logout: logoutUser,
  };
};

export default useAuth;
