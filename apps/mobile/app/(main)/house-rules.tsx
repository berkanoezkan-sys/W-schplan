import { Redirect } from 'expo-router';

/** Legacy route – building settings now live on the main Settings tab. */
export default function HouseRulesScreen() {
  return <Redirect href="/(main)/settings" />;
}
