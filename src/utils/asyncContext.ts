import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
    requestId: string;
    userId?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();
