import React, { ReactNode, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import CountrySelect, {
  getAllCountries,
  type ICountryCca2,
} from 'react-native-country-select';
import { isSupportedCountry, type CountryCode } from 'libphonenumber-js';
import { callingCodeOf } from '../../utils/phone';
import ProfileField from './ProfileField';

const POPULAR_COUNTRIES = ['IN', 'US', 'GB', 'AE', 'CA', 'AU'];
// Regions with no numbering plan (Antarctica, Pitcairn…) can't be dialled
// and would make every phone helper throw.
const UNDIALLABLE_COUNTRIES: ICountryCca2[] = getAllCountries()
  .map(c => c.cca2)
  .filter(cca2 => !isSupportedCountry(cca2));

interface PhoneFieldProps {
  country: CountryCode;
  onChangeCountry: (country: CountryCode) => void;
  number: string;
  onChangeNumber: (number: string) => void;
  readOnly?: boolean;
  accessory?: ReactNode;
  hint?: string;
}

/** Country-code picker and national number as two separate inputs. */
const PhoneField = ({
  country,
  onChangeCountry,
  number,
  onChangeNumber,
  readOnly,
  accessory,
  hint,
}: PhoneFieldProps) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  return (
    <View>
      <View style={styles.row}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.codeBox, readOnly && styles.codeBoxReadOnly]}
          onPress={() => setIsPickerOpen(true)}
          disabled={readOnly}
          accessibilityLabel="Country code"
        >
          <Image
            source={{
              uri: `https://flagcdn.com/w80/${country.toLowerCase()}.png`,
            }}
            style={styles.flag}
            resizeMode="contain"
          />
          <Text style={[styles.code, readOnly && styles.codeReadOnly]}>
            {callingCodeOf(country)}
          </Text>
          {!readOnly && (
            <Ionicons
              name="chevron-down"
              size={14}
              color="rgba(255,255,255,0.5)"
            />
          )}
        </TouchableOpacity>

        <View style={styles.numberBox}>
          <ProfileField
            icon="call-outline"
            readOnly={readOnly}
            value={number}
            onChangeText={text => onChangeNumber(text.replace(/[^\d\s]/g, ''))}
            placeholder="Phone number"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            maxLength={17}
            accessory={accessory}
          />
        </View>
      </View>
      {!!hint && <Text style={styles.hint}>{hint}</Text>}

      <CountrySelect
        visible={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={selected => {
          if (isSupportedCountry(selected.cca2)) onChangeCountry(selected.cca2);
          setIsPickerOpen(false);
        }}
        theme="dark"
        modalType="bottomSheet"
        popularCountries={POPULAR_COUNTRIES}
        hiddenCountries={UNDIALLABLE_COUNTRIES}
        searchSelectionColor="#ff6a00"
      />
    </View>
  );
};

export default PhoneField;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 50,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  codeBoxReadOnly: {
    paddingRight: 12,
  },
  flag: {
    width: 22,
    height: 16,
    borderRadius: 2,
  },
  code: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  codeReadOnly: {
    color: 'rgba(255,255,255,0.6)',
  },
  numberBox: {
    flex: 1,
    minWidth: 0,
  },
  hint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
    marginLeft: 5,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
});
