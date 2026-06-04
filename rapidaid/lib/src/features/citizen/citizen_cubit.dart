import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:geolocator/geolocator.dart';
import 'package:rapidaid/src/features/citizen/citizen_state.dart';
import '../../data/local/incident_database.dart';
import '../../data/repository/citizen_repository.dart';
import '../../services/background_sync.dart';

class CitizenCubit extends Cubit<CitizenState> {
  CitizenCubit(this._repository) : super(const CitizenState());

  final CitizenRepository _repository;
  final IncidentDatabase _db = IncidentDatabase.instance;
  StreamSubscription? _connectivitySub;
  Timer? _ussdHintTimer;
  Timer? _releaseTimer;
  Timer? _phoneSaveTimer;

  Future<void> initialize() async {
    final reporterPhone = await _repository.getReporterPhone();
    final offlineIncidents = await _repository.loadOfflineIncidents();
    final cachedIncidents = await _repository.loadCachedIncidents();
    final locationReady = await _checkLocationReady();
    final connected = await _isConnected();

    emit(
      state.copyWith(
        initialized: true,
        reporterPhone: reporterPhone,
        offlineIncidents: offlineIncidents,
        cachedIncidents: cachedIncidents,
        locationReady: locationReady,
        connected: connected,
        clearMessage: true,
      ),
    );

    _connectivitySub?.cancel();
    _connectivitySub = Connectivity().onConnectivityChanged.listen((value) {
      final nextConnected = _isConnectedValue(value);
      _handleConnectivityChange(nextConnected);
    });

    if (!connected) {
      _startUssdHintTimer();
    }

    await _syncEverything();
  }

  Future<void> disposeResources() async {
    await _connectivitySub?.cancel();
    _ussdHintTimer?.cancel();
    _releaseTimer?.cancel();
    _phoneSaveTimer?.cancel();
  }

  @override
  Future<void> close() async {
    await disposeResources();
    return super.close();
  }

  Future<void> setSelectedType(String value) async {
    emit(state.copyWith(selectedType: value, clearMessage: true));
  }

  Future<void> setReporterPhone(String value) async {
    emit(state.copyWith(reporterPhone: value, clearMessage: true));
    _phoneSaveTimer?.cancel();
    _phoneSaveTimer = Timer(const Duration(milliseconds: 350), () async {
      await _repository.saveReporterPhone(value);
    });
  }

  Future<void> setDescription(String value) async {
    emit(state.copyWith(description: value));
  }

  Future<void> triggerPanic() async {
    if (!state.locationReady) {
      final ready = await _checkLocationReady(forceRequest: true);
      emit(state.copyWith(locationReady: ready));
      if (!ready) {
        emit(
          state.copyWith(
            transientMessage:
                "Location access is required so we can store GPS offline.",
          ),
        );
        return;
      }
    }

    final position = await _repository.captureLocation();
    if (position == null) {
      emit(
        state.copyWith(
          transientMessage:
              "We could not capture your location. Please enable GPS and try again.",
        ),
      );
      return;
    }

    final reporterPhone = await _flushReporterPhone();
    if (reporterPhone != state.reporterPhone.trim()) {
      await _repository.saveReporterPhone(reporterPhone);
    }

    final connectivity = await _isConnected();
    final offlineCreated = !connectivity;

    final incident = await _repository.createLocalIncident(
      type: state.selectedType,
      lat: position.latitude,
      lng: position.longitude,
      reporterPhone: reporterPhone,
      description: state.description.trim().isEmpty
          ? "Citizen SOS raised from Flutter app"
          : state.description.trim(),
      offlineCreated: offlineCreated,
    );

    await _reloadFromDb(
      message: "Saved locally. Hold on for sync.",
      activeLocalId: incident.localId,
      canUndo: true,
      undoUntil: DateTime.now().add(const Duration(seconds: 8)),
    );

    _releaseTimer?.cancel();
    _releaseTimer = Timer(const Duration(seconds: 8), () async {
      await releaseIncident(incident.localId);
    });

    await BackgroundSyncService.scheduleImmediateSync();
  }

