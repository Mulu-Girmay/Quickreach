import 'dart:async';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:rapidaid/src/data/models/incident_models.dart';
import 'package:sqflite/sqflite.dart';

class IncidentDatabase {
  IncidentDatabase._();

  static final IncidentDatabase instance = IncidentDatabase._();

  Database? _db;

  Future<Database> get database async {
    if (_db != null) return _db!;

    final directory = await getApplicationDocumentsDirectory();
    final path = p.join(directory.path, "quickreach_citizen.db");

    _db = await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE offline_incidents (
            local_id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            reporter_phone TEXT NOT NULL,
            description TEXT,
            client_created_at TEXT NOT NULL,
            offline_created INTEGER NOT NULL,
            sync_status TEXT NOT NULL,
            status TEXT NOT NULL,
            server_incident_id TEXT,
            eta_minutes INTEGER,
            updated_at TEXT,
            cancelled_at TEXT,
            error_message TEXT
          )
        ''');

        await db.execute('''
          CREATE TABLE sync_queue (
            queue_id TEXT PRIMARY KEY,
            local_id TEXT NOT NULL,
            endpoint TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            attempt_count INTEGER NOT NULL,
            next_attempt_at TEXT NOT NULL,
            last_attempt_at TEXT,
            status TEXT NOT NULL,
            error_message TEXT
          )
        ''');

        await db.execute('''
          CREATE TABLE cached_incidents (
            server_incident_id TEXT PRIMARY KEY,
            local_id TEXT NOT NULL,
            type TEXT NOT NULL,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            reporter_phone TEXT NOT NULL,
            status TEXT NOT NULL,
            offline_created INTEGER NOT NULL,
            client_created_at TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            description TEXT,
            eta_minutes INTEGER
          )
        ''');
      },
    );

    return _db!;
  }

  Future<void> close() async {
    final db = _db;
    _db = null;
    await db?.close();
  }

  Future<void> insertOfflineIncident(OfflineIncidentRecord incident) async {
    final db = await database;
    await db.insert(
      "offline_incidents",
      incident.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<void> updateOfflineIncident(OfflineIncidentRecord incident) async {
    final db = await database;
    await db.update(
      "offline_incidents",
      incident.toMap(),
      where: "local_id = ?",
      whereArgs: [incident.localId],
    );
  }

  Future<OfflineIncidentRecord?> getOfflineIncident(String localId) async {
    final db = await database;
    final rows = await db.query(
      "offline_incidents",
      where: "local_id = ?",
      whereArgs: [localId],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    return OfflineIncidentRecord.fromMap(rows.first);
  }

  Future<List<OfflineIncidentRecord>> listOfflineIncidents() async {
    final db = await database;
    final rows = await db.query(
      "offline_incidents",
      orderBy: "client_created_at DESC",
    );
    return rows.map(OfflineIncidentRecord.fromMap).toList(growable: false);
  }

  Future<void> insertSyncJob(SyncQueueRecord job) async {
    final db = await database;
    await db.insert(
      "sync_queue",
      job.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<SyncQueueRecord>> listDueSyncJobs(DateTime now) async {
    final db = await database;
    final rows = await db.query(
      "sync_queue",
      where: "status != ? AND next_attempt_at <= ?",
      whereArgs: ["sent", now.toIso8601String()],
      orderBy: "next_attempt_at ASC",
    );
    return rows.map(SyncQueueRecord.fromMap).toList(growable: false);
  }

  Future<void> updateSyncJob(SyncQueueRecord job) async {
    final db = await database;
    await db.update(
      "sync_queue",
      job.toMap(),
      where: "queue_id = ?",
      whereArgs: [job.queueId],
    );
  }

  Future<void> deleteSyncJob(String queueId) async {
    final db = await database;
    await db.delete("sync_queue", where: "queue_id = ?", whereArgs: [queueId]);
  }

  Future<void> deleteSyncJobsByLocalId(String localId) async {
    final db = await database;
    await db.delete("sync_queue", where: "local_id = ?", whereArgs: [localId]);
  }

  Future<List<SyncQueueRecord>> listSyncJobsByLocalId(String localId) async {
    final db = await database;
    final rows = await db.query(
      "sync_queue",
      where: "local_id = ?",
      whereArgs: [localId],
      orderBy: "next_attempt_at ASC",
    );
    return rows.map(SyncQueueRecord.fromMap).toList(growable: false);
  }

  Future<void> markIncidentCancelled(String localId) async {
    final db = await database;
    await db.update(
      "offline_incidents",
      {
        "sync_status": "cancelled",
        "status": "Cancelled",
        "cancelled_at": DateTime.now().toIso8601String(),
        "updated_at": DateTime.now().toIso8601String(),
        "error_message": null,
      },
      where: "local_id = ?",
      whereArgs: [localId],
    );
  }

  Future<void> markIncidentSending(String localId) async {
    final db = await database;
    await db.update(
      "offline_incidents",
      {
        "sync_status": "sending",
        "status": "Sending...",
        "updated_at": DateTime.now().toIso8601String(),
      },
      where: "local_id = ?",
      whereArgs: [localId],
    );
  }

  Future<void> markIncidentSent({
    required String localId,
    required String serverIncidentId,
    required String status,
    int? etaMinutes,
  }) async {
    final db = await database;
    await db.update(
      "offline_incidents",
      {
        "sync_status": "sent",
        "status": status,
        "server_incident_id": serverIncidentId,
        "eta_minutes": etaMinutes,
        "updated_at": DateTime.now().toIso8601String(),
        "error_message": null,
      },
      where: "local_id = ?",
      whereArgs: [localId],
    );
  }

  Future<void> upsertCachedIncident(CachedIncidentRecord incident) async {
    final db = await database;
    await db.insert(
      "cached_incidents",
      incident.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<CachedIncidentRecord>> listCachedIncidents() async {
    final db = await database;
    final rows = await db.query("cached_incidents", orderBy: "updated_at DESC");
    return rows.map(CachedIncidentRecord.fromMap).toList(growable: false);
  }

  Future<CachedIncidentRecord?> getCachedIncident(
    String serverIncidentId,
  ) async {
    final db = await database;
    final rows = await db.query(
      "cached_incidents",
      where: "server_incident_id = ?",
      whereArgs: [serverIncidentId],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    return CachedIncidentRecord.fromMap(rows.first);
  }
}
