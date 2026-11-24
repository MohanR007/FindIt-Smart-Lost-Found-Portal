// AWS Cognito & API Gateway Auth Context (Amplify Auth v6)
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  signUp as amplifySignUp,
  confirmSignUp as amplifyConfirmSignUp,
  resendSignUpCode as amplifyResendSignUpCode,
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  getCurrentUser as amplifyGetCurrentUser,
  fetchAuthSession as amplifyFetchAuthSession,
} from 'aws-amplify/auth';
import { isCognitoConfigured } from '../config/awsConfig.js';
import { getCurrentUserProfile, normalizeUserProfile } from '../services/api.js';
import { MOCK_USERS } from '../data/mockData.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verificationPending, setVerificationPending] = useState(null); // { email, name }

  /**
   * Helper to format user-friendly Cognito error messages
   */
  function formatAuthError(err) {
    if (!err) return 'An unexpected authentication error occurred.';
    switch (err.name) {
      case 'UserNotFoundException':
        return 'No account was found with this email address. Please register for a free account.';
      case 'NotAuthorizedException':
        return 'Incorrect email or password. Please verify your credentials and try again.';
      case 'UserNotConfirmedException':
        return 'Your email address has not been verified yet. Please enter the verification code sent to your email.';
      case 'UsernameExistsException':
        return 'An account with this email address already exists in the Cognito registry. Please sign in instead.';
      case 'InvalidPasswordException':
        return err.message || 'Password does not meet the security policy requirements (at least 8 characters, uppercase, lowercase, number, and special character).';
      case 'CodeMismatchException':
        return 'Invalid verification code entered. Please check your email and try again.';
      case 'ExpiredCodeException':
        return 'The verification code has expired. Please request a new verification code.';
      case 'LimitExceededException':
        return 'Attempt limit exceeded. Please wait a few minutes before trying again.';
      case 'NetworkError':
        return 'Network connection error: Unable to communicate with the AWS authentication endpoint.';
      default:
        return err.message || 'Authentication operation failed.';
    }
  }

  /**
   * Restore authentication session on page load / browser refresh
   */
  const restoreSession = useCallback(async () => {
    if (!isCognitoConfigured) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const cognitoUser = await amplifyGetCurrentUser();

      if (cognitoUser) {
        const authSession = await amplifyFetchAuthSession();
        setSession(authSession);
        const idToken = authSession.tokens?.idToken?.toString();

        let backendProfile = null;
        try {
          // Call GET /users/me from API Gateway backend
          backendProfile = await getCurrentUserProfile(idToken);
        } catch (apiErr) {
          console.warn('Could not retrieve backend DynamoDB profile for current user:', apiErr.message);
        }

        const normalizedUser = normalizeUserProfile(backendProfile, idToken);
        setCurrentUser(normalizedUser);
      }
    } catch {
      // User is not authenticated; clean state
      setCurrentUser(null);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  /**
   * Real Cognito Sign In
   */
  async function login(email, password) {
    setIsLoading(true);
    setError(null);
    const normalizedEmail = email.trim().toLowerCase();

    try {
      if (!isCognitoConfigured) {
        throw new Error('AWS Cognito is not configured. Please ensure environment variables are defined in .env.local.');
      }

      const signInResult = await amplifySignIn({
        username: normalizedEmail,
        password,
      });

      // Check if user requires email verification
      if (signInResult.nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
        setVerificationPending({ email: normalizedEmail });
        return {
          step: 'CONFIRM_SIGN_UP',
          email: normalizedEmail,
          message: 'Email confirmation is required to activate this account.',
        };
      }

      if (signInResult.isSignedIn) {
        const authSession = await amplifyFetchAuthSession();
        setSession(authSession);
        const idToken = authSession.tokens?.idToken?.toString();

        // Requirement 7: Call GET /users/me to retrieve profile from DynamoDB backend
        let backendProfile = null;
        try {
          backendProfile = await getCurrentUserProfile(idToken);
        } catch (apiErr) {
          console.warn('GET /users/me warning:', apiErr.message);
        }

        const normalizedUser = normalizeUserProfile(backendProfile, idToken);
        setCurrentUser(normalizedUser);
        setVerificationPending(null);
        return { step: 'DONE', user: normalizedUser };
      }

      return signInResult;
    } catch (err) {
      const friendlyMsg = formatAuthError(err);
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Real Cognito User Registration
   * Requirement 8: Does not allow assigning admin/finder roles during registration.
   */
  async function register({ name, email, password }) {
    setIsLoading(true);
    setError(null);
    const normalizedEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    try {
      if (!isCognitoConfigured) {
        throw new Error('AWS Cognito is not configured. Please verify .env.local configuration.');
      }

      // Safe registration: strictly normal user, no custom role escalation
      let signUpResult;
      try {
        signUpResult = await amplifySignUp({
          username: normalizedEmail,
          password,
          options: {
            userAttributes: {
              email: normalizedEmail,
              name: cleanName,
            },
          },
        });
      } catch (attrErr) {
        // Fallback in case user pool does not accept 'name' attribute
        if (attrErr.name === 'InvalidParameterException' && attrErr.message?.includes('name')) {
          signUpResult = await amplifySignUp({
            username: normalizedEmail,
            password,
            options: {
              userAttributes: {
                email: normalizedEmail,
              },
            },
          });
        } else {
          throw attrErr;
        }
      }

      // Check verification step
      if (!signUpResult.isSignUpComplete) {
        setVerificationPending({ email: normalizedEmail, name: cleanName });
      }

      return signUpResult;
    } catch (err) {
      const friendlyMsg = formatAuthError(err);
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Real Cognito Email Verification (confirmSignUp)
   */
  async function confirmEmail(email, code) {
    setIsLoading(true);
    setError(null);
    const normalizedEmail = (email || verificationPending?.email || '').trim().toLowerCase();

    try {
      if (!normalizedEmail) {
        throw new Error('Email address is missing for confirmation.');
      }
      if (!code || !code.trim()) {
        throw new Error('Please enter the 6-digit confirmation code.');
      }

      const result = await amplifyConfirmSignUp({
        username: normalizedEmail,
        confirmationCode: code.trim(),
      });

      setVerificationPending(null);
      return result;
    } catch (err) {
      const friendlyMsg = formatAuthError(err);
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Resend Verification Code
   */
  async function resendCode(email) {
    setError(null);
    const normalizedEmail = (email || verificationPending?.email || '').trim().toLowerCase();

    try {
      if (!normalizedEmail) {
        throw new Error('Email address is required to resend verification code.');
      }

      const resendResult = await amplifyResendSignUpCode({
        username: normalizedEmail,
      });

      return resendResult;
    } catch (err) {
      const friendlyMsg = formatAuthError(err);
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  }

  /**
   * Real Cognito Sign Out
   */
  async function logout() {
    setIsLoading(true);
    try {
      if (isCognitoConfigured) {
        await amplifySignOut({ global: false });
      }
    } catch (err) {
      console.warn('Sign out warning:', err);
    } finally {
      setCurrentUser(null);
      setSession(null);
      setVerificationPending(null);
      setError(null);
      setIsLoading(false);
    }
  }

  /**
   * Demo Account Switcher (For local testing & offline review)
   */
  function loginAsDemoUser(demoRole = 'user') {
    let demoUser;
    if (demoRole === 'admin') {
      demoUser = MOCK_USERS.find((u) => u.role === 'admin');
    } else if (demoRole === 'finder') {
      demoUser = MOCK_USERS.find((u) => u.id === 'u2') || MOCK_USERS[1];
    } else {
      demoUser = MOCK_USERS.find((u) => u.role === 'user');
    }

    if (demoUser) {
      setCurrentUser({
        ...demoUser,
        _isDemoFallback: true,
      });
      setVerificationPending(null);
      setError(null);
      return demoUser;
    }
    throw new Error(`Demo user for role "${demoRole}" not found.`);
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        session,
        isLoading,
        error,
        verificationPending,
        setVerificationPending,
        login,
        register,
        confirmEmail,
        resendCode,
        logout,
        restoreSession,
        loginAsDemoUser,
        isCognitoConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
