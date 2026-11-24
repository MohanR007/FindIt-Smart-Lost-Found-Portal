import { Amplify } from 'aws-amplify';

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (typeof process !== 'undefined' && process.env ? process.env : {});

export const AWS_REGION = env.VITE_AWS_REGION || 'ap-southeast-2';
export const COGNITO_USER_POOL_ID = env.VITE_COGNITO_USER_POOL_ID || '';
export const COGNITO_CLIENT_ID = env.VITE_COGNITO_CLIENT_ID || '';
const rawApiBase = env.VITE_API_BASE_URL || '';

// Clean API Base URL: strip trailing /health and trailing slashes
export const API_BASE_URL = rawApiBase.replace(/\/health\/?$/, '').replace(/\/+$/, '');

export const isCognitoConfigured = Boolean(COGNITO_USER_POOL_ID && COGNITO_CLIENT_ID);

if (isCognitoConfigured) {
  try {
    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolId: COGNITO_USER_POOL_ID,
          userPoolClientId: COGNITO_CLIENT_ID,
          signUpVerificationMethod: 'code',
          loginWith: {
            email: true,
          },
        },
      },
    });
  } catch (err) {
    console.error('Failed to configure AWS Amplify Auth:', err);
  }
} else {
  console.warn('AWS Cognito environment variables are missing in .env.local');
}

export default Amplify;
