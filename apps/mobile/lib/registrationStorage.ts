import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'woeschplan_reg_token_';

export async function saveRegistrationToken(buildingId: string, token: string) {
  await AsyncStorage.setItem(`${PREFIX}${buildingId}`, token);
}

export async function getRegistrationToken(buildingId: string): Promise<string | null> {
  return AsyncStorage.getItem(`${PREFIX}${buildingId}`);
}

export async function clearRegistrationToken(buildingId: string) {
  await AsyncStorage.removeItem(`${PREFIX}${buildingId}`);
}
