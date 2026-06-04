import 'dart:async';
import 'dart:convert';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:geolocator/geolocator.dart';
import 'package:rapidaid/src/config/app_config.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sqflite/sqflite.dart';
import 'package:uuid/uuid.dart';
import '../local/incident_database.dart';
import '../models/incident_models.dart';

class CitizenRepository {
  CitizenRepository({Dio? dio})
    : _dio =
          dio ??
          Dio(
            BaseOptions(
              baseUrl: AppConfig.apiBaseUrl.replaceAll(RegExp(r'/$'), ''),
              headers: const {"Content-Type": "application/json"},
              connectTimeout: const Duration(seconds: 12),
              receiveTimeout: const Duration(seconds: 20),
              sendTimeout: const Duration(seconds: 12),
            ),
          );

  final Dio _dio;
  final IncidentDatabase _db = IncidentDatabase.instance;
  final Uuid _uuid = const Uuid();
  Future<void>? _syncInFlight;

  // Fixed: Added missing getter for database instance
  IncidentDatabase get db => _db;

  Future<String> getReporterPhone() async {
    final prefs = await SharedPreferences.getInstance();
    final existing = prefs.getString("quickreach_reporter_phone");
    if (existing != null && existing.trim().isNotEmpty) {
      return existing.trim();
    }

    final generated = "FLUTTER-${_uuid.v4().substring(0, 8).toUpperCase()}";
    await prefs.setString("quickreach_reporter_phone", generated);
    return generated;
  }

  Future<void> saveReporterPhone(String value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString("quickreach_reporter_phone", value.trim());
  }

