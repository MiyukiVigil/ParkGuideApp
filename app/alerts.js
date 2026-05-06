import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Avatar, Button, Divider, Modal, Portal, Surface, Text, TouchableRipple, useTheme } from "react-native-paper";
import { WebView } from "react-native-webview";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import AppHeader from "../components/AppHeader";
import ThemedBackground from "../components/ThemedBackground";
import { useScreenSpeech } from "../contexts/ScreenSpeechContext";
import * as AlertService from "../services/alertService";

export default function AlertsDashboard() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions();
    const { t } = useTranslation();
    const params = useLocalSearchParams();
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [hasOpenedRouteAlert, setHasOpenedRouteAlert] = useState(false);
    const tr = useCallback((key, fallback, options = {}) => t(key, { defaultValue: fallback, ...options }), [t]);
    const requestedAlertId = typeof params?.alertId === "string" ? params.alertId : null;
    const shouldOpenRequestedAlert = params?.open === "1";
    const pendingCount = useMemo(() => alerts.filter((alert) => String(alert.status).toLowerCase().includes("pending")).length, [alerts]);
    const highCount = useMemo(() => alerts.filter((alert) => String(alert.severity).toLowerCase() === "high").length, [alerts]);
    const modalWidth = Math.min(width - 24, 580);
    const modalMaxHeight = Math.max(height - insets.top - insets.bottom - 48, 420);

    const loadAlerts = useCallback(async () => {
        setLoading(true);
        const result = await AlertService.fetchAlerts();
        setAlerts(result);
        setLoading(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
        loadAlerts();
        }, [loadAlerts])
    );

    useEffect(() => {
        setHasOpenedRouteAlert(false);
    }, [requestedAlertId, shouldOpenRequestedAlert]);

    useEffect(() => {
        if (loading || !requestedAlertId || !shouldOpenRequestedAlert || hasOpenedRouteAlert) {
            return;
        }
        const matchedAlert = alerts.find((alert) => alert.id === requestedAlertId);
        if (matchedAlert) {
            setSelectedAlert(matchedAlert);
            setModalVisible(true);
            setHasOpenedRouteAlert(true);
        }
    }, [alerts, loading, requestedAlertId, shouldOpenRequestedAlert, hasOpenedRouteAlert]);

    useScreenSpeech(
        [tr("alertsDashboard", "Alerts Dashboard"), `${alerts.length} ${tr("alerts", "Alerts")}`, `${pendingCount} ${tr("pendingReview", "Pending review")}`].join(" "),
        { priority: 100 }
    );

    const openAlertModal = (alert) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedAlert(alert);
        setModalVisible(true);
    };

    const closeAlertModal = () => {
        setModalVisible(false);
        setSelectedAlert(null);
    };

    const renderAlert = ({ item }) => {
        const severityTheme = getSeverityTheme(item.severity, theme);

        return (
        <Surface style={[styles.alertCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={2}>
            <TouchableRipple onPress={() => openAlertModal(item)} borderRadius={26}>
            <View style={styles.alertPressArea}>
                <View style={styles.alertTopRow}>
                <Avatar.Icon size={48} icon="alert-decagram-outline" color={severityTheme.iconColor} style={{ backgroundColor: severityTheme.iconBackground }} />

                <View style={styles.alertTitleBlock}>
                    <Text numberOfLines={2} style={[styles.alertTitle, { color: theme.colors.onSurface }]}>{item.title}</Text>
                    <Text numberOfLines={2} style={[styles.alertSummary, { color: theme.colors.onSurfaceVariant }]}>{item.summary}</Text>
                </View>

                <View style={[styles.viewBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                    <Text style={[styles.viewBadgeText, { color: theme.colors.onPrimaryContainer }]}>{tr("viewLabel", "View")}</Text>
                </View>
                </View>

                <View style={styles.metaRow}>
                <AlertMetaPill label={item.severity} backgroundColor={severityTheme.pillBackground} textColor={severityTheme.pillText} />
                <AlertMetaPill label={item.status} backgroundColor={theme.colors.primaryContainer} textColor={theme.colors.onPrimaryContainer} />
                <Text numberOfLines={1} style={[styles.alertTime, { color: theme.colors.onSurfaceVariant }]}>{item.receivedAt}</Text>
                </View>

                <View style={[styles.cardInfoBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.outlineVariant }]}>
                <View style={styles.cardInfoGrid}>
                    <CardInfoItem theme={theme} label={tr("detectedActivity", "Detected Activity")} value={item.detectedActivity} />
                    <CardInfoItem theme={theme} label={tr("confidence", "Confidence")} value={item.confidence} />
                    <CardInfoItem theme={theme} label={tr("cameraId", "Camera ID")} value={item.cameraId} />
                    <CardInfoItem theme={theme} label={tr("capturedAt", "Captured At")} value={item.capturedAt} />
                </View>

                <Divider style={styles.cardDivider} />

                <View style={styles.videoPreviewRow}>
                    <Avatar.Icon size={34} icon="video-outline" color={theme.colors.tertiary} style={{ backgroundColor: theme.colors.primaryContainer }} />
                    <View style={styles.videoPreviewTextBlock}>
                    <Text numberOfLines={1} style={[styles.videoPreviewTitle, { color: theme.colors.onSurface }]}>{tr("videoEvidence", "Video Evidence")}</Text>
                    <Text numberOfLines={1} style={[styles.videoPreviewSub, { color: theme.colors.onSurfaceVariant }]}>{item.videoFilename} · {item.videoDuration}</Text>
                    </View>
                </View>
                </View>
            </View>
            </TouchableRipple>
        </Surface>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ThemedBackground />

        <AppHeader title={tr("alertsDashboard", "Alerts Dashboard")} subtitle={tr("videoEvidenceAlerts", "Video evidence alerts")} showBack showHome />

        <View style={styles.summaryRow}>
            <SummaryCard theme={theme} label={tr("totalAlerts", "Total Alerts")} value={String(alerts.length)} />
            <SummaryCard theme={theme} label={tr("pendingReview", "Pending Review")} value={String(pendingCount)} />
            <SummaryCard theme={theme} label={tr("highSeverity", "High Severity")} value={String(highCount)} />
        </View>

        {loading ? (
            <View style={styles.centerLoader}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>{tr("loadingAlerts", "Loading alerts...")}</Text>
            </View>
        ) : (
            <FlatList
            data={alerts}
            keyExtractor={(item) => item.id}
            renderItem={renderAlert}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: Math.max(insets.bottom + 36, 64) }}
            ListEmptyComponent={
                <View style={styles.emptyWrap}>
                <Avatar.Icon size={70} icon="shield-check-outline" color={theme.colors.tertiary} style={{ backgroundColor: theme.colors.primaryContainer }} />
                <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>{tr("noAlertsReceived", "No alerts received")}</Text>
                <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>{tr("noAlertsReceivedBody", "Camera-module alerts and uploaded evidence clips will appear here.")}</Text>
                </View>
            }
            />
        )}

        <Portal>
            <Modal visible={modalVisible} onDismiss={closeAlertModal} contentContainerStyle={styles.modalOuter}>
            <Surface style={[styles.modalCard, { width: modalWidth, maxHeight: modalMaxHeight, backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={5}>
                {selectedAlert && (
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                    <View style={styles.modalHeaderLeft}>
                        <Avatar.Icon
                        size={52}
                        icon="alert-decagram-outline"
                        color={getSeverityTheme(selectedAlert.severity, theme).iconColor}
                        style={{ backgroundColor: getSeverityTheme(selectedAlert.severity, theme).iconBackground }}
                        />
                        <View style={styles.modalTitleBlock}>
                        <Text numberOfLines={2} style={[styles.modalTitle, { color: theme.colors.onSurface }]}>{selectedAlert.title}</Text>
                        <Text numberOfLines={1} style={[styles.modalSubtitle, { color: theme.colors.onSurfaceVariant }]}>{selectedAlert.receivedAt}</Text>
                        </View>
                    </View>
                    </View>

                    <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                    <View style={styles.modalPillRow}>
                        <AlertMetaPill label={selectedAlert.severity} backgroundColor={getSeverityTheme(selectedAlert.severity, theme).pillBackground} textColor={getSeverityTheme(selectedAlert.severity, theme).pillText} />
                        <AlertMetaPill label={selectedAlert.status} backgroundColor={theme.colors.primaryContainer} textColor={theme.colors.onPrimaryContainer} />
                        <AlertMetaPill label={selectedAlert.evidenceStatus} backgroundColor={theme.colors.surfaceVariant} textColor={theme.colors.onSurfaceVariant} />
                    </View>

                    <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{tr("attachedVideoEvidence", "Attached Video Evidence")}</Text>
                    <VideoEvidence alert={selectedAlert} theme={theme} tr={tr} />

                    <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{tr("alertInformation", "Alert Information")}</Text>

                    <View style={styles.detailsGrid}>
                        <DetailItem theme={theme} label={tr("detectedActivity", "Detected Activity")} value={selectedAlert.detectedActivity} />
                        <DetailItem theme={theme} label={tr("confidence", "Confidence")} value={selectedAlert.confidence} />
                        <DetailItem theme={theme} label={tr("cameraId", "Camera ID")} value={selectedAlert.cameraId} />
                        <DetailItem theme={theme} label={tr("guide", "Guide")} value={selectedAlert.guideName} />
                        <DetailItem theme={theme} label={tr("location", "Location")} value={selectedAlert.location} />
                        <DetailItem theme={theme} label={tr("capturedAt", "Captured At")} value={selectedAlert.capturedAt} />
                        <DetailItem theme={theme} label={tr("receivedAt", "Received At")} value={selectedAlert.receivedAt} />
                        <DetailItem theme={theme} label={tr("evidenceStatus", "Evidence Status")} value={selectedAlert.evidenceStatus} />
                    </View>

                    <View style={[styles.longTextBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.outlineVariant }]}>
                        <Text style={[styles.longTextLabel, { color: theme.colors.onSurfaceVariant }]}>{tr("details", "Details")}</Text>
                        <Text style={[styles.longText, { color: theme.colors.onSurface }]}>{selectedAlert.details}</Text>
                    </View>

                    <View style={[styles.longTextBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.outlineVariant }]}>
                        <Text style={[styles.longTextLabel, { color: theme.colors.onSurfaceVariant }]}>{tr("recommendedAction", "Recommended Action")}</Text>
                        <Text style={[styles.longText, { color: theme.colors.onSurface }]}>{selectedAlert.recommendedAction}</Text>
                    </View>
                    </ScrollView>

                    <Button mode="contained" onPress={closeAlertModal} style={styles.closeButton} buttonColor={theme.colors.primary} textColor={theme.colors.onPrimary}>
                    {tr("closeButton", "Close")}
                    </Button>
                </View>
                )}
            </Surface>
            </Modal>
        </Portal>
        </View>
    );
    }

function VideoEvidence({ alert, theme, tr }) {
    if (alert.videoUrl) {
        const html = `
        <!DOCTYPE html>
        <html>
            <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                html, body {
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
                background: #000;
                overflow: hidden;
                }
                video {
                width: 100%;
                height: 100%;
                object-fit: contain;
                background: #000;
                }
            </style>
            </head>
            <body>
            <video controls playsinline>
                <source src="${alert.videoUrl}" type="video/mp4" />
            </video>
            </body>
        </html>
        `;

        return (
        <View style={[styles.videoBox, { borderColor: theme.colors.outlineVariant }]}>
            <WebView source={{ html }} style={styles.videoWebView} allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false} javaScriptEnabled domStorageEnabled />
        </View>
        );
    }

    return (
        <View style={[styles.videoPlaceholder, { backgroundColor: theme.colors.background, borderColor: theme.colors.outlineVariant }]}>
        <Avatar.Icon size={58} icon="video-outline" color={theme.colors.tertiary} style={{ backgroundColor: theme.colors.primaryContainer }} />

        <Text style={[styles.videoPlaceholderTitle, { color: theme.colors.onSurface }]}>{tr("videoPlaceholderTitle", "Video evidence placeholder")}</Text>

        <Text style={[styles.videoPlaceholderText, { color: theme.colors.onSurfaceVariant }]}>
            {tr("videoPlaceholderBody", "The actual uploaded video clip will appear here once the camera module and backend evidence storage are connected.")}
        </Text>

        <View style={styles.videoMetaRow}>
            <AlertMetaPill label={alert.videoFilename} backgroundColor={theme.colors.primaryContainer} textColor={theme.colors.onPrimaryContainer} />
            <AlertMetaPill label={alert.videoDuration} backgroundColor={theme.colors.surfaceVariant} textColor={theme.colors.onSurfaceVariant} />
        </View>
        </View>
    );
}

function SummaryCard({ theme, label, value }) {
    return (
        <Surface style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={1}>
        <Text style={[styles.summaryValue, { color: theme.colors.onSurface }]}>{value}</Text>
        <Text numberOfLines={1} style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
        </Surface>
    );
}

function AlertMetaPill({ label, backgroundColor, textColor }) {
    return (
        <View style={[styles.metaPill, { backgroundColor }]}>
        <Text numberOfLines={1} style={[styles.metaPillText, { color: textColor }]}>{label}</Text>
        </View>
    );
}

function CardInfoItem({ theme, label, value }) {
    return (
        <View style={styles.cardInfoItem}>
        <Text numberOfLines={1} style={[styles.cardInfoLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
        <Text numberOfLines={2} style={[styles.cardInfoValue, { color: theme.colors.onSurface }]}>{value || "N/A"}</Text>
        </View>
    );
}

function DetailItem({ theme, label, value }) {
    return (
        <View style={styles.detailItem}>
        <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>{value || "N/A"}</Text>
        </View>
    );
}

function getSeverityTheme(severity, theme) {
    const normalized = String(severity).toLowerCase();
    if (normalized === "high" || normalized === "critical") {
        return {
        iconBackground: theme.colors.errorContainer,
        iconColor: theme.colors.error,
        borderColor: theme.colors.error,
        pillBackground: theme.colors.errorContainer,
        pillText: theme.colors.error,
        };
    }

    return {
        iconBackground: theme.colors.primaryContainer,
        iconColor: theme.colors.tertiary,
        borderColor: theme.colors.outlineVariant,
        pillBackground: theme.colors.primaryContainer,
        pillText: theme.colors.onPrimaryContainer,
    };
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    summaryRow: {
        flexDirection: "row",
        paddingHorizontal: 20,
        paddingTop: 16,
        gap: 10,
    },
    summaryCard: {
        flex: 1,
        borderRadius: 20,
        borderWidth: 1,
        paddingVertical: 14,
        paddingHorizontal: 8,
        alignItems: "center",
    },
    summaryValue: {
        fontSize: 22,
        fontWeight: "900",
    },
    summaryLabel: {
        marginTop: 3,
        fontSize: 11,
        fontWeight: "800",
        textAlign: "center",
    },
    centerLoader: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
    },
    alertCard: {
        borderRadius: 26,
        borderWidth: 1.5,
        overflow: "hidden",
        marginBottom: 16,
    },
    alertPressArea: {
        padding: 16,
    },
    alertTopRow: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    alertTitleBlock: {
        flex: 1,
        minWidth: 0,
        marginLeft: 14,
    },
    alertTitle: {
        fontSize: 17,
        lineHeight: 23,
        fontWeight: "900",
    },
    alertSummary: {
        marginTop: 5,
        lineHeight: 20,
    },
    viewBadge: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginLeft: 8,
    },
    viewBadgeText: {
        fontSize: 11,
        fontWeight: "900",
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        marginTop: 14,
        marginLeft: 62,
    },
    metaPill: {
        alignSelf: "flex-start",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginRight: 8,
        marginBottom: 4,
        maxWidth: 220,
    },
    metaPillText: {
        fontSize: 12,
        fontWeight: "900",
    },
    alertTime: {
        marginLeft: "auto",
        marginBottom: 4,
        fontSize: 12,
        fontWeight: "700",
    },
    cardInfoBox: {
        borderWidth: 1,
        borderRadius: 18,
        padding: 12,
        marginTop: 14,
        marginLeft: 62,
    },
    cardInfoGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    cardInfoItem: {
        width: "48%",
        marginBottom: 10,
    },
    cardInfoLabel: {
        fontSize: 10,
        fontWeight: "900",
        textTransform: "uppercase",
    },
    cardInfoValue: {
        marginTop: 3,
        fontSize: 13,
        fontWeight: "800",
        lineHeight: 17,
    },
    cardDivider: {
        marginVertical: 8,
    },
    videoPreviewRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    videoPreviewTextBlock: {
        flex: 1,
        minWidth: 0,
        marginLeft: 10,
    },
    videoPreviewTitle: {
        fontSize: 13,
        fontWeight: "900",
    },
    videoPreviewSub: {
        marginTop: 2,
        fontSize: 12,
        fontWeight: "700",
    },
    modalOuter: {
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 12,
        paddingVertical: 18,
    },
    modalCard: {
        borderRadius: 30,
        borderWidth: 1,
        padding: 20,
        overflow: "hidden",
    },
    modalContent: {
        maxHeight: "100%",
    },
    modalHeader: {
        marginBottom: 14,
    },
    modalHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    modalTitleBlock: {
        flex: 1,
        minWidth: 0,
        marginLeft: 12,
    },
    modalTitle: {
        fontSize: 19,
        fontWeight: "900",
        lineHeight: 25,
    },
    modalSubtitle: {
        marginTop: 3,
        fontSize: 12,
        fontWeight: "700",
    },
    modalScroll: {
        flexShrink: 1,
    },
    modalScrollContent: {
        paddingBottom: 8,
    },
    modalPillRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 14,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: "900",
        marginBottom: 12,
    },
    videoBox: {
        height: 240,
        borderRadius: 22,
        borderWidth: 1,
        overflow: "hidden",
        backgroundColor: "#000",
        marginBottom: 18,
    },
    videoWebView: {
        flex: 1,
        backgroundColor: "#000",
    },
    videoPlaceholder: {
        borderWidth: 1,
        borderRadius: 22,
        padding: 18,
        alignItems: "center",
        marginBottom: 18,
    },
    videoPlaceholderTitle: {
        marginTop: 12,
        fontSize: 17,
        fontWeight: "900",
        textAlign: "center",
    },
    videoPlaceholderText: {
        marginTop: 7,
        lineHeight: 20,
        textAlign: "center",
    },
    videoMetaRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        marginTop: 14,
    },
    detailsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    detailItem: {
        width: "48%",
        marginBottom: 14,
    },
    detailLabel: {
        fontSize: 11,
        fontWeight: "800",
        marginBottom: 4,
        textTransform: "uppercase",
    },
    detailValue: {
        fontSize: 14,
        fontWeight: "800",
        lineHeight: 19,
    },
    longTextBox: {
        borderWidth: 1,
        borderRadius: 18,
        padding: 14,
        marginTop: 10,
    },
    longTextLabel: {
        fontSize: 11,
        fontWeight: "900",
        textTransform: "uppercase",
        marginBottom: 6,
    },
    longText: {
        fontSize: 14,
        lineHeight: 21,
        fontWeight: "700",
    },
    closeButton: {
        borderRadius: 16,
        marginTop: 14,
    },
    emptyWrap: {
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 30,
        paddingTop: 90,
    },
    emptyTitle: {
        marginTop: 18,
        fontSize: 20,
        fontWeight: "900",
        textAlign: "center",
    },
    emptyText: {
        marginTop: 8,
        textAlign: "center",
        lineHeight: 21,
    },
});