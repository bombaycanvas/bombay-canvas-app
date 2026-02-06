package com.bombaycanvas;

import android.content.Context;

import com.google.android.gms.cast.framework.CastOptions;
import com.google.android.gms.cast.framework.OptionsProvider;
import com.google.android.gms.cast.framework.SessionProvider;
import com.google.android.gms.cast.framework.media.CastMediaOptions;
import com.google.android.gms.cast.framework.media.MediaIntentReceiver;
import com.google.android.gms.cast.framework.media.NotificationOptions;

import java.util.Arrays;
import java.util.List;

public class CastOptionsProvider implements OptionsProvider {

        @Override
        public CastOptions getCastOptions(Context context) {

                // -------- Notification Controls --------
                NotificationOptions notificationOptions = new NotificationOptions.Builder()
                                .setActions(
                                                Arrays.asList(
                                                                MediaIntentReceiver.ACTION_SKIP_PREV,
                                                                MediaIntentReceiver.ACTION_TOGGLE_PLAYBACK,
                                                                MediaIntentReceiver.ACTION_SKIP_NEXT,
                                                                MediaIntentReceiver.ACTION_STOP_CASTING),
                                                new int[] { 1, 2, 3 } // Which buttons show in compact view
                                )
                                .build();

                // -------- Media Options --------
                CastMediaOptions mediaOptions = new CastMediaOptions.Builder()
                                .setNotificationOptions(notificationOptions)
                                .build();

                // -------- Cast Options --------
                return new CastOptions.Builder()
                                // Default Google Receiver (Safe for MP4 + HLS)
                                .setReceiverApplicationId("CC1AD845")
                                .setCastMediaOptions(mediaOptions)
                                .build();
        }

        @Override
        public List<SessionProvider> getAdditionalSessionProviders(Context context) {
                return null;
        }
}
