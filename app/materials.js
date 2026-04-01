import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert, Platform, Linking } from 'react-native';
import { Text, Surface, TouchableRipple, Avatar, useTheme, Button, ProgressBar, IconButton, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBlobUtil from 'react-native-blob-util';
import api from '../utils/api';
import { getAccessToken } from '../utils/tokenStorage';

const DOWNLOAD_STORAGE_KEY = 'downloadedSecureMaterialsV2';

const formatBytes = (bytes) => {
  const value = Number(bytes) || 0;
  if (value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const sized = value / (1024 ** index);
  return `${sized.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const formatUploadedDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString();
};

export default function Materials() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const [downloadedFiles, setDownloadedFiles] = useState({});
  const [downloadProgress, setDownloadProgress] = useState({});
  const [downloadingMap, setDownloadingMap] = useState({});
  const [studyMaterials, setStudyMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);

  const getAuthHeaders = async () => {
    const token = await getAccessToken();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const loadDownloadedFiles = async () => {
      try {
        const cached = await AsyncStorage.getItem(DOWNLOAD_STORAGE_KEY);
        if (!cached) return;

        const parsed = JSON.parse(cached);
        if (!parsed || typeof parsed !== 'object') return;

        const validated = {};
        const entries = Object.entries(parsed);

        for (const [materialId, filePath] of entries) {
          const exists = await ReactNativeBlobUtil.fs.exists(filePath);
          if (exists) {
            validated[materialId] = filePath;
          }
        }

        setDownloadedFiles(validated);
        await AsyncStorage.setItem(DOWNLOAD_STORAGE_KEY, JSON.stringify(validated));
      } catch (error) {
        console.log('Failed loading downloaded files', error.message);
      }
    };

    loadDownloadedFiles();
  }, []);

  useEffect(() => {
    const loadStudyMaterials = async () => {
      try {
        setLoadingMaterials(true);
        const response = await api.get('/secure-files/files/');
        const rows = Array.isArray(response.data) ? response.data : [];

        const mapped = rows.map((row) => ({
          id: String(row.id),
          fileId: row.id,
          title: row.original_name || `File ${row.id}`,
          sub: `${(row.content_type || 'FILE').toUpperCase()} • ${formatBytes(row.size)}`,
          url: row.download_url || null,
          apiDownloadUrl: `${api.defaults.baseURL}/secure-files/files/${row.id}/download/`,
          uploadedAt: row.uploaded_at || null,
        }));

        mapped.sort((left, right) => {
          const leftTime = left.uploadedAt ? new Date(left.uploadedAt).getTime() : 0;
          const rightTime = right.uploadedAt ? new Date(right.uploadedAt).getTime() : 0;
          return rightTime - leftTime;
        });

        setStudyMaterials(mapped);
      } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403 || error.isSessionExpired) {
          Alert.alert('Session expired', 'Please log in again.');
          router.replace('/');
          return;
        }

        console.log('Failed to load study materials', error.response?.data || error.message);
        setStudyMaterials([]);
      } finally {
        setLoadingMaterials(false);
      }
    };

    loadStudyMaterials();
  }, [router]);

  const openPDF = (url) => {
    router.push({
      pathname: "/pdfViewer",
      params: { url: encodeURIComponent(url) }
    });
  };

  const getAppDownloadPath = (item) => {
    const ext = '.pdf';
    return `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/material_${item.id}${ext}`;
  };

  const getMaterialUrl = async (item) => {
    if (!item?.fileId) {
      return item?.url || null;
    }

    try {
      const response = await api.get(`/secure-files/files/${item.fileId}/download-url/`);
      return response?.data?.download_url || item?.url || null;
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403 || error.isSessionExpired) {
        Alert.alert('Session expired', 'Please log in again.');
        router.replace('/');
        return null;
      }
      return item?.url || null;
    }
  };

  const handleDownloadToPublicDownloads = async (item) => {
    if (downloadingMap[item.id]) return;

    try {
      setDownloadingMap((prev) => ({ ...prev, [item.id]: true }));
      setDownloadProgress((prev) => ({ ...prev, [item.id]: 0 }));

      const fileName = `${item.title.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || `material_${item.id}`}.pdf`;
      const filePath = `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${fileName}`;

      const remoteUrl = item.apiDownloadUrl || item.url;
      if (!remoteUrl) {
        throw new Error('Missing download URL');
      }

      const headers = await getAuthHeaders();

      const task = ReactNativeBlobUtil.config({
        fileCache: true,
        path: filePath,
        addAndroidDownloads: {
          useDownloadManager: true,
          notification: true,
          mediaScannable: true,
          title: fileName,
          mime: 'application/pdf',
          path: filePath,
          description: t('downloadDescription'),
        },
      }).fetch('GET', remoteUrl, headers);

      task.progress((received, total) => {
        if (!total) return;
        const progress = received / total;
        setDownloadProgress((prev) => ({ ...prev, [item.id]: progress }));
      });

      await task;

      const updated = {
        ...downloadedFiles,
        [item.id]: filePath,
      };

      setDownloadedFiles(updated);
      await AsyncStorage.setItem(DOWNLOAD_STORAGE_KEY, JSON.stringify(updated));

      Alert.alert(
        t('downloadCompleteTitle'),
        `${t('downloadCompleteMessage')}\n${t('downloadSavedAt')} ${filePath}`
      );
    } catch (error) {
      console.log('Download failed', error.message);
      Alert.alert(t('downloadFailedTitle'), t('downloadFailedMessage'));
    } finally {
      setDownloadingMap((prev) => ({ ...prev, [item.id]: false }));
      setDownloadProgress((prev) => ({ ...prev, [item.id]: 0 }));
    }
  };

  const handleDownloadToAppStorage = async (item, options = {}) => {
    if (Platform.OS === 'web') {
      openPDF(item.url);
      return;
    }

    if (downloadingMap[item.id]) return;

    try {
      setDownloadingMap((prev) => ({ ...prev, [item.id]: true }));
      setDownloadProgress((prev) => ({ ...prev, [item.id]: 0 }));

      const filePath = getAppDownloadPath(item);
      const remoteUrl = item.apiDownloadUrl || item.url;
      if (!remoteUrl) {
        throw new Error('Missing download URL');
      }

      const headers = await getAuthHeaders();

      const task = ReactNativeBlobUtil.config({
        path: filePath,
        fileCache: true,
      }).fetch('GET', remoteUrl, headers);

      task.progress((received, total) => {
        if (!total) return;
        const progress = received / total;
        setDownloadProgress((prev) => ({ ...prev, [item.id]: progress }));
      });

      await task;

      const updated = {
        ...downloadedFiles,
        [item.id]: filePath,
      };

      setDownloadedFiles(updated);
      await AsyncStorage.setItem(DOWNLOAD_STORAGE_KEY, JSON.stringify(updated));

      if (options.showSuccessAlert !== false) {
        Alert.alert(
          t('downloadCompleteTitle'),
          `${t('downloadCompleteMessage')}\n${t('downloadSavedAt')} ${filePath}`
        );
      }

      return filePath;
    } catch (error) {
      console.log('Download failed', error.message);
      if (options.showErrorAlert !== false) {
        Alert.alert(t('downloadFailedTitle'), t('downloadFailedMessage'));
      }
      return null;
    } finally {
      setDownloadingMap((prev) => ({ ...prev, [item.id]: false }));
      setDownloadProgress((prev) => ({ ...prev, [item.id]: 0 }));
    }
  };

  const handleDownload = async (item) => {
    let remoteUrl = item.apiDownloadUrl;
    if (Platform.OS === 'web') {
      remoteUrl = await getMaterialUrl(item);
    }

    if (!remoteUrl) {
      Alert.alert(t('downloadFailedTitle'), 'No download URL available for this file.');
      return;
    }

    const hydratedItem = { ...item, url: remoteUrl };

    if (Platform.OS === 'web') {
      Linking.openURL(hydratedItem.url);
      return;
    }

    if (Platform.OS === 'android') {
      Alert.alert(
        t('downloadLocationTitle'),
        t('downloadLocationMessage'),
        [
          {
            text: t('downloadToDevice'),
            onPress: () => handleDownloadToPublicDownloads(hydratedItem),
          },
          {
            text: t('downloadInBrowser'),
            onPress: () => Linking.openURL(hydratedItem.url),
          },
          {
            text: t('downloadToAppStorage'),
            onPress: () => handleDownloadToAppStorage(hydratedItem),
          },
          {
            text: t('cancelAction'),
            style: 'cancel',
          },
        ]
      );
      return;
    }

    Alert.alert(
      t('downloadLocationTitle'),
      t('downloadLocationMessageIOS'),
      [
        {
          text: t('downloadInBrowser'),
          onPress: () => Linking.openURL(hydratedItem.url),
        },
        {
          text: t('downloadToAppStorage'),
          onPress: () => handleDownloadToAppStorage(hydratedItem),
        },
        {
          text: t('cancelAction'),
          style: 'cancel',
        },
      ]
    );
  };

  const handleView = async (item) => {
    const localPath = downloadedFiles[item.id];
    if (localPath) {
      openPDF(localPath);
      return;
    }

    if (Platform.OS === 'web') {
      const remoteUrl = await getMaterialUrl(item);
      if (!remoteUrl) {
        Alert.alert('Unavailable', 'This file is not currently available.');
        return;
      }

      openPDF(remoteUrl);
      return;
    }

    const filePath = await handleDownloadToAppStorage(item, {
      showSuccessAlert: false,
      showErrorAlert: true,
    });

    if (filePath) {
      openPDF(filePath);
    }
  };

  const renderItem = ({ item }) => (
    <Surface
      style={[
        styles.card,
        {
          backgroundColor: theme.dark ? theme.colors.surfaceVariant : theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.dark ? 'transparent' : 'rgba(0,0,0,0.05)',
        },
      ]}
      elevation={theme.dark ? 2 : 0}
    >
      <TouchableRipple
        onPress={() => handleView(item)}
        borderRadius={20}
        style={styles.ripple}
      >
        <View style={styles.cardContent}>
          <Avatar.Icon
            icon="file-pdf-box"
            size={48}
            color={theme.colors.error}
            style={{ backgroundColor: theme.colors.errorContainer, marginBottom: 10 }}
          />

          <Text
            style={[styles.cardTitle, { color: theme.colors.onSurface }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          <Text
            style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
          >
            {item.sub}
          </Text>

          {!!item.uploadedAt && (
            <Text
              style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, marginTop: 4 }}
            >
              Uploaded: {formatUploadedDate(item.uploadedAt)}
            </Text>
          )}

          {downloadingMap[item.id] && (
            <ProgressBar
              progress={downloadProgress[item.id] || 0}
              color={theme.colors.primary}
              style={styles.downloadProgress}
            />
          )}

          <View style={styles.actionRow}>
            <Button
              mode="text"
              compact
              onPress={() => handleView(item)}
              style={styles.actionButton}
            >
              {t('materialView')}
            </Button>

            <IconButton
              icon={downloadedFiles[item.id] ? 'check-circle' : 'download'}
              disabled={!!downloadingMap[item.id]}
              onPress={() => handleDownload(item)}
              mode="contained"
              containerColor={theme.colors.primaryContainer}
              iconColor={theme.colors.onPrimaryContainer}
              style={styles.downloadIconButton}
            />
          </View>

          {!!downloadedFiles[item.id] && (
            <Text style={[styles.downloadPath, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
              {t('downloadSavedAt')} {downloadedFiles[item.id]}
            </Text>
          )}
        </View>
      </TouchableRipple>
    </Surface>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text
        variant="headlineSmall"
        style={[styles.header, { color: theme.colors.onBackground }]}
      >
        {t('matHeadline')}
      </Text>

      <FlatList
        data={studyMaterials}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        ListEmptyComponent={
          loadingMaterials ? (
            <View style={styles.emptyStateWrap}>
              <ActivityIndicator animating color={theme.colors.primary} />
            </View>
          ) : (
            <View style={styles.emptyStateWrap}>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                No study materials uploaded yet.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { marginTop: 15, marginBottom: 20, fontWeight: '900', letterSpacing: 0.5 },
  card: {
    flex: 1,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 4,
  },
  ripple: {
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
  cardContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardTitle: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionRow: {
    marginTop: 12,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  downloadIconButton: {
    margin: 0,
  },
  downloadProgress: {
    width: '100%',
    marginTop: 10,
    marginBottom: 2,
  },
  downloadPath: {
    width: '100%',
    fontSize: 11,
    marginTop: 6,
    opacity: 0.85,
  },
  emptyStateWrap: {
    width: '100%',
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});