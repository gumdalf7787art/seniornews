import { completeOAuth } from '../utils/oauth.js';
export const onRequestPost = (context) => completeOAuth(context, 'naver');
