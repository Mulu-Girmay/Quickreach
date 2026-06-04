import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:workmanager/workmanager.dart';

import '../data/repository/citizen_repository.dart';

const String quickReachSyncTask = "quickreachSync";

@pragma("vm:entry-point")
void callbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    WidgetsFlutterBinding.ensureInitialized();

    final repository = CitizenRepository();

    try {
      await repository.processSyncQueue();
      return Future.value(true);
    } catch (e) {
      // Log or handle error if needed
      return Future.value(false);
    }
  });
}

class BackgroundSyncService {
  static Future<void> initialize() async {
    if (kIsWeb ||
        (defaultTargetPlatform != TargetPlatform.android &&
            defaultTargetPlatform != TargetPlatform.iOS)) {
      return;
    }

    await Workmanager().initialize(
      callbackDispatcher,
      isInDebugMode: true, // set to false in production
    );

    await Workmanager().registerPeriodicTask(
      "quickreach-periodic-sync",
      quickReachSyncTask,
      frequency: const Duration(minutes: 15),
      constraints: Constraints(networkType: NetworkType.connected),
      existingWorkPolicy: ExistingPeriodicWorkPolicy.keep, // ✅ FIXED
      backoffPolicy: BackoffPolicy.linear,
    );
  }

  static Future<void> scheduleImmediateSync() async {
    if (kIsWeb ||
        (defaultTargetPlatform != TargetPlatform.android &&
            defaultTargetPlatform != TargetPlatform.iOS)) {
      return;
    }

    await Workmanager().registerOneOffTask(
      "quickreach-sync-${DateTime.now().millisecondsSinceEpoch}",
      quickReachSyncTask,
      initialDelay: const Duration(seconds: 1),
      constraints: Constraints(networkType: NetworkType.connected),
      existingWorkPolicy:
          ExistingWorkPolicy.replace, // ✅ one-off uses ExistingWorkPolicy
      backoffPolicy: BackoffPolicy.linear,
    );
  }
}
