import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Surface } from 'react-native-paper';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const forestryParks = [
  {
    id: 1,
    title: 'Bako National Park',
    description: 'Oldest national park in Sarawak, known for proboscis monkeys.',
    coordinate: { latitude: 1.7167, longitude: 110.4667 },
  },
  {
    id: 2,
    title: 'Kubah National Park',
    description: 'Home to the Matang Wildlife Centre and rare palms.',
    coordinate: { latitude: 1.6128, longitude: 110.197 },
  },
  {
    id: 3,
    title: 'Santubong National Park',
    description: 'Iconic mountain peak near the Kuching coastline.',
    coordinate: { latitude: 1.7628, longitude: 110.3222 },
  },
  {
    id: 4,
    title: 'Gunung Mulu National Park',
    description: 'UNESCO World Heritage site famous for its caves and pinnacles.',
    coordinate: { latitude: 4.0425, longitude: 114.8125 },
  },
  {
    id: 5,
    title: 'Niah National Park',
    description: 'Significant archaeological site with massive limestone caves.',
    coordinate: { latitude: 3.82, longitude: 113.78 },
  },
  {
    id: 6,
    title: 'Lambir Hills National Park',
    description: "One of the world's most complex and diverse forest ecosystems.",
    coordinate: { latitude: 4.2, longitude: 113.84 },
  },
];

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <MapContainer
        center={[2.5, 113.0]}
        zoom={7}
        style={{
          height: '100vh',
          width: '100vw',
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {forestryParks.map((park) => (
          <Marker
            key={park.id}
            position={[park.coordinate.latitude, park.coordinate.longitude]}
          >
            <Popup>
              <Surface style={styles.callout}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                  {park.title}
                </Text>
                <Text variant="bodySmall">{park.description}</Text>
              </Surface>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  callout: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'white',
    width: 220,
  },
});