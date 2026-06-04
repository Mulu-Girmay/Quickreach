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

  factory OfflineIncidentRecord.fromMap(Map<String, dynamic> map) {
    return OfflineIncidentRecord(
      localId: map["local_id"] as String? ?? "",
      type: map["type"] as String? ?? "Medical",
      lat: _toDouble(map["lat"]),
      lng: _toDouble(map["lng"]),
      reporterPhone: map["reporter_phone"] as String? ?? "",
      description: map["description"] as String? ?? "",
      clientCreatedAt: _toDateTimeNonNull(
        map["client_created_at"],
        DateTime.now(),
      ),
      offlineCreated: _toBool(map["offline_created"]),
      syncStatus: map["sync_status"] as String? ?? "saved_locally",
      status: map["status"] as String? ?? "Saved locally",
      serverIncidentId: map["server_incident_id"] as String?,
      etaMinutes: _toInt(map["eta_minutes"]),
      updatedAt: _toDateTimeNullable(map["updated_at"]),
      cancelledAt: _toDateTimeNullable(map["cancelled_at"]),
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

  // Helper methods
  static double _toDouble(dynamic value) {
    if (value == null) return 0.0;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is num) return value.toDouble();
    return double.tryParse(value.toString()) ?? 0.0;
  }

  static int? _toInt(dynamic value) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is double) return value.toInt();
    if (value is num) return value.toInt();
    return int.tryParse(value.toString());
  }

  static bool _toBool(dynamic value) {
    if (value == null) return false;
    if (value is bool) return value;
    if (value is int) return value == 1;
    if (value is String) return value == "1" || value.toLowerCase() == "true";
    return false;
  }

  // For NON-nullable DateTime (returns DateTime, never null)
  static DateTime _toDateTimeNonNull(dynamic value, DateTime defaultValue) {
    if (value == null) return defaultValue;
    if (value is DateTime) return value;
    if (value is String && value.isNotEmpty) {
      return DateTime.tryParse(value) ?? defaultValue;
    }
    return defaultValue;
  }

  // For NULLABLE DateTime (returns DateTime? which can be null)
  static DateTime? _toDateTimeNullable(dynamic value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    if (value is String && value.isNotEmpty) {
      return DateTime.tryParse(value);
    }
    return null;
  }
}

// Fixed SyncQueueRecord
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

  factory SyncQueueRecord.fromMap(Map<String, dynamic> map) {
    return SyncQueueRecord(
      queueId: map["queue_id"] as String? ?? "",
      localId: map["local_id"] as String? ?? "",
      endpoint: map["endpoint"] as String? ?? "/api/incidents/public",
      payloadJson: map["payload_json"] as String? ?? "{}",
      attemptCount: _toInt(map["attempt_count"]) ?? 0,
      nextAttemptAt: _toDateTimeNonNull(map["next_attempt_at"], DateTime.now()),
      lastAttemptAt: _toDateTimeNullable(map["last_attempt_at"]),
      status: map["status"] as String? ?? "pending",
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

  // Helper methods
  static int? _toInt(dynamic value) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is double) return value.toInt();
    if (value is num) return value.toInt();
    return int.tryParse(value.toString());
  }

  static DateTime _toDateTimeNonNull(dynamic value, DateTime defaultValue) {
    if (value == null) return defaultValue;
    if (value is DateTime) return value;
    if (value is String && value.isNotEmpty) {
      return DateTime.tryParse(value) ?? defaultValue;
    }
    return defaultValue;
  }

  static DateTime? _toDateTimeNullable(dynamic value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    if (value is String && value.isNotEmpty) {
      return DateTime.tryParse(value);
    }
    return null;
  }
}

// Fixed CachedIncidentRecord
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

  factory CachedIncidentRecord.fromMap(Map<String, dynamic> map) {
    return CachedIncidentRecord(
      serverIncidentId: map["server_incident_id"] as String? ?? "",
      localId: map["local_id"] as String? ?? "",
      type: map["type"] as String? ?? "Medical",
      lat: _toDouble(map["lat"]),
      lng: _toDouble(map["lng"]),
      reporterPhone: map["reporter_phone"] as String? ?? "",
      status: map["status"] as String? ?? "Pending",
      offlineCreated: _toBool(map["offline_created"]),
      clientCreatedAt: _toDateTimeNonNull(
        map["client_created_at"],
        DateTime.now(),
      ),
      createdAt: _toDateTimeNonNull(map["created_at"], DateTime.now()),
      updatedAt: _toDateTimeNonNull(map["updated_at"], DateTime.now()),
      description: map["description"] as String?,
      etaMinutes: _toInt(map["eta_minutes"]),
    );
  }

  factory CachedIncidentRecord.fromServerJson(
    Map<String, dynamic> json, {
    required String localId,
    required bool offlineCreated,
    required DateTime clientCreatedAt,
  }) {
    final createdAt = _toDateTimeNonNull(json["created_at"], DateTime.now());
    final updatedAt = _toDateTimeNonNull(json["updated_at"], createdAt);
    return CachedIncidentRecord(
      serverIncidentId: _getServerId(json),
      localId: localId,
      type: json["type"] as String? ?? "Medical",
      lat: _toDouble(json["lat"]),
      lng: _toDouble(json["lng"]),
      reporterPhone: json["reporter_phone"] as String? ?? "",
      status: json["status"] as String? ?? "Pending",
      offlineCreated: offlineCreated,
      clientCreatedAt: clientCreatedAt,
      createdAt: createdAt,
      updatedAt: updatedAt,
      description: json["description"] as String?,
      etaMinutes: _toInt(json["eta_minutes"]),
    );
  }

  CachedIncidentRecord copyWith({
    String? status,
    int? etaMinutes,
    DateTime? updatedAt,
  }) {
    return CachedIncidentRecord(
      serverIncidentId: serverIncidentId,
      localId: localId,
      type: type,
      lat: lat,
      lng: lng,
      reporterPhone: reporterPhone,
      status: status ?? this.status,
      offlineCreated: offlineCreated,
      clientCreatedAt: clientCreatedAt,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      description: description,
      etaMinutes: etaMinutes ?? this.etaMinutes,
    );
  }

  // Helper methods
  static double _toDouble(dynamic value) {
    if (value == null) return 0.0;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is num) return value.toDouble();
    return double.tryParse(value.toString()) ?? 0.0;
  }

  static int? _toInt(dynamic value) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is double) return value.toInt();
    if (value is num) return value.toInt();
    return int.tryParse(value.toString());
  }

  static bool _toBool(dynamic value) {
    if (value == null) return false;
    if (value is bool) return value;
    if (value is int) return value == 1;
    if (value is String) return value == "1" || value.toLowerCase() == "true";
    return false;
  }

  static DateTime _toDateTimeNonNull(dynamic value, DateTime defaultValue) {
    if (value == null) return defaultValue;
    if (value is DateTime) return value;
    if (value is String && value.isNotEmpty) {
      return DateTime.tryParse(value) ?? defaultValue;
    }
    return defaultValue;
  }

  static DateTime? _toDateTimeNullable(dynamic value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    if (value is String && value.isNotEmpty) {
      return DateTime.tryParse(value);
    }
    return null;
  }

  static String _getServerId(Map<String, dynamic> json) {
    if (json["_id"] != null) return json["_id"] as String;
    if (json["id"] != null) return json["id"] as String;
    if (json["serverIncidentId"] != null)
      return json["serverIncidentId"] as String;
    return "";
  }
}
