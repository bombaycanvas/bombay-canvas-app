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

export const requestOtp = async (data: any) => {
  try {
    const response = await api("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: data.email,
        name: data.fullname,
        password: data.password,
      }),
    });

    const resp = await response;
    return resp;
  } catch (error) {
    if (error instanceof Error) {
      Toast.show({
        type: "error",
        text1: "Signup Failed",
        text2: `${error.message || "Please check your details and try again."}`,
      });
    } else {
      Toast.show({
        type: "error",
        text1: "Login Failed",
        text2: `${error || "Please verify your email and password, then try again"
          }`,
      });
    }
  }
};

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

export const useRequest = (redirect?: { screen: string; params?: any }) => {
  const navigation = useNavigation();

  return useMutation({
    mutationFn: async (data) => {
      const response = await requestOtp(data);
      return response;
    },
    onSuccess: async (data) => {
      if (data.token) {
        await useAuthStore.getState().saveToken(data.token);
        await syncLanguagesAfterAuth();

        // Signup does not receive its user through setUser here. The language
        // sync refreshes userData after the token is available, which also
        // supplies the authoritative onboarding timestamp for routing.
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
    onError: (error) => {
      captureAuthFailure("email", "signup", error);
      Toast.show({
        type: "error",
        text1: "Signup Failed",
        text2: `${error.message || "Please check your details and try again."}`,
      });
    },
  });
};

export const login = async (data: any) => {
  try {
    const response = await api("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: data.email,
        password: data.password,
      }),
    });

    const resp = await response;
    return resp;
  } catch (error) {
    throw error;
  }
};

export const useLogin = (redirect?: { screen: string; params?: any }) => {
  const navigation = useNavigation();

  return useMutation({
    mutationFn: async (data) => {
      const response = await login(data);
      return response;
    },
    onSuccess: async (data) => {
      if (data?.token) {
        await useAuthStore.getState().saveToken(data.token);
        await useAuthStore.getState().setUser(data.user);
        await syncLanguagesAfterAuth();
        capture(ProductEvent.SignedIn, {
          method: "email",
          role: String(data?.user?.role ?? "USER"),
        });
        log.info("Signed in", { method: "email" });

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
      captureAuthFailure("email", "login", error);
      Toast.show({
        type: "error",
        text1: "Login Failed",
        text2: error.message || "Please verify your email and password, then try again.",
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
