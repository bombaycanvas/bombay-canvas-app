import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../utils/api";
import { useAuthStore } from "../store/authStore";
import { postAuthRoute } from "../utils/postAuthRoute";
import { useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { syncLocalLanguagePreferences } from "./language";
import {
  authFailureReason,
  capture,
  identifyUser,
  log,
  ProductEvent,
  type AuthMethod,
  type AuthStage,
} from "../utils/analytics";
import type {
  ResetPasswordLinkParams,
  ResetPasswordLinkResponse,
} from "../types/auth";

/**
 * One shape for every auth failure, so the four methods stay comparable in a
 * single funnel instead of each inventing its own property names.
 */
const captureAuthFailure = (
  method: AuthMethod,
  stage: AuthStage,
  error: unknown,
) => {
  capture(ProductEvent.AuthFailed, {
    method,
    stage,
    reason: authFailureReason(error),
  });
};

const syncLanguagesAfterAuth = async () => {
  try {
    await syncLocalLanguagePreferences();
  } catch (error) {
    log.warn("Failed to sync local language preferences", {
      message: String(error),
    });
  }
};

export const completeProfileRequest = async (data: any) => {
  try {
    const response = await api("/api/user/complete-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        avatarUrl: data.avatarUrl,
      }),
    });

    const resp = await response;
    return resp;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Please check your details and try again.";
    Toast.show({
      type: "error",
      text1: "Failed update profile",
      text2: errorMessage,
    });
  }
};

export const verifyOtpRequest = async (data: any) => {
  try {
    const response = await api("/api/auth/otp/msg91/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: data.phone,
        otp: data.otp,
      }),
    });

    const resp = await response;
    return resp;
  } catch (error) {
    throw error;
  }
};

export const sendOtpRequest = async (data: any) => {
  try {
    const response = await api("/api/auth/otp/msg91/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: data.phone,
      }),
    });
    const resp = await response;
    return resp;
  } catch (error) {
    throw error;
  }
};

export interface EmailSignupData {
  fullname: string;
  email: string;
  password: string;
  otp: string;
}

export const sendSignupOtp = (email: string) =>
  api("/api/auth/signup/send-otp", {
    method: "POST",
    body: { email: email.trim() },
  });

export const signupWithOtp = (data: EmailSignupData) =>
  api("/api/auth/signup/verified", {
    method: "POST",
    body: {
      email: data.email.trim(),
      name: data.fullname,
      password: data.password,
      otp: data.otp,
    },
  });

export type SignupDetails = Omit<EmailSignupData, "otp">;

/** Sends the signup code; `onSent` gets the details that were submitted. */
export const useSendSignupOtp = (onSent: (details: SignupDetails) => void) =>
  useMutation({
    mutationFn: (details: SignupDetails) => sendSignupOtp(details.email),
    onSuccess: (_data, details) => {
      capture(ProductEvent.OtpRequested, { method: "email" });
      onSent(details);
    },
    onError: (error: any) => {
      captureAuthFailure("email", "otp_request", error);
      Toast.show({
        type: "error",
        text1: "OTP Failed",
        text2: error.message || "Failed to send OTP",
      });
    },
  });

const handleAuthRedirect = (
  navigation: any,
  redirect: { screen: string; params?: any },
) => {
  if (redirect.screen === "Video") {
    navigation.reset({
      index: 2,
      routes: [
        { name: "MainTabs" },
        {
          name: "SeriesDetail",
          params: {
            id: redirect.params?.id,
            posterUrl: redirect.params?.posterUrl,
          },
        },
        { name: "Video", params: redirect.params },
      ],
    });
  } else {
    navigation.reset({
      index: 1,
      routes: [
        { name: "MainTabs" },
        { name: redirect.screen, params: redirect.params },
      ],
    });
  }
};

