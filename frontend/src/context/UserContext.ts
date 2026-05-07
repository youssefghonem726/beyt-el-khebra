import { createContext, useContext } from 'react';

interface UserCtx { name: string; }
export const UserContext = createContext<UserCtx>({ name: '' });
export const useUser = () => useContext(UserContext);
