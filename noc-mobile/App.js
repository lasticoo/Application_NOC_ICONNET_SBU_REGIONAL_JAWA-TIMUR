import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import LoginScreen   from './screens/LoginScreen';
import MainScreen    from './screens/MainScreen';
import ResultScreen  from './screens/ResultScreen';
import EditProfileScreen from './screens/EditProfileScreen';

import { forceMax } from './utils/brightness';

const Stack = createNativeStackNavigator();

export default function App() {
  // force max brightness sekali saat app boot
  useEffect(() => { forceMax(); }, []);

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{ headerShown: false, animation: 'fade' }}
      >
        <Stack.Screen name="Login"       component={LoginScreen} />
        <Stack.Screen name="Main"        component={MainScreen} />
        <Stack.Screen name="Result"      component={ResultScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
