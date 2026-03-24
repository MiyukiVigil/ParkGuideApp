import React, { useState } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { Text, Surface, useTheme } from 'react-native-paper';

// Coordinates for major Sarawak Forestry Parks
const forestryParks = [
  {
    id: 1,
    title: "Bako National Park",
    description: "Oldest national park in Sarawak, known for proboscis monkeys.",
    coordinate: { latitude: 1.7167, longitude: 110.4667 },
  },
  {
    id: 2,
    title: "Kubah National Park",
    description: "Home to the Matang Wildlife Centre and rare palms.",
    coordinate: { latitude: 1.6128, longitude: 110.1970 },
  },
  {
    id: 3,
    title: "Santubong National Park",
    description: "Iconic mountain peak near the Kuching coastline.",
    coordinate: { latitude: 1.7628, longitude: 110.3222 },
  },
  {
    id: 4,
    title: "Gunung Mulu National Park",
    description: "UNESCO World Heritage site famous for its caves and pinnacles.",
    coordinate: { latitude: 4.0425, longitude: 114.8125 },
  },
  {
    id: 5,
    title: "Niah National Park",
    description: "Significant archaeological site with massive limestone caves.",
    coordinate: { latitude: 3.8200, longitude: 113.7800 },
  },
  {
    id: 6,
    title: "Lambir Hills National Park",
    description: "One of the world's most complex and diverse forest ecosystems.",
    coordinate: { latitude: 4.2000, longitude: 113.8400 },
  }
];

export default function MapScreen() {
  const theme = useTheme();

  // Initial region centered roughly over Sarawak
  const [region] = useState({
    latitude: 2.5, 
    longitude: 113.0,
    latitudeDelta: 5.0, // Zoom level (higher = further away)
    longitudeDelta: 5.0,
  });

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE} // Forces Google Maps instead of Apple Maps
        style={styles.map}
        initialRegion={region}
      >
        {forestryParks.map((park) => (
          <Marker
            key={park.id}
            coordinate={park.coordinate}
            pinColor={theme.colors.primary} // Uses your app's primary theme color
          >
            <Callout tooltip>
              <Surface style={styles.callout}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{park.title}</Text>
                <Text variant="bodySmall">{park.description}</Text>
              </Surface>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  callout: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'white',
    width: 200,
    elevation: 4,
  },
});