  Future<void> releaseIncident(String localId) async {
    final incident = await _db.getOfflineIncident(localId);
    if (incident == null || incident.syncStatus == "cancelled") {
      return;
    }

    await _repository.releaseIncidentForSync(localId);
    emit(state.copyWith(syncing: true, transientMessage: "Sending..."));
    await _repository.processSyncQueue();
    await _reloadFromDb(
      message: "Sent to dispatch.",
      activeLocalId: localId,
      canUndo: false,
      clearUndoUntil: true,
      syncing: false,
    );
  }

  Future<void> cancelIncident(String localId) async {
    _releaseTimer?.cancel();
    await _repository.cancelIncident(localId);
    await _reloadFromDb(
      message: "Alert cancelled locally.",
      activeLocalId: null,
      canUndo: false,
      clearUndoUntil: true,
      syncing: false,
    );
  }

  Future<void> refreshFromServer() async {
    await _syncEverything();
  }

  Future<void> _syncEverything() async {
    await _repository.processSyncQueue();
    final offlineIncidents = await _repository.loadOfflineIncidents();
    final cachedIncidents = await _repository.loadCachedIncidents();
    emit(
      state.copyWith(
        offlineIncidents: offlineIncidents,
        cachedIncidents: cachedIncidents,
        lastSyncAt: DateTime.now(),
      ),
    );
  }

  Future<void> _reloadFromDb({
    required String message,
    String? activeLocalId,
    bool? canUndo,
    DateTime? undoUntil,
    bool clearUndoUntil = false,
    bool? syncing,
  }) async {
    final offlineIncidents = await _repository.loadOfflineIncidents();
    final cachedIncidents = await _repository.loadCachedIncidents();
    emit(
      state.copyWith(
        offlineIncidents: offlineIncidents,
        cachedIncidents: cachedIncidents,
        transientMessage: message,
        activeLocalId: activeLocalId,
        canUndo: canUndo ?? state.canUndo,
        undoUntil: undoUntil ?? state.undoUntil,
        clearUndoUntil: clearUndoUntil,
        syncing: syncing ?? state.syncing,
      ),
    );
  }

  Future<bool> _checkLocationReady({bool forceRequest = false}) async {
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied && forceRequest) {
      permission = await Geolocator.requestPermission();
    }
    return permission != LocationPermission.denied &&
        permission != LocationPermission.deniedForever;
  }

  Future<bool> _isConnected() async {
    final value = await Connectivity().checkConnectivity();
    return _isConnectedValue(value);
  }

  bool _isConnectedValue(dynamic value) {
    if (value is List) {
      return value.any((item) => _isConnectedValue(item));
    }
    final text = value.toString().toLowerCase();
    return text.isNotEmpty && text != "none";
  }

  void _handleConnectivityChange(bool connected) {
    emit(state.copyWith(connected: connected, clearMessage: true));
    if (connected) {
      _ussdHintTimer?.cancel();
      emit(state.copyWith(showUssdHint: false));
      _syncEverything();
      return;
    }

    _startUssdHintTimer();
  }

  void _startUssdHintTimer() {
    _ussdHintTimer?.cancel();
    _ussdHintTimer = Timer(const Duration(seconds: 30), () {
      if (!state.connected) {
        emit(
          state.copyWith(
            showUssdHint: true,
            transientMessage:
                "No signal detected. You can also dial *123# to report via USSD.",
          ),
        );
      }
    });
  }

  Future<String> _flushReporterPhone() async {
    _phoneSaveTimer?.cancel();
    final reporterPhone = state.reporterPhone.trim().isEmpty
        ? await _repository.getReporterPhone()
        : state.reporterPhone.trim();
    await _repository.saveReporterPhone(reporterPhone);
    emit(state.copyWith(reporterPhone: reporterPhone));
    return reporterPhone;
  }
}
