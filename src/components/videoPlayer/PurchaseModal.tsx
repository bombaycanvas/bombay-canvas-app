import { useState } from 'react';
import { useVideoStore } from '../../store/videoStore';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useApplyCoupon, useRazorpayPayment } from '../../api/video';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';

export function PurchaseModal() {
  const { isPurchaseModal, purchaseSeries, resetPurchaseState } =
    useVideoStore();

  const [coupon, setCoupon] = useState('');
  const [couponId, setCouponId] = useState<string | null>(null);
  const [finalPrice, setFinalPrice] = useState<number>(purchaseSeries?.price);
  const [loading, setLoading] = useState(false);

  const { mutate: applyCoupon } = useApplyCoupon();
  const { mutate: payNow } = useRazorpayPayment();

  const handleApplyCoupon = () => {
    if (!coupon) {
      Toast.show({
        type: 'error',
        text1: 'Invalid coupon',
        text2: 'Please Enter a coupon code!',
      });
      return;
    }

    applyCoupon(
      { seriesId: purchaseSeries?.id, couponCode: coupon },
      {
        onSuccess: res => {
          setFinalPrice(res.finalPrice);
          setCouponId(res.couponId);
        },
        onError: () => {
          setCoupon('');
          setCouponId(null);
          setFinalPrice(purchaseSeries?.price);
        },
      },
    );
  };

  const close = () => {
    setCoupon('');
    setCouponId(null);
    setFinalPrice(purchaseSeries?.price);
    resetPurchaseState();
  };

  const handlePayNow = () => {
    if (!purchaseSeries?.id) return;
    setLoading(true);

    payNow(
      { seriesId: purchaseSeries.id, couponId: couponId },
      {
        onSuccess: () => {
          setCoupon('');
          setCouponId(null);
          setFinalPrice(purchaseSeries?.price);
          setLoading(false);

          setTimeout(() => {
            resetPurchaseState();
            close();
          }, 1000);
        },
        onError: () => {
          setCoupon('');
          setCouponId(null);
          setFinalPrice(purchaseSeries?.price);
          setLoading(false);
        },
      },
    );
  };

  return (
    <Modal
      visible={isPurchaseModal}
      transparent={true}
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={close}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Toast
          config={{ BaseToast, ErrorToast }}
          topOffset={60}
          position="top"
        />
        <View style={styles.modal}>
          <TouchableOpacity onPress={close} style={styles.closeBtn}>
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Buy {purchaseSeries?.title}</Text>
          <Text style={styles.subText}>
            Original Price: ₹{purchaseSeries?.price}
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Enter Coupon"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={coupon}
              onChangeText={setCoupon}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={handleApplyCoupon}
            >
              <Text style={styles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>

          {couponId && (
            <Text style={styles.success}>
              Coupon Applied ✔ Final: ₹{finalPrice}
            </Text>
          )}

          <TouchableOpacity
            style={styles.payBtn}
            onPress={handlePayNow}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.payBtnText}>
                Pay ₹{finalPrice ?? purchaseSeries?.price}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#1a1a1a',
    padding: 25,
    borderRadius: 12,
    width: '85%',
    maxWidth: 380,
    color: '#fff',
  },
  closeBtn: {
    position: 'absolute',
    right: 14,
    top: 10,
    zIndex: 10,
  },
  closeText: {
    fontSize: 26,
    color: '#fff',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 5,
    textAlign: 'center',
  },
  subText: {
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 15,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    marginRight: 4,
    backgroundColor: '#353535',
    color: '#fff',
    padding: 10,
    borderRadius: 6,
    height: 45,
    fontSize: 14,
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontWeight: 400,
  },
  applyBtn: {
    backgroundColor: '#ff9500',
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 6,
  },
  applyBtnText: {
    fontWeight: '700',
    color: '#fff',
  },
  success: {
    color: '#00ff95',
    fontWeight: 'bold',
    marginTop: 5,
    textAlign: 'center',
  },
  payBtn: {
    marginTop: 16,
    backgroundColor: '#ff6600',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
  },
  payBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