export const useVerifyOtpMutation = (redirect?: {
  screen: string;
  params?: any;
}) => {
  const navigation = useNavigation();

  return useMutation({
    mutationFn: async (data: { phone: string; otp: string }) => {
      const response = await verifyOtpRequest(data);
      return response;
    },
    onSuccess: async (data) => {
      if (data?.token && data?.user) {
        await useAuthStore.getState().saveToken(data.token);
        // setUser identifies the PostHog person, so it must land BEFORE the
        // event or `signed_in` is attributed to the anonymous id instead.
        await useAuthStore.getState().setUser(data.user);
        await syncLanguagesAfterAuth();

        // `needs_profile` mirrors the app's own routing test below rather than
        // claiming to mean "new account": the phone endpoint upserts, so a fresh
        // account is genuinely not observable here (see AuthMethod).
        capture(ProductEvent.SignedIn, {
          method: "phone_otp",
          needs_profile: data?.user?.name === "User",
          role: String(data?.user?.role ?? "USER"),
        });
        log.info("Signed in", {
          method: "phone_otp",
          needs_profile: data?.user?.name === "User",
        });

        if (data?.user?.name === "User") {
          (navigation as any).reset({
            index: 0,
            routes: [{ name: "CompleteProfile" }],
          });
        } else {
          if (redirect) {
            handleAuthRedirect(navigation, redirect);
          } else {
            (navigation as any).reset({
              index: 0,
              routes: [{ name: postAuthRoute() }],
            });
          }
        }
      } else {
        Toast.show({
          type: "error",
          text1: "Verification Failed",
          text2: data?.message || "Invalid response from server",
        });
      }
    },
    onError: (error: any) => {
      captureAuthFailure("phone_otp", "otp_verify", error);
      Toast.show({
        type: "error",
        text1: "OTP verification Failed",
        text2: `${error.message || "Please enter correct OTP and try again."}`,
      });
    },
  });
};

export const useSendOtpMutation = (onSuccessCallback?: (data: any) => void) => {
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await sendOtpRequest(data);
      return response;
    },
    onSuccess: (data) => {
      if (data?.success) {
        // First half of the phone funnel. The drop-off between this and
        // `signed_in{method:phone_otp}` is the OTP delivery/entry failure rate,
        // which is invisible from either event on its own.
        capture(ProductEvent.OtpRequested, { method: "phone_otp" });
        log.info("OTP sent");

        if (onSuccessCallback) {
          onSuccessCallback(data);
        }
      } else if (data) {
        Toast.show({
          type: "error",
          text1: "OTP Failed",
          text2: data?.message || "Failed to send OTP",
        });
      }
    },
    onError: (error: any) => {
      captureAuthFailure("phone_otp", "otp_request", error);
      Toast.show({
        type: "error",
        text1: "OTP Failed",
        text2: error.message || "Failed to send OTP",
      });
    },
  });
};

/** Wrong/expired/used code: the screen shows it inline instead of a toast. */
export const isInvalidOtpError = (error: any) => error?.code === "INVALID_OTP";

const useAuthRedirect = (redirect?: { screen: string; params?: any }) => {
  const navigation = useNavigation();
  return () => {
    if (redirect) {
      handleAuthRedirect(navigation, redirect);
    } else {
      (navigation as any).reset({
        index: 0,
        routes: [{ name: postAuthRoute() }],
      });
    }
  };
};

/**
 * Creates the account from a verified email code. The session is only started
 * by `finish`, which the caller runs from the "Email verified" step, so the
 * success step isn't unmounted by the auth-state change underneath it.
 */
