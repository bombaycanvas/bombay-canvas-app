import { useMemo, useState } from 'react';
import { useVideoStore } from '../../store/videoStore';
import {
  View,
  Text,
  Modal,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useApplyCoupon, useRazorpayPayment } from '../../api/video';
import Toast from 'react-native-toast-message';
import LockOutlined from '../../assets/LockOutlined';
import RefundIcon from '../../assets/RefundIcon';

export function PurchaseModal() {
  const { isPurchaseModal, purchaseSeries, resetPurchaseState, setPaused } =
    useVideoStore();

  const [coupon, setCoupon] = useState('');
  const [couponId, setCouponId] = useState<string | null>(null);
  const [finalPrice, setFinalPrice] = useState<number | null>(
    purchaseSeries?.price,
  );
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
    setFinalPrice(null);
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
          setFinalPrice(null);
          setLoading(false);

          setTimeout(() => {
            resetPurchaseState();
            setPaused(false);
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

  const { firstLine, secondLine } = useMemo(() => {
    const words = purchaseSeries?.title?.split(' ') || [];
    return {
      firstLine: words?.slice(0, 1).join(' '),
      secondLine: words?.slice(1).join(' '),
    };
  }, [purchaseSeries?.title]);

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
        <Toast topOffset={30} position="top" />
        <View style={styles.modal}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.closeBtn}
            onPress={close}
          >
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>
          <Text style={styles.mainTitle}>Unlock {firstLine}</Text>
          {secondLine.length > 0 && (
            <Text style={styles.mainTitle}>{secondLine}</Text>
          )}
          <Text style={styles.subTitle}>Watch instantly in HD</Text>

          <Text style={styles.price}>₹{purchaseSeries?.price}</Text>
          <Text style={styles.priceSub}>
            All taxes included • One-time payment
          </Text>

          <View style={styles.inputDetailWrapper}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Have a coupon?"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={coupon}
                onChangeText={setCoupon}
                autoCapitalize="none"
              />
              <TouchableOpacity
                activeOpacity={0.9}
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

            <View style={styles.checkList}>
              <Text style={styles.check}>✓ Instant access</Text>
              <Text style={styles.check}>✓ No ads · No subscription</Text>
              <Text style={styles.check}>✓ Secure payment</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.payBtn}
            onPress={handlePayNow}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.payBtnText}>
                Unlock Now for ₹ {finalPrice ?? purchaseSeries?.price}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.footer}>
            Safe & secure payment · Instant access
          </Text>
          <View style={styles.paymentInfoWrapper}>
            <View style={styles.paymentRow}>
              <LockOutlined width={18} height={18} color="#888" />
              <Text style={styles.paymentInfo}>
                Payments secured by Razorpay / UPI / Cards
              </Text>
            </View>
            <View style={styles.refundRow}>
              <RefundIcon width={16} height={16} />
              <Text style={styles.refund}>7-day refund if playback issues</Text>
            </View>
          </View>
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
    backgroundColor: '#121212',
    paddingVertical: 30,
    paddingHorizontal: 25,
    borderRadius: 12,
    width: '88%',
    maxWidth: 400,
    alignItems: 'center',
  },
  mainTitle: {
    color: '#fff',
    fontSize: 25,
    fontWeight: '700',
    textAlign: 'center',
  },
  subTitle: {
    color: '#ccc',
    marginTop: 8,
    marginBottom: 5,
    textAlign: 'center',
    fontSize: 16,
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
  price: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '800',
    textAlign: 'center',
  },
  priceSub: {
    color: '#aaa',
    fontSize: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  inputDetailWrapper: {
    width: '85%',
    marginTop: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
  },
  input: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    color: '#fff',
    padding: 14,
    fontSize: 14,
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontWeight: 400,
  },
  applyBtn: {
    backgroundColor: '#1E1E1E',
    padding: 14,
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderColor: '#333',
  },
  applyBtnText: {
    fontWeight: '700',
    color: '#fff',
    fontSize: 15,
  },
  checkList: {
    marginTop: 10,
    width: '100%',
  },
  check: {
    color: '#fff',
    fontSize: 15,
    marginBottom: 6,
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
    width: '100%',
  },
  payBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    color: '#bbb',
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  paymentInfoWrapper: {
    width: '100%',
    marginTop: 20,
  },
  paymentInfo: {
    color: '#aaa',
    fontSize: 13,
  },
  refund: {
    color: '#aaa',
    fontSize: 13,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 5,
  },
  refundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 5,
  },
});
