import { AsyncLocalStorage } from 'async_hooks';
import { JwtPayload } from '../types';

export interface RequestContext {
    requestId: string;
    userId?: string;
    cabinId?: string | null;
    username?: string;
    role?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function updateRequestContext(patch: Partial<RequestContext>): void {
    const store = requestContext.getStore();
    if (!store) return;

    Object.assign(store, patch);
}

export function syncAuthContextFromUser(user: Pick<JwtPayload, 'userId' | 'cabinId' | 'username' | 'role'> | undefined): void {
    if (!user) return;

    updateRequestContext({
        userId: user.userId,
        cabinId: user.cabinId,
        username: user.username,
        role: user.role,
    });
}
