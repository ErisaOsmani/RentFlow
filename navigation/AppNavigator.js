import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';

import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import HomeScreen from '../screens/HomeScreen';
import OwnerHomeScreen from '../screens/OwnerHomeScreen';
import AdminHomeScreen from '../screens/AdminHomeScreen';

import BookingScreen from '../screens/BookingScreen';
import BookingHistoryScreen from '../screens/BookingHistoryScreen';
import OwnerBookingHistoryScreen from '../screens/OwnerBookingHistoryScreen';
import SearchScreen from '../screens/SearchScreen';

import AddApartmentScreen from '../screens/AddApartmentScreen';
import ApartmentDetailScreen from '../screens/ApartmentDetailScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="ApartmentDetail" component={ApartmentDetailScreen} />
        <Stack.Screen name="Booking" component={BookingScreen} />
        <Stack.Screen name="BookingHistory" component={BookingHistoryScreen} />
        <Stack.Screen name="OwnerHome" component={OwnerHomeScreen} />
        <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
        <Stack.Screen name="OwnerBookingHistory" component={OwnerBookingHistoryScreen} />
        <Stack.Screen name="AddApartment" component={AddApartmentScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
