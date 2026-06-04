import 'package:flutter/widgets.dart';
import 'package:workmanager/workmanager.dart';

import '../data/repository/citizen_repository.dart';

const String quickReachSyncTask = "quickreachSync";

@pragma("vm:entry-point")
void callbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    WidgetsFlutterBinding.ensureInitialized();
    final repository = CitizenRepository();
    await repository.processSyncQueue();
    return Future.value(true);
  });
}

class BackgroundSyncService {
  static Future<void> initialize() async {
    await Workmanager().initialize(
      callbackDispatcher,
      isInDebugMode: true,
    );

    await Workmanager().registerPeriodicTask(
      "quickreach-periodic-sync",
      quickReachSyncTask,
      frequency: const Duration(minutes: 15),
      constraints: Constraints(networkType: NetworkType.connected),
      existingWorkPolicy: ExistingWorkPolicy.keep,
    );
  }

  static Future<void> scheduleImmediateSync() async {
    await Workmanager().registerOneOffTask(
      "quickreach-sync-${DateTime.now().millisecondsSinceEpoch}",
      quickReachSyncTask,
      initialDelay: const Duration(seconds: 1),
      constraints: Constraints(networkType: NetworkType.connected),
      existingWorkPolicy: ExistingWorkPolicy.replace,
    );
  }
}
