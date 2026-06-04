import 'package:equatable/equatable.dart';

import '../../data/models/incident_models.dart';

class CitizenState extends Equatable {
  const CitizenState({
    this.initialized = false,
    this.connected = true,
    this.showUssdHint = false,
    this.locationReady = false,
    this.syncing = false,
    this.canUndo = false,
    this.selectedType = "Medical",
    this.reporterPhone = "",
    this.description = "",
    this.transientMessage,
    this.activeLocalId,
    this.undoUntil,
    this.lastSyncAt,
    this.offlineIncidents = const [],
    this.cachedIncidents = const [],
  });

  final bool initialized;
  final bool connected;
  final bool showUssdHint;
  final bool locationReady;
  final bool syncing;
  final bool canUndo;
  final String selectedType;
  final String reporterPhone;
  final String description;
  final String? transientMessage;
  final String? activeLocalId;
  final DateTime? undoUntil;
  final DateTime? lastSyncAt;
  final List<OfflineIncidentRecord> offlineIncidents;
  final List<CachedIncidentRecord> cachedIncidents;

  CitizenState copyWith({
    bool? initialized,
    bool? connected,
    bool? showUssdHint,
    bool? locationReady,
    bool? syncing,
    bool? canUndo,
    String? selectedType,
    String? reporterPhone,
    String? description,
    String? transientMessage,
    String? activeLocalId,
    DateTime? undoUntil,
    DateTime? lastSyncAt,
    List<OfflineIncidentRecord>? offlineIncidents,
    List<CachedIncidentRecord>? cachedIncidents,
    bool clearMessage = false,
    bool clearActiveLocalId = false,
    bool clearUndoUntil = false,
    bool clearLastSyncAt = false,
  }) {
    return CitizenState(
      initialized: initialized ?? this.initialized,
      connected: connected ?? this.connected,
      showUssdHint: showUssdHint ?? this.showUssdHint,
      locationReady: locationReady ?? this.locationReady,
      syncing: syncing ?? this.syncing,
      canUndo: canUndo ?? this.canUndo,
      selectedType: selectedType ?? this.selectedType,
      reporterPhone: reporterPhone ?? this.reporterPhone,
      description: description ?? this.description,
      transientMessage: clearMessage ? null : (transientMessage ?? this.transientMessage),
      activeLocalId: clearActiveLocalId ? null : (activeLocalId ?? this.activeLocalId),
      undoUntil: clearUndoUntil ? null : (undoUntil ?? this.undoUntil),
      lastSyncAt: clearLastSyncAt ? null : (lastSyncAt ?? this.lastSyncAt),
      offlineIncidents: offlineIncidents ?? this.offlineIncidents,
      cachedIncidents: cachedIncidents ?? this.cachedIncidents,
    );
  }

  @override
  List<Object?> get props => [
        initialized,
        connected,
        showUssdHint,
        locationReady,
        syncing,
        canUndo,
        selectedType,
        reporterPhone,
        description,
        transientMessage,
        activeLocalId,
        undoUntil,
        lastSyncAt,
        offlineIncidents,
        cachedIncidents,
      ];
}
