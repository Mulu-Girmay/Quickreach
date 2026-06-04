import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:workmanager/workmanager.dart';

import '../data/repository/citizen_repository.dart';

// ✅ Make sure this matches the ID used in registration
const String quickReachSyncTask = "quickreach-sync-task";

@pragma("vm:entry-point")
void callbackDispatcher() {
  // ✅ IMPORTANT: This must be a top-level function
  Workmanager().executeTask((task, inputData) async {
    // ✅ Ensure Flutter binding is initialized
    WidgetsFlutterBinding.ensureInitialized();

    print("🟡 Background sync task started: $task");

    try {
      final repository = CitizenRepository();
      await repository.processSyncQueue();
      print("✅ Background sync completed successfully");
      return Future.value(true);
    } catch (e, stackTrace) {
      print("❌ Background sync failed: $e");
      print(stackTrace);
      return Future.value(false);
    }
  });
}

class BackgroundSyncService {
  static bool _initialized = false;

  static Future<void> initialize() async {
    // Skip on web
    if (kIsWeb) {
      print("⚠️ BackgroundSyncService: Skipping on web");
      return;
    }

    // Only for Android/iOS
    if (defaultTargetPlatform != TargetPlatform.android &&
        defaultTargetPlatform != TargetPlatform.iOS) {
      print("⚠️ BackgroundSyncService: Skipping on ${defaultTargetPlatform}");
      return;
    }

    if (_initialized) {
      print("✅ BackgroundSyncService already initialized");
      return;
    }

    try {
      print("🟡 Initializing BackgroundSyncService...");

      // ✅ Initialize with the callback
      await Workmanager().initialize(
        callbackDispatcher,
        isInDebugMode: true, // Set to false in production
      );

      // ✅ Register periodic task
      await Workmanager().registerPeriodicTask(
        "quickreach-periodic-sync",
        quickReachSyncTask,
        frequency: const Duration(minutes: 15),
        constraints: Constraints(
          networkType: NetworkType.connected,
          requiresBatteryNotLow: false,
          requiresCharging: false,
          requiresDeviceIdle: false,
        ),
        existingWorkPolicy: ExistingPeriodicWorkPolicy.keep,
        backoffPolicy: BackoffPolicy.exponential, // Better for retries
      );

      _initialized = true;
      print("✅ BackgroundSyncService initialized successfully");
    } catch (e) {
      print("❌ Failed to initialize BackgroundSyncService: $e");
      rethrow;
    }
  }

  static Future<void> scheduleImmediateSync() async {
    // Skip on web
    if (kIsWeb) {
      return;
    }

    // Only for Android/iOS
    if (defaultTargetPlatform != TargetPlatform.android &&
        defaultTargetPlatform != TargetPlatform.iOS) {
      return;
    }

    // Ensure initialized
    if (!_initialized) {
      print("⚠️ BackgroundSyncService not initialized, initializing...");
      await initialize();
    }

    try {
      final taskId = "quickreach-sync-${DateTime.now().millisecondsSinceEpoch}";

      print("🟡 Scheduling immediate sync with ID: $taskId");

      await Workmanager().registerOneOffTask(
        taskId,
        quickReachSyncTask,
        initialDelay: const Duration(seconds: 2), // Small delay for stability
        constraints: Constraints(networkType: NetworkType.connected),
        existingWorkPolicy: ExistingWorkPolicy.replace,
        backoffPolicy: BackoffPolicy.exponential,
      );

      print("✅ Immediate sync scheduled");
    } catch (e) {
      print("❌ Failed to schedule immediate sync: $e");
    }
  }

  static Future<void> cancelAllTasks() async {
    if (kIsWeb) return;
    if (defaultTargetPlatform != TargetPlatform.android &&
        defaultTargetPlatform != TargetPlatform.iOS) {
      return;
    }

    try {
      await Workmanager().cancelAll();
      _initialized = false;
      print("✅ All background tasks cancelled");
    } catch (e) {
      print("❌ Failed to cancel tasks: $e");
    }
  }

  static bool get isInitialized => _initialized;
}