export const useRequest = (
  redirect: { screen: string; params?: any } | undefined,
  {
    onAccountCreated,
    onInvalidOtp,
  }: {
    onAccountCreated: (finish: () => Promise<void>) => void;
    onInvalidOtp: () => void;
  },
) => {
  const goAfterAuth = useAuthRedirect(redirect);

  return useMutation({
    mutationFn: signupWithOtp,
    onSuccess: async (data) => {
      if (data?.token) {
        if (data?.user?.id) {
          identifyUser(String(data.user.id), {
            email: data.user.email ?? null,
            name: data.user.name ?? null,
          });
        }

        // The ONLY unambiguous registration in the app: /api/auth/signup creates
        // accounts and nothing else.
        capture(ProductEvent.SignedUp, {
          method: "email",
          role: String(data?.user?.role ?? "USER"),
        });
        log.info("Account created", { method: "email" });

        onAccountCreated(async () => {
          await useAuthStore.getState().saveToken(data.token);
          // Signup does not receive its user through setUser here. The language
          // sync refreshes userData after the token is available, which also
          // supplies the authoritative onboarding timestamp for routing.
          await syncLanguagesAfterAuth();
          goAfterAuth();
        });
      }
    },
    onError: (error: any) => {
      captureAuthFailure("email", "signup", error);
      if (isInvalidOtpError(error)) return onInvalidOtp();
      Toast.show({
        type: "error",
        text1: "Signup Failed",
        text2: `${error.message || "Please check your details and try again."}`,
      });
    },
  });
};

// Unverified emails get `requiresEmailOtp` (a code is emailed) instead of a token.
export const login = (data: { email: string; password: string }) =>
  api("/api/auth/login/v2", {
    method: "POST",
    body: { email: data.email.trim(), password: data.password },
  });

export const verifyLoginOtp = (data: { email: string; otp: string }) =>
  api("/api/auth/login/verify-otp", {
    method: "POST",
    body: { email: data.email.trim(), otp: data.otp },
  });

const useCompleteEmailLogin = (redirect?: {
  screen: string;
  params?: any;
}) => {
  const goAfterAuth = useAuthRedirect(redirect);

  return async (data: any) => {
    await useAuthStore.getState().saveToken(data.token);
    await useAuthStore.getState().setUser(data.user);
    await syncLanguagesAfterAuth();
    capture(ProductEvent.SignedIn, {
      method: "email",
      role: String(data?.user?.role ?? "USER"),
    });
    log.info("Signed in", { method: "email" });
    goAfterAuth();
  };
};

export const useLogin = (
  redirect: { screen: string; params?: any } | undefined,
  /** Gets the credentials that were submitted, not the live form values. */
  onOtpRequired: (credentials: { email: string; password: string }) => void,
) => {
  const completeLogin = useCompleteEmailLogin(redirect);

  return useMutation({
    mutationFn: login,
    onSuccess: async (data, variables) => {
      if (data?.requiresEmailOtp) {
        capture(ProductEvent.OtpRequested, { method: "email" });
        onOtpRequired({ ...variables, email: variables.email.trim() });
      } else if (data?.token) {
        await completeLogin(data);
      }
    },
    onError: (error: any) => {
      captureAuthFailure("email", "login", error);
      Toast.show({
        type: "error",
        text1: "Login Failed",
        text2: error.message || "Please verify your email and password, then try again.",
      });
    },
  });
};

export const useVerifyLoginOtp = (
  redirect: { screen: string; params?: any } | undefined,
  onInvalidOtp: () => void,
) => {
  const completeLogin = useCompleteEmailLogin(redirect);

  return useMutation({
    mutationFn: verifyLoginOtp,
    onSuccess: async (data) => {
      if (data?.token) await completeLogin(data);
    },
    onError: (error: any) => {
      captureAuthFailure("email", "otp_verify", error);
      if (isInvalidOtpError(error)) return onInvalidOtp();
      Toast.show({
        type: "error",
        text1: "OTP verification Failed",
        text2: error.message || "Please enter correct OTP and try again.",
      });
    },
  });
};

export const requestPasswordReset = async ({
  email,
}: ResetPasswordLinkParams): Promise<ResetPasswordLinkResponse> => {
  return api("/api/auth/reset-password", {
    method: "POST",
    body: { email: email.trim() },
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: requestPasswordReset,
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: "Reset link failed",
        text2: error.message || "Something went wrong, please try again.",
      });
    },
  });
};

