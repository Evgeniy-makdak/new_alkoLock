import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { RoutePaths } from '@shared/config/routePathsEnum';

export const ResetPasswordRedirect: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      localStorage.setItem('resetPasswordToken', token);
      navigate(RoutePaths.changePassword);
    } else {
      navigate(RoutePaths.auth);
    }
  }, [token, navigate]);

  return null;
};