  Future<Position?> captureLocation() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      return await Geolocator.getLastKnownPosition();
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      return await Geolocator.getLastKnownPosition();
    }

    try {
      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
    } catch (_) {
      return await Geolocator.getLastKnownPosition();
    }
  }

  Future<OfflineIncidentRecord> createLocalIncident({
    required String type,
    required double lat,
    required double lng,
    required String reporterPhone,
    required String description,
    required bool offlineCreated,
  }) async {
    final now = DateTime.now();
    final localId = _uuid.v4();

    final incident = OfflineIncidentRecord(
      localId: localId,
      type: type,
      lat: lat,
      lng: lng,
      reporterPhone: reporterPhone,
      description: description,
      clientCreatedAt: now,
      offlineCreated: offlineCreated,
      syncStatus: "saved_locally",
      status: "Saved locally",
      updatedAt: now,
    );

    await (await _db.database).transaction((txn) async {
      await txn.insert(
        "offline_incidents",
        incident.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
      await txn.insert(
        "sync_queue",
        SyncQueueRecord(
          queueId: _uuid.v4(),
          localId: localId,
          endpoint: "/api/incidents/public",
          payloadJson: jsonEncode({
            "type": type,
            "lat": lat,
            "lng": lng,
            "reporter_phone": reporterPhone,
            "description": description,
            "offline_created": offlineCreated,
            "client_created_at": now.toIso8601String(),
            "client_request_id": localId,
          }),
          attemptCount: 0,
          nextAttemptAt: now.add(const Duration(seconds: 8)),
          status: "holding",
        ).toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    });

    return incident;
  }

  Future<List<OfflineIncidentRecord>> loadOfflineIncidents() {
    return _db.listOfflineIncidents();
  }

  Future<List<CachedIncidentRecord>> loadCachedIncidents() {
    return _db.listCachedIncidents();
  }

  Future<void> cancelIncident(String localId) async {
    await _db.markIncidentCancelled(localId);
    await _db.deleteSyncJobsByLocalId(localId);
  }

  Future<void> releaseIncidentForSync(String localId) async {
    final now = DateTime.now();
    final jobs = await _db.listSyncJobsByLocalId(localId);
    for (final job in jobs) {
      if (job.localId == localId && job.status == "holding") {
        await _db.updateSyncJob(
          job.copyWith(status: "pending", nextAttemptAt: now),
        );
        await _db.markIncidentSending(localId);
      }
    }
  }

  Future<void> processSyncQueue() async {
    if (_syncInFlight != null) {
      return _syncInFlight!;
    }

    _syncInFlight = _processSyncQueue().whenComplete(() {
      _syncInFlight = null;
    });
    return _syncInFlight!;
  }

  Future<void> _processSyncQueue() async {
    final now = DateTime.now();
    final jobs = await _db.listDueSyncJobs(now);
    for (final job in jobs) {
      await _processJob(job);
    }
  }

  Future<void> refreshCachedIncident(String serverIncidentId) async {
    try {
      final response = await _dio.get(
        "/api/incidents/$serverIncidentId",
        options: Options(headers: {"x-incident-token": serverIncidentId}),
      );

      // Fixed: Properly extract incident data from response
      final Map<String, dynamic> responseData =
          response.data as Map<String, dynamic>;
      final Map<String, dynamic> incident;

      if (responseData.containsKey("incident") &&
          responseData["incident"] is Map) {
        incident = Map<String, dynamic>.from(responseData["incident"] as Map);
      } else {
        incident = Map<String, dynamic>.from(responseData);
      }

      final localId =
          incident["client_request_id"] as String? ?? serverIncidentId;
      final offlineCreated = incident["offline_created"] == true;
      final clientCreatedAt =
          DateTime.tryParse(incident["client_created_at"]?.toString() ?? "") ??
          DateTime.now();

      final cached = CachedIncidentRecord.fromServerJson(
        incident,
        localId: localId,
        offlineCreated: offlineCreated,
        clientCreatedAt: clientCreatedAt,
      );

      await _db.upsertCachedIncident(cached);
      await _db.markIncidentSent(
        localId: cached.localId,
        serverIncidentId: cached.serverIncidentId,
        status: cached.status,
        etaMinutes: cached.etaMinutes,
      );
    } catch (e) {
      // Keep the cached view as-is when refresh fails.
      print("Error refreshing cached incident: $e");
    }
  }

  Future<void> _processJob(SyncQueueRecord job) async {
    if (job.status == "sent" || job.status == "cancelled") return;

    if (job.status == "holding") {
      final now = DateTime.now();
      if (now.isBefore(job.nextAttemptAt)) {
        return;
      }
      await _db.updateSyncJob(
        job.copyWith(status: "pending", lastAttemptAt: now, nextAttemptAt: now),
      );
      await _db.markIncidentSending(job.localId);
    }

    final online = await _hasConnectivity();
    if (!online) {
      await _reschedule(job, reason: "offline");
      return;
    }

    try {
      await _db.markIncidentSending(job.localId);
      final payload = jsonDecode(job.payloadJson) as Map<String, dynamic>;
      final response = await _dio.post(job.endpoint, data: payload);

      final Map<String, dynamic> data = response.data as Map<String, dynamic>;
      final Map<String, dynamic> incident;

      if (data.containsKey("incident") && data["incident"] is Map) {
        incident = Map<String, dynamic>.from(data["incident"] as Map);
      } else {
        incident = Map<String, dynamic>.from(data);
      }

      final serverIncidentId = (incident["_id"] ?? incident["id"] ?? "")
          .toString();
      final clientCreatedAt =
          DateTime.tryParse(payload["client_created_at"]?.toString() ?? "") ??
          DateTime.now();

      final cached = CachedIncidentRecord.fromServerJson(
        incident,
        localId: job.localId,
        offlineCreated: payload["offline_created"] == true,
        clientCreatedAt: clientCreatedAt,
      );

      await _db.upsertCachedIncident(cached);
      await _db.markIncidentSent(
        localId: job.localId,
        serverIncidentId: serverIncidentId,
        status: incident["status"]?.toString() ?? "Pending",
        etaMinutes: cached.etaMinutes,
      );
      await _db.deleteSyncJob(job.queueId);
      await refreshCachedIncident(serverIncidentId);
    } on DioException catch (error) {
      await _reschedule(job, reason: error.message ?? "request_failed");
    } catch (error) {
      await _reschedule(job, reason: error.toString());
    }
  }

  Future<void> _reschedule(
    SyncQueueRecord job, {
    required String reason,
  }) async {
    final nextAttempt = _nextRetryTime(job.attemptCount);
    await _db.updateSyncJob(
      job.copyWith(
        attemptCount: job.attemptCount + 1,
        lastAttemptAt: DateTime.now(),
        nextAttemptAt: nextAttempt,
        status: "pending",
        errorMessage: reason,
      ),
    );

    final incident = await _db.getOfflineIncident(job.localId);
    if (incident != null) {
      await _db.updateOfflineIncident(
        incident.copyWith(
          syncStatus: "pending",
          status: "Sending...",
          updatedAt: DateTime.now(),
          errorMessage: reason,
        ),
      );
    }
  }

  Future<bool> _hasConnectivity() async {
    final value = await Connectivity().checkConnectivity();
    return _isConnectedValue(value);
  }

  bool _isConnectedValue(dynamic value) {
    if (value is List<ConnectivityResult>) {
      return value.any((item) => _isConnectedValue(item));
    }

    if (value is ConnectivityResult) {
      return value != ConnectivityResult.none;
    }

    final text = value.toString().toLowerCase();
    return text.isNotEmpty && text != "none";
  }

  DateTime _nextRetryTime(int attemptCount) {
    if (attemptCount <= 0)
      return DateTime.now().add(const Duration(seconds: 1));
    if (attemptCount == 1)
      return DateTime.now().add(const Duration(seconds: 2));
    if (attemptCount == 2)
      return DateTime.now().add(const Duration(seconds: 4));
    if (attemptCount == 3)
      return DateTime.now().add(const Duration(seconds: 8));
    return DateTime.now().add(const Duration(seconds: 30));
  }

  Future<OfflineIncidentRecord?> getIncident(String localId) async {
    return await _db.getOfflineIncident(localId);
  }

  Future<String> getSyncStatus(String localId) async {
    final incident = await _db.getOfflineIncident(localId);
    return incident?.syncStatus ?? "unknown";
  }

  Future<void> retryFailedSync(String localId) async {
    final jobs = await _db.listSyncJobsByLocalId(localId);
    for (final job in jobs) {
      if (job.status == "pending" || job.status == "failed") {
        await _db.updateSyncJob(
          job.copyWith(nextAttemptAt: DateTime.now(), status: "pending"),
        );
      }
    }
    await processSyncQueue();
  }
}