export const googleAuthApi = async (idToken: string) => {
  const response = await api("/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: idToken }),
  });
  return response;
};

export const useGoogleLogin = (redirect?: { screen: string; params?: any }) => {
  const navigation = useNavigation();

  return useMutation({
    mutationFn: async (data: any) => {
      return await googleAuthApi(data);
    },
    onSuccess: async (data) => {
      if (data?.token) {
        await useAuthStore.getState().saveToken(data.token);
        await useAuthStore.getState().setUser(data.user);
        await syncLanguagesAfterAuth();
        capture(ProductEvent.SignedIn, {
          method: "google",
          role: String(data?.user?.role ?? "USER"),
        });
        log.info("Signed in", { method: "google" });

        if (redirect) {
          handleAuthRedirect(navigation, redirect);
        } else {
          (navigation as any).reset({
            index: 0,
            routes: [{ name: postAuthRoute() }],
          });
        }
      }
    },
    onError: (error: any) => {
      captureAuthFailure("google", "login", error);
      console.log("Login Failed", error.message);
      Toast.show({
        type: "error",
        text1: "Google login failed",
        text2: error.message || "Please try again.",
      });
    },
  });
};

export const fetchUserData = async () => {
  try {
    const response = await api("/api/user/userInfo-v2", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response) return null;
    const data = await response;
    return data;
  } catch (error) {
    if (error instanceof Error) {
      console.log("user Error", error.message);
    } else {
      console.log("user Error", error);
    }
    return null;
  }
};

export const useUserData = (token: string | null) => {
  return useQuery({
    queryKey: ["userData"],
    queryFn: fetchUserData,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 1,
    enabled: !!token,
  });
};

export const deleteAccount = async () => {
  try {
    const response = await api("/api/auth/delete/soft", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response;
    return data;
  } catch (error) {
    console.error("Delete account error:", error);
    throw error;
  }
};

export const useDeleteUserAccount = () => {
  const navigation = useNavigation();

  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      // BEFORE logout, which calls resetAnalytics(): once the person is unbound
      // this event would land on a fresh anonymous id and never attach to the
      // account that was actually deleted — making it useless for churn.
      capture(ProductEvent.AccountDeleted, {
        role: String(useAuthStore.getState().user?.role ?? "USER"),
      });
      log.info("Account deleted");

      await useAuthStore.getState().logout();
      (navigation as any).reset({
        index: 0,
        routes: [{ name: "MainTabs" }],
      });
    },
    onError: (error) => {
      console.log("Account delete failed:", error.message);
    },
  });
};

export const appleAuthApi = async (idToken: string) => {
  try {
    const response = await api("/api/auth/apple-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identityToken: idToken }),
    });

    return response;
  } catch (error) {
    throw error;
  }
};

export const useAppleLogin = (redirect?: { screen: string; params?: any }) => {
  const navigation = useNavigation();

  return useMutation({
    mutationFn: async (token: string) => {
      return await appleAuthApi(token);
    },
    onSuccess: async (data) => {
      if (data?.token) {
        await useAuthStore.getState().saveToken(data.token);
        await useAuthStore.getState().setUser(data.user);
        await syncLanguagesAfterAuth();
        capture(ProductEvent.SignedIn, {
          method: "apple",
          role: String(data?.user?.role ?? "USER"),
        });
        log.info("Signed in", { method: "apple" });

        if (redirect) {
          handleAuthRedirect(navigation, redirect);
        } else {
          (navigation as any).reset({
            index: 0,
            routes: [{ name: postAuthRoute() }],
          });
        }
      }
    },
    onError: (error: any) => {
      captureAuthFailure("apple", "login", error);
      Toast.show({
        type: "error",
        text1: "Apple login failed",
        text2: `${error.message || "Please verify your account, then try again."
          }`,
      });
    },
  });
};
