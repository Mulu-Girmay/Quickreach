class OfflineIncidentRecord {
  OfflineIncidentRecord({
    required this.localId,
    required this.type,
    required this.lat,
    required this.lng,
    required this.reporterPhone,
    required this.description,
    required this.clientCreatedAt,
    required this.offlineCreated,
    required this.syncStatus,
    required this.status,
    this.serverIncidentId,
    this.etaMinutes,
    this.updatedAt,
    this.cancelledAt,
    this.errorMessage,
  });

  final String localId;
  final String type;
  final double lat;
  final double lng;
  final String reporterPhone;
  final String description;
  final DateTime clientCreatedAt;
  final bool offlineCreated;
  final String syncStatus;
  final String status;
  final String? serverIncidentId;
  final int? etaMinutes;
  final DateTime? updatedAt;
  final DateTime? cancelledAt;
  final String? errorMessage;

  Map<String, dynamic> toMap() {
    return {
      "local_id": localId,
      "type": type,
      "lat": lat,
      "lng": lng,
      "reporter_phone": reporterPhone,
      "description": description,
      "client_created_at": clientCreatedAt.toIso8601String(),
      "offline_created": offlineCreated ? 1 : 0,
      "sync_status": syncStatus,
      "status": status,
      "server_incident_id": serverIncidentId,
      "eta_minutes": etaMinutes,
      "updated_at": updatedAt?.toIso8601String(),
      "cancelled_at": cancelledAt?.toIso8601String(),
      "error_message": errorMessage,
    };
  }

  factory OfflineIncidentRecord.fromMap(Map<String, Object?> map) {
    return OfflineIncidentRecord(
      localId: String(map["local_id"] ?? ""),
      type: String(map["type"] ?? "Medical"),
      lat: _toDouble(map["lat"]),
      lng: _toDouble(map["lng"]),
      reporterPhone: String(map["reporter_phone"] ?? ""),
      description: String(map["description"] ?? ""),
      clientCreatedAt:
          DateTime.tryParse(String(map["client_created_at"] ?? "")) ??
          DateTime.now(),
      offlineCreated: (map["offline_created"] as num?)?.toInt() == 1,
      syncStatus: String(map["sync_status"] ?? "saved_locally"),
      status: String(map["status"] ?? "Saved locally"),
      serverIncidentId: map["server_incident_id"] as String?,
      etaMinutes: _toInt(map["eta_minutes"]),
      updatedAt: DateTime.tryParse(String(map["updated_at"] ?? "")),
      cancelledAt: DateTime.tryParse(String(map["cancelled_at"] ?? "")),
      errorMessage: map["error_message"] as String?,
    );
  }

  OfflineIncidentRecord copyWith({
    String? syncStatus,
    String? status,
    String? serverIncidentId,
    int? etaMinutes,
    DateTime? updatedAt,
    DateTime? cancelledAt,
    String? errorMessage,
    bool clearCancelledAt = false,
  }) {
    return OfflineIncidentRecord(
      localId: localId,
      type: type,
      lat: lat,
      lng: lng,
      reporterPhone: reporterPhone,
      description: description,
      clientCreatedAt: clientCreatedAt,
      offlineCreated: offlineCreated,
      syncStatus: syncStatus ?? this.syncStatus,
      status: status ?? this.status,
      serverIncidentId: serverIncidentId ?? this.serverIncidentId,
      etaMinutes: etaMinutes ?? this.etaMinutes,
      updatedAt: updatedAt ?? this.updatedAt,
      cancelledAt: clearCancelledAt ? null : (cancelledAt ?? this.cancelledAt),
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  static double _toDouble(Object? value) {
    if (value is num) return value.toDouble();
    return double.tryParse(String(value ?? "")) ?? 0;
  }

  static int? _toInt(Object? value) {
    if (value is num) return value.toInt();
    return int.tryParse(String(value ?? ""));
  }
}

class SyncQueueRecord {
  SyncQueueRecord({
    required this.queueId,
    required this.localId,
    required this.endpoint,
    required this.payloadJson,
    required this.attemptCount,
    required this.nextAttemptAt,
    required this.status,
    this.lastAttemptAt,
    this.errorMessage,
  });

  final String queueId;
  final String localId;
  final String endpoint;
  final String payloadJson;
  final int attemptCount;
  final DateTime nextAttemptAt;
  final DateTime? lastAttemptAt;
  final String status;
  final String? errorMessage;

  Map<String, dynamic> toMap() {
    return {
      "queue_id": queueId,
      "local_id": localId,
      "endpoint": endpoint,
      "payload_json": payloadJson,
      "attempt_count": attemptCount,
      "next_attempt_at": nextAttemptAt.toIso8601String(),
      "last_attempt_at": lastAttemptAt?.toIso8601String(),
      "status": status,
      "error_message": errorMessage,
    };
  }

  factory SyncQueueRecord.fromMap(Map<String, Object?> map) {
    return SyncQueueRecord(
      queueId: String(map["queue_id"] ?? ""),
      localId: String(map["local_id"] ?? ""),
      endpoint: String(map["endpoint"] ?? "/api/incidents/public"),
      payloadJson: String(map["payload_json"] ?? "{}"),
      attemptCount: OfflineIncidentRecord._toInt(map["attempt_count"]) ?? 0,
      nextAttemptAt:
          DateTime.tryParse(String(map["next_attempt_at"] ?? "")) ??
          DateTime.now(),
      lastAttemptAt: DateTime.tryParse(String(map["last_attempt_at"] ?? "")),
      status: String(map["status"] ?? "pending"),
      errorMessage: map["error_message"] as String?,
    );
  }

  SyncQueueRecord copyWith({
    int? attemptCount,
    DateTime? nextAttemptAt,
    DateTime? lastAttemptAt,
    String? status,
    String? errorMessage,
  }) {
    return SyncQueueRecord(
      queueId: queueId,
      localId: localId,
      endpoint: endpoint,
      payloadJson: payloadJson,
      attemptCount: attemptCount ?? this.attemptCount,
      nextAttemptAt: nextAttemptAt ?? this.nextAttemptAt,
      lastAttemptAt: lastAttemptAt ?? this.lastAttemptAt,
      status: status ?? this.status,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

class CachedIncidentRecord {
  CachedIncidentRecord({
    required this.serverIncidentId,
    required this.localId,
    required this.type,
    required this.lat,
    required this.lng,
    required this.reporterPhone,
    required this.status,
    required this.offlineCreated,
    required this.clientCreatedAt,
    required this.createdAt,
    required this.updatedAt,
    this.description,
    this.etaMinutes,
  });

  final String serverIncidentId;
  final String localId;
  final String type;
  final double lat;
  final double lng;
  final String reporterPhone;
  final String status;
  final bool offlineCreated;
  final DateTime clientCreatedAt;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? description;
  final int? etaMinutes;

  Map<String, dynamic> toMap() {
    return {
      "server_incident_id": serverIncidentId,
      "local_id": localId,
      "type": type,
      "lat": lat,
      "lng": lng,
      "reporter_phone": reporterPhone,
      "status": status,
      "offline_created": offlineCreated ? 1 : 0,
      "client_created_at": clientCreatedAt.toIso8601String(),
      "created_at": createdAt.toIso8601String(),
      "updated_at": updatedAt.toIso8601String(),
      "description": description,
      "eta_minutes": etaMinutes,
    };
  }

  factory CachedIncidentRecord.fromMap(Map<String, Object?> map) {
    return CachedIncidentRecord(
      serverIncidentId: String(map["server_incident_id"] ?? ""),
      localId: String(map["local_id"] ?? ""),
      type: String(map["type"] ?? "Medical"),
      lat: OfflineIncidentRecord._toDouble(map["lat"]),
      lng: OfflineIncidentRecord._toDouble(map["lng"]),
      reporterPhone: String(map["reporter_phone"] ?? ""),
      status: String(map["status"] ?? "Pending"),
      offlineCreated: (map["offline_created"] as num?)?.toInt() == 1,
      clientCreatedAt:
          DateTime.tryParse(String(map["client_created_at"] ?? "")) ??
          DateTime.now(),
      createdAt:
          DateTime.tryParse(String(map["created_at"] ?? "")) ?? DateTime.now(),
      updatedAt:
          DateTime.tryParse(String(map["updated_at"] ?? "")) ?? DateTime.now(),
      description: map["description"] as String?,
      etaMinutes: OfflineIncidentRecord._toInt(map["eta_minutes"]),
    );
  }

  factory CachedIncidentRecord.fromServerJson(
    Map<String, dynamic> json, {
    required String localId,
    required bool offlineCreated,
    required DateTime clientCreatedAt,
  }) {
    final createdAt =
        DateTime.tryParse(String(json["created_at"] ?? "")) ?? DateTime.now();
    final updatedAt =
        DateTime.tryParse(String(json["updated_at"] ?? "")) ?? createdAt;
    return CachedIncidentRecord(
      serverIncidentId: String(json["_id"] ?? json["id"] ?? ""),
      localId: localId,
      type: String(json["type"] ?? "Medical"),
      lat: OfflineIncidentRecord._toDouble(json["lat"]),
      lng: OfflineIncidentRecord._toDouble(json["lng"]),
      reporterPhone: String(json["reporter_phone"] ?? ""),
      status: String(json["status"] ?? "Pending"),
      offlineCreated: offlineCreated,
      clientCreatedAt: clientCreatedAt,
      createdAt: createdAt,
      updatedAt: updatedAt,
      description: json["description"] as String?,
      etaMinutes: OfflineIncidentRecord._toInt(json["eta_minutes"]),
    );
  }
}